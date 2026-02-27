import React from 'react';
import { UserPlus, Briefcase, ChevronRight, Search, Clock, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

const PIPELINE = [
  { id: 'APPLIED', label: 'Postulados', color: 'bg-gray-100' },
  { id: 'SCREENING', label: 'Entrevista RH', color: 'bg-blue-50' },
  { id: 'TECHNICAL', label: 'Prueba Técnica', color: 'bg-purple-50' },
  { id: 'OFFER', label: 'Oferta / Contratación', color: 'bg-emerald-50' }
];

export default function Recruitment() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-12rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Reclutamiento (ATS)</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Gestión de vacantes y seguimiento de candidatos.</p>
        </div>
        <div className="flex gap-3">
          <select className="bg-white border px-4 py-3 rounded-2xl text-sm font-bold outline-none text-gray-700 shadow-sm">
            <option>Vacante: Técnico Instalador Sr.</option>
            <option>Vacante: Ejecutivo de Ventas</option>
          </select>
          <button className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
            <Briefcase className="h-4 w-4" /> Nueva Vacante
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-hidden">
        {PIPELINE.map((stage) => (
          <div key={stage.id} className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-black text-[11px] text-gray-900 uppercase tracking-widest">{stage.label}</h3>
              <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full">2</span>
            </div>
            
            <div className={cn("flex-1 rounded-3xl p-3 space-y-3 overflow-y-auto", stage.color)}>
              {/* Candidate Card Mock */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase">Ing. Electromecánico</span>
                </div>
                <h4 className="font-black text-gray-900 text-sm leading-tight mb-1 group-hover:text-primary transition-colors">Carlos Mendoza</h4>
                <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold mb-4">
                  <Clock className="h-3 w-3" /> Hace 2 días
                </div>
                
                <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                  <button className="text-[10px] font-black text-gray-400 hover:text-primary flex items-center gap-1 uppercase tracking-wider">
                    <Mail className="h-3 w-3" /> Contactar
                  </button>
                  <div className="h-6 w-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white transition-all">
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
              
              {stage.id === 'OFFER' && (
                <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg cursor-pointer hover:bg-emerald-700 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black bg-white/20 px-1.5 py-0.5 rounded uppercase">Oferta Aceptada</span>
                  </div>
                  <h4 className="font-black text-sm leading-tight mb-4">Laura Torres</h4>
                  <button className="w-full bg-white text-emerald-700 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50">
                    Convertir a Empleado
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
