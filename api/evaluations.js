import prisma from './_lib/prisma.js'

const getQuincenaRange = (date, offset = 0) => {
  let d = new Date(date);
  if (offset !== 0) {
    for(let i=0; i < Math.abs(offset); i++) {
        if (offset < 0) {
            if (d.getUTCDate() > 15) d.setUTCDate(1);
            else { d.setUTCMonth(d.getUTCMonth() - 1); d.setUTCDate(16); }
        } else {
            if (d.getUTCDate() <= 15) d.setUTCDate(16);
            else { d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(1); }
        }
    }
  }

  // Usar UTC para evitar desfases con Prisma
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() <= 15 ? 1 : 16, 0, 0, 0));
  const end = d.getUTCDate() <= 15 
    ? new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 15, 23, 59, 59, 999)) 
    : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  
  return { start, end };
};

const calculateStats = (evaluations) => {
  if (!evaluations || evaluations.length === 0) return { total: 0, avg1: 0, avg2: 0, avg3: 0, totalAvg: 0 };
  
  const avg1 = evaluations.reduce((acc, curr) => acc + (curr.score1 || 0), 0) / evaluations.length;
  const avg2 = evaluations.reduce((acc, curr) => acc + (curr.score2 || 0), 0) / evaluations.length;
  const avg3 = evaluations.reduce((acc, curr) => acc + (curr.score3 || 0), 0) / evaluations.length;
  
  // Si al menos una evaluación tiene score3 (Nivel Técnico), dividimos entre 3
  const hasScore3 = evaluations.some(e => e.score3 !== null && e.score3 !== undefined);
  const totalAvg = (avg1 + avg2 + (avg3 || 0)) / (hasScore3 ? 3 : 2);
  
  return { total: evaluations.length, avg1, avg2, avg3, totalAvg };
};

export default async function handler(req, res) {
  const { method } = req;
  const now = new Date();
  const currentQ = getQuincenaRange(now);
  const prevQ = getQuincenaRange(now, -1);

  if (method === 'GET') {
    try {
      const { targetId, ranking, otId, type } = req.query;

      // 1. Buscar evaluación específica (para evitar duplicados en el form de feedback)
      if (otId && type) {
        // Resolver el otId (que puede ser Folio) al ID real (CUID)
        const targetOT = await prisma.workOrder.findFirst({
          where: { OR: [ { id: otId }, { otNumber: otId } ] },
          select: { id: true }
        });

        if (targetOT) {
          const evaluation = await prisma.evaluation.findUnique({
            where: { otId_type: { otId: targetOT.id, type } }
          });
          return res.status(200).json(evaluation || {});
        }
        return res.status(200).json({});
      }

      // 2. Ranking Global Quincenal con Comparativa
      if (ranking === 'true') {
        const technicians = await prisma.employee.findMany({
          where: { roles: { has: 'TECHNICIAN' } },
          select: { id: true, name: true, roles: true }
        });

        // Obtener config una sola vez
        const configRes = await prisma.systemConfig.findUnique({ where: { key: 'BONUS_THRESHOLDS' } });
        const bonusConfig = Array.isArray(configRes?.value) ? configRes.value : [];
        const sortedBonusConfig = [...bonusConfig].sort((a, b) => (b.min || 0) - (a.min || 0));

        const results = await Promise.all(technicians.map(async (tech) => {
          try {
            const currEvals = await prisma.evaluation.findMany({
              where: { targetId: tech.id, createdAt: { gte: currentQ.start, lte: currentQ.end } }
            });
            const prevEvals = await prisma.evaluation.findMany({
              where: { targetId: tech.id, createdAt: { gte: prevQ.start, lte: prevQ.end } }
            });

            const current = calculateStats(currEvals);
            const previous = calculateStats(prevEvals);

            const tier = sortedBonusConfig.find(b => current.totalAvg >= b.min);

            return {
              id: tech.id,
              name: tech.name,
              score: current.totalAvg,
              prevScore: previous.totalAvg,
              trend: current.totalAvg >= previous.totalAvg ? 'UP' : 'DOWN',
              total: current.total,
              bonus: (tier && typeof tier.amount === 'number') ? tier.amount : 0
            };
          } catch (e) {
            console.error(`Error calculating metrics for tech ${tech.id}:`, e);
            return {
              id: tech.id,
              name: tech.name,
              score: 0,
              prevScore: 0,
              trend: 'DOWN',
              total: 0,
              bonus: 0
            };
          }
        }));

        return res.status(200).json({
          period: `${currentQ.start.toISOString().split('T')[0]} - ${currentQ.end.toISOString().split('T')[0]}`,
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
          period: `${currentQ.start.toISOString().split('T')[0]} - ${currentQ.end.toISOString().split('T')[0]}`
        });
      }

      return res.status(400).json({ error: 'Faltan parámetros' });
    } catch (error) {
      console.error('API evaluations error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // POST
  if (method === 'POST') {
    try {
      const { otId, type, targetId, evaluatorId, score1, score2, score3, materialUsage, improvements, comment } = req.body;
      
      console.log('--- EVALUATION POST ATTEMPT ---');
      console.log('Payload:', { otId, type, targetId, evaluatorId, score1, score2, score3 });

      // Buscar la OT real por ID o Folio para obtener su ID de base de datos (CUID)
      const targetOT = await prisma.workOrder.findFirst({
        where: { OR: [ { id: otId }, { otNumber: otId } ] }
      });

      if (!targetOT) {
        console.error(`Error: WorkOrder not found for otId: ${otId}`);
        return res.status(404).json({ error: `Orden de Trabajo ${otId} no encontrada` });
      }

      if (!targetId) {
        console.error(`Error: Missing targetId (evaluated technician/exec)`);
        return res.status(400).json({ error: 'Falta el ID del técnico o ejecutivo a evaluar' });
      }

      const evaluation = await prisma.evaluation.create({
        data: { 
          type, 
          otId: targetOT.id, // Usamos el ID real (CUID) para la relación
          targetId, 
          evaluatorId, 
          score1: score1 ? parseInt(score1) : 0, 
          score2: score2 ? parseInt(score2) : 0, 
          score3: score3 && !isNaN(parseInt(score3)) ? parseInt(score3) : null, 
          materialUsage, 
          improvements, 
          comment 
        }
      });
      
      console.log('Evaluation created successfully:', evaluation.id);
      return res.status(201).json(evaluation);
    } catch (error) {
      console.error('API evaluations POST error details:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Esta orden de trabajo ya ha sido evaluada para este fin.' });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
