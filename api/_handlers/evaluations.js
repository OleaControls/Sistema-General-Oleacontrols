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
  
  let sum1 = 0, sum2 = 0, sum3 = 0, count3 = 0;
  let sumOfAvgs = 0;

  evaluations.forEach(e => {
    const s1 = e.score1 || 0;
    const s2 = e.score2 || 0;
    sum1 += s1;
    sum2 += s2;
    
    if (e.score3 !== null && e.score3 !== undefined) {
      const s3 = e.score3 || 0;
      sum3 += s3;
      count3++;
      sumOfAvgs += (s1 + s2 + s3) / 3;
    } else {
      sumOfAvgs += (s1 + s2) / 2;
    }
  });

  return { 
    total: evaluations.length, 
    avg1: sum1 / evaluations.length, 
    avg2: sum2 / evaluations.length, 
    avg3: count3 > 0 ? sum3 / count3 : 0, 
    totalAvg: sumOfAvgs / evaluations.length 
  };
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
          const evaluation = await prisma.evaluation.findFirst({
            where: { otId: targetOT.id, type }
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
              where: { 
                targetId: tech.id, 
                type: { in: ['OPS_TECH', 'CUSTOMER_TECH'] },
                createdAt: { gte: currentQ.start, lte: currentQ.end } 
              }
            });
            const prevEvals = await prisma.evaluation.findMany({
              where: { 
                targetId: tech.id, 
                type: { in: ['OPS_TECH', 'CUSTOMER_TECH'] },
                createdAt: { gte: prevQ.start, lte: prevQ.end } 
              }
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

      // 2.5 Obtener Recomendaciones y Comentarios (Para Supervisores)
      if (req.query.getRecommendations === 'true') {
        const recommendations = await prisma.evaluation.findMany({
          where: {
            OR: [
              { improvements: { not: null, not: "" } },
              { comment: { not: null, not: "" } }
            ]
          },
          include: {
            target: { select: { name: true } },
            workOrder: { select: { otNumber: true, clientName: true } }
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        });
        return res.status(200).json(recommendations);
      }

      // 2. Métricas Individuales con Comparativa Quincenal
      if (targetId) {
        const currEvals = await prisma.evaluation.findMany({
          where: { 
            targetId, 
            type: { in: ['OPS_TECH', 'CUSTOMER_TECH'] },
            createdAt: { gte: currentQ.start, lte: currentQ.end } 
          }
        });
        const prevEvals = await prisma.evaluation.findMany({
          where: { 
            targetId, 
            type: { in: ['OPS_TECH', 'CUSTOMER_TECH'] },
            createdAt: { gte: prevQ.start, lte: prevQ.end } 
          }
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

      // Determinar a quiénes evaluar
      let targets = [];
      if (type === 'CUSTOMER_TECH' || type === 'OPS_TECH') {
          // Evaluar a todo el equipo técnico involucrado
          if (targetOT.technicianId) targets.push(targetOT.technicianId);
          
          const support = targetOT.supportTechs ? (typeof targetOT.supportTechs === 'string' ? JSON.parse(targetOT.supportTechs) : targetOT.supportTechs) : [];
          const assistant = targetOT.assistantTechs ? (typeof targetOT.assistantTechs === 'string' ? JSON.parse(targetOT.assistantTechs) : targetOT.assistantTechs) : [];
          
          [...support, ...assistant].forEach(t => {
              const id = typeof t === 'string' ? t : t.id;
              if (id && !targets.includes(id)) targets.push(id);
          });
      } else {
          // Evaluar solo al target especificado (ej. Ejecutivo)
          if (targetId) targets.push(targetId);
      }

      if (targets.length === 0) {
        console.error(`Error: No targets found for evaluation`);
        return res.status(400).json({ error: 'No se encontraron técnicos o personal para evaluar en esta orden' });
      }

      // Crear evaluaciones para todos los objetivos
      const evaluations = await Promise.all(targets.map(tId => {
          return prisma.evaluation.create({
            data: { 
              type, 
              otId: targetOT.id, 
              targetId: tId, 
              evaluatorId, 
              score1: score1 ? parseInt(score1) : 0, 
              score2: score2 ? parseInt(score2) : 0, 
              score3: score3 && !isNaN(parseInt(score3)) ? parseInt(score3) : null, 
              materialUsage, 
              improvements, 
              comment 
            }
          });
      }));
      
      console.log(`${evaluations.length} evaluations created successfully`);
      return res.status(201).json(evaluations[0]); // Retornamos la primera para compatibilidad con el frontend
    } catch (error) {
      console.error('API evaluations POST error details:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Esta orden de trabajo ya ha sido evaluada para este personal.' });
      }
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}
