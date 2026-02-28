import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  MapPin, 
  Clock, 
  ArrowRight, 
  Receipt, 
  CheckCircle, 
  Camera, 
  ChevronRight, 
  Store, 
  Calendar, 
  Sparkles, 
  AlertTriangle, 
  Trophy 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { otService } from '@/api/otService';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

export default function TechnicianOTs() {
  const { user } = useAuth();
  const [ots, setOts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await otService.getOTs();
    // Visible if user is lead or support technician
    setOts(data.filter(o => 
      o.leadTechId === user.id || 
      (o.supportTechs && o.supportTechs.some(st => st.id === user.id))
    ));
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto pb-32 px-3 md:px-0">
      {/* Premium Header */}
      <div className="relative py-8 md:py-10 overflow-hidden rounded-[2.5rem] md:rounded-[3rem] bg-gray-900 text-white mb-6 md:mb-8 px-6 md:px-8 shadow-2xl shadow-gray-900/20 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="absolute top-0 right-0 p-8 md:p-12 opacity-10">
          <Sparkles className="h-32 md:h-48 w-32 md:w-48 text-primary" />
        </div>
        <div className="relative z-10 flex justify-between items-start">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3 md:mb-4">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[8px] md:text-[10px] font-black tracking-[0.3em] uppercase text-emerald-400">Personal Operativo Activo</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter leading-none mb-2">Mi Jornada</h2>
            <p className="text-gray-400 font-bold text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2">
              <Calendar className="h-3 w-3 text-primary" /> {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button 
            onClick={() => navigate('/ots/leaderboard')}
            className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl border border-white/10 transition-all flex flex-col items-center gap-1 group shadow-lg"
          >
            <Trophy className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-[8px] font-black uppercase text-white tracking-widest">Ranking</span>
          </button>
        </div>
      </div>

      {/* Task Roadmap */}
      <div className="space-y-4 md:space-y-6 relative">
        {/* Connection Line */}
        <div className="absolute left-[23px] md:left-[31px] top-4 bottom-4 w-0.5 bg-gray-100 -z-10" />

        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-[2rem] md:rounded-[2.5rem] animate-pulse" />)
        ) : ots.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-100 rounded-[2.5rem] md:rounded-[3rem] p-12 md:p-16 text-center shadow-inner">
            <ClipboardList className="h-10 w-10 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Hoja de ruta vacía</p>
          </div>
        ) : ots.map((ot, index) => (
          <div 
            key={ot.id} 
            onClick={() => navigate(`/ots/${ot.id}`)}
            className="group relative flex gap-3 md:gap-6 active:scale-[0.98] transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Timeline Marker */}
            <div className="shrink-0 pt-4 md:pt-6">
              <div className={cn(
                "h-12 w-12 md:h-16 md:w-16 rounded-2xl md:rounded-[1.5rem] flex items-center justify-center shadow-xl transition-all border-[3px] md:border-4 border-white",
                ot.status === 'COMPLETED' ? "bg-emerald-500 text-white" :
                ot.status === 'IN_PROGRESS' ? "bg-amber-500 text-white ring-4 ring-amber-100 shadow-amber-100" :
                ot.status === 'ACCEPTED' ? "bg-blue-600 text-white shadow-blue-100" : "bg-white text-gray-300 shadow-sm"
              )}>
                {ot.status === 'COMPLETED' ? <CheckCircle className="h-5 w-5 md:h-7 md:w-7" /> : <Clock className="h-5 w-5 md:h-7 md:w-7" />}
              </div>
            </div>

            {/* Task Card */}
            <div className="flex-1 bg-white rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 p-5 md:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_25px_50px_rgba(0,0,0,0.06)] hover:border-primary/20 transition-all relative overflow-hidden">
              {/* Corner Accent Glow */}
              <div className={cn(
                "absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 -mr-12 md:-mr-16 -mt-12 md:-mt-16 rounded-full blur-3xl opacity-10 transition-opacity",
                ot.status === 'COMPLETED' ? "bg-emerald-500" :
                ot.status === 'IN_PROGRESS' ? "bg-amber-500" :
                ot.status === 'ACCEPTED' ? "bg-blue-500" : "bg-gray-500"
              )} />

              <div className="flex justify-between items-start mb-3 md:mb-4">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <span className="text-[8px] md:text-[9px] font-black bg-gray-900 text-white px-1.5 py-0.5 rounded uppercase tracking-widest">
                    {ot.id}
                  </span>
                  <span className={cn(
                    "text-[8px] md:text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border",
                    ot.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    ot.status === 'IN_PROGRESS' ? "bg-amber-50 text-amber-600 border-amber-100 animate-pulse" :
                    "bg-blue-50 text-blue-600 border-blue-100"
                  )}>
                    {ot.status === 'IN_PROGRESS' ? 'EJECUTANDO' : ot.status}
                  </span>
                </div>
                {ot.priority === 'HIGH' && (
                  <div className="bg-red-50 text-red-600 p-1.5 rounded-lg border border-red-100 animate-pulse shrink-0">
                    <AlertTriangle className="h-3 w-3" />
                  </div>
                )}
              </div>

              <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight mb-3 md:mb-4 group-hover:text-primary transition-colors">
                {ot.title}
              </h3>

              <div className="grid grid-cols-1 gap-2 md:gap-4">
                <div className="flex items-center gap-3 bg-gray-50/50 p-2 md:p-3 rounded-xl md:rounded-2xl border border-gray-100/50">
                  <div className="bg-white p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-sm">
                    <Store className="h-3.5 w-3.5 md:h-4 md:h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Establecimiento</p>
                    <p className="text-[10px] md:text-xs font-bold text-gray-700 truncate">{ot.storeName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-gray-50/50 p-2 md:p-3 rounded-xl md:rounded-2xl border border-gray-100/50">
                  <div className="bg-white p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-sm">
                    <Clock className="h-3.5 w-3.5 md:h-4 md:h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[7px] md:text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Programado</p>
                    <p className="text-[10px] md:text-xs font-bold text-gray-700">{ot.arrivalTime} HRS</p>
                  </div>
                </div>
              </div>

              {/* Enhanced Footer for Active Tasks */}
              {ot.status === 'IN_PROGRESS' && (
                <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-dashed border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      <div className="h-6 w-6 rounded-full border-2 border-white bg-primary flex items-center justify-center text-[7px] font-black text-white shadow-sm">L</div>
                      {ot.supportTechs?.length > 0 && (
                        <div className="h-6 w-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[7px] font-black text-gray-400 shadow-sm">+{ot.supportTechs.length}</div>
                      )}
                    </div>
                    <span className="text-[8px] font-black text-gray-400 uppercase ml-1 hidden sm:inline">Equipo en sitio</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-primary/5 px-2.5 py-1 rounded-full">
                    <span className="text-[8px] font-black text-primary uppercase tracking-tighter">Gestionar Orden</span>
                    <ArrowRight className="h-2.5 w-2.5 text-primary" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
