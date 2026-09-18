import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';

const POR_PAGINA = 20;

export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return; // authMiddleware ya respondió 401

  // El destinatario sale SIEMPRE del token, nunca de la petición: si viniera
  // por query, cualquiera podría leer las notificaciones de otro.
  const yo = auth.id;
  const method = req.method?.toUpperCase();

  try {
    // ── GET: mis notificaciones + cuántas sin leer ─────────────────────────
    if (method === 'GET') {
      const pagina = Math.max(1, parseInt(req.query.pagina || '1', 10));

      const [lista, sinLeer] = await Promise.all([
        prisma.notificacion.findMany({
          where: { destinatarioId: yo },
          orderBy: { createdAt: 'desc' },
          take: POR_PAGINA,
          skip: (pagina - 1) * POR_PAGINA,
        }),
        prisma.notificacion.count({ where: { destinatarioId: yo, leida: false } }),
      ]);

      return res.status(200).json({ notificaciones: lista, sinLeer });
    }

    // ── POST: marcar leídas ────────────────────────────────────────────────
    if (method === 'POST' && req.query.action === 'leer') {
      const { id } = req.body || {};

      // El `destinatarioId: yo` del where no sobra: sin él, mandar el id de
      // otro marcaría como leída una notificación ajena.
      const { count } = await prisma.notificacion.updateMany({
        where: id
          ? { id, destinatarioId: yo }
          : { destinatarioId: yo, leida: false }, // sin id: todas
        data: { leida: true, leidaEn: new Date() },
      });

      return res.status(200).json({ ok: true, marcadas: count });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('[notificaciones]', error);
    return res.status(500).json({ error: error.message });
  }
}
