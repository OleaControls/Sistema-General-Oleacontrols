import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

export default async function handler(req, res) {
  const method = req.method.toUpperCase();

  const caller = authMiddleware(req, res);
  if (!caller) return;

  const { id } = req.query;

  try {
    // ── GET ──────────────────────────────────────────────────────────────────
    if (method === 'GET') {
      const templates = await prisma.oTTemplate.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(templates);
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (method === 'POST') {
      const { name, title, workDescription, priority, arrivalTime } = req.body;

      if (!name || !title || !workDescription) {
        return res.status(400).json({ error: 'Faltan campos requeridos: name, title, workDescription' });
      }

      const template = await prisma.oTTemplate.create({
        data: {
          name,
          title,
          workDescription,
          priority:    priority    || 'MEDIUM',
          arrivalTime: arrivalTime || '09:00',
        }
      });

      return res.status(201).json(template);
    }

    // ── PUT ──────────────────────────────────────────────────────────────────
    if (method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      const data = { ...req.body };
      delete data.id;
      delete data.createdAt;
      delete data.updatedAt;

      const updated = await prisma.oTTemplate.update({
        where: { id },
        data
      });

      return res.status(200).json(updated);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      await prisma.oTTemplate.update({
        where: { id },
        data: { status: 'INACTIVE' }
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (err) {
    console.error('[ot-templates]', err);
    return res.status(500).json({ error: 'Error interno', message: err.message });
  }
}
