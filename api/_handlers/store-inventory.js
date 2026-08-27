import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

/* Inventario de tiendas. Es uno solo para toda la operación: el material que
   surte el cliente se resguarda en común y lo consultan todas las OT de tienda,
   sin importar bajo qué proyecto vayan. Por eso vive aquí y no como sub-recurso
   de un proyecto.

   `brand` dice de qué cadena es cada material. El resguardo es compartido pero
   el material no: filtrar por marca es lo que evita surtir una tienda con
   equipo de otra. */

// Quién puede capturar y corregir el inventario. Cualquiera con sesión lo lee:
// el técnico necesita consultarlo desde su orden.
const EDITOR_ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SUPERVISOR'];

const rolesDe = (auth) => Array.isArray(auth?.roles) ? auth.roles : [auth?.roles].filter(Boolean);
const puedeEditar = (auth) => rolesDe(auth).some(r => EDITOR_ROLES.includes(r));

const aFecha = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const texto = (v) => (v === undefined || v === null || String(v).trim() === '') ? null : String(v).trim();

/** Campos que acepta el cliente. El resto (fechas de sistema, autor) los pone el servidor. */
function camposDe(body, autor) {
  const data = {};
  if (body.brand      !== undefined) data.brand      = texto(body.brand);
  if (body.name       !== undefined) data.name       = String(body.name).trim();
  if (body.sku        !== undefined) data.sku        = texto(body.sku);
  if (body.unit       !== undefined) data.unit       = texto(body.unit);
  if (body.location   !== undefined) data.location   = texto(body.location);
  if (body.notes      !== undefined) data.notes      = texto(body.notes);
  if (body.cutoffDate !== undefined) data.cutoffDate = aFecha(body.cutoffDate);
  if (body.quantity   !== undefined) {
    const n = Number(body.quantity);
    data.quantity = Number.isFinite(n) ? n : 0;
  }
  data.updatedByName = autor;
  return data;
}

export default async function handler(req, res) {
  const auth = authMiddleware(req, res);
  if (!auth) return; // authMiddleware ya respondió 401

  const { method } = req;
  const { id } = req.query;
  const autor = auth.name || auth.email || null;

  try {
    if (method === 'GET') {
      // ?brand=Coppel acota el listado a una cadena; sin él se devuelve todo.
      const brand = texto(req.query?.brand);
      const items = await prisma.storeInventory.findMany({
        where: brand ? { brand } : undefined,
        orderBy: [{ brand: 'asc' }, { name: 'asc' }],
      });
      return res.status(200).json(items);
    }

    if (!puedeEditar(auth)) {
      return res.status(403).json({ error: 'No autorizado para modificar el inventario' });
    }

    if (method === 'POST') {
      const data = camposDe(req.body || {}, autor);
      if (!data.name) return res.status(400).json({ error: 'Falta el nombre del material' });
      const creado = await prisma.storeInventory.create({ data });
      return res.status(201).json(creado);
    }

    if (method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Falta el id del material' });
      const data = camposDe(req.body || {}, autor);
      if ('name' in data && !data.name) return res.status(400).json({ error: 'El nombre no puede quedar vacío' });
      const actualizado = await prisma.storeInventory.update({ where: { id }, data });
      return res.status(200).json(actualizado);
    }

    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Falta el id del material' });
      await prisma.storeInventory.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    if (error.code === 'P2025') return res.status(404).json({ error: 'Material no encontrado' });
    console.error('[store-inventory]', error);
    return res.status(500).json({ error: error.message });
  }
}
