import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt, Search, Download, CheckCircle2, XCircle, Clock,
  FileText, MessageSquare, PieChart, BarChart3, Users, Wallet,
  Fuel, Utensils, Home, Settings, Package, X, TrendingUp,
  TrendingDown, ChevronDown, Calendar, Minus, ArrowRight,
  Wrench, Milestone
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { expenseService } from '@/api/expenseService';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import NewExpenseForm from '../components/NewExpenseForm';
import { useAuth } from '@/store/AuthContext';

// ── Categorías ────────────────────────────────────────────────────────────────
const CATEGORIES = {
  COMBUSTIBLE: { icon: Fuel,      color: 'text-orange-500',  bg: 'bg-orange-50',  bar: '#f97316', border: 'border-orange-200' },
  ALIMENTOS:   { icon: Utensils,  color: 'text-emerald-500', bg: 'bg-emerald-50', bar: '#10b981', border: 'border-emerald-200' },
  HOSPEDAJE:   { icon: Home,      color: 'text-blue-500',    bg: 'bg-blue-50',    bar: '#3b82f6', border: 'border-blue-200' },
  REFACCIONES: { icon: Settings,  color: 'text-purple-500',  bg: 'bg-purple-50',  bar: '#a855f7', border: 'border-purple-200' },
  HERRAMIENTAS:{ icon: Wrench,    color: 'text-cyan-500',    bg: 'bg-cyan-50',    bar: '#06b6d4', border: 'border-cyan-200' },
  CASETAS:     { icon: Milestone, color: 'text-rose-500',    bg: 'bg-rose-50',    bar: '#f43f5e', border: 'border-rose-200' },
  OTROS:       { icon: Package,   color: 'text-gray-500',    bg: 'bg-gray-50',    bar: '#6b7280', border: 'border-gray-200' },
};

// ── Helpers de fechas ─────────────────────────────────────────────────────────
function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { start: mon, end: sun };
}

function getMonthRange(year, month) {
  return {
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end:   new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

function isoWeek(date) {
  const d = new Date(date);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - jan1) / 86400000) + jan1.getDay() + 1) / 7);
}

function weekLabel(date) {
  const d = new Date(date);
  const { start, end } = getWeekRange(d);
  const fmt = (x) => x.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

// Genera los últimos 12 meses para el selector
function getLast12Months() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      label: d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
      year:  d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return months;
}

// ── Stat card pequeña ─────────────────────────────────────────────────────────
function StatChip({ label, value, sub, trend, color = 'gray' }) {
  const colors = {
    indigo:  'from-indigo-500 to-indigo-700',
    emerald: 'from-emerald-500 to-emerald-700',
    amber:   'from-amber-400 to-amber-600',
    rose:    'from-rose-500 to-rose-700',
    gray:    'from-gray-700 to-gray-900',
  };
  return (
    <div className={cn('rounded-2xl p-5 text-white bg-gradient-to-br shadow-lg', colors[color])}>
      <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-70">{label}</p>
      <p className="text-2xl font-black mt-1 tracking-tighter">{value}</p>
      {sub && <p className="text-[9px] font-bold opacity-60 mt-1 uppercase tracking-wider">{sub}</p>}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {trend > 0 ? <TrendingUp className="h-3 w-3" /> : trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          <span className="text-[9px] font-black uppercase">
            {trend > 0 ? `+${trend.toFixed(0)}%` : trend < 0 ? `${trend.toFixed(0)}%` : 'Sin cambio'} vs período anterior
          </span>
        </div>
      )}
    </div>
  );
}

