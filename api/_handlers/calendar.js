import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'
import { uploadToR2 } from '../_lib/r2.js'

export default async function handler(req, res) {
  const { method } = req;
  const user = authMiddleware(req, res);
  if (!user) return;

  if (method === 'GET') {
    try {
      const roles = Array.isArray(user.roles) ? user.roles : [];
      const canSeeAll = roles.includes('ADMIN') || roles.includes('SUPERVISOR');
      const where = canSeeAll ? {} : { userId: user.id };
      const events = await prisma.calendarEvent.findMany({
        where,
        include: { user: { select: { name: true, avatar: true } } },
        orderBy: { startDate: 'asc' }
      });
      return res.status(200).json(events);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { title, description, type, startDate, endDate, allDay, color, otClientId } = req.body;
      const event = await prisma.calendarEvent.create({
        data: {
          title,
          description,
          type,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          allDay: allDay || false,
          color: color || '#3b82f6',
          userId: user.id,
          otClientId: otClientId || null
        }
      });
      return res.status(201).json(event);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'PUT') {
    try {
      const { id, evidence, ...data } = req.body;

      // Si viene una evidencia nueva, subirla a R2 y appendar al array
      if (evidence) {
        const event = await prisma.calendarEvent.findUnique({ where: { id } });
        if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

        const url = await uploadToR2(evidence.base64, 'calendar/evidences', `${id}/${Date.now()}_${evidence.name}`);
        const current = Array.isArray(event.evidences) ? event.evidences : [];
        const updated = await prisma.calendarEvent.update({
          where: { id },
          data: { evidences: [...current, { url, name: evidence.name, type: evidence.type, date: new Date().toISOString() }] }
        });
        return res.status(200).json(updated);
      }

      if (data.startDate) data.startDate = new Date(data.startDate);
      if (data.endDate)   data.endDate   = new Date(data.endDate);

      const updated = await prisma.calendarEvent.update({ where: { id }, data });
      return res.status(200).json(updated);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const { id } = req.query;
      await prisma.calendarEvent.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
