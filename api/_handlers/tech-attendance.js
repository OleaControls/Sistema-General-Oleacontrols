import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';

export default async function handler(req, res) {
  const auth = await authMiddleware(req, res);
  if (!auth) return;

  const method   = req.method;
  const resource = req.params?.resource || req.query?.resource || '';
  const body     = req.body || {};

  // ═══════════════════════════════════════════════════════════════════════════
  // METAS DIARIAS — /api/tech-attendance/goals
  // ═══════════════════════════════════════════════════════════════════════════

  // GET /api/tech-attendance/goals?techId=&date=
  if (method === 'GET' && resource === 'goals') {
    const { techId, date } = req.query;
    const where = {};
    if (techId) where.techId = techId;
    if (date) {
      const d = new Date(date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      where.date = { gte: d, lt: next };
    }
    const goals = await prisma.techDailyGoal.findMany({
      where,
      include: { tech: { select: { id: true, name: true, avatar: true, position: true } } },
      orderBy: { date: 'desc' },
    });
    return res.status(200).json(goals);
  }

  // POST /api/tech-attendance/goals — supervisor crea/actualiza meta
  if (method === 'POST' && resource === 'goals') {
    const { techId, date, clientName, clientLocation, notes } = body;
    if (!techId || !date || !clientName)
      return res.status(400).json({ error: 'techId, date y clientName son requeridos' });

    const d = new Date(date);
    const goal = await prisma.techDailyGoal.upsert({
      where: { techId_date: { techId, date: d } },
      create: { techId, date: d, clientName, clientLocation: clientLocation || null, notes: notes || null, setById: auth.id },
      update: { clientName, clientLocation: clientLocation || null, notes: notes || null },
    });
    return res.status(200).json(goal);
  }

  // DELETE /api/tech-attendance/goals
  if (method === 'DELETE' && resource === 'goals') {
    const { id } = body;
    if (!id) return res.status(400).json({ error: 'id requerido' });
    await prisma.techDailyGoal.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTRO DIARIO — /api/tech-attendance/log
  // ═══════════════════════════════════════════════════════════════════════════

  // GET /api/tech-attendance/log?techId=&date=
  if (method === 'GET' && resource === 'log') {
    const { techId, date } = req.query;
    if (!techId) return res.status(400).json({ error: 'techId requerido' });

    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(next.getDate() + 1);

    const log = await prisma.techAttendanceLog.findFirst({
      where: { techId, date: { gte: d, lt: next } },
      include: { goal: true },
    });
    return res.status(200).json(log || null);
  }

  // GET /api/tech-attendance/logs?date=&techId= — para supervisor: todos los logs del día
  if (method === 'GET' && resource === 'logs') {
    const { date, techId } = req.query;
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(next.getDate() + 1);

    const where = { date: { gte: d, lt: next } };
    if (techId) where.techId = techId;

    const logs = await prisma.techAttendanceLog.findMany({
      where,
      include: {
        goal: true,
        tech: { select: { id: true, name: true, avatar: true, position: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return res.status(200).json(logs);
  }

  // POST /api/tech-attendance/log — check-in
  if (method === 'POST' && resource === 'log') {
    const { techId, goalId } = body;
    if (!techId) return res.status(400).json({ error: 'techId requerido' });

    const now  = new Date();
    const date = new Date(now); date.setHours(0, 0, 0, 0);
    const checkInTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const log = await prisma.techAttendanceLog.upsert({
      where: { techId_date: { techId, date } },
      create: { techId, date, goalId: goalId || null, checkInTime, step: 'PERSONAL' },
      update: { checkInTime, step: 'PERSONAL', goalId: goalId || null },
    });
    return res.status(200).json(log);
  }

  // PATCH /api/tech-attendance/log — actualiza step (checklist o checkout)
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
}
