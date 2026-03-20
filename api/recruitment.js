import prisma from './_lib/prisma.js'

export default async function handler(req, res) {
  const method = req.method.toUpperCase();

  try {
    if (method === 'GET') {
      const candidates = await prisma.candidate.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.status(200).json(candidates);
    }

    if (method === 'POST') {
      const { name, email, phone, position, source, notes } = req.body;
      if (!name || !email) return res.status(400).json({ error: 'Nombre y Email requeridos' });

      const candidate = await prisma.candidate.create({
        data: { name, email, phone, position, source, notes }
      });
      return res.status(201).json(candidate);
    }

    if (method === 'PUT') {
      const { id, stage, ...data } = req.body;
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      const updated = await prisma.candidate.update({
        where: { id },
        data: { stage, ...data }
      });
      return res.status(200).json(updated);
    }

    if (method === 'DELETE') {
      const { id } = req.body || req.query;
      if (!id) return res.status(400).json({ error: 'ID requerido' });

      await prisma.candidate.delete({ where: { id } });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error("RECRUITMENT API ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
