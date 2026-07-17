import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

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
};

// Campos DateTime por modelo — se convierten '' → null y string → Date.
const DATE_FIELDS = ['startDate', 'endDate', 'date', 'decidedAt', 'closedAt'];

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

// Genera un folio incremental PROY-AAAA-NNN.
async function nextProjectCode() {
  const year = new Date().getFullYear();
  const prefix = `PROY-${year}-`;
  const last = await prisma.project.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
    select: { code: true },
  });
  const n = last ? parseInt(last.code.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(n).padStart(3, '0')}`;
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
        documents: 'documento', changes: 'cambio',
      };

      if (method === 'POST') {
        if (!id) return res.status(400).json({ error: 'Falta id del proyecto' });
        const created = await delegate.create({ data: { ...sanitize(req.body), projectId: id } });
        if (sub === 'tasks') await recomputeProgress(id);
        await logActivity(id, `Agregó ${SUB_LABEL[sub] || 'registro'}`, created.name || created.title || created.description || created.concept, actor);
        return res.status(201).json(created);
      }

      if (method === 'PUT') {
        if (!subId) return res.status(400).json({ error: 'Falta subId' });
        const updated = await delegate.update({ where: { id: subId }, data: sanitize(req.body) });
        if (sub === 'tasks' && updated.projectId) await recomputeProgress(updated.projectId);
        await logActivity(updated.projectId, `Actualizó ${SUB_LABEL[sub] || 'registro'}`, updated.name || updated.title || updated.description || updated.concept, actor);
        return res.status(200).json(updated);
      }

      if (method === 'DELETE') {
        if (!subId) return res.status(400).json({ error: 'Falta subId' });
        const rec = await delegate.findUnique({ where: { id: subId } });
        await delegate.delete({ where: { id: subId } });
        if (rec?.projectId) {
          if (sub === 'tasks') await recomputeProgress(rec.projectId);
          await logActivity(rec.projectId, `Eliminó ${SUB_LABEL[sub] || 'registro'}`, rec.name || rec.title || null, actor);
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
      const project = await prisma.project.create({
        data: { ...data, code: await nextProjectCode() },
      });
      await logActivity(project.id, 'Creó el proyecto', project.name, actor);
      return res.status(201).json(project);
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (err) {
    console.error('[projects]', err);
    return res.status(500).json({ error: 'Error interno', message: err.message });
  }
}
