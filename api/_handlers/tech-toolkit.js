import prisma from '../_lib/prisma.js'
import { authMiddleware } from '../_lib/auth.js'

// Debe coincidir con src/modules/ots/utils/toolsCatalog.js
const TOOLS_KEYS = [
  'multimetro', 'desPlanoChico', 'desPlanoMed', 'desCruzChico', 'desCruzMed',
  'kitPerilleros', 'pinzasElec', 'pinzasPela', 'pinzasPunta', 'pinzasRas',
  'flexometro', 'portaHerramienta', 'navaja', 'martillo', 'cintasAislar',
];

const CAN_SEE_ALL = ['ADMIN', 'SUPERVISOR', 'HR', 'PROJECT_MANAGER'];

/** Deja solo las llaves del catálogo con valor booleano. */
const sanitizeTools = (raw) => {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of TOOLS_KEYS) {
    if (typeof raw[key] === 'boolean') out[key] = raw[key];
  }
  return out;
};

/** Vida útil 0-100, solo para herramientas marcadas como presentes. */
const sanitizeLife = (raw, tools) => {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const key of TOOLS_KEYS) {
    if (tools[key] !== true) continue;
    const n = Number(raw[key]);
    if (Number.isFinite(n)) out[key] = Math.min(100, Math.max(0, Math.round(n)));
  }
  return out;
};

export default async function handler(req, res) {
  const method = req.method.toUpperCase();
  const caller = authMiddleware(req, res);
  if (!caller) return;

  const roles   = Array.isArray(caller.roles) ? caller.roles : [];
  const canSeeAll = roles.some(r => CAN_SEE_ALL.includes(r));
  const { techId } = req.query;

  try {
    // ── GET ────────────────────────────────────────────────────────────────
    //  - ?techId=xxx        → el inventario de ese técnico (null si nunca lo llenó)
    //  - sin techId + mando → todos los inventarios (panel de Operaciones)
    //  - sin techId + técnico → el suyo
    if (method === 'GET') {
      if (techId) {
        if (techId !== caller.id && !canSeeAll) {
          return res.status(403).json({ error: 'Sin permiso para ver ese inventario' });
        }
        const toolkit = await prisma.techToolkit.findUnique({ where: { techId } });
        return res.status(200).json(toolkit);
      }

      if (!canSeeAll) {
        const mine = await prisma.techToolkit.findUnique({ where: { techId: caller.id } });
        return res.status(200).json(mine);
      }

      const all = await prisma.techToolkit.findMany({
        orderBy: { updatedAt: 'desc' },
        include: { tech: { select: { id: true, name: true, avatar: true } } },
      });
      return res.status(200).json(all);
    }

    // ── PUT — guardar el inventario (upsert) ───────────────────────────────
    // No es un registro diario: se sobrescribe la única fila del técnico cada
    // vez que su herramienta cambia.
    if (method === 'PUT' || method === 'POST') {
      const target = req.body?.techId || caller.id;
      if (target !== caller.id && !canSeeAll) {
        return res.status(403).json({ error: 'Solo puedes editar tu propio inventario' });
      }

      const tools     = sanitizeTools(req.body?.tools);
      const toolsLife = sanitizeLife(req.body?.toolsLife, tools);
      const notes     = typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 1000) : null;

      const toolkit = await prisma.techToolkit.upsert({
        where:  { techId: target },
        update: { tools, toolsLife, notes: notes || null },
        create: { techId: target, tools, toolsLife, notes: notes || null },
      });
      return res.status(200).json(toolkit);
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (error) {
    console.error('[tech-toolkit]', error);
    return res.status(500).json({ error: error.message });
  }
}
