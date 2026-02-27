import React, { useState } from 'react';
import { 
  ClipboardList, 
  MapPin, 
  Clock, 
  User, 
  CheckCircle2, 
  MessageSquare, 
  Receipt,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ExpensesList from '@/modules/expenses/views/ExpensesList';

const TABS = [
  { id: 'INFO', label: 'Detalles', icon: FileText },
  { id: 'EXPENSES', label: 'Gastos', icon: Receipt },
  { id: 'LOG', label: 'Bitácora', icon: MessageSquare },
];

export default function OTDetail() {
  const [activeTab, setActiveTab] = useState('INFO');
  
  // Mock de una OT
  const ot = {
    id: "OT-998",
    title: "Mantenimiento Preventivo Caldera #4",
    client: "Planta Industrial Norte",
    location: "Querétaro, MX",
    status: "IN_PROGRESS",
    priority: "HIGH",
    assignedTo: "Técnico Gabriel",
    startDate: "2026-02-25 09:00",
    description: "Revisión de válvulas de seguridad y limpieza de quemadores principales."
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header OT */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-widest">
                {ot.id}
              </span>
              <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full uppercase">
                Prioridad Alta
              </span>
            </div>
            <h2 className="text-2xl font-black text-gray-900">{ot.title}</h2>
            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                <MapPin className="h-4 w-4 text-primary" />
                {ot.client} • {ot.location}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
                <Clock className="h-4 w-4 text-primary" />
                Iniciada: {ot.startDate}
              </div>
            </div>
          </div>
          <button className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-100">
            <CheckCircle2 className="h-5 w-5" />
            Finalizar Trabajo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b gap-8 px-2 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 py-4 border-b-2 font-bold text-sm transition-all whitespace-nowrap",
              activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'INFO' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white border rounded-2xl p-6 shadow-sm">
                <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest mb-4">Descripción del Trabajo</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{ot.description}</p>
              </div>
              <div className="bg-white border rounded-2xl p-6 shadow-sm">
                <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest mb-4">Checklist de Seguridad</h3>
                <div className="space-y-3">
                  {['Uso de EPP completo', 'Bloqueo de energía LOTO', 'Permiso de trabajo en caliente'].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="h-5 w-5 rounded border-2 border-primary flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm font-bold text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white border rounded-2xl p-6 shadow-sm">
                <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest mb-4">Equipo Asignado</h3>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black">G</div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{ot.assignedTo}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Líder de Cuadrilla</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'EXPENSES' && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <ExpensesList />
          </div>
        )}

        {activeTab === 'LOG' && (
          <div className="bg-white border rounded-2xl p-12 text-center text-gray-400 italic animate-in fade-in">
            Próximamente: Historial de mensajes y fotos de avance.
          </div>
        )}
      </div>
    </div>
  );
}
