import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar,
  MapPin, PhoneCall, Coffee, ClipboardCheck, CheckSquare,
  MessageSquare, Send, MessageCircle, User, Loader2,
  RefreshCw, Building2, Target, Filter, Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { useAuth, ROLES } from '@/store/AuthContext';

// ── Tipos de actividad ─────────────────────────────────────────────────────────
const TYPE_META = {
  VISIT:       { label: 'Visita',      icon: MapPin,         bg: 'bg-green-100',   text: 'text-green-700',   pill: 'bg-green-500',   border: 'border-green-200'  },
  MEETING:     { label: 'Reunión',     icon: Coffee,         bg: 'bg-amber-100',   text: 'text-amber-700',   pill: 'bg-amber-500',   border: 'border-amber-200'  },
  CALL:        { label: 'Llamada',     icon: PhoneCall,      bg: 'bg-blue-100',    text: 'text-blue-700',    pill: 'bg-blue-500',    border: 'border-blue-200'   },
  SEGUIMIENTO: { label: 'Seguimiento', icon: ClipboardCheck, bg: 'bg-indigo-100',  text: 'text-indigo-700',  pill: 'bg-indigo-500',  border: 'border-indigo-200' },
  TASK:        { label: 'Tarea',       icon: CheckSquare,    bg: 'bg-emerald-100', text: 'text-emerald-700', pill: 'bg-emerald-500', border: 'border-emerald-200'},
  NOTE:        { label: 'Nota',        icon: MessageSquare,  bg: 'bg-gray-100',    text: 'text-gray-600',    pill: 'bg-gray-400',    border: 'border-gray-200'   },
  EMAIL:       { label: 'Correo',      icon: Send,           bg: 'bg-purple-100',  text: 'text-purple-700',  pill: 'bg-purple-500',  border: 'border-purple-200' },
  MESSAGE:     { label: 'Mensaje',     icon: MessageCircle,  bg: 'bg-teal-100',    text: 'text-teal-700',    pill: 'bg-teal-500',    border: 'border-teal-200'   },
};

const SCHEDULABLE = ['VISIT', 'MEETING', 'CALL', 'SEGUIMIENTO', 'TASK', 'NOTE', 'EMAIL', 'MESSAGE'];

// Color por vendedor (admin view)
const SELLER_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-rose-500',
  'bg-amber-500', 'bg-teal-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500',
];

const DAYS_ES   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
                   'Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildGrid(year, month) {
  const first  = new Date(year, month, 1);
  const last   = new Date(year, month + 1, 0);
  const cells  = [];
  for (let i = first.getDay() - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month, -i), current: false });
  }
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push({ date: new Date(year, month, d), current: true });
  }
  while (cells.length % 7 !== 0) {
    const next = new Date(cells[cells.length - 1].date);
    next.setDate(next.getDate() + 1);
    cells.push({ date: next, current: false });
  }
  return cells;
}

const BLANK = { type: 'VISIT', content: '', dueDate: '', dealId: '' };

