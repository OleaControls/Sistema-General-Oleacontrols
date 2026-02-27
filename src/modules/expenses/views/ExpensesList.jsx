import React, { useState, useEffect } from 'react';
import { Plus, Filter, Search, Receipt, ChevronRight, MapPin, Calendar, CreditCard, CloudOff, Check } from 'lucide-react';
import { expenseService } from '@/api/expenseService';
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

export default function ExpensesList() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [isFormOpen, setFormOpen] = useState(false);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    const data = await expenseService.getAll();
    setExpenses(data);
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
          filteredExpenses.map((exp) => (
            <div 
              key={exp.id} 
              className="group bg-white border border-gray-100 p-4 rounded-2xl hover:border-primary/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Receipt className="h-6 w-6" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-md uppercase", statusStyles[exp.status])}>
                      {exp.status}
                    </span>
                    {exp.pendingSync && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                        <CloudOff className="h-3 w-3" />
                        OFFLINE
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 font-medium">{exp.id}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 truncate">{exp.description}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                      <Calendar className="h-3 w-3" />
                      {exp.date}
                    </div>
                    {exp.otId && (
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                        <MapPin className="h-3 w-3" />
                        {exp.otId}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                      <CreditCard className="h-3 w-3" />
                      {exp.paymentMethod.replace('_', ' ')}
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-lg font-black text-gray-900">
                      ${exp.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{exp.currency}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <p className="text-gray-500 font-medium italic">No se encontraron gastos con este filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
}
