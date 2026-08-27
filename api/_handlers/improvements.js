import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

/* ── Mejora continua ─────────────────────────────────────────────────────────
   Las "áreas de mejora" dejan de ser una hoja suelta: cada renglón es un
   problema detectado con su acción, su responsable y su objetivo, clasificado
   en el módulo del sistema al que corresponde. Cerrar una deja fecha de cierre
   para poder medir cuánto se tardó en atenderla. */

const EDITOR_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERVISOR'];
const rolesDe = (auth) => (Array.isArray(auth?.roles) ? auth.roles : [auth?.roles].filter(Boolean));
const puedeEditar = (auth) => rolesDe(auth).some(r => EDITOR_ROLES.includes(r));

const CERRADAS = ['IMPLEMENTADA', 'DESCARTADA'];

const texto = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
const fecha = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

function camposDe(body, autor) {
  const data = {};
  if (body.area        !== undefined) data.area        = String(body.area).trim();
  if (body.problem     !== undefined) data.problem     = String(body.problem).trim();
  if (body.module      !== undefined) data.module      = texto(body.module);
  if (body.action      !== undefined) data.action      = texto(body.action);
  if (body.objective   !== undefined) data.objective   = texto(body.objective);
  if (body.ownerId     !== undefined) data.ownerId     = texto(body.ownerId);
  if (body.ownerName   !== undefined) data.ownerName   = texto(body.ownerName);
  if (body.projectId   !== undefined) data.projectId   = texto(body.projectId);
  if (body.zone        !== undefined) data.zone        = texto(body.zone);
  if (body.evidenceUrl !== undefined) data.evidenceUrl = texto(body.evidenceUrl);
  if (body.notes       !== undefined) data.notes       = texto(body.notes);
  if (body.priority    !== undefined) data.priority    = body.priority || 'MEDIA';
  if (body.dueDate     !== undefined) data.dueDate     = fecha(body.dueDate);
  if (body.status      !== undefined) {
    data.status = body.status || 'ABIERTA';
    // La fecha de cierre la pone el servidor: se sella al cerrar y se borra si
    // la mejora se reabre.
    data.closedAt = CERRADAS.includes(data.status) ? new Date() : null;
  }
  if (autor) data.createdByName = autor;
  return data;
}

export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return;

  const { method } = req;
  const { id, status } = req.query;

  try {
    if (method === 'GET') {
      const items = await prisma.improvement.findMany({
        where: status ? { status } : {},
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      });
      return res.status(200).json(items);
    }

    if (!puedeEditar(auth)) {
      return res.status(403).json({ error: 'No autorizado para administrar la mejora continua' });
    }

    const autor = auth.name || auth.email || null;

    if (method === 'POST') {
      const data = camposDe(req.body || {}, autor);
      if (!data.area) return res.status(400).json({ error: 'Falta el área' });
      if (!data.problem) return res.status(400).json({ error: 'Falta describir el problema' });
      const creada = await prisma.improvement.create({ data });
      return res.status(201).json(creada);
    }

    if (method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Falta el id de la mejora' });
      const data = camposDe(req.body || {}, null);
      if ('area' in data && !data.area) return res.status(400).json({ error: 'El área no puede quedar vacía' });
      if ('problem' in data && !data.problem) return res.status(400).json({ error: 'El problema no puede quedar vacío' });
      const actualizada = await prisma.improvement.update({ where: { id }, data });
      return res.status(200).json(actualizada);
    }

    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Falta el id de la mejora' });
      await prisma.improvement.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Mejora no encontrada' });
    console.error('[improvements]', error);
    return res.status(500).json({ error: error.message });
  }
}
