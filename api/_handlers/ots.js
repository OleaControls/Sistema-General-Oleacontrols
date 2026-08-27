import prisma from '../_lib/prisma.js'
import { uploadToR2, signUrlIfNeeded } from '../_lib/r2.js'
import { authMiddleware } from '../_lib/auth.js'
import { notifyOTAssigned, notifyOTCompleted, sendTelegramPhotoUrl } from '../_lib/telegram.js'
import { businessDay } from '../_lib/businessDay.js'
import { OT_WINDOW_KEY, isWindowOpen, windowLabel } from '../_lib/otWindow.js'
import { createProjectWithCode } from '../_lib/projectCode.js'

// ── Helper: sufijo de folio estilo "columna de Excel" (siempre letras, nunca se acaba) ──
// index 0 → '' (sin sufijo) · 1→A · 26→Z · 27→AA · 28→AB · ... nunca produce símbolos.
function folioSuffix(index) {
  let n = index;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// ── Helper: crea/actualiza metas de asistencia para todos los técnicos de una OT ──
const toUTCNoon = (str) => {
  const dateOnly = str instanceof Date
    ? str.toISOString().slice(0, 10)
    : str ? String(str).slice(0, 10) : new Date().toISOString().slice(0, 10);
  return new Date(dateOnly + 'T12:00:00.000Z');
};

async function syncOTGoals(ot, setById) {
  try {
    if (!ot.technicianId || !ot.scheduledDate) return;

    const date       = toUTCNoon(ot.scheduledDate);
    const otNumber   = ot.otNumber;
    const clientName = ot.clientName || 'Sin cliente';
    const clientLocation = ot.address || null;

    const assistants = Array.isArray(ot.assistantTechs)
      ? ot.assistantTechs.flatMap(t => { const v = typeof t === 'string' ? t : t?.id; return v ? [v] : []; })
      : [];
    const support = Array.isArray(ot.supportTechs)
      ? ot.supportTechs.flatMap(t => { const v = typeof t === 'string' ? t : t?.id; return v ? [v] : []; })
      : [];

    const allTechIds = [...new Set([ot.technicianId, ...assistants, ...support])];

    // Cada técnico se procesa de forma independiente → en paralelo
    await Promise.all(allTechIds.map(async (techId) => {
      // Buscar meta existente para este técnico+OT (sin importar fecha anterior)
      const existing = otNumber
        ? await prisma.techDailyGoal.findFirst({ where: { techId, otNumber } })
        : null;

      if (existing) {
        // Actualizar fecha y datos del cliente; conservar notes y hasVehicle
        await prisma.techDailyGoal.update({
          where: { id: existing.id },
          data: { date, clientName, clientLocation },
        });
      } else {
        await prisma.techDailyGoal.create({
          data: { techId, date, clientName, clientLocation, otNumber: otNumber || null, setById },
        });
      }
    }));
  } catch (err) {
    console.error('[syncOTGoals] error:', err.message);
  }
}

// Horas para completar la asignación: entero positivo, o null si viene vacío/inválido.
// Evita mandar NaN a Prisma cuando el input llega como '' desde el formulario.
function toHours(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ── Requisitos previos para que un TÉCNICO avance una OT ─────────────────────
// Puertas escalonadas:
//   ASSIGNED → ACCEPTED     requiere asistencia del día + checklist enviado
//   ACCEPTED → IN_PROGRESS  requiere panoramización de la OT
// ADMIN y SUPERVISOR (Operaciones) pueden forzar el avance.
// Clase de orden. TIENDA se gestiona como proyecto; ASSIGNMENT es el resto.
// Antes esta clase se llamaba COPPEL, cuando la operacion era de una sola
// cadena. Ahora la cadena concreta va en `brand` y la clase es generica.
const OT_KINDS = ['TIENDA', 'ASSIGNMENT'];
const normalizeKind = (v) => OT_KINDS.includes(v) ? v : 'ASSIGNMENT';

// Quién puede crear OT y, por lo tanto, consultar el catálogo de proyectos y
// abrir uno nuevo. El módulo de proyectos sigue cerrado a PROJECT_MANAGER/ADMIN.
const OT_MANAGER_ROLES = ['ADMIN', 'SUPERVISOR', 'PROJECT_MANAGER'];

/** Nombre legible del proyecto que se abre para una OT de tienda. */
function nombreProyectoTienda(ot) {
  const marca = ot.brand || 'Tienda';
  const sitio = [ot.storeNumber, ot.storeName].filter(Boolean).join(' · ');
  return sitio ? `${marca} ${sitio}` : (ot.title || `${marca} ${ot.otNumber}`);
}

/**
 * Deja lista la vinculación de una OT de tienda con su proyecto.
 * Si el supervisor eligió uno, se valida que exista; si no, se abre uno nuevo
 * en el embudo de tiendas. Así ninguna OT de tienda queda sin proyecto.
 * @returns {Promise<string|null>} id del proyecto vinculado
 */
async function vincularProyectoTienda(ot, projectIdElegido, actorName) {
  if (projectIdElegido) {
    const existe = await prisma.project.findUnique({
      where: { id: projectIdElegido },
      select: { id: true },
    });
    if (!existe) throw Object.assign(new Error('El proyecto seleccionado ya no existe'), { statusCode: 400 });
    await prisma.project.update({
      where: { id: existe.id },
      data: { linkedOtIds: await linkedOtIdsCon(existe.id, ot.id) },
    });
    await bitacoraProyecto(existe.id, 'Vinculó una OT de tienda', ot.otNumber, actorName);
    return existe.id;
  }

  const creado = await createProjectWithCode(prisma, {
    name:        nombreProyectoTienda(ot),
    serviceType: 'TIENDAS',
    brand:       ot.brand || null,
    status:      'INICIACION',
    clientName:  ot.clientName || ot.brand || 'Tienda',
    objective:   ot.title || null,
    scope:       ot.description || null,
    startDate:   ot.scheduledDate || null,
    linkedOtIds: [ot.id],
  });
  await bitacoraProyecto(creado.id, 'Proyecto abierto desde la OT', ot.otNumber, actorName);
  return creado.id;
}

/** Agrega un id de OT a Project.linkedOtIds sin duplicarlo. */
async function linkedOtIdsCon(projectId, otId) {
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { linkedOtIds: true } });
  const actuales = Array.isArray(p?.linkedOtIds) ? p.linkedOtIds : [];
  return actuales.includes(otId) ? actuales : [...actuales, otId];
}

