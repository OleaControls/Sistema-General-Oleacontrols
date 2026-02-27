import React, { useState } from 'react';
import { HardHat, Laptop, Wrench, Search, Plus, Filter, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Assets() {
  const [filter, setFilter] = useState('ALL');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Activos y EPP</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Gestión de inventario asignado y Equipo de Protección Personal.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
            <Plus className="h-4 w-4" /> Asignar Activo
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
          <div className="flex gap-2">
            {['ALL', 'Laptops', 'EPP', 'Vehículos'].map(f => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold border transition-all",
                  filter === f ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                )}
              >
                {f === 'ALL' ? 'Todos' : f}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar por serie o empleado..." className="pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:border-primary w-64" />
          </div>
        </div>
        
        <table className="w-full text-left">
          <thead className="bg-white border-b">
            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-6 py-4">ID Activo</th>
              <th className="px-6 py-4">Descripción</th>
              <th className="px-6 py-4">Asignado A</th>
              <th className="px-6 py-4">Estado / Condición</th>
              <th className="px-6 py-4 text-right">Responsiva</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[
              { id: 'LAP-045', name: 'MacBook Pro M3', type: 'laptop', assigned: 'Gabriel Tech', status: 'NUEVO' },
              { id: 'EPP-992', name: 'Arnés de Seguridad V2', type: 'epp', assigned: 'Luis Martínez', status: 'BUENO' },
              { id: 'VEH-002', name: 'Camioneta Ford Ranger (Placas: YU-998)', type: 'car', assigned: 'Equipo Querétaro', status: 'MANTENIMIENTO' },
            ].map((asset, i) => (
              <tr key={i} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-black text-sm text-gray-900">{asset.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {asset.type === 'laptop' ? <Laptop className="h-4 w-4 text-gray-400" /> : 
                     asset.type === 'epp' ? <HardHat className="h-4 w-4 text-gray-400" /> : <Wrench className="h-4 w-4 text-gray-400" />}
                    <span className="font-bold text-gray-700 text-sm">{asset.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-primary">{asset.assigned}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider",
                    asset.status === 'NUEVO' ? "bg-green-100 text-green-700" :
                    asset.status === 'BUENO' ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                  )}>{asset.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="flex items-center gap-1 justify-end w-full text-[10px] font-black text-gray-400 hover:text-primary uppercase tracking-wider">
                    <FileText className="h-3 w-3" /> Firmada
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
