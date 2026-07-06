import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

// Catálogo por defecto de Cultura (percepciones y escarmientos con su costo unitario).
// Se usa solo si aún no se ha guardado un catálogo personalizado en SystemConfig.
const DEFAULT_CULTURA_CATALOG = {
  percepciones: [
    { key: 'club6am',    label: 'Club 6am',                              costo: 39.47 },
    { key: 'gigas',      label: 'Gigas ilimitados celular',              costo: 9.87  },
    { key: 'meta',       label: 'Meta alcanzada',                        costo: 22.00 },
    { key: 'gimnasio',   label: 'Gimnasio (comprobante mensual)',        costo: 18.09 },
    { key: 'limpieza',   label: 'Limpieza dental (comprobante semestral)', costo: 6.58 },
    { key: 'lectura',    label: 'Lectura Reto libro',                    costo: 18.09 },
    { key: 'cmp',        label: 'Consulta médica Preventiva - CMP',      costo: 21.38 },
    { key: 'cpp',        label: 'Consulta Psicológica Preventiva - CPP', costo: 21.31 },
    { key: 'imagen',     label: 'Comisión por imagen personal',          costo: 11.00 },
    { key: 'herr',       label: 'Comisión por cuidar herramientas',      costo: 5.50  },
    { key: 'llevarHerr', label: 'Comi por llevar herramientas',          costo: 5.50  },
  ],
  escarmientos: [
    { key: 'proex',   label: 'ProEx',                 costo: 22.00 },
    { key: 'mad',     label: 'M.A.D.',                costo: 7.00  },
    { key: 'gumby',   label: 'S. Gumby',              costo: 7.00  },
    { key: 'humild',  label: 'Humildad',              costo: 7.00  },
    { key: 'panora',  label: 'La Panoramización',     costo: 5.00  },
    { key: 'audit',   label: 'La Auditoría',          costo: 5.00  },
    { key: 'reiter',  label: 'La Reiteración',        costo: 3.00  },
    { key: 'zapes',   label: 'ZAPES',                 costo: 9.00  },
    { key: 'ooda',    label: 'Ciclo OODA',            costo: 9.00  },
    { key: 'std',     label: 'S.T.D.',                costo: 6.00  },
    { key: 'visual',  label: 'Visualización',         costo: 22.00 },
    { key: 'respir',  label: 'Respiración',           costo: 22.00 },
    { key: 'mimm',    label: 'MiMMOOTs',              costo: 22.00 },
    { key: 'posit',   label: 'Positividad',           costo: 22.00 },
    { key: 'cdh',     label: 'Código de Honor - CDH', costo: 33.00 },
    { key: 'zoho',    label: 'Zoho FSM',              costo: 9.00  },
  ],
};

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

      if (!config && key === 'CULTURA_CATALOG') {
        return res.status(200).json(DEFAULT_CULTURA_CATALOG);
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
