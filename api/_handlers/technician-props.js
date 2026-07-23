import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'
import { notifyPropSubmitted } from '../_lib/telegram.js'

// Normaliza a un arreglo de exactamente 3 textos (rellena/recorta)
const toThree = (arr) => {
  const a = Array.isArray(arr) ? arr.map(v => (v == null ? '' : String(v).trim())) : [];
  return [a[0] || '', a[1] || '', a[2] || ''];
};
const hasContent = (arr) => toThree(arr).some(t => t !== '');

export default async function handler(req, res) {
  const method = req.method.toUpperCase();
  const caller = authMiddleware(req, res);
  if (!caller) return;

  const { employeeId, id } = req.query;

  try {
    // ── GET ────────────────────────────────────────────────────────────────
    //  - con employeeId → historial de ese técnico (para su perfil)
    //  - sin employeeId → todos (para el panel de Operaciones)
    if (method === 'GET') {
      const props = await prisma.technicianProp.findMany({
        where: employeeId ? { employeeId } : undefined,
        orderBy: { createdAt: 'desc' },
        take: employeeId ? 50 : 300,
      });
      return res.status(200).json(props);
    }

    // ── POST — crear PROP ───────────────────────────────────────────────────
    if (method === 'POST') {
      const { employeeId: empId, objetivo, prioridades, realidades, opciones, plan } = req.body;
      if (!empId) return res.status(400).json({ error: 'employeeId requerido' });

      // Al menos una opción con contenido en cada categoría
      for (const [label, val] of [['Prioridades', prioridades], ['Realidades', realidades], ['Opciones', opciones], ['Plan', plan]]) {
        if (!hasContent(val)) return res.status(400).json({ error: `Completa al menos una opción en ${label}` });
      }

      const employee = await prisma.employee.findUnique({
        where: { id: empId },
        select: { name: true },
      });

      const prop = await prisma.technicianProp.create({
        data: {
          employeeId:   empId,
          employeeName: employee?.name || 'Técnico',
          objetivo:     (objetivo || '').trim(),
          prioridades:  toThree(prioridades),
          realidades:   toThree(realidades),
          opciones:     toThree(opciones),
          plan:         toThree(plan),
        },
      });

      // Notificar a Operaciones (SUPERVISOR con Telegram) — no bloquea la respuesta
      prisma.employee.findMany({
        where: { roles: { has: 'SUPERVISOR' }, telegramChatId: { not: null } },
        select: { telegramChatId: true },
      })
        .then(recipients => notifyPropSubmitted(prop, recipients))
        .catch(err => console.error('[technician-props] Telegram:', err.message));

      return res.status(201).json(prop);
    }

    // ── DELETE ──────────────────────────────────────────────────────────────
    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id requerido' });
      await prisma.technicianProp.delete({ where: { id } });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('[technician-props]', err);
    return res.status(500).json({ error: 'Error interno', message: err.message });
  }
}
