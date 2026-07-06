import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';

export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return; // authMiddleware ya respondió 401

  const method = req.method?.toUpperCase();

  try {
    // ── GET /api/announcements ─────────────────────────────────────────────────
    if (method === 'GET') {
      const { id, employeeId } = req.query;

      if (id) {
        const ann = await prisma.announcement.findUnique({
          where: { id },
          include: { reads: { select: { employeeId: true, confirmedAt: true } } },
        });
        if (!ann) return res.status(404).json({ error: 'No encontrado' });
        return res.status(200).json(ann);
      }

      const announcements = await prisma.announcement.findMany({
        orderBy: { createdAt: 'desc' },
        include: { reads: { select: { employeeId: true, confirmedAt: true } } },
      });

      // Total de empleados activos para calcular tasa de lectura
      const totalEmps = await prisma.employee.count({ where: { status: 'ACTIVE' } });

      const result = announcements.map(a => ({
        ...a,
        readCount:  a.reads.length,
        readRate:   totalEmps > 0 ? Math.round((a.reads.length / totalEmps) * 100) : 0,
        readByMe:   employeeId ? a.reads.some(r => r.employeeId === employeeId) : false,
      }));

      return res.status(200).json({ announcements: result, totalEmployees: totalEmps });
    }

    // ── POST /api/announcements ────────────────────────────────────────────────
    if (method === 'POST') {
      const { action } = req.query;

      // Marcar como leído
      if (action === 'read') {
        const { announcementId, employeeId } = req.body;
        if (!announcementId || !employeeId) return res.status(400).json({ error: 'Faltan parámetros' });
        await prisma.announcementRead.upsert({
          where:  { announcementId_employeeId: { announcementId, employeeId } },
          update: {},
          create: { announcementId, employeeId },
        });
        return res.status(200).json({ ok: true });
      }

      // Crear anuncio
      const { title, content, type, category, targetDepts, targetRoles, requiresConfirmation, authorId } = req.body;
      if (!title || !content) return res.status(400).json({ error: 'Título y contenido son requeridos' });

      const ann = await prisma.announcement.create({
        data: {
          title, content,
          type:                type || 'INFO',
          category:            category || 'GENERAL',
          targetDepts:         Array.isArray(targetDepts) ? targetDepts : [],
          targetRoles:         Array.isArray(targetRoles) ? targetRoles : [],
          requiresConfirmation: requiresConfirmation || false,
          authorId:            authorId || null,
        },
        include: { reads: true },
      });
      return res.status(201).json(ann);
    }

    // ── PUT /api/announcements ─────────────────────────────────────────────────
    if (method === 'PUT') {
      const { id, ...data } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      const updated = await prisma.announcement.update({ where: { id }, data });
      return res.status(200).json(updated);
    }

    // ── DELETE /api/announcements ──────────────────────────────────────────────
    if (method === 'DELETE') {
      const id = req.query.id || req.body?.id;
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      await prisma.announcement.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('[Announcements]', err);
    return res.status(500).json({ error: err.message });
  }
}
