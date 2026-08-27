import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'
import { createProjectWithCode } from '../_lib/projectCode.js'

// Mapa de sub-recurso (query ?sub=) → delegate de Prisma.
const SUB = {
  tasks:          'projectTask',
  risks:          'projectRisk',
  costs:          'projectCost',
  resources:      'projectResource',
  quality:        'projectQuality',
  communications: 'projectCommunication',
  incidents:      'projectIncident',
  documents:      'projectDocument',
  changes:        'projectChange',
  quotes:         'projectQuote',
  // Inventario de equipo del proyecto (con número de serie).
  equipment:      'projectEquipment',
  // Tiendas: pendientes y solicitudes de recurso. El inventario es global y
  // vive en /api/store-inventory, no como sub-recurso del proyecto.
  pendings:         'projectPending',
  resourceRequests: 'projectResourceRequest',
};

// Campos DateTime por modelo — se convierten '' → null y string → Date.
const DATE_FIELDS = ['startDate', 'endDate', 'dueDate', 'date', 'decidedAt', 'closedAt', 'cutoffDate', 'requestedAt', 'assignedAt', 'nextDate'];

// Limpia el body: quita campos gestionados por el servidor y normaliza fechas.
function sanitize(body) {
  const data = { ...body };
  delete data.id;
  delete data.projectId;
  delete data.project;
  delete data.createdAt;
  delete data.updatedAt;
  for (const f of DATE_FIELDS) {
    if (f in data) {
      data[f] = data[f] ? new Date(data[f]) : null;
    }
  }
  return data;
}

// Etiqueta legible de un sub-registro, para el detalle de la bitácora.
function recLabel(rec) {
  if (!rec) return null;
  if (rec.systemLabel) return `${rec.localName ? `${rec.localName} — ` : ''}${rec.systemLabel} (${rec.area} m²)`;
  return rec.name || rec.title || rec.description || rec.concept || null;
}

// Roles autorizados para gestionar proyectos.
const ALLOWED_ROLES = ['PROJECT_MANAGER', 'ADMIN'];
function canManage(caller) {
  const roles = Array.isArray(caller?.roles) ? caller.roles : [];
  return roles.some(r => ALLOWED_ROLES.includes(r));
}

// Registra una entrada en la bitácora de actividad (silencioso si falla).
async function logActivity(projectId, action, detail, authorName) {
  try {
    await prisma.projectActivity.create({ data: { projectId, action, detail: detail || null, authorName: authorName || null } });
  } catch (e) { console.warn('[projects] logActivity', e.message); }
}

// Si el proyecto usa avance automático, recalcula progress desde sus tareas.
async function recomputeProgress(projectId) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { autoProgress: true } });
  if (!project?.autoProgress) return;
  const tasks = await prisma.projectTask.findMany({ where: { projectId }, select: { progress: true, status: true } });
  if (tasks.length === 0) return;
  const avg = Math.round(tasks.reduce((a, t) => a + (t.status === 'DONE' ? 100 : (t.progress || 0)), 0) / tasks.length);
  await prisma.project.update({ where: { id: projectId }, data: { progress: Math.max(0, Math.min(100, avg)) } });
}

