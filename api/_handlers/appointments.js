import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'
import { signUrlIfNeeded } from '../_lib/r2.js'

/* ═══════════════════════════════════════════════════════════════════════════
   CITAS PÚBLICAS (Coppel)

   · El cliente entra desde el login → "Genere su Cita", sin contraseña.
   · Sólo puede escoger fechas con 2 días de anticipación (MIN_LEAD_DAYS).
   · Máximo 2 citas Coppel por día (DAILY_CAPACITY). El cupo cuenta las citas
     vivas (PENDING/CONFIRMED) + las OTs de Coppel ya agendadas ese día; las
     citas CONVERTED no se cuentan porque su OT ya está en el conteo.
   · La cita cae en el calendario de Operaciones y desde ahí se convierte en OT.
═══════════════════════════════════════════════════════════════════════════ */

export const DAILY_CAPACITY = 2;
export const MIN_LEAD_DAYS  = 2;

// Único tipo que genera cita. Los otros apartados del portal no agendan:
// "Garantías" levanta un reporte (ver warranty.js) y "Seguimiento de
// pendientes" es una consulta por folio.
export const APPOINTMENT_TYPES = {
  AGENDAR: 'Agendar cita',
};

// El cupo diario aplica sólo a este cliente.
const CAPPED_CLIENT = 'coppel';

/* ── Helpers de fecha ──────────────────────────────────────────────────────
   Las fechas se guardan como 'YYYY-MM-DDT00:00:00.000Z', igual que
   WorkOrder.scheduledDate, para que el calendario de OTs las agrupe igual. */
const dayStart = (dateStr) => new Date(`${dateStr}T00:00:00.000Z`);
const dayEnd   = (dateStr) => new Date(`${dateStr}T23:59:59.999Z`);
const toDateStr = (d) => new Date(d).toISOString().slice(0, 10);

const isValidDateStr = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00.000Z`));

/** Los domingos no se agendan. Se lee en UTC porque las fechas se guardan
 *  a las 00:00Z, así que getUTCDay() devuelve el día real sin corrimiento. */
const isSunday = (dateStr) => new Date(`${dateStr}T00:00:00.000Z`).getUTCDay() === 0;

/** Primera fecha seleccionable: hoy + MIN_LEAD_DAYS.
 *  "Hoy" se calcula en hora de México, no en UTC: si se usara UTC, después de
 *  las 18:00 locales el servidor ya estaría en el día siguiente y correría la
 *  ventana un día de más. */
export function minSelectableDate() {
  const hoyMX = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }); // YYYY-MM-DD
  const d = new Date(`${hoyMX}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + MIN_LEAD_DAYS);
  return toDateStr(d);
}

