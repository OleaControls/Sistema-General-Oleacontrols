import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

export default async function handler(req, res) {
  const method = req.method.toUpperCase();
  const caller = authMiddleware(req, res);
  if (!caller) return;

  const { employeeId, id } = req.query;

  try {
    // ── GET — historial del empleado ────────────────────────────────────────
    if (method === 'GET') {
      if (!employeeId) return res.status(400).json({ error: 'employeeId requerido' });

      const audits = await prisma.personalAudit.findMany({
        where: { employeeId },
        orderBy: { auditDate: 'desc' },
      });
      return res.status(200).json(audits);
    }

    // ── POST — crear auditoría ──────────────────────────────────────────────
    if (method === 'POST') {
      const { employeeId: empId, projectName, auditDate, isLeader, actionArea, didWell, didPoor, improvements } = req.body;

      if (!empId || !projectName || !auditDate || !actionArea) {
        return res.status(400).json({ error: 'Faltan campos requeridos' });
      }
      if (!Array.isArray(didWell)    || didWell.length    < 3) return res.status(400).json({ error: 'Se requieren mínimo 3 acciones en ¿Qué hice bien?' });
      if (!Array.isArray(didPoor)    || didPoor.length    < 2) return res.status(400).json({ error: 'Se requieren mínimo 2 acciones en ¿Qué hice mal?' });
      if (!Array.isArray(improvements) || improvements.length < 2) return res.status(400).json({ error: 'Se requieren mínimo 2 acciones en ¿Cómo mejorar?' });

      const audit = await prisma.personalAudit.create({
        data: {
          employeeId: empId,
          projectName,
          auditDate:  new Date(auditDate),
          isLeader:   Boolean(isLeader),
          actionArea,
          didWell,
          didPoor,
          improvements,
        }
      });
      return res.status(201).json(audit);
    }

    // ── DELETE ──────────────────────────────────────────────────────────────
    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id requerido' });
      await prisma.personalAudit.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('[personal-audits]', err);
    return res.status(500).json({ error: 'Error interno', message: err.message });
  }
}
