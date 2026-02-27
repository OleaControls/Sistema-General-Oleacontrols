import React, { useState, useEffect, useRef } from 'react';
import { ClipboardList, MapPin, Clock, ArrowRight, Receipt, CheckCircle, Camera, PenLine, X, Send, FileText, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { otService } from '@/api/otService';
import { expenseService } from '@/api/expenseService';
import { useAuth } from '@/store/AuthContext';
import NewExpenseForm from '@/modules/expenses/components/NewExpenseForm';
import { cn } from '@/lib/utils';

export default function TechnicianOTs() {
  const { user } = useAuth();
  const [ots, setOts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [activeOtId, setActiveOtId] = useState(null);
  const [finishData, setFinishData] = useState({
    pendingTasks: '',
    photos: [],
    signature: null
  });
  
  const signatureRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await otService.getOTs();
    setOts(data.filter(o => o.assignedToId === user.id));
    setLoading(false);
  };

  const handleOpenExpenseForm = (otId) => {
    setActiveOtId(otId);
    setIsExpenseFormOpen(true);
  };

  const handleSaveExpense = async (formData) => {
    await expenseService.save({
      ...formData,
      userId: user.id,
      tenantId: 'olea-mx',
      amount: parseFloat(formData.amount),
      otId: activeOtId
    });
    console.log("Gasto registrado y enviado para aprobación inmediata");
  };

  const handleAccept = async (id) => {
    await otService.updateStatus(id, 'ACCEPTED', { acceptedAt: new Date().toISOString() });
    loadData();
  };

  const handleStart = async (id) => {
    await otService.updateStatus(id, 'IN_PROGRESS', { startedAt: new Date().toISOString() });
    loadData();
  };

  const handleOpenFinishModal = (otId) => {
    setActiveOtId(otId);
    setIsFinishModalOpen(true);
  };

  const handleFinish = async () => {
    await otService.updateStatus(activeOtId, 'COMPLETED', {
      ...finishData,
      finishedAt: new Date().toISOString()
    });
    setIsFinishModalOpen(false);
    loadData();
  };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    // Simular subida y guardado de URLs
    const newPhotos = files.map(f => URL.createObjectURL(f));
    setFinishData({ ...finishData, photos: [...finishData.photos, ...newPhotos] });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-lg mx-auto pb-20">
      <div className="px-2">
        <h2 className="text-2xl font-black text-gray-900 leading-tight">Mis Trabajos</h2>
        <p className="text-sm text-gray-500 font-medium mt-1">Órdenes de trabajo asignadas hoy.</p>
      </div>

      <div className="space-y-4">
        {ots.map((ot) => (
          <div key={ot.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded-md uppercase tracking-widest">{ot.id}</span>
                <span className={cn(
                  "text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest",
                  ot.status === 'ACCEPTED' ? "bg-blue-50 text-blue-600" :
                  ot.status === 'IN_PROGRESS' ? "bg-amber-100 text-amber-700 animate-pulse" : 
                  ot.status === 'COMPLETED' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                )}>{ot.status}</span>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-lg font-black text-gray-900 leading-tight">{ot.title}</h3>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Tienda {ot.storeNumber}: {ot.storeName}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs font-bold text-gray-500">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-gray-900">{ot.client}</p>
                    <p className="text-[10px] font-medium leading-tight">{ot.address}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                  <Clock className="h-4 w-4 text-primary" />
                  Llegada: {ot.arrivalTime} • Prioridad: {ot.priority}
                </div>
                {ot.assignedFunds > 0 && (
                  <div className="flex items-center gap-2 text-xs font-black text-emerald-600 bg-emerald-50 p-2 rounded-xl">
                    <Receipt className="h-4 w-4" />
                    Fondo asignado: ${ot.assignedFunds}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Trabajo a realizar:</p>
                <p className="text-xs font-medium text-gray-700">{ot.workDescription}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => handleOpenExpenseForm(ot.id)}
                  className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-primary/30 transition-all group"
                >
                  <Receipt className="h-6 w-6 text-gray-400 group-hover:text-primary mb-2" />
                  <span className="text-[10px] font-black uppercase text-gray-500 group-hover:text-primary">Viáticos</span>
                </button>
                <button 
                  className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-primary/30 transition-all group"
                >
                  <Camera className="h-6 w-6 text-gray-400 group-hover:text-primary mb-2" />
                  <span className="text-[10px] font-black uppercase text-gray-500 group-hover:text-primary">Evidencia</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t flex gap-3">
              {ot.status === 'ASSIGNED' ? (
                <button 
                  onClick={() => handleAccept(ot.id)}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
                >
                  Aceptar OT <CheckCircle className="h-5 w-5" />
                </button>
              ) : ot.status === 'ACCEPTED' ? (
                <button 
                  onClick={() => handleStart(ot.id)}
                  className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary transition-all"
                >
                  Iniciar Trabajo <ArrowRight className="h-5 w-5" />
                </button>
              ) : ot.status === 'IN_PROGRESS' ? (
                <button 
                  onClick={() => handleOpenFinishModal(ot.id)}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
                >
                  Finalizar OT <CheckCircle className="h-5 w-5" />
                </button>
              ) : (
                <div className="w-full flex flex-col gap-2">
                  <div className="text-center py-2 text-gray-400 font-black uppercase text-xs">
                    Esperando validación
                  </div>
                  <button 
                    onClick={() => navigate(`/ops/ots/delivery-act/${ot.id}`)}
                    className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <FileText className="h-4 w-4" /> Ver Acta de Entrega
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isFinishModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900">Finalizar Trabajo</h3>
                <button onClick={() => setIsFinishModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-6">
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
                  <label className="text-[10px] font-black uppercase text-gray-400">Trabajos Pendientes (Si aplica)</label>
                  <textarea 
                    className="w-full px-4 py-3 border rounded-2xl outline-none focus:border-primary font-bold text-sm"
                    rows="3"
                    placeholder="Mencione si queda algo pendiente para otra visita..."
                    value={finishData.pendingTasks}
                    onChange={(e) => setFinishData({...finishData, pendingTasks: e.target.value})}
                  />
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

                <button 
                  onClick={handleFinish}
                  disabled={!finishData.signature}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  <Send className="h-4 w-4" /> Generar Acta y Finalizar
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
        prefilledOtId={activeOtId}
      />
    </div>
  );
}
