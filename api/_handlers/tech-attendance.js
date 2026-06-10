import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';

// Normaliza cualquier string YYYY-MM-DD o Date a medianoche UTC exacta
const toUTCDay = (str) => {
  if (!str) {
    const now = new Date();
    return new Date(now.toISOString().slice(0, 10) + 'T00:00:00.000Z');
  }
  if (str instanceof Date) {
    return new Date(str.toISOString().slice(0, 10) + 'T00:00:00.000Z');
  }
  // Si ya viene como ISO completo, recorta
  const dateOnly = String(str).slice(0, 10);
  return new Date(dateOnly + 'T00:00:00.000Z');
};

export default async function handler(req, res) {
  const auth = await authMiddleware(req, res);
  if (!auth) return;

  const method   = req.method;
  // Extrae el segmento final de la URL: /api/tech-attendance/goals → 'goals'
  const urlSegment = req.url.split('?')[0].split('/').filter(Boolean).pop() || '';
  const resource   = urlSegment === 'tech-attendance' ? '' : urlSegment;
  const body       = req.body || {};

  try {

    // ═══════════════════════════════════════════════════════════════════════════
    // METAS DIARIAS — /api/tech-attendance/goals
    // ═══════════════════════════════════════════════════════════════════════════

    if (method === 'GET' && resource === 'goals') {
      const { techId, date } = req.query;
      const where = {};
      if (techId) where.techId = techId;
      if (date) {
        const d    = toUTCDay(date);
        const next = new Date(d); next.setUTCDate(next.getUTCDate() + 1);
        where.date = { gte: d, lt: next };
      }
      const goals = await prisma.techDailyGoal.findMany({
        where,
        include: { tech: { select: { id: true, name: true, avatar: true, position: true } } },
        orderBy: { date: 'desc' },
      });
      return res.status(200).json(goals);
    }

    if (method === 'POST' && resource === 'goals') {
      const { techId, date, clientName, clientLocation, notes, otNumber } = body;
      if (!techId || !date || !clientName)
        return res.status(400).json({ error: 'techId, date y clientName son requeridos' });

      const d = toUTCDay(date);

      // Si viene otNumber, actualizar la meta existente de esa OT si ya existe
      if (otNumber) {
        const existing = await prisma.techDailyGoal.findFirst({
          where: { techId, date: d, otNumber },
        });
        if (existing) {
          const updated = await prisma.techDailyGoal.update({
            where: { id: existing.id },
            data: { clientName, clientLocation: clientLocation || null, notes: notes || null },
          });
          return res.status(200).json(updated);
        }
      }

      const goal = await prisma.techDailyGoal.create({
        data: { techId, date: d, clientName, clientLocation: clientLocation || null, notes: notes || null, otNumber: otNumber || null, setById: auth.id },
      });
      return res.status(200).json(goal);
    }

    if (method === 'DELETE' && resource === 'goals') {
      const { id } = body;
      if (!id) return res.status(400).json({ error: 'id requerido' });
      await prisma.techDailyGoal.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // REGISTRO DIARIO — /api/tech-attendance/log
    // ═══════════════════════════════════════════════════════════════════════════

    // GET — obtener log del día
    if (method === 'GET' && resource === 'log') {
      const { techId, date } = req.query;
      if (!techId) return res.status(400).json({ error: 'techId requerido' });

      const d    = toUTCDay(date);
      const next = new Date(d); next.setUTCDate(next.getUTCDate() + 1);

      const log = await prisma.techAttendanceLog.findFirst({
        where: { techId, date: { gte: d, lt: next } },
        include: { goal: true },
      });
      return res.status(200).json(log || null);
    }

    // GET — todos los logs del día (supervisor)
    if (method === 'GET' && resource === 'logs') {
      const { date, techId } = req.query;
      const d    = toUTCDay(date);
      const next = new Date(d); next.setUTCDate(next.getUTCDate() + 1);

      const where = { date: { gte: d, lt: next } };
      if (techId) where.techId = techId;

      const logs = await prisma.techAttendanceLog.findMany({
        where,
        include: {
          goal: true,
          tech: { select: { id: true, name: true, avatar: true, position: true } },
        },
        orderBy: { checkInTime: 'asc' },
      });
      return res.status(200).json(logs);
    }

    // POST — check-in del técnico
    if (method === 'POST' && resource === 'log') {
      const { techId, goalId } = body;
      if (!techId) return res.status(400).json({ error: 'techId requerido' });

      const now  = new Date();
      const date = toUTCDay(now);
      const checkInTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

      console.log(`[tech-attendance POST /log] techId=${techId} date=${date.toISOString()} checkInTime=${checkInTime}`);

      const log = await prisma.techAttendanceLog.upsert({
        where:  { techId_date: { techId, date } },
        create: { techId, date, goalId: goalId || null, checkInTime, step: 'PERSONAL' },
        update: { checkInTime, step: 'PERSONAL', goalId: goalId || null },
        include: { goal: true },
      });

      console.log(`[tech-attendance POST /log] saved id=${log.id}`);
      return res.status(200).json(log);
    }

    // PATCH — actualiza checklists / step / checkout
    if (method === 'PATCH' && resource === 'log') {
      const { id, step, checklistPersonal, checklistVehicle, personalMissing, vehicleMissing,
              personalReportSent, vehicleReportSent, checkOutTime, status } = body;
      if (!id) return res.status(400).json({ error: 'id requerido' });

      const data = {};
      if (step               !== undefined) data.step               = step;
      if (checklistPersonal  !== undefined) data.checklistPersonal  = checklistPersonal;
      if (checklistVehicle   !== undefined) data.checklistVehicle   = checklistVehicle;
      if (personalMissing    !== undefined) data.personalMissing    = personalMissing;
      if (vehicleMissing     !== undefined) data.vehicleMissing     = vehicleMissing;
      if (personalReportSent !== undefined) data.personalReportSent = personalReportSent;
      if (vehicleReportSent  !== undefined) data.vehicleReportSent  = vehicleReportSent;
      if (checkOutTime       !== undefined) data.checkOutTime       = checkOutTime;
      if (status             !== undefined) data.status             = status;

      const log = await prisma.techAttendanceLog.update({ where: { id }, data, include: { goal: true } });
      return res.status(200).json(log);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[tech-attendance] error:', err);
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
}
