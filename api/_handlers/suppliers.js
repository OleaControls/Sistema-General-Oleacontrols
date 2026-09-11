import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'
import { puedeVerCompras, puedeEditarCompras } from '../_lib/compras.js'

/** Catálogo de proveedores. Solo Compras y Dirección. */
export default async function handler(req, res) {
  const method = req.method.toUpperCase();
  const caller = authMiddleware(req, res);
  if (!caller) return;

  const roles = Array.isArray(caller.roles) ? caller.roles : [];
  if (!puedeVerCompras(roles)) {
    return res.status(403).json({ error: 'Sin acceso al módulo de compras' });
  }

  const { id } = req.query;

  try {
    if (method === 'GET') {
      if (id) {
        const s = await prisma.supplier.findUnique({ where: { id } });
        if (!s) return res.status(404).json({ error: 'Proveedor no encontrado' });
        return res.status(200).json(s);
      }
      const { search, all } = req.query;
      const where = all === '1' ? {} : { status: 'ACTIVE' };
      if (search) {
        where.OR = [
          { name:        { contains: search, mode: 'insensitive' } },
          { rfc:         { contains: search, mode: 'insensitive' } },
          { contactName: { contains: search, mode: 'insensitive' } },
        ];
      }
      return res.status(200).json(
        await prisma.supplier.findMany({ where, orderBy: { name: 'asc' } })
      );
    }

    if (!puedeEditarCompras(roles)) {
      return res.status(403).json({ error: 'No tienes permiso para modificar proveedores' });
    }

    if (method === 'POST') {
      const { name } = req.body || {};
      if (!name?.trim()) return res.status(400).json({ error: 'La razón social es obligatoria' });
      const creado = await prisma.supplier.create({ data: limpiar(req.body) });
      return res.status(201).json(creado);
    }

    if (method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Falta el id del proveedor' });
      const actualizado = await prisma.supplier.update({ where: { id }, data: limpiar(req.body) });
      return res.status(200).json(actualizado);
    }

    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Falta el id del proveedor' });
      // Baja lógica: si se borrara, las órdenes de compra viejas se quedarían
      // sin a quién apuntar y la FK lo impediría de todos modos.
      const conOrdenes = await prisma.purchaseOrder.count({ where: { supplierId: id } });
      if (conOrdenes > 0) {
        await prisma.supplier.update({ where: { id }, data: { status: 'INACTIVE' } });
        return res.status(200).json({ ok: true, desactivado: true, ordenes: conOrdenes });
      }
      await prisma.supplier.delete({ where: { id } });
      return res.status(200).json({ ok: true, desactivado: false });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('[suppliers]', error);
    return res.status(500).json({ error: error.message });
  }
}

const txt = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);

function limpiar(body = {}) {
  return {
    name:         (body.name || '').trim(),
    rfc:          txt(body.rfc),
    contactName:  txt(body.contactName),
    phone:        txt(body.phone),
    email:        txt(body.email),
    address:      txt(body.address),
    city:         txt(body.city),
    state:        txt(body.state),
    zip:          txt(body.zip),
    country:      txt(body.country) || 'México',
    paymentTerms: txt(body.paymentTerms),
    notes:        txt(body.notes),
    ...(body.status === 'ACTIVE' || body.status === 'INACTIVE' ? { status: body.status } : {}),
  };
}
