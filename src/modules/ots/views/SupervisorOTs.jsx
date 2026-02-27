import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, UserPlus, Search, Filter, MoreHorizontal, CheckCircle2, Clock, AlertTriangle, Eye } from 'lucide-react';
import { otService } from '@/api/otService';
import { cn } from '@/lib/utils';

export default function SupervisorOTs() {
  const [ots, setOts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await otService.getOTs();
    setOts(data);
    setLoading(false);
  };

  const handleAssign = async (otId) => {
    await otService.assignOT(otId, 'user-tech-01', 'Gabriel Técnico');
    loadData();
  };

  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Control de Operaciones</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Monitorea y asigna órdenes de trabajo a la cuadrilla técnica.</p>
        </div>
        <button className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          <ClipboardList className="h-4 w-4" /> Nueva Orden (OT)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">En Ejecución</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{ots.filter(o => o.status === 'IN_PROGRESS').length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Sin Asignar</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{ots.filter(o => o.status === 'UNASSIGNED').length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm border-blue-100">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Pendientes Validación</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{ots.filter(o => o.status === 'COMPLETED').length}</p>
        </div>
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar OT, cliente o técnico..." className="pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:border-primary w-64" />
          </div>
        </div>
        
        <table className="w-full text-left">
          <thead className="bg-white border-b">
            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-6 py-4">ID / Prioridad</th>
              <th className="px-6 py-4">Servicio / Cliente</th>
              <th className="px-6 py-4">Técnico Asignado</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ots.map((ot) => (
              <tr key={ot.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-black text-sm text-gray-900">{ot.id}</p>
                  <span className={cn(
                    "text-[8px] font-black px-1.5 py-0.5 rounded uppercase",
                    ot.priority === 'HIGH' ? "bg-red-50 text-red-600 border border-red-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                  )}>{ot.priority}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-sm text-gray-700 leading-tight">{ot.title}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{ot.client}</p>
                </td>
                <td className="px-6 py-4 text-sm font-bold">
                  {ot.assignedToName ? (
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">{ot.assignedToName.charAt(0)}</div>
                      {ot.assignedToName}
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleAssign(ot.id)}
                      className="text-primary hover:underline text-xs flex items-center gap-1 font-black uppercase tracking-wider"
                    >
                      <UserPlus className="h-3 w-3" /> Asignar Técnico
                    </button>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider border",
                    ot.status === 'VALIDATED' ? "bg-green-50 text-green-700 border-green-100" :
                    ot.status === 'COMPLETED' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-gray-100 text-gray-600 border-gray-200"
                  )}>
                    {ot.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    {ot.status === 'COMPLETED' && (
                      <button 
                        onClick={() => navigate(`/ops/ots/validate/${ot.id}`)}
                        className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-blue-100 border border-blue-100 shadow-sm"
                      >
                        <Eye className="h-3.5 w-3.5" /> Revisar y Validar
                      </button>
                    )}
                    <button className="text-gray-400 hover:text-gray-900 p-1.5 rounded-lg border bg-white shadow-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
