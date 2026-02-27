import React, { useState, useEffect } from 'react';
import { ClipboardList, MapPin, Clock, ArrowRight, Receipt, CheckCircle, Camera } from 'lucide-react';
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
  const [activeOtId, setActiveOtId] = useState(null);
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
      amount: parseFloat(formData.amount)
    });
    // Notificamos que se guardó
    console.log("Gasto registrado y enviado para aprobación inmediata");
  };

  const handleStart = async (id) => {
    await otService.updateStatus(id, 'IN_PROGRESS');
    loadData();
  };

  const handleComplete = async (id) => {
    await otService.updateStatus(id, 'COMPLETED');
    loadData();
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
                  ot.status === 'IN_PROGRESS' ? "bg-amber-100 text-amber-700 animate-pulse" : 
                  ot.status === 'COMPLETED' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                )}>{ot.status}</span>
              </div>
              
              <h3 className="text-lg font-black text-gray-900 leading-tight">{ot.title}</h3>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                  <MapPin className="h-4 w-4 text-primary" />
                  {ot.client} • {ot.location}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                  <Clock className="h-4 w-4 text-primary" />
                  Prioridad: {ot.priority}
                </div>
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
                  onClick={() => handleStart(ot.id)}
                  className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary transition-all"
                >
                  Iniciar Trabajo <ArrowRight className="h-5 w-5" />
                </button>
              ) : ot.status === 'IN_PROGRESS' ? (
                <button 
                  onClick={() => handleComplete(ot.id)}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
                >
                  Finalizar OT <CheckCircle className="h-5 w-5" />
                </button>
              ) : (
                <div className="w-full text-center py-2 text-gray-400 font-black uppercase text-xs">
                  Esperando validación de supervisor
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <NewExpenseForm 
        isOpen={isExpenseFormOpen}
        onClose={() => setIsExpenseFormOpen(false)}
        onSave={handleSaveExpense}
        prefilledOtId={activeOtId}
      />
    </div>
  );
}
