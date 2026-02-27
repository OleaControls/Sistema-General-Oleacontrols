import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Camera, 
  Receipt, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  User, 
  Calendar,
  FileText,
  ExternalLink,
  Eye
} from 'lucide-react';
import { otService } from '@/api/otService';
import { expenseService } from '@/api/expenseService';
import { cn } from '@/lib/utils';

export default function OTValidation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ot, setOt] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    const allOTs = await otService.getOTs();
    const foundOT = allOTs.find(o => o.id === id);
    setOt(foundOT);

    const allExpenses = await expenseService.getAll();
    const otExpenses = allExpenses.filter(e => e.otId === id);
    setExpenses(otExpenses);
    setLoading(false);
  };

  const handleApprove = async () => {
    await otService.updateStatus(id, 'VALIDATED');
    navigate('/ots');
  };

  if (loading) return <div className="p-10 text-center animate-pulse font-black text-gray-400">CARGANDO AUDITORÍA...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full" />
        <div className="space-y-4 relative z-10">
          <button 
            onClick={() => navigate('/ots')}
            className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-primary transition-colors uppercase tracking-widest"
          >
            <ChevronLeft className="h-4 w-4" /> Volver a OTs
          </button>
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-gray-900 leading-none">Validación de Trabajo: {ot.id}</h2>
            <p className="text-sm font-bold text-gray-500">{ot.title}</p>
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-lg border">
              <User className="h-3.5 w-3.5 text-primary" /> {ot.assignedToName}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-lg border">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Finalizado: 25 Feb 2026
            </div>
          </div>
        </div>

        <div className="flex gap-3 relative z-10">
          <button className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-red-50 text-red-600 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-red-100 transition-all border border-red-100">
            <XCircle className="h-4 w-4" /> Rechazar / Corregir
          </button>
          <button 
            onClick={handleApprove}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
          >
            <CheckCircle2 className="h-4 w-4" /> Validar y Cerrar OT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna Izquierda: Viáticos y Gastos */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2rem] p-8 border shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" /> Viáticos y Reembolsos Adjuntos
              </h3>
              <span className="text-xs font-black text-gray-900">${expenses.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()} MXN</span>
            </div>

            <div className="space-y-4">
              {expenses.length > 0 ? expenses.map((exp) => (
                <div key={exp.id} className="p-5 border rounded-3xl bg-gray-50/50 hover:bg-white transition-all group">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="h-12 w-12 bg-white rounded-2xl border shadow-sm flex items-center justify-center text-primary relative overflow-hidden">
                        {/* Simulación de imagen de ticket */}
                        <div className="absolute inset-0 bg-gray-200 opacity-20" />
                        <FileText className="h-6 w-6 relative z-10" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">{exp.description}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{exp.category} • {exp.date}</p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-black text-gray-900">${exp.amount.toLocaleString()}</p>
                      <button className="flex items-center gap-1 text-[10px] font-black text-primary hover:underline uppercase tracking-tighter">
                        <Eye className="h-3 w-3" /> Ver Ticket
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-center py-10 text-gray-400 font-bold italic text-sm">No hay gastos registrados en esta orden.</p>
              )}
            </div>
          </div>

          {/* Reporte Técnico */}
          <div className="bg-white rounded-[2rem] p-8 border shadow-sm space-y-4">
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Reporte de Ejecución
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed font-medium bg-gray-50 p-6 rounded-2xl border border-dashed">
              "Se realizó la inspección de la Caldera #4. Se detectó una fuga menor en la válvula de alivio primaria, la cual fue sellada con teflón industrial de alta temperatura. Los quemadores fueron limpiados y probados satisfactoriamente."
            </p>
          </div>
        </div>

        {/* Columna Derecha: Evidencias Fotográficas */}
        <div className="space-y-8">
          <div className="bg-white rounded-[2rem] p-8 border shadow-sm space-y-6">
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" /> Evidencia Fotográfica
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-2xl relative overflow-hidden group cursor-pointer border-2 border-transparent hover:border-primary transition-all shadow-sm">
                  {/* Mock de imagen técnica */}
                  <img 
                    src={`https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=200&sig=${i}`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    alt="Evidencia"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="text-white h-6 w-6" />
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full py-3 bg-gray-50 border-2 border-dashed rounded-2xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:border-primary/30 hover:text-primary transition-all">
              Ver Galería Completa (12 fotos)
            </button>
          </div>

          {/* Información Adicional */}
          <div className="bg-white rounded-[2rem] p-8 border shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ubicación de Cierre</p>
                <p className="text-xs font-bold text-gray-900 italic">"Confirmado vía GPS en Planta Industrial Norte"</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