/** Cuenta el cupo ocupado de un rango y lo devuelve agrupado por fecha. */
async function usedByDate(client, from, to) {
  const coppel = { contains: CAPPED_CLIENT, mode: 'insensitive' };

  const [citas, ots] = await Promise.all([
    client.appointment.findMany({
      where: {
        clientName: coppel,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledDate: { gte: from, lte: to },
      },
      select: { scheduledDate: true },
    }),
    client.workOrder.findMany({
      where: {
        clientName: coppel,
        scheduledDate: { gte: from, lte: to },
      },
      select: { scheduledDate: true },
    }),
  ]);

  const map = {};
  for (const row of [...citas, ...ots]) {
    const key = toDateStr(row.scheduledDate);
    map[key] = (map[key] || 0) + 1;
  }
  return map;
}

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();

  try {
    /* ── GET público: disponibilidad del mes ───────────────────────────────
       /api/appointments?availability=1&month=YYYY-MM
       No requiere token y no expone datos de otros clientes: sólo cuántos
       lugares quedan por día. */
    if (method === 'GET' && req.query?.availability) {
      const month = String(req.query.month || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return res.status(400).json({ error: 'Parámetro month inválido (formato YYYY-MM)' });
      }

      const [y, m] = month.split('-').map(Number);
      const from = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      const to   = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)); // último día del mes
      const lastDay = to.getUTCDate();

      const used = await usedByDate(prisma, from, to);
      const minDate = minSelectableDate();

      const days = {};
      for (let d = 1; d <= lastDay; d++) {
        const key = `${month}-${String(d).padStart(2, '0')}`;
        const taken = used[key] || 0;
        const tooSoon = key < minDate;
        const closed = isSunday(key);
        days[key] = {
          used: taken,
          remaining: Math.max(0, DAILY_CAPACITY - taken),
          full: taken >= DAILY_CAPACITY,
          available: !tooSoon && !closed && taken < DAILY_CAPACITY,
          tooSoon,
          closed,
        };
      }

      return res.status(200).json({
        month,
        capacity: DAILY_CAPACITY,
        minLeadDays: MIN_LEAD_DAYS,
        minDate,
        days,
      });
    }

    /* ── GET público: "¿Cuándo llegan?" — seguimiento por folio ────────────
       /api/appointments?folio=CITA-2026-0001
       El cliente captura el folio que recibió al generar su cita y ve cuándo
       llega el equipo, con los datos de la OT (técnico, lugar, horario).
       Sólo se devuelve lo necesario para el seguimiento: nunca el teléfono
       ni el correo del solicitante. */
    if (method === 'GET' && req.query?.folio) {
      const folio = String(req.query.folio).trim().toUpperCase();

      const appt = await prisma.appointment.findUnique({ where: { folio } });
      if (!appt || appt.status === 'CANCELLED') {
        return res.status(404).json({ error: 'No encontramos ninguna cita con ese folio' });
      }

      let ot = null;
      if (appt.workOrderId) {
        const wo = await prisma.workOrder.findUnique({
          where: { id: appt.workOrderId },
          select: {
            otNumber: true, title: true, status: true,
            scheduledDate: true, arrivalTime: true, finishedAt: true,
            address: true, otAddress: true, otReference: true,
            storeNumber: true, storeName: true,
            pendingTasks: true, report: true, deliveryActUrl: true,
            technician: { select: { name: true, position: true, avatar: true } },
          },
        });
        if (wo) {
          // "Cerrada" = la asignación terminó. Sólo entonces se entrega el
          // formato (acta) y el reporte del técnico.
          const isClosed = wo.status === 'COMPLETED' || wo.status === 'VALIDATED';

          const pendientes = Array.isArray(wo.pendingTasks)
            ? wo.pendingTasks
                .map(t => (typeof t === 'string' ? t : t?.desc || t?.description || ''))
                .filter(Boolean)
            : [];

          ot = {
            otNumber: wo.otNumber,
            title: wo.title,
            status: wo.status,
            isClosed,
            scheduledDate: wo.scheduledDate,
            arrivalTime: wo.arrivalTime,
            finishedAt: wo.finishedAt,
            address: wo.otAddress || wo.address,
            reference: wo.otReference,
            storeNumber: wo.storeNumber,
            storeName: wo.storeName,
            technicianName: wo.technician?.name || null,
            technicianRole: wo.technician?.position || 'Técnico',
            technicianAvatar: wo.technician?.avatar || null,
            pendingTasks: pendientes,
            report: isClosed ? (wo.report || null) : null,
            deliveryActUrl: isClosed && wo.deliveryActUrl
              ? await signUrlIfNeeded(wo.deliveryActUrl)
              : null,
          };
        }
      }

      return res.status(200).json({
        folio: appt.folio,
        type: appt.type,
        typeLabel: APPOINTMENT_TYPES[appt.type] || appt.type,
        status: appt.status,
        scheduledDate: appt.scheduledDate,
        preferredTime: appt.preferredTime,
        storeNumber: appt.storeNumber,
        storeName: appt.storeName,
        address: appt.address,
        description: appt.description,
        contactName: appt.contactName,
        createdAt: appt.createdAt,
        otNumber: appt.otNumber,
        ot,
      });
    }

    /* ── POST público: solicitar cita ──────────────────────────────────────
       Se revalida todo en el servidor: el cliente nunca decide el cupo. */
    if (method === 'POST') {
      const {
        type, storeNumber, storeName, contactName, contactPhone, contactEmail,
        address, description, scheduledDate, preferredTime,
      } = req.body || {};

      if (!APPOINTMENT_TYPES[type]) {
        return res.status(400).json({ error: 'Tipo de cita inválido' });
      }
      if (!contactName?.trim() || !contactPhone?.trim()) {
        return res.status(400).json({ error: 'Nombre de contacto y teléfono son obligatorios' });
      }
      if (!isValidDateStr(scheduledDate)) {
        return res.status(400).json({ error: 'Fecha inválida' });
      }
      if (scheduledDate < minSelectableDate()) {
        return res.status(400).json({
          error: `Las citas se agendan con al menos ${MIN_LEAD_DAYS} días de anticipación`,
        });
      }
      if (isSunday(scheduledDate)) {
        return res.status(400).json({ error: 'Los domingos no hay servicio' });
      }

      const fields = {
        type,
        clientName:   'Coppel',
        storeNumber:  storeNumber?.trim() || null,
        storeName:    storeName?.trim()   || null,
        contactName:  contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail?.trim() || null,
        address:      address?.trim()      || null,
        description:  description?.trim()  || null,
        scheduledDate: dayStart(scheduledDate),
        preferredTime: /^\d{2}:\d{2}$/.test(preferredTime || '') ? preferredTime : '09:00',
      };

      const year = new Date().getFullYear();
      let created = null;

      // El folio puede chocar con una solicitud concurrente → se reintenta la
      // transacción completa (un fallo dentro de la tx la aborta en Postgres).
      for (let attempt = 0; attempt < 10 && !created; attempt++) {
        try {
          created = await prisma.$transaction(async (tx) => {
            const used = await usedByDate(tx, dayStart(scheduledDate), dayEnd(scheduledDate));
            if ((used[scheduledDate] || 0) >= DAILY_CAPACITY) {
              const err = new Error('SIN_CUPO');
              err.sinCupo = true;
              throw err;
            }
            const n = await tx.appointment.count({ where: { folio: { startsWith: `CITA-${year}-` } } });
            const folio = `CITA-${year}-${String(n + 1 + attempt).padStart(4, '0')}`;
            return tx.appointment.create({ data: { folio, ...fields } });
          });
        } catch (err) {
          if (err.sinCupo) {
            return res.status(409).json({ error: 'Sin cita disponible en esa fecha', sinCupo: true });
          }
          if (err.code !== 'P2002') throw err;
        }
      }

      if (!created) {
        const folio = `CITA-${year}-${Date.now().toString(36).toUpperCase()}`;
        created = await prisma.appointment.create({ data: { folio, ...fields } });
      }

      return res.status(201).json(created);
    }

    /* ── De aquí en adelante: sólo personal autenticado ────────────────────*/
    const user = authMiddleware(req, res);
    if (!user) return;

    // GET: listado completo para el calendario de Operaciones
    if (method === 'GET') {
      const { status, from, to } = req.query || {};
      const where = {};
      if (status) where.status = { in: String(status).split(',') };
      if (from || to) {
        where.scheduledDate = {};
        if (from && isValidDateStr(from)) where.scheduledDate.gte = dayStart(from);
        if (to   && isValidDateStr(to))   where.scheduledDate.lte = dayEnd(to);
      }
      const appointments = await prisma.appointment.findMany({
        where,
        orderBy: { scheduledDate: 'asc' },
      });
      return res.status(200).json(appointments);
    }

    // PUT: confirmar / cancelar / enlazar la OT generada
    if (method === 'PUT') {
      const { id, status, workOrderId, otNumber, scheduledDate, preferredTime, description } = req.body || {};
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      const data = {};
      if (status) {
        if (!['PENDING', 'CONFIRMED', 'CONVERTED', 'CANCELLED'].includes(status)) {
          return res.status(400).json({ error: 'Estado inválido' });
        }
        data.status = status;
      }
      if (workOrderId !== undefined)   data.workOrderId   = workOrderId || null;
      if (otNumber !== undefined)      data.otNumber      = otNumber || null;
      if (preferredTime !== undefined) data.preferredTime = preferredTime || '09:00';
      if (description !== undefined)   data.description   = description || null;
      if (scheduledDate) {
        if (!isValidDateStr(scheduledDate)) return res.status(400).json({ error: 'Fecha inválida' });
        data.scheduledDate = dayStart(scheduledDate);
      }

      const updated = await prisma.appointment.update({ where: { id }, data });
      return res.status(200).json(updated);
    }

    // DELETE: cancelar (soft delete para no perder el histórico del cupo)
    if (method === 'DELETE') {
      const { id } = req.query || {};
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      await prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED' } });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('[appointments]', err);
    return res.status(500).json({ error: 'Error interno', message: err.message });
  }
}
