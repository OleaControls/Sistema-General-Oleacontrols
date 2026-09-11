import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'
import {
  calcularPartida, calcularTotales, firmasRequeridas, requiereDireccion,
  siguienteEstado, PO_CERRADAS, PO_EDITABLES, PO_STATUS_KEYS,
  puedeVerCompras, puedeEditarCompras, puedeAutorizar, esDireccion,
} from '../_lib/compras.js'

const INCLUDE_COMPLETO = {
  supplier: true,
  project:  { select: { id: true, code: true, name: true } },
  items:    { orderBy: { order: 'asc' } },
  approvals:{ orderBy: { createdAt: 'asc' } },
};

/** Folio OC-000001. Reintenta si otra petición se quedó con el número. */
async function siguienteFolio(salto = 0) {
  const last = await prisma.purchaseOrder.findFirst({
    where: { orderNumber: { startsWith: 'OC-' } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });
  const n = (last ? parseInt(last.orderNumber.slice(3), 10) + 1 : 1) + salto;
  return `OC-${String(n).padStart(6, '0')}`;
}

const txt = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const fecha = (v) => (v ? new Date(v) : null);

/** Normaliza las partidas que manda el cliente y las recalcula en el servidor. */
function prepararItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter(it => txt(it?.description))
    .map((it, i) => {
      const c = calcularPartida(it);
      return {
        description: txt(it.description),
        quantity:  c.quantity,
        unitPrice: c.unitPrice,
        discount:  c.discount,
        taxRate:   c.taxRate,
        tax:       c.tax,
        total:     c.total,
        order:     i,
      };
    });
}

