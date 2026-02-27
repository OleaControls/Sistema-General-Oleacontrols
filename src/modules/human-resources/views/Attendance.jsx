import React, { useState } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle2, Filter, Download, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Attendance() {
  const [filter, setFilter] = useState('ALL');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Asistencia y Faltas</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Control de incidencias, retardos y justificantes médicos.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border text-gray-700 px-5 py-3 rounded-2xl font-bold text-sm hover:border-gray-300 transition-all shadow-sm">
            <Download className="h-4 w-4" /> Exportar a Nómina
          </button>
          <button className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
            <Calendar className="h-4 w-4" /> Registrar Incidencia
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asistencia Hoy</p>
          <p className="text-3xl font-black text-gray-900 mt-2">95%</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Retardos (Semana)</p>
          <p className="text-3xl font-black text-gray-900 mt-2">4</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Faltas Injustificadas</p>
          <p className="text-3xl font-black text-gray-900 mt-2">1</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Incapacidades Activas</p>
          <p className="text-3xl font-black text-gray-900 mt-2">2</p>
        </div>
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
          <div className="flex gap-2">
            {['ALL', 'RETARDOS', 'FALTAS', 'JUSTIFICADAS'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold border transition-all",
                  filter === f ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                )}
              >
                {f === 'ALL' ? 'Todas' : f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-500 bg-white px-3 py-1.5 rounded-xl border">
            <Filter className="h-4 w-4" /> Febrero 2026
          </div>
        </div>
        
        <table className="w-full text-left">
          <thead className="bg-white border-b">
            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Empleado</th>
              <th className="px-6 py-4">Tipo de Incidencia</th>
              <th className="px-6 py-4">Soporte/Justificante</th>
              <th className="px-6 py-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[
              { date: '25 Feb 2026', emp: 'Luis Martínez', type: 'RETARDO', desc: 'Llegada 09:45 AM', doc: null },
              { date: '24 Feb 2026', emp: 'Ana Cruz', type: 'FALTA', desc: 'Injustificada', doc: null },
              { date: '23 Feb 2026', emp: 'Carlos Ruiz', type: 'JUSTIFICADA', desc: 'Cita IMSS', doc: 'Receta Médica.pdf' },
            ].map((inc, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-xs font-bold text-gray-600">{inc.date}</td>
                <td className="px-6 py-4">
                  <p className="font-black text-sm text-gray-900">{inc.emp}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-md uppercase w-fit border",
                    inc.type === 'RETARDO' ? "bg-amber-50 text-amber-700 border-amber-100" :
                    inc.type === 'FALTA' ? "bg-red-50 text-red-700 border-red-100" : "bg-blue-50 text-blue-700 border-blue-100"
                  )}>
                    {inc.type === 'RETARDO' ? <Clock className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    {inc.type}
                  </span>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">{inc.desc}</p>
                </td>
                <td className="px-6 py-4">
                  {inc.doc ? (
                    <button className="flex items-center gap-1 text-[10px] font-black text-primary bg-primary/5 px-2 py-1 rounded border border-primary/20 hover:bg-primary/10 transition-colors">
                      <FileText className="h-3 w-3" /> {inc.doc}
                    </button>
                  ) : (
                    <span className="text-[10px] font-bold text-gray-300 italic">Sin adjuntos</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-[10px] font-black text-gray-400 hover:text-primary uppercase tracking-wider">Detalles</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
