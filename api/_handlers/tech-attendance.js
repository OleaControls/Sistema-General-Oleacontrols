import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';
import { sendTelegramDocument } from '../_lib/telegram.js';

// Medianoche UTC — para attendance logs (necesario por el @@unique([techId, date]))
const toUTCDay = (str) => {
  const dateOnly = str instanceof Date
    ? str.toISOString().slice(0, 10)
    : str ? String(str).slice(0, 10) : new Date().toISOString().slice(0, 10);
  return new Date(dateOnly + 'T00:00:00.000Z');
};

// Mediodía UTC — para goals y OT dates, evita el desfase de zona horaria en visualización
const toUTCNoon = (str) => {
  const dateOnly = str instanceof Date
    ? str.toISOString().slice(0, 10)
    : str ? String(str).slice(0, 10) : new Date().toISOString().slice(0, 10);
  return new Date(dateOnly + 'T12:00:00.000Z');
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
      const { techId, date, otNumber, upcoming } = req.query;
      const where = {};
      if (techId)   where.techId   = techId;
      if (otNumber) where.otNumber = otNumber;
      if (upcoming === 'true') {
        // Próximas metas: desde mañana hasta 14 días adelante
        const tomorrow = toUTCDay(new Date(Date.now() + 86400000));
        const horizon  = new Date(tomorrow); horizon.setUTCDate(horizon.getUTCDate() + 14);
        where.date = { gte: tomorrow, lt: horizon };
      } else if (date) {
        // Rango completo del día en UTC para encontrar metas guardadas a cualquier hora
        const d    = toUTCDay(date);
        const next = new Date(d); next.setUTCDate(next.getUTCDate() + 1);
        where.date = { gte: d, lt: next };
      }
      const goals = await prisma.techDailyGoal.findMany({
        where,
        include: { tech: { select: { id: true, name: true, avatar: true, position: true } } },
        orderBy: { date: 'asc' },
      });
      return res.status(200).json(goals);
    }

    if (method === 'POST' && resource === 'goals') {
      const { id, techId, date, clientName, clientLocation, notes, otNumber, hasVehicle, confirmed } = body;

      // Edición directa por id (desde TechAttendanceAdmin o confirmación del técnico)
      if (id) {
        const updateData = {};
        if (clientName     !== undefined) updateData.clientName     = clientName;
        if (clientLocation !== undefined) updateData.clientLocation = clientLocation || null;
        if (notes          !== undefined) updateData.notes          = notes || null;
        if (hasVehicle     !== undefined) updateData.hasVehicle     = Boolean(hasVehicle);
        if (confirmed      !== undefined) updateData.confirmed      = Boolean(confirmed);
        if (date           !== undefined) updateData.date           = toUTCNoon(date);
        if (otNumber       !== undefined) updateData.otNumber       = otNumber || null;

        console.log('[goals PATCH] body:', JSON.stringify(body), '| updateData:', JSON.stringify(updateData));
      if (Object.keys(updateData).length === 0)
          return res.status(400).json({ error: 'Nada que actualizar', received: body });

        const updated = await prisma.techDailyGoal.update({ where: { id }, data: updateData });
        return res.status(200).json(updated);
      }

      if (!techId || !date || !clientName)
        return res.status(400).json({ error: 'techId, date y clientName son requeridos' });

      const d = toUTCNoon(date); // Mediodía UTC — sin desfase de zona horaria

      // Si viene otNumber, buscar meta existente de esa OT (sin importar la fecha anterior)
      // para actualizar la fecha si la OT fue reprogramada
      if (otNumber) {
        const existing = await prisma.techDailyGoal.findFirst({
          where: { techId, otNumber },
        });
        if (existing) {
          const updated = await prisma.techDailyGoal.update({
            where: { id: existing.id },
            data: {
              date: d,   // actualiza la fecha si la OT fue reprogramada
              clientName,
              clientLocation: clientLocation || null,
              notes: notes || null,
              hasVehicle: hasVehicle !== undefined ? Boolean(hasVehicle) : existing.hasVehicle,
            },
          });
          return res.status(200).json(updated);
        }
      }

      const goal = await prisma.techDailyGoal.create({
        data: {
          techId, date: d, clientName,
          clientLocation: clientLocation || null,
          notes: notes || null,
          otNumber: otNumber || null,
          hasVehicle: Boolean(hasVehicle),
          setById: auth.id,
        },
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

    // POST — iniciar registro del día (sin checkInTime; se registra al completar checklists)
    if (method === 'POST' && resource === 'log') {
      const { techId, goalId } = body;
      if (!techId) return res.status(400).json({ error: 'techId requerido' });

      const date = toUTCDay(new Date());

      const log = await prisma.techAttendanceLog.upsert({
        where:  { techId_date: { techId, date } },
        create: { techId, date, goalId: goalId || null, step: 'PERSONAL' },
        update: { goalId: goalId || null },
        include: { goal: true },
      });

      return res.status(200).json(log);
    }

    // PATCH — actualiza checklists / step / checkout
    if (method === 'PATCH' && resource === 'log') {
      const { id, step, checklistPersonal, checklistVehicle, personalMissing, vehicleMissing,
              personalReportSent, vehicleReportSent, checkInTime, checkOutTime, status } = body;
      if (!id) return res.status(400).json({ error: 'id requerido' });

      const data = {};
      if (step               !== undefined) data.step               = step;
      if (checklistPersonal  !== undefined) data.checklistPersonal  = checklistPersonal;
      if (checklistVehicle   !== undefined) data.checklistVehicle   = checklistVehicle;
      if (personalMissing    !== undefined) data.personalMissing    = personalMissing;
      if (vehicleMissing     !== undefined) data.vehicleMissing     = vehicleMissing;
      if (personalReportSent !== undefined) data.personalReportSent = personalReportSent;
      if (vehicleReportSent  !== undefined) data.vehicleReportSent  = vehicleReportSent;
      if (checkInTime        !== undefined) data.checkInTime        = checkInTime;
      if (checkOutTime       !== undefined) data.checkOutTime       = checkOutTime;
      if (status             !== undefined) data.status             = status;

      const log = await prisma.techAttendanceLog.update({ where: { id }, data, include: { goal: true } });
      return res.status(200).json(log);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PANORAMIZACIÓN DE SITIO — /api/tech-attendance/panoramizacion
    // ═══════════════════════════════════════════════════════════════════════════

    // GET — consultar por otNumber (o listar todas para supervisor)
    if (method === 'GET' && resource === 'panoramizacion') {
      const { otNumber, techId, limit } = req.query;
      if (otNumber) {
        const p = await prisma.otPanoramizacion.findUnique({
          where: { otNumber },
          include: { tech: { select: { id: true, name: true, avatar: true } } },
        });
        return res.status(200).json(p || null);
      }
      const where = {};
      if (techId) where.techId = techId;
      const panoramizaciones = await prisma.otPanoramizacion.findMany({
        where,
        include: { tech: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit ? Number(limit) : 100,
      });
      return res.status(200).json(panoramizaciones);
    }

    // POST — guardar panoramización (una por OT, upsert seguro)
    if (method === 'POST' && resource === 'panoramizacion') {
      const { otNumber, techId, goalId, condicionesSitio, planEjecucion, requerimientos, bloqueos } = body;
      if (!otNumber || !techId || !condicionesSitio || !planEjecucion || !requerimientos || !bloqueos)
        return res.status(400).json({ error: 'Todos los campos son requeridos' });

      // Si ya existe, no sobreescribir (solo una por OT)
      const existing = await prisma.otPanoramizacion.findUnique({ where: { otNumber } });
      if (existing) return res.status(200).json(existing);

      const panoramizacion = await prisma.otPanoramizacion.create({
        data: { otNumber, techId, goalId: goalId || null, condicionesSitio, planEjecucion, requerimientos, bloqueos },
        include: { tech: { select: { id: true, name: true, avatar: true } } },
      });
      return res.status(200).json(panoramizacion);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENVÍO PDF A SUPERVISORES VÍA TELEGRAM — /api/tech-attendance/send-report
    // ═══════════════════════════════════════════════════════════════════════════

    if (method === 'POST' && resource === 'send-report') {
      const { pdfBase64, filename, caption } = body;
      if (!pdfBase64 || !filename)
        return res.status(400).json({ error: 'pdfBase64 y filename son requeridos' });

      const supervisors = await prisma.employee.findMany({
        where: { roles: { has: 'SUPERVISOR' }, telegramChatId: { not: null } },
        select: { telegramChatId: true, name: true },
      });

      if (supervisors.length === 0)
        return res.status(200).json({ sent: 0, message: 'Sin supervisores con Telegram configurado' });

      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      for (const sup of supervisors) {
        await sendTelegramDocument(sup.telegramChatId, pdfBuffer, filename, caption || null);
      }

      return res.status(200).json({ sent: supervisors.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[tech-attendance] error:', err);
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
}
