import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';

export default async function handler(req, res) {
  const auth = await authMiddleware(req, res);
  if (!auth) return;

  const method = req.method;
  const body   = req.body || {};

  // ─── GET — listar registros por empleado ──────────────────────────────────
  if (method === 'GET') {
    const { employeeId, month, year } = req.query;
    if (!employeeId) return res.status(400).json({ error: 'employeeId requerido' });

    const where = { employeeId };

    if (month && year) {
      const from = new Date(Number(year), Number(month) - 1, 1);
      const to   = new Date(Number(year), Number(month), 1);
      where.date = { gte: from, lt: to };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    // Resumen del mes
    const summary = records.reduce(
      (acc, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        if (r.minutesLate) acc.totalMinutesLate = (acc.totalMinutesLate || 0) + r.minutesLate;
        return acc;
      },
      {}
    );

    return res.status(200).json({ records, summary });
  }

  // ─── POST — registrar incidencia ──────────────────────────────────────────
  if (method === 'POST') {
    const { employeeId, date, type, checkIn, checkOut, minutesLate, notes } = body;
    if (!employeeId || !date || !type) {
      return res.status(400).json({ error: 'employeeId, date y type son requeridos' });
    }

    const record = await prisma.attendanceRecord.create({
      data: {
        employeeId,
        date:     new Date(date),
        type,
        checkIn:     checkIn     || null,
        checkOut:    checkOut    || null,
        minutesLate: minutesLate ? parseInt(minutesLate) : null,
        notes:       notes       || null,
        registeredBy: auth.name || auth.email || null,
      },
    });
    return res.status(201).json(record);
  }

  // ─── PUT — editar registro ────────────────────────────────────────────────
  if (method === 'PUT') {
    const { id, date, type, checkIn, checkOut, minutesLate, notes } = body;
    if (!id) return res.status(400).json({ error: 'id requerido' });

    const record = await prisma.attendanceRecord.update({
      where: { id },
      data: {
        ...(date        && { date: new Date(date) }),
        ...(type        && { type }),
        checkIn:     checkIn     !== undefined ? checkIn     : undefined,
        checkOut:    checkOut    !== undefined ? checkOut    : undefined,
        minutesLate: minutesLate !== undefined ? parseInt(minutesLate) || null : undefined,
        notes:       notes       !== undefined ? notes       : undefined,
      },
    });
    return res.status(200).json(record);
  }

  // ─── DELETE — eliminar registro ───────────────────────────────────────────
  if (method === 'DELETE') {
    const { id } = body;
    if (!id) return res.status(400).json({ error: 'id requerido' });
    await prisma.attendanceRecord.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
