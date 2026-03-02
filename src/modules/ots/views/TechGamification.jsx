import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Target, 
  Flame, 
  Award, 
  Star, 
  TrendingUp, 
  Medal, 
  ChevronRight,
  ShieldCheck,
  Zap,
  Crown,
  Gift,
  Clock
} from 'lucide-react';
import { gamificationService } from '@/api/gamificationService';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

export default function TechGamification() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [lb, p, r] = await Promise.all([
        gamificationService.getLeaderboard(),
        gamificationService.getPlayerStats(user.id),
        gamificationService.getRewards()
      ]);
      setLeaderboard(lb);
      setPlayer(p);
      setRewards(r);
    } catch (error) {
      console.error("Error loading gamification data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !player) return <div className="p-10 text-center animate-pulse font-black text-gray-400">CARGANDO ARENA DE CAMPEONES...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-32 px-4 md:px-0">
      {/* Player Profile Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-primary/20 rounded-[3rem] p-8 text-white shadow-2xl shadow-primary/10 animate-in fade-in zoom-in duration-700">
        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12">
          <Trophy className="h-64 w-64" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-[2rem] border-4 border-primary/30 p-1 bg-gray-800 shadow-xl overflow-hidden">
              <img src={player.avatar} className="h-full w-full object-cover rounded-[1.5rem]" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-primary text-white h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs shadow-lg ring-4 ring-gray-900">
              {player.level}
            </div>
          </div>
          
          <div className="text-center md:text-left space-y-1">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Rango de Cuadrilla</p>
            <h2 className="text-3xl font-black tracking-tighter">{player.name}</h2>
            <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                <Medal className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-black uppercase">Top {player.rank} Global</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-blue-400 fill-blue-400" />
                <span className="text-xs font-black uppercase">{player.xp.toLocaleString()} XP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Level Progress */}
        <div className="mt-8 relative z-10 space-y-2">
          <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest text-gray-400">
            <span>Progreso de Nivel</span>
            <span className="text-primary">{player.xp % 100} / 100 XP</span>
          </div>
          <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-primary to-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
              style={{ width: `${player.xp % 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-[2rem] border shadow-sm flex flex-col items-center justify-center text-center gap-1">
          <div className="bg-emerald-50 h-10 w-10 rounded-xl flex items-center justify-center text-emerald-600 mb-1">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Perfectas</p>
          <p className="text-xl font-black text-gray-900">{player.perfectServices}</p>
        </div>
        <div className="bg-white p-4 rounded-[2rem] border shadow-sm flex flex-col items-center justify-center text-center gap-1">
          <div className="bg-blue-50 h-10 w-10 rounded-xl flex items-center justify-center text-blue-600 mb-1">
            <Target className="h-5 w-5" />
          </div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Finalizadas</p>
          <p className="text-xl font-black text-gray-900">{player.completedOTs}</p>
        </div>
        <div className="bg-white p-4 rounded-[2rem] border shadow-sm flex flex-col items-center justify-center text-center gap-1">
          <div className="bg-amber-50 h-10 w-10 rounded-xl flex items-center justify-center text-amber-600 mb-1">
            <Clock className="h-5 w-5" />
          </div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Eficiencia</p>
          <p className="text-xl font-black text-gray-900">{player.avgCompletionTime || '0.0'}h</p>
        </div>
        <div className="bg-white p-4 rounded-[2rem] border shadow-sm flex flex-col items-center justify-center text-center gap-1">
          <div className="bg-orange-50 h-10 w-10 rounded-xl flex items-center justify-center text-orange-600 mb-1">
            <Flame className="h-5 w-5" />
          </div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Racha</p>
          <p className="text-xl font-black text-gray-900">12 d</p>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="bg-primary/5 border border-primary/10 rounded-[2.5rem] p-6 space-y-4">
        <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2">
            <Zap className="h-4 w-4 fill-primary" /> Tips de Mejora (Más XP)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
                { tip: "Sube fotos de antes/después", xp: "+50 XP", detail: "Mejora tu score de perfección." },
                { tip: "Cierra tu OT en sitio", xp: "+30 XP", detail: "Aumenta tu bono de eficiencia." },
                { tip: "Completa cursos en Academy", xp: "+100 XP", detail: "Sube de nivel más rápido." },
                { tip: "Evita gastos sin ticket", xp: "BONO", detail: "Mantén tu reputación impecable." }
            ].map((t, i) => (
                <div key={i} className="bg-white p-3 rounded-2xl border border-primary/5 flex items-center gap-3 group hover:border-primary/20 transition-all">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black shrink-0">
                        {t.xp}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-900 leading-tight">{t.tip}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">{t.detail}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* Global Leaderboard */}
      <div className="bg-white border rounded-[3rem] overflow-hidden shadow-xl shadow-gray-200/50">
        <div className="p-8 border-b flex justify-between items-center bg-gray-50/30">
          <h3 className="text-xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
            <Crown className="h-6 w-6 text-amber-500" /> Ranking de Cuadrilla
          </h3>
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-white border px-3 py-1.5 rounded-xl shadow-sm">Marzo 2026</span>
        </div>
        
        <div className="divide-y divide-gray-50">
          {leaderboard.map((p, i) => {
            const isMostOTs = p.completedOTs === Math.max(...leaderboard.map(x => x.completedOTs));
            const isFastest = p.avgCompletionTime > 0 && p.avgCompletionTime === Math.min(...leaderboard.filter(x => x.avgCompletionTime > 0).map(x => x.avgCompletionTime));

            return (
              <div key={p.id} className={cn(
                "flex items-center gap-4 p-6 transition-all",
                p.id === user.id ? "bg-primary/5 ring-inset ring-1 ring-primary/10" : "hover:bg-gray-50/50"
              )}>
                <div className="w-8 flex justify-center">
                  {i === 0 ? <Medal className="h-6 w-6 text-amber-400" /> :
                   i === 1 ? <Medal className="h-6 w-6 text-gray-400" /> :
                   i === 2 ? <Medal className="h-6 w-6 text-amber-700" /> :
                   <span className="text-xs font-black text-gray-300">#{i + 1}</span>}
                </div>
                
                <div className="h-12 w-12 rounded-2xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200 relative">
                  <img src={p.avatar} className="h-full w-full object-cover" />
                  {isFastest && (
                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white p-1 rounded-md shadow-lg ring-2 ring-white" title="El más veloz">
                        <Zap className="h-2 w-2 fill-white" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 text-sm truncate uppercase tracking-tight">{p.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase">LVL {p.level}</span>
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest flex items-center gap-1",
                        isMostOTs ? "text-orange-600 font-black" : "text-gray-400"
                    )}>
                        {isMostOTs && <Flame className="h-3 w-3" />}
                        {p.completedOTs} OTs
                    </span>
                    {p.avgCompletionTime > 0 && (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-l pl-2">
                            {p.avgCompletionTime}h med.
                        </span>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-black text-gray-900 leading-none">{p.xp.toLocaleString()}</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">PUNTOS</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rewards Section */}
      <div className="space-y-6">
        <h3 className="text-xl font-black text-gray-900 tracking-tighter flex items-center gap-3 px-2">
          <Gift className="h-6 w-6 text-primary" /> Premios de Temporada
        </h3>
        
        <div className="grid gap-4">
          {rewards.map(reward => {
            const isWinner = reward.winners?.some(w => w.id === user.id);
            const progress = Math.min((player.xp / reward.xpRequired) * 100, 100);
            
            return (
              <div key={reward.id} className={cn(
                "bg-white border rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col md:flex-row transition-all",
                isWinner ? "border-emerald-200 ring-4 ring-emerald-50 shadow-emerald-100" : "border-gray-100"
              )}>
                <div className="w-full md:w-48 h-40 md:h-auto shrink-0 relative overflow-hidden">
                  <img src={reward.image || 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=400'} className="w-full h-full object-cover" />
                  {isWinner && (
                    <div className="absolute inset-0 bg-emerald-600/20 backdrop-blur-[2px] flex items-center justify-center">
                      <div className="bg-white text-emerald-600 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase shadow-lg animate-bounce">
                        ¡PREMIO GANADO!
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="p-6 md:p-8 flex-1 space-y-4">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-lg font-black text-gray-900 leading-tight">{reward.title}</h4>
                      <span className="text-[8px] font-black text-primary uppercase bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                        {reward.xpRequired} XP
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed italic">"{reward.description}"</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Tu Progreso</span>
                      <span className="text-[10px] font-black text-gray-900">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                      <div 
                        className={cn("h-full rounded-full transition-all duration-1000 shadow-sm", isWinner ? "bg-emerald-500" : "bg-primary")} 
                        style={{ width: `${progress}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
