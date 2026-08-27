import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

/* ═══════════════════════════════════════════════════════════════════════════
   REPORTES DE GARANTÍA (tiendas)

   · El cliente entra desde el login → "Garantías", sin contraseña.
   · Debe capturar el folio de su cita (CITA-…). Se valida contra la base:
     sin folio válido no se puede reportar.
   · Del folio se heredan sucursal, contacto y la OT a la que se refiere.
   · El reporte cae en el calendario de Operaciones el día que se levantó.
     Operaciones escoge la fecha de la revisita al generar la OT correctiva,
     por eso NO consume cupo de citas.
═══════════════════════════════════════════════════════════════════════════ */

const STATUSES = ['OPEN', 'IN_REVIEW', 'SCHEDULED', 'RESOLVED', 'CANCELLED'];

const dayStart = (s) => new Date(`${s}T00:00:00.000Z`);
const dayEnd   = (s) => new Date(`${s}T23:59:59.999Z`);
const isValidDateStr = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00.000Z`));

export default async function handler(req, res) {
  const method = (req.method || 'GET').toUpperCase();

  try {
    /* ── GET público: consultar un reporte por su folio GAR-… ──────────────*/
    if (method === 'GET' && req.query?.folio) {
      const folio = String(req.query.folio).trim().toUpperCase();
      const claim = await prisma.warrantyClaim.findUnique({ where: { folio } });
      if (!claim || claim.status === 'CANCELLED') {
        return res.status(404).json({ error: 'No encontramos ningún reporte con ese folio' });
      }
      // Sin teléfono ni correo: los folios son adivinables.
      return res.status(200).json({
        folio: claim.folio,
        status: claim.status,
        problem: claim.problem,
        citaFolio: claim.citaFolio,
        otNumber: claim.otNumber,
        storeNumber: claim.storeNumber,
        storeName: claim.storeName,
        contactName: claim.contactName,
        reportedAt: claim.reportedAt,
        fixOtNumber: claim.fixOtNumber,
      });
    }

    /* ── POST público: levantar el reporte ─────────────────────────────────*/
    if (method === 'POST') {
      const { citaFolio, problem, contactName, contactPhone, contactEmail } = req.body || {};

      if (!problem?.trim() || problem.trim().length < 10) {
        return res.status(400).json({ error: 'Describa el problema con al menos 10 caracteres' });
      }
      if (!citaFolio?.trim()) {
        return res.status(400).json({ error: 'El folio de su cita es obligatorio' });
      }

      // El folio debe existir: de ahí salen sucursal, contacto y la OT.
      const cita = await prisma.appointment.findUnique({
        where: { folio: String(citaFolio).trim().toUpperCase() },
      });
      if (!cita || cita.status === 'CANCELLED') {
        return res.status(404).json({ error: 'No encontramos ninguna cita con ese folio' });
      }

      const fields = {
        appointmentId: cita.id,
        citaFolio:     cita.folio,
        workOrderId:   cita.workOrderId || null,
        otNumber:      cita.otNumber || null,
        brand:         cita.brand || null,
        clientName:    cita.clientName || cita.brand || 'Tienda',
        storeNumber:   cita.storeNumber,
        storeName:     cita.storeName,
        address:       cita.address,
        // El cliente puede corregir el contacto; si no, se hereda de la cita.
        contactName:  (contactName?.trim()  || cita.contactName),
        contactPhone: (contactPhone?.trim() || cita.contactPhone),
        contactEmail: (contactEmail?.trim() || cita.contactEmail || null),
        problem: problem.trim(),
      };

      const year = new Date().getFullYear();
      let created = null;

      // Reintento por si dos reportes concurrentes toman el mismo folio.
      for (let attempt = 0; attempt < 10 && !created; attempt++) {
        const n = await prisma.warrantyClaim.count({ where: { folio: { startsWith: `GAR-${year}-` } } });
        const folio = `GAR-${year}-${String(n + 1 + attempt).padStart(4, '0')}`;
        try {
          created = await prisma.warrantyClaim.create({ data: { folio, ...fields } });
        } catch (err) {
          if (err.code !== 'P2002') throw err;
        }
      }
      if (!created) {
        const folio = `GAR-${year}-${Date.now().toString(36).toUpperCase()}`;
        created = await prisma.warrantyClaim.create({ data: { folio, ...fields } });
      }

      return res.status(201).json(created);
    }

    /* ── De aquí en adelante: sólo personal autenticado ────────────────────*/
    const user = authMiddleware(req, res);
    if (!user) return;

    // GET: listado para el calendario de Operaciones
    if (method === 'GET') {
      const { status, from, to } = req.query || {};
      const where = {};
      if (status) where.status = { in: String(status).split(',') };
      if (from || to) {
        where.reportedAt = {};
        if (from && isValidDateStr(from)) where.reportedAt.gte = dayStart(from);
        if (to   && isValidDateStr(to))   where.reportedAt.lte = dayEnd(to);
      }
      const claims = await prisma.warrantyClaim.findMany({ where, orderBy: { reportedAt: 'desc' } });
      return res.status(200).json(claims);
    }

    // PUT: cambiar estado o enlazar la OT correctiva
    if (method === 'PUT') {
      const { id, status, fixOtId, fixOtNumber } = req.body || {};
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      const data = {};
      if (status) {
        if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Estado inválido' });
        data.status = status;
      }
      if (fixOtId !== undefined)     data.fixOtId     = fixOtId || null;
      if (fixOtNumber !== undefined) data.fixOtNumber = fixOtNumber || null;

      const updated = await prisma.warrantyClaim.update({ where: { id }, data });
      return res.status(200).json(updated);
    }

    // DELETE: cancelar (soft delete, conserva el histórico)
    if (method === 'DELETE') {
      const { id } = req.query || {};
      if (!id) return res.status(400).json({ error: 'ID requerido' });
      await prisma.warrantyClaim.update({ where: { id }, data: { status: 'CANCELLED' } });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('[warranty]', err);
    return res.status(500).json({ error: 'Error interno', message: err.message });
  }
}
