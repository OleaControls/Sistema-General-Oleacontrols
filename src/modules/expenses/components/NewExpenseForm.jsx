import React, { useState, useEffect } from 'react';
import { X, Camera, Save, Send, AlertTriangle, ClipboardList, Loader2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { otService } from '@/api/otService';
import { useAuth } from '@/store/AuthContext';

const categories = [
  { id: 'COMBUSTIBLE', label: 'Combustible', icon: '⛽' },
  { id: 'CASETAS', label: 'Casetas', icon: '🛣️' },
  { id: 'ALIMENTOS', label: 'Alimentos', icon: '🍔' },
  { id: 'HOSPEDAJE', label: 'Hospedaje', icon: '🏨' },
  { id: 'REFACCIONES', label: 'Refacciones', icon: '⚙️' },
  { id: 'HERRAMIENTAS', label: 'Herramientas', icon: '🛠️' },
  { id: 'OTROS', label: 'Otros', icon: '📦' },
];

export default function NewExpenseForm({ isOpen, onClose, onSave, prefilledOtId, initialData }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [userOts, setUserOts] = useState([]);
  const [loadingOts, setLoadingOts] = useState(false);
  const [otSearch, setOtSearch] = useState('');
  const [showOtResults, setShowOtResults] = useState(false);
  
  const [isManualOt, setIsManualOt] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    currency: 'MXN',
    paymentMethod: 'CASH',
    description: '',
    otId: prefilledOtId || '',
    evidence: null,
    isExternal: false
  });

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
          setFormData({
            ...initialData,
            amount: initialData.amount.toString(),
            isExternal: !initialData.otId
          });
          setIsManualOt(!!initialData.otId && !userOts.find(o => o.id === initialData.otId));
          setStep(1);
        } else {
          setFormData({
            date: new Date().toISOString().split('T')[0],
            category: '',
            amount: '',
            currency: 'MXN',
            paymentMethod: 'CASH',
            description: '',
            otId: prefilledOtId || '',
            evidence: null,
            isExternal: false
          });
          setIsManualOt(false);
          setStep(1);
        }

        loadUserOts();
    }
  }, [initialData, isOpen, prefilledOtId]);

  const loadUserOts = async (search = '') => {
      setLoadingOts(true);
      try {
          // Si es ADMIN o SUPERVISOR, no filtramos por techId para que salgan todas
          const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERVISOR';
          const filters = {};
          if (!isAdmin) filters.techId = user.id;
          if (search) filters.search = search;
          
          const data = await otService.getOTs(filters);
          setUserOts(data);
          
          if (data.length === 1 && !formData.otId && !prefilledOtId && !search) {
              setFormData(prev => ({ ...prev, otId: data[0].id }));
          }
      } catch (error) {
          console.error(error);
      } finally {
          setLoadingOts(false);
      }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        if (otSearch.length >= 2) {
            loadUserOts(otSearch);
        } else if (otSearch.length === 0 && isOpen) {
            loadUserOts();
        }
    }, 500);
    return () => clearTimeout(timer);
  }, [otSearch]);

  const handleSelectOt = (ot) => {
    setFormData({ ...formData, otId: ot.id, isExternal: false });
    setOtSearch(ot.id);
    setShowOtResults(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 10 * 1024 * 1024) {
            alert('El archivo es demasiado grande (máx 10MB)');
            return;
        }
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            setFormData({ ...formData, evidence: reader.result });
        };
    }
  };

  if (!isOpen) return null;

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleSubmit = (status) => {
    onSave({ ...formData, status }, !!initialData);
    onClose();
  };

  const isStep1Valid = formData.date && formData.category && formData.otId;
  const isStep2Valid = formData.amount > 0 && formData.description;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 border border-gray-100">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tighter">{initialData ? 'Editar Gasto' : 'Registrar Gasto'}</h3>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Paso {step} de 3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-gray-100">
          <div 
            className="h-full bg-primary transition-all duration-500" 
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vinculación de Gasto</label>
                    {!prefilledOtId && (
                        <div className="flex gap-2">
                            <button 
                                type="button"
                                onClick={() => {
                                    setIsManualOt(false);
                                    setFormData({...formData, otId: '', isExternal: true});
                                }}
                                className={cn("text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border transition-all", formData.isExternal ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 hover:bg-gray-50")}
                            >
                                Sin OT
                            </button>
                            <button 
                                type="button"
                                onClick={() => {
                                    setIsManualOt(!isManualOt);
                                    setFormData({...formData, isExternal: false});
                                }}
                                className={cn("text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border transition-all", isManualOt ? "bg-primary text-white border-primary" : "bg-white text-gray-400 hover:bg-gray-50")}
                            >
                                Manual
                            </button>
                        </div>
                    )}
                </div>
                
                {prefilledOtId ? (
                    <div className="flex items-center gap-3 p-4 bg-primary/5 border-2 border-primary/20 rounded-2xl">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        <div>
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Vínculo Automático</p>
                            <p className="text-sm font-black text-gray-900 mt-1">{prefilledOtId}</p>
                        </div>
                    </div>
                ) : formData.isExternal ? (
                    <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Gasto Administrativo / Externo a OT</p>
                    </div>
                ) : isManualOt ? (
                    <div className="relative group">
                        <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-primary transition-colors" />
                        <input 
                            type="text"
                            placeholder="Escribe el Folio de la OT..."
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none font-black text-sm uppercase"
                            value={formData.otId}
                            onChange={(e) => setFormData({...formData, otId: e.target.value.toUpperCase()})}
                        />
                    </div>
                ) : (
                    <div className="space-y-3 relative">
                        <div className="relative group">
                            <ClipboardList className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 group-focus-within:text-primary transition-colors" />
                            <input 
                                type="text"
                                placeholder="Buscar por Folio, Cliente o Tienda..."
                                className="w-full pl-12 pr-10 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none font-black text-sm uppercase transition-all"
                                value={otSearch}
                                onChange={(e) => {
                                    setOtSearch(e.target.value.toUpperCase());
                                    setShowOtResults(true);
                                }}
                                onFocus={() => setShowOtResults(true)}
                            />
                            {loadingOts && (
                                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                            )}
                        </div>

                        {showOtResults && (otSearch.length >= 2 || userOts.length > 0) && (
                            <div className="absolute z-[110] left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar animate-in slide-in-from-top-2">
                                {userOts.length > 0 ? (
                                    userOts.map(ot => (
                                        <button
                                            key={ot.id}
                                            type="button"
                                            onClick={() => handleSelectOt(ot)}
                                            className={cn(
                                                "w-full text-left p-4 hover:bg-primary/5 transition-colors border-b last:border-0 group",
                                                formData.otId === ot.id ? "bg-primary/5 border-primary/20" : "border-gray-50"
                                            )}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-xs font-black text-gray-900 leading-none group-hover:text-primary transition-colors">{ot.id}</p>
                                                    <p className="text-[10px] font-bold text-gray-500 mt-1 line-clamp-1">{ot.clientName} - {ot.storeName}</p>
                                                </div>
                                                <span className={cn(
                                                    "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                                    ot.status === 'COMPLETED' ? "bg-gray-100 text-gray-400" : "bg-emerald-100 text-emerald-600"
                                                )}>
                                                    {ot.status}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-8 text-center">
                                        <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Sin resultados</p>
                                        <button 
                                            type="button" 
                                            onClick={() => setIsManualOt(true)}
                                            className="text-[9px] font-black text-primary underline uppercase mt-2"
                                        >
                                            Usar Folio Manual
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {formData.otId && !showOtResults && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl">
                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Vinculado a {formData.otId}</p>
                            </div>
                        )}
                    </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha del Comprobante</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none font-bold text-sm"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoría de Gasto</label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({...formData, category: cat.id})}
                      className={cn(
                        "flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left",
                        formData.category === cat.id 
                          ? "border-primary bg-primary/5 ring-1 ring-primary" 
                          : "border-gray-100 bg-gray-50 hover:border-gray-200"
                      )}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-[11px] font-black text-gray-700 uppercase leading-none">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="space-y-2 text-center">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto Total</label>
                <div className="relative max-w-[240px] mx-auto">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">$</span>
                  <input 
                    type="number"
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-6 bg-gray-50 border-2 border-gray-100 rounded-3xl focus:border-primary outline-none text-4xl font-black text-center"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pesos Mexicanos (MXN)</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción del Concepto</label>
                <textarea 
                  rows="3"
                  placeholder="¿En qué se utilizó este recurso? Detalla el gasto..."
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none font-medium text-sm resize-none shadow-inner"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'CASH', label: 'Efectivo' },
                        { id: 'COMPANY_CARD', label: 'T. Olea' },
                        { id: 'PERSONAL_CARD', label: 'T. Propia' }
                    ].map(method => (
                        <button
                            key={method.id}
                            type="button"
                            onClick={() => setFormData({...formData, paymentMethod: method.id})}
                            className={cn(
                                "py-3 px-2 rounded-xl border-2 text-[10px] font-black uppercase tracking-tighter transition-all",
                                formData.paymentMethod === method.id 
                                    ? "bg-gray-900 text-white border-gray-900 shadow-md" 
                                    : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200"
                            )}
                        >
                            {method.label}
                        </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
              <div className="text-center space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Evidencia del Comprobante</label>
                <input 
                    type="file" 
                    id="expense-file" 
                    accept="image/*,application/pdf" 
                    className="hidden" 
                    onChange={handleFileChange}
                />
                <label 
                    htmlFor="expense-file"
                    className="relative aspect-video w-full bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden group hover:border-primary transition-all cursor-pointer shadow-inner"
                >
                  {formData.evidence ? (
                      <div className="w-full h-full relative">
                          {formData.evidence.startsWith('data:application/pdf') ? (
                              <div className="flex flex-col items-center justify-center h-full">
                                  <FileText className="h-12 w-12 text-primary" />
                                  <p className="text-[10px] font-black uppercase mt-2">PDF Cargado</p>
                              </div>
                          ) : (
                              <img src={formData.evidence} className="w-full h-full object-cover" alt="Recibo" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <p className="text-white text-[10px] font-black uppercase tracking-widest">Cambiar Foto</p>
                          </div>
                      </div>
                  ) : (
                      <>
                        <Camera className="h-12 w-12 text-gray-300 mb-2 group-hover:scale-110 transition-transform group-hover:text-primary" />
                        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest group-hover:text-primary transition-colors">Capturar Ticket / PDF</p>
                        <p className="text-[9px] text-gray-300 font-bold mt-1">Formatos: JPG, PNG, PDF • Máx 10MB</p>
                      </>
                  )}
                </label>
              </div>

              <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 shadow-sm">
                <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.2em] mb-4 text-center">Confirmación de Registro</h4>
                <div className="flex justify-between items-end border-t border-indigo-100 pt-4">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-indigo-800 uppercase">{categories.find(c => c.id === formData.category)?.label || 'Concepto'}</p>
                    <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest">{formData.date} • {formData.otId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-indigo-400 uppercase">Monto Total</p>
                    <p className="text-3xl font-black text-indigo-900 leading-none">${Number(formData.amount).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex gap-3 bg-gray-50/50">
          {step > 1 ? (
            <button 
              onClick={handleBack}
              className="flex-1 px-4 py-4 rounded-2xl border-2 border-gray-200 font-black text-[10px] uppercase tracking-widest text-gray-500 hover:bg-white transition-all shadow-sm"
            >
              Atrás
            </button>
          ) : (
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-4 rounded-2xl border-2 border-gray-200 font-black text-[10px] uppercase tracking-widest text-gray-500 hover:bg-white transition-all shadow-sm"
            >
              Cancelar
            </button>
          )}

          {step < 3 ? (
            <button 
              disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
              onClick={handleNext}
              className="flex-[2] bg-primary text-white px-4 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20 transition-all"
            >
              Siguiente Paso
            </button>
          ) : (
            <div className="flex-[2] flex gap-2">
              <button 
                onClick={() => handleSubmit('SUBMITTED')}
                className="w-full bg-primary text-white px-4 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3"
              >
                <Send className="h-4 w-4" />
                <span>Enviar Reporte</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
