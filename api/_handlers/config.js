import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

export default async function handler(req, res) {
  const { method } = req;

  // Verificar token y leer roles desde la BD
  const caller = authMiddleware(req, res);
  if (!caller) return;
  const userId = caller.id;

  const emp     = await prisma.employee.findUnique({ where: { id: userId }, select: { roles: true } });
  const roles   = emp?.roles || [];
  const isAdmin = roles.includes('ADMIN');
  const isSales = roles.includes('SALES') && !isAdmin;

  if (method === 'GET') {
    try {
      const { key } = req.query;
      if (!key) return res.status(400).json({ error: 'Falta la clave' });

      // Para el pipeline de etapas, cada vendedor tiene su propia configuración.
      // Un ADMIN lee siempre la global. Un SALES lee la suya primero; si no existe, la global.
      if (key === 'CRM_PIPELINE_STAGES' && isSales) {
        const userKey = `CRM_PIPELINE_STAGES_${userId}`;
        const userConfig = await prisma.systemConfig.findUnique({ where: { key: userKey } });
        if (userConfig) return res.status(200).json(userConfig.value);
        // Fallback a la configuración global
        const globalConfig = await prisma.systemConfig.findUnique({ where: { key } });
        return res.status(200).json(globalConfig?.value || []);
      }

      const config = await prisma.systemConfig.findUnique({ where: { key } });

      if (!config && key === 'BONUS_THRESHOLDS') {
        const defaultBonus = [
          { label: 'Excelente', min: 4.8, amount: 1500, color: 'amber' },
          { label: 'Muy Bueno', min: 4.5, amount: 1000, color: 'blue' },
          { label: 'Bueno',     min: 4.0, amount: 500,  color: 'emerald' }
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

      // Si un SALES guarda el pipeline, se guarda con su clave personal
      const effectiveKey = (key === 'CRM_PIPELINE_STAGES' && isSales)
        ? `CRM_PIPELINE_STAGES_${userId}`
        : key;

      const config = await prisma.systemConfig.upsert({
        where:  { key: effectiveKey },
        update: { value },
        create: { id: effectiveKey, key: effectiveKey, value }
      });

      return res.status(200).json(config);
    } catch (error) {
      console.error('[config POST]', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