// ── Tooltip personalizado para el gráfico ─────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold">
      <p className="text-gray-400 uppercase tracking-widest text-[9px] mb-1">{label}</p>
      <p className="text-white text-base font-black">${payload[0].value.toLocaleString()}</p>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function OperationsExpenses() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [expenses, setExpenses]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showDashboard, setShowDashboard] = useState(true);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [expandedOts, setExpandedOts]   = useState({});

  // Período
  const [viewMode, setViewMode]         = useState('month'); // 'week' | 'month'
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const now = new Date();
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const monthList = useMemo(() => getLast12Months(), []);

  useEffect(() => { loadAllExpenses(); }, []);

  const loadAllExpenses = async () => {
    setLoading(true);
    try {
      const data = await expenseService.getAll();
      setExpenses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ── Rango activo según modo ────────────────────────────────────────────────
  const activeRange = useMemo(() => {
    if (viewMode === 'week') return getWeekRange(new Date());
    return getMonthRange(selectedYear, selectedMonth);
  }, [viewMode, selectedYear, selectedMonth]);

  const prevRange = useMemo(() => {
    if (viewMode === 'week') {
      const prev = new Date();
      prev.setDate(prev.getDate() - 7);
      return getWeekRange(prev);
    }
    const m = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const y = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    return getMonthRange(y, m);
  }, [viewMode, selectedYear, selectedMonth]);

  // ── Gastos filtrados por período ──────────────────────────────────────────
  const periodExpenses = useMemo(() =>
    expenses.filter(e => {
      const d = new Date(e.createdAt);
      return d >= activeRange.start && d <= activeRange.end;
    }), [expenses, activeRange]);

  const prevPeriodExpenses = useMemo(() =>
    expenses.filter(e => {
      const d = new Date(e.createdAt);
      return d >= prevRange.start && d <= prevRange.end;
    }), [expenses, prevRange]);

  // ── Estadísticas del período ──────────────────────────────────────────────
  const stats = useMemo(() => {
    const approved = periodExpenses.filter(e => e.status === 'APPROVED');
    const total    = approved.reduce((s, e) => s + e.amount, 0);

    const prevApproved = prevPeriodExpenses.filter(e => e.status === 'APPROVED');
    const prevTotal    = prevApproved.reduce((s, e) => s + e.amount, 0);
    const trend        = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : undefined;

    const byCategory = approved.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    const byTech = approved.reduce((acc, e) => {
      const name = e.employee?.name || 'Desconocido';
      if (!acc[name]) acc[name] = { total: 0, count: 0 };
      acc[name].total += e.amount;
      acc[name].count += 1;
      return acc;
    }, {});

    const topTechs = Object.entries(byTech)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5);

    const pendingAmount = periodExpenses
      .filter(e => e.status === 'PENDING')
      .reduce((s, e) => s + e.amount, 0);

    // Agrupación semanal dentro del período
    const weeklyMap = {};
    approved.forEach(e => {
      const d = new Date(e.createdAt);
      const key = `S${isoWeek(d)}`;
      if (!weeklyMap[key]) weeklyMap[key] = { label: weekLabel(d), total: 0, week: isoWeek(d) };
      weeklyMap[key].total += e.amount;
    });
    const weekly = Object.values(weeklyMap)
      .sort((a, b) => a.week - b.week)
      .map(w => ({ label: w.label, total: Math.round(w.total) }));

    return {
      total, prevTotal, trend,
      count: approved.length,
      avgTicket: approved.length > 0 ? total / approved.length : 0,
      pendingAmount,
      byCategory,
      topTechs,
      weekly,
    };
  }, [periodExpenses, prevPeriodExpenses]);

  // ── Filtro de tabla ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const sl = searchTerm.toLowerCase();
    return periodExpenses.filter(e => {
      const matchSearch =
        (e.description?.toLowerCase() || '').includes(sl) ||
        (e.otId?.toLowerCase() || '').includes(sl) ||
        (e.employee?.name?.toLowerCase() || '').includes(sl);
      const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [periodExpenses, searchTerm, statusFilter]);

  // ── PDF export ─────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!filtered.length) { alert('No hay datos para exportar.'); return; }
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Reporte de Gastos Operativos – OleaControls', 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Período: ${activeRange.start.toLocaleDateString()} – ${activeRange.end.toLocaleDateString()}`, 14, 28);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 33);
    autoTable(doc, {
      head: [['Fecha', 'Técnico', 'Concepto', 'OT', 'Categoría', 'Monto', 'Estado']],
      body: filtered.map(e => [
        new Date(e.createdAt).toLocaleDateString(),
        e.employee?.name || 'N/A',
        e.description || '—',
        e.otId || '—',
        e.category || '—',
        `$${e.amount.toLocaleString()}`,
        e.status,
      ]),
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 8 },
      columnStyles: { 5: { halign: 'right' } },
    });
    doc.save(`Gastos_${activeRange.start.toISOString().slice(0, 7)}.pdf`);
  };

  const handleSaveExpense = async (formData) => {
    try {
      await expenseService.save({ ...formData, userId: user.id });
      loadAllExpenses();
      setIsExpenseFormOpen(false);
    } catch (e) {
      alert('Error al guardar: ' + e.message);
    }
  };

  // ── Label del período activo ───────────────────────────────────────────────
  const periodLabel = viewMode === 'week'
    ? `Semana ${isoWeek(new Date())} – ${new Date().getFullYear()}`
    : new Date(selectedYear, selectedMonth, 1)
        .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-24">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-none tracking-tighter uppercase">
            Inteligencia de Gastos
          </h2>
          <p className="text-sm text-gray-400 font-medium mt-1.5">
            Monitoreo de inversión operativa y cumplimiento presupuestal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsExpenseFormOpen(true)}
            className="bg-gray-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-black transition-all shadow-lg"
          >
            <Receipt className="h-4 w-4" /> Nuevo Gasto
          </button>
          <button
            onClick={() => setShowDashboard(v => !v)}
            className={cn(
              'px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all border',
              showDashboard
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            )}
          >
            <BarChart3 className="h-4 w-4" />
            {showDashboard ? 'Ocultar Dashboard' : 'Ver Dashboard'}
          </button>
          <button
            onClick={handleExportPDF}
            className="bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:border-gray-400 transition-all"
          >
            <Download className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      {/* ── SELECTOR DE PERÍODO ──────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Semana / Mes */}
        {[{ id: 'week', label: 'Esta Semana' }, { id: 'month', label: 'Por Mes' }].map(m => (
          <button
            key={m.id}
            onClick={() => setViewMode(m.id)}
            className={cn(
              'px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all',
              viewMode === m.id
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            )}
          >
            {m.label}
          </button>
        ))}

        {/* Selector de mes */}
        {viewMode === 'month' && (
          <div className="relative">
            <button
              onClick={() => setShowMonthPicker(v => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border bg-white text-gray-700 border-gray-200 hover:border-indigo-400 transition-all"
            >
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              {periodLabel}
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showMonthPicker && 'rotate-180')} />
            </button>
            {showMonthPicker && (
              <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 min-w-[220px] max-h-72 overflow-y-auto">
                {monthList.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSelectedYear(m.year);
                      setSelectedMonth(m.month);
                      setShowMonthPicker(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all capitalize',
                      selectedYear === m.year && selectedMonth === m.month
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chip período activo */}
        <span className="ml-auto text-[10px] font-black text-gray-400 uppercase tracking-widest hidden md:block">
          {activeRange.start.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
          {' '}–{' '}
          {activeRange.end.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </div>

      {/* ── DASHBOARD ───────────────────────────────────────────────────── */}
      {showDashboard && (
        <div className="space-y-4">

          {/* KPIs principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60">Inversión Aprobada</p>
              <p className="text-3xl font-black mt-1 tracking-tighter">
                ${stats.total.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
              </p>
              {stats.trend !== undefined && (
                <div className={cn(
                  'flex items-center gap-1 mt-2 text-[9px] font-black',
                  stats.trend > 0 ? 'text-rose-300' : 'text-emerald-300'
                )}>
                  {stats.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(stats.trend).toFixed(1)}% vs período anterior
                </div>
              )}
              <Wallet className="absolute right-[-16px] bottom-[-16px] h-28 w-28 opacity-10 rotate-12" />
            </div>

            <StatChip
              label="Ticket Promedio"
              value={`$${stats.avgTicket.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`}
              sub={`${stats.count} gastos aprobados`}
              color="gray"
            />
            <StatChip
              label="En Cola (Pendiente)"
              value={`$${stats.pendingAmount.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`}
              sub="Por aprobar"
              color="amber"
            />
            <StatChip
              label="Período Anterior"
              value={`$${stats.prevTotal.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`}
              sub={viewMode === 'week' ? 'Semana pasada' : 'Mes anterior'}
              color="gray"
            />
          </div>

          {/* Gráfico semanal + Categorías + Top Técnicos */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

            {/* Gráfico de barras por semana */}
            <div className="md:col-span-5 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-500" />
                  Gasto por Semana
                </h3>
                <span className="text-[9px] text-gray-400 font-bold uppercase">{periodLabel}</span>
              </div>
              {stats.weekly.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-gray-300">
                  <p className="text-xs font-bold uppercase">Sin gastos aprobados</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.weekly} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 8, fontWeight: 700, fill: '#9ca3af' }}
                      tickLine={false} axisLine={false}
                      tickFormatter={v => v.split(' – ')[0]}
                    />
                    <YAxis
                      tick={{ fontSize: 8, fontWeight: 700, fill: '#9ca3af' }}
                      tickLine={false} axisLine={false}
                      tickFormatter={v => `$${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
                    <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                      {stats.weekly.map((_, i) => (
                        <Cell
                          key={i}
                          fill={i === stats.weekly.length - 1 ? '#4f46e5' : '#c7d2fe'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Uso por categoría */}
            <div className="md:col-span-4 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest flex items-center gap-2 mb-5">
                <PieChart className="h-4 w-4 text-indigo-500" /> Uso por Categoría
              </h3>
              {Object.keys(stats.byCategory).length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-300">
                  <p className="text-xs font-bold uppercase">Sin datos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amount]) => {
                      const cfg = CATEGORIES[cat] || CATEGORIES.OTROS;
                      const pct = stats.total > 0 ? (amount / stats.total) * 100 : 0;
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className={cn('p-1 rounded-lg', cfg.bg)}>
                                <cfg.icon className={cn('h-3 w-3', cfg.color)} />
                              </div>
                              <span className="text-[10px] font-black text-gray-700 uppercase">{cat}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] font-black text-gray-900">
                                ${amount.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                              </span>
                              <span className="text-[9px] text-gray-400 ml-1">{pct.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, backgroundColor: cfg.bar }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Top técnicos */}
            <div className="md:col-span-3 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
              <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest flex items-center gap-2 mb-5">
                <Users className="h-4 w-4 text-indigo-500" /> Top Técnicos
              </h3>
              {stats.topTechs.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-300">
                  <p className="text-xs font-bold uppercase">Sin datos</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {stats.topTechs.map(([name, data], i) => {
                    const pct = stats.total > 0 ? (data.total / stats.total) * 100 : 0;
                    const colors = ['bg-indigo-600', 'bg-indigo-400', 'bg-indigo-300', 'bg-gray-400', 'bg-gray-300'];
                    return (
                      <div key={name} className="flex items-center gap-3">
                        <div className={cn(
                          'h-6 w-6 rounded-lg flex items-center justify-center text-white font-black text-[10px] shrink-0',
                          colors[i] || 'bg-gray-300'
                        )}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-gray-900 truncate leading-none">{name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', colors[i] || 'bg-gray-300')}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-black text-gray-500 shrink-0">
                              ${data.total.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TABLA DE GASTOS ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
        {/* Filtros */}
        <div className="p-5 border-b bg-gray-50/40 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Técnico, OT, concepto…"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-400 font-bold text-sm"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
            {[
              { key: 'ALL',      label: 'Todos' },
              { key: 'APPROVED', label: 'Aprobados' },
              { key: 'PENDING',  label: 'Pendientes' },
              { key: 'REJECTED', label: 'Rechazados' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setStatusFilter(s.key)}
                className={cn(
                  'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border whitespace-nowrap transition-all',
                  statusFilter === s.key
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="bg-gray-50/60 border-b text-[9px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Técnico / Fecha</th>
                <th className="px-5 py-4">Concepto / OT</th>
                <th className="px-5 py-4">Observaciones</th>
                <th className="px-5 py-4 text-right">Monto</th>
                <th className="px-5 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-16 text-center text-gray-300 font-black uppercase text-xs tracking-widest animate-pulse">
                    Cargando gastos…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-8 py-16 text-center">
                    <Receipt className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-400 font-black text-xs uppercase tracking-widest">Sin gastos en este período</p>
                  </td>
                </tr>
              ) : (
                Object.entries(
                  filtered.reduce((acc, e) => {
                    const key = e.otId || 'SIN_OT';
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(e);
                    return acc;
                  }, {})
                ).map(([otId, otExpenses]) => (
                  <React.Fragment key={otId}>
                    {/* OT header */}
                    <tr
                      onClick={() => setExpandedOts(p => ({ ...p, [otId]: !p[otId] }))}
                      className="bg-indigo-50/40 hover:bg-indigo-50/70 cursor-pointer transition-colors border-l-4 border-l-indigo-500"
                    >
                      <td colSpan="3" className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <ChevronDown className={cn(
                            'h-4 w-4 text-indigo-500 transition-transform duration-200',
                            expandedOts[otId] && 'rotate-180'
                          )} />
                          <span className="text-[11px] font-black text-gray-800 uppercase tracking-wider">
                            {otId === 'SIN_OT' ? 'Gastos Generales' : `OT #${otId}`}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 bg-white px-2 py-0.5 rounded-full border">
                            {otExpenses.length} {otExpenses.length === 1 ? 'gasto' : 'gastos'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <p className="text-sm font-black text-indigo-700">
                          ${otExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                        </p>
                      </td>
                      <td colSpan="2" />
                    </tr>

                    {/* Filas de gastos */}
                    {expandedOts[otId] && otExpenses.map(exp => {
                      const cfg = CATEGORIES[exp.category] || CATEGORIES.OTROS;
                      return (
                        <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors border-l-4 border-l-transparent">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-700 text-sm uppercase shrink-0">
                                {exp.employee?.name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-gray-900 leading-none">
                                  {exp.employee?.name || 'Técnico'}
                                </p>
                                <p className="text-[9px] text-gray-400 font-bold mt-0.5 uppercase">
                                  {new Date(exp.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-gray-900">{exp.description || '—'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {exp.otId && (
                                <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                  #{exp.otId}
                                </span>
                              )}
                              <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded', cfg.bg)}>
                                <cfg.icon className={cn('h-2.5 w-2.5', cfg.color)} />
                                <span className={cn('text-[8px] font-black uppercase', cfg.color)}>{exp.category}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {exp.comment ? (
                              <div className="flex items-start gap-1.5 max-w-[180px]">
                                <MessageSquare className="h-3 w-3 text-gray-400 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-gray-500 italic leading-snug">"{exp.comment}"</p>
                              </div>
                            ) : (
                              <span className="text-[9px] text-gray-300 font-bold uppercase italic">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <p className="text-sm font-black text-gray-900">
                              ${exp.amount.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-[8px] text-gray-400 font-bold">MXN</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn(
                              'text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border',
                              exp.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              exp.status === 'PENDING'  ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                         'bg-red-50 text-red-700 border-red-200'
                            )}>
                              {exp.status === 'APPROVED' ? '✓ Aprobado'
                                : exp.status === 'PENDING' ? '⏳ Pendiente'
                                : '✕ Rechazado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => navigate(`/ots/${exp.workOrder?.id || exp.otId}`)}
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Ver OT"
                              >
                                <FileText className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => exp.receipt
                                  ? setSelectedImage(exp.receipt)
                                  : alert('Sin evidencia cargada.')}
                                className={cn(
                                  'p-2 rounded-lg transition-all',
                                  exp.receipt
                                    ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                    : 'text-gray-200 cursor-not-allowed'
                                )}
                                title={exp.receipt ? 'Ver evidencia' : 'Sin evidencia'}
                              >
                                <Receipt className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer contador */}
        <div className="px-6 py-3 border-t bg-gray-50/40 flex items-center justify-between">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''} · {periodLabel}
          </p>
          <p className="text-[9px] font-black text-gray-700 uppercase">
            Total visible: ${filtered.reduce((s, e) => s + e.amount, 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* ── MODAL EVIDENCIA ──────────────────────────────────────────────── */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-10">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-5 right-5 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col items-center gap-4">
            {selectedImage.startsWith('data:application/pdf') || selectedImage.toLowerCase().endsWith('.pdf') ? (
              <iframe src={selectedImage} className="w-full h-[80vh] rounded-2xl bg-white" title="PDF" />
            ) : (
              <img
                src={selectedImage}
                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl object-contain border-4 border-white/10"
                alt="Evidencia"
              />
            )}
            <a
              href={selectedImage}
              download={`Evidencia_${Date.now()}`}
              className="bg-white text-gray-900 px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center gap-2 shadow-xl"
            >
              <Download className="h-4 w-4" /> Descargar
            </a>
          </div>
        </div>
      )}

      <NewExpenseForm
        isOpen={isExpenseFormOpen}
        onClose={() => setIsExpenseFormOpen(false)}
        onSave={handleSaveExpense}
      />
    </div>
  );
}
