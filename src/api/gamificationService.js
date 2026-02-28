const GAMIFICATION_KEY = 'olea_gamification_db';
const REWARDS_KEY = 'olea_rewards_db';

const initialPlayers = [
  { id: 'user-123', name: 'Gabriel Técnico (Pruebas)', xp: 1250, level: 14, completedOTs: 45, perfectServices: 38, rank: 1, avatar: 'https://i.pravatar.cc/150?u=user-123' },
  { id: 'user-tech-02', name: 'Juan Pérez', xp: 980, level: 11, completedOTs: 32, perfectServices: 25, rank: 2, avatar: 'https://i.pravatar.cc/150?u=user-tech-02' },
  { id: 'user-tech-03', name: 'Luis Gómez', xp: 850, level: 9, completedOTs: 28, perfectServices: 20, rank: 3, avatar: 'https://i.pravatar.cc/150?u=user-tech-03' },
  { id: 'user-tech-04', name: 'Ana Martínez', xp: 1100, level: 12, completedOTs: 40, perfectServices: 30, rank: 2, avatar: 'https://i.pravatar.cc/150?u=user-tech-04' }
];

const initialRewards = [
  {
    id: 'REW-001',
    title: 'Bono de Excelencia Q1',
    description: 'Bono en efectivo por mantener racha de 30 días.',
    image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=400',
    xpRequired: 2000,
    status: 'ACTIVE',
    winners: []
  }
];

export const gamificationService = {
  async getLeaderboard() {
    const data = localStorage.getItem(GAMIFICATION_KEY);
    const players = data ? JSON.parse(data) : initialPlayers;
    return players.sort((a, b) => b.xp - a.xp).map((p, i) => ({ ...p, rank: i + 1 }));
  },

  async getPlayerStats(userId) {
    const players = await this.getLeaderboard();
    const player = players.find(p => p.id === userId);
    if (!player) {
      // Si no existe, crear uno temporal para que no se bloquee la UI
      return { id: userId, name: 'Nuevo Recluta', xp: 0, level: 1, completedOTs: 0, perfectServices: 0, rank: players.length + 1, avatar: 'https://i.pravatar.cc/150' };
    }
    return player;
  },

  async addXP(userId, amount, reason) {
    const players = await this.getLeaderboard();
    let found = false;
    const updated = players.map(p => {
      if (p.id === userId) {
        found = true;
        const newXP = p.xp + amount;
        return { 
          ...p, 
          xp: newXP, 
          level: Math.floor(newXP / 100) + 1,
          completedOTs: reason === 'OT_COMPLETED' ? p.completedOTs + 1 : p.completedOTs,
          perfectServices: reason === 'PERFECT_SCORE' ? p.perfectServices + 1 : p.perfectServices
        };
      }
      return p;
    });

    if (!found) {
      updated.push({
        id: userId,
        name: 'Técnico',
        xp: amount,
        level: 1,
        completedOTs: reason === 'OT_COMPLETED' ? 1 : 0,
        perfectServices: 0,
        avatar: 'https://i.pravatar.cc/150'
      });
    }

    localStorage.setItem(GAMIFICATION_KEY, JSON.stringify(updated));
    return true;
  },

  async getRewards() {
    const data = localStorage.getItem(REWARDS_KEY);
    return data ? JSON.parse(data) : initialRewards;
  },

  async saveReward(rewardData) {
    const rewards = await this.getRewards();
    const newReward = {
      ...rewardData,
      id: `REW-${Math.floor(1000 + Math.random() * 9000)}`,
      winners: []
    };
    localStorage.setItem(REWARDS_KEY, JSON.stringify([newReward, ...rewards]));
    return newReward;
  },

  async assignWinner(rewardId, userId, userName) {
    const rewards = await this.getRewards();
    const updated = rewards.map(r => {
      if (r.id === rewardId) {
        const alreadyWinner = r.winners?.some(w => w.id === userId);
        if (alreadyWinner) return r;
        const winners = r.winners || [];
        return { ...r, winners: [...winners, { id: userId, name: userName, assignedAt: new Date().toISOString() }] };
      }
      return r;
    });
    localStorage.setItem(REWARDS_KEY, JSON.stringify(updated));
    return true;
  }
};
