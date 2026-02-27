import React, { useState, useEffect } from 'react';
import { X, Camera, Save, Send, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = [
  { id: 'COMBUSTIBLE', label: 'Combustible', icon: '⛽' },
  { id: 'CASETAS', label: 'Casetas', icon: '🛣️' },
  { id: 'ALIMENTOS', label: 'Alimentos', icon: '🍔' },
  { id: 'HOSPEDAJE', label: 'Hospedaje', icon: '🏨' },
  { id: 'REFACCIONES', label: 'Refacciones', icon: '⚙️' },
  { id: 'HERRAMIENTAS', label: 'Herramientas', icon: '🛠️' },
  { id: 'OTROS', label: 'Otros', icon: '📦' },
];

export default function NewExpenseForm({ isOpen, onClose, onSave, prefilledOtId }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: '',
    currency: 'MXN',
    paymentMethod: 'CASH',
    description: '',
    otId: prefilledOtId || '',
    evidence: null
  });

  useEffect(() => {
    if (prefilledOtId) {
      setFormData(prev => ({ ...prev, otId: prefilledOtId }));
    }
  }, [prefilledOtId, isOpen]);

  if (!isOpen) return null;

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleSubmit = (status) => {
    onSave({ ...formData, status });
    onClose();
  };

  const isStep1Valid = formData.date && formData.category && formData.otId;
  const isStep2Valid = formData.amount > 0 && formData.description;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Registrar Gasto</h3>
            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Paso {step} de 3</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-gray-100">
          <div 
            className="h-full bg-primary transition-all duration-500" 
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">¿A qué orden pertenece?</label>
                <input 
                  type="text"
                  placeholder="Ej: OT-1025"
                  disabled={!!prefilledOtId}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-primary outline-none font-bold disabled:opacity-60"
                  value={formData.otId}
                  onChange={(e) => setFormData({...formData, otId: e.target.value.toUpperCase()})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Fecha</label>
                <input 
                  type="date"
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-primary outline-none font-bold"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Categoría</label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setFormData({...formData, category: cat.id})}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                        formData.category === cat.id 
                          ? "border-primary bg-primary/5 ring-1 ring-primary" 
                          : "border-gray-100 bg-gray-50 hover:border-gray-300"
                      )}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className="text-xs font-bold text-gray-700">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Monto del Gasto</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">$</span>
                  <input 
                    type="number"
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary outline-none text-3xl font-black"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                </div>
                {formData.amount > 500 && formData.category === 'ALIMENTOS' && (
                  <div className="flex gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                    <p className="text-[11px] text-amber-800 font-medium">
                      Este monto excede el límite de políticas ($500). Se requerirá aprobación especial.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Descripción</label>
                <textarea 
                  rows="3"
                  placeholder="¿En qué se gastó? Detalla lo más posible..."
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-primary outline-none font-medium text-sm"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Método de Pago</label>
                <select 
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-primary outline-none font-bold"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                >
                  <option value="CASH">Efectivo</option>
                  <option value="COMPANY_CARD">Tarjeta Empresa</option>
                  <option value="PERSONAL_CARD">Tarjeta Personal</option>
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center space-y-3">
                <label className="text-xs font-bold text-gray-500 uppercase">Evidencia / Recibo</label>
                <div className="relative aspect-video w-full bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center overflow-hidden group hover:border-primary transition-colors cursor-pointer">
                  <Camera className="h-10 w-10 text-gray-400 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-xs font-bold text-gray-500 group-hover:text-primary">Haz clic para tomar foto o subir archivo</p>
                  <p className="text-[10px] text-gray-400 mt-1">JPG, PNG o PDF (Máx 5MB)</p>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <h4 className="text-xs font-black text-blue-900 uppercase mb-2">Resumen del Gasto</h4>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-blue-800">{categories.find(c => c.id === formData.category)?.label || 'Sin categoría'}</p>
                    <p className="text-[10px] text-blue-600 font-medium">{formData.date} • {formData.otId}</p>
                  </div>
                  <p className="text-xl font-black text-blue-900">${Number(formData.amount).toLocaleString()}</p>
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
              className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-600 hover:bg-white transition-all"
            >
              Atrás
            </button>
          ) : (
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-600 hover:bg-white transition-all"
            >
              Cancelar
            </button>
          )}

          {step < 3 ? (
            <button 
              disabled={step === 1 ? !isStep1Valid : !isStep2Valid}
              onClick={handleNext}
              className="flex-[2] bg-primary text-white px-4 py-3 rounded-xl font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 transition-all"
            >
              Continuar
            </button>
          ) : (
            <div className="flex-[2] flex gap-2">
              <button 
                onClick={() => handleSubmit('DRAFT')}
                className="flex-1 px-3 py-3 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/5 transition-all flex items-center justify-center gap-1"
              >
                <Save className="h-4 w-4" />
                <span className="text-xs">Borrador</span>
              </button>
              <button 
                onClick={() => handleSubmit('SUBMITTED')}
                className="flex-[1.5] bg-primary text-white px-3 py-3 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-1 text-sm"
              >
                <Send className="h-4 w-4" />
                <span>Enviar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
