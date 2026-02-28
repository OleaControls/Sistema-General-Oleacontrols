import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  MapPin, 
  Clock, 
  User, 
  CheckCircle2, 
  MessageSquare, 
  Receipt,
  FileText,
  ChevronLeft,
  Smartphone,
  Camera,
  PenLine,
  X,
  Send,
  ArrowRight,
  Store,
  Map as MapIcon,
  AlertTriangle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { otService } from '@/api/otService';
import { expenseService } from '@/api/expenseService';
import { gamificationService } from '@/api/gamificationService';
import { useAuth } from '@/store/AuthContext';
import NewExpenseForm from '@/modules/expenses/components/NewExpenseForm';
import ExpensesList from '@/modules/expenses/views/ExpensesList';
import { cn } from '@/lib/utils';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const PlayCircle = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
);

const TABS = [
  { id: 'INFO', label: 'Detalles', icon: FileText },
  { id: 'ACTIONS', label: 'Ejecución', icon: PlayCircle },
  { id: 'EXPENSES', label: 'Gastos', icon: Receipt },
];

export default function OTDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ot, setOt] = useState(null);
  const [financials, setFinancials] = useState({ assignedFunds: 0, totalSpent: 0, balance: 0, isOverLimit: false });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('INFO');
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [refreshExpensesTrigger, setRefreshExpensesTrigger] = useState(0);
  
  const isLead = ot?.leadTechId === user?.id;

  const [finishData, setFinishData] = useState({
    pendingTasks: '',
    photos: [],
    signature: null
  });

  useEffect(() => {
    loadOT();
    
    // Polling cada 10 segundos para ver si el supervisor aprobó fondos extra
    const interval = setInterval(() => {
      loadOT();
    }, 10000);

    return () => clearInterval(interval);
  }, [id]);

  const loadOT = async () => {
    setLoading(true);
    const [data, fin] = await Promise.all([
      otService.getById(id),
      otService.getOTFinancials(id)
    ]);
    setOt(data);
    setFinancials(fin);
    setLoading(false);
  };

  const handleAccept = async () => {
    await otService.updateStatus(id, 'ACCEPTED', { acceptedAt: new Date().toISOString() });
    loadOT();
  };

  const handleStart = async () => {
    await otService.updateStatus(id, 'IN_PROGRESS', { startedAt: new Date().toISOString() });
    loadOT();
  };

  const handleFinish = async () => {
    await otService.updateStatus(id, 'COMPLETED', {
      ...finishData,
      finishedAt: new Date().toISOString()
    });
    
    // Reward XP for completing the work
    await gamificationService.addXP(user.id, 50, 'OT_COMPLETED');
    
    setIsFinishModalOpen(false);
    loadOT();
  };

  const handleSaveExpense = async (formData) => {
    await expenseService.save({
      ...formData,
      userId: user.id,
      tenantId: 'olea-mx',
      amount: parseFloat(formData.amount),
      otId: id
    });
    setRefreshExpensesTrigger(prev => prev + 1);
    loadOT();
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map(f => URL.createObjectURL(f));
    setFinishData({ ...finishData, photos: [...finishData.photos, ...newPhotos] });
  };

  if (loading) return <div className="p-10 text-center font-bold text-gray-400 italic">Cargando orden...</div>;
  if (!ot) return <div className="p-10 text-center font-bold text-red-400 italic">Orden no encontrada.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24 animate-in fade-in duration-500">
      {/* Header OT */}
      <div className="bg-white border rounded-[2rem] p-6 shadow-xl shadow-gray-200/50">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase mb-4 hover:text-gray-900 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Volver al listado
        </button>
        
        <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-lg uppercase tracking-widest">
                              {ot.id}
                            </span>
                            <span className={cn(
                              "text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border",
                              isLead ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-gray-50 text-gray-500 border-gray-100"
                            )}>
                              {isLead ? 'Técnico Líder' : 'Apoyo Técnico'}
                            </span>
                          </div>
                          <h2 className="text-2xl font-black text-gray-900 leading-tight mt-2">{ot.title}</h2>
                        </div>
          
            <span className={cn(
              "text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest border shadow-sm",
              ot.status === 'COMPLETED' ? "bg-green-50 text-green-700 border-green-100" :
              ot.status === 'IN_PROGRESS' ? "bg-amber-50 text-amber-700 border-amber-100 animate-pulse" :
              "bg-gray-100 text-gray-600 border-gray-200"
            )}>
              {ot.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white border rounded-2xl p-1 gap-1 sticky top-2 z-30 shadow-lg mx-2 md:mx-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
              activeTab === tab.id 
                ? "bg-gray-900 text-white shadow-md" 
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
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Ubicación y Mapa */}
            <div className="bg-white border rounded-[2rem] overflow-hidden shadow-sm">
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-2xl">
                    <Store className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Establecimiento</p>
                    <p className="text-lg font-black text-gray-900 leading-tight">Tienda {ot.storeNumber}: {ot.storeName}</p>
                    <p className="text-xs font-bold text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" /> {ot.address}
                    </p>
                  </div>
                </div>

                <div className="h-48 w-full rounded-2xl overflow-hidden border border-gray-100 relative z-0">
                  <MapContainer 
                    center={[ot.lat || 22.1444, ot.lng || -100.9167]} 
                    zoom={15} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[ot.lat || 22.1444, ot.lng || -100.9167]} />
                  </MapContainer>
                  <div className="absolute bottom-2 right-2 z-[500] flex gap-2">
                    <button 
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${ot.lat},${ot.lng}`, '_blank')}
                      className="bg-white px-3 py-2 rounded-xl shadow-lg flex items-center gap-1.5 text-[8px] font-black text-blue-600 uppercase border border-blue-50"
                    >
                      <MapIcon className="h-3.5 w-3.5" /> Maps
                    </button>
                    <button 
                      onClick={() => window.open(`https://waze.com/ul?ll=${ot.lat},${ot.lng}&navigate=yes`, '_blank')}
                      className="bg-white px-3 py-2 rounded-xl shadow-lg flex items-center gap-1.5 text-[8px] font-black text-sky-500 uppercase border border-sky-50"
                    >
                      <Smartphone className="h-3.5 w-3.5" /> Waze
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalles del Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border rounded-[2rem] p-6 shadow-sm">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Información de Contacto</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Cliente</p>
                      <p className="text-sm font-bold text-gray-900">{ot.client}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Teléfono</p>
                      <p className="text-sm font-bold text-gray-900">{ot.clientPhone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-[2rem] p-6 shadow-sm">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Planificación y Fondos</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Hora Programada de Llegada</p>
                      <p className="text-sm font-bold text-gray-900">{ot.arrivalTime} HRS</p>
                    </div>
                  </div>
                  {ot.assignedFunds > 0 && (
                    <div className="pt-4 border-t border-dashed border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-primary" />
                          <span className="text-[10px] font-black text-gray-400 uppercase">Fondo de Mantenimiento</span>
                        </div>
                        <span className="text-xs font-black text-gray-900">${ot.assignedFunds.toLocaleString()}</span>
                      </div>
                      
                      <div className={cn(
                        "p-3 rounded-xl flex items-center justify-between transition-all",
                        financials.isOverLimit ? "bg-red-50 border border-red-100" : "bg-emerald-50 border border-emerald-100"
                      )}>
                        <div>
                          <p className={cn("text-[8px] font-black uppercase", financials.isOverLimit ? "text-red-400" : "text-emerald-400")}>
                            {financials.isOverLimit ? 'Saldo Excedido' : 'Saldo Disponible'}
                          </p>
                          <p className={cn("text-base font-black", financials.isOverLimit ? "text-red-600" : "text-emerald-700")}>
                            ${financials.balance.toLocaleString()}
                          </p>
                        </div>
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          financials.isOverLimit ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"
                        )}>
                          {financials.isOverLimit ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </div>
                      </div>
                      
                      {financials.isOverLimit && (
                        <p className="text-[8px] font-bold text-red-400 mt-2 italic">* Los gastos adicionales requieren aprobación especial del supervisor.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Trabajos a Realizar */}
            <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-xl">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                <ClipboardList className="h-4 w-4" /> Descripción del Servicio
              </h3>
              <p className="text-lg font-medium leading-relaxed italic text-gray-300">
                "{ot.workDescription}"
              </p>
            </div>
          </div>
        )}

        {activeTab === 'ACTIONS' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Status Based Actions */}
            <div className="bg-white border rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 text-center">
              <div className="max-w-sm mx-auto space-y-6">
                <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-gray-200 text-gray-300">
                  <PlayCircle className="h-10 w-10" />
                </div>
                
                <div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Ejecución de Servicio</h3>
                  <p className="text-sm font-medium text-gray-500 mt-2">Gestiona los estados de tu orden de trabajo en tiempo real.</p>
                </div>

                <div className="space-y-3 pt-4">
                  {ot.status === 'ASSIGNED' && (
                    <button 
                      onClick={handleAccept}
                      className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
                    >
                      Aceptar OT <CheckCircle2 className="h-5 w-5" />
                    </button>
                  )}

                  {ot.status === 'ACCEPTED' && (
                    <button 
                      onClick={handleStart}
                      className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-gray-300 hover:bg-primary transition-all"
                    >
                      Iniciar Trabajo <ArrowRight className="h-5 w-5" />
                    </button>
                  )}

                  {ot.status === 'IN_PROGRESS' && (
                    <button 
                      onClick={() => setIsFinishModalOpen(true)}
                      className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                    >
                      Finalizar Trabajo <CheckCircle2 className="h-5 w-5" />
                    </button>
                  )}

                  {ot.status === 'COMPLETED' && (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 font-black text-[10px] uppercase tracking-widest">
                        ¡Trabajo finalizado con éxito!
                      </div>
                      <button 
                        onClick={() => navigate(`/ops/ots/delivery-act/${ot.id}`)}
                        className="w-full bg-white border border-gray-200 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <FileText className="h-4 w-4" /> Ver Acta de Entrega
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Grid (Lead Only) */}
            {isLead && (
              <div className="grid grid-cols-2 gap-4">
                <button 
                  disabled={ot.isLocked || ot.status === 'VALIDATED' || ot.status === 'COMPLETED'}
                  onClick={() => setIsExpenseFormOpen(true)}
                  className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 group hover:border-primary transition-all disabled:opacity-50"
                >
                  <div className="bg-gray-50 p-4 rounded-2xl group-hover:bg-primary/10 transition-colors">
                    <Receipt className="h-6 w-6 text-gray-400 group-hover:text-primary" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest group-hover:text-primary">Registrar Viático</span>
                </button>
                
                <button 
                  disabled={ot.isLocked || ot.status === 'VALIDATED' || ot.status === 'COMPLETED'}
                  onClick={() => ot.status === 'IN_PROGRESS' && setIsFinishModalOpen(true)}
                  className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3 group hover:border-primary transition-all disabled:opacity-50"
                >
                  <div className="bg-gray-50 p-4 rounded-2xl group-hover:bg-primary/10 transition-colors">
                    <Camera className="h-6 w-6 text-gray-400 group-hover:text-primary" />
                  </div>
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest group-hover:text-primary">Añadir Evidencia</span>
                </button>
              </div>
            )}

            {!isLead && (
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2rem] text-center">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Modo de Apoyo</p>
                <p className="text-xs font-bold text-blue-400 mt-1">Solo el Técnico Líder puede registrar gastos y evidencias fotográficas.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'EXPENSES' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-gray-900 tracking-tighter">Gastos de esta Orden</h3>
              {!ot.isLocked && (
                <button 
                  onClick={() => setIsExpenseFormOpen(true)}
                  className="bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                >
                  Nuevo Gasto
                </button>
              )}
            </div>
            <ExpensesList otId={id} hideHeader refreshTrigger={refreshExpensesTrigger} />
          </div>
        )}
      </div>

      {/* Finish Modal */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900">Finalizar Trabajo</h3>
                <button onClick={() => setIsFinishModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
                {isLead && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Fotos de Evidencia</label>
                      <div className="grid grid-cols-3 gap-2">
                        {finishData.photos.map((p, i) => (
                          <div key={i} className="aspect-square bg-gray-100 rounded-xl overflow-hidden relative">
                            <img src={p} className="w-full h-full object-cover" />
                          </div>
                        ))}
                        <label className="aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                          <Camera className="h-6 w-6 text-gray-300" />
                          <span className="text-[8px] font-black text-gray-400 uppercase mt-1">Añadir</span>
                          <input type="file" multiple className="hidden" onChange={handlePhotoUpload} accept="image/*" />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Firma del Cliente</label>
                      <div className="border-2 border-dashed border-gray-200 rounded-[2rem] h-48 bg-gray-50 flex flex-col items-center justify-center relative overflow-hidden">
                        <PenLine className="h-8 w-8 text-gray-200" />
                        <p className="text-[10px] font-black text-gray-300 uppercase mt-2">Firme aquí</p>
                        <canvas 
                          className="absolute inset-0 w-full h-full cursor-crosshair"
                          onMouseDown={(e) => {
                            const ctx = e.currentTarget.getContext('2d');
                            ctx.beginPath();
                            ctx.lineWidth = 2;
                            ctx.lineCap = 'round';
                            ctx.strokeStyle = '#000';
                            setFinishData({...finishData, signature: 'has-signature'});
                          }}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400">Trabajos Pendientes (Si aplica)</label>
                  <textarea 
                    className="w-full px-4 py-3 border rounded-2xl outline-none focus:border-primary font-bold text-sm"
                    rows="3"
                    placeholder="Mencione si queda algo pendiente para otra visita..."
                    value={finishData.pendingTasks}
                    onChange={(e) => setFinishData({...finishData, pendingTasks: e.target.value})}
                  />
                </div>

                <button 
                  onClick={handleFinish}
                  disabled={isLead && !finishData.signature}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  <Send className="h-4 w-4" /> {isLead ? 'Generar Acta y Finalizar' : 'Finalizar Turno de Apoyo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <NewExpenseForm 
        isOpen={isExpenseFormOpen}
        onClose={() => setIsExpenseFormOpen(false)}
        onSave={handleSaveExpense}
        prefilledOtId={id}
      />
    </div>
  );
}
