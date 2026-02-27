import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Search, 
  Filter, 
  MoreHorizontal,
  ArrowUpDown,
  AlertCircle,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { expenseService } from '@/api/expenseService';
import { cn } from '@/lib/utils';

export default function ApprovalsList() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    loadPendingExpenses();
    
    // Simulación de tiempo real: Polling cada 5 segundos
    const interval = setInterval(() => {
      checkForNewExpenses();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadPendingExpenses = async () => {
    setLoading(true);
    const data = await expenseService.getAll();
    setExpenses(data.filter(e => e.status === 'SUBMITTED'));
    setLoading(false);
    setNewCount(0);
  };

  const checkForNewExpenses = async () => {
    const data = await expenseService.getAll();
    const pending = data.filter(e => e.status === 'SUBMITTED');
    
    // Si hay más gastos de los que tenemos actualmente, notificamos
    if (pending.length > expenses.length) {
      setNewCount(pending.length - expenses.length);
      // Actualizamos la lista automáticamente para el tiempo real
      setExpenses(pending);
    }
  };

  const handleAction = async (id, status) => {
    const comment = status === 'APPROVED' ? 'Aprobado por operaciones' : 'Rechazado: Documentación incompleta';
    await expenseService.updateStatus(id, status, comment);
    loadPendingExpenses();
  };

  const filtered = expenses.filter(e => 
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.otId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <h2 className="text-2xl font-black text-gray-900 leading-none">Aprobaciones En Vivo</h2>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Sincronizado en tiempo real</p>
            </div>
          </div>
          {newCount > 0 && (
            <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black animate-bounce">
              +{newCount} NUEVOS
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm">
            <Search className="h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por OT, ID o descripción..."
              className="outline-none text-sm w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Técnico / Fecha</th>
                <th className="px-6 py-4">Detalles del Gasto</th>
                <th className="px-6 py-4">Evidencia</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">Cargando solicitudes...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">No hay gastos pendientes de aprobación.</td></tr>
              ) : filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {exp.userId?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 uppercase">{exp.userId}</p>
                        <p className="text-[10px] text-gray-500">{exp.date}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-gray-900">{exp.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-600 uppercase">{exp.category}</span>
                      <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">#{exp.otId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedImage('https://images.unsplash.com/photo-1554224155-1696413565d3?auto=format&fit=crop&q=80&w=200')}
                      className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border hover:border-primary transition-all group/btn"
                    >
                      <ImageIcon className="h-4 w-4 text-gray-400 group-hover/btn:text-primary" />
                      <span className="text-[10px] font-black text-gray-500 group-hover/btn:text-primary uppercase tracking-wider">Ver Ticket</span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-black text-gray-900">${exp.amount.toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">{exp.currency}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleAction(exp.id, 'REJECTED')}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" 
                        title="Rechazar"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleAction(exp.id, 'APPROVED')}
                        className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100 shadow-sm" 
                        title="Aprobar"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Modal Preview */}
      {selectedImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-lg w-full bg-white p-2 rounded-3xl animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
             <button className="absolute -top-12 right-0 text-white font-bold flex items-center gap-2" onClick={() => setSelectedImage(null)}>
               Cerrar <XCircle className="h-6 w-6" />
             </button>
             <img src={selectedImage} alt="Ticket" className="w-full h-auto rounded-2xl" />
             <div className="p-4 text-center">
               <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Evidencia de Gasto - Ticket Original</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
