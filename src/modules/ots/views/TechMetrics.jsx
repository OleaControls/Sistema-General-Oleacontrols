import React, { useState, useEffect } from 'react';
import {
  ClipboardList, CheckCircle2, Clock, Trophy, Receipt,
  TrendingUp, Star, Loader2, RefreshCw, AlertCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { otService } from '@/api/otService';
import { expenseService } from '@/api/expenseService';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

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

const STATUS_MAP = {
  PENDING:     { label: 'Pendiente',  color: 'bg-amber-100 text-amber-700' },
  IN_PROGRESS: { label: 'En Proceso', color: 'bg-blue-100 text-blue-700' },
  COMPLETED:   { label: 'Completada', color: 'bg-green-100 text-green-700' },
  CANCELLED:   { label: 'Cancelada',  color: 'bg-red-100 text-red-700' },
  ON_HOLD:     { label: 'En Pausa',   color: 'bg-violet-100 text-violet-700' },
};

export default function TechMetrics() {
  const { user } = useAuth();
  const [ots, setOts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [otsData, expData] = await Promise.all([
        otService.getOTs({ techId: user?.id }),
        expenseService.getAll({ userId: user?.id }),
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

  const now = new Date();
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.createdAt || e.date || 0);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthExp = thisMonth.reduce((s, e) => s + (e.amount || 0), 0);

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

  // ── Últimas OTs ───────────────────────────────────────────────────────────
  const recent = [...ots]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
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
          <h1 className="text-2xl font-black text-gray-900">Mis Métricas</h1>
          <p className="text-xs text-gray-400 mt-0.5">Tu desempeño personal — {user?.name}</p>
        </div>
        <button onClick={load} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <RefreshCw className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4">
        <KPICard icon={ClipboardList} label="Mis OTs Total"   value={total}     sub="asignadas a mí" />
        <KPICard icon={CheckCircle2}  label="Completadas"     value={completed} sub={`${pct}% de eficiencia`} color="text-green-600" bg="bg-green-50" />
        <KPICard icon={Clock}         label="En Proceso"      value={inProgress} sub="activas ahora" color="text-blue-600" bg="bg-blue-50" />
        <KPICard icon={Receipt}       label="Viáticos del Mes" value={`$${monthExp.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`} sub="en gastos" color="text-violet-600" bg="bg-violet-50" />
      </div>

      {/* Eficiencia */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Mi Eficiencia</h3>
          <span className="text-2xl font-black text-green-600">{pct}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-gray-400">0%</span>
          <span className="text-[10px] text-gray-400 font-bold">
            {pct >= 80 ? '🏆 Excelente' : pct >= 50 ? '⚡ En progreso' : '🎯 Sigue adelante'}
          </span>
          <span className="text-[10px] text-gray-400">100%</span>
        </div>
      </div>

      {/* Chart OTs por mes */}
      {barData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-4">Mis OTs por Mes</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,.08)' }} />
              <Bar dataKey="total"       name="Total"       fill="#e2e8f0" radius={[6,6,0,0]} />
              <Bar dataKey="completadas" name="Completadas" fill="#22c55e" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Últimas OTs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-4">Mis Últimas Órdenes</h3>
        {recent.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Sin órdenes asignadas</p>
        ) : (
          <div className="space-y-2">
            {recent.map(ot => {
              const s = STATUS_MAP[ot.status] || { label: ot.status, color: 'bg-gray-100 text-gray-600' };
              return (
                <div key={ot.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-bold text-gray-800">{ot.title || ot.id}</p>
                    <p className="text-[10px] text-gray-400">{ot.clientName || ot.client?.name || '—'}</p>
                  </div>
                  <span className={cn('text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg', s.color)}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
