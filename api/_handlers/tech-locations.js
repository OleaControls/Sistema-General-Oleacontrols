import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

export default async function handler(req, res) {
  const user = authMiddleware(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    try {
      const techs = await prisma.employee.findMany({
        where: {
          roles: { has: 'TECHNICIAN' },
          status: 'ACTIVE',
          techLat: { not: null },
          techLng: { not: null }
        },
        select: {
          id: true,
          name: true,
          avatar: true,
          techLat: true,
          techLng: true,
          techLastSeen: true
        }
      });

      return res.status(200).json(techs.map(t => ({
        id: t.id,
        name: t.name,
        avatar: t.avatar,
        lat: t.techLat,
        lng: t.techLng,
        lastUpdate: t.techLastSeen
      })));
    } catch (error) {
      console.error('[tech-locations GET]', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { techId, lat, lng } = req.body;
      if (!techId || lat == null || lng == null) {
        return res.status(400).json({ error: 'Faltan datos: techId, lat, lng' });
      }

      await prisma.employee.update({
        where: { id: techId },
        data: {
          techLat: parseFloat(lat),
          techLng: parseFloat(lng),
          techLastSeen: new Date()
        }
      });

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('[tech-locations POST]', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
