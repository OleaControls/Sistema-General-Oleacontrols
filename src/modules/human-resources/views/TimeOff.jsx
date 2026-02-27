import React, { useState } from 'react';
import { 
  Palmtree, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle,
  Clock,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TimeOff() {
  const [activeTab, setActiveTab] = useState('REQUESTS');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Vacaciones y Ausencias</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Gestiona los balances de días libres y aprueba solicitudes del equipo.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          <Palmtree className="h-4 w-4" />
          Nueva Solicitud Manual
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-8 px-2 overflow-x-auto scrollbar-hide">
        {[
          { id: 'REQUESTS', label: 'Bandeja de Aprobaciones' },
          { id: 'BALANCES', label: 'Bolsas de Vacaciones' },
          { id: 'CALENDAR', label: 'Calendario de Ausencias' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "py-4 border-b-2 font-black text-sm transition-all whitespace-nowrap uppercase tracking-wider",
              activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {activeTab === 'REQUESTS' && (
          <div className="space-y-4">
            {[
              { id: 'REQ-101', emp: 'Luis Martínez', role: 'Técnico', type: 'Vacaciones Anuales', dates: '12 May 2026 - 16 May 2026', days: 5, status: 'PENDING', reason: 'Vacaciones familiares programadas.' },
              { id: 'REQ-102', emp: 'Sofía Reyes', role: 'Ventas', type: 'Permiso Personal (Con goce)', dates: '26 Feb 2026', days: 1, status: 'PENDING', reason: 'Trámite notarial urgente.' },
              { id: 'REQ-100', emp: 'Gabriel Tech', role: 'Técnico', type: 'Vacaciones', dates: '01 Feb 2026 - 05 Feb 2026', days: 5, status: 'APPROVED', reason: '' }
            ].map((req) => (
              <div key={req.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-primary/30 transition-colors group">
                <div className="flex items-start gap-4 flex-1">
                  <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center font-black text-lg text-gray-400 border group-hover:bg-primary/5 group-hover:text-primary transition-all">
                    {req.emp.charAt(0)}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-gray-900 text-lg leading-none">{req.emp}</h4>
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider",
                        req.status === 'PENDING' ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                      )}>
                        {req.status === 'PENDING' ? 'Pendiente' : 'Aprobado'}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{req.role} • {req.id}</p>
                    
                    <div className="flex flex-wrap gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                        <Palmtree className="h-3.5 w-3.5 text-primary" />
                        {req.type}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                        <CalendarIcon className="h-3.5 w-3.5 text-gray-400" />
                        {req.dates} ({req.days} días)
                      </div>
                    </div>
                    {req.reason && <p className="text-xs text-gray-500 font-medium italic mt-2">"{req.reason}"</p>}
                  </div>
                </div>

                {req.status === 'PENDING' && (
                  <div className="flex gap-3 md:flex-col lg:flex-row w-full md:w-auto">
                    <button className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-red-100 transition-all border border-red-100">
                      <XCircle className="h-4 w-4" /> Rechazar
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-emerald-100 transition-all border border-emerald-100 shadow-lg shadow-emerald-50">
                      <CheckCircle2 className="h-4 w-4" /> Aprobar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'BALANCES' && (
          <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="Filtrar por empleado o departamento..." className="pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:border-primary w-64" />
              </div>
              <button className="text-xs font-black text-primary uppercase hover:underline">Exportar Excel</button>
            </div>
            <table className="w-full text-left">
              <thead className="bg-white border-b">
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Empleado</th>
                  <th className="px-6 py-4">Antigüedad</th>
                  <th className="px-6 py-4">Días por Ley</th>
                  <th className="px-6 py-4">Disfrutados</th>
                  <th className="px-6 py-4 text-primary">Saldo Disponible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { name: 'Gabriel Tech', role: 'Técnico', years: 3, total: 14, used: 5, balance: 9 },
                  { name: 'Ana Admin', role: 'Finanzas', years: 4, total: 16, used: 16, balance: 0 },
                  { name: 'Luis Martínez', role: 'Técnico', years: 1, total: 12, used: 0, balance: 12 },
                ].map((emp, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-black text-sm text-gray-900">{emp.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{emp.role}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-600">{emp.years} Años</td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-600">{emp.total}</td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-600">{emp.used}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "font-black text-sm px-3 py-1 rounded-lg",
                        emp.balance > 0 ? "bg-green-100 text-green-700" : "bg-red-50 text-red-600"
                      )}>{emp.balance} Días</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'CALENDAR' && (
          <div className="bg-white border rounded-3xl p-12 text-center border-dashed flex flex-col items-center justify-center text-gray-400 gap-4">
            <CalendarIcon className="h-12 w-12 opacity-50" />
            <p className="font-bold italic">Vista de calendario mensual con barras de colores (Próximamente)</p>
          </div>
        )}
      </div>
    </div>
  );
}
