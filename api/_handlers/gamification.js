import prisma from '../_lib/prisma.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Traer técnicos y todas las OTs cerradas en paralelo
    const [technicians, allOTs] = await Promise.all([
      prisma.employee.findMany({
        where: { roles: { has: 'TECH' } },
        select: { id: true, name: true, avatar: true }
      }),
      prisma.workOrder.findMany({
        where: { status: { in: ['COMPLETED', 'VALIDATED'] } },
        select: {
          id: true,
          technicianId: true,
          assistantTechs: true,
          supportTechs: true,
          status: true,
          priority: true,
          createdAt: true,
          startedAt: true,
          finishedAt: true,
        }
      })
    ]);

    // Helper: obtener los IDs de técnicos de apoyo de una OT
    const getSupportIds = (ot) => {
      const parse = (field) => {
        if (!field) return [];
        const arr = typeof field === 'string' ? JSON.parse(field) : field;
        return Array.isArray(arr) ? arr.map(t => (typeof t === 'string' ? t : t?.id)).filter(Boolean) : [];
      };
      return [...parse(ot.assistantTechs), ...parse(ot.supportTechs)];
    };

    // Para cada técnico: filtrar OTs donde participó (líder O apoyo)
    const techParticipated = (ot, techId) =>
      ot.technicianId === techId || getSupportIds(ot).includes(techId);

    const leaderboard = technicians.map(tech => {
      const myOTs = allOTs.filter(ot => techParticipated(ot, tech.id));

      // 1. Todas las completadas (para rango/nivel)
      const allCompleted = myOTs; // ya filtramos COMPLETED/VALIDATED arriba

      // 2. Del mes en curso (ranking mensual)
      const monthlyCompleted = allCompleted.filter(ot => {
        const finishedDate = ot.finishedAt ? new Date(ot.finishedAt) : null;
        return finishedDate && finishedDate >= startOfMonth;
      });

      // Puntos mensuales (ranking)
      const monthlyPoints = monthlyCompleted.reduce((acc, ot) => {
        const mult = ot.priority === 'HIGH' ? 150 : ot.priority === 'MEDIUM' ? 100 : 50;
        return acc + mult;
      }, 0);

      // Puntos históricos (nivel/rango)
      const lifetimePoints = allCompleted.reduce((acc, ot) => {
        const mult = ot.priority === 'HIGH' ? 150 : ot.priority === 'MEDIUM' ? 100 : 50;
        return acc + mult;
      }, 0);

      // Tiempos promedio (del mes)
      const reactionTimes = monthlyCompleted
        .filter(ot => ot.createdAt && ot.startedAt)
        .map(ot => new Date(ot.startedAt) - new Date(ot.createdAt));

      const avgReaction = reactionTimes.length > 0
        ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length / 60000
        : 0;

      const resolutionTimes = monthlyCompleted
        .filter(ot => ot.startedAt && ot.finishedAt)
        .map(ot => new Date(ot.finishedAt) - new Date(ot.startedAt));

      const avgResolution = resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length / 3600000
        : 0;

      return {
        id: tech.id,
        name: tech.name,
        avatar: tech.avatar,
        points: monthlyPoints,
        lifetimePoints,
        completedCount: monthlyCompleted.length,
        avgReaction: avgReaction.toFixed(0),
        avgResolution: avgResolution.toFixed(1),
        rank: lifetimePoints > 10000 ? 'DIAMANTE' : lifetimePoints > 5000 ? 'ORO' : lifetimePoints > 1000 ? 'PLATA' : 'BRONCE'
      };
    }).sort((a, b) => b.points - a.points);

    return res.status(200).json(leaderboard);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
