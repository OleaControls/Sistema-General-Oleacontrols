import prisma from '../_lib/prisma.js'

// ── Sistema de puntos ────────────────────────────────────────────────────────
const PRIORITY_PTS  = { URGENT: 200, HIGH: 150, MEDIUM: 100, LOW: 60 };
const SUPPORT_RATIO = 0.65;

function calcOTPoints(ot, isLead) {
  const base = PRIORITY_PTS[ot.priority] || 100;
  const pts  = isLead ? base : Math.round(base * SUPPORT_RATIO);
  let bonus = 0;
  if (ot.status === 'VALIDATED') bonus += 20;
  if (ot.createdAt && ot.startedAt) {
    const mins = (new Date(ot.startedAt) - new Date(ot.createdAt)) / 60000;
    if (mins < 30) bonus += 50; else if (mins < 60) bonus += 25;
  }
  if (ot.startedAt && ot.finishedAt) {
    const hrs = (new Date(ot.finishedAt) - new Date(ot.startedAt)) / 3600000;
    if (hrs < 4) bonus += 40; else if (hrs < 8) bonus += 20;
  }
  return pts + (isLead ? bonus : Math.round(bonus * SUPPORT_RATIO));
}

function calcRank(pts) {
  if (pts >= 20000) return 'ELITE';
  if (pts >= 10000) return 'DIAMANTE';
  if (pts >= 5000)  return 'ORO';
  if (pts >= 1000)  return 'PLATA';
  return 'BRONCE';
}

function nextRankThreshold(pts) {
  if (pts < 1000)  return { next: 'PLATA',   at: 1000  };
  if (pts < 5000)  return { next: 'ORO',      at: 5000  };
  if (pts < 10000) return { next: 'DIAMANTE', at: 10000 };
  if (pts < 20000) return { next: 'ÉLITE',    at: 20000 };
  return { next: null, at: null };
}

