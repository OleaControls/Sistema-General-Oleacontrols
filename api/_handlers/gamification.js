import prisma from './_lib/prisma.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const technicians = await prisma.employee.findMany({
      where: { roles: { has: 'TECH' } },
      include: {
        techOTs: true,
      }
    });

    const leaderboard = technicians.map(tech => {
      // 1. OTs de Toda la Vida (Para el Nivel/Rango)
      const allCompleted = tech.techOTs.filter(ot => ot.status === 'COMPLETED' || ot.status === 'VALIDATED');
      
      // 2. OTs del Mes en Curso (Para el Ranking Mensual)
      const monthlyCompleted = allCompleted.filter(ot => {
        const finishedDate = ot.finishedAt ? new Date(ot.finishedAt) : null;
        return finishedDate && finishedDate >= startOfMonth;
      });
      
      // --- CÁLCULO DE PUNTOS MENSUALES (Se resetean cada mes) ---
      const monthlyPoints = monthlyCompleted.reduce((acc, ot) => {
        const priorityMult = ot.priority === 'HIGH' ? 150 : ot.priority === 'MEDIUM' ? 100 : 50;
        return acc + priorityMult;
      }, 0);

      // --- CÁLCULO DE PUNTOS HISTÓRICOS (Para mantener el Nivel) ---
      const lifetimePoints = allCompleted.reduce((acc, ot) => {
        const priorityMult = ot.priority === 'HIGH' ? 150 : ot.priority === 'MEDIUM' ? 100 : 50;
        return acc + priorityMult;
      }, 0);

      // --- MÉTRICAS DE TIEMPO (Solo del mes para mayor relevancia) ---
      const monthlyReactionTimes = monthlyCompleted
        .filter(ot => ot.createdAt && ot.startedAt)
        .map(ot => new Date(ot.startedAt) - new Date(ot.createdAt));
      
      const avgReaction = monthlyReactionTimes.length > 0 
        ? monthlyReactionTimes.reduce((a, b) => a + b, 0) / monthlyReactionTimes.length / 60000 
        : 0;

      const monthlyResolutionTimes = monthlyCompleted
        .filter(ot => ot.startedAt && ot.finishedAt)
        .map(ot => new Date(ot.finishedAt) - new Date(ot.startedAt));
      
      const avgResolution = monthlyResolutionTimes.length > 0 
        ? monthlyResolutionTimes.reduce((a, b) => a + b, 0) / monthlyResolutionTimes.length / 3600000 
        : 0;

      return {
        id: tech.id,
        name: tech.name,
        avatar: tech.avatar,
        points: monthlyPoints, // Mostramos puntos mensuales en el Ranking
        lifetimePoints,        // Usamos históricos para el Rango
        completedCount: monthlyCompleted.length,
        avgReaction: avgReaction.toFixed(0),
        avgResolution: avgResolution.toFixed(1),
        // El rango se basa en el esfuerzo de toda la vida (Persistent Level)
        rank: lifetimePoints > 10000 ? 'DIAMANTE' : lifetimePoints > 5000 ? 'ORO' : lifetimePoints > 1000 ? 'PLATA' : 'BRONCE'
      };
    }).sort((a, b) => b.points - a.points); // Ordenamos por quién va ganando EL MES

    return res.status(200).json(leaderboard);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
