import React, { useState, useEffect } from 'react';
import { Plus, Filter, Search, Receipt, ChevronRight, MapPin, Calendar, CreditCard, CloudOff, Check, AlertTriangle } from 'lucide-react';
import { expenseService } from '@/api/expenseService';
import { otService } from '@/api/otService';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/AuthContext';
import NewExpenseForm from '../components/NewExpenseForm';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const statusStyles = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  REIMBURSED: "bg-emerald-100 text-emerald-700",
};

export default function ExpensesList({ otId = null, hideHeader = false, refreshTrigger = 0 }) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [otFinancials, setOtFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [isFormOpen, setFormOpen] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, [otId, refreshTrigger]);

  const loadExpenses = async () => {
    setLoading(true);
    const [data, financials] = await Promise.all([
      expenseService.getAll(),
      otId ? otService.getOTFinancials(otId) : Promise.resolve(null)
    ]);
    
    setOtFinancials(financials);
    // Filter by OT if provided
    const baseData = otId ? data.filter(e => e.otId === otId) : data;
    setExpenses(baseData);
    setLoading(false);
  };

  const handleSaveExpense = async (formData) => {
    await expenseService.save({
      ...formData,
      userId: user.id,
      tenantId: 'olea-mx', // Por ahora mock
      amount: parseFloat(formData.amount)
    });
    loadExpenses();
  };

  const filteredExpenses = filter === 'ALL' 
    ? expenses 
    : expenses.filter(e => e.status === filter);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Acciones */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Mis Gastos</h2>
            <p className="text-sm text-gray-500">Gestiona tus reembolsos y gastos operativos.</p>
          </div>
          <button 
            onClick={() => setFormOpen(true)}
            className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
          >
            <Plus className="h-5 w-5" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      )}

      <NewExpenseForm 
        isOpen={isFormOpen} 
        onClose={() => setFormOpen(false)} 
        onSave={handleSaveExpense}
      />

      {/* Filtros Rápidos */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['ALL', 'SUBMITTED', 'APPROVED', 'REJECTED'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap",
              filter === s 
                ? "bg-gray-900 text-white border-gray-900" 
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            )}
          >
            {s === 'ALL' ? 'Todos' : s}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />)
        ) : filteredExpenses.length > 0 ? (
          filteredExpenses.map((exp, index) => {
            // Logic to determine if this expense contributes to an over-limit state
            // For simplicity, if balance is negative and it's one of the last expenses, or total is over
            const isOverLimit = otFinancials?.isOverLimit && exp.status !== 'REJECTED';
            
            return (
              <div 
                key={exp.id} 
                className={cn(
                  "group bg-white border p-4 rounded-2xl transition-all cursor-pointer relative overflow-hidden",
                  isOverLimit ? "border-red-100 bg-red-50/30 shadow-sm" : "border-gray-100 hover:border-primary/30 hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center transition-colors",
                    isOverLimit ? "bg-red-100 text-red-600" : "bg-gray-50 text-gray-400 group-hover:bg-primary/10 group-hover:text-primary"
                  )}>
                    {isOverLimit ? <AlertTriangle className="h-6 w-6" /> : <Receipt className="h-6 w-6" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-md uppercase", statusStyles[exp.status])}>
                        {exp.status}
                      </span>
                      {isOverLimit && (
                        <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse">
                          Excede Fondo
                        </span>
                      )}
                      {exp.pendingSync && (
                        <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                          <CloudOff className="h-3 w-3" />
                          OFFLINE
                        </span>
                      )}
                    </div>
                    <h3 className={cn("text-sm font-bold truncate", isOverLimit ? "text-red-900" : "text-gray-900")}>{exp.description}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] font-medium text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {exp.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {exp.paymentMethod.replace('_', ' ')}
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className={cn("text-lg font-black", isOverLimit ? "text-red-600" : "text-gray-900")}>
                        ${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{exp.currency}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <p className="text-gray-500 font-medium italic">No se encontraron gastos con este filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
}
