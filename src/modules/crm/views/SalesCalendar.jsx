import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar,
  MapPin, PhoneCall, Coffee, ClipboardCheck, CheckSquare,
  MessageSquare, Send, MessageCircle, User, Loader2,
  RefreshCw, Building2, Target, Clock, FileText,
  BarChart2, Activity, TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { useAuth, ROLES } from '@/store/AuthContext';

// ── Metadatos de tipo ──────────────────────────────────────────────────────────
const TYPE_META = {
  VISIT:        { label: 'Visita',        icon: MapPin,         bg: 'bg-green-100',   text: 'text-green-700',   pill: 'bg-green-500',    border: 'border-green-200'   },
  MEETING:      { label: 'Reunión',       icon: Coffee,         bg: 'bg-amber-100',   text: 'text-amber-700',   pill: 'bg-amber-500',    border: 'border-amber-200'   },
  CALL:         { label: 'Llamada',       icon: PhoneCall,      bg: 'bg-blue-100',    text: 'text-blue-700',    pill: 'bg-blue-500',     border: 'border-blue-200'    },
  SEGUIMIENTO:  { label: 'Seguimiento',   icon: ClipboardCheck, bg: 'bg-indigo-100',  text: 'text-indigo-700',  pill: 'bg-indigo-500',   border: 'border-indigo-200'  },
  TASK:         { label: 'Tarea',         icon: CheckSquare,    bg: 'bg-emerald-100', text: 'text-emerald-700', pill: 'bg-emerald-500',  border: 'border-emerald-200' },
  NOTE:         { label: 'Nota',          icon: MessageSquare,  bg: 'bg-gray-100',    text: 'text-gray-600',    pill: 'bg-gray-400',     border: 'border-gray-200'    },
  EMAIL:        { label: 'Correo',        icon: Send,           bg: 'bg-purple-100',  text: 'text-purple-700',  pill: 'bg-purple-500',   border: 'border-purple-200'  },
  MESSAGE:      { label: 'Mensaje',       icon: MessageCircle,  bg: 'bg-teal-100',    text: 'text-teal-700',    pill: 'bg-teal-500',     border: 'border-teal-200'    },
  QUOTE:        { label: 'Cotización',    icon: FileText,       bg: 'bg-orange-100',  text: 'text-orange-700',  pill: 'bg-orange-500',   border: 'border-orange-200'  },
  STAGE_CHANGE: { label: 'Cambio etapa', icon: TrendingUp,     bg: 'bg-violet-100',  text: 'text-violet-700',  pill: 'bg-violet-500',   border: 'border-violet-200'  },
};

const ALL_TYPES    = Object.keys(TYPE_META);
const SCHEDULABLE  = ['VISIT', 'MEETING', 'CALL', 'SEGUIMIENTO', 'TASK', 'NOTE', 'EMAIL', 'MESSAGE'];

const SELLER_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-rose-500',
  'bg-amber-500', 'bg-teal-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500',
];

const DAYS_ES   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
                   'Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ── Helpers de fecha ───────────────────────────────────────────────────────────
