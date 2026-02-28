import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Award, 
  Star, 
  Zap, 
  ShieldCheck, 
  Medal, 
  ChevronRight,
  BarChart3,
  Search
} from 'lucide-react';
import { gamificationService } from '@/api/gamificationService';
import { cn } from '@/lib/utils';

export default function Performance() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    gamificationService.getLeaderboard().then(data => {
      setLeaderboard(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Desempeño y KPIs</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Monitoreo de talento basado en méritos y productividad en campo.</p>
        </div>
      </div>

      {/* Operational KPIs Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">XP Total Generada</p>
          <p className="text-3xl font-black text-gray-900">{(leaderboard.reduce((acc, p) => acc + p.xp, 0)).toLocaleString()}</p>
          <div className="flex items-center gap-1 text-emerald-500 font-bold text-[10px] mt-2">
            <TrendingUp className="h-3 w-3" /> +12% este mes
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">OTs Sin Incidencias</p>
          <p className="text-3xl font-black text-emerald-600">94.2%</p>
          <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-tighter">Estándar Olea Controls</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Nivel Promedio</p>
          <p className="text-3xl font-black text-blue-600">
            {Math.round(leaderboard.reduce((acc, p) => acc + p.level, 0) / (leaderboard.length || 1))}
          </p>
          <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-tighter">Capacitación Activa</p>
        </div>
        <div className="bg-gray-900 p-6 rounded-[2rem] text-white shadow-xl shadow-gray-200">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Retención de Talento</p>
          <p className="text-3xl font-black">98%</p>
          <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-tighter">Engagement por Gamificación</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Talent Ranking (Real-time from Field) */}
        <div className="bg-white border rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b bg-gray-50/30 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tighter">Ranking de Productividad</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Datos consolidados de campo</p>
            </div>
            <BarChart3 className="h-6 w-6 text-gray-300" />
          </div>
          
          <div className="divide-y divide-gray-50">
            {leaderboard.map((p, i) => (
              <div key={p.id} className="flex items-center gap-4 p-6 hover:bg-gray-50/50 transition-all group">
                <div className="w-8 flex justify-center font-black text-gray-300">#{i + 1}</div>
                <div className="h-10 w-10 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                  <img src={p.avatar} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-gray-900 text-sm uppercase">{p.name}</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Nivel {p.level} • {p.completedOTs} OTs</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-600">{p.xp.toLocaleString()}</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase">Puntos</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Development Metrics */}
        <div className="space-y-6">
          <div className="bg-white border rounded-[2.5rem] p-8 shadow-sm h-full">
            <h3 className="text-xl font-black text-gray-900 tracking-tighter mb-6">Métricas de Crecimiento</h3>
            <div className="space-y-8">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Especialización Técnica</span>
                  <span className="text-sm font-black text-primary">82%</span>
                </div>
                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[82%] rounded-full" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Puntualidad en Tienda</span>
                  <span className="text-sm font-black text-emerald-500">95%</span>
                </div>
                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[95%] rounded-full" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Satisfacción del Cliente</span>
                  <span className="text-sm font-black text-blue-500">4.8/5</span>
                </div>
                <div className="h-2 w-full bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[96%] rounded-full" />
                </div>
              </div>
            </div>

            <div className="mt-10 p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-2xl shadow-sm text-indigo-600">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-black text-indigo-900 uppercase">Próxima Evaluación</p>
                  <p className="text-[10px] font-bold text-indigo-400 mt-0.5 uppercase tracking-widest">Revisión de Bonos Q1 - Abril 2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
