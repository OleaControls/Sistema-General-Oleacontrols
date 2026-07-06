import { apiFetch } from '../lib/api';

const REWARDS_KEY = 'olea_rewards_db';

const initialRewards = [
  {
    id: 'REW-001',
    title: 'Bono de Excelencia Q1',
    description: 'Bono en efectivo por mantener racha de 30 días.',
    xpRequired: 2000,
    status: 'ACTIVE',
    winners: [],
  },
];

export const gamificationService = {
  async getLeaderboard(period = 'month') {
    const res = await apiFetch(`/api/gamification?period=${period}`);
    if (!res.ok) throw new Error('Error al obtener ranking');
    const data = await res.json();
    return Array.isArray(data) ? data : [];
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
      winners: [],
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(REWARDS_KEY, JSON.stringify([newReward, ...rewards]));
    return newReward;
  },

  async updateReward(id, data) {
    const rewards = await this.getRewards();
    const updated = rewards.map(r => r.id === id ? { ...r, ...data } : r);
    localStorage.setItem(REWARDS_KEY, JSON.stringify(updated));
    return true;
  },

  async deleteReward(id) {
    const rewards = await this.getRewards();
    localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards.filter(r => r.id !== id)));
    return true;
  },

  async assignWinner(rewardId, userId, userName) {
    const rewards = await this.getRewards();
    const updated = rewards.map(r => {
      if (r.id !== rewardId) return r;
      const already = r.winners?.some(w => w.id === userId);
      if (already) return r;
      return { ...r, winners: [...(r.winners || []), { id: userId, name: userName, assignedAt: new Date().toISOString() }] };
    });
    localStorage.setItem(REWARDS_KEY, JSON.stringify(updated));
    return true;
  },

  async removeWinner(rewardId, userId) {
    const rewards = await this.getRewards();
    const updated = rewards.map(r =>
      r.id !== rewardId ? r : { ...r, winners: (r.winners || []).filter(w => w.id !== userId) }
    );
    localStorage.setItem(REWARDS_KEY, JSON.stringify(updated));
    return true;
  },
};
