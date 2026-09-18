import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';

const POR_PAGINA = 40;
const LARGO_MAXIMO = 4000;

/**
 * Chat interno.
 *
 * Toda operación comprueba que quien pregunta sea miembro de la conversación.
 * El id del usuario sale del token, nunca del cuerpo: si viniera de fuera,
 * bastaría con mandar el id de otro para leerle sus conversaciones.
 */
export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return;

  const yo = auth.id;
  const metodo = req.method?.toUpperCase();
  const accion = req.query.accion;

  /** Devuelve la membresía, o null si esa persona no pertenece a la conversación. */
  const miMembresia = (conversacionId) =>
    prisma.miembroConversacion.findUnique({
      where: { conversacionId_empleadoId: { conversacionId, empleadoId: yo } },
    });

  try {
    // ── GET conversaciones: mi lista, con no leídos y último mensaje ───────
    if (metodo === 'GET' && (!accion || accion === 'conversaciones')) {
      const miembros = await prisma.miembroConversacion.findMany({
        where: { empleadoId: yo },
        include: {
          conversacion: {
            include: {
              miembros: {
                include: { empleado: { select: { id: true, name: true, avatar: true, position: true } } },
              },
              // Solo el último, para la vista previa de la lista.
              mensajes: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
          },
        },
      });

      // Los no leídos se cuentan en UNA consulta agrupada, no una por
      // conversación: con 30 conversaciones abiertas eso serían 30 viajes a la
      // base cada vez que alguien abre el chat.
      const conteos = miembros.length
        ? await prisma.mensaje.groupBy({
            by: ['conversacionId'],
            where: {
              autorId: { not: yo }, // lo propio nunca cuenta como no leído
              OR: miembros.map(m => ({
                conversacionId: m.conversacionId,
                createdAt: { gt: m.ultimaLecturaEn || new Date(0) },
              })),
            },
            _count: { _all: true },
          })
        : [];
      const sinLeer = Object.fromEntries(conteos.map(g => [g.conversacionId, g._count._all]));

      const lista = miembros
        .map(m => {
          const c = m.conversacion;
          const otros = c.miembros.filter(x => x.empleadoId !== yo).map(x => x.empleado);
          return {
            id: c.id,
            tipo: c.tipo,
            // Una conversación directa no tiene nombre propio: se llama como
            // la otra persona.
            nombre: c.tipo === 'GRUPO' ? c.nombre : (otros[0]?.name || 'Sin participantes'),
            avatar: c.tipo === 'GRUPO' ? null : (otros[0]?.avatar || null),
            participantes: otros,
            ultimoMensaje: c.mensajes[0]
              ? {
                  cuerpo: c.mensajes[0].cuerpo,
                  createdAt: c.mensajes[0].createdAt,
                  mio: c.mensajes[0].autorId === yo,
                }
              : null,
            ultimoMensajeEn: c.ultimoMensajeEn,
            sinLeer: sinLeer[c.id] || 0,
          };
        })
        .sort((a, b) => new Date(b.ultimoMensajeEn) - new Date(a.ultimoMensajeEn));

      return res.status(200).json({
        conversaciones: lista,
        sinLeerTotal: lista.reduce((t, c) => t + c.sinLeer, 0),
      });
    }

    // ── GET mensajes de una conversación ──────────────────────────────────
    if (metodo === 'GET' && accion === 'mensajes') {
      const { conversacionId, antesDe } = req.query;
      if (!conversacionId) return res.status(400).json({ error: 'Falta conversacionId' });
      if (!(await miMembresia(conversacionId))) {
        return res.status(403).json({ error: 'No perteneces a esta conversación' });
      }

      const mensajes = await prisma.mensaje.findMany({
        where: {
          conversacionId,
          ...(antesDe ? { createdAt: { lt: new Date(antesDe) } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: POR_PAGINA,
        include: { autor: { select: { id: true, name: true, avatar: true } } },
      });

      // Se piden del más nuevo al más viejo —así paginar hacia atrás es
      // barato— pero se pintan al revés.
      return res.status(200).json({
        mensajes: mensajes.reverse(),
        hayMas: mensajes.length === POR_PAGINA,
      });
    }

    // ── POST enviar ───────────────────────────────────────────────────────
    if (metodo === 'POST' && accion === 'enviar') {
      const { conversacionId, cuerpo } = req.body || {};
      const texto = (cuerpo || '').trim();
      if (!conversacionId || !texto) {
        return res.status(400).json({ error: 'Falta conversacionId o cuerpo' });
      }
      if (texto.length > LARGO_MAXIMO) {
        return res.status(400).json({ error: `El mensaje no puede pasar de ${LARGO_MAXIMO} caracteres` });
      }
      if (!(await miMembresia(conversacionId))) {
        return res.status(403).json({ error: 'No perteneces a esta conversación' });
      }

      const ahora = new Date();
      const [mensaje] = await prisma.$transaction([
        prisma.mensaje.create({
          data: { conversacionId, autorId: yo, cuerpo: texto },
          include: { autor: { select: { id: true, name: true, avatar: true } } },
        }),
        prisma.conversacion.update({
          where: { id: conversacionId },
          data: { ultimoMensajeEn: ahora },
        }),
        // Quien escribe ya leyó lo suyo: si no, su propio mensaje le aparecería
        // como pendiente hasta que abriera la conversación.
        prisma.miembroConversacion.update({
          where: { conversacionId_empleadoId: { conversacionId, empleadoId: yo } },
          data: { ultimaLecturaEn: ahora },
        }),
      ]);

      return res.status(201).json(mensaje);
    }

    // ── POST leer: mover la marca de agua ─────────────────────────────────
    if (metodo === 'POST' && accion === 'leer') {
      const { conversacionId } = req.body || {};
      if (!conversacionId) return res.status(400).json({ error: 'Falta conversacionId' });

      // updateMany y no update: si no es miembro no actualiza nada y no lanza.
      const { count } = await prisma.miembroConversacion.updateMany({
        where: { conversacionId, empleadoId: yo },
        data: { ultimaLecturaEn: new Date() },
      });
      return res.status(200).json({ ok: count > 0 });
    }

    // ── POST conversacion: abrir una directa o crear un grupo ─────────────
    if (metodo === 'POST' && accion === 'conversacion') {
      const { con, nombre, tipo } = req.body || {};
      const otros = [...new Set([].concat(con || []).filter(Boolean).filter(id => id !== yo))];
      if (!otros.length) return res.status(400).json({ error: 'Indica con quién' });

      const esGrupo = tipo === 'GRUPO' || otros.length > 1;

      // Una conversación directa es única entre dos personas: sin esta
      // comprobación, cada clic en el nombre de alguien abriría un hilo nuevo y
      // el historial quedaría repartido entre copias.
      if (!esGrupo) {
        const existente = await prisma.conversacion.findFirst({
          where: {
            tipo: 'DIRECTA',
            AND: [
              { miembros: { some: { empleadoId: yo } } },
              { miembros: { some: { empleadoId: otros[0] } } },
            ],
          },
        });
        if (existente) return res.status(200).json({ id: existente.id, yaExistia: true });
      }

      const creada = await prisma.conversacion.create({
        data: {
          tipo: esGrupo ? 'GRUPO' : 'DIRECTA',
          nombre: esGrupo ? (nombre || 'Grupo sin nombre') : null,
          creadaPorId: yo,
          miembros: { create: [yo, ...otros].map(empleadoId => ({ empleadoId })) },
        },
      });
      return res.status(201).json({ id: creada.id, yaExistia: false });
    }

    return res.status(405).json({ error: 'Método o acción no soportada' });
  } catch (error) {
    console.error('[chat]', error);
    return res.status(500).json({ error: error.message });
  }
}
