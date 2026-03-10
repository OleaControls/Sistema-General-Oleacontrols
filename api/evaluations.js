import prisma from './_lib/prisma.js'

const getQuincenaRange = (date, offset = 0) => {
  let d = new Date(date);
  if (offset !== 0) {
    // Si hay offset, retrocedemos o avanzamos quincenas
    for(let i=0; i < Math.abs(offset); i++) {
        if (offset < 0) {
            if (d.getDate() > 15) d.setDate(1);
            else { d.setMonth(d.getMonth() - 1); d.setDate(16); }
        } else {
            if (d.getDate() <= 15) d.setDate(16);
            else { d.setMonth(d.getMonth() + 1); d.setDate(1); }
        }
    }
  }

  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() <= 15 ? 1 : 16);
  const end = d.getDate() <= 15 
    ? new Date(d.getFullYear(), d.getMonth(), 15, 23, 59, 59) 
    : new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
  
  return { start, end };
};

const calculateStats = (evaluations) => {
  if (evaluations.length === 0) return { total: 0, avg1: 0, avg2: 0, avg3: 0, totalAvg: 0 };
  const avg1 = evaluations.reduce((acc, curr) => acc + (curr.score1 || 0), 0) / evaluations.length;
  const avg2 = evaluations.reduce((acc, curr) => acc + (curr.score2 || 0), 0) / evaluations.length;
  const avg3 = evaluations.reduce((acc, curr) => acc + (curr.score3 || 0), 0) / evaluations.length;
  const totalAvg = (avg1 + avg2 + (avg3 || 0)) / (evaluations[0].score3 ? 3 : 2);
  return { total: evaluations.length, avg1, avg2, avg3, totalAvg };
};

export default async function handler(req, res) {
  const { method } = req;
  const now = new Date();
  const currentQ = getQuincenaRange(now);
  const prevQ = getQuincenaRange(now, -1);

  if (method === 'GET') {
    try {
      const { targetId, ranking } = req.query;

      // 1. Ranking Global Quincenal con Comparativa
      if (ranking === 'true') {
        const technicians = await prisma.employee.findMany({
          where: { roles: { has: 'TECH' } },
          select: { id: true, name: true, role: true }
        });

        const results = await Promise.all(technicians.map(async (tech) => {
          const currEvals = await prisma.evaluation.findMany({
            where: { targetId: tech.id, createdAt: { gte: currentQ.start, lte: currentQ.end } }
          });
          const prevEvals = await prisma.evaluation.findMany({
            where: { targetId: tech.id, createdAt: { gte: prevQ.start, lte: prevQ.end } }
          });

          const current = calculateStats(currEvals);
          const previous = calculateStats(prevEvals);

          // Cálculo de Bono dinámico
          const configRes = await prisma.systemConfig.findUnique({ where: { key: 'BONUS_THRESHOLDS' } });
          const bonusConfig = configRes?.value || [];
          const tier = [...bonusConfig].sort((a, b) => b.min - a.min).find(b => current.totalAvg >= b.min);

          return {
            id: tech.id,
            name: tech.name,
            score: current.totalAvg,
            prevScore: previous.totalAvg,
            trend: current.totalAvg >= previous.totalAvg ? 'UP' : 'DOWN',
            total: current.total,
            bonus: tier ? tier.amount : 0
          };
        }));

        return res.status(200).json({
          period: `${currentQ.start.toLocaleDateString()} - ${currentQ.end.toLocaleDateString()}`,
          ranking: results.sort((a, b) => b.score - a.score)
        });
      }

      // 2. Métricas Individuales con Comparativa Quincenal
      if (targetId) {
        const currEvals = await prisma.evaluation.findMany({
          where: { targetId, createdAt: { gte: currentQ.start, lte: currentQ.end } }
        });
        const prevEvals = await prisma.evaluation.findMany({
          where: { targetId, createdAt: { gte: prevQ.start, lte: prevQ.end } }
        });

        const current = calculateStats(currEvals);
        const previous = calculateStats(prevEvals);

        return res.status(200).json({
          current,
          previous,
          period: `${currentQ.start.toLocaleDateString()} - ${currentQ.end.toLocaleDateString()}`
        });
      }

      return res.status(400).json({ error: 'Faltan parámetros' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST (Mantener igual...)
  if (method === 'POST') {
    try {
      const { otId, type, targetId, evaluatorId, score1, score2, score3, materialUsage, improvements, comment } = req.body;
      const evaluation = await prisma.evaluation.create({
        data: { type, otId, targetId, evaluatorId, score1: parseInt(score1), score2: parseInt(score2), score3: score3 ? parseInt(score3) : null, materialUsage, improvements, comment }
      });
      return res.status(201).json(evaluation);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
