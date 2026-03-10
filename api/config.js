import prisma from './_lib/prisma.js'

export default async function handler(req, res) {
  const { method } = req;

  if (method === 'GET') {
    try {
      const { key } = req.query;
      if (!key) return res.status(400).json({ error: 'Falta la clave' });

      const config = await prisma.systemConfig.findUnique({
        where: { key }
      });

      // Valores por defecto si no existen
      if (!config && key === 'BONUS_THRESHOLDS') {
        const defaultBonus = [
          { label: 'Excelente', min: 4.8, amount: 1500, color: 'amber' },
          { label: 'Muy Bueno', min: 4.5, amount: 1000, color: 'blue' },
          { label: 'Bueno', min: 4.0, amount: 500, color: 'emerald' }
        ];
        return res.status(200).json(defaultBonus);
      }

      return res.status(200).json(config?.value || []);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (method === 'POST') {
    try {
      const { key, value } = req.body;
      if (!key || !value) return res.status(400).json({ error: 'Faltan datos' });

      const config = await prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      });

      return res.status(200).json(config);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
