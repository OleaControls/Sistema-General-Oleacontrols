import React, { useState, useEffect } from 'react';
import { 
  Receipt, Search, Filter, Download, ArrowUpDown, CheckCircle2, XCircle, Clock, 
  ChevronRight, MapPin, Calendar, DollarSign, TrendingUp, FileText, MessageSquare,
  PieChart, BarChart3, Users, Wallet, AlertCircle, Fuel, Utensils, Home, Settings, Package, MoreHorizontal
} from 'lucide-react';
import { expenseService } from '@/api/expenseService';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CATEGORY_ICONS = {
    'COMBUSTIBLE': { icon: Fuel, color: 'text-orange-500', bg: 'bg-orange-50' },
    'ALIMENTOS': { icon: Utensils, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    'HOSPEDAJE': { icon: Home, color: 'text-blue-500', bg: 'bg-blue-50' },
    'REFACCIONES': { icon: Settings, color: 'text-purple-500', bg: 'bg-purple-50' },
    'OTROS': { icon: Package, color: 'text-gray-500', bg: 'bg-gray-50' }
};

export default function OperationsExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showDashboard, setShowDashboard] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAllExpenses();
  }, []);

  const loadAllExpenses = async () => {
    setLoading(true);
    try {
        const data = await expenseService.getAll();
        setExpenses(data);
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  const handleExportPDF = () => {
    try {
        const doc = new jsPDF();
        const tableColumn = ["Fecha", "Técnico", "Concepto", "OT", "Categoría", "Monto", "Estado"];
        const tableRows = [];

        if (filtered.length === 0) {
            alert("No hay datos en la tabla para exportar con los filtros actuales.");
            return;
        }

        filtered.forEach(exp => {
          const expenseData = [
            new Date(exp.createdAt).toLocaleDateString(),
            exp.employee?.name || 'N/A',
            exp.description || 'Sin descripción',
            exp.otId || 'N/A',
            exp.category || 'N/A',
            `$${exp.amount.toLocaleString()}`,
            exp.status
          ];
          tableRows.push(expenseData);
        });

        doc.setFontSize(18);
        doc.text("Reporte de Gastos Operativos - Olea Controls", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 30);
        doc.text(`Filtro Estado: ${statusFilter} | Búsqueda: ${searchTerm || 'Todos'}`, 14, 35);

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 45,
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 8 },
          columnStyles: {
            5: { halign: 'right' }
          }
        });

        doc.save(`Reporte_Gastos_${new Date().getTime()}.pdf`);
    } catch (error) {
        console.error("PDF Export Error:", error);
        alert("Ocurrió un error al generar el PDF. Verifica la consola del navegador.");
    }
  };

  // Lógica de Inteligencia de Datos
  const getDashboardStats = () => {
      const approved = expenses.filter(e => e.status === 'APPROVED');
      const total = approved.reduce((sum, e) => sum + e.amount, 0);
      
      // Agrupar por categoría
      const byCategory = approved.reduce((acc, e) => {
          acc[e.category] = (acc[e.category] || 0) + e.amount;
          return acc;
      }, {});

      // Agrupar por técnico (Top Gastadores)
      const byTech = approved.reduce((acc, e) => {
          const name = e.employee?.name || 'Desconocido';
          acc[name] = (acc[name] || 0) + e.amount;
          return acc;
      }, {});

      const sortedTechs = Object.entries(byTech)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      return {
          total,
          count: approved.length,
          avgTicket: approved.length > 0 ? total / approved.length : 0,
          pendingAmount: expenses.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + e.amount, 0),
          byCategory,
          topTechs: sortedTechs
      };
  };

  const stats = getDashboardStats();

  const filtered = expenses.filter(e => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (e.description?.toLowerCase() || '').includes(searchLower) ||
      (e.id?.toLowerCase() || '').includes(searchLower) ||
      (e.otId?.toLowerCase() || '').includes(searchLower) ||
      (e.employee?.name?.toLowerCase() || '').includes(searchLower);
    
    const matchesStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-none tracking-tighter uppercase">Inteligencia de Gastos</h2>
          <p className="text-sm text-gray-500 font-medium mt-2">Monitoreo de inversión operativa y cumplimiento presupuestal.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setShowDashboard(!showDashboard)}
             className={cn(
                 "px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm border",
                 showDashboard ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200"
             )}
           >
             <BarChart3 className="h-4 w-4" /> {showDashboard ? 'Ocultar Dashboard' : 'Ver Dashboard'}
           </button>
           <button 
             onClick={handleExportPDF}
             className="bg-gray-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-black transition-all shadow-lg"
           >
             <Download className="h-4 w-4" /> Exportar PDF
           </button>
        </div>
      </div>

      {/* Real-time Dashboard Section */}
      {showDashboard && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in zoom-in-95 duration-500">
            {/* Main Stats Card */}
            <div className="md:col-span-4 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between h-full">
                <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Inversión Total Aprobada</p>
                    <p className="text-5xl font-black mt-2 tracking-tighter">${stats.total.toLocaleString()}</p>
                    <div className="flex items-center gap-2 mt-4 text-indigo-200">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Consolidado Mensual</span>
                    </div>
                </div>
                <div className="relative z-10 grid grid-cols-2 gap-4 mt-10 pt-6 border-t border-white/10">
                    <div>
                        <p className="text-[9px] font-black uppercase opacity-50 tracking-widest">Ticket Promedio</p>
                        <p className="text-xl font-black">${stats.avgTicket.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-black uppercase opacity-50 tracking-widest">En Cola (Pendiente)</p>
                        <p className="text-xl font-black text-amber-400">${stats.pendingAmount.toLocaleString()}</p>
                    </div>
                </div>
                <Wallet className="absolute right-[-20px] bottom-[-20px] h-48 w-48 opacity-10 rotate-12" />
            </div>

            {/* Expenses by Category Widget */}
            <div className="md:col-span-4 bg-white border rounded-[2.5rem] p-8 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <PieChart className="h-4 w-4 text-primary" /> Uso por Categoría
                    </h3>
                </div>
                <div className="space-y-4">
                    {Object.entries(stats.byCategory).map(([cat, amount]) => {
                        const config = CATEGORY_ICONS[cat] || CATEGORY_ICONS['OTROS'];
                        const percent = stats.total > 0 ? (amount / stats.total) * 100 : 0;
                        return (
                            <div key={cat} className="space-y-1.5">
                                <div className="flex justify-between items-end">
                                    <div className="flex items-center gap-2">
                                        <div className={cn("p-1.5 rounded-lg", config.bg)}>
                                            <config.icon className={cn("h-3.5 w-3.5", config.color)} />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-700 uppercase">{cat}</span>
                                    </div>
                                    <span className="text-xs font-black text-gray-900">${amount.toLocaleString()}</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full transition-all duration-1000", config.color.replace('text', 'bg'))} style={{ width: `${percent}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Top Technicians Widget */}
            <div className="md:col-span-4 bg-white border rounded-[2.5rem] p-8 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" /> Top Consumo Técnico
                    </h3>
                </div>
                <div className="space-y-4">
                    {stats.topTechs.map(([name, amount], i) => (
                        <div key={name} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs shadow-md">
                                    {i + 1}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-900 uppercase leading-none">{name}</p>
                                    <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Líder de Cuadrilla</p>
                                </div>
                            </div>
                            <p className="text-sm font-black text-gray-900">${amount.toLocaleString()}</p>
                        </div>
                    ))}
                    {stats.topTechs.length === 0 && <p className="text-center py-10 text-gray-400 italic font-bold">Sin datos suficientes</p>}
                </div>
            </div>
        </div>
      )}

      {/* List Section */}
      <div className="bg-white border rounded-[2.5rem] overflow-hidden shadow-sm animate-in slide-in-from-bottom-4 duration-700">
        <div className="p-6 border-b bg-gray-50/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Filtro rápido: técnico, OT o concepto..." 
              className="w-full pl-12 pr-4 py-3 bg-white border rounded-2xl outline-none focus:border-primary font-bold text-sm shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide pb-1 md:pb-0">
            {['ALL', 'APPROVED', 'REJECTED', 'PENDING'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
                  statusFilter === s 
                    ? "bg-gray-900 text-white border-gray-900 shadow-lg" 
                    : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
                )}
              >
                {s === 'ALL' ? 'Historial Total' : s === 'APPROVED' ? 'Aprobados' : s === 'REJECTED' ? 'Rechazados' : 'Pendientes'}
              </button>
            ))}
          </div>
        </div>
        
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-white border-b">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-5">Técnico / Fecha</th>
                <th className="px-6 py-5">Concepto / OT</th>
                <th className="px-6 py-5">Observaciones</th>
                <th className="px-6 py-5 text-right">Monto</th>
                <th className="px-6 py-5">Estado</th>
                <th className="px-8 py-5 text-right">Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan="6" className="px-8 py-20 text-center text-gray-400 italic font-bold animate-pulse uppercase tracking-[0.2em]">Sincronizando Historial de Gastos...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="px-8 py-20 text-center text-gray-400 italic font-bold uppercase text-xs">No se encontraron registros.</td></tr>
              ) : filtered.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xs uppercase">
                        {exp.employee?.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 uppercase leading-none">{exp.employee?.name || 'Técnico'}</p>
                        <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{new Date(exp.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-gray-900 leading-tight">{exp.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10 tracking-widest">
                        #{exp.otId}
                      </span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{exp.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {exp.comment ? (
                        <div className="flex items-start gap-2 max-w-[200px]">
                            <MessageSquare className="h-3 w-3 text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-medium text-gray-500 italic leading-relaxed">"{exp.comment}"</p>
                        </div>
                    ) : (
                        <span className="text-[9px] font-bold text-gray-300 uppercase italic">Sin observaciones</span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <p className="text-sm font-black text-gray-900">${exp.amount.toLocaleString()}</p>
                    <p className="text-[9px] text-gray-400 font-black tracking-widest">MXN</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border",
                      exp.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      exp.status === 'PENDING' ? "bg-blue-50 text-blue-700 border-blue-100" :
                      exp.status === 'REJECTED' ? "bg-red-50 text-red-700 border-red-100" : "bg-gray-100 text-gray-600 border-gray-200"
                    )}>
                      {exp.status === 'APPROVED' ? 'Aprobado' : exp.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/ots/${exp.workOrder?.id || exp.otId}`)}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                        title="Ver Orden Relacionada"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button 
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                        title="Ver Evidencia"
                      >
                        <Receipt className="h-4 w-4" />
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