// ── Componente principal ───────────────────────────────────────────────────────
export default function SalesCalendar() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities,  setActivities]  = useState([]);
  const [deals,       setDeals]       = useState([]);
  const [sellers,     setSellers]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);

  const [filterSeller, setFilterSeller] = useState('');
  const [filterType,   setFilterType]   = useState('');

  const [selectedDay, setSelectedDay] = useState(null);
  const [newAct,      setNewAct]      = useState(BLANK);
  const [dealSearch,  setDealSearch]  = useState('');
  const [showDealList, setShowDealList] = useState(false);

  // Mapa sellerId → índice color
  const sellerColorIdx = useMemo(() => {
    const m = {};
    sellers.forEach((s, i) => { m[s.id] = i % SELLER_COLORS.length; });
    return m;
  }, [sellers]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '600' });
      if (filterSeller) params.set('sellerId', filterSeller);
      if (filterType)   params.set('type',     filterType);

      const reqs = [
        apiFetch(`/api/crm/activity-feed?${params}`),
        apiFetch('/api/crm/deals'),
        ...(isAdmin ? [apiFetch('/api/employees')] : []),
      ];

      const results  = await Promise.all(reqs);
      const [actsR, dealsR, sellersR] = results;
      const [actsD, dealsD] = await Promise.all([actsR.json(), dealsR.json()]);

      setActivities(Array.isArray(actsD) ? actsD : []);
      setDeals(Array.isArray(dealsD) ? dealsD : []);

      if (sellersR) {
        const sd = await sellersR.json();
        setSellers(
          Array.isArray(sd)
            ? sd.filter(e => e.roles?.includes('SALES') || e.roles?.includes('ADMIN'))
            : []
        );
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterSeller, filterType, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Agrupar por fecha: dueDate si existe, si no createdAt ────────────────
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

  const grid = useMemo(
    () => buildGrid(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const dayActivities = useMemo(
    () => (selectedDay ? actsByDate[toDateKey(selectedDay)] || [] : []),
    [selectedDay, actsByDate]
  );

  // Deals para el buscador
  const matchedDeals = useMemo(() => {
    const q = dealSearch.trim().toLowerCase();
    if (!q) return deals.slice(0, 8);
    return deals.filter(d =>
      d.title?.toLowerCase().includes(q) || d.company?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [deals, dealSearch]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const goToday   = () => { setCurrentDate(new Date()); setSelectedDay(new Date()); };

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
      const body = {
        type:       newAct.type,
        content:    newAct.content,
        dueDate:    newAct.dueDate,
        status:     'PENDING',
        authorName: user?.name || 'Usuario',
      };
      if (newAct.dealId) body.dealId = newAct.dealId;

      const res = await apiFetch('/api/crm/deal-activities', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setNewAct({ ...BLANK, dueDate: toDateKey(selectedDay) });
        setDealSearch('');
        await fetchData();
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const today = toDateKey(new Date());

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-gray-50/30 overflow-hidden">

      {/* ── Calendario ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Agenda de Ventas
            </h2>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
              {isAdmin ? 'Vista Admin — todos los vendedores' : 'Mis actividades — seguimientos y programadas'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={goToday}
              className="px-3 py-2 text-[10px] font-black text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl uppercase tracking-widest transition-colors"
            >
              Hoy
            </button>

            {isAdmin && sellers.length > 0 && (
              <select
                className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 font-bold text-xs text-gray-700 outline-none cursor-pointer"
                value={filterSeller}
                onChange={e => setFilterSeller(e.target.value)}
              >
                <option value="">Todos los vendedores</option>
                {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}

            <select
              className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 font-bold text-xs text-gray-700 outline-none cursor-pointer"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {SCHEDULABLE.map(t => (
                <option key={t} value={t}>{TYPE_META[t].label}</option>
              ))}
            </select>

            <button
              onClick={fetchData}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              title="Actualizar"
            >
              <RefreshCw className={cn('h-4 w-4 text-gray-500', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Navegación de mes */}
        <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-50 flex-shrink-0">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h3 className="text-base font-black text-gray-900 tracking-tight capitalize">
            {MONTHS_ES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Cabecera días */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          {DAYS_ES.map(d => (
            <div key={d} className="py-2 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cargando…</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-100">
              {grid.map((cell, i) => {
                const key      = toDateKey(cell.date);
                const dayActs  = actsByDate[key] || [];
                const isToday  = key === today;
                const isSel    = selectedDay && toDateKey(selectedDay) === key;

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
                    {/* Número día */}
                    <span className={cn(
                      'inline-flex items-center justify-center w-6 h-6 text-[11px] font-black rounded-full mb-1',
                      isToday
                        ? 'bg-primary text-white'
                        : cell.current ? 'text-gray-800' : 'text-gray-300',
                    )}>
                      {cell.date.getDate()}
                    </span>

                    {/* Pills de actividades */}
                    <div className="space-y-0.5">
                      {dayActs.slice(0, 3).map(act => {
                        const meta = TYPE_META[act.type] || TYPE_META.NOTE;
                        const Icon = meta.icon;
                        const sellerIdx = act.deal?.assignedTo?.id
                          ? sellerColorIdx[act.deal.assignedTo.id] ?? 0
                          : null;

                        return (
                          <div
                            key={act.id}
                            className={cn(
                              'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] font-black truncate leading-tight',
                              meta.bg, meta.text,
                            )}
                          >
                            <Icon className="h-2.5 w-2.5 flex-shrink-0" />
                            <span className="truncate">
                              {act.deal?.title || act.content}
                            </span>
                            {isAdmin && sellerIdx !== null && (
                              <span className={cn('ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0', SELLER_COLORS[sellerIdx])} />
                            )}
                          </div>
                        );
                      })}
                      {dayActs.length > 3 && (
                        <p className="text-[8px] font-black text-gray-400 px-1.5">
                          +{dayActs.length - 3} más
                        </p>
                      )}
                    </div>

                    {/* Botón agregar (hover) */}
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
        )}

        {/* Leyenda tipos */}
        <div className="flex-shrink-0 px-4 py-2 bg-white border-t border-gray-100 flex flex-wrap gap-2">
          {SCHEDULABLE.map(t => {
            const meta = TYPE_META[t];
            const Icon = meta.icon;
            return (
              <div key={t} className="flex items-center gap-1">
                <span className={cn('w-2 h-2 rounded-full', meta.pill)} />
                <span className="text-[8px] font-bold text-gray-400">{meta.label}</span>
              </div>
            );
          })}
          {isAdmin && sellers.length > 0 && (
            <div className="flex items-center gap-1 ml-4 pl-4 border-l border-gray-100">
              {sellers.slice(0, 6).map((s, i) => (
                <div key={s.id} className="flex items-center gap-1">
                  <span className={cn('w-2 h-2 rounded-full', SELLER_COLORS[i % SELLER_COLORS.length])} />
                  <span className="text-[8px] font-bold text-gray-400">{s.name?.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Panel lateral del día ───────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedDay && (
          <motion.aside
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-80 border-l border-gray-100 bg-white flex flex-col overflow-hidden flex-shrink-0"
          >
            {/* Panel header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                  {DAYS_ES[selectedDay.getDay()]}
                </p>
                <h3 className="text-2xl font-black text-gray-900 tracking-tighter">
                  {selectedDay.getDate()} {MONTHS_ES[selectedDay.getMonth()]}
                </h3>
                <p className="text-[9px] text-gray-400 font-bold mt-0.5">
                  {dayActivities.length} {dayActivities.length === 1 ? 'actividad' : 'actividades'}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors mt-1"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Lista de actividades del día */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {dayActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Calendar className="h-10 w-10 text-gray-200" />
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest text-center">
                    Sin actividades<br />este día
                  </p>
                </div>
              ) : (
                dayActivities.map(act => {
                  const meta       = TYPE_META[act.type] || TYPE_META.NOTE;
                  const Icon       = meta.icon;
                  const isScheduled = !!act.dueDate;
                  return (
                    <div
                      key={act.id}
                      className={cn('rounded-2xl p-3 border', meta.bg, meta.border)}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className={cn('p-1.5 rounded-lg bg-white/60')}>
                          <Icon className={cn('h-3.5 w-3.5', meta.text)} />
                        </div>
                        <span className={cn('text-[9px] font-black uppercase tracking-widest', meta.text)}>
                          {meta.label}
                        </span>
                        {isScheduled ? (
                          <span className="text-[8px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-md">
                            Programada
                          </span>
                        ) : (
                          <span className="text-[8px] font-black text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md">
                            Registrada
                          </span>
                        )}
                        {act.status === 'DONE' && (
                          <span className="ml-auto text-[8px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                            Hecho
                          </span>
                        )}
                      </div>

                      {act.deal?.title && (
                        <p className="text-[10px] font-black text-gray-700 flex items-center gap-1 mb-1 truncate">
                          <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          {act.deal.title}
                        </p>
                      )}
                      {act.deal?.company && (
                        <p className="text-[9px] font-bold text-gray-400 flex items-center gap-1 mb-1 truncate">
                          <Target className="h-2.5 w-2.5 flex-shrink-0" />
                          {act.deal.company}
                        </p>
                      )}

                      <p className="text-xs text-gray-600 font-medium leading-snug">{act.content}</p>

                      {(act.authorName || act.deal?.assignedTo?.name) && (
                        <p className="text-[8px] font-bold text-gray-400 mt-2 flex items-center gap-1">
                          <User className="h-2.5 w-2.5" />
                          {act.deal?.assignedTo?.name || act.authorName}
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
                <Plus className="h-3 w-3 text-primary" />
                Registrar actividad
              </p>

              <form onSubmit={handleSave} className="space-y-2.5">

                {/* Selector de tipo */}
                <div className="grid grid-cols-4 gap-1">
                  {SCHEDULABLE.map(t => {
                    const meta = TYPE_META[t];
                    const Icon = meta.icon;
                    const active = newAct.type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setNewAct(f => ({ ...f, type: t }))}
                        className={cn(
                          'flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition-all text-[7px] font-black uppercase leading-tight',
                          active
                            ? cn(meta.bg, meta.text, 'border-current shadow-sm')
                            : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {meta.label.slice(0, 6)}
                      </button>
                    );
                  })}
                </div>

                {/* Buscador de trato */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Trato vinculado (opcional)…"
                    value={dealSearch}
                    onFocus={() => setShowDealList(true)}
                    onChange={e => {
                      setDealSearch(e.target.value);
                      setNewAct(f => ({ ...f, dealId: '' }));
                      setShowDealList(true);
                    }}
                    className="w-full bg-white rounded-xl px-3 py-2.5 text-xs font-bold outline-none border border-gray-200 focus:border-primary/50 focus:ring-2 ring-primary/10"
                  />
                  {newAct.dealId && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                  )}

                  <AnimatePresence>
                    {showDealList && matchedDeals.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-xl z-20 mt-1 max-h-40 overflow-y-auto"
                      >
                        {matchedDeals.map(d => (
                          <button
                            key={d.id}
                            type="button"
                            onMouseDown={() => {
                              setNewAct(f => ({ ...f, dealId: d.id }));
                              setDealSearch(d.title);
                              setShowDealList(false);
                            }}
                            className={cn(
                              'w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0',
                              newAct.dealId === d.id && 'bg-primary/5 text-primary'
                            )}
                          >
                            <span className="block text-gray-800 truncate font-black">{d.title}</span>
                            {d.company && (
                              <span className="text-gray-400 text-[9px]">{d.company}</span>
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Descripción */}
                <textarea
                  rows={2}
                  placeholder="Descripción de la actividad…"
                  value={newAct.content}
                  onChange={e => setNewAct(f => ({ ...f, content: e.target.value }))}
                  onFocus={() => setShowDealList(false)}
                  className="w-full bg-white rounded-xl px-3 py-2.5 text-xs font-bold outline-none border border-gray-200 focus:border-primary/50 focus:ring-2 ring-primary/10 resize-none"
                  required
                />

                {/* Fecha */}
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="date"
                    value={newAct.dueDate}
                    onChange={e => setNewAct(f => ({ ...f, dueDate: e.target.value }))}
                    className="w-full bg-white rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold outline-none border border-gray-200 focus:border-primary/50 focus:ring-2 ring-primary/10"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving || !newAct.content.trim() || !newAct.dueDate}
                  className="w-full bg-gray-900 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {saving
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Plus className="h-3.5 w-3.5" />
                  }
                  Registrar actividad
                </button>
              </form>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
