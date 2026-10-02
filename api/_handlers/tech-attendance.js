import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';
import { sendTelegramDocument, sendTelegramPhoto, sendTelegramPhotoUrl } from '../_lib/telegram.js';
import { uploadToR2 } from '../_lib/r2.js';
import { businessDay } from '../_lib/businessDay.js';
import { puede, rolesEfectivos } from '../_lib/permisos.js';
// businessNowHM: la entrada y la salida se registran con la hora del servidor
// y nunca con la que mande el celular: el reloj del teléfono se puede mover, y
// el body de la petición también.
import {
  TECH_SHIFT_KEY, normalizeShift, checkInWindow, checkOutWindow, businessNowHM,
} from '../_lib/techShift.js';

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

async function loadShift() {
  const cfg = await prisma.systemConfig.findUnique({ where: { key: TECH_SHIFT_KEY } });
  return normalizeShift(cfg?.value);
}

/** Supervisor/ADMIN que corrige o revisa asistencia. null si no tiene permiso. */
async function attendanceManager(userId) {
  const emp = await prisma.employee.findUnique({ where: { id: userId }, select: { id: true, name: true, roles: true } });
  if (!emp || !puede(rolesEfectivos(emp.roles || []), 'ops.asistencia_tecnicos')) return null;
  return emp;
}

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

      // La meta guarda el folio como texto (no hay relación con WorkOrder), así que
      // traemos las expectativas de la OT en una sola consulta y las adjuntamos como `ot`.
      const otNumbers = [...new Set(goals.flatMap(g => g.otNumber ? [g.otNumber] : []))];
      if (otNumbers.length === 0) return res.status(200).json(goals);

      const ots = await prisma.workOrder.findMany({
        where: { otNumber: { in: otNumbers } },
        select: {
          otNumber: true, title: true, assignedFunds: true, clientGoal: true,
          timeLimitHours: true, qualityHigh: true, qualityMin: true,
        },
      });
      const byOtNumber = new Map(ots.map(o => [o.otNumber, o]));
      return res.status(200).json(
        goals.map(g => ({ ...g, ot: g.otNumber ? byOtNumber.get(g.otNumber) || null : null }))
      );
    }

    if (method === 'POST' && resource === 'goals') {
      const { id, techId, date, clientName, clientLocation, notes, otNumber, hasVehicle, confirmed } = body;

      // Edición directa por id (desde TechAttendanceAdmin o confirmación del técnico)
      if (id) {
        const updateData = {};
        if (techId         !== undefined) updateData.techId         = techId;
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

    // POST — iniciar registro del día. No requiere meta asignada: la asistencia
    // diaria (entrada/salida) es independiente del checklist y la panoramización.
    if (method === 'POST' && resource === 'log') {
      const { techId, goalId } = body;
      if (!techId) return res.status(400).json({ error: 'techId requerido' });

      // Día operativo (offset de México) — debe coincidir con el `date` que
      // manda el cliente en los GET y con la validación de requisitos en ots.js
      const date = businessDay();

      const log = await prisma.techAttendanceLog.upsert({
        where:  { techId_date: { techId, date } },
        create: { techId, date, goalId: goalId || null, step: 'PERSONAL' },
        // Solo se vincula la meta si viene en el body — no borra la ya guardada
        update: goalId ? { goalId } : {},
        include: { goal: true },
      });

      return res.status(200).json(log);
    }

    // POST — marcar entrada. El técnico solo puede marcar la suya y la hora
    // la pone el servidor.
    if (method === 'POST' && resource === 'check-in') {
      const shift = await loadShift();
      const now   = businessNowHM();
      const win   = checkInWindow(shift, now);
      if (!win.open) {
        return res.status(403).json({
          error: `Todavía no puedes registrar tu entrada. Se habilita a las ${win.opensAt}.`,
          code: 'CHECKIN_NOT_OPEN', opensAt: win.opensAt,
        });
      }

      const techId = auth.id;
      const date   = businessDay();
      const log = await prisma.techAttendanceLog.upsert({
        where:  { techId_date: { techId, date } },
        create: { techId, date, goalId: body.goalId || null, step: 'PERSONAL' },
        update: {},
        include: { goal: true },
      });
      if (log.checkInTime) return res.status(409).json({ error: 'La entrada de hoy ya está registrada', log });

      const updated = await prisma.techAttendanceLog.update({
        where: { id: log.id }, data: { checkInTime: now }, include: { goal: true },
      });
      return res.status(200).json(updated);
    }

    // POST — marcar salida. Antes de la ventana pide motivo y queda para
    // revisión del supervisor (o se rechaza si la salida anticipada está
    // desactivada en el horario).
    if (method === 'POST' && resource === 'check-out') {
      const techId = auth.id;
      const log = await prisma.techAttendanceLog.findUnique({
        where: { techId_date: { techId, date: businessDay() } },
      });
      if (!log?.checkInTime) return res.status(400).json({ error: 'Primero registra tu entrada' });
      if (log.checkOutTime)  return res.status(409).json({ error: 'La salida de hoy ya está registrada', log });

      const shift = await loadShift();
      const now   = businessNowHM();
      const win   = checkOutWindow(shift, now);
      const data  = { checkOutTime: now };

      if (win.mode === 'blocked') {
        return res.status(403).json({
          error: `La salida se habilita a las ${win.opensAt}. Si necesitas salir antes, pide a tu supervisor que la registre.`,
          code: 'CHECKOUT_NOT_OPEN', opensAt: win.opensAt,
        });
      }
      if (win.mode === 'early') {
        const reason = String(body.reason || '').trim();
        if (reason.length < 5) {
          return res.status(400).json({
            error: `Antes de las ${win.opensAt} la salida necesita un motivo.`,
            code: 'REASON_REQUIRED', opensAt: win.opensAt,
          });
        }
        data.earlyCheckOutReason = reason.slice(0, 500);
        data.earlyCheckOutStatus = 'PENDIENTE';
      }

      const updated = await prisma.techAttendanceLog.update({
        where: { id: log.id }, data, include: { goal: true },
      });
      return res.status(200).json(updated);
    }

    // POST — corrección manual de entrada/salida (supervisor/ADMIN). Sirve para
    // quien olvidó cerrar o marcó mal. Queda en `corrections` quién, cuándo,
    // por qué y qué había antes.
    if (method === 'POST' && resource === 'correct') {
      const manager = await attendanceManager(auth.id);
      if (!manager) return res.status(403).json({ error: 'Solo un supervisor o administrador puede corregir la asistencia' });

      const { techId, date } = body;
      const reason = String(body.reason || '').trim();
      if (!techId || !date) return res.status(400).json({ error: 'techId y date son requeridos' });
      if (reason.length < 5) return res.status(400).json({ error: 'Escribe el motivo de la corrección' });

      // '' o null = borrar esa marca; ausente = no tocarla
      const parse = (v) => (v === undefined ? undefined : (v === null || v === '' ? null : v));
      const inT  = parse(body.checkInTime);
      const outT = parse(body.checkOutTime);
      for (const v of [inT, outT]) {
        if (v !== undefined && v !== null && !HM.test(v)) return res.status(400).json({ error: 'Hora inválida, usa HH:MM' });
      }

      const day = toUTCDay(date);
      const log = await prisma.techAttendanceLog.upsert({
        where:  { techId_date: { techId, date: day } },
        create: { techId, date: day, step: 'PERSONAL' },
        update: {},
      });

      const finalIn  = inT  !== undefined ? inT  : log.checkInTime;
      const finalOut = outT !== undefined ? outT : log.checkOutTime;
      if (finalOut && !finalIn) return res.status(400).json({ error: 'No puede haber salida sin entrada' });

      const data = {
        checkInTime: finalIn,
        checkOutTime: finalOut,
        corrections: [
          ...(Array.isArray(log.corrections) ? log.corrections : []),
          {
            at: new Date().toISOString(), byId: manager.id, byName: manager.name, reason: reason.slice(0, 500),
            before: { checkInTime: log.checkInTime, checkOutTime: log.checkOutTime },
            after:  { checkInTime: finalIn, checkOutTime: finalOut },
          },
        ],
      };
      // Si el supervisor fija la salida, la decisión ya es suya: la revisión
      // de salida anticipada que hubiera queda sin efecto.
      if (finalOut !== log.checkOutTime) {
        data.earlyCheckOutReason = null;
        data.earlyCheckOutStatus = null;
        data.earlyCheckOutReviewedBy = null;
        data.earlyCheckOutReviewedAt = null;
      }

      const updated = await prisma.techAttendanceLog.update({ where: { id: log.id }, data, include: { goal: true } });
      return res.status(200).json(updated);
    }

    // POST — aprobar o rechazar una salida anticipada (supervisor/ADMIN)
    if (method === 'POST' && resource === 'review-early') {
      const manager = await attendanceManager(auth.id);
      if (!manager) return res.status(403).json({ error: 'Solo un supervisor o administrador puede revisar salidas' });

      const { id, decision } = body;
      if (!id || !['APROBADA', 'RECHAZADA'].includes(decision))
        return res.status(400).json({ error: 'id y decision (APROBADA | RECHAZADA) son requeridos' });

      const log = await prisma.techAttendanceLog.findUnique({ where: { id } });
      if (!log?.earlyCheckOutStatus) return res.status(400).json({ error: 'Este registro no tiene salida anticipada' });

      const updated = await prisma.techAttendanceLog.update({
        where: { id },
        data: { earlyCheckOutStatus: decision, earlyCheckOutReviewedBy: manager.name, earlyCheckOutReviewedAt: new Date() },
        include: { goal: true },
      });
      return res.status(200).json(updated);
    }

    // PATCH — actualiza checklists / step. La entrada y la salida ya no se
    // escriben aquí: van por check-in / check-out (hora del servidor) o por
    // correct (supervisor, con motivo).
    if (method === 'PATCH' && resource === 'log') {
      const { id, step, checklistPersonal, checklistVehicle, personalMissing, vehicleMissing,
              personalReportSent, vehicleReportSent, status } = body;
      if (!id) return res.status(400).json({ error: 'id requerido' });

      const data = {};
      if (step               !== undefined) data.step               = step;
      if (checklistPersonal  !== undefined) data.checklistPersonal  = checklistPersonal;
      if (checklistVehicle   !== undefined) data.checklistVehicle   = checklistVehicle;
      if (personalMissing    !== undefined) data.personalMissing    = personalMissing;
      if (vehicleMissing     !== undefined) data.vehicleMissing     = vehicleMissing;
      if (personalReportSent !== undefined) data.personalReportSent = personalReportSent;
      if (vehicleReportSent  !== undefined) data.vehicleReportSent  = vehicleReportSent;
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

      // Filtro por día — createdAt es hora real, así que los límites del día se
      // toman en hora de México (UTC-6) para no arrastrar las de la noche
      // anterior al día siguiente.
      const { date } = req.query;
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const from = new Date(`${date}T06:00:00.000Z`);
        const to   = new Date(from.getTime() + 24 * 60 * 60 * 1000);
        where.createdAt = { gte: from, lt: to };
      }

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
      const { otNumber, techId, goalId, condicionesSitio, planEjecucion, requerimientos, obstaculos, algoritmos, deseaLoMejor } = body;
      if (!otNumber || !techId || !condicionesSitio || !planEjecucion || !requerimientos || !obstaculos || !algoritmos || !deseaLoMejor)
        return res.status(400).json({ error: 'Todos los campos son requeridos' });

      // Si ya existe, no sobreescribir (solo una por OT)
      const existing = await prisma.otPanoramizacion.findUnique({ where: { otNumber } });
      if (existing) return res.status(200).json(existing);

      const panoramizacion = await prisma.otPanoramizacion.create({
        data: { otNumber, techId, goalId: goalId || null, condicionesSitio, planEjecucion, requerimientos, obstaculos, algoritmos, deseaLoMejor },
        include: { tech: { select: { id: true, name: true, avatar: true } } },
      });
      return res.status(200).json(panoramizacion);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ENVÍO PDF A SUPERVISORES VÍA TELEGRAM — /api/tech-attendance/send-report
    // ═══════════════════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════════════════
    // SUBIDA DE FOTO A R2 — /api/tech-attendance/upload-photo
    // ═══════════════════════════════════════════════════════════════════════════

    if (method === 'POST' && resource === 'upload-photo') {
      const { photo } = body; // base64 data URI (ya comprimida desde el cliente)
      if (!photo) return res.status(400).json({ error: 'photo requerida' });
      const url = await uploadToR2(photo, 'attendance/vehicle');
      return res.status(200).json({ url });
    }

    if (method === 'POST' && resource === 'send-report') {
      const { pdfBase64, filename, caption, carPhotos } = body;
      console.log('[send-report] carPhotos recibidas:', Array.isArray(carPhotos) ? carPhotos.length : 'ninguna');
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
        // Enviar fotos de evidencia del vehículo si las hay
        if (Array.isArray(carPhotos) && carPhotos.length > 0) {
          for (let i = 0; i < carPhotos.length; i++) {
            const photoCaption = i === 0 ? `📸 <b>Evidencia vehículo (${carPhotos.length} foto${carPhotos.length > 1 ? 's' : ''})</b>` : null;
            try {
              let photoBuffer;
              if (carPhotos[i].startsWith('http')) {
                // Descargar desde R2 y enviar como buffer (más confiable que URL directa)
                const photoResp = await fetch(carPhotos[i]);
                photoBuffer = Buffer.from(await photoResp.arrayBuffer());
              } else {
                // Fallback base64
                const base64Data = carPhotos[i].replace(/^data:image\/\w+;base64,/, '');
                photoBuffer = Buffer.from(base64Data, 'base64');
              }
              await sendTelegramPhoto(sup.telegramChatId, photoBuffer, photoCaption);
            } catch (photoErr) {
              console.error('[send-report] Error enviando foto:', photoErr.message);
            }
          }
        }
      }

      return res.status(200).json({ sent: supervisors.length });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('[tech-attendance] error:', err);
    return res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
}
