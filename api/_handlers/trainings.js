import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

/* ── Capacitación técnica ────────────────────────────────────────────────────
   Cada renglón es un tema impartido a un técnico: temario, instructor,
   resultado, evidencia y —lo que vigila el supervisor— la fecha de la próxima.
   El técnico ve la suya; RH, proyectos y supervisión ven todas. */

const EDITOR_ROLES = ['ADMIN', 'HR', 'PROJECT_MANAGER', 'SUPERVISOR'];
const VIEW_ALL_ROLES = ['ADMIN', 'HR', 'PROJECT_MANAGER', 'SUPERVISOR'];

const rolesDe = (auth) => (Array.isArray(auth?.roles) ? auth.roles : [auth?.roles].filter(Boolean));
const puedeEditar = (auth) => rolesDe(auth).some(r => EDITOR_ROLES.includes(r));
const veTodo = (auth) => rolesDe(auth).some(r => VIEW_ALL_ROLES.includes(r));

const texto = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
const fecha = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const numero = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function camposDe(body, autor) {
  const data = {};
  if (body.employeeId  !== undefined) data.employeeId  = String(body.employeeId);
  if (body.topic       !== undefined) data.topic       = String(body.topic).trim();
  if (body.syllabus    !== undefined) data.syllabus    = texto(body.syllabus);
  if (body.instructor  !== undefined) data.instructor  = texto(body.instructor);
  if (body.notes       !== undefined) data.notes       = texto(body.notes);
  if (body.evidenceUrl !== undefined) data.evidenceUrl = texto(body.evidenceUrl);
  if (body.result      !== undefined) data.result      = body.result || 'PENDIENTE';
  if (body.date        !== undefined) data.date        = fecha(body.date);
  if (body.nextDate    !== undefined) data.nextDate    = fecha(body.nextDate);
  if (body.hours       !== undefined) data.hours       = numero(body.hours);
  if (body.score       !== undefined) data.score       = numero(body.score);
  if (autor) data.createdByName = autor;
  return data;
}

export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return;

  const { method } = req;
  const { id, employeeId } = req.query;
  const autor = auth.name || auth.email || null;

  try {
    if (method === 'GET') {
      // Sin permiso de ver todo, cada quien ve solo su historial.
      const where = veTodo(auth)
        ? (employeeId ? { employeeId } : {})
        : { employeeId: auth.id };

      const items = await prisma.training.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: { employee: { select: { id: true, name: true, position: true, avatar: true } } },
      });
      return res.status(200).json(items);
    }

    if (!puedeEditar(auth)) {
      return res.status(403).json({ error: 'No autorizado para registrar capacitaciones' });
    }

    if (method === 'POST') {
      const data = camposDe(req.body || {}, autor);
      if (!data.employeeId) return res.status(400).json({ error: 'Falta el técnico' });
      if (!data.topic) return res.status(400).json({ error: 'Falta el tema de la capacitación' });
      const creada = await prisma.training.create({
        data,
        include: { employee: { select: { id: true, name: true, position: true, avatar: true } } },
      });
      return res.status(201).json(creada);
    }

    if (method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Falta el id de la capacitación' });
      const data = camposDe(req.body || {}, null);
      if ('topic' in data && !data.topic) return res.status(400).json({ error: 'El tema no puede quedar vacío' });
      const actualizada = await prisma.training.update({
        where: { id },
        data,
        include: { employee: { select: { id: true, name: true, position: true, avatar: true } } },
      });
      return res.status(200).json(actualizada);
    }

    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Falta el id de la capacitación' });
      await prisma.training.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Capacitación no encontrada' });
    console.error('[trainings]', error);
    return res.status(500).json({ error: error.message });
  }
}
