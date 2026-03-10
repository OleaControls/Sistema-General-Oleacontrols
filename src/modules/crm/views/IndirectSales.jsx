import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, CheckCircle2, X, Clock, 
  FileText, Download, Target, Briefcase
} from 'lucide-react';
import { useAuth } from '@/store/AuthContext';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function IndirectSales() {
  const { user } = useAuth();
  const [mySales, setMySales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMySales = async () => {
      try {
        const res = await fetch('/api/quotes');
        const data = await res.json();
        const filtered = data.filter(q => q.sellerId === user.id);
        setMySales(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMySales();
  }, [user.id]);

  const stats = {
    total: mySales.length,
    won: mySales.filter(q => q.status === 'ACCEPTED').length,
    pending: mySales.filter(q => q.status === 'PENDING').length,
    totalAmount: mySales.filter(q => q.status === 'ACCEPTED').reduce((acc, curr) => acc + curr.total, 0)
  };

  if (loading) return <div className="p-10 md:p-20 text-center animate-pulse font-black text-gray-400 text-xs tracking-widest uppercase">Analizando ventas...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-20 px-2 md:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Ventas Indirectas</h2>
          <p className="text-gray-500 font-bold text-[10px] md:text-xs mt-1 uppercase tracking-widest flex items-center gap-2">
            <Briefcase className="h-3 w-3 md:h-4 md:w-4 text-primary" /> Mi historial comercial
          </p>
        </div>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-sm space-y-1 md:space-y-2">
            <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Ganadas</p>
            <p className="text-2xl md:text-3xl font-black text-emerald-600">{stats.won}</p>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-sm space-y-1 md:space-y-2">
            <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">Pendientes</p>
            <p className="text-2xl md:text-3xl font-black text-amber-500">{stats.pending}</p>
        </div>
        <div className="col-span-2 md:col-span-2 bg-gray-900 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-xl space-y-1 md:space-y-2 text-white overflow-hidden relative group">
            <div className="relative z-10">
                <p className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-widest">Monto Cerrado</p>
                <p className="text-2xl md:text-3xl font-black">${stats.totalAmount.toLocaleString()}</p>
            </div>
            <DollarSign className="absolute -right-2 -bottom-2 h-16 w-16 md:h-20 md:w-20 text-white/5 group-hover:scale-110 transition-transform" />
        </div>
      </div>

      {/* Grid de Cotizaciones - Responsive columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {mySales.map((q) => (
          <motion.div key={q.id} className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden">
            <div className="space-y-5 md:space-y-6">
              <div className="flex justify-between items-start">
                <div className={cn("px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border", 
                  q.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                  q.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100')}>
                  {q.status === 'ACCEPTED' ? 'Ganada' : q.status === 'REJECTED' ? 'No Concretada' : 'Pendiente'}
                </div>
                <div className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="h-4 w-4 md:h-5 md:w-5" />
                </div>
              </div>

              <div>
                <p className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest">{q.quoteNumber}</p>
                <h3 className="text-lg md:text-xl font-black text-gray-900 truncate">{q.client.companyName}</h3>
                <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase mt-1 italic">{q.projectName || 'Proyecto General'}</p>
              </div>

              <div className="pt-4 border-t border-gray-50 flex justify-between items-end">
                <div>
                    <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase">Mi Venta</p>
                    <p className="text-xl md:text-2xl font-black text-gray-900">${q.total.toLocaleString()}</p>
                </div>
                {q.pdfUrl && (
                    <button 
                        onClick={() => window.open(q.pdfUrl, '_blank')}
                        className="p-3 md:p-4 bg-gray-100 text-gray-400 rounded-2xl hover:bg-primary hover:text-white transition-all"
                    >
                        <Download className="h-4 w-4 md:h-5 md:w-5" />
                    </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {mySales.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
                <Target className="h-12 w-12 md:h-16 md:w-16 text-gray-100 mx-auto" />
                <p className="text-gray-400 font-bold italic uppercase tracking-widest text-[10px] md:text-xs">Aún no tienes ventas acreditadas.</p>
            </div>
        )}
      </div>
    </div>
  );
}