// Estados de una asignación que sigue viva (todavía cuenta como carga).
const OT_ABIERTAS = ['UNASSIGNED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'PENDING'];

// Un técnico está ocupado si trae una asignación en curso o programada para hoy.
const OT_OCUPADO = ['ACCEPTED', 'IN_PROGRESS'];

/* ── Panel de Supervisión ────────────────────────────────────────────────────
   Una sola llamada con todo lo que el gerente necesita ver: proyectos con sus
   pendientes, las asignaciones repartidas en atrasadas / hoy / próximas, la
   carga de cada técnico y los documentos de campo por vencer.
   Se agrega aquí y no en el cliente para no bajar cientos de OT al navegador. */
async function buildSupervision() {
  const now = new Date();
  const hoy = new Date(now); hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(manana.getDate() + 1);
  const en7 = new Date(hoy); en7.setDate(en7.getDate() + 7);
  const en30 = new Date(hoy); en30.setDate(en30.getDate() + 30);

  const [projects, incidencias, solicitudes, pendientes, ots, techs, docs, capacitaciones] = await Promise.all([
    prisma.project.findMany({
      where: { archived: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, code: true, name: true, status: true, progress: true,
        serviceType: true, projectType: true, priority: true, zone: true, location: true,
        brand: true,
        startDate: true, endDate: true, dueDate: true, leadDays: true,
        managerName: true, clientName: true,
        clientContactName: true, clientContactPhone: true, clientContactEmail: true,
        budget: true, actualCost: true,
      },
    }),
    prisma.projectIncident.groupBy({
      by: ['projectId'], where: { status: { not: 'RESUELTA' } }, _count: { _all: true },
    }),
    prisma.projectResourceRequest.groupBy({
      by: ['projectId'], where: { status: 'SOLICITADO' }, _count: { _all: true },
    }),
    prisma.projectPending.groupBy({
      by: ['projectId'], where: { status: { not: 'CERRADO' } }, _count: { _all: true },
    }),
    prisma.workOrder.findMany({
      where: { status: { in: OT_ABIERTAS } },
      orderBy: { scheduledDate: 'asc' },
      select: {
        id: true, otNumber: true, title: true, status: true, priority: true, kind: true,
        zone: true, activity: true, projectId: true, clientName: true, storeName: true,
        address: true, scheduledDate: true, arrivalTime: true, timeLimitHours: true,
        startedAt: true, technicianId: true,
        technician: { select: { id: true, name: true, avatar: true } },
      },
    }),
    prisma.employee.findMany({
      where: { status: 'ACTIVE', roles: { has: 'TECHNICIAN' } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, avatar: true, position: true },
    }),
    prisma.techFieldDoc.findMany({
      where: { expiresAt: { not: null, lt: en30 } },
      orderBy: { expiresAt: 'asc' },
      select: {
        id: true, type: true, expiresAt: true, employeeId: true,
        employee: { select: { name: true } },
      },
    }),
    // Capacitaciones con próxima fecha dentro de 30 días (o ya vencida).
    prisma.training.findMany({
      where: { nextDate: { not: null, lt: en30 } },
      orderBy: { nextDate: 'asc' },
      select: {
        id: true, topic: true, nextDate: true, result: true, employeeId: true,
        employee: { select: { name: true } },
      },
    }),
  ]);

  const porProyecto = (rows) => Object.fromEntries(
    rows.filter(r => r.projectId).map(r => [r.projectId, r._count._all])
  );
  const incByProject = porProyecto(incidencias);
  const reqByProject = porProyecto(solicitudes);
  const penByProject = porProyecto(pendientes);

  // Reparto de las asignaciones abiertas por ventana de tiempo.
  const buckets = { overdue: [], today: [], upcoming: [], unscheduled: [] };
  const otsPorProyecto = {};
  const cargaPorTecnico = {};

  for (const ot of ots) {
    const f = ot.scheduledDate ? new Date(ot.scheduledDate) : null;
    if (!f) buckets.unscheduled.push(ot);
    else if (f < hoy) buckets.overdue.push(ot);
    else if (f < manana) buckets.today.push(ot);
    else if (f < en7) buckets.upcoming.push(ot);

    if (ot.projectId) {
      const acc = otsPorProyecto[ot.projectId] || (otsPorProyecto[ot.projectId] = { open: 0, next: null });
      acc.open += 1;
      if (f && f >= hoy && (!acc.next || f < new Date(acc.next))) acc.next = f.toISOString();
    }

    if (ot.technicianId) {
      const t = cargaPorTecnico[ot.technicianId] || (cargaPorTecnico[ot.technicianId] = { open: 0, today: 0, overdue: 0, busy: false });
      t.open += 1;
      if (f && f >= hoy && f < manana) t.today += 1;
      if (f && f < hoy) t.overdue += 1;
      if (OT_OCUPADO.includes(ot.status) || (f && f >= hoy && f < manana)) t.busy = true;
    }
  }

  return {
    generatedAt: now.toISOString(),
    projects: projects.map(p => ({
      ...p,
      openIncidents: incByProject[p.id] || 0,
      pendingRequests: reqByProject[p.id] || 0,
      openPendings: penByProject[p.id] || 0,
      openAssignments: otsPorProyecto[p.id]?.open || 0,
      nextAssignmentDate: otsPorProyecto[p.id]?.next || null,
    })),
    assignments: buckets,
    technicians: techs.map(t => ({
      ...t,
      ...(cargaPorTecnico[t.id] || { open: 0, today: 0, overdue: 0, busy: false }),
    })),
    fieldDocs: docs.map(d => ({
      id: d.id, type: d.type, expiresAt: d.expiresAt,
      employeeId: d.employeeId, employeeName: d.employee?.name || null,
      expired: new Date(d.expiresAt) < hoy,
    })),
    trainings: capacitaciones.map(t => ({
      id: t.id, topic: t.topic, nextDate: t.nextDate, result: t.result,
      employeeId: t.employeeId, employeeName: t.employee?.name || null,
      overdue: new Date(t.nextDate) < hoy,
    })),
  };
}

export default async function handler(req, res) {
  const method = req.method.toUpperCase();

  const caller = authMiddleware(req, res);
  if (!caller) return;

  // Solo Gerente de Proyectos / Admin pueden gestionar proyectos.
  if (!canManage(caller)) {
    return res.status(403).json({ error: 'No autorizado para gestionar proyectos' });
  }

  const actor = caller.name || caller.email || 'Sistema';
  const { id, sub, subId } = req.query;

  try {
    // ─────────────────────────────────────────────────────────────────────
    // SUB-RECURSOS: /api/projects?id=X&sub=tasks  (POST)
    //               /api/projects?sub=tasks&subId=Y  (PUT/DELETE)
    // ─────────────────────────────────────────────────────────────────────
    if (sub) {
      const delegateName = SUB[sub];
      if (!delegateName) return res.status(400).json({ error: `Sub-recurso inválido: ${sub}` });
      const delegate = prisma[delegateName];

      const SUB_LABEL = {
        tasks: 'tarea', risks: 'riesgo', costs: 'costo', resources: 'recurso',
        quality: 'ítem de calidad', communications: 'comunicación', incidents: 'incidencia',
        documents: 'documento', changes: 'cambio', quotes: 'partida cotizada',
        equipment: 'equipo',
        pendings: 'pendiente', resourceRequests: 'solicitud de recurso',
      };

      if (method === 'POST') {
        if (!id) return res.status(400).json({ error: 'Falta id del proyecto' });
        const created = await delegate.create({ data: { ...sanitize(req.body), projectId: id } });
        if (sub === 'tasks') await recomputeProgress(id);
        await logActivity(id, `Agregó ${SUB_LABEL[sub] || 'registro'}`, recLabel(created), actor);
        return res.status(201).json(created);
      }

      if (method === 'PUT') {
        if (!subId) return res.status(400).json({ error: 'Falta subId' });
        const updated = await delegate.update({ where: { id: subId }, data: sanitize(req.body) });
        if (sub === 'tasks' && updated.projectId) await recomputeProgress(updated.projectId);
        await logActivity(updated.projectId, `Actualizó ${SUB_LABEL[sub] || 'registro'}`, recLabel(updated), actor);
        return res.status(200).json(updated);
      }

      if (method === 'DELETE') {
        if (!subId) return res.status(400).json({ error: 'Falta subId' });
        const rec = await delegate.findUnique({ where: { id: subId } });
        await delegate.delete({ where: { id: subId } });
        if (rec?.projectId) {
          if (sub === 'tasks') await recomputeProgress(rec.projectId);
          await logActivity(rec.projectId, `Eliminó ${SUB_LABEL[sub] || 'registro'}`, recLabel(rec), actor);
        }
        return res.status(200).json({ ok: true });
      }

      return res.status(405).json({ error: 'Método no permitido' });
    }

    // ─────────────────────────────────────────────────────────────────────
    // PROYECTO INDIVIDUAL: /api/projects?id=X
    // ─────────────────────────────────────────────────────────────────────
    if (id) {
      if (method === 'GET') {
        const project = await prisma.project.findUnique({
          where: { id },
          include: {
            tasks:          { orderBy: { order: 'asc' } },
            risks:          { orderBy: { createdAt: 'desc' } },
            costs:          { orderBy: { createdAt: 'desc' } },
            resources:      { orderBy: { createdAt: 'desc' } },
            qualityItems:   { orderBy: { createdAt: 'desc' } },
            communications: { orderBy: { date: 'desc' } },
            incidents:      { orderBy: { createdAt: 'desc' } },
            documents:      { orderBy: { createdAt: 'desc' } },
            changes:        { orderBy: { createdAt: 'desc' } },
            quotes:         { orderBy: { createdAt: 'desc' } },
            equipment:      { orderBy: { createdAt: 'desc' } },
            pendings:         { orderBy: { createdAt: 'desc' } },
            resourceRequests: { orderBy: { requestedAt: 'desc' } },
            activities:     { orderBy: { createdAt: 'desc' }, take: 60 },
          },
        });
        if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
        return res.status(200).json(project);
      }

      if (method === 'PUT') {
        const prev = await prisma.project.findUnique({ where: { id }, select: { status: true } });
        const updated = await prisma.project.update({ where: { id }, data: sanitize(req.body) });
        if (prev && req.body.status && req.body.status !== prev.status) {
          await logActivity(id, `Cambió el estado a ${updated.status}`, null, actor);
        }
        return res.status(200).json(updated);
      }

      if (method === 'DELETE') {
        // Baja lógica
        await prisma.project.update({ where: { id }, data: { archived: true } });
        await logActivity(id, 'Archivó el proyecto', null, actor);
        return res.status(200).json({ ok: true });
      }

      return res.status(405).json({ error: 'Método no permitido' });
    }

    // ─────────────────────────────────────────────────────────────────────
    // COLECCIÓN: /api/projects
    // ─────────────────────────────────────────────────────────────────────
    if (method === 'GET' && req.query.scope === 'supervision') {
      return res.status(200).json(await buildSupervision());
    }

    if (method === 'GET') {
      const projects = await prisma.project.findMany({
        where: { archived: false },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { tasks: true, risks: true, incidents: true } },
        },
      });
      return res.status(200).json(projects);
    }

    if (method === 'POST') {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: 'El nombre del proyecto es requerido' });
      const data = sanitize(req.body);
      const project = await createProjectWithCode(prisma, data);
      await logActivity(project.id, 'Creó el proyecto', project.name, actor);
      return res.status(201).json(project);
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (err) {
    console.error('[projects]', err);
    return res.status(500).json({ error: 'Error interno', message: err.message });
  }
}
