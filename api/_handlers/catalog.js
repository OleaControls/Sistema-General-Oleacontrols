import prisma from '../_lib/prisma.js';
import { authMiddleware } from '../_lib/auth.js';

export default async function handler(req, res) {
  const auth = await authMiddleware(req, res);
  if (!auth) return;

  const method = req.method;
  const body   = req.body || {};

  // ─── GET — listar / buscar productos ────────────────────────────────────────
  if (method === 'GET') {
    const { search = '', category = '', brand = '', status = 'ACTIVE', page = '1', limit = '50' } = req.query;

    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (category) where.category = category;
    if (brand)    where.brand    = brand;
    if (search) {
      where.OR = [
        { sku:         { contains: search, mode: 'insensitive' } },
        { name:        { contains: search, mode: 'insensitive' } },
        { brand:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const take = Math.min(parseInt(limit) || 50, 200);
    const skip = (parseInt(page) - 1) * take;

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy: { name: 'asc' }, take, skip }),
      prisma.product.count({ where }),
    ]);

    // También devolver valores únicos de categorías y marcas para filtros
    if (req.query.meta === '1') {
      const [cats, brands] = await Promise.all([
        prisma.product.groupBy({ by: ['category'], where: { category: { not: null } }, _count: { id: true }, orderBy: { category: 'asc' } }),
        prisma.product.findMany({ select: { brand: true }, distinct: ['brand'], where: { brand: { not: null } }, orderBy: { brand: 'asc' } }),
      ]);
      return res.status(200).json({
        products,
        total,
        categories: cats.map(c => ({ name: c.category, count: c._count.id })),
        brands: brands.flatMap(b => b.brand ? [b.brand] : []).sort(),
      });
    }

    return res.status(200).json({ products, total });
  }

  // ─── POST — crear producto ───────────────────────────────────────────────────
  if (method === 'POST') {
    const { sku, name, brand, category, subcategory, description, unit, price, currency } = body;
    if (!sku || !name) return res.status(400).json({ error: 'SKU y nombre son requeridos' });

    // Importación masiva (CSV/array)
    if (Array.isArray(body.products)) {
      const results = { created: 0, updated: 0, errors: [] };
      for (const p of body.products) {
        if (!p.sku || !p.name) { results.errors.push(`Fila sin SKU/nombre`); continue; }
        try {
          await prisma.product.upsert({
            where: { sku: p.sku },
            create: {
              sku: p.sku, name: p.name, brand: p.brand || null,
              category: p.category || null, subcategory: p.subcategory || null,
              description: p.description || null, unit: p.unit || 'PZA',
              price: parseFloat(p.price) || 0, currency: p.currency || 'MXN',
            },
            update: {
              name: p.name, brand: p.brand || null, category: p.category || null,
              subcategory: p.subcategory || null, description: p.description || null,
              unit: p.unit || 'PZA', price: parseFloat(p.price) || 0, currency: p.currency || 'MXN',
            },
          });
          results.created++;
        } catch (e) { results.errors.push(`SKU ${p.sku}: ${e.message}`); }
      }
      return res.status(200).json(results);
    }

    try {
      const product = await prisma.product.create({
        data: { sku, name, brand: brand || null, category: category || null,
          subcategory: subcategory || null, description: description || null,
          unit: unit || 'PZA', price: parseFloat(price) || 0, currency: currency || 'MXN' }
      });
      return res.status(201).json(product);
    } catch (e) {
      if (e.code === 'P2002') return res.status(409).json({ error: 'El SKU ya existe' });
      throw e;
    }
  }

  // ─── PUT — actualizar producto O renombrar categoría ────────────────────────
  if (method === 'PUT') {
    // Renombrar categoría en todos los productos
    if (body.action === 'renameCategory') {
      const { oldName, newName } = body;
      if (!oldName || !newName) return res.status(400).json({ error: 'oldName y newName requeridos' });
      const result = await prisma.product.updateMany({
        where: { category: oldName },
        data: { category: newName.trim() },
      });
      return res.status(200).json({ updated: result.count });
    }

    const { id, ...data } = body;
    if (!id) return res.status(400).json({ error: 'ID requerido' });
    if (data.price !== undefined) data.price = parseFloat(data.price) || 0;
    const product = await prisma.product.update({ where: { id }, data });
    return res.status(200).json(product);
  }

  // ─── DELETE — eliminar producto O vaciar categoría ───────────────────────────
  if (method === 'DELETE') {
    // Eliminar categoría (deja los productos sin categoría → 'General')
    if (body.action === 'deleteCategory') {
      const { name } = body;
      if (!name) return res.status(400).json({ error: 'name requerido' });
      const result = await prisma.product.updateMany({
        where: { category: name },
        data: { category: 'General' },
      });
      return res.status(200).json({ updated: result.count });
    }

    const { id } = body;
    if (!id) return res.status(400).json({ error: 'ID requerido' });
    await prisma.product.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
