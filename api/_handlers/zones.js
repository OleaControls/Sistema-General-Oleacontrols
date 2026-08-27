import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

/* ── Mapa de Operaciones ─────────────────────────────────────────────────────
   Zonas de trabajo con lo que vive en cada una. El vínculo con proyectos y
   asignaciones es por NOMBRE (Project.zone / WorkOrder.zone): así lo ya
   capturado sigue funcionando y una zona se puede renombrar sin migrar datos.
   Este handler además devuelve, en la misma llamada, los proyectos y las
   asignaciones abiertas con sus coordenadas para pintar el mapa. */

const EDITOR_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERVISOR'];
const rolesDe = (auth) => (Array.isArray(auth?.roles) ? auth.roles : [auth?.roles].filter(Boolean));
const puedeEditar = (auth) => rolesDe(auth).some(r => EDITOR_ROLES.includes(r));

// Asignaciones que todavía cuentan como carga de la zona.
const OT_ABIERTAS = ['UNASSIGNED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'PENDING'];

const texto = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
const numero = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function camposDe(body) {
  const data = {};
  if (body.name           !== undefined) data.name           = String(body.name).trim();
  if (body.code           !== undefined) data.code           = texto(body.code);
  if (body.description    !== undefined) data.description    = texto(body.description);
  if (body.color          !== undefined) data.color          = texto(body.color);
  if (body.address        !== undefined) data.address        = texto(body.address);
  if (body.supervisorId   !== undefined) data.supervisorId   = texto(body.supervisorId);
  if (body.supervisorName !== undefined) data.supervisorName = texto(body.supervisorName);
  if (body.priority       !== undefined) data.priority       = body.priority || 'MEDIA';
  if (body.status         !== undefined) data.status         = body.status || 'ACTIVA';
  if (body.notes          !== undefined) data.notes          = texto(body.notes);
  if (body.latitude       !== undefined) data.latitude       = numero(body.latitude);
  if (body.longitude      !== undefined) data.longitude      = numero(body.longitude);
  if (body.radiusKm       !== undefined) data.radiusKm       = numero(body.radiusKm);
  return data;
}

/* El panorama completo del mapa. Se arma en el servidor para no bajar todas las
   OT al navegador solo para contarlas por zona. */
async function panorama() {
  const [zones, projects, ots, equipos, improvements] = await Promise.all([
    prisma.zone.findMany({ where: { archived: false }, orderBy: { name: 'asc' } }),
    prisma.project.findMany({
      where: { archived: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, code: true, name: true, status: true, progress: true, zone: true,
        location: true, projectType: true, priority: true, clientName: true,
        managerName: true, dueDate: true,
        clientContactName: true, clientContactPhone: true,
      },
    }),
    prisma.workOrder.findMany({
      where: { status: { in: OT_ABIERTAS } },
      orderBy: { scheduledDate: 'asc' },
      select: {
        id: true, otNumber: true, title: true, status: true, priority: true,
        zone: true, activity: true, projectId: true, clientName: true, storeName: true,
        address: true, latitude: true, longitude: true, scheduledDate: true,
        technicianId: true, technician: { select: { id: true, name: true } },
      },
    }),
    prisma.projectEquipment.groupBy({
      by: ['zone'], where: { status: { not: 'BAJA' } }, _count: { _all: true },
    }),
    prisma.improvement.groupBy({
      by: ['zone'], where: { status: { in: ['ABIERTA', 'EN_PROCESO'] } }, _count: { _all: true },
    }),
  ]);

  // Contadores por nombre de zona. Las zonas sin catálogo (capturadas a mano en
  // un proyecto) también aparecen: el mapa las muestra como "sin dar de alta".
  const acc = {};
  const bucket = (z) => {
    const key = (z || '').trim();
    if (!key) return null;
    return acc[key] || (acc[key] = {
      projects: 0, assignments: 0, unassigned: 0, equipment: 0, improvements: 0, techs: new Set(),
    });
  };

  for (const p of projects) { const b = bucket(p.zone); if (b) b.projects += 1; }
  for (const o of ots) {
    const b = bucket(o.zone);
    if (!b) continue;
    b.assignments += 1;
    if (o.technicianId) b.techs.add(o.technicianId); else b.unassigned += 1;
  }
  for (const e of equipos) { const b = bucket(e.zone); if (b) b.equipment += e._count._all; }
  for (const i of improvements) { const b = bucket(i.zone); if (b) b.improvements += i._count._all; }

  const stats = (name) => {
    const b = acc[name];
    return {
      projects: b?.projects || 0,
      assignments: b?.assignments || 0,
      unassigned: b?.unassigned || 0,
      equipment: b?.equipment || 0,
      improvements: b?.improvements || 0,
      technicians: b ? b.techs.size : 0,
    };
  };

  const catalogadas = new Set(zones.map(z => z.name));
  // Zonas que se escribieron a mano y todavía no existen en el catálogo.
  const sueltas = Object.keys(acc)
    .filter(n => !catalogadas.has(n))
    .map(n => ({ id: `virtual:${n}`, name: n, virtual: true, status: 'ACTIVA', ...stats(n) }));

  return {
    generatedAt: new Date().toISOString(),
    zones: [...zones.map(z => ({ ...z, virtual: false, ...stats(z.name) })), ...sueltas],
    projects,
    assignments: ots,
  };
}

export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return; // authMiddleware ya respondió 401

  const { method } = req;
  const { id } = req.query;

  try {
    if (method === 'GET') {
      return res.status(200).json(await panorama());
    }

    if (!puedeEditar(auth)) {
      return res.status(403).json({ error: 'No autorizado para administrar zonas' });
    }

    if (method === 'POST') {
      const data = camposDe(req.body || {});
      if (!data.name) return res.status(400).json({ error: 'Falta el nombre de la zona' });
      const creada = await prisma.zone.create({ data });
      return res.status(201).json(creada);
    }

    if (method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Falta el id de la zona' });
      const data = camposDe(req.body || {});
      if ('name' in data && !data.name) return res.status(400).json({ error: 'El nombre no puede quedar vacío' });

      /* Renombrar arrastra a proyectos, asignaciones, equipo y mejoras: el
         vínculo es por nombre, así que si no se actualizan quedarían huérfanos. */
      const previa = await prisma.zone.findUnique({ where: { id }, select: { name: true } });
      const actualizada = await prisma.zone.update({ where: { id }, data });
      if (previa && data.name && data.name !== previa.name) {
        await Promise.all([
          prisma.project.updateMany({ where: { zone: previa.name }, data: { zone: data.name } }),
          prisma.workOrder.updateMany({ where: { zone: previa.name }, data: { zone: data.name } }),
          prisma.projectEquipment.updateMany({ where: { zone: previa.name }, data: { zone: data.name } }),
          prisma.improvement.updateMany({ where: { zone: previa.name }, data: { zone: data.name } }),
        ]);
      }
      return res.status(200).json(actualizada);
    }

    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Falta el id de la zona' });
      // Baja lógica: lo que ya se operó en esa zona conserva su nombre.
      const archivada = await prisma.zone.update({ where: { id }, data: { archived: true } });
      return res.status(200).json({ ok: true, id: archivada.id });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'Ya existe una zona con ese nombre' });
    if (error.code === 'P2025') return res.status(404).json({ error: 'Zona no encontrada' });
    console.error('[zones]', error);
    return res.status(500).json({ error: error.message });
  }
}