function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const cells = [];
  for (let i = first.getDay() - 1; i >= 0; i--) cells.push({ date: new Date(year, month, -i), current: false });
  for (let d = 1; d <= last.getDate(); d++) cells.push({ date: new Date(year, month, d), current: true });
  while (cells.length % 7 !== 0) {
    const next = new Date(cells[cells.length - 1].date);
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, current: false });
  }
  return cells;
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(date) {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

const BLANK = { type: 'VISIT', content: '', dueDate: '', dealId: '' };

// ── Componente principal ───────────────────────────────────────────────────────
export default function SalesCalendar() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [viewMode,     setViewMode]     = useState('month'); // 'week' | 'month' | 'year'
  const [currentDate,  setCurrentDate]  = useState(new Date());
  const [activities,   setActivities]   = useState([]);
  const [deals,        setDeals]        = useState([]);
  const [sellers,      setSellers]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);

  const [filterSeller, setFilterSeller] = useState('');
  const [filterType,   setFilterType]   = useState('');

  const [selectedDay,  setSelectedDay]  = useState(null);
  const [newAct,       setNewAct]       = useState(BLANK);
  const [dealSearch,   setDealSearch]   = useState('');
  const [showDealList, setShowDealList] = useState(false);

  const sellerColorIdx = useMemo(() => {
    const m = {};
    sellers.forEach((s, i) => { m[s.id] = i % SELLER_COLORS.length; });
    return m;
  }, [sellers]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '2000' });
      if (filterSeller) params.set('sellerId', filterSeller);
      if (filterType)   params.set('type',     filterType);

      const reqs = [
        apiFetch(`/api/crm/activity-feed?${params}`),
        apiFetch('/api/crm/deals'),
        ...(isAdmin ? [apiFetch('/api/employees')] : []),
      ];
      const results             = await Promise.all(reqs);
      const [actsR, dealsR, sellersR] = results;
      const [actsD, dealsD]     = await Promise.all([actsR.json(), dealsR.json()]);

      setActivities(Array.isArray(actsD) ? actsD : []);
      setDeals(Array.isArray(dealsD) ? dealsD : []);

      if (sellersR) {
        const sd = await sellersR.json();
        setSellers(Array.isArray(sd) ? sd.filter(e => e.roles?.includes('SALES') || e.roles?.includes('ADMIN')) : []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterSeller, filterType, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Indexar actividades por fecha ──────────────────────────────────────────
  const actsByDate = useMemo(() => {
    const m = {};
    activities.forEach(a => {
      const raw = a.dueDate || a.createdAt;
      if (!raw) return;
      const key = raw.split('T')[0];
      if (!m[key]) m[key] = [];
      m[key].push(a);
    });
    return m;
  }, [activities]);

  // ── Estadísticas del período actual ───────────────────────────────────────
  const periodStats = useMemo(() => {
    const y  = currentDate.getFullYear();
    const mo = currentDate.getMonth();

    let periodActs = [];
    if (viewMode === 'year') {
      periodActs = activities.filter(a => {
        const raw = a.dueDate || a.createdAt;
        return raw && new Date(raw).getFullYear() === y;
      });
    } else if (viewMode === 'month') {
      periodActs = activities.filter(a => {
        const raw = a.dueDate || a.createdAt;
        if (!raw) return false;
        const d = new Date(raw);
        return d.getFullYear() === y && d.getMonth() === mo;
      });
    } else {
      const weekDays = getWeekDays(currentDate);
      const start = toDateKey(weekDays[0]);
      const end   = toDateKey(weekDays[6]);
      periodActs = activities.filter(a => {
        const raw = a.dueDate || a.createdAt;
        if (!raw) return false;
        const key = raw.split('T')[0];
        return key >= start && key <= end;
      });
    }

    const byType = {};
    periodActs.forEach(a => { byType[a.type] = (byType[a.type] || 0) + 1; });

    // top 5 días más activos
    const daysMap = {};
    periodActs.forEach(a => {
      const raw = a.dueDate || a.createdAt;
      if (!raw) return;
      const key = raw.split('T')[0];
      daysMap[key] = (daysMap[key] || 0) + 1;
    });
    const topDay = Object.entries(daysMap).sort((a, b) => b[1] - a[1])[0];

    return { total: periodActs.length, byType, topDay };
  }, [activities, viewMode, currentDate]);

  // ── Datos anuales por mes ─────────────────────────────────────────────────
  const yearData = useMemo(() => {
    const y = currentDate.getFullYear();
    return Array.from({ length: 12 }, (_, mo) => {
      const monthActs = activities.filter(a => {
        const raw = a.dueDate || a.createdAt;
        if (!raw) return false;
        const d = new Date(raw);
        return d.getFullYear() === y && d.getMonth() === mo;
      });
      const byType = {};
      monthActs.forEach(a => { byType[a.type] = (byType[a.type] || 0) + 1; });
      return { month: mo, total: monthActs.length, byType };
    });
  }, [activities, currentDate]);

  const maxMonthCount = useMemo(() => Math.max(1, ...yearData.map(m => m.total)), [yearData]);

  // ── Datos semanales ───────────────────────────────────────────────────────
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // ── Navegación ────────────────────────────────────────────────────────────
  const prev = () => {
    if (viewMode === 'year')  setCurrentDate(d => new Date(d.getFullYear() - 1, d.getMonth(), 1));
    if (viewMode === 'month') setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    if (viewMode === 'week')  setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  };
  const next = () => {
    if (viewMode === 'year')  setCurrentDate(d => new Date(d.getFullYear() + 1, d.getMonth(), 1));
    if (viewMode === 'month') setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    if (viewMode === 'week')  setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  };
  const goToday = () => { setCurrentDate(new Date()); setSelectedDay(new Date()); };

  const periodLabel = useMemo(() => {
    const y  = currentDate.getFullYear();
    const mo = currentDate.getMonth();
    if (viewMode === 'year')  return String(y);
    if (viewMode === 'month') return `${MONTHS_ES[mo]} ${y}`;
    const ws = weekDays[0], we = weekDays[6];
    if (ws.getMonth() === we.getMonth())
      return `${ws.getDate()}–${we.getDate()} ${MONTHS_SHORT[ws.getMonth()]} ${y}`;
    return `${ws.getDate()} ${MONTHS_SHORT[ws.getMonth()]} – ${we.getDate()} ${MONTHS_SHORT[we.getMonth()]} ${y}`;
  }, [viewMode, currentDate, weekDays]);

  const monthGrid = useMemo(
    () => buildMonthGrid(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const dayActivities = useMemo(
    () => (selectedDay ? actsByDate[toDateKey(selectedDay)] || [] : []),
    [selectedDay, actsByDate]
  );

  const matchedDeals = useMemo(() => {
    const q = dealSearch.trim().toLowerCase();
    if (!q) return deals.slice(0, 8);
    return deals.filter(d => d.title?.toLowerCase().includes(q) || d.company?.toLowerCase().includes(q)).slice(0, 8);
  }, [deals, dealSearch]);

  const today = toDateKey(new Date());

  const openDay = (date) => {
    setSelectedDay(date);
    setNewAct({ ...BLANK, dueDate: toDateKey(date) });
    setDealSearch('');
    setShowDealList(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!newAct.content.trim() || !newAct.dueDate) return;
    setSaving(true);
    try {
      const body = { type: newAct.type, content: newAct.content, dueDate: newAct.dueDate, status: 'PENDING', authorName: user?.name || 'Usuario' };
      if (newAct.dealId) body.dealId = newAct.dealId;
      const res = await apiFetch('/api/crm/deal-activities', { method: 'POST', body: JSON.stringify(body) });
      if (res.ok) {
        setNewAct({ ...BLANK, dueDate: toDateKey(selectedDay) });
        setDealSearch('');
        await fetchData();
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-gray-50/30 overflow-hidden flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0 gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Agenda de Ventas
          </h2>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
            {isAdmin ? 'Vista Admin — todos los vendedores' : 'Mis actividades'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Toggle vista */}
          <div className="flex rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
            {[{ id: 'week', label: 'Semana' }, { id: 'month', label: 'Mes' }, { id: 'year', label: 'Año' }].map(v => (
              <button
                key={v.id}
                onClick={() => { setViewMode(v.id); setSelectedDay(null); }}
                className={cn(
                  'px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all',
                  viewMode === v.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
                )}
              >{v.label}</button>
            ))}
          </div>

          <button onClick={goToday} className="px-3 py-2 text-[10px] font-black text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl uppercase tracking-widest transition-colors">
            Hoy
          </button>

          {isAdmin && sellers.length > 0 && (
            <select className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 font-bold text-xs text-gray-700 outline-none cursor-pointer" value={filterSeller} onChange={e => setFilterSeller(e.target.value)}>
              <option value="">Todos los vendedores</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}

          <select className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 font-bold text-xs text-gray-700 outline-none cursor-pointer" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Todos los tipos</option>
            {ALL_TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
          </select>

          <button onClick={fetchData} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors" title="Actualizar">
            <RefreshCw className={cn('h-4 w-4 text-gray-500', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── Barra resumen ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-6 overflow-x-auto">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="h-8 w-8 bg-gray-900 rounded-xl flex items-center justify-center">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xl font-black text-gray-900 leading-none">{periodStats.total}</p>
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">actividades</p>
          </div>
        </div>

        <div className="w-px h-8 bg-gray-100 flex-shrink-0" />

        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(periodStats.byType)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => {
              const meta = TYPE_META[type];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <div key={type} className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[9px] font-black', meta.bg, meta.text)}>
                  <Icon className="h-3 w-3" />
                  <span>{meta.label}</span>
                  <span className="font-black opacity-70">·</span>
                  <span>{count}</span>
                </div>
              );
            })}
          {periodStats.total === 0 && (
            <p className="text-[9px] font-bold text-gray-400">Sin actividades en este período</p>
          )}
        </div>

        {periodStats.topDay && (
          <>
            <div className="w-px h-8 bg-gray-100 flex-shrink-0 ml-auto" />
            <div className="flex-shrink-0 text-right">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Día más activo</p>
              <p className="text-xs font-black text-gray-700">
                {new Date(periodStats.topDay[0] + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                <span className="ml-1 text-primary">({periodStats.topDay[1]})</span>
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Cuerpo principal ───────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Área central */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Navegación período */}
          <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-gray-50 flex-shrink-0">
            <button onClick={prev} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h3 className="text-base font-black text-gray-900 tracking-tight capitalize">{periodLabel}</h3>
            <button onClick={next} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cargando…</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Vista MES ─────────────────────────────────────────────── */}
              {viewMode === 'month' && (
                <div className="flex-1 overflow-y-auto flex flex-col">
                  {/* Cabecera días */}
                  <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100 flex-shrink-0">
                    {DAYS_ES.map(d => (
                      <div key={d} className="py-2 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">{d}</div>
                    ))}
                  </div>
                  <div className="flex-1">
                    <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 h-full">
                      {monthGrid.map((cell, i) => {
                        const key     = toDateKey(cell.date);
                        const dayActs = actsByDate[key] || [];
                        const isToday = key === today;
                        const isSel   = selectedDay && toDateKey(selectedDay) === key;

                        return (
                          <div
                            key={i}
                            onClick={() => openDay(cell.date)}
                            className={cn(
                              'min-h-[100px] p-2 cursor-pointer transition-colors relative group',
                              cell.current ? 'bg-white hover:bg-primary/3' : 'bg-gray-50/60',
                              isSel && 'bg-primary/5 ring-2 ring-inset ring-primary/25',
                            )}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={cn(
                                'inline-flex items-center justify-center w-6 h-6 text-[11px] font-black rounded-full',
                                isToday ? 'bg-primary text-white' : cell.current ? 'text-gray-800' : 'text-gray-300',
                              )}>
                                {cell.date.getDate()}
                              </span>
                              {dayActs.length > 0 && (
                                <span className="text-[8px] font-black text-gray-400 bg-gray-100 rounded-md px-1.5 py-0.5">
                                  {dayActs.length}
                                </span>
                              )}
                            </div>

                            <div className="space-y-0.5">
                              {dayActs.slice(0, 3).map(act => {
                                const meta = TYPE_META[act.type] || TYPE_META.NOTE;
                                const Icon = meta.icon;
                                return (
                                  <div key={act.id} className={cn('flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] font-black truncate leading-tight', meta.bg, meta.text)}>
                                    <Icon className="h-2.5 w-2.5 flex-shrink-0" />
                                    <span className="truncate">{act.deal?.title || act.content}</span>
                                  </div>
                                );
                              })}
                              {dayActs.length > 3 && (
                                <p className="text-[8px] font-black text-gray-400 px-1.5">+{dayActs.length - 3} más</p>
                              )}
                            </div>

                            <button
                              onClick={e => { e.stopPropagation(); openDay(cell.date); }}
                              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 bg-primary text-white rounded-full p-0.5 transition-opacity shadow-sm"
                            >
                              <Plus className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Vista SEMANA ──────────────────────────────────────────── */}
              {viewMode === 'week' && (
                <div className="flex-1 overflow-hidden flex flex-col">
                  {/* Headers días */}
                  <div className="grid grid-cols-7 border-b border-gray-100 flex-shrink-0 bg-white">
                    {weekDays.map((day, i) => {
                      const key     = toDateKey(day);
                      const count   = (actsByDate[key] || []).length;
                      const isToday = key === today;
                      const isSel   = selectedDay && toDateKey(selectedDay) === key;
                      return (
                        <div
                          key={i}
                          onClick={() => openDay(day)}
                          className={cn(
                            'px-2 py-3 text-center cursor-pointer border-r border-gray-100 last:border-0 transition-colors hover:bg-gray-50',
                            isSel && 'bg-primary/5'
                          )}
                        >
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{DAYS_ES[day.getDay()]}</p>
                          <span className={cn(
                            'inline-flex items-center justify-center w-8 h-8 mx-auto text-sm font-black rounded-full mt-0.5',
                            isToday ? 'bg-primary text-white' : 'text-gray-700'
                          )}>
                            {day.getDate()}
                          </span>
                          {count > 0 && (
                            <div className="mt-1 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 bg-gray-900 text-white rounded-full text-[8px] font-black">
                              {count}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Contenido días */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-7 divide-x divide-gray-100 h-full min-h-0">
                      {weekDays.map((day, i) => {
                        const key     = toDateKey(day);
                        const dayActs = actsByDate[key] || [];
                        const isToday = key === today;
                        const isSel   = selectedDay && toDateKey(selectedDay) === key;

                        return (
                          <div
                            key={i}
                            className={cn(
                              'p-2 space-y-1.5 cursor-pointer min-h-[300px]',
                              isToday ? 'bg-primary/2' : 'bg-white',
                              isSel && 'bg-primary/5',
                            )}
                            onClick={() => openDay(day)}
                          >
                            {dayActs.length === 0 && (
                              <div className="flex items-center justify-center py-8 opacity-0 hover:opacity-100 transition-opacity">
                                <Plus className="h-4 w-4 text-gray-300" />
                              </div>
                            )}
                            {dayActs.map(act => {
                              const meta = TYPE_META[act.type] || TYPE_META.NOTE;
                              const Icon = meta.icon;
                              return (
                                <div key={act.id} className={cn('rounded-xl p-2 border text-[9px]', meta.bg, meta.border)}>
                                  <div className={cn('flex items-center gap-1 font-black mb-0.5', meta.text)}>
                                    <Icon className="h-2.5 w-2.5 flex-shrink-0" />
                                    <span>{meta.label}</span>
                                  </div>
                                  <p className="text-gray-700 font-bold leading-tight line-clamp-2">{act.content}</p>
                                  {act.deal?.title && (
                                    <p className="text-gray-400 font-bold mt-0.5 truncate flex items-center gap-0.5">
                                      <Building2 className="h-2 w-2 flex-shrink-0" />{act.deal.title}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Vista AÑO ─────────────────────────────────────────────── */}
              {viewMode === 'year' && (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {yearData.map(({ month, total, byType }) => {
                      const isCurrentMonth =
                        new Date().getFullYear() === currentDate.getFullYear() &&
                        new Date().getMonth() === month;
                      const barHeight = total > 0 ? Math.max(4, Math.round((total / maxMonthCount) * 48)) : 0;
                      const topTypes  = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 4);

                      return (
                        <div
                          key={month}
                          onClick={() => { setCurrentDate(new Date(currentDate.getFullYear(), month, 1)); setViewMode('month'); }}
                          className={cn(
                            'bg-white rounded-3xl border p-5 cursor-pointer hover:shadow-md transition-all group',
                            isCurrentMonth ? 'border-primary/30 ring-2 ring-primary/20' : 'border-gray-100',
                          )}
                        >
                          {/* Nombre mes */}
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className={cn('text-base font-black tracking-tight', isCurrentMonth ? 'text-primary' : 'text-gray-900')}>
                                {MONTHS_ES[month]}
                              </p>
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{currentDate.getFullYear()}</p>
                            </div>
                            <div className={cn(
                              'h-9 w-9 rounded-2xl flex items-center justify-center font-black text-sm transition-all',
                              total > 0 ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400',
                              'group-hover:bg-primary group-hover:text-white'
                            )}>
                              {total}
                            </div>
                          </div>

                          {/* Barra de volumen */}
                          <div className="flex items-end gap-0.5 mb-3 h-12">
                            {Array.from({ length: 31 }, (_, d) => {
                              const key = `${currentDate.getFullYear()}-${String(month+1).padStart(2,'0')}-${String(d+1).padStart(2,'0')}`;
                              const count = (actsByDate[key] || []).length;
                              const daysInMonth = new Date(currentDate.getFullYear(), month + 1, 0).getDate();
                              if (d >= daysInMonth) return null;
                              const h = count > 0 ? Math.max(3, Math.min(48, count * 8)) : 2;
                              return (
                                <div
                                  key={d}
                                  className={cn('flex-1 rounded-sm transition-all', count > 0 ? 'bg-primary/70' : 'bg-gray-100')}
                                  style={{ height: h }}
                                  title={`Día ${d+1}: ${count} actividad${count !== 1 ? 'es' : ''}`}
                                />
                              );
                            })}
                          </div>

                          {/* Desglose por tipo */}
                          {topTypes.length > 0 ? (
                            <div className="space-y-1">
                              {topTypes.map(([type, count]) => {
                                const meta = TYPE_META[type];
                                if (!meta) return null;
                                const Icon = meta.icon;
                                const pct = Math.round((count / total) * 100);
                                return (
                                  <div key={type} className="flex items-center gap-2">
                                    <div className={cn('h-4 w-4 rounded-md flex items-center justify-center flex-shrink-0', meta.bg)}>
                                      <Icon className={cn('h-2.5 w-2.5', meta.text)} />
                                    </div>
                                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                      <div className={cn('h-full rounded-full', meta.pill)} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-[8px] font-black text-gray-500 w-5 text-right">{count}</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[9px] font-bold text-gray-300 text-center py-1">Sin actividades</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Panel lateral del día ──────────────────────────────────────── */}
        <AnimatePresence>
          {selectedDay && viewMode !== 'year' && (
            <motion.aside
              initial={{ x: 360, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 360, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-80 border-l border-gray-100 bg-white flex flex-col overflow-hidden flex-shrink-0"
            >
              {/* Header panel */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    {DAYS_FULL[selectedDay.getDay()]}
                  </p>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tighter">
                    {selectedDay.getDate()} {MONTHS_ES[selectedDay.getMonth()]}
                  </h3>
                  <p className="text-[9px] text-gray-400 font-bold mt-0.5">{selectedDay.getFullYear()}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {dayActivities.length > 0 ? (
                      <>
                        <span className="text-[8px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {dayActivities.length} {dayActivities.length === 1 ? 'actividad' : 'actividades'}
                        </span>
                        {Object.entries(
                          dayActivities.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {})
                        ).map(([type, count]) => {
                          const meta = TYPE_META[type];
                          if (!meta) return null;
                          return (
                            <span key={type} className={cn('text-[7px] font-black px-1.5 py-0.5 rounded-md', meta.bg, meta.text)}>
                              {meta.label} {count}
                            </span>
                          );
                        })}
                      </>
                    ) : (
                      <span className="text-[9px] font-bold text-gray-400">Sin actividades</span>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedDay(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors mt-1">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              {/* Lista actividades del día */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {dayActivities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Calendar className="h-10 w-10 text-gray-200" />
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest text-center">Sin actividades<br />este día</p>
                  </div>
                ) : (
                  dayActivities.map(act => {
                    const meta = TYPE_META[act.type] || TYPE_META.NOTE;
                    const Icon = meta.icon;
                    return (
                      <div key={act.id} className={cn('rounded-2xl p-3 border', meta.bg, meta.border)}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="p-1.5 rounded-lg bg-white/60">
                            <Icon className={cn('h-3.5 w-3.5', meta.text)} />
                          </div>
                          <span className={cn('text-[9px] font-black uppercase tracking-widest', meta.text)}>
                            {meta.label}
                          </span>
                          {act.dueDate ? (
                            <span className="text-[8px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-md">Programada</span>
                          ) : (
                            <span className="text-[8px] font-black text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">Registrada</span>
                          )}
                        </div>
                        {act.deal?.title && (
                          <p className="text-[10px] font-black text-gray-700 flex items-center gap-1 mb-1 truncate">
                            <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />{act.deal.title}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 font-medium leading-snug">{act.content}</p>
                        {(act.authorName || act.deal?.assignedTo?.name) && (
                          <p className="text-[8px] font-bold text-gray-400 mt-2 flex items-center gap-1">
                            <User className="h-2.5 w-2.5" />{act.deal?.assignedTo?.name || act.authorName}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Formulario nueva actividad */}
              <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/60 flex-shrink-0">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Plus className="h-3 w-3 text-primary" /> Registrar actividad
                </p>
                <form onSubmit={handleSave} className="space-y-2.5">
                  <div className="grid grid-cols-4 gap-1">
                    {SCHEDULABLE.map(t => {
                      const meta   = TYPE_META[t];
                      const Icon   = meta.icon;
                      const active = newAct.type === t;
                      return (
                        <button
                          key={t} type="button"
                          onClick={() => setNewAct(f => ({ ...f, type: t }))}
                          className={cn(
                            'flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition-all text-[7px] font-black uppercase leading-tight',
                            active ? cn(meta.bg, meta.text, 'border-current shadow-sm') : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {meta.label.slice(0, 6)}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <input
                      type="text" placeholder="Trato vinculado (opcional)…"
                      value={dealSearch}
                      onFocus={() => setShowDealList(true)}
                      onChange={e => { setDealSearch(e.target.value); setNewAct(f => ({ ...f, dealId: '' })); setShowDealList(true); }}
                      className="w-full bg-white rounded-xl px-3 py-2.5 text-xs font-bold outline-none border border-gray-200 focus:border-primary/50 focus:ring-2 ring-primary/10"
                    />
                    {newAct.dealId && <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />}
                    <AnimatePresence>
                      {showDealList && matchedDeals.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                          className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl z-20 mt-1 max-h-40 overflow-y-auto">
                          {matchedDeals.map(d => (
                            <button key={d.id} type="button"
                              onMouseDown={() => { setNewAct(f => ({ ...f, dealId: d.id })); setDealSearch(d.title); setShowDealList(false); }}
                              className={cn('w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0', newAct.dealId === d.id && 'bg-primary/5 text-primary')}>
                              <span className="block text-gray-800 truncate font-black">{d.title}</span>
                              {d.company && <span className="text-gray-400 text-[9px]">{d.company}</span>}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <textarea rows={2} placeholder="Descripción de la actividad…"
                    value={newAct.content}
                    onChange={e => setNewAct(f => ({ ...f, content: e.target.value }))}
                    onFocus={() => setShowDealList(false)}
                    className="w-full bg-white rounded-xl px-3 py-2.5 text-xs font-bold outline-none border border-gray-200 focus:border-primary/50 focus:ring-2 ring-primary/10 resize-none"
                    required
                  />

                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input type="date" value={newAct.dueDate}
                      onChange={e => setNewAct(f => ({ ...f, dueDate: e.target.value }))}
                      className="w-full bg-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold outline-none border border-gray-200 focus:border-primary/50 focus:ring-2 ring-primary/10"
                      required
                    />
                  </div>

                  <button type="submit" disabled={saving || !newAct.content.trim() || !newAct.dueDate}
                    className="w-full bg-gray-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Registrar actividad
                  </button>
                </form>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── Leyenda (mes/semana) ────────────────────────────────────────────── */}
      {viewMode !== 'year' && (
        <div className="flex-shrink-0 px-4 py-2 bg-white border-t border-gray-100 flex flex-wrap gap-2">
          {ALL_TYPES.map(t => {
            const meta = TYPE_META[t];
            const Icon = meta.icon;
            return (
              <div key={t} className="flex items-center gap-1">
                <span className={cn('w-2 h-2 rounded-full', meta.pill)} />
                <span className="text-[8px] font-bold text-gray-400">{meta.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
