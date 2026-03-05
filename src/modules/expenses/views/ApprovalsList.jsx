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
  Image as ImageIcon,
  FileText,
  Loader2
} from 'lucide-react';
import { expenseService } from '@/api/expenseService';
import { otService } from '@/api/otService';
import { cn } from '@/lib/utils';

export default function ApprovalsList() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    loadPendingExpenses();
    const interval = setInterval(checkForNewExpenses, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingExpenses = async () => {
    setLoading(true);
    try {
        const data = await expenseService.getAll({ status: 'PENDING' });
        const enriched = await Promise.all(data.map(async e => {
          const financials = await otService.getOTFinancials(e.otId);
          return { ...e, financials };
        }));
        setExpenses(enriched);
    } catch (error) {
        console.error("Error:", error);
    } finally {
        setLoading(false);
        setNewCount(0);
    }
  };

  const checkForNewExpenses = async () => {
    try {
        const data = await expenseService.getAll({ status: 'PENDING' });
        if (data.length > expenses.length) setNewCount(data.length - expenses.length);
    } catch (err) {}
  };

  const handleAction = async (exp, status) => {
    setProcessingId(exp.id);
    try {
        const comment = status === 'APPROVED' ? 'Aprobado' : 'Rechazado';
        
        // 1. Actualizar el estado del gasto
        await expenseService.updateStatus(exp.id, status, comment);

        // 2. Si es aprobado y excede fondo, inyectamos el excedente (opcional según política)
        if (status === 'APPROVED' && exp.financials?.isOverLimit) {
          await otService.addSupplementalFunds(exp.otId, exp.amount);
        }

        // 3. Recargar lista
        await loadPendingExpenses();
    } catch (error) {
        alert("Error al procesar: " + error.message);
    } finally {
        setProcessingId(null);
    }
  };

  const filtered = expenses.filter(e => {
    const searchLower = searchTerm.toLowerCase();
    return (
        (e.description?.toLowerCase() || '').includes(searchLower) ||
        (e.otId?.toLowerCase() || '').includes(searchLower) ||
        (e.employee?.name?.toLowerCase() || '').includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h2 className="text-2xl font-black text-gray-900 leading-none uppercase tracking-tighter">Control de Aprobaciones</h2>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">En vivo • {expenses.length} pendientes</p>
            </div>
        </div>
        
        <div className="flex items-center gap-3">
          {newCount > 0 && (
            <button onClick={loadPendingExpenses} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black animate-bounce shadow-lg flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5" /> RECARGAR {newCount} NUEVOS
            </button>
          )}
          <div className="bg-white border rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-sm focus-within:border-primary transition-colors">
            <Search className="h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar técnico o folio..."
              className="outline-none text-sm w-48 md:w-64 font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Técnico Responsable</th>
                <th className="px-6 py-5">Concepto y Orden</th>
                <th className="px-6 py-5">Evidencia</th>
                <th className="px-6 py-5 text-right">Monto</th>
                <th className="px-8 py-5 text-right">Dictamen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="5" className="px-8 py-20 text-center text-gray-400 italic font-bold">Sincronizando con el servidor...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="px-8 py-24 text-center space-y-4">
                    <CheckCircle2 className="h-12 w-12 text-emerald-100 mx-auto" />
                    <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Todo al día. No hay gastos por aprobar.</p>
                </td></tr>
              ) : filtered.map((exp) => (
                <tr key={exp.id} className={cn("hover:bg-gray-50/50 transition-colors", processingId === exp.id && "opacity-50 pointer-events-none bg-gray-50")}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">
                        {exp.employee?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 uppercase">{exp.employee?.name || 'Técnico'}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{new Date(exp.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-gray-700 leading-tight">{exp.description}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="text-[9px] font-black bg-gray-100 px-2 py-0.5 rounded text-gray-500 uppercase">{exp.category}</span>
                      <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">#{exp.otId}</span>
                      {exp.financials?.isOverLimit && (
                        <span className="text-[8px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 animate-pulse uppercase">
                          <AlertCircle className="h-2.5 w-2.5 inline mr-1" /> Excede Saldo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {exp.receipt ? (
                        <button 
                          onClick={() => setSelectedImage(exp.receipt)}
                          className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200 hover:border-primary transition-all shadow-sm group"
                        >
                          <ImageIcon className="h-4 w-4 text-gray-400 group-hover:text-primary" />
                          <span className="text-[10px] font-black text-gray-500 group-hover:text-primary uppercase">Ver Ticket</span>
                        </button>
                    ) : (
                        <span className="text-[10px] font-bold text-gray-300 uppercase italic">Sin recibo</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className={cn("text-lg font-black", exp.financials?.isOverLimit ? "text-red-600" : "text-gray-900")}>
                      ${exp.amount.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-gray-400 uppercase font-black">MXN</p>
                  </td>
                  <td className="px-8 py-5 text-right">
                    {processingId === exp.id ? (
                        <div className="flex justify-end pr-4">
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                        </div>
                    ) : (
                        <div className="flex items-center justify-end gap-3">
                            <button 
                                onClick={() => handleAction(exp, 'REJECTED')}
                                className="p-3 bg-white text-red-500 border border-gray-100 rounded-2xl hover:bg-red-50 hover:border-red-100 transition-all shadow-sm"
                            >
                                <XCircle className="h-6 w-6" />
                            </button>
                            <button 
                                onClick={() => handleAction(exp, 'APPROVED')}
                                className="p-3 bg-gray-900 text-white rounded-2xl hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
                            >
                                <CheckCircle2 className="h-6 w-6" />
                            </button>
                        </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Vista Previa (Recibo) */}
      {selectedImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-2xl w-full bg-white p-2 rounded-[2.5rem] animate-in zoom-in duration-300 shadow-2xl" onClick={e => e.stopPropagation()}>
             <button className="absolute -top-12 right-0 text-white font-black text-xs uppercase tracking-widest flex items-center gap-2 bg-white/10 px-6 py-2.5 rounded-full hover:bg-white/20 transition-all" onClick={() => setSelectedImage(null)}>
               Cerrar Vista <XCircle className="h-5 w-5" />
             </button>
             <div className="max-h-[75vh] overflow-auto rounded-[2rem] border-4 border-gray-50">
                {selectedImage.startsWith('data:application/pdf') ? (
                    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                        <FileText className="h-24 w-24 mb-6" />
                        <p className="font-black text-sm uppercase tracking-widest">Documento PDF Cargado</p>
                        <a href={selectedImage} download="recibo_olea.pdf" className="mt-6 bg-gray-900 text-white px-10 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-primary transition-all">Descargar Recibo</a>
                    </div>
                ) : (
                    <img src={selectedImage} alt="Evidencia de Gasto" className="w-full h-auto" />
                )}
             </div>
             <div className="p-6 text-center">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">Propiedad de Olea Controls • Verificación de Viáticos</p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
