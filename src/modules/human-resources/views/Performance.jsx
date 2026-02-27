import React from 'react';
import { Target, TrendingUp, Star, Search, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Performance() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Desempeño y OKRs</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Evaluaciones 360 y seguimiento de objetivos corporativos.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          <Target className="h-4 w-4" /> Nuevo Ciclo de Evaluación
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* OKRs Globales */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border shadow-sm space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Objetivos Q1 2026 (OKRs)
            </h3>
          </div>
          
          <div className="space-y-6">
            {[
              { title: 'Reducir tiempo de instalación en OTs un 15%', progress: 65, status: 'on-track' },
              { title: 'Cero accidentes laborales en el trimestre', progress: 100, status: 'completed' },
              { title: 'Alcanzar $5M MXN en facturación CRM', progress: 40, status: 'at-risk' }
            ].map((okr, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end">
                  <p className="font-bold text-gray-700 text-sm">{okr.title}</p>
                  <span className="text-xs font-black text-gray-900">{okr.progress}%</span>
                </div>
                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all",
                      okr.status === 'completed' ? "bg-green-500" :
                      okr.status === 'at-risk' ? "bg-amber-500" : "bg-primary"
                    )}
                    style={{ width: `${okr.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-3xl p-8 border shadow-sm space-y-6">
          <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" /> Top Performers
          </h3>
          <div className="space-y-4">
            {[
              { name: 'Gabriel Tech', score: '9.8/10', role: 'Operaciones' },
              { name: 'Ana Admin', score: '9.5/10', role: 'Administración' }
            ].map((emp, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-2xl border">
                <div className="h-10 w-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-black">
                  #{i + 1}
                </div>
                <div>
                  <p className="font-black text-sm text-gray-900">{emp.name}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">{emp.role} • Score: {emp.score}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
