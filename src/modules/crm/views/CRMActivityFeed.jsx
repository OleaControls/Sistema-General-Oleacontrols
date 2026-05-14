import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity, MessageSquare, MessageCircle, PhoneCall, Send, Coffee,
  CheckSquare, ArrowRight, RefreshCw, Filter, User, Building2,
  MapPin, ClipboardCheck, FileText, TrendingUp, Calendar,
  BarChart2, Clock, ChevronDown, ChevronUp, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { useAuth, ROLES } from '@/store/AuthContext';

// ── Metadatos ─────────────────────────────────────────────────────────────────
const TYPE_META = {
  NOTE:         { label: 'Nota',         icon: MessageSquare,  color: 'bg-gray-100 text-gray-600',      dot: 'bg-gray-400',    bar: '#94a3b8' },
  CALL:         { label: 'Llamada',      icon: PhoneCall,      color: 'bg-blue-50 text-blue-600',       dot: 'bg-blue-500',    bar: '#3b82f6' },
  MESSAGE:      { label: 'Mensaje',      icon: MessageCircle,  color: 'bg-teal-50 text-teal-600',       dot: 'bg-teal-500',    bar: '#14b8a6' },
  EMAIL:        { label: 'Correo',       icon: Send,           color: 'bg-purple-50 text-purple-600',   dot: 'bg-purple-500',  bar: '#a855f7' },
  VISIT:        { label: 'Visita',       icon: MapPin,         color: 'bg-green-50 text-green-600',     dot: 'bg-green-500',   bar: '#22c55e' },
  MEETING:      { label: 'Reunión',      icon: Coffee,         color: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500',   bar: '#f59e0b' },
  SEGUIMIENTO:  { label: 'Seguimiento',  icon: ClipboardCheck, color: 'bg-indigo-50 text-indigo-700',   dot: 'bg-indigo-500',  bar: '#6366f1' },
  TASK:         { label: 'Tarea',        icon: CheckSquare,    color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', bar: '#10b981' },
  QUOTE:        { label: 'Cotización',   icon: FileText,       color: 'bg-orange-50 text-orange-600',   dot: 'bg-orange-500',  bar: '#f97316' },
  STAGE_CHANGE: { label: 'Cambio etapa', icon: TrendingUp,     color: 'bg-violet-50 text-violet-700',   dot: 'bg-violet-500',  bar: '#8b5cf6' },
};

const STAGE_LABELS = {
  QUALIFICATION: 'Lead / Prospecto', NEEDS_ANALYSIS: 'Acercamiento',
  VALUE_PROPOSITION: 'Contacto decisor', IDENTIFY_DECISION_MAKERS: 'Oportunidad detectada',
  PROPOSAL_PRICE_QUOTE: 'Levantamiento técnico', PROPOSAL_SENT: 'Cotización enviada',
  NEGOTIATION_1: 'Negociación 1', RECOTIZACION: 'Recotización',
  NEGOTIATION_2: 'Negociación 2', CLOSED_WON_PENDING: 'En espera de autorización',
  CLOSED_WON: 'Ganado', CLOSED_LOST: 'Perdido',
};

const STAGE_COLORS = {
  CLOSED_WON: 'bg-emerald-100 text-emerald-700',
  CLOSED_LOST: 'bg-red-100 text-red-600',
  CLOSED_WON_PENDING: 'bg-yellow-100 text-yellow-700',
};

const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtDateKey(key) {
  const d = new Date(key + 'T12:00:00');
  const today = toDateKey(new Date());
  const yesterday = toDateKey(new Date(Date.now() - 86400000));
  if (key === today) return 'Hoy';
  if (key === yesterday) return 'Ayer';
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'ahora mismo';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function CRMActivityFeed() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [activities,    setActivities]    = useState([]);
  const [sellers,       setSellers]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filterSeller,  setFilterSeller]  = useState('');
  const [filterType,    setFilterType]    = useState('');
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');
  const [showSummary,   setShowSummary]   = useState(true);
  const [collapsedDays, setCollapsedDays] = useState({});

  const fetchSellers = async () => {
    try {
      const res  = await apiFetch('/api/employees');
      const data = await res.json();
      setSellers(Array.isArray(data) ? data.filter(e => e.roles?.includes('SALES') || e.roles?.includes('ADMIN')) : []);
    } catch {}
  };

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '1000' });
      if (filterSeller) params.set('sellerId', filterSeller);
      if (filterType)   params.set('type',     filterType);
      const res  = await apiFetch(`/api/crm/activity-feed?${params}`);
      const data = await res.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterSeller, filterType]);

  useEffect(() => { fetchSellers(); }, []);
  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  // ── Filtrar por rango de fechas ────────────────────────────────────────────
  const filtered = useMemo(() => {
    return activities.filter(a => {
      const key = (a.createdAt || '').split('T')[0];
      if (dateFrom && key < dateFrom) return false;
      if (dateTo   && key > dateTo)   return false;
      return true;
    });
  }, [activities, dateFrom, dateTo]);

  // ── Estadísticas del resumen ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const todayKey     = toDateKey(new Date());
    const weekAgo      = toDateKey(new Date(Date.now() - 7  * 86400000));
    const monthAgo     = toDateKey(new Date(Date.now() - 30 * 86400000));

    let today = 0, week = 0, month = 0;
    const byType  = {};
    const byDay   = {};  // last 30 days
    const byDeal  = {};  // top deals by count

    filtered.forEach(a => {
      const key = (a.createdAt || '').split('T')[0];
      if (key === todayKey) today++;
      if (key >= weekAgo)   week++;
      if (key >= monthAgo)  month++;

      byType[a.type] = (byType[a.type] || 0) + 1;

      if (key >= monthAgo) byDay[key] = (byDay[key] || 0) + 1;

      if (a.deal?.id) {
        if (!byDeal[a.deal.id]) byDeal[a.deal.id] = { title: a.deal.title, company: a.deal.company, count: 0 };
        byDeal[a.deal.id].count++;
      }
    });

    // Últimos 30 días con sus conteos
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d   = new Date(Date.now() - (29 - i) * 86400000);
      const key = toDateKey(d);
      return { key, day: d.getDate(), month: d.getMonth(), count: byDay[key] || 0 };
    });

    const maxDay = Math.max(1, ...last30.map(d => d.count));

    const topDeals = Object.values(byDeal).sort((a, b) => b.count - a.count).slice(0, 5);
    const typeRanked = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    const maxType  = typeRanked[0]?.[1] || 1;

    return { total: filtered.length, today, week, month, byType, typeRanked, maxType, last30, maxDay, topDeals };
  }, [filtered]);

  // ── Agrupar feed por fecha ─────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(a => {
      const key = (a.createdAt || '').split('T')[0];
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const toggleDay = (key) => setCollapsedDays(p => ({ ...p, [key]: !p[key] }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── Título + controles ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Registro de Actividad</h2>
          <p className="text-gray-400 font-bold text-[10px] mt-1 uppercase tracking-widest flex items-center gap-2">
            <Activity className="h-3 w-3 text-primary" /> {filtered.length} registros
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSummary(p => !p)}
            className="flex items-center gap-2 bg-white border border-gray-100 text-gray-700 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
          >
            <BarChart2 className="h-3.5 w-3.5 text-primary" />
            {showSummary ? 'Ocultar resumen' : 'Ver resumen'}
          </button>
          <button onClick={fetchFeed} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">
            <RefreshCw className="h-3.5 w-3.5" /> Actualizar
          </button>
        </div>
      </div>

      {/* ── Bloque RESUMEN ───────────────────────────────────────────────────── */}
      {showSummary && (
        <div className="space-y-4">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total registros', value: stats.total, icon: Activity,  color: 'bg-gray-900 text-white',          sub: 'con filtros actuales' },
              { label: 'Hoy',             value: stats.today, icon: Zap,       color: 'bg-primary text-white',           sub: new Date().toLocaleDateString('es-MX', { weekday: 'long' }) },
              { label: 'Últimos 7 días',  value: stats.week,  icon: Calendar,  color: 'bg-violet-600 text-white',        sub: 'actividades recientes' },
              { label: 'Últimos 30 días', value: stats.month, icon: TrendingUp, color: 'bg-emerald-600 text-white',      sub: 'en el último mes' },
            ].map(({ label, value, icon: Icon, color, sub }) => (
              <div key={label} className={cn('rounded-3xl p-5 flex flex-col gap-2', color)}>
                <div className="flex items-center justify-between">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-70">{label}</p>
                  <Icon className="h-4 w-4 opacity-60" />
                </div>
                <p className="text-4xl font-black leading-none">{value}</p>
                <p className="text-[9px] font-bold opacity-60">{sub}</p>
              </div>
            ))}
          </div>

          {/* Gráfica últimos 30 días + Distribución por tipo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Tendencia 30 días */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Actividad diaria</p>
                  <p className="text-base font-black text-gray-900">Últimos 30 días</p>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-bold text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" /> Actividades
                </div>
              </div>
              <div className="flex items-end gap-0.5 h-20">
                {stats.last30.map(({ key, day, month, count }) => {
                  const h = count > 0 ? Math.max(4, Math.round((count / stats.maxDay) * 72)) : 3;
                  const isToday = key === toDateKey(new Date());
                  return (
                    <div key={key} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={`${day} ${MONTHS_SHORT[month]}: ${count}`}>
                      <div
                        className={cn('w-full rounded-t-sm transition-all', isToday ? 'bg-primary' : count > 0 ? 'bg-primary/40 group-hover:bg-primary/70' : 'bg-gray-100')}
                        style={{ height: h }}
                      />
                      {/* tooltip */}
                      {count > 0 && (
                        <div className="absolute bottom-full mb-1 bg-gray-900 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {day}/{month+1}: {count}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Etiquetas de mes */}
              <div className="flex mt-1">
                {stats.last30.filter((_, i) => i % 5 === 0).map(({ key, day, month }) => (
                  <div key={key} className="flex-1 text-center">
                    <span className="text-[7px] font-bold text-gray-300">{day}/{MONTHS_SHORT[month]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Distribución por tipo */}
            <div className="bg-white rounded-3xl border border-gray-100 p-5">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Distribución</p>
              <p className="text-base font-black text-gray-900 mb-4">Por tipo</p>
              {stats.typeRanked.length === 0 ? (
                <p className="text-[9px] font-bold text-gray-300 py-4 text-center">Sin datos</p>
              ) : (
                <div className="space-y-2.5">
                  {stats.typeRanked.map(([type, count]) => {
                    const meta = TYPE_META[type];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    const pct  = Math.round((count / stats.total) * 100);
                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className={cn('h-5 w-5 rounded-lg flex items-center justify-center flex-shrink-0', meta.color)}>
                              <Icon className="h-3 w-3" />
                            </div>
                            <span className="text-[9px] font-black text-gray-700">{meta.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black text-gray-900">{count}</span>
                            <span className="text-[8px] font-bold text-gray-400">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: meta.bar }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Top tratos más activos */}
          {stats.topDeals.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 p-5">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Más actividad</p>
              <p className="text-base font-black text-gray-900 mb-4">Top tratos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {stats.topDeals.map((deal, i) => (
                  <div key={deal.title + i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
                    <div className={cn(
                      'h-8 w-8 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 text-white',
                      i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-200 text-gray-500'
                    )}>
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-gray-800 truncate">{deal.title || 'Sin nombre'}</p>
                      {deal.company && <p className="text-[8px] font-bold text-gray-400 truncate">{deal.company}</p>}
                      <p className="text-[9px] font-black text-primary mt-0.5">{deal.count} actividades</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        {isAdmin && (
          <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 border border-gray-100 shadow-sm">
            <User className="h-3.5 w-3.5 text-gray-400" />
            <select className="bg-transparent font-bold text-xs text-gray-700 outline-none cursor-pointer" value={filterSeller} onChange={e => setFilterSeller(e.target.value)}>
              <option value="">Todos los vendedores</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 border border-gray-100 shadow-sm">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          <select className="bg-transparent font-bold text-xs text-gray-700 outline-none cursor-pointer" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 border border-gray-100 shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="bg-transparent font-bold text-xs text-gray-700 outline-none cursor-pointer"
            title="Desde"
          />
          <span className="text-gray-300 font-bold text-xs">—</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="bg-transparent font-bold text-xs text-gray-700 outline-none cursor-pointer"
            title="Hasta"
          />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-gray-400 hover:text-red-400 transition-colors">
              ×
            </button>
          )}
        </div>
      </div>

      {/* ── Feed agrupado por fecha ───────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Activity className="h-10 w-10 text-primary animate-pulse" />
          <p className="font-black text-gray-400 text-[10px] uppercase">Cargando actividad...</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Activity className="h-12 w-12 text-gray-200" />
          <p className="font-black text-gray-300 text-[10px] uppercase tracking-widest">Sin actividad registrada</p>
        </div>
      ) : (
        <div className="space-y-4 pb-10">
          {grouped.map(([dateKey, dayActs]) => {
            const isCollapsed = collapsedDays[dateKey];
            const dateLabel   = fmtDateKey(dateKey);
            const byType      = dayActs.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {});

            return (
              <div key={dateKey}>
                {/* Separador de fecha */}
                <button
                  onClick={() => toggleDay(dateKey)}
                  className="w-full flex items-center gap-3 mb-3 group"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 px-3 bg-gray-900 text-white rounded-xl flex items-center">
                      <span className="text-[9px] font-black uppercase tracking-widest capitalize">{dateLabel}</span>
                    </div>
                    <span className="text-[8px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
                      {dayActs.length} {dayActs.length === 1 ? 'actividad' : 'actividades'}
                    </span>
                    {/* Mini tipo pills */}
                    {Object.entries(byType).map(([type, count]) => {
                      const meta = TYPE_META[type];
                      if (!meta) return null;
                      return (
                        <span key={type} className={cn('text-[7px] font-black px-1.5 py-0.5 rounded-md hidden sm:inline', meta.color)}>
                          {meta.label} {count > 1 ? `×${count}` : ''}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex-1 h-px bg-gray-100" />
                  {isCollapsed
                    ? <ChevronDown className="h-4 w-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                    : <ChevronUp   className="h-4 w-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                  }
                </button>

                {/* Actividades del día */}
                {!isCollapsed && (
                  <div className="space-y-2 pl-2 border-l-2 border-gray-100 ml-3">
                    {dayActs.map(act => {
                      const meta = TYPE_META[act.type] || TYPE_META.NOTE;
                      const Icon = meta.icon;
                      const deal = act.deal;
                      const stageCurrent = STAGE_LABELS[deal?.stage] || deal?.stage;
                      const stageColor   = STAGE_COLORS[deal?.stage] || 'bg-gray-100 text-gray-600';

                      return (
                        <div
                          key={act.id}
                          className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex gap-4 items-start hover:shadow-md transition-shadow"
                        >
                          <div className={cn('p-2.5 rounded-xl flex-shrink-0', meta.color)}>
                            <Icon className="h-4 w-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-black text-gray-900 text-sm truncate">
                                {deal?.title || <span className="text-gray-300">Trato eliminado</span>}
                              </span>
                              {deal?.company && (
                                <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                                  <Building2 className="h-3 w-3" /> {deal.company}
                                </span>
                              )}
                              {stageCurrent && (
                                <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest', stageColor)}>
                                  {stageCurrent}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-600 font-medium">{act.content}</p>

                            <div className="flex flex-wrap items-center gap-3 mt-2">
                              <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-lg', meta.color)}>
                                {meta.label}
                              </span>
                              {act.authorName && (
                                <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                                  <User className="h-3 w-3" /> {act.authorName}
                                </span>
                              )}
                              {deal?.assignedTo && deal.assignedTo.name !== act.authorName && (
                                <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                                  <User className="h-3 w-3 text-primary" /> {deal.assignedTo.name}
                                </span>
                              )}
                              <span className="text-[9px] font-bold text-gray-300 ml-auto">
                                {new Date(act.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
