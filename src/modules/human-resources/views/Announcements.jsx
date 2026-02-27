import React from 'react';
import { Megaphone, FileSignature, CheckSquare, Eye, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Announcements() {
  const announcements = [
    { 
      title: 'Actualización Política de Viáticos 2026', 
      date: '25 Feb 2026', 
      desc: 'Se ha modificado el límite de alimentos diario. Es obligatorio leer y firmar el acuse.', 
      type: 'URGENT',
      category: 'GENERAL',
      xpReward: 150,
      readRate: 45
    },
    { 
      title: 'Mantenimiento Preventivo de Flota', 
      date: '22 Feb 2026', 
      desc: 'Nuevos lineamientos para el reporte de fallas mecánicas en vehículos de campo.', 
      type: 'INFO',
      category: 'TÉCNICO',
      xpReward: 50,
      readRate: 72
    },
    { 
      title: 'Día de descanso por Aniversario Olea', 
      date: '10 Feb 2026', 
      desc: 'Información general sobre el próximo día festivo corporativo.', 
      type: 'INFO',
      category: 'GENERAL',
      xpReward: 25,
      readRate: 98
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Comunicados y Políticas</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Canal de comunicación oficial con recompensas por lectura.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-amber-50 border border-amber-100 px-4 py-3 rounded-2xl flex items-center gap-3">
            <Flame className="h-5 w-5 text-amber-500 animate-pulse" />
            <div>
              <p className="text-[9px] font-black text-amber-700 uppercase leading-none">Racha Promedio</p>
              <p className="text-lg font-black text-amber-600 leading-none mt-1">8.5 DÍAS</p>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
            <Megaphone className="h-4 w-4" /> Nuevo Anuncio
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatSmall icon={CheckSquare} label="Tasa de Lectura" value="76%" color="text-blue-600" />
        <StatSmall icon={FileSignature} label="Firmas Pendientes" value="12" color="text-red-500" />
        <StatSmall icon={Flame} label="Usuarios en Racha" value="45" color="text-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {announcements.map((ann, i) => (
          <div key={i} className={cn(
            "bg-white rounded-[2.5rem] p-8 border shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group",
            ann.type === 'URGENT' ? "border-red-100 hover:border-red-300" : "hover:border-primary/30"
          )}>
            {ann.type === 'URGENT' && <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500" />}
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-2">
                <span className={cn(
                  "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest",
                  ann.type === 'URGENT' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                )}>
                  {ann.type === 'URGENT' ? 'Firma Obligatoria' : 'Informativo'}
                </span>
                <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase tracking-widest">
                  {ann.category}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{ann.date}</span>
                <span className="text-[10px] font-black text-emerald-600 mt-1">+{ann.xpReward} XP</span>
              </div>
            </div>
            
            <h3 className="text-xl font-black text-gray-900 group-hover:text-primary transition-colors leading-tight">{ann.title}</h3>
            <p className="text-sm text-gray-500 font-medium mt-3 leading-relaxed">{ann.desc}</p>
            
            <div className="mt-8 pt-6 border-t flex items-center justify-between">
              <div className="flex-1 mr-6">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cumplimiento General</span>
                  <span className="text-sm font-black text-gray-900">{ann.readRate}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-1000", ann.readRate < 50 ? "bg-amber-500" : "bg-emerald-500")}
                    style={{ width: `${ann.readRate}%` }}
                  />
                </div>
              </div>
              <button className="h-12 w-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                <Eye className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatSmall({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white p-4 rounded-2xl border shadow-sm flex items-center gap-4">
      <div className={cn("p-2 rounded-xl bg-gray-50", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[9px] font-black text-gray-400 uppercase leading-none">{label}</p>
        <p className="text-lg font-black text-gray-900 leading-none mt-1">{value}</p>
      </div>
    </div>
  );
}
