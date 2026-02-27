import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  Download, 
  ArrowUpDown, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText
} from 'lucide-react';
import { expenseService } from '@/api/expenseService';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function OperationsExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const navigate = useNavigate();

  useEffect(() => {
    loadAllExpenses();
  }, []);

  const loadAllExpenses = async () => {
    setLoading(true);
    const data = await expenseService.getAll();
    setExpenses(data);
    setLoading(false);
  };

  const filtered = expenses.filter(e => {
    const matchesSearch = 
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.otId && e.otId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      e.userId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalApproved: expenses.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + e.amount, 0),
    pendingAmount: expenses.filter(e => e.status === 'SUBMITTED').reduce((sum, e) => sum + e.amount, 0),
    approvedCount: expenses.filter(e => e.status === 'APPROVED').length
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Control de Gastos Operativos</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Historial y conciliación de viáticos aprobados en campo.</p>
        </div>
        <div className="flex gap-2">
           <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm">
             <Download className="h-4 w-4" /> Exportar Reporte
           </button>
        </div>
      </div>

      {/* Mini Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-xl shadow-emerald-200">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-white/20 p-2 rounded-xl"><DollarSign className="h-5 w-5" /></div>
            <TrendingUp className="h-5 w-5 opacity-50" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Inversión Aprobada</p>
          <p className="text-3xl font-black mt-1">${stats.totalApproved.toLocaleString()}</p>
          <p className="text-[10px] font-bold mt-2 bg-white/10 w-fit px-2 py-1 rounded-lg">MXN Consolidados</p>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Por Dictaminar</p>
          <p className="text-2xl font-black text-gray-900">${stats.pendingAmount.toLocaleString()}</p>
          <div className="h-1.5 w-full bg-gray-50 rounded-full mt-4 overflow-hidden">
             <div className="h-full bg-blue-500 w-[40%] rounded-full" />
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Aprobaciones Exitosas</p>
          <p className="text-2xl font-black text-gray-900">{stats.approvedCount}</p>
          <p className="text-[10px] font-bold text-emerald-500 mt-2 flex items-center gap-1 uppercase">
            <CheckCircle2 className="h-3 w-3" /> Sin incidencias reportadas
          </p>
        </div>
      </div>

      <div className="bg-white border rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b bg-gray-50/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por ID, Técnico, OT o Descripción..." 
              className="w-full pl-12 pr-4 py-3 bg-white border rounded-2xl outline-none focus:border-primary font-bold text-sm shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {['ALL', 'APPROVED', 'SUBMITTED', 'REJECTED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                  statusFilter === s 
                    ? "bg-gray-900 text-white border-gray-900 shadow-lg" 
                    : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
                )}
              >
                {s === 'ALL' ? 'Todos' : s === 'SUBMITTED' ? 'Pendientes' : s}
              </button>
            ))}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white border-b">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-5">Referencia / Fecha</th>
                <th className="px-6 py-5">Técnico Responsable</th>
                <th className="px-6 py-5">Concepto del Gasto</th>
                <th className="px-6 py-5 text-right">Monto</th>
                <th className="px-6 py-5">Estado</th>
                <th className="px-8 py-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="6" className="px-8 py-20 text-center text-gray-400 italic font-bold">Cargando control de gastos...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="px-8 py-20 text-center text-gray-400 italic font-bold">No se encontraron registros de gastos.</td></tr>
              ) : filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-8 py-5">
                    <p className="font-black text-sm text-gray-900">{exp.id}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {exp.date}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-[10px]">
                        {exp.userId.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-gray-700 uppercase">{exp.userId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-gray-900 leading-tight">{exp.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">#{exp.otId}</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">{exp.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-sm font-black text-gray-900">${exp.amount.toLocaleString()}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">{exp.currency}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border",
                      exp.status === 'APPROVED' ? "bg-green-50 text-green-700 border-green-100" :
                      exp.status === 'SUBMITTED' ? "bg-blue-50 text-blue-700 border-blue-100" :
                      exp.status === 'REJECTED' ? "bg-red-50 text-red-700 border-red-100" : "bg-gray-50 text-gray-400 border-gray-100"
                    )}>
                      {exp.status === 'SUBMITTED' ? 'PENDIENTE' : exp.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/ots/${exp.otId}`)}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                        title="Ver OT relacionada"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
