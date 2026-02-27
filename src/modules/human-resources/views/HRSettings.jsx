import React from 'react';
import { Settings, Save, Sliders, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HRSettings() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Configuración RH</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Parámetros del sistema, políticas de vacaciones y catálogos.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          <Save className="h-4 w-4" /> Guardar Cambios
        </button>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-gray-50/50 flex items-center gap-3">
          <Sliders className="h-5 w-5 text-primary" />
          <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Políticas de Vacaciones (Ley Federal MX)</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Días de inicio (1er Año)</label>
              <input type="number" defaultValue="12" className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold text-gray-900 outline-none focus:border-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Incremento Anual (Días)</label>
              <input type="number" defaultValue="2" className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold text-gray-900 outline-none focus:border-primary" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary" />
            <span className="text-sm font-bold text-gray-700">Permitir acumulación de días no disfrutados (Carry-over) al siguiente año.</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-gray-50/50 flex items-center gap-3">
          <Shield className="h-5 w-5 text-amber-500" />
          <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Aprobaciones y Flujos</h3>
        </div>
        <div className="p-6 space-y-4">
          {[
            { name: 'Aprobación de Vacaciones', desc: 'Requiere firma del Jefe Directo y validación de RH.' },
            { name: 'Justificantes Médicos', desc: 'Aprobación automática al subir documento PDF (Sujeto a auditoría).' },
            { name: 'Solicitud de EPP', desc: 'Notifica a almacén/operaciones para entrega física.' }
          ].map((flow, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-2xl hover:border-primary/30 transition-colors">
              <div>
                <p className="font-black text-sm text-gray-900">{flow.name}</p>
                <p className="text-[10px] font-bold text-gray-500 mt-1">{flow.desc}</p>
              </div>
              <button className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20">Modificar Flujo</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
