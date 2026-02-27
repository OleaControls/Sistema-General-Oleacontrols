import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, UserPlus, Search, Filter, MoreHorizontal, CheckCircle2, Clock, AlertTriangle, Eye, X, Send, Receipt, BarChart3, FileText } from 'lucide-react';
import { otService } from '@/api/otService';
import { cn } from '@/lib/utils';

export default function SupervisorOTs() {
  const [ots, setOts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // ... rest of state
  const [newOT, setNewOT] = useState({
    title: '',
    storeNumber: '',
    storeName: '',
    client: '',
    address: '',
    clientEmail: '',
    clientPhone: '',
    assignedToId: 'user-123',
    assignedToName: 'Gabriel Técnico (Pruebas)',
    workDescription: '',
    arrivalTime: '',
    priority: 'MEDIUM',
    assignedFunds: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await otService.getOTs();
    setOts(data);
    setLoading(false);
  };

  const handleCreateOT = async (e) => {
    e.preventDefault();
    await otService.saveOT(newOT);
    setIsModalOpen(false);
    loadData();
    setNewOT({
      title: '',
      storeNumber: '',
      storeName: '',
      client: '',
      address: '',
      clientEmail: '',
      clientPhone: '',
      assignedToId: 'user-tech-01',
      assignedToName: 'Gabriel Técnico',
      workDescription: '',
      arrivalTime: '',
      priority: 'MEDIUM',
      assignedFunds: 0
    });
  };

  const handleAssign = async (otId) => {
    await otService.assignOT(otId, 'user-123', 'Gabriel Técnico (Pruebas)');
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
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <ClipboardList className="h-4 w-4" /> Nueva Orden (OT)
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900">Crear Nueva OT</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleCreateOT} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Título de la Orden</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                      value={newOT.title}
                      onChange={(e) => setNewOT({...newOT, title: e.target.value})}
                      placeholder="Ej. Mantenimiento de Sensores"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Número de Tienda</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                      value={newOT.storeNumber}
                      onChange={(e) => setNewOT({...newOT, storeNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Nombre de Tienda</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                      value={newOT.storeName}
                      onChange={(e) => setNewOT({...newOT, storeName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Nombre del Cliente</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                      value={newOT.client}
                      onChange={(e) => setNewOT({...newOT, client: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Dirección de Tienda</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                      value={newOT.address}
                      onChange={(e) => setNewOT({...newOT, address: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Correo Electrónico</label>
                    <input 
                      required
                      type="email" 
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                      value={newOT.clientEmail}
                      onChange={(e) => setNewOT({...newOT, clientEmail: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Número de Teléfono</label>
                    <input 
                      required
                      type="tel" 
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                      value={newOT.clientPhone}
                      onChange={(e) => setNewOT({...newOT, clientPhone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Asignar Técnico</label>
                    <select 
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold bg-white"
                      value={newOT.assignedToId}
                      onChange={(e) => setNewOT({...newOT, assignedToId: e.target.value, assignedToName: e.target.options[e.target.selectedIndex].text})}
                    >
                      <option value="user-123">Gabriel Técnico (Pruebas)</option>
                      <option value="user-tech-02">Juan Pérez</option>
                      <option value="user-tech-03">Luis Gómez</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Hora de Llegada</label>
                    <input 
                      required
                      type="time" 
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                      value={newOT.arrivalTime}
                      onChange={(e) => setNewOT({...newOT, arrivalTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Fondo de Mantenimiento</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                      value={newOT.assignedFunds}
                      onChange={(e) => setNewOT({...newOT, assignedFunds: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Prioridad</label>
                    <select 
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold bg-white"
                      value={newOT.priority}
                      onChange={(e) => setNewOT({...newOT, priority: e.target.value})}
                    >
                      <option value="LOW">BAJA</option>
                      <option value="MEDIUM">MEDIA</option>
                      <option value="HIGH">ALTA</option>
                    </select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black uppercase text-gray-400">Trabajos a Realizar</label>
                    <textarea 
                      required
                      rows="3"
                      className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                      value={newOT.workDescription}
                      onChange={(e) => setNewOT({...newOT, workDescription: e.target.value})}
                      placeholder="Describa detalladamente las actividades..."
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                    <Send className="h-4 w-4" /> Crear y Asignar OT
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">En Ejecución / Asignadas</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{ots.filter(o => ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(o.status)).length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Sin Asignar</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{ots.filter(o => o.status === 'UNASSIGNED').length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm border-blue-100">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Terminadas / Por Validar</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{ots.filter(o => o.status === 'COMPLETED').length}</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Control de Gastos</p>
          <div className="flex gap-2 mt-2">
             <button 
               onClick={() => navigate('/ops/expenses/control')} 
               className="bg-emerald-600 p-2.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 flex items-center gap-2"
             >
               <Receipt className="h-4 w-4" /> Ver Listado
             </button>
             <button 
               onClick={() => navigate('/expenses/dashboard')} 
               className="bg-white p-2.5 rounded-xl border border-emerald-100 text-emerald-600 hover:shadow-md transition-all shadow-sm"
               title="Dashboard de Gastos"
             >
               <BarChart3 className="h-4 w-4" />
             </button>
          </div>
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
                      <>
                        <button 
                          onClick={() => navigate(`/ops/ots/delivery-act/${ot.id}`)}
                          className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 border border-emerald-100 shadow-sm"
                        >
                          <FileText className="h-3.5 w-3.5" /> Acta
                        </button>
                        <button 
                          onClick={() => navigate(`/ops/ots/validate/${ot.id}`)}
                          className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-blue-100 border border-blue-100 shadow-sm"
                        >
                          <Eye className="h-3.5 w-3.5" /> Revisar
                        </button>
                      </>
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
