import React, { useState, useEffect } from 'react';
import { 
  Trophy, Medal, Zap, Clock, CheckCircle2, 
  ChevronRight, Star, Target, Timer, TrendingUp, 
  ShieldAlert, Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const RankBadge = ({ rank }) => {
  const configs = {
    'DIAMANTE': { color: 'from-blue-400 to-indigo-600', icon: Crown, label: 'Diamante' },
    'ORO': { color: 'from-yellow-400 to-amber-600', icon: Trophy, label: 'Oro' },
    'PLATA': { color: 'from-slate-300 to-slate-500', icon: Medal, label: 'Plata' },
    'BRONCE': { color: 'from-orange-400 to-orange-700', icon: Medal, label: 'Bronce' }
  };
  const config = configs[rank] || configs['BRONCE'];
  return (
    <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-widest shadow-lg bg-gradient-to-r", config.color)}>
      <config.icon className="h-3 w-3" /> {config.label}
    </div>
  );
};

export default function TechGamification() {
  const [leaders, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGamification = async () => {
      try {
        const res = await fetch('/api/gamification');
        const data = await res.json();
        setLeaderboard(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchGamification();
  }, []);

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-gray-400">CARGANDO ARENA DE LÍDERES...</div>;

  const topThree = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 animate-in fade-in duration-700">
      {/* Header Arena */}
      <div className="text-center space-y-4">
        <div className="inline-flex p-4 bg-primary/10 rounded-[2rem] border border-primary/20 text-primary mb-2">
          <Trophy className="h-10 w-10" />
        </div>
        <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic">Arena de Líderes</h1>
        <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-xs">Métricas de Élite • OleaControls México</p>
      </div>

      {/* Podio Visual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-10">
        {/* Segundo Lugar */}
        {topThree[1] && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl text-center space-y-4 relative order-2 md:order-1 h-fit"
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-400 text-white w-12 h-12 rounded-full flex items-center justify-center font-black border-4 border-white shadow-lg">2</div>
            <img src={topThree[1].avatar || `https://ui-avatars.com/api/?name=${topThree[1].name}`} className="w-24 h-24 rounded-[2rem] mx-auto object-cover border-4 border-slate-50 shadow-inner" alt="" />
            <div>
              <p className="text-lg font-black text-gray-900 leading-tight">{topThree[1].name}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Especialista de Élite</p>
            </div>
            <div className="flex justify-center"><RankBadge rank={topThree[1].rank} /></div>
            <p className="text-3xl font-black text-slate-500">{topThree[1].points.toLocaleString()} pts</p>
          </motion.div>
        )}

        {/* Primero Lugar */}
        {topThree[0] && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 p-10 rounded-[3.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.2)] text-center space-y-6 relative order-1 md:order-2 z-10 scale-110"
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-amber-400 text-gray-900 w-16 h-16 rounded-full flex items-center justify-center font-black border-4 border-gray-900 shadow-2xl animate-bounce">
              <Crown className="h-8 w-8" />
            </div>
            <img src={topThree[0].avatar || `https://ui-avatars.com/api/?name=${topThree[0].name}`} className="w-32 h-32 rounded-[2.5rem] mx-auto object-cover border-4 border-amber-400 shadow-2xl" alt="" />
            <div>
              <p className="text-2xl font-black text-white leading-tight">{topThree[0].name}</p>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] mt-2">Campeón de Campo</p>
            </div>
            <div className="flex justify-center"><RankBadge rank={topThree[0].rank} /></div>
            <div className="space-y-1">
              <p className="text-5xl font-black text-white tracking-tighter">{topThree[0].points.toLocaleString()}</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Puntos de Honor Acumulados</p>
            </div>
          </motion.div>
        )}

        {/* Tercer Lugar */}
        {topThree[2] && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl text-center space-y-4 relative order-3 h-fit"
          >
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-orange-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-black border-4 border-white shadow-lg">3</div>
            <img src={topThree[2].avatar || `https://ui-avatars.com/api/?name=${topThree[2].name}`} className="w-24 h-24 rounded-[2rem] mx-auto object-cover border-4 border-orange-50 shadow-inner" alt="" />
            <div>
              <p className="text-lg font-black text-gray-900 leading-tight">{topThree[2].name}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Especialista de Élite</p>
            </div>
            <div className="flex justify-center"><RankBadge rank={topThree[2].rank} /></div>
            <p className="text-3xl font-black text-orange-700">{topThree[2].points.toLocaleString()} pts</p>
          </motion.div>
        )}
      </div>

      {/* Tabla Detallada de Métricas */}
      <div className="bg-white border rounded-[3rem] overflow-hidden shadow-sm">
        <div className="bg-gray-50/50 px-10 py-6 border-b">
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Métricas de Rendimiento Técnico</h3>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Rank</th>
              <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Técnico</th>
              <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">OTs Éxito</th>
              <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">T. Reacción</th>
              <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">T. Resolución</th>
              <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Puntaje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {leaders.map((tech, i) => (
              <tr key={tech.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-10 py-6 font-black text-gray-300 text-lg">#{i + 1}</td>
                <td className="px-10 py-6">
                  <div className="flex items-center gap-4">
                    <img src={tech.avatar || `https://ui-avatars.com/api/?name=${tech.name}`} className="h-10 w-10 rounded-xl object-cover shadow-sm" alt="" />
                    <div>
                      <p className="text-sm font-black text-gray-900 leading-none">{tech.name}</p>
                      <div className="mt-1"><RankBadge rank={tech.rank} /></div>
                    </div>
                  </div>
                </td>
                <td className="px-10 py-6 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-emerald-600">{tech.completedCount}</span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase">Finalizadas</span>
                  </div>
                </td>
                <td className="px-10 py-6 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-blue-600">{tech.avgReaction}m</span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase">Promedio</span>
                  </div>
                </td>
                <td className="px-10 py-6 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-black text-indigo-600">{tech.avgResolution}h</span>
                    <span className="text-[8px] font-bold text-gray-400 uppercase">Promedio</span>
                  </div>
                </td>
                <td className="px-10 py-6 text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-xl font-black text-gray-900">{tech.points.toLocaleString()}</span>
                    <span className="text-[8px] font-bold text-primary uppercase flex items-center gap-1">
                      <Zap className="h-2 w-2 fill-current" /> Honor Total
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reglas de la Arena */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <RuleCard icon={Star} title="Calidad" desc="Basado en el promedio de estrellas del cliente." color="amber" />
        <RuleCard icon={Timer} title="Velocidad" desc="Menor tiempo entre asignación y aceptación." color="blue" />
        <RuleCard icon={Target} title="Efectividad" desc="OTs cerradas sin reportes de falla posterior." color="emerald" />
      </div>
    </div>
  );
}

function RuleCard({ icon: Icon, title, desc, color }) {
  const colors = {
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100"
  };
  return (
    <div className={cn("p-8 rounded-[2.5rem] border shadow-sm space-y-3", colors[color])}>
      <Icon className="h-6 w-6" />
      <h4 className="text-xs font-black uppercase tracking-widest">{title}</h4>
      <p className="text-[10px] font-bold opacity-70 leading-relaxed">{desc}</p>
    </div>
  );
}
