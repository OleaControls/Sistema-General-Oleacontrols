import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Plus, 
  Search, 
  Trophy, 
  User, 
  CheckCircle2, 
  X, 
  Image as ImageIcon,
  Calendar,
  Zap,
  ArrowRight,
  Medal
} from 'lucide-react';
import { gamificationService } from '@/api/gamificationService';
import { cn } from '@/lib/utils';

export default function RewardManager() {
  const [rewards, setRewards] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  
  const [newReward, setNewReward] = useState({
    title: '',
    description: '',
    image: '',
    xpRequired: 1000,
    status: 'ACTIVE'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [r, l] = await Promise.all([
      gamificationService.getRewards(),
      gamificationService.getLeaderboard()
    ]);
    setRewards(r);
    setLeaderboard(l);
    setLoading(false);
  };

  const handleCreateReward = async (e) => {
    e.preventDefault();
    await gamificationService.saveReward(newReward);
    setIsModalOpen(false);
    setNewReward({ title: '', description: '', image: '', xpRequired: 1000, status: 'ACTIVE' });
    loadData();
  };

  const handleAssignWinner = async (rewardId, player) => {
    await gamificationService.assignWinner(rewardId, player.id, player.name);
    loadData();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Premios de Temporada</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Crea incentivos y asigna ganadores basados en el ranking operativo.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg hover:bg-primary transition-all"
        >
          <Gift className="h-4 w-4" /> Crear Nuevo Premio
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rewards List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rewards.map(reward => (
              <div key={reward.id} className="bg-white border rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-md transition-all group">
                <div className="h-40 bg-gray-100 relative overflow-hidden">
                  <img src={reward.image || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=400'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <span className="bg-primary text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">{reward.xpRequired} XP REQUERIDOS</span>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight">{reward.title}</h3>
                    <p className="text-xs text-gray-500 mt-1 font-medium italic">"{reward.description}"</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Trophy className="h-3 w-3" /> Ganadores ({reward.winners?.length || 0})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {reward.winners?.map(w => (
                        <span key={w.id} className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-1 rounded-lg border border-emerald-100 flex items-center gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" /> {w.name}
                        </span>
                      ))}
                      {reward.winners?.length === 0 && <span className="text-[10px] text-gray-300 font-bold uppercase">Sin asignar aún</span>}
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedReward(reward)}
                    className="w-full bg-gray-50 text-gray-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                  >
                    Asignar Ganadores <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Winner Selection Sidebar */}
        <div className="space-y-6">
          <div className="bg-white border rounded-[2.5rem] p-8 shadow-sm">
            <h3 className="text-xl font-black text-gray-900 tracking-tighter mb-6 flex items-center gap-2">
              <Medal className="h-6 w-6 text-amber-500" /> Candidatos Top
            </h3>
            
            {selectedReward ? (
              <div className="space-y-4">
                <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mb-6">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Asignando para:</p>
                  <p className="text-sm font-black text-gray-900 truncate">{selectedReward.title}</p>
                </div>
                
                <div className="divide-y divide-gray-50">
                  {leaderboard.map(player => {
                    const isWinner = selectedReward.winners.some(w => w.id === player.id);
                    return (
                      <div key={player.id} className="py-4 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <img src={player.avatar} className="h-8 w-8 rounded-full border" />
                          <div>
                            <p className="text-xs font-black text-gray-900 uppercase truncate max-w-[120px]">{player.name}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">LVL {player.level} • {player.xp} XP</p>
                          </div>
                        </div>
                        <button 
                          disabled={isWinner}
                          onClick={() => handleAssignWinner(selectedReward.id, player)}
                          className={cn(
                            "p-2 rounded-xl transition-all",
                            isWinner ? "text-emerald-500 bg-emerald-50" : "text-gray-300 hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/10"
                          )}
                        >
                          {isWinner ? <CheckCircle2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                <button 
                  onClick={() => setSelectedReward(null)}
                  className="w-full mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600"
                >
                  Cancelar Selección
                </button>
              </div>
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="bg-gray-50 h-16 w-16 rounded-full flex items-center justify-center mx-auto text-gray-300">
                  <User className="h-8 w-8" />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4">Selecciona un premio para ver los candidatos disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Reward Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900 tracking-tighter flex items-center gap-2">
                  <Gift className="h-6 w-6 text-primary" /> Crear Incentivo
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreateReward} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400">Nombre del Premio</label>
                  <input required className="w-full px-4 py-3 border rounded-2xl font-bold" value={newReward.title} onChange={e => setNewReward({...newReward, title: e.target.value})} placeholder="Ej. Tarjeta de Regalo Amazon $1000" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400">Descripción / Meta</label>
                  <textarea required className="w-full px-4 py-3 border rounded-2xl font-bold" value={newReward.description} onChange={e => setNewReward({...newReward, description: e.target.value})} placeholder="Describe la meta a alcanzar para ganar este premio..." rows="2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">XP Requerida</label>
                    <input type="number" className="w-full px-4 py-3 border rounded-2xl font-bold" value={newReward.xpRequired} onChange={e => setNewReward({...newReward, xpRequired: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">URL Imagen (Opcional)</label>
                    <input className="w-full px-4 py-3 border rounded-2xl font-bold" value={newReward.image} onChange={e => setNewReward({...newReward, image: e.target.value})} placeholder="https://..." />
                  </div>
                </div>

                <button type="submit" className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 mt-4 shadow-lg hover:bg-primary transition-all">
                  <Plus className="h-5 w-5" /> Publicar Premio
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
