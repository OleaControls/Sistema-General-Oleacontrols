import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  PieChart as PieIcon, 
  ArrowUpRight, 
  ArrowDownRight,
  Building2,
  Users
} from 'lucide-react';
import { expenseService } from '@/api/expenseService';
import { cn } from '@/lib/utils';

export default function ExpensesDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    byCategory: {},
    byStatus: {},
    pendingAmount: 0,
    count: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateStats();
  }, []);

  const calculateStats = async () => {
    setLoading(true);
    const data = await expenseService.getAll();
    
    const totals = data.reduce((acc, curr) => {
      // Por Categoría
      acc.byCategory[curr.category] = (acc.byCategory[curr.category] || 0) + curr.amount;
      // Por Estado
      acc.byStatus[curr.status] = (acc.byStatus[curr.status] || 0) + 1;
      // Totales
      if (curr.status === 'APPROVED' || curr.status === 'REIMBURSED') {
        acc.total += curr.amount;
      }
      if (curr.status === 'SUBMITTED') {
        acc.pendingAmount += curr.amount;
      }
      return acc;
    }, { total: 0, byCategory: {}, byStatus: {}, pendingAmount: 0, count: data.length });

    setStats(totals);
    setLoading(false);
  };

  const categories = Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]);
  const maxCategoryAmount = Math.max(...Object.values(stats.byCategory), 1);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Análisis de Gastos</h2>
          <p className="text-sm text-gray-500 font-medium">Consolidado global de la operación.</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-white border rounded-xl px-4 py-2 text-sm font-bold shadow-sm outline-none">
            <option>Últimos 30 días</option>
            <option>Este trimestre</option>
            <option>Año 2026</option>
          </select>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Inversión Aprobada" 
          value={`$${stats.total.toLocaleString()}`} 
          trend="+12.5%" 
          positive={true} 
          icon={DollarSign}
          color="text-emerald-600"
        />
        <StatCard 
          title="Por Dictaminar" 
          value={`$${stats.pendingAmount.toLocaleString()}`} 
          trend="8 registros" 
          icon={TrendingUp}
          color="text-blue-600"
        />
        <StatCard 
          title="Ticket Promedio" 
          value={`$${(stats.total / (stats.byStatus['APPROVED'] || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} 
          trend="-2.1%" 
          positive={false} 
          icon={BarChart3}
          color="text-purple-600"
        />
        <StatCard 
          title="Cumplimiento" 
          value="94%" 
          trend="Políticas" 
          icon={CheckCircle2}
          color="text-orange-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Gráfica de Barras (CSS Puro) */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">Gasto por Categoría (MXN)</h3>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </div>
          
          <div className="space-y-6">
            {categories.length > 0 ? categories.map(([cat, amount]) => (
              <div key={cat} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-gray-700 capitalize">{cat.toLowerCase()}</span>
                  <span className="font-black text-gray-900">${amount.toLocaleString()}</span>
                </div>
                <div className="h-3 w-full bg-gray-50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-1000"
                    style={{ width: `${(amount / maxCategoryAmount) * 100}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="text-center text-gray-400 py-10 italic">No hay datos suficientes para graficar.</p>
            )}
          </div>
        </div>

        {/* Distribución de Estados */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">Estado de Solicitudes</h3>
            <PieIcon className="h-4 w-4 text-gray-400" />
          </div>
          
          <div className="flex-1 flex flex-col justify-center space-y-4">
            <StatusRow label="Aprobados" count={stats.byStatus['APPROVED'] || 0} color="bg-green-500" total={stats.count} />
            <StatusRow label="Pendientes" count={stats.byStatus['SUBMITTED'] || 0} color="bg-blue-500" total={stats.count} />
            <StatusRow label="Rechazados" count={stats.byStatus['REJECTED'] || 0} color="bg-red-500" total={stats.count} />
            <StatusRow label="Borradores" count={stats.byStatus['DRAFT'] || 0} color="bg-gray-400" total={stats.count} />
          </div>

          <div className="mt-8 pt-6 border-t border-gray-50 flex justify-between items-center text-xs font-bold text-gray-400 uppercase">
            <span>Total Transacciones</span>
            <span className="text-gray-900 text-lg">{stats.count}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, positive, icon: Icon, color }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3 hover:border-primary/20 transition-colors">
      <div className="flex justify-between items-start">
        <div className={`p-2 rounded-xl bg-gray-50 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className={cn(
          "flex items-center text-[10px] font-black px-2 py-1 rounded-full",
          positive === undefined ? "bg-gray-100 text-gray-600" :
          positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
        )}>
          {positive !== undefined && (positive ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />)}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  );
}

function StatusRow({ label, count, color, total }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-4">
      <div className={cn("h-3 w-3 rounded-full", color)} />
      <div className="flex-1">
        <div className="flex justify-between text-xs font-bold mb-1">
          <span className="text-gray-600">{label}</span>
          <span className="text-gray-900">{count}</span>
        </div>
        <div className="h-1.5 w-full bg-gray-50 rounded-full">
          <div className={cn("h-full rounded-full", color)} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </div>
  );
}

// Icono faltante
const CheckCircle2 = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
)
