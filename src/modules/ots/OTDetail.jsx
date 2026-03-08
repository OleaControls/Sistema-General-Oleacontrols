import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, MapPin, Clock, User, CheckCircle2, Receipt, FileText, ChevronLeft,
  X, Send, ArrowRight, Store, Map as MapIcon, AlertTriangle, Wallet, Plus, Coins,
  Phone, Mail, Info, Users, Hash, Calendar, Zap, Activity, Timer, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import { otService } from '@/api/otService';
import { expenseService } from '@/api/expenseService';
import { useAuth, ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';
import NewExpenseForm from '../expenses/components/NewExpenseForm';

const PlayCircle = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
);

const TABS = [
  { id: 'INFO', label: 'Hoja de Servicio', icon: FileText },
  { id: 'ACTIONS', label: 'Ejecución', icon: Activity },
  { id: 'EXPENSES', label: 'Viáticos', icon: Receipt },
];

export default function OTDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ot, setOt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('INFO');
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isFundsModalOpen, setIsFundsModalOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [additionalFunds, setAdditionalFunds] = useState(0);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  
  const isLead = ot?.technicianId === user?.id;
  const isSupervisor = user?.role === ROLES.OPS || user?.role === ROLES.ADMIN;
  const isCompleted = ot?.status === 'COMPLETED';

  const [finishData, setFinishData] = useState({
    report: '',
    signature: null
  });

  useEffect(() => {
    loadOT();
  }, [id]);

  useEffect(() => {
    let interval;
    if (ot?.status === 'IN_PROGRESS' && ot?.startedAt) {
        interval = setInterval(() => {
            const start = new Date(ot.startedAt).getTime();
            const now = new Date().getTime();
            const diff = now - start;
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setElapsedTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [ot]);

  const loadOT = async () => {
    setLoading(true);
    try {
        const data = await otService.getOTDetail(id);
        setOt(data);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  // Cálculos Financieros
  const financialSummary = () => {
      if (!ot || !ot.expenses) return { totalAuthorized: 0, spent: 0, balance: 0 };
      
      const totalAuthorized = ot.assignedFunds || 0;
      // Solo descontamos los aprobados y los que están pendientes (bloquean fondo)
      // Los RECHAZADOS no se cuentan, lo que efectivamente "devuelve" el dinero al balance
      const spent = ot.expenses
        .filter(e => e.status === 'APPROVED' || e.status === 'PENDING')
        .reduce((sum, e) => sum + e.amount, 0);
        
      return {
          totalAuthorized,
          spent,
          balance: totalAuthorized - spent
      };
  };

  const { totalAuthorized, spent, balance } = financialSummary();

  const handleStatusUpdate = async (newStatus) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
        const update = { status: newStatus };
        if (newStatus === 'IN_PROGRESS') update.startedAt = new Date().toISOString();
        if (newStatus === 'COMPLETED') {
            update.finishedAt = new Date().toISOString();
            update.report = finishData.report;
            update.signature = finishData.signature;
        }
        await otService.updateOT(id, update);
        
        if (newStatus === 'COMPLETED') {
            setIsFinishModalOpen(false);
            // Redirigir al listado después de cerrar para evitar duplicados/confusión
            navigate('/ots');
        } else {
            await loadOT();
        }
    } catch (err) {
        alert("Error al actualizar estado: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddFunds = async () => {
      if (isSaving) return;
      setIsSaving(true);
      try {
          await otService.addSupplementalFunds(id, parseFloat(additionalFunds));
          setIsFundsModalOpen(false);
          setAdditionalFunds(0);
          await loadOT();
      } catch (err) {
          alert("Error al añadir fondos: " + err.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleSaveExpense = async (formData) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
        await expenseService.save({
            ...formData,
            userId: user.id,
            otId: ot.otNumber 
        });
        await loadOT();
    } catch (error) {
        alert("Error al guardar gasto: " + error.message);
    } finally {
        setIsSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-gray-400 italic">Cargando orden...</div>;
  if (!ot) return <div className="p-10 text-center font-bold text-red-400 italic">Orden no encontrada.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Header OT */}
      <div className="bg-white border rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 font-black text-[10px] uppercase mb-6 hover:text-primary transition-colors tracking-widest relative z-10">
          <ChevronLeft className="h-4 w-4" /> Volver al listado
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black bg-gray-900 text-white px-3 py-1 rounded-lg uppercase tracking-widest shadow-md">
                {ot.otNumber}
              </span>
              <span className={cn(
                "text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border shadow-sm",
                ot.priority === 'HIGH' ? "bg-red-50 text-red-600 border-red-100" : "bg-blue-50 text-blue-600 border-blue-100"
              )}>
                Prioridad {ot.priority}
              </span>
              <span className="text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border bg-amber-50 text-amber-700 border-amber-100">
                {isLead ? 'Técnico Líder' : isSupervisor ? 'Modo Supervisor' : 'Consulta'}
              </span>
            </div>
            <h2 className="text-3xl font-black text-gray-900 leading-tight tracking-tighter">{ot.title}</h2>
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <User className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Técnico Responsable</p>
                    <p className="text-sm font-bold text-gray-700 uppercase">{ot.leadTechName || 'Sin asignar'}</p>
                </div>
            </div>
          </div>
        
          <div className="flex flex-col items-end gap-3">
            <span className={cn(
              "text-xs font-black px-6 py-2.5 rounded-2xl uppercase tracking-[0.2em] border shadow-lg transition-all duration-500",
              ot.status === 'COMPLETED' ? "bg-emerald-500 text-white border-emerald-600" :
              ot.status === 'IN_PROGRESS' ? "bg-amber-500 text-white border-amber-600 animate-pulse" :
              "bg-blue-600 text-white border-blue-700"
            )}>
              {ot.status}
            </span>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actualizado: {new Date(ot.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Barra Financiera Dinámica */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mx-2 md:mx-0">
          <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row justify-between items-center relative overflow-hidden group">
              <div className="relative z-10 space-y-6 w-full">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70">Balance Disponible para Viáticos</p>
                    <p className="text-5xl font-black mt-2 tracking-tighter">${balance.toLocaleString()}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                      <div>
                          <p className="text-[9px] font-bold uppercase opacity-60 flex items-center gap-1">
                              <ArrowUpCircle className="h-3 w-3" /> Total Autorizado
                          </p>
                          <p className="text-lg font-black">${totalAuthorized.toLocaleString()}</p>
                      </div>
                      <div>
                          <p className="text-[9px] font-bold uppercase opacity-60 flex items-center gap-1">
                              <ArrowDownCircle className="h-3 w-3" /> Gastos en Proceso
                          </p>
                          <p className="text-lg font-black text-indigo-200">${spent.toLocaleString()}</p>
                      </div>
                  </div>
              </div>
              <Wallet className="hidden md:block h-24 w-24 opacity-10 absolute right-8 bottom-8 transition-transform group-hover:scale-110" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          </div>

          {isSupervisor && (
              <button 
                onClick={() => setIsFundsModalOpen(true)}
                className="bg-white border-2 border-dashed border-indigo-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 hover:bg-indigo-50 transition-all group shadow-sm active:scale-95"
              >
                  <div className="h-14 w-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform shadow-sm">
                      <Plus className="h-8 w-8" strokeWidth={3} />
                  </div>
                  <div className="text-center">
                    <span className="block text-xs font-black uppercase text-indigo-600 tracking-[0.2em]">Inyectar Fondos</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase mt-1">Ampliación de Presupuesto</span>
                  </div>
              </button>
          )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white border rounded-2xl p-1.5 gap-1 sticky top-4 z-30 shadow-2xl mx-2 md:mx-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-3 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-gray-900 text-white shadow-lg scale-[1.02]" 
                : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-2 md:px-0">
        {activeTab === 'INFO' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Main Info Column */}
            <div className="lg:col-span-2 space-y-6">
                {/* Lugar y Cliente */}
                <div className="bg-white border rounded-[2.5rem] p-8 shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                        <Store className="h-5 w-5 text-primary" />
                        <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Información del Cliente y Sitio</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cliente / Empresa</p>
                            <p className="text-lg font-black text-gray-900 uppercase">{ot.clientName}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tienda / Sucursal</p>
                            <div className="flex items-center gap-2">
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-black text-xs">#{ot.storeNumber || 'N/A'}</span>
                                <p className="text-sm font-bold text-gray-700">{ot.storeName || 'Oficina Central'}</p>
                            </div>
                        </div>
                        <div className="md:col-span-2 space-y-3">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Dirección del Servicio</p>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
                                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-gray-800 leading-relaxed">{ot.address}</p>
                                    {ot.secondaryAddress && (
                                        <p className="text-xs text-gray-400 font-medium mt-1">Dir. Secundaria: {ot.secondaryAddress}</p>
                                    )}
                                    {(ot.otAddress || ot.otReference) && (
                                        <p className="text-xs text-gray-500 font-medium mt-2 italic">
                                            Ref: {ot.otAddress} {ot.otReference}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contactos */}
                <div className="bg-blue-50/30 border border-blue-100 rounded-[2.5rem] p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-blue-100 pb-4">
                        <Users className="h-5 w-5 text-blue-600" />
                        <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest">Contactos en Sitio</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-blue-100 shadow-sm">
                            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black">
                                {ot.contactName?.charAt(0) || 'C'}
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase">Persona Encargada</p>
                                <p className="text-sm font-black text-gray-900">{ot.contactName || 'Pendiente de asignar'}</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <a href={`tel:${ot.contactPhone}`} className="flex items-center gap-3 text-xs font-bold text-gray-600 hover:text-primary transition-colors">
                                <Phone className="h-4 w-4" /> {ot.contactPhone || 'Sin teléfono'}
                            </a>
                            <a href={`mailto:${ot.contactEmail}`} className="flex items-center gap-3 text-xs font-bold text-gray-600 hover:text-primary transition-colors">
                                <Mail className="h-4 w-4" /> {ot.contactEmail || 'Sin correo'}
                            </a>
                        </div>
                    </div>
                </div>

                {/* Descripción */}
                <div className="bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent opacity-50" />
                    <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                        <ClipboardList className="h-5 w-5" /> Instrucciones Técnicas
                    </h3>
                    <p className="text-xl font-medium leading-relaxed italic text-gray-200">
                        "{ot.description || 'Sin descripción detallada por el supervisor.'}"
                    </p>
                </div>

                {/* Reporte de Cierre (Si está completada) */}
                {ot.status === 'COMPLETED' && (
                    <div className="bg-emerald-600 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-white/20" />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5" /> Reporte de Finalización
                        </h3>
                        <div className="space-y-6">
                            <p className="text-xl font-medium leading-relaxed italic text-emerald-50">
                                "{ot.deliveryDetails || ot.report || 'El técnico no proporcionó comentarios adicionales al cierre.'}"
                            </p>
                            
                            {ot.deliveryActUrl && (
                                <button 
                                    onClick={() => window.open(ot.deliveryActUrl, '_blank')}
                                    className="w-full bg-white text-emerald-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] transition-all"
                                >
                                    <FileText className="h-4 w-4" /> Descargar Acta Firmada (A.E.R.)
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar Details Column */}
            <div className="space-y-6">
                <div className="bg-white border rounded-[2.5rem] p-8 shadow-sm space-y-6">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b pb-4">Logística</h3>
                    
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase">Fecha Programada</p>
                                <p className="text-sm font-black text-gray-900">
                                    {ot.scheduledDate ? new Date(ot.scheduledDate).toLocaleDateString() : 'Pendiente'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                <Clock className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase">Hora de Llegada</p>
                                <p className="text-sm font-black text-gray-900">{ot.arrivalTime || '00:00'} HRS</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase">Personal de Apoyo</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {(ot.assistantTechs?.length || 0) > 0 ? ot.assistantTechs.map((st, i) => (
                                        <span key={i} className="text-[8px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase border">
                                            {st.name}
                                        </span>
                                    )) : <span className="text-[10px] font-bold text-gray-400 italic">Sin acompañantes</span>}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Hash className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Folio Sistema</p>
                                <p className="text-xs font-bold text-gray-700">{ot.id}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 border-t pt-4 border-gray-50">
                            <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                                <Plus className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Creado por / Fecha</p>
                                <p className="text-xs font-bold text-gray-700">{ot.creatorName || 'Sistema'} • {new Date(ot.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {ot.assignedByName && (
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Send className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Asignado por</p>
                                    <p className="text-xs font-bold text-gray-700">{ot.assignedByName}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white text-center space-y-4 shadow-lg shadow-emerald-100">
                    <Info className="h-8 w-8 mx-auto opacity-50" />
                    <h4 className="text-sm font-black uppercase tracking-widest">¿Dudas con el servicio?</h4>
                    <p className="text-xs font-medium opacity-80">Comunícate directamente con tu supervisor asignado para aclaraciones técnicas.</p>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'ACTIONS' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className={cn(
                "rounded-[3rem] p-1 shadow-2xl transition-all duration-700",
                ot.status === 'IN_PROGRESS' ? "bg-gradient-to-br from-amber-400 via-orange-500 to-amber-600" :
                ot.status === 'COMPLETED' ? "bg-gradient-to-br from-emerald-400 to-teal-600" :
                "bg-gray-100"
            )}>
                <div className="bg-white rounded-[2.9rem] p-12 text-center space-y-10">
                    <div className="relative mx-auto w-40 h-40">
                        {/* Radar Pulse Effect */}
                        {ot.status === 'IN_PROGRESS' && (
                            <>
                                <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                                <div className="absolute inset-4 rounded-full bg-amber-500/10 animate-ping [animation-delay:200ms]" />
                            </>
                        )}
                        
                        <div className={cn(
                            "relative z-10 w-full h-full rounded-full flex flex-col items-center justify-center border-4 transition-all duration-700",
                            ot.status === 'IN_PROGRESS' ? "border-amber-500 bg-amber-50 shadow-[0_0_50px_rgba(245,158,11,0.2)]" :
                            ot.status === 'COMPLETED' ? "border-emerald-500 bg-emerald-50" :
                            "border-gray-200 bg-gray-50"
                        )}>
                            {ot.status === 'IN_PROGRESS' ? (
                                <>
                                    <Activity className="h-8 w-8 text-amber-600 animate-pulse mb-2" />
                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Transmitiendo</p>
                                </>
                            ) : ot.status === 'COMPLETED' ? (
                                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                            ) : (
                                <PlayCircle className="h-12 w-12 text-gray-300" />
                            )}
                        </div>
                    </div>

                    <div className="max-w-md mx-auto space-y-4">
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">
                                {ot.status === 'IN_PROGRESS' ? 'Misión en Curso' : 
                                 ot.status === 'COMPLETED' ? 'Misión Cumplida' : 'Listo para Iniciar'}
                            </h3>
                            <p className="text-sm font-medium text-gray-500">
                                {ot.status === 'IN_PROGRESS' ? 'Tu ubicación y tiempo están siendo monitoreados por la central.' : 
                                 ot.status === 'COMPLETED' ? 'El reporte técnico ha sido guardado exitosamente.' : 
                                 'Presiona el botón para comenzar el registro de tus actividades.'}
                            </p>
                        </div>

                        {/* Cronómetro Visual */}
                        {ot.status === 'IN_PROGRESS' && (
                            <div className="flex flex-col items-center gap-2 pt-4">
                                <div className="bg-gray-900 text-white px-8 py-4 rounded-3xl flex items-center gap-4 shadow-2xl">
                                    <Timer className="h-6 w-6 text-amber-400" />
                                    <span className="text-3xl font-black font-mono tracking-wider">{elapsedTime}</span>
                                </div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Tiempo de Operación</p>
                            </div>
                        )}

                        <div className="pt-8">
                            {(ot.status === 'ASSIGNED' || ot.status === 'PENDING' || ot.status === 'ACCEPTED' || ot.status === 'UNASSIGNED') && (
                                <button 
                                onClick={() => handleStatusUpdate('IN_PROGRESS')}
                                className="w-full bg-gray-900 text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.2)] hover:bg-primary hover:scale-[1.02] transition-all active:scale-[0.98] group"
                                >
                                    <Zap className="h-5 w-5 text-amber-400 group-hover:animate-bounce" /> Iniciar Jornada de Trabajo
                                </button>
                            )}

                            {ot.status === 'IN_PROGRESS' && (
                              <button 
                                onClick={() => navigate(`/ops/ots/delivery-act/${ot.id}`)}
                                className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 shadow-[0_20px_50px_rgba(16,185,129,0.2)] hover:bg-emerald-700 hover:scale-[1.02] transition-all active:scale-[0.98]"
                              >
                                Finalizar y Generar Acta A.E.R. <FileText className="h-5 w-5" />
                              </button>
                            )}
                            {ot.status === 'COMPLETED' && (
                                <div className="space-y-4 w-full">
                                    <div className="bg-emerald-50 text-emerald-700 py-6 px-10 rounded-[2.5rem] border-2 border-emerald-100 flex flex-col items-center gap-3">
                                        <p className="font-black text-xs uppercase tracking-[0.2em]">Estatus: Cerrada Exitosamente</p>
                                        <div className="h-1 w-20 bg-emerald-200 rounded-full" />
                                        <p className="text-[10px] font-bold opacity-70">Folio registrado el {new Date(ot.finishedAt || ot.updatedAt).toLocaleString()}</p>
                                    </div>
                                    
                                    {ot.deliveryActUrl && (
                                        <button 
                                            onClick={() => window.open(ot.deliveryActUrl, '_blank')}
                                            className="w-full bg-white border-2 border-emerald-500 text-emerald-600 py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-emerald-50 transition-all shadow-lg shadow-emerald-100"
                                        >
                                            <FileText className="h-5 w-5" /> Ver Acta de Entrega (PDF)
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'EXPENSES' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white p-12 rounded-[2.5rem] border text-center space-y-6 shadow-sm">
                  <div className="h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600 shadow-inner">
                      <Coins className="h-10 w-10" />
                  </div>
                  <div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Control de Gastos de la OT</h3>
                      <p className="text-gray-400 font-bold text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                          Aquí se reflejan todos los movimientos financieros asociados a este servicio técnico.
                      </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4">
                    <button 
                        onClick={() => setIsExpenseFormOpen(true)}
                        className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" /> Registrar Nuevo Gasto
                    </button>
                    <button 
                        onClick={() => navigate('/expenses')}
                        className="bg-white text-gray-500 border border-gray-200 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all"
                    >
                        Ver Historial Completo
                    </button>
                  </div>
              </div>

              {/* Listado de Gastos de esta OT */}
              <div className="bg-white rounded-[2.5rem] border overflow-hidden shadow-sm">
                  <div className="px-8 py-5 border-b bg-gray-50/50">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Movimientos Recientes</h4>
                  </div>
                  <div className="divide-y divide-gray-50">
                      {(ot.expenses?.length || 0) > 0 ? ot.expenses.map((exp) => (
                          <div key={exp.id} className="p-6 flex items-center justify-between hover:bg-gray-50/30 transition-colors">
                              <div className="flex items-center gap-4">
                                  <div className={cn(
                                      "h-10 w-10 rounded-xl flex items-center justify-center",
                                      exp.status === 'APPROVED' ? "bg-emerald-50 text-emerald-600" :
                                      exp.status === 'REJECTED' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
                                  )}>
                                      <Receipt className="h-5 w-5" />
                                  </div>
                                  <div>
                                      <p className="text-sm font-black text-gray-900 uppercase">{exp.category}</p>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(exp.createdAt).toLocaleDateString()}</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className="text-sm font-black text-gray-900">${exp.amount.toLocaleString()}</p>
                                  <span className={cn(
                                      "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border",
                                      exp.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                      exp.status === 'REJECTED' ? "bg-red-50 text-red-700 border-red-100" : "bg-blue-50 text-blue-700 border-blue-100"
                                  )}>
                                      {exp.status}
                                  </span>
                              </div>
                          </div>
                      )) : (
                          <div className="p-12 text-center text-gray-400 font-bold italic text-sm">Sin gastos registrados en esta orden.</div>
                      )}
                  </div>
              </div>
          </div>
        )}
      </div>

      <NewExpenseForm 
        isOpen={isExpenseFormOpen}
        onClose={() => setIsExpenseFormOpen(false)}
        onSave={handleSaveExpense}
        prefilledOtId={ot.otNumber}
      />

      {/* Funds Modal */}
      {isFundsModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300 border border-gray-100">
            <div className="p-10">
              <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Fondos OT</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Autorización de Presupuesto</p>
                </div>
                <button onClick={() => setIsFundsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 text-center">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Saldo Autorizado Actual</p>
                    <p className="text-4xl font-black text-indigo-700">${totalAuthorized.toLocaleString()}</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Monto a Añadir (MXN)</label>
                  <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">$</span>
                      <input 
                        type="number" 
                        className="w-full pl-10 pr-6 py-5 bg-white border-2 border-indigo-100 rounded-[1.5rem] outline-none focus:border-indigo-500 font-black text-2xl transition-all shadow-inner"
                        placeholder="0.00"
                        value={additionalFunds}
                        onChange={(e) => setAdditionalFunds(e.target.value)}
                      />
                  </div>
                </div>

                <button 
                  onClick={handleAddFunds}
                  disabled={!additionalFunds || additionalFunds <= 0}
                  className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 active:scale-95"
                >
                  Confirmar Depósito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Finish Modal */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-500">
            <div className="p-10">
              <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">Finalizar Trabajo</h3>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Cierre de Orden Técnico</p>
                </div>
                <button onClick={() => setIsFinishModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Reporte Final de Actividades</label>
                  <textarea 
                    className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] outline-none focus:bg-white focus:border-primary font-bold text-sm transition-all resize-none shadow-inner"
                    rows="5"
                    placeholder="Describe a detalle los trabajos realizados, fallas corregidas y observaciones en sitio..."
                    value={finishData.report}
                    onChange={(e) => setFinishData({...finishData, report: e.target.value})}
                  />
                </div>

                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex items-center gap-4">
                    <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                        <Info className="h-5 w-5" />
                    </div>
                    <p className="text-[10px] font-bold text-emerald-700 leading-tight">Al finalizar, esta orden será enviada a validación del supervisor. Asegúrate de que el reporte sea completo.</p>
                </div>

                <button 
                  onClick={() => handleStatusUpdate('COMPLETED')}
                  disabled={!finishData.report}
                  className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95"
                >
                  Enviar Reporte y Cerrar <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