export default async function handler(req, res) {
  const method = req.method.toUpperCase();
  const caller = authMiddleware(req, res);
  if (!caller) return;

  const roles = Array.isArray(caller.roles) ? caller.roles : [];
  if (!puedeVerCompras(roles)) {
    return res.status(403).json({ error: 'Sin acceso al módulo de compras' });
  }

  const { id, action } = req.query;

  try {
    // ── Acciones de flujo ──────────────────────────────────────────────────
    if (method === 'POST' && action) {
      if (!id) return res.status(400).json({ error: 'Falta el id de la orden' });
      return await ejecutarAccion({ action, id, caller, roles, body: req.body || {}, res });
    }

    // ── GET ────────────────────────────────────────────────────────────────
    if (method === 'GET') {
      if (id) {
        const orden = await prisma.purchaseOrder.findUnique({ where: { id }, include: INCLUDE_COMPLETO });
        if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
        return res.status(200).json(orden);
      }

      const { status, supplierId, projectId, search } = req.query;
      const where = {};
      if (status && PO_STATUS_KEYS.includes(status)) where.status = status;
      if (supplierId) where.supplierId = supplierId;
      if (projectId)  where.projectId  = projectId;
      if (search) {
        where.OR = [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { subject:     { contains: search, mode: 'insensitive' } },
          { supplier: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const ordenes = await prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 300,
        include: {
          supplier:  { select: { id: true, name: true, rfc: true } },
          project:   { select: { id: true, code: true, name: true } },
          approvals: { select: { id: true, decision: true, approverName: true } },
          _count:    { select: { items: true } },
        },
      });
      return res.status(200).json(ordenes);
    }

    if (!puedeEditarCompras(roles)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar órdenes de compra' });
    }

    // ── POST — crear ───────────────────────────────────────────────────────
    if (method === 'POST') {
      const b = req.body || {};
      if (!b.supplierId) return res.status(400).json({ error: 'Selecciona un proveedor' });

      const items   = prepararItems(b.items);
      const totales = calcularTotales(items, b.adjustment);

      const data = {
        ...camposEditables(b),
        ...totales,
        supplierId:    b.supplierId,
        status:        'BORRADOR',
        createdById:   caller.id,
        createdByName: txt(b.createdByName) || txt(caller.email) || null,
        requiredApprovals: firmasRequeridas(totales.total),
        items: { create: items },
      };

      // Reintento por folio duplicado, igual que los proyectos.
      for (let intento = 0; intento < 20; intento++) {
        try {
          const creada = await prisma.purchaseOrder.create({
            data: { ...data, orderNumber: await siguienteFolio(intento) },
            include: INCLUDE_COMPLETO,
          });
          return res.status(201).json(creada);
        } catch (err) {
          if (err.code !== 'P2002') throw err;
        }
      }
      return res.status(409).json({ error: 'No se pudo asignar folio, intenta de nuevo' });
    }

    // ── PUT — editar ───────────────────────────────────────────────────────
    if (method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Falta el id de la orden' });
      const actual = await prisma.purchaseOrder.findUnique({ where: { id }, select: { status: true } });
      if (!actual) return res.status(404).json({ error: 'Orden no encontrada' });

      if (!PO_EDITABLES.includes(actual.status)) {
        return res.status(409).json({
          error: `Una orden ${actual.status.toLowerCase().replace('_', ' ')} ya no se puede editar. Cancélala y crea una nueva.`,
        });
      }

      const b = req.body || {};
      const items   = prepararItems(b.items);
      const totales = calcularTotales(items, b.adjustment);

      // Las partidas se reemplazan completas: es más simple y más seguro que
      // conciliar altas, bajas y cambios de orden renglón por renglón.
      const actualizada = await prisma.$transaction(async (tx) => {
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
        return tx.purchaseOrder.update({
          where: { id },
          data: {
            ...camposEditables(b),
            ...totales,
            ...(b.supplierId ? { supplierId: b.supplierId } : {}),
            requiredApprovals: firmasRequeridas(totales.total),
            items: { create: items },
          },
          include: INCLUDE_COMPLETO,
        });
      });
      return res.status(200).json(actualizada);
    }

    // ── DELETE — solo borradores; el resto se cancela ──────────────────────
    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Falta el id de la orden' });
      const actual = await prisma.purchaseOrder.findUnique({ where: { id }, select: { status: true, orderNumber: true } });
      if (!actual) return res.status(404).json({ error: 'Orden no encontrada' });

      if (actual.status !== 'BORRADOR') {
        const cancelada = await prisma.purchaseOrder.update({
          where: { id }, data: { status: 'CANCELADA' }, include: INCLUDE_COMPLETO,
        });
        return res.status(200).json({ ok: true, cancelada: true, orden: cancelada });
      }
      await prisma.purchaseOrder.delete({ where: { id } });
      return res.status(200).json({ ok: true, cancelada: false });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('[purchase-orders]', error);
    return res.status(500).json({ error: error.message });
  }
}

/** Campos que el cliente puede escribir. Los totales nunca vienen de afuera. */
function camposEditables(b = {}) {
  return {
    projectId:       b.projectId || null,
    subject:         txt(b.subject),
    ownerId:         b.ownerId || null,
    ownerName:       txt(b.ownerName),
    orderDate:       fecha(b.orderDate) || new Date(),
    deliveryDate:    fecha(b.deliveryDate),
    paymentMethod:   txt(b.paymentMethod),
    currency:        txt(b.currency) || 'MXN',
    exchangeRate:    Number(b.exchangeRate) > 0 ? Number(b.exchangeRate) : 1,
    carrier:         txt(b.carrier),
    contactName:     txt(b.contactName),
    billingAddress:  txt(b.billingAddress),
    shippingAddress: txt(b.shippingAddress),
    terms:           txt(b.terms),
  };
}

// ── Flujo: solicitar, autorizar, rechazar, avanzar, reabrir ────────────────
async function ejecutarAccion({ action, id, caller, roles, body, res }) {
  const orden = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { approvals: true },
  });
  if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });

  const devolver = async () =>
    res.status(200).json(await prisma.purchaseOrder.findUnique({ where: { id }, include: INCLUDE_COMPLETO }));

  if (PO_CERRADAS.includes(orden.status) && action !== 'reabrir') {
    return res.status(409).json({ error: `La orden está ${orden.status.toLowerCase()} y ya no admite cambios.` });
  }

  // ── Enviar a autorización ────────────────────────────────────────────────
  if (action === 'solicitar') {
    if (!puedeEditarCompras(roles)) return res.status(403).json({ error: 'Sin permiso' });
    if (orden.status !== 'BORRADOR' && orden.status !== 'RECHAZADA') {
      return res.status(409).json({ error: 'Solo un borrador se manda a autorización.' });
    }
    const partidas = await prisma.purchaseOrderItem.count({ where: { purchaseOrderId: id } });
    if (partidas === 0) return res.status(400).json({ error: 'Agrega al menos una partida antes de solicitarla.' });

    await prisma.$transaction([
      // Un reenvío tras rechazo arranca la autorización de cero.
      prisma.purchaseOrderApproval.deleteMany({ where: { purchaseOrderId: id } }),
      prisma.purchaseOrder.update({
        where: { id },
        data: {
          status: 'SOLICITADA',
          rejectionReason: null,
          requiredApprovals: firmasRequeridas(orden.total),
        },
      }),
    ]);
    return devolver();
  }

  // ── Autorizar ────────────────────────────────────────────────────────────
  if (action === 'autorizar') {
    if (!puedeAutorizar(roles)) return res.status(403).json({ error: 'No tienes permiso para autorizar' });
    if (!['SOLICITADA', 'EN_REVISION'].includes(orden.status)) {
      return res.status(409).json({ error: 'Esta orden no está esperando autorización.' });
    }
    if (orden.approvals.some(a => a.approverId === caller.id)) {
      return res.status(409).json({ error: 'Ya autorizaste esta orden. Falta la firma de alguien más.' });
    }

    const firma = {
      purchaseOrderId: id,
      approverId:      caller.id,
      approverName:    txt(body.approverName) || txt(caller.email) || 'Autorizador',
      approverRole:    esDireccion(roles) ? 'ADMIN' : 'PURCHASING',
      decision:        'APROBADA',
      comment:         txt(body.comment),
    };
    await prisma.purchaseOrderApproval.create({ data: firma });

    const firmas = [...orden.approvals.filter(a => a.decision === 'APROBADA'), firma];
    const completas   = firmas.length >= (orden.requiredApprovals || 1);
    const conDireccion = firmas.some(a => a.approverRole === 'ADMIN');
    const faltaDireccion = requiereDireccion(orden.total) && !conDireccion;

    await prisma.purchaseOrder.update({
      where: { id },
      data: { status: completas && !faltaDireccion ? 'APROBADA' : 'EN_REVISION' },
    });
    return devolver();
  }

  // ── Rechazar ─────────────────────────────────────────────────────────────
  if (action === 'rechazar') {
    if (!puedeAutorizar(roles)) return res.status(403).json({ error: 'No tienes permiso para rechazar' });
    const motivo = txt(body.comment);
    if (!motivo) return res.status(400).json({ error: 'Escribe el motivo del rechazo.' });

    await prisma.$transaction([
      prisma.purchaseOrderApproval.upsert({
        where:  { purchaseOrderId_approverId: { purchaseOrderId: id, approverId: caller.id } },
        update: { decision: 'RECHAZADA', comment: motivo },
        create: {
          purchaseOrderId: id, approverId: caller.id,
          approverName: txt(body.approverName) || txt(caller.email) || 'Autorizador',
          approverRole: esDireccion(roles) ? 'ADMIN' : 'PURCHASING',
          decision: 'RECHAZADA', comment: motivo,
        },
      }),
      prisma.purchaseOrder.update({ where: { id }, data: { status: 'RECHAZADA', rejectionReason: motivo } }),
    ]);
    return devolver();
  }

  // ── Avanzar al siguiente estado operativo ────────────────────────────────
  if (action === 'avanzar') {
    if (!puedeEditarCompras(roles)) return res.status(403).json({ error: 'Sin permiso' });
    const siguiente = siguienteEstado(orden.status);
    if (!siguiente) return res.status(409).json({ error: 'La orden ya está en su último estado.' });
    // De SOLICITADA/EN_REVISION solo se sale autorizando, no empujando.
    if (['SOLICITADA', 'EN_REVISION', 'BORRADOR'].includes(orden.status)) {
      return res.status(409).json({ error: 'Primero pasa por la autorización.' });
    }
    await prisma.purchaseOrder.update({ where: { id }, data: { status: siguiente } });
    return devolver();
  }

  // ── Cancelar / reabrir ───────────────────────────────────────────────────
  if (action === 'cancelar') {
    if (!puedeEditarCompras(roles)) return res.status(403).json({ error: 'Sin permiso' });
    await prisma.purchaseOrder.update({
      where: { id }, data: { status: 'CANCELADA', rejectionReason: txt(body.comment) },
    });
    return devolver();
  }

  if (action === 'reabrir') {
    // Devolver una orden cerrada a borrador es de Dirección: deshace una
    // cancelación o un rechazo que ya se comunicó al proveedor.
    if (!esDireccion(roles)) return res.status(403).json({ error: 'Solo Dirección puede reabrir una orden' });
    await prisma.$transaction([
      prisma.purchaseOrderApproval.deleteMany({ where: { purchaseOrderId: id } }),
      prisma.purchaseOrder.update({ where: { id }, data: { status: 'BORRADOR', rejectionReason: null } }),
    ]);
    return devolver();
  }

  return res.status(400).json({ error: `Acción desconocida: ${action}` });
}
