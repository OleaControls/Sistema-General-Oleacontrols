import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';
import { clavePublicaPush } from '../_lib/push.js';

const POR_PAGINA = 20;

export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return; // authMiddleware ya respondió 401

  // El destinatario sale SIEMPRE del token, nunca de la petición: si viniera
  // por query, cualquiera podría leer las notificaciones de otro.
  const yo = auth.id;
  const method = req.method?.toUpperCase();

  try {
    // ── GET ?action=push-clave: la clave pública para suscribirse ──────────
    // Sale de aquí y no de una VITE_ para que cambiarla no obligue a recompilar.
    if (method === 'GET' && req.query.action === 'push-clave') {
      return res.status(200).json({ clave: clavePublicaPush });
    }

    // ── POST ?action=push-suscribir: este dispositivo quiere avisos ────────
    if (method === 'POST' && req.query.action === 'push-suscribir') {
      const { endpoint, keys } = req.body?.suscripcion || {};
      if (!endpoint?.startsWith('https://') || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ error: 'Suscripción inválida' });
      }

      // Por endpoint y no por persona: si en la PC compartida entra otro, la
      // suscripción de ese navegador pasa a ser suya y el anterior deja de
      // recibir ahí avisos que ya no le tocan.
      const datos = {
        empleadoId: yo,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: String(req.headers['user-agent'] || '').slice(0, 300) || null,
      };
      await prisma.suscripcionPush.upsert({
        where: { endpoint },
        create: { endpoint, ...datos },
        update: datos,
      });
      return res.status(200).json({ ok: true });
    }

    // ── POST ?action=push-desuscribir: al cerrar sesión o apagar avisos ────
    if (method === 'POST' && req.query.action === 'push-desuscribir') {
      const { endpoint } = req.body || {};
      if (!endpoint) return res.status(400).json({ error: 'Falta endpoint' });
      // Solo la mía: sin `empleadoId: yo` cualquiera podría apagarle los
      // avisos a otro conociendo su endpoint.
      await prisma.suscripcionPush.deleteMany({ where: { endpoint, empleadoId: yo } });
      return res.status(200).json({ ok: true });
    }

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

    // ── POST: borrar ───────────────────────────────────────────────────────
    // { id } una, { leidas: true } las ya leídas, { todas: true } todas.
    // Siempre dentro de las mías: el `destinatarioId: yo` impide borrar las
    // de otro aunque se mande su id.
    if (method === 'POST' && req.query.action === 'borrar') {
      const { id, leidas, todas } = req.body || {};
      const where = id ? { id, destinatarioId: yo }
        : leidas ? { destinatarioId: yo, leida: true }
        : todas ? { destinatarioId: yo }
        : null;
      if (!where) return res.status(400).json({ error: 'Indica id, leidas o todas' });

      const { count } = await prisma.notificacion.deleteMany({ where });
      return res.status(200).json({ ok: true, borradas: count });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('[notificaciones]', error);
    return res.status(500).json({ error: error.message });
  }
}