function parseSupportIds(ot) {
  const parse = (f) => {
    if (!f) return [];
    try {
      const arr = typeof f === 'string' ? JSON.parse(f) : f;
      return Array.isArray(arr)
        ? arr.flatMap(t => { const v = typeof t === 'string' ? t : t?.id; return v ? [v] : []; })
        : [];
    } catch { return []; }
  };
  return [...parse(ot.assistantTechs), ...parse(ot.supportTechs)];
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { period = 'month', debug } = req.query;

    // ── MODO DEBUG: devuelve diagnóstico crudo de la BD ─────────────────────
    if (debug === '1') {
      const [allEmployees, allOTs] = await Promise.all([
        prisma.employee.findMany({
          select: { id: true, name: true, roles: true },
          take: 20
        }),
        prisma.workOrder.findMany({
          select: { id: true, otNumber: true, status: true, technicianId: true, priority: true },
          orderBy: { createdAt: 'desc' },
          take: 20
        })
      ]);
      return res.status(200).json({
        totalEmployees: allEmployees.length,
        employees: allEmployees,
        totalOTs: allOTs.length,
        otsStatuses: [...new Set(allOTs.map(o => o.status))],
        otsWithTech: allOTs.filter(o => o.technicianId).length,
        ots: allOTs
      });
    }

    // ── LÓGICA NORMAL ────────────────────────────────────────────────────────
    const now  = new Date();
    let since;
    if (period === 'month') since = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (period === 'year') since = new Date(now.getFullYear(), 0, 1);
    else since = null;

    // Todas las OTs completadas/validadas (histórico para rangos)
    const allOTs = await prisma.workOrder.findMany({
      where: { status: { in: ['COMPLETED', 'VALIDATED'] } },
      select: {
        id: true, technicianId: true, assistantTechs: true, supportTechs: true,
        status: true, priority: true, createdAt: true, startedAt: true, finishedAt: true
      }
    });

    // Recolectar IDs únicos de todos los participantes en OTs
    const techIdSet = new Set();
    for (const ot of allOTs) {
      if (ot.technicianId) techIdSet.add(ot.technicianId);
      for (const id of parseSupportIds(ot)) techIdSet.add(id);
    }

    // Fallback: si no hay OTs con técnico asignado, buscar por roles típicos
    let employees;
    if (techIdSet.size === 0) {
      employees = await prisma.employee.findMany({
        where: {
          roles: { hasSome: ['TECH', 'TECHNICIAN', 'technician', 'tech'] }
        },
        select: { id: true, name: true, avatar: true, position: true, roles: true }
      });
    } else {
      // Buscar por IDs de OTs + también por roles para incluir técnicos sin OTs aún
      const [byId, byRole] = await Promise.all([
        prisma.employee.findMany({
          where: { id: { in: [...techIdSet] } },
          select: { id: true, name: true, avatar: true, position: true, roles: true }
        }),
        prisma.employee.findMany({
          where: { roles: { hasSome: ['TECH', 'TECHNICIAN', 'technician', 'tech'] } },
          select: { id: true, name: true, avatar: true, position: true, roles: true }
        })
      ]);
      // Merge deduplicado
      const seen = new Set();
      employees = [...byId, ...byRole].filter(e => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
    }

    const filterPeriod = (date) => !since || (date && new Date(date) >= since);

    const leaderboard = employees.map(emp => {
      const leadOTs    = allOTs.filter(o => o.technicianId === emp.id && filterPeriod(o.finishedAt));
      const supportOTs = allOTs.filter(o => o.technicianId !== emp.id && parseSupportIds(o).includes(emp.id) && filterPeriod(o.finishedAt));
      const leadOTsAll    = allOTs.filter(o => o.technicianId === emp.id);
      const supportOTsAll = allOTs.filter(o => o.technicianId !== emp.id && parseSupportIds(o).includes(emp.id));

      const periodPoints = [
        ...leadOTs.map(o => calcOTPoints(o, true)),
        ...supportOTs.map(o => calcOTPoints(o, false))
      ].reduce((a, b) => a + b, 0);

      const lifetimePoints = [
        ...leadOTsAll.map(o => calcOTPoints(o, true)),
        ...supportOTsAll.map(o => calcOTPoints(o, false))
      ].reduce((a, b) => a + b, 0);

      const myPeriodOTs = [...leadOTs, ...supportOTs];

      const reactionMins = myPeriodOTs.flatMap(o =>
        (o.createdAt && o.startedAt) ? [(new Date(o.startedAt) - new Date(o.createdAt)) / 60000] : []);
      const avgReaction = reactionMins.length
        ? (reactionMins.reduce((a, b) => a + b, 0) / reactionMins.length).toFixed(0) : null;

      const resolutionHrs = myPeriodOTs.flatMap(o =>
        (o.startedAt && o.finishedAt) ? [(new Date(o.finishedAt) - new Date(o.startedAt)) / 3600000] : []);
      const avgResolution = resolutionHrs.length
        ? (resolutionHrs.reduce((a, b) => a + b, 0) / resolutionHrs.length).toFixed(1) : null;

      const rank = calcRank(lifetimePoints);
      const { next: nextRank, at: nextAt } = nextRankThreshold(lifetimePoints);
      const prevAt = lifetimePoints >= 20000 ? 10000 : lifetimePoints >= 10000 ? 5000 : lifetimePoints >= 5000 ? 1000 : 0;
      const progress = nextAt ? Math.round(((lifetimePoints - prevAt) / (nextAt - prevAt)) * 100) : 100;

      return {
        id: emp.id, name: emp.name, avatar: emp.avatar, position: emp.position,
        points: periodPoints,
        lifetimePoints,
        rank, nextRank, nextAt,
        rankProgress: Math.min(progress, 100),
        totalOTs:   myPeriodOTs.length,
        leadOTs:    leadOTs.length,
        supportOTs: supportOTs.length,
        avgReaction, avgResolution,
        avgRating: null, evalCount: 0,
        ratingBonus: 0,
      };
    })
    .sort((a, b) => b.lifetimePoints - a.lifetimePoints || a.name.localeCompare(b.name))
    .map((t, i) => ({ ...t, position: i + 1 }));

    return res.status(200).json(leaderboard);
  } catch (error) {
    console.error('[Gamification]', error);
    return res.status(500).json({ error: error.message });
  }
}
