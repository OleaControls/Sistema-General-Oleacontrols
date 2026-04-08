import React, { useState, useEffect } from 'react';
import {
  ClipboardList, CheckCircle2, Clock, AlertCircle, Wallet,
  TrendingUp, Users, BarChart3, Loader2, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { otService } from '@/api/otService';
import { expenseService } from '@/api/expenseService';
import { cn } from '@/lib/utils';

const STATUS_LABELS = {
  PENDING:     { label: 'Pendiente',    color: '#f59e0b', bg: 'bg-amber-50',  text: 'text-amber-700' },
  IN_PROGRESS: { label: 'En Proceso',   color: '#3b82f6', bg: 'bg-blue-50',   text: 'text-blue-700' },
  COMPLETED:   { label: 'Completada',   color: '#22c55e', bg: 'bg-green-50',  text: 'text-green-700' },
  CANCELLED:   { label: 'Cancelada',    color: '#ef4444', bg: 'bg-red-50',    text: 'text-red-700' },
  ON_HOLD:     { label: 'En Pausa',     color: '#8b5cf6', bg: 'bg-violet-50', text: 'text-violet-700' },
};

const PIE_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#ef4444', '#8b5cf6'];

function KPICard({ icon: Icon, label, value, sub, color = 'text-primary', bg = 'bg-primary/10' }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={cn('p-3 rounded-xl shrink-0', bg)}>
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-none mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function OpsMetrics() {
  const [ots, setOts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [otsData, expData] = await Promise.all([
        otService.getOTs(),
        expenseService.getAll(),
      ]);
      setOts(Array.isArray(otsData) ? otsData : []);
      setExpenses(Array.isArray(expData) ? expData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const total      = ots.length;
  const completed  = ots.filter(o => o.status === 'COMPLETED').length;
  const pending    = ots.filter(o => o.status === 'PENDING').length;
  const inProgress = ots.filter(o => o.status === 'IN_PROGRESS').length;
  const pct        = total ? Math.round((completed / total) * 100) : 0;

  const totalExp   = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const pendExp    = expenses.filter(e => e.status === 'PENDING').reduce((s, e) => s + (e.amount || 0), 0);

  // ── Pie: OTs por estado ────────────────────────────────────────────────────
  const pieData = Object.entries(STATUS_LABELS).map(([key, v]) => ({
    name: v.label,
    value: ots.filter(o => o.status === key).length,
    color: v.color,
  })).filter(d => d.value > 0);

  // ── Bar: OTs por mes ───────────────────────────────────────────────────────
  const byMonth = {};
  ots.forEach(o => {
    const d = new Date(o.createdAt || o.date || Date.now());
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
    if (!byMonth[key]) byMonth[key] = { label, total: 0, completadas: 0 };
    byMonth[key].total++;
    if (o.status === 'COMPLETED') byMonth[key].completadas++;
  });
  const barData = Object.values(byMonth).slice(-6);

  // ── Técnicos con más OTs ───────────────────────────────────────────────────
  const techMap = {};
  ots.forEach(o => {
    const name = o.technicianName || o.technician?.name || 'Sin asignar';
    if (!techMap[name]) techMap[name] = { name, total: 0, completadas: 0 };
    techMap[name].total++;
    if (o.status === 'COMPLETED') techMap[name].completadas++;
  });
  const techRanking = Object.values(techMap)
    .sort((a, b) => b.completadas - a.completadas)
    .slice(0, 8);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Métricas de Operaciones</h1>
          <p className="text-xs text-gray-400 mt-0.5">Desempeño general del área operativa</p>
        </div>
        <button onClick={load} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <RefreshCw className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={ClipboardList} label="Total OTs"       value={total}      sub="órdenes de trabajo" />
        <KPICard icon={CheckCircle2}  label="Completadas"     value={completed}  sub={`${pct}% de eficiencia`} color="text-green-600" bg="bg-green-50" />
        <KPICard icon={Clock}         label="En Proceso"      value={inProgress} sub="activas ahora" color="text-blue-600" bg="bg-blue-50" />
        <KPICard icon={AlertCircle}   label="Pendientes"      value={pending}    sub="por asignar" color="text-amber-600" bg="bg-amber-50" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <KPICard icon={Wallet}     label="Gasto Total"     value={`$${totalExp.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`} sub="en viáticos" color="text-violet-600" bg="bg-violet-50" />
        <KPICard icon={BarChart3}  label="Por Aprobar"     value={`$${pendExp.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`}  sub="gastos pendientes" color="text-rose-600" bg="bg-rose-50" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OTs por mes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-4">OTs por Mes</h3>
          {barData.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }} />
                <Bar dataKey="total"       name="Total"       fill="#e2e8f0" radius={[6,6,0,0]} />
                <Bar dataKey="completadas" name="Completadas" fill="#22c55e" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* OTs por estado */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-4">Distribución por Estado</h3>
          {pieData.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Ranking técnicos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-4">Ranking de Técnicos</h3>
        {techRanking.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Sin datos</p>
        ) : (
          <div className="space-y-3">
            {techRanking.map((t, i) => {
              const pct = t.total ? Math.round((t.completadas / t.total) * 100) : 0;
              return (
                <div key={t.name} className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-gray-400 w-5 text-right">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-700">{t.name}</span>
                      <span className="text-[10px] font-black text-gray-400">{t.completadas}/{t.total} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
