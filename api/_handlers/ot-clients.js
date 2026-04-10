import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

export default async function handler(req, res) {
  const method = req.method.toUpperCase();

  const caller = authMiddleware(req, res);
  if (!caller) return;

  const { id } = req.query;

  try {
    // ── GET ──────────────────────────────────────────────────────────────────
    if (method === 'GET') {
      const { search } = req.query;
      const where = { status: 'ACTIVE' };

      if (search) {
        where.OR = [
          { name:        { contains: search, mode: 'insensitive' } },
          { storeName:   { contains: search, mode: 'insensitive' } },
          { storeNumber: { contains: search, mode: 'insensitive' } },
          { contact:     { contains: search, mode: 'insensitive' } },
        ];
      }

      const clients = await prisma.oTClient.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      return res.status(200).json(clients);
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (method === 'POST') {
      const { name, storeNumber, storeName, contact, phone, email, address, otAddress, otReference, latitude, longitude } = req.body;

      if (!name || !contact || !phone || !address) {
        return res.status(400).json({ error: 'Faltan campos requeridos: name, contact, phone, address' });
      }

      const client = await prisma.oTClient.create({
        data: {
          name,
          storeNumber: storeNumber || null,
          storeName:   storeName   || null,
          contact,
          phone,
          email:       email       || null,
          address,
          otAddress:   otAddress   || null,
          otReference: otReference || null,
          latitude:    latitude    ? parseFloat(latitude)  : null,
          longitude:   longitude   ? parseFloat(longitude) : null,
        }
      });

      return res.status(201).json(client);
    }

    // ── PUT ──────────────────────────────────────────────────────────────────
    if (method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      const data = { ...req.body };
      if (data.latitude  != null) data.latitude  = parseFloat(data.latitude);
      if (data.longitude != null) data.longitude = parseFloat(data.longitude);
      delete data.id;
      delete data.createdAt;
      delete data.updatedAt;

      const updated = await prisma.oTClient.update({
        where: { id },
        data
      });

      return res.status(200).json(updated);
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      // Soft delete: marcar como INACTIVE
      await prisma.oTClient.update({
        where: { id },
        data: { status: 'INACTIVE' }
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });

  } catch (err) {
    console.error('[ot-clients]', err);
    return res.status(500).json({ error: 'Error interno', message: err.message });
  }
}
