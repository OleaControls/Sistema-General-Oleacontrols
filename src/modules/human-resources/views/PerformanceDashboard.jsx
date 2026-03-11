import React, { useState, useEffect } from 'react';
import { 
  Star, TrendingUp, Users, DollarSign, Award, Target, 
  BarChart3, User, ArrowUpRight, ArrowDownRight, 
  ChevronRight, MessageSquare, Settings, X, Save, TrendingDown
} from 'lucide-react';
import { useAuth, ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

const MetricsCard = ({ label, value, prevValue, icon: Icon, color }) => {
  const diff = value - prevValue;
  const isUp = diff >= 0;

  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
      <div className="flex justify-between items-center">
        <div className={cn("p-3 rounded-2xl", color === 'blue' ? 'bg-blue-50 text-blue-600' : color === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="text-right">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">{label}</span>
            {prevValue > 0 && (
                <div className={cn("flex items-center gap-0.5 text-[10px] font-bold justify-end", isUp ? "text-emerald-500" : "text-red-500")}>
                    {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(diff).toFixed(1)} vs ant.
                </div>
            )}
        </div>
      </div>
      <div>
        <p className="text-4xl font-black text-gray-900 tracking-tighter">{typeof value === 'number' ? value.toFixed(1) : value}</p>
      </div>
    </div>
  );
};

export default function PerformanceDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ ranking: [], period: '' });
  const [myMetrics, setMyMetrics] = useState(null);
  const [bonusConfig, setBonusConfig] = useState([
    { label: 'Excelente', min: 4.8, amount: 1500, color: 'amber' },
    { label: 'Muy Bueno', min: 4.5, amount: 1000, color: 'blue' },
    { label: 'Bueno', min: 4.0, amount: 500, color: 'emerald' }
  ]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [tempConfig, setTempConfig] = useState([
    { label: 'Excelente', min: 4.8, amount: 1500, color: 'amber' },
    { label: 'Muy Bueno', min: 4.5, amount: 1000, color: 'blue' },
    { label: 'Bueno', min: 4.0, amount: 500, color: 'emerald' }
  ]);

  const isSupervisor = user.role === ROLES.OPS || user.role === ROLES.ADMIN;

  useEffect(() => {
    fetchData();
  }, [user, isSupervisor]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const configRes = await fetch('/api/config?key=BONUS_THRESHOLDS');
      const configData = await configRes.json();
      
      if (Array.isArray(configData) && configData.length > 0) {
        setBonusConfig(configData);
        setTempConfig(configData);
      }

      const myRes = await fetch(`/api/evaluations?targetId=${user.id}`);
      if (myRes.ok) setMyMetrics(await myRes.json());

      if (isSupervisor) {
         const rankRes = await fetch(`/api/evaluations?ranking=true`);
         if (rankRes.ok) setData(await rankRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'BONUS_THRESHOLDS', value: tempConfig })
      });
      if (res.ok) {
        setBonusConfig(tempConfig);
        setIsEditModalOpen(false);
        fetchData();
      }
    } catch (err) {
      alert("Error al guardar");
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse font-black text-gray-400">CARGANDO QUINCENA...</div>;

  const currentStats = myMetrics?.current || { avg1: 0, avg2: 0, total: 0, totalAvg: 0 };
  const prevStats = myMetrics?.previous || { avg1: 0, avg2: 0, totalAvg: 0 };

  const calculateBonus = (score) => {
    if (!Array.isArray(bonusConfig)) return 0;
    const tier = [...bonusConfig]
      .filter(b => b && typeof b.min === 'number')
      .sort((a, b) => b.min - a.min)
      .find(b => score >= b.min);
    return (tier && typeof tier.amount === 'number') ? tier.amount : 0;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Control Quincenal</h2>
          <p className="text-gray-500 font-bold text-xs mt-1 uppercase tracking-widest flex items-center gap-2">
            Periodo Activo: <span className="text-primary">{myMetrics?.period || data?.period || '---'}</span>
          </p>
        </div>
        {isSupervisor && (
          <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 bg-white border px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">
            <Settings className="h-4 w-4" /> Configurar Metas
          </button>
        )}
      </div>

      {/* Mi Desempeño */}
      <div className="space-y-6">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
          <User className="h-4 w-4" /> Mi Comparativa Quincenal
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricsCard label="Satisfacción" value={currentStats.avg1} prevValue={prevStats.avg1} icon={Star} color="amber" />
          <MetricsCard label="Eficiencia" value={currentStats.avg2} prevValue={prevStats.avg2} icon={TrendingUp} color="blue" />
          <MetricsCard label="Encuestas" value={currentStats.total} prevValue={prevStats.total} icon={Users} color="blue" />
          
          <div className="bg-gray-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
             <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Bono Quincenal</p>
                <p className="text-5xl font-black tracking-tighter">${(calculateBonus(currentStats.totalAvg) || 0).toLocaleString()}</p>
                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                   <p className="text-[9px] font-bold text-gray-400 uppercase">Tendencia: {currentStats.totalAvg >= prevStats.totalAvg ? 'MEJORANDO' : 'BAJANDO'}</p>
                   {currentStats.totalAvg >= prevStats.totalAvg ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-red-500" />}
                </div>
             </div>
             <DollarSign className="absolute -right-4 -bottom-4 h-32 w-32 text-white/5 group-hover:scale-110 transition-transform" />
          </div>
        </div>
      </div>

      {/* Ranking Global */}
      {isSupervisor && (
        <div className="space-y-6 pt-6">
           <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-2">
             <BarChart3 className="h-4 w-4" /> Ranking de Técnicos (Esta Quincena)
           </h3>
           <div className="bg-white border rounded-[3rem] overflow-hidden shadow-sm">
             <table className="w-full text-left">
               <thead className="bg-gray-50 border-b">
                 <tr>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Técnico</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Score Actual</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">vs Pasada</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Encuestas</th>
                   <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Bono</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {(data?.ranking || []).map((tech) => (
                   <tr key={tech.id} className="hover:bg-gray-50/50 transition-colors">
                     <td className="px-8 py-6 font-black text-sm text-gray-900 uppercase tracking-tight">{tech.name}</td>
                     <td className="px-8 py-6 text-center">
                        <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full font-black text-sm">{(tech.score || 0).toFixed(1)}</span>
                     </td>
                     <td className="px-8 py-6 text-center">
                        <div className={cn("flex items-center justify-center gap-1 font-black text-xs", tech.trend === 'UP' ? 'text-emerald-500' : 'text-red-500')}>
                           {tech.trend === 'UP' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                           {(tech.prevScore || 0).toFixed(1)}
                        </div>
                     </td>
                     <td className="px-8 py-6 text-center font-bold text-gray-400">{tech.total || 0}</td>
                     <td className="px-8 py-6 text-center font-black text-emerald-600">${(tech.bonus || 0).toLocaleString()}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Modal de Configuración (Idéntico al anterior pero con refresco quincenal) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Configurar Metas Quincenales</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-400" /></button>
              </div>
              <div className="space-y-6">
                {tempConfig.map((tier, i) => (
                  <div key={i} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{tier.label}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Mín. Estrellas</label>
                        <input type="number" step="0.1" className="w-full px-4 py-3 rounded-xl border mt-1 font-bold outline-none" value={tier.min} onChange={(e) => { const nc = [...tempConfig]; nc[i].min = parseFloat(e.target.value); setTempConfig(nc); }} />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Monto Bono ($)</label>
                        <input type="number" className="w-full px-4 py-3 rounded-xl border mt-1 font-bold outline-none" value={tier.amount} onChange={(e) => { const nc = [...tempConfig]; nc[i].amount = parseInt(e.target.value); setTempConfig(nc); }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleSaveConfig} className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-primary transition-all shadow-xl">
                <Save className="h-4 w-4" /> Guardar para esta Quincena
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