/** Bitácora del proyecto. Nunca debe tumbar el alta de la OT. */
async function bitacoraProyecto(projectId, action, detail, authorName) {
  try {
    await prisma.projectActivity.create({
      data: { projectId, action, detail: detail || null, authorName: authorName || null },
    });
  } catch (e) { console.warn('[ots] bitacoraProyecto:', e.message); }
}

// Las evidencias se guardaban como arreglo de URLs sueltas. Ahora cada foto
// puede traer descripción: { url, description }. Se admiten ambos formatos para
// no romper las OT cerradas antes del cambio.
const evidenceUrl  = (item) => (typeof item === 'string' ? item : item?.url) || null;
const evidenceText = (item) => (typeof item === 'string' ? null : (item?.description || null));
const toEvidenceRows = (list, type, workOrderId) =>
  (Array.isArray(list) ? list : [])
    .map((item) => ({ url: evidenceUrl(item), description: evidenceText(item), type, workOrderId }))
    .filter((row) => !!row.url);

const GATE_BYPASS_ROLES = ['ADMIN', 'SUPERVISOR'];

/**
 * @returns {Promise<null|{error:string, missing:string[], gate:string}>}
 *          null si el avance es permitido; objeto de error si falta algo.
 */
async function checkOTGate(targetOT, newStatus, auth) {
  if (!newStatus || !auth) return null;
  // No es una transición: reenviar el mismo estado (reanudar jornada, unlock) no revalida
  if (newStatus === targetOT.status) return null;
  // Supervisores y admins no quedan bloqueados
  const roles = Array.isArray(auth.roles) ? auth.roles : [auth.roles].filter(Boolean);
  if (roles.some(r => GATE_BYPASS_ROLES.includes(r))) return null;

  if (newStatus === 'ACCEPTED') {
    const log = await prisma.techAttendanceLog.findFirst({
      where: { techId: auth.id, date: businessDay() },
      select: { checkInTime: true, status: true },
    });
    const missing = [];
    if (!log?.checkInTime)          missing.push('attendance');
    if (log?.status !== 'COMPLETE') missing.push('checklist');
    if (missing.length === 0) return null;
    return {
      gate: 'ACCEPT',
      missing,
      error: missing.length === 2
        ? 'Registra tu entrada y envía el checklist del día antes de aceptar la orden.'
        : missing[0] === 'attendance'
          ? 'Registra tu entrada del día antes de aceptar la orden.'
          : 'Envía el checklist del día (equipo, herramientas y vehículo) antes de aceptar la orden.',
    };
  }

  if (newStatus === 'IN_PROGRESS' && targetOT.otNumber) {
    const panora = await prisma.otPanoramizacion.findUnique({
      where: { otNumber: targetOT.otNumber },
      select: { id: true },
    });
    if (panora) return null;
    return {
      gate: 'START',
      missing: ['panoramizacion'],
      error: 'Completa la panoramización del sitio antes de iniciar la jornada.',
    };
  }

  return null;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  const { method } = req;
  const { techId, supervisorId, status, id: specificId, search, kind, sub: otSub } = req.query;

  // RUTAS PÚBLICAS: GET por ID (para encuestas de clientes sin login).
  // OJO: ?sub= sirve datos internos del proyecto, así que nunca es pública.
  let auth = null;
  if (!otSub && method === 'GET' && (specificId || (req.url.includes('/api/ots/') && req.query.id))) {
      // Continuar sin verificar token para este caso específico
  } else {
      // Proteger el resto de las rutas
      auth = authMiddleware(req, res);
      if (!auth) return; // authMiddleware ya envió la respuesta 401
  }

  /* ── Catálogo de proyectos para el alta de una OT ─────────────────────────
     El supervisor no tiene acceso a /api/projects, pero necesita elegir a qué
     proyecto se engancha la OT que está creando. Aquí solo se devuelve lo
     imprescindible para pintar el selector.
     `catalog=storeProjects` acota al embudo de tiendas; `catalog=projects`
     devuelve todos, porque cualquier asignación puede colgar de un proyecto. */
  if (method === 'GET' && ['storeProjects', 'projects'].includes(req.query.catalog)) {
    const rolesLlamante = Array.isArray(auth?.roles) ? auth.roles : [auth?.roles].filter(Boolean);
    if (!rolesLlamante.some(r => OT_MANAGER_ROLES.includes(r))) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const soloTiendas = req.query.catalog === 'storeProjects';
    const proyectos = await prisma.project.findMany({
      where: { archived: false, ...(soloTiendas ? { serviceType: 'TIENDAS' } : {}) },
      select: {
        id: true, code: true, name: true, status: true, clientName: true,
        serviceType: true, projectType: true, zone: true, brand: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    return res.status(200).json(proyectos);
  }

  /* ── Puerta estrecha al proyecto de una OT de tienda ──────────────────────
     El módulo de proyectos está cerrado a PROJECT_MANAGER/ADMIN, pero el
     técnico necesita ver recursos, inventario, documentación y pendientes del
     proyecto de SU orden. Aquí solo se exponen esos cuatro apartados, y solo a
     quien está involucrado en la OT. */
  if (otSub) {
    const otId = specificId || req.query.id;
    if (!otId) return res.status(400).json({ error: 'Falta el id de la OT' });

    const targetOT = await prisma.workOrder.findFirst({
      where: { OR: [{ id: otId }, { otNumber: otId }] },
      select: { id: true, otNumber: true, title: true, status: true, kind: true, projectId: true, technicianId: true, supervisorId: true, assistantTechs: true, supportTechs: true },
    });
    if (!targetOT) return res.status(404).json({ error: 'OT no encontrada' });

    // ¿El llamante participa en esta OT?
    const callerId    = auth?.id;
    const callerRoles = auth?.roles || [];
    const idsDe = (v) => (Array.isArray(v) ? v : []).map(x => (typeof x === 'string' ? x : x?.id)).filter(Boolean);
    const involucrado =
      callerRoles.some(r => GATE_BYPASS_ROLES.includes(r)) ||
      targetOT.technicianId === callerId ||
      targetOT.supervisorId === callerId ||
      idsDe(targetOT.assistantTechs).includes(callerId) ||
      idsDe(targetOT.supportTechs).includes(callerId);

    if (!involucrado) return res.status(403).json({ error: 'No participas en esta orden de trabajo' });

    /* ── Evidencias e incidentes en tiempo real ────────────────────────────
       Aplica a cualquier OT (tienda o asignación) y no depende del proyecto:
       el técnico documenta lo que pasa mientras trabaja, no solo al cerrar. */
    if (otSub === 'evidences') {
      const otCerrada = ['COMPLETED', 'VALIDATED'].includes(targetOT.status);

      if (method === 'GET') {
        const lista = await prisma.evidence.findMany({
          where: { workOrderId: targetOT.id },
          orderBy: { createdAt: 'desc' },
        });
        await Promise.all(lista.map(async (e) => { e.url = await signUrlIfNeeded(e.url); }));
        return res.status(200).json(lista);
      }

      if (method === 'POST') {
        if (otCerrada) return res.status(403).json({ error: 'La OT ya está cerrada: no admite evidencias nuevas' });

        const { url, description, type } = req.body || {};
        const tipo = type === 'INCIDENT' ? 'INCIDENT' : 'IMAGE';
        if (!url) return res.status(400).json({ error: 'Falta la foto' });

        const finalUrl = String(url).startsWith('data:')
          ? await uploadToR2(url, 'evidences')
          : url;

        const creada = await prisma.evidence.create({
          data: {
            workOrderId: targetOT.id,
            url: finalUrl,
            type: tipo,
            description: description ? String(description).trim() : null,
          },
        });

        // Un incidente se avisa al supervisor en el momento. Que falle el aviso
        // no debe tumbar el registro, así que va suelto (fire-and-forget).
        if (tipo === 'INCIDENT' && targetOT.supervisorId) {
          prisma.employee
            .findUnique({ where: { id: targetOT.supervisorId }, select: { telegramChatId: true } })
            .then(async (sup) => {
              if (!sup?.telegramChatId) return;
              const foto = await signUrlIfNeeded(finalUrl);
              const pie = [
                '⚠️ <b>Incidente reportado en campo</b>',
                'OT: <b>' + targetOT.otNumber + '</b>',
                targetOT.title ? 'Trabajo: ' + targetOT.title : null,
                creada.description ? 'Qué pasó: ' + creada.description : null,
              ].filter(Boolean).join('\n');
              return sendTelegramPhotoUrl(sup.telegramChatId, foto, pie);
            })
            .catch(err => console.error('[ots] aviso de incidente:', err.message));
        }

        return res.status(201).json({ ...creada, url: await signUrlIfNeeded(finalUrl) });
      }

      if (method === 'DELETE') {
        if (otCerrada) return res.status(403).json({ error: 'La OT ya está cerrada: no se pueden borrar evidencias' });
        const { subId } = req.query;
        if (!subId) return res.status(400).json({ error: 'Falta el id de la evidencia' });
        const ev = await prisma.evidence.findUnique({ where: { id: subId }, select: { workOrderId: true } });
        if (!ev || ev.workOrderId !== targetOT.id) return res.status(404).json({ error: 'Evidencia no encontrada en esta OT' });
        await prisma.evidence.delete({ where: { id: subId } });
        return res.status(200).json({ success: true });
      }

      return res.status(405).json({ error: 'Método no soportado' });
    }

    // ── El resto de sub-recursos viven en el proyecto de una OT de tienda ──
    if (targetOT.kind !== 'TIENDA') return res.status(400).json({ error: 'Solo las OT de tienda se gestionan como proyecto' });
    if (!targetOT.projectId) return res.status(404).json({ error: 'Esta OT todavía no está vinculada a un proyecto' });

    // GET: los cuatro apartados del proyecto. El inventario es la excepción:
    // es uno solo para toda la operación de tiendas, así que se anexa aparte y
    // el técnico ve el mismo listado desde cualquier orden.
    if (otSub === 'project' && method === 'GET') {
      const [project, inventory] = await Promise.all([
        prisma.project.findUnique({
          where: { id: targetOT.projectId },
          select: {
            id: true, code: true, name: true, status: true, progress: true, managerName: true,
            pendings:         { orderBy: { createdAt: 'desc' } },
            documents:        { orderBy: { createdAt: 'desc' } },
            resourceRequests: { orderBy: { requestedAt: 'desc' } },
          },
        }),
        prisma.storeInventory.findMany({ orderBy: [{ brand: 'asc' }, { name: 'asc' }] }),
      ]);
      if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
      return res.status(200).json({ ...project, inventory });
    }

    // POST: el técnico levanta una solicitud de recurso
    if (otSub === 'resourceRequests' && method === 'POST') {
      const { name, quantity, unit, justification } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'Describe qué recurso necesitas' });

      // El token solo trae id/email/roles; el nombre se resuelve aquí.
      const empleado = callerId
        ? await prisma.employee.findUnique({ where: { id: callerId }, select: { name: true } })
        : null;
      const solicitante = empleado?.name || auth?.email || 'Técnico';

      const created = await prisma.projectResourceRequest.create({
        data: {
          projectId:     targetOT.projectId,
          name:          String(name).trim(),
          quantity:      Number(quantity) > 0 ? Number(quantity) : 1,
          unit:          unit ? String(unit).trim() : null,
          justification: justification ? String(justification).trim() : null,
          // El estado y el solicitante los fija el servidor, nunca el cliente.
          status:          'SOLICITADO',
          workOrderId:     targetOT.id,
          requestedById:   callerId || null,
          requestedByName: solicitante,
        },
      });
      return res.status(201).json(created);
    }

    // POST: el técnico sube la documentación que exige la tienda
    if (otSub === 'documents' && method === 'POST') {
      const { name, category, url, version } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ error: 'Falta el nombre del documento' });
      if (!url  || !String(url).trim())  return res.status(400).json({ error: 'Falta el archivo' });

      const created = await prisma.projectDocument.create({
        data: {
          projectId: targetOT.projectId,
          name:      String(name).trim(),
          category:  category ? String(category).trim() : 'EVIDENCIA',
          url:       String(url).trim(),
          version:   version ? String(version).trim() : '1.0',
        },
      });
      return res.status(201).json(created);
    }

    // PUT: el técnico avanza un pendiente del proyecto
    if (otSub === 'pendings' && method === 'PUT') {
      const { subId, status: nextStatus } = { ...req.query, ...req.body };
      const ESTADOS = ['ABIERTO', 'EN_PROCESO', 'CERRADO'];
      if (!subId) return res.status(400).json({ error: 'Falta el id del pendiente' });
      if (!ESTADOS.includes(nextStatus)) return res.status(400).json({ error: 'Estado inválido' });

      const pendiente = await prisma.projectPending.findUnique({ where: { id: subId }, select: { projectId: true } });
      if (!pendiente || pendiente.projectId !== targetOT.projectId) {
        return res.status(404).json({ error: 'Pendiente no encontrado en este proyecto' });
      }
      const updated = await prisma.projectPending.update({ where: { id: subId }, data: { status: nextStatus } });
      return res.status(200).json(updated);
    }

    return res.status(405).json({ error: 'Sub-recurso o método no soportado' });
  }

  // Helper para procesar imágenes de OT a R2
  const processOTImages = async (data) => {
    const updated = { ...data };
    
    // 1. Procesar Firmas
    if (updated.signature && updated.signature.startsWith('data:')) {
        updated.signature = await uploadToR2(updated.signature, 'signatures');
    }
    if (updated.clientSignature && updated.clientSignature.startsWith('data:')) {
        updated.clientSignature = await uploadToR2(updated.clientSignature, 'signatures');
    }
    if (updated.clientSignature2 && updated.clientSignature2.startsWith('data:')) {
        updated.clientSignature2 = await uploadToR2(updated.clientSignature2, 'signatures');
    }

    // 1.5 Procesar Acta de Entrega (PDF)
    if (updated.deliveryActUrl && updated.deliveryActUrl.startsWith('data:')) {
        updated.deliveryActUrl = await uploadToR2(updated.deliveryActUrl, 'delivery-acts');
    }

    // 2. Procesar fotos de evidencia (evidences / completionPhotos / photos)
    // Ambos campos y todas sus fotos se suben en paralelo (uploads independientes)
    // 'incidents' son las fotos del reporte de incidencias del acta.
    const photoFields = ['completionPhotos', 'photos', 'incidents'];
    await Promise.all(photoFields.map(async (field) => {
        if (Array.isArray(updated[field])) {
            // Promise.all preserva el orden original de cada arreglo de fotos
            updated[field] = await Promise.all(updated[field].map(async (item) => {
                // Formato viejo: la foto es la cadena misma.
                if (typeof item === 'string') {
                    return item.startsWith('data:') ? await uploadToR2(item, 'evidences') : item;
                }
                // Formato nuevo: { url, description }.
                if (item && typeof item.url === 'string' && item.url.startsWith('data:')) {
                    return { ...item, url: await uploadToR2(item.url, 'evidences') };
                }
                return item;
            }));
        }
    }));

    return updated;
  };

  if (method === 'GET') {
    try {
      const { techId, supervisorId, status, id: specificId, search, kind } = req.query;
      
      // Si piden una OT específica (detalle)
      if (specificId || (req.url.includes('/api/ots/') && req.query.id)) {
          const idToFind = specificId || req.query.id;
          const ot = await prisma.workOrder.findFirst({
              where: { OR: [ { id: idToFind }, { otNumber: idToFind } ] },
              include: {
                  technician: { select: { name: true, avatar: true, position: true } },
                  supervisor: { select: { name: true } },
                  evidences: true,
                  expenses: true
              }
          });
          
          if (!ot) return res.status(404).json({ error: 'OT no encontrada' });

          // FIRMAR URLs para el detalle
          ot.signature = await signUrlIfNeeded(ot.signature);
          ot.clientSignature = await signUrlIfNeeded(ot.clientSignature);
          ot.deliveryActUrl = await signUrlIfNeeded(ot.deliveryActUrl);
          if (ot.evidences) {
              await Promise.all(ot.evidences.map(async (ev) => { ev.url = await signUrlIfNeeded(ev.url); }));
          }

          // Normalizar campos para que el frontend los reciba igual que en el listado
          const detailFormatted = {
              ...ot,
              leadTechId:   ot.technicianId,
              leadTechName: ot.technician?.name || 'Sin asignar',
              technicianName: ot.technician?.name || 'Sin asignar',
              client:       ot.clientName,
              location:     ot.address,
              lat:          ot.latitude,
              lng:          ot.longitude,
              workDescription: ot.description,
              assistantTechs: ot.assistantTechs
                  ? (typeof ot.assistantTechs === 'string' ? JSON.parse(ot.assistantTechs) : ot.assistantTechs)
                  : [],
              supportTechs: ot.supportTechs
                  ? (typeof ot.supportTechs === 'string' ? JSON.parse(ot.supportTechs) : ot.supportTechs)
                  : [],
          };

          return res.status(200).json(detailFormatted);
      }

      const where = {};

      // Separación OTs de tienda vs. Asignaciones (trabajo externo).
      if (kind && OT_KINDS.includes(kind)) where.kind = kind;

      // ?brand=Coppel acota a una cadena. Sin él salen todas las marcas.
      const brand = (req.query.brand || '').trim();
      if (brand) where.brand = brand;

      if (search) {
        // `contains` en Postgres distingue mayúsculas. Sin `mode: 'insensitive'`
        // teclear "coppel" nunca encontraba "Coppel" ni el folio "OT-COPP-…",
        // que están en mayúscula: el buscador devolvía siempre cero.
        const q = { contains: search.trim(), mode: 'insensitive' };
        where.OR = [
          { otNumber:    q },
          { brand:       q },
          { clientName:  q },
          { storeName:   q },
          { storeNumber: q },
          { title:       q },
        ];
      }

      if (techId) {
          const techFilter = {
              OR: [
                  { technicianId: techId },
                  { assistantTechs: { array_contains: [{ id: techId }] } },
                  { supportTechs: { array_contains: [{ id: techId }] } }
              ]
          };
          
          if (where.OR) {
              // Si ya hay una búsqueda por texto, combinamos con el filtro de técnico
              const originalOR = where.OR;
              delete where.OR;
              where.AND = [
                  { OR: originalOR },
                  techFilter
              ];
          } else {
              where.OR = techFilter.OR;
          }
      }
      
      if (supervisorId) where.supervisorId = supervisorId;
      if (status && status !== 'ALL') where.status = status;

      /* ── scope=metrics: TODAS las OTs, sin paginar y con carga ligera ──────
         Los tableros de métricas necesitan el universo completo: con el limit
         de 50 por defecto calculaban porcentajes sobre una fracción de las
         órdenes y los números salían mal. Se devuelven sólo los campos que las
         métricas agregan — sin gastos, evidencias ni evaluaciones — para que
         traer cientos de registros siga siendo barato. */
      if (req.query.scope === 'metrics') {
        const all = await prisma.workOrder.findMany({
          where,
          select: {
            id: true, otNumber: true, title: true, status: true, priority: true,
            systemType: true, clientName: true, brand: true, storeName: true,
            zone: true, activity: true, projectId: true,
            scheduledDate: true, createdAt: true, startedAt: true, finishedAt: true,
            assignedFunds: true, technicianId: true,
            technician: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json({ data: all, total: all.length, scope: 'metrics' });
      }

      // Paginación: page=1, limit=50 por defecto
      const page  = Math.max(1, parseInt(req.query.page  || '1',  10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
      const skip  = (page - 1) * limit;

      // Promise.all y no $transaction: son dos lecturas independientes, no
      // necesitan atomicidad. La forma transaccional exige una conexión dedicada
      // y solo espera 2 s por ella (maxWait), así que con la base fría o el pool
      // ocupado fallaba con "Unable to start a transaction in the given time" y
      // el listado devolvía 500.
      const [ots, total] = await Promise.all([
        prisma.workOrder.findMany({
          where,
          select: {
            id: true,
            otNumber: true,
            title: true,
            status: true,
            priority: true,
            // Sin estos dos, editar una OT desde el listado la reclasificaba:
            // el formulario partía del valor por omisión en vez del real.
            kind: true,
            projectId: true,
            zone: true,
            activity: true,
            clientName: true,
            storeName: true,
            storeNumber: true,
            address: true,
            latitude: true,
            longitude: true,
            scheduledDate: true,
            arrivalTime: true,
            technicianId: true,
            supervisorId: true,
            description: true,
            assignedFunds: true,
            clientGoal: true,
            timeLimitHours: true,
            qualityHigh: true,
            qualityMin: true,
            deliveryActUrl: true,
            assistantTechs: true,
            supportTechs: true,
            jornadas: true,
            startedAt: true,
            createdAt: true,
            technician: { select: { name: true, avatar: true, position: true } },
            supervisor: { select: { name: true } },
            evidences: { select: { url: true, description: true, type: true } },
            expenses: {
              where: { NOT: { status: 'REJECTED' } },
              select: { amount: true, category: true, description: true, createdAt: true, id: true }
            },
            evaluations: {
              select: {
                id: true, type: true, score1: true, score2: true, score3: true,
                materialUsage: true, improvements: true, comment: true, createdAt: true,
                target: { select: { name: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.workOrder.count({ where }),
      ]);

      // Firmar URLs de actas EN PARALELO (no secuencial) solo para OTs completadas/validadas
      const formattedOts = await Promise.all(ots.map(async (ot) => {
        const totalSpent = ot.expenses.reduce((sum, e) => sum + e.amount, 0);
        const balance = (ot.assignedFunds || 0) - totalSpent;
        const financials = {
            assignedFunds: ot.assignedFunds || 0,
            totalSpent,
            balance,
            isOverLimit: balance < 0,
            expenses: ot.expenses.map(e => ({ ...e, date: e.createdAt }))
        };

        // Solo firmar si la OT está terminada y tiene URL
        const signedActUrl = (ot.deliveryActUrl && (ot.status === 'COMPLETED' || ot.status === 'VALIDATED'))
          ? await signUrlIfNeeded(ot.deliveryActUrl)
          : ot.deliveryActUrl;

        return {
          ...ot,
          id: ot.otNumber,
          client: ot.clientName,
          leadTechId: ot.technicianId,
          leadTechName: ot.technician?.name || 'Sin asignar',
          workDescription: ot.description,
          lat: ot.latitude,
          lng: ot.longitude,
          location: ot.address,
          financials,
          evaluations: ot.evaluations || [],
          // Solo las evidencias normales; las incidencias van aparte.
          completionPhotos: ot.evidences.filter(e => e.type !== 'INCIDENT').map(e => e.url),
          evidenceDetails:  ot.evidences.filter(e => e.type !== 'INCIDENT'),
          incidentReports:  ot.evidences.filter(e => e.type === 'INCIDENT'),
          deliveryActUrl: signedActUrl,
          assistantTechs: Array.isArray(ot.assistantTechs) ? ot.assistantTechs : (ot.assistantTechs ? JSON.parse(ot.assistantTechs) : []),
          supportTechs: Array.isArray(ot.supportTechs) ? ot.supportTechs : (ot.supportTechs ? JSON.parse(ot.supportTechs) : []),
          creatorName: 'Sistema',
          assignedByName: ot.technicianId ? (ot.supervisor?.name || 'Supervisor') : null
        };
      }));

      return res.status(200).json({ data: formattedOts, total, page, limit, pages: Math.ceil(total / limit) });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'POST') {
    try {
      // ── Ventana horaria de creación ──────────────────────────────────────
      // El ADMIN la configura desde Control de Operaciones. Se valida aquí (no
      // solo en el botón) para que cubra también el alta desde el calendario.
      const callerRoles = Array.isArray(auth?.roles) ? auth.roles : [auth?.roles].filter(Boolean);
      if (!callerRoles.includes('ADMIN')) {
        const windowCfg = await prisma.systemConfig.findUnique({ where: { key: OT_WINDOW_KEY } });
        if (!isWindowOpen(windowCfg?.value)) {
          return res.status(403).json({
            error: `La creación de OTs está cerrada en este momento. Horario permitido: ${windowLabel(windowCfg?.value)} (hora de México).`,
          });
        }
      }

      const data = await processOTImages(req.body);

      const cleanName = (data.storeName || 'NA').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
      const cleanNum = (data.storeNumber || '000').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const baseId = `OT-${cleanName}-${cleanNum}`;

      const otFields = {
        title: data.title,
        description: data.workDescription,
        status: data.leadTechId ? 'ASSIGNED' : 'UNASSIGNED',
        priority: data.priority || 'MEDIUM',
        kind: normalizeKind(data.kind),
        // Cualquier asignación puede colgar de un proyecto. En tiendas el
        // vínculo se resuelve abajo, ya con el folio a la mano (el nombre del
        // proyecto y su bitácora lo necesitan); en el resto se toma tal cual.
        projectId: normalizeKind(data.kind) === 'TIENDA' ? null : (data.projectId || null),
        // Zona y actividad del Sistema General. Si no vienen, la zona se hereda
        // del proyecto en cuanto queda vinculado.
        zone: data.zone || null,
        activity: data.activity || null,
        // Marca de la cadena; la tienda concreta va en storeNumber/storeName.
        brand: data.brand || null,
        storeNumber: data.storeNumber,
        storeName: data.storeName,
        clientName: data.client,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        address: data.address,
        secondaryAddress: data.secondaryAddress,
        otAddress: data.otAddress,
        otReference: data.otReference,
        latitude: data.lat,
        longitude: data.lng,
        arrivalTime: data.arrivalTime,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        assignedFunds: parseFloat(data.assignedFunds) || 0,
        clientGoal: data.clientGoal || null,
        timeLimitHours: toHours(data.timeLimitHours),
        qualityHigh: data.qualityHigh || null,
        qualityMin: data.qualityMin || null,
        supervisorId: data.supervisorId,
        technicianId: data.leadTechId,
        creatorId: data.supervisorId,
        assignedById: data.leadTechId ? data.supervisorId : null,
        assistantTechs: data.assistantTechs || [],
        supportTechs: data.supportTechs || [],
      };

      // Generate unique otNumber with retry — handles concurrent requests and stale counts.
      // Cuenta exacta: el folio base + los que tengan sufijo "baseId-…" (evita
      // mezclar tiendas cuyo prefijo se parezca, p.ej. 000 vs 0001).
      let ot = null;
      for (let attempt = 0; attempt < 60 && !ot; attempt++) {
        const existingCount = await prisma.workOrder.count({
          where: { OR: [{ otNumber: baseId }, { otNumber: { startsWith: `${baseId}-` } }] },
        });
        const index = existingCount + attempt;
        const otNumber = index === 0 ? baseId : `${baseId}-${folioSuffix(index)}`;
        try {
          ot = await prisma.workOrder.create({ data: { otNumber, ...otFields } });
        } catch (err) {
          if (err.code !== 'P2002') throw err;
          // Otra petición concurrente tomó ese folio — reintenta con el siguiente sufijo
        }
      }
      // Respaldo garantizado: si tras los reintentos aún no se creó (caso extremo),
      // usa un sufijo con timestamp que nunca colisiona ni produce símbolos.
      if (!ot) {
        const otNumber = `${baseId}-${Date.now().toString(36).toUpperCase()}`;
        ot = await prisma.workOrder.create({ data: { otNumber, ...otFields } });
      }

      /* ── La asignación hereda la zona de su proyecto ────────────────────
         Se zonifica desde el proyecto para no capturar lo mismo dos veces; si
         el supervisor puso una zona distinta, esa manda. */
      const heredarZona = async () => {
        if (ot.zone || !ot.projectId) return;
        const proj = await prisma.project.findUnique({ where: { id: ot.projectId }, select: { zone: true } });
        if (proj?.zone) ot = await prisma.workOrder.update({ where: { id: ot.id }, data: { zone: proj.zone } });
      };

      /* ── Toda OT de tienda se gestiona como proyecto ───────────────────
         O se engancha al que eligió el supervisor, o se le abre uno propio.
         Si esto falla, la OT ya existe: se responde igual y se avisa, para no
         perder el alta por un problema del módulo de proyectos. */
      if (ot.kind === 'TIENDA') {
        try {
          const projectId = await vincularProyectoTienda(ot, data.projectId || null, auth?.name || auth?.email);
          ot = await prisma.workOrder.update({ where: { id: ot.id }, data: { projectId } });
        } catch (err) {
          console.error('[ots] no se pudo vincular el proyecto de la OT:', err.message);
          ot = { ...ot, projectWarning: err.message };
        }
      }

      // Ya con el proyecto resuelto (el elegido o el que se abrió para la OT
      // de tienda), la zona puede bajar de él.
      await heredarZona();

      // Notificar por Telegram si la OT ya viene asignada
      if (data.leadTechId) {
        const assistants = Array.isArray(data.assistantTechs) ? data.assistantTechs.flatMap(t => t.id ? [t.id] : []) : [];
        const support = Array.isArray(data.supportTechs) ? data.supportTechs.flatMap(t => t.id ? [t.id] : []) : [];
        const allIds = [...new Set([data.leadTechId, ...assistants, ...support])];

        console.log('[Telegram] POST OT asignada, buscando técnicos:', allIds);
        const techs = await prisma.employee.findMany({
          where: { id: { in: allIds } },
          select: { id: true, name: true, telegramChatId: true }
        });
        console.log('[Telegram] Técnicos encontrados:', techs.map(t => ({ name: t.name, chatId: t.telegramChatId })));
        await notifyOTAssigned(ot, techs);
      }

      // Crear metas de asistencia para todos los técnicos asignados
      await syncOTGoals({ ...ot, assistantTechs: data.assistantTechs || [], supportTechs: data.supportTechs || [] }, auth.id);

      return res.status(201).json(ot);
    } catch (error) {
      console.error("POST OT Error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const data = await processOTImages(req.body);
      const { 
          id, status, report, signature, clientSignature, clientSignature2, 
          systemType, deliveryDetails, pendingTasks, clientContact2, photos, incidents,
          startedAt, finishedAt, leadTechId, assignedFunds, isLocked,
          deliveryActUrl
      } = data;
      
      // Buscar la OT real
      const targetOT = await prisma.workOrder.findFirst({
        where: { OR: [ { id: id }, { otNumber: id } ] }
      });

      if (!targetOT) return res.status(404).json({ error: 'OT no encontrada' });

      // BLOQUEO DE SEGURIDAD: Solo permitir cambios de fondos (o desbloqueo explícito) si ya está completada
      const isExplicitUnlock = req.body.isLocked === false && req.body.status === 'IN_PROGRESS';
      // Vincular/desvincular el proyecto no toca el contenido del acta, así que
      // se permite también en OT cerradas o validadas (muchas ya lo están).
      const soloVinculoProyecto = Object.keys(req.body)
          .every(k => ['id', 'projectId', 'kind'].includes(k)) && req.body.projectId !== undefined;
      if (targetOT.status === 'COMPLETED' && !req.body.assignedFunds && !isExplicitUnlock && !soloVinculoProyecto) {
          return res.status(403).json({ error: 'Esta OT está CERRADA. Solo se permite ampliar fondos.' });
      }
      // Las OTs VALIDATED solo pueden desbloquearse explícitamente
      if (targetOT.status === 'VALIDATED' && !isExplicitUnlock && !soloVinculoProyecto) {
          return res.status(403).json({ error: 'Esta OT está VALIDADA y bloqueada. Solo un administrador puede desbloquearla.' });
      }

      const updateData = {};

      // ── Campos básicos de la OT (edición desde SupervisorOTs) ──────────────
      if (data.title            !== undefined) updateData.title            = data.title;
      if (data.client           !== undefined) updateData.clientName       = data.client;
      if (data.clientName       !== undefined) updateData.clientName       = data.clientName;
      if (data.brand            !== undefined) updateData.brand            = data.brand || null;
      if (data.storeNumber      !== undefined) updateData.storeNumber      = data.storeNumber;
      if (data.storeName        !== undefined) updateData.storeName        = data.storeName;
      if (data.address          !== undefined) updateData.address          = data.address;
      if (data.secondaryAddress !== undefined) updateData.secondaryAddress = data.secondaryAddress;
      if (data.otAddress        !== undefined) updateData.otAddress        = data.otAddress;
      if (data.otReference      !== undefined) updateData.otReference      = data.otReference;
      if (data.lat              !== undefined) updateData.latitude         = data.lat;
      if (data.lng              !== undefined) updateData.longitude        = data.lng;
      if (data.workDescription  !== undefined) updateData.description      = data.workDescription;
      if (data.priority         !== undefined) updateData.priority         = data.priority;
      if (data.arrivalTime      !== undefined) updateData.arrivalTime      = data.arrivalTime;
      if (data.scheduledDate    !== undefined) updateData.scheduledDate    = data.scheduledDate ? new Date(data.scheduledDate) : null;
      if (data.contactName      !== undefined) updateData.contactName      = data.contactName;
      if (data.contactEmail     !== undefined) updateData.contactEmail     = data.contactEmail;
      if (data.contactPhone     !== undefined) updateData.contactPhone     = data.contactPhone;
      if (data.clientEmail      !== undefined) updateData.clientEmail      = data.clientEmail;
      if (data.clientPhone      !== undefined) updateData.clientPhone      = data.clientPhone;
      if (data.clientGoal       !== undefined) updateData.clientGoal       = data.clientGoal || null;
      if (data.timeLimitHours   !== undefined) updateData.timeLimitHours   = toHours(data.timeLimitHours);
      if (data.qualityHigh      !== undefined) updateData.qualityHigh      = data.qualityHigh || null;
      if (data.qualityMin       !== undefined) updateData.qualityMin       = data.qualityMin  || null;
      if (data.zone             !== undefined) updateData.zone             = data.zone     || null;
      if (data.activity         !== undefined) updateData.activity         = data.activity || null;

      // ── Campos de estado / operación ───────────────────────────────────────
      if (status) updateData.status = status;
      if (report !== undefined) updateData.report = report;
      if (signature !== undefined) updateData.signature = signature;
      if (clientSignature !== undefined) updateData.clientSignature = clientSignature;
      if (clientSignature2 !== undefined) updateData.clientSignature2 = clientSignature2;
      if (systemType !== undefined) updateData.systemType = systemType;
      if (deliveryDetails !== undefined) updateData.deliveryDetails = deliveryDetails;
      if (pendingTasks !== undefined) updateData.pendingTasks = pendingTasks;
      if (clientContact2 !== undefined) updateData.clientContact2 = clientContact2;
      if (leadTechId !== undefined) updateData.technicianId = leadTechId;
      if (assignedFunds !== undefined) updateData.assignedFunds = assignedFunds;
      if (isLocked !== undefined) updateData.isLocked = isLocked;
      if (deliveryActUrl !== undefined) updateData.deliveryActUrl = deliveryActUrl;
      if (data.kind !== undefined) updateData.kind = normalizeKind(data.kind);
      /* El vínculo con proyecto ya no es exclusivo de tiendas: es el eslabón
         proyecto → asignación → técnico del Sistema General, así que cualquier
         OT puede colgar de un proyecto. Lo exclusivo de tiendas es que se le
         ABRE uno automáticamente si no trae. */
      if (data.projectId !== undefined) updateData.projectId = data.projectId || null;
      if (data.assistantTechs !== undefined) updateData.assistantTechs = data.assistantTechs;
      if (data.supportTechs !== undefined) updateData.supportTechs = data.supportTechs;
      if (data.jornadas !== undefined) updateData.jornadas = data.jornadas;
      if (startedAt) updateData.startedAt = new Date(startedAt);
      if (finishedAt) updateData.finishedAt = new Date(finishedAt);

      // ── REQUISITOS PREVIOS DEL TÉCNICO ─────────────────────────────────────
      // Puertas escalonadas: cada requisito se exige cuando el técnico ya puede
      // cumplirlo. Supervisores y admins pueden forzar el avance.
      const gate = await checkOTGate(targetOT, updateData.status, auth);
      if (gate) return res.status(409).json(gate);

      // 1. Actualizar los datos maestros de la OT
      let updated = await prisma.workOrder.update({
        where: { id: targetOT.id },
        data: updateData,
        include: { technician: { select: { name: true } } }
      });

      /* 1b. Una OT que pasa a ser de tienda necesita proyecto. Solo aplica al
         cambio de clase: un PUT que manda projectId (incluido null, al
         desvincular desde el proyecto) manda tal cual y no se le abre uno. */
      const pasaATienda = data.kind !== undefined
        && normalizeKind(data.kind) === 'TIENDA'
        && targetOT.kind !== 'TIENDA';
      if (pasaATienda && data.projectId === undefined && !updated.projectId) {
        try {
          const projectId = await vincularProyectoTienda(updated, null, auth?.name || auth?.email);
          updated = await prisma.workOrder.update({
            where: { id: updated.id },
            data: { projectId },
            include: { technician: { select: { name: true } } },
          });
        } catch (err) {
          console.error('[ots] no se pudo abrir el proyecto de la OT:', err.message);
        }
      }

      // 2. Si vienen fotos nuevas, las guardamos como evidencias.
      //    Las incidencias del acta son evidencias con type 'INCIDENT'.
      const evidenceRows = [
          ...toEvidenceRows(photos,    'IMAGE',    targetOT.id),
          ...toEvidenceRows(incidents, 'INCIDENT', targetOT.id),
      ];
      if (evidenceRows.length > 0) {
          await prisma.evidence.createMany({ data: evidenceRows });
      }

      // 3. Notificaciones Telegram
      const prevStatus = targetOT.status;
      const newStatus = updateData.status;

      // 3a. OT asignada → notificar a todos los técnicos asignados
      if (newStatus === 'ASSIGNED' && prevStatus !== 'ASSIGNED') {
        const leadId = updateData.technicianId || targetOT.technicianId;
        const rawAssistants = updateData.assistantTechs ?? targetOT.assistantTechs;
        const rawSupport   = updateData.supportTechs   ?? targetOT.supportTechs;
        const assistants = Array.isArray(rawAssistants) ? rawAssistants.flatMap(t => t.id ? [t.id] : []) : [];
        const support    = Array.isArray(rawSupport)    ? rawSupport.flatMap(t => t.id ? [t.id] : []) : [];
        const allIds = [...new Set([leadId, ...assistants, ...support].filter(Boolean))];

        console.log('[Telegram] PUT OT asignada, buscando técnicos:', allIds);
        if (allIds.length > 0) {
          const techs = await prisma.employee.findMany({
            where: { id: { in: allIds } },
            select: { id: true, name: true, telegramChatId: true }
          });
          console.log('[Telegram] Técnicos encontrados:', techs.map(t => ({ name: t.name, chatId: t.telegramChatId })));
          await notifyOTAssigned(updated, techs);
        }
      }

      // 3b. OT completada → notificar a todos los empleados con rol SUPERVISOR (Operaciones)
      if (newStatus === 'COMPLETED' && prevStatus !== 'COMPLETED') {
        const opsTeam = await prisma.employee.findMany({
          where: { roles: { has: 'SUPERVISOR' }, telegramChatId: { not: null } },
          select: { telegramChatId: true }
        });
        for (const ops of opsTeam) {
          notifyOTCompleted(updated, ops).catch(console.error);
        }
      }

      // Sincronizar metas de asistencia para todos los técnicos de la OT
      await syncOTGoals(updated, auth.id);

      return res.status(200).json(updated);
    } catch (error) {
      console.error("PUT OT Error:", error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'DELETE') {
      try {
          const { id } = req.query; // id puede ser folio
          console.log(`[OT DELETE] Attempting to delete OT: ${id}`);

          const targetOT = await prisma.workOrder.findFirst({
              where: { OR: [ { id: id }, { otNumber: id } ] }
          });

          if (!targetOT) return res.status(404).json({ error: 'OT no encontrada' });

          // ELIMINAR DEPENDENCIAS (Integridad Referencial manual)
          // 1. Evidencias
          await prisma.evidence.deleteMany({ where: { workOrderId: targetOT.id } });
          // 2. Gastos
          await prisma.expense.deleteMany({ where: { workOrderId: targetOT.id } });
          // 3. Evaluaciones vinculadas a esta OT
          await prisma.evaluation.deleteMany({ where: { otId: targetOT.id } });

          // 4. Datos de asistencia vinculados al otNumber
          if (targetOT.otNumber) {
            // Logs de asistencia cuyo goal tenga este otNumber
            const goals = await prisma.techDailyGoal.findMany({
              where: { otNumber: targetOT.otNumber },
              select: { id: true },
            });
            if (goals.length > 0) {
              const goalIds = goals.map(g => g.id);
              await prisma.techAttendanceLog.deleteMany({ where: { goalId: { in: goalIds } } });
              await prisma.techDailyGoal.deleteMany({ where: { id: { in: goalIds } } });
            }
            // Panoramización del sitio
            await prisma.otPanoramizacion.deleteMany({ where: { otNumber: targetOT.otNumber } });
          }

          // Finalmente eliminar la OT
          await prisma.workOrder.delete({ where: { id: targetOT.id } });
          
          console.log(`[OT DELETE] Successfully deleted OT: ${targetOT.otNumber}`);
          return res.status(200).json({ success: true });
      } catch (error) {
          console.error("DELETE OT Error:", error);
          return res.status(500).json({ error: error.message });
      }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
