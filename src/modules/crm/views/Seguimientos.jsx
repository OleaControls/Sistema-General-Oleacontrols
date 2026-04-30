import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';
import {
  Activity, MessageSquare, MessageCircle, PhoneCall, Send, Coffee,
  CheckSquare, ArrowRight, RefreshCw, Filter, User, Building2,
  ChevronDown, ChevronRight, FileText, Clock, MapPin, ClipboardCheck,
  DollarSign, Target, ExternalLink, Pencil, Trash2, X, Save, AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

// ── Metadatos de tipos de actividad ──────────────────────────────────────────
const TYPE_META = {
  NOTE:         { label: 'Nota',         icon: MessageSquare,  color: 'bg-gray-100 text-gray-600',      dot: 'bg-gray-400' },
  CALL:         { label: 'Llamada',      icon: PhoneCall,      color: 'bg-blue-50 text-blue-600',       dot: 'bg-blue-500' },
  MESSAGE:      { label: 'Mensaje',      icon: MessageCircle,  color: 'bg-teal-50 text-teal-600',       dot: 'bg-teal-500' },
  EMAIL:        { label: 'Correo',       icon: Send,           color: 'bg-purple-50 text-purple-600',   dot: 'bg-purple-500' },
  VISIT:        { label: 'Visita',       icon: MapPin,         color: 'bg-green-50 text-green-600',     dot: 'bg-green-500' },
  MEETING:      { label: 'Reunión',      icon: Coffee,         color: 'bg-amber-50 text-amber-700',     dot: 'bg-amber-500' },
  SEGUIMIENTO:  { label: 'Seguimiento',  icon: ClipboardCheck, color: 'bg-indigo-50 text-indigo-700',   dot: 'bg-indigo-500' },
  TASK:         { label: 'Tarea',        icon: CheckSquare,    color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  QUOTE:        { label: 'Cotización',   icon: FileText,       color: 'bg-orange-50 text-orange-600',   dot: 'bg-orange-500' },
  STAGE_CHANGE: { label: 'Cambio etapa', icon: ArrowRight,     color: 'bg-violet-50 text-violet-700',   dot: 'bg-violet-500' },
};

// ── Periodos de filtro ────────────────────────────────────────────────────────
const PERIODS = [
  { id: 'week',      label: 'Semana'   },
  { id: 'fortnight', label: 'Quincena' },
  { id: 'month',     label: 'Mes'      },
  { id: 'year',      label: 'Año'      },
  { id: 'all',       label: 'Todo'     },
];

function getPeriodRange(period) {
  const now = new Date();
  if (period === 'all') return null;
  if (period === 'week') {
    const day  = now.getDay();
    const diff = day === 0 ? -6 : 1 - day; // desde el lunes
    const from = new Date(now); from.setDate(now.getDate() + diff); from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  if (period === 'fortnight') {
    const from = new Date(now); from.setDate(now.getDate() - 14); from.setHours(0, 0, 0, 0);
    return { from, to: now };
  }
  if (period === 'month') {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  if (period === 'year') {
    return { from: new Date(now.getFullYear(), 0, 1), to: now };
  }
  return null;
}

// ── Etapas del pipeline en orden ─────────────────────────────────────────────
const PIPELINE_STAGES = [
  { id: 'QUALIFICATION',            label: 'Lead / Prospecto',          color: 'bg-slate-400',   ring: 'ring-slate-200',   text: 'text-slate-600',   bg: 'bg-slate-50'   },
  { id: 'NEEDS_ANALYSIS',           label: 'Acercamiento',              color: 'bg-blue-400',    ring: 'ring-blue-200',    text: 'text-blue-600',    bg: 'bg-blue-50'    },
  { id: 'VALUE_PROPOSITION',        label: 'Contacto decisor',          color: 'bg-indigo-500',  ring: 'ring-indigo-200',  text: 'text-indigo-600',  bg: 'bg-indigo-50'  },
  { id: 'IDENTIFY_DECISION_MAKERS', label: 'Oportunidad detectada',     color: 'bg-violet-500',  ring: 'ring-violet-200',  text: 'text-violet-600',  bg: 'bg-violet-50'  },
  { id: 'PROPOSAL_PRICE_QUOTE',     label: 'Levantamiento técnico',     color: 'bg-amber-500',   ring: 'ring-amber-200',   text: 'text-amber-700',   bg: 'bg-amber-50'   },
  { id: 'PROPOSAL_SENT',            label: 'Cotización enviada',        color: 'bg-orange-500',  ring: 'ring-orange-200',  text: 'text-orange-700',  bg: 'bg-orange-50'  },
  { id: 'NEGOTIATION_1',            label: 'Negociación 1',             color: 'bg-purple-500',  ring: 'ring-purple-200',  text: 'text-purple-600',  bg: 'bg-purple-50'  },
  { id: 'RECOTIZACION',             label: 'Recotización',              color: 'bg-pink-500',    ring: 'ring-pink-200',    text: 'text-pink-600',    bg: 'bg-pink-50'    },
  { id: 'NEGOTIATION_2',            label: 'Negociación 2',             color: 'bg-rose-500',    ring: 'ring-rose-200',    text: 'text-rose-600',    bg: 'bg-rose-50'    },
  { id: 'CLOSED_WON_PENDING',       label: 'En espera de autorización', color: 'bg-yellow-500',  ring: 'ring-yellow-200',  text: 'text-yellow-700',  bg: 'bg-yellow-50'  },
  { id: 'CLOSED_WON',               label: 'Ganado',                    color: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  { id: 'CLOSED_LOST',              label: 'Perdido',                   color: 'bg-red-500',     ring: 'ring-red-200',     text: 'text-red-600',     bg: 'bg-red-50'     },
];

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'ahora mismo';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Historial de un trato (colapsable) ────────────────────────────────────────
function DealHistorial({ deal, actsByDeal, onOpenProfile, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const acts = actsByDeal[deal.id] || [];

  // Contadores de tipos
  const counts = useMemo(() => {
    const m = {};
    acts.forEach(a => { m[a.type] = (m[a.type] || 0) + 1; });
    return m;
  }, [acts]);

  const activePills = Object.entries(counts)
    .filter(([type]) => TYPE_META[type])
    .map(([type, count]) => ({ type, count, ...TYPE_META[type] }));

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
      {/* Cabecera del trato */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        {/* Indicador de actividades */}
        <div className={cn(
          'h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-black',
          acts.length > 0 ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
        )}>
          {acts.length}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black text-gray-900 text-xs truncate">{deal.title}</span>
            {deal.company && (
              <span className="text-[8px] font-bold text-gray-400 flex items-center gap-1 shrink-0">
                <Building2 className="h-2.5 w-2.5" />{deal.company}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            {/* Pills de tipos */}
            {activePills.map(({ type, count, label, color, icon: Icon }) => (
              <span key={type} className={cn('text-[8px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-1', color)}>
                <Icon className="h-2.5 w-2.5" />{count} {label}
              </span>
            ))}
            {acts.length === 0 && (
              <span className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">Sin actividades</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {deal.value > 0 && (
            <span className="text-[8px] font-black text-gray-500 flex items-center gap-1 mr-1">
              <DollarSign className="h-2.5 w-2.5" />{fmt(deal.value)}
            </span>
          )}
          {deal.assignedTo && (
            <span className="text-[8px] font-bold text-gray-400 hidden sm:flex items-center gap-1 mr-1">
              <User className="h-2.5 w-2.5 text-primary" />{deal.assignedTo.name.split(' ')[0]}
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); onOpenProfile(deal); }}
            className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
            title="Ver perfil completo"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onEdit(deal); }}
            className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-all"
            title="Editar trato"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(deal); }}
            className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all"
            title="Eliminar trato"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          {acts.length > 0 && (
            open
              ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
              : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Historial de actividades */}
      {open && acts.length > 0 && (
        <div className="border-t border-gray-50 bg-gray-50/40 divide-y divide-gray-100">
          {acts.map((act) => {
            const meta = TYPE_META[act.type] || TYPE_META.NOTE;
            const Icon = meta.icon;
            return (
              <div key={act.id} className="px-4 py-3 flex gap-3 items-start">
                <div className={cn('p-1.5 rounded-lg flex-shrink-0 mt-0.5', meta.color)}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md', meta.color)}>
                      {meta.label}
                    </span>
                    {act.authorName && (
                      <span className="text-[8px] font-bold text-gray-400 flex items-center gap-1">
                        <User className="h-2 w-2" />{act.authorName}
                      </span>
                    )}
                    <span className="text-[8px] font-bold text-gray-300 ml-auto flex items-center gap-1">
                      <Clock className="h-2 w-2" />{timeAgo(act.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-700 font-medium leading-relaxed">{act.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sección de etapa colapsable ───────────────────────────────────────────────
function StageSection({ stage, deals, actsByDeal, onOpenProfile, onEdit, onDelete }) {
  const [open, setOpen] = useState(true);

  const totalActs = deals.reduce((s, d) => s + (actsByDeal[d.id]?.length || 0), 0);
  const totalValue = deals.reduce((s, d) => s + (d.value || 0), 0);

  if (deals.length === 0) return null;

  return (
    <div className="rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
      {/* Cabecera de etapa */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn('w-full flex items-center gap-3 px-5 py-4 transition-colors', stage.bg, 'hover:brightness-95')}
      >
        <div className={cn('w-3 h-3 rounded-full flex-shrink-0', stage.color)} />
        <div className="flex-1 text-left">
          <span className={cn('text-xs font-black uppercase tracking-wider', stage.text)}>
            {stage.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black text-gray-500 bg-white/70 px-2.5 py-1 rounded-xl">
            {deals.length} {deals.length === 1 ? 'trato' : 'tratos'}
          </span>
          {totalActs > 0 && (
            <span className="text-[9px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-xl">
              {totalActs} actividades
            </span>
          )}
          {totalValue > 0 && (
            <span className={cn('text-[9px] font-black hidden sm:block px-2.5 py-1 rounded-xl bg-white/70', stage.text)}>
              {fmt(totalValue)}
            </span>
          )}
          {open
            ? <ChevronDown className={cn('h-4 w-4', stage.text)} />
            : <ChevronRight className={cn('h-4 w-4', stage.text)} />
          }
        </div>
      </button>

      {/* Tratos dentro de la etapa */}
      {open && (
        <div className="bg-white p-3 space-y-2">
          {deals.map(deal => (
            <DealHistorial key={deal.id} deal={deal} actsByDeal={actsByDeal} onOpenProfile={onOpenProfile} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Vista principal ───────────────────────────────────────────────────────────
const EDIT_BLANK = { title:'', company:'', contactName:'', contactPhone:'', contactEmail:'', value:'', stage:'QUALIFICATION', source:'', expectedClose:'', description:'', notes:'' };

export default function Seguimientos() {
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const isAdmin      = user?.role === 'ADMIN';
  const [deals, setDeals]           = useState([]);
  const [activities, setActivities] = useState([]);
  const [sellers, setSellers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filterSeller, setFilterSeller] = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [filterPeriod, setFilterPeriod] = useState('month');

  // Edit / Delete state
  const [editingDeal, setEditingDeal]   = useState(null); // deal object or null
  const [editForm,    setEditForm]      = useState(EDIT_BLANK);
  const [saving,      setSaving]        = useState(false);
  const [deletingDeal, setDeletingDeal] = useState(null); // deal object or null
  const [deleting,    setDeleting]      = useState(false);

  const openEdit = (deal) => {
    setEditForm({
      title:         deal.title || '',
      company:       deal.company || '',
      contactName:   deal.contactName || '',
      contactPhone:  deal.contactPhone || '',
      contactEmail:  deal.contactEmail || '',
      value:         deal.value || '',
      stage:         deal.stage || 'QUALIFICATION',
      source:        deal.source || '',
      expectedClose: deal.expectedClose ? deal.expectedClose.split('T')[0] : '',
      description:   deal.description || '',
      notes:         deal.notes || '',
    });
    setEditingDeal(deal);
  };

  const handleSave = async () => {
    if (!editForm.title.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/crm/deals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingDeal.id, ...editForm, value: parseFloat(editForm.value) || 0 }),
      });
      const updated = await res.json();
      if (updated.id) {
        setDeals(prev => prev.map(d => d.id === updated.id ? updated : d));
        setEditingDeal(null);
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch('/api/crm/deals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingDeal.id }),
      });
      setDeals(prev => prev.filter(d => d.id !== deletingDeal.id));
      setDeletingDeal(null);
    } catch (err) { console.error(err); }
    finally { setDeleting(false); }
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '1000' });
      if (filterSeller) params.set('sellerId', filterSeller);
      if (filterType)   params.set('type', filterType);

      const [dealsRes, actsRes] = await Promise.all([
        apiFetch('/api/crm/deals'),
        apiFetch(`/api/crm/activity-feed?${params}`),
      ]);
      const [d, a] = await Promise.all([dealsRes.json(), actsRes.json()]);
      setDeals(Array.isArray(d) ? d : []);
      setActivities(Array.isArray(a) ? a : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterSeller, filterType]);

  const fetchSellers = async () => {
    try {
      const res  = await apiFetch('/api/employees');
      const data = await res.json();
      setSellers(Array.isArray(data) ? data.filter(e => e.roles?.includes('SALES') || e.roles?.includes('ADMIN')) : []);
    } catch {}
  };

  useEffect(() => { fetchSellers(); }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Actividades indexadas por dealId
  const actsByDeal = useMemo(() => {
    const map = {};
    activities.forEach(act => {
      const id = act.deal?.id;
      if (!id) return;
      if (!map[id]) map[id] = [];
      map[id].push(act);
    });
    return map;
  }, [activities]);

  // Deals filtrados por vendedor (si hay filtro activo)
  const filteredDeals = useMemo(() => {
    if (!filterSeller) return deals;
    return deals.filter(d => d.assignedToId === filterSeller || d.assignedTo?.id === filterSeller);
  }, [deals, filterSeller]);

  // Totales del header filtrados por periodo
  const totals = useMemo(() => {
    const range = getPeriodRange(filterPeriod);
    const m = {};
    activities.forEach(a => {
      if (range) {
        const d = new Date(a.createdAt);
        if (d < range.from || d > range.to) return;
      }
      m[a.type] = (m[a.type] || 0) + 1;
    });
    return m;
  }, [activities, filterPeriod]);

  const totalDealsWithActs = filteredDeals.filter(d => (actsByDeal[d.id]?.length || 0) > 0).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Seguimientos</h2>
          <p className="text-gray-400 font-bold text-[10px] mt-1 uppercase tracking-widest flex items-center gap-2">
            <Target className="h-3 w-3 text-primary" />
            {isAdmin ? 'Vista Admin — Todos los vendedores · ' : ''}{filteredDeals.length} tratos · {totalDealsWithActs} con actividad · {activities.length} registros
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </div>

      {/* Resumen de totales por tipo */}
      {!loading && activities.length > 0 && (
        <>
        {/* Selector de periodo */}
        <div className="flex flex-wrap gap-2">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setFilterPeriod(p.id)}
              className={cn(
                'px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all',
                filterPeriod === p.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { type: 'CALL',        label: 'Llamadas'     },
            { type: 'MESSAGE',     label: 'Mensajes'     },
            { type: 'EMAIL',       label: 'Correos'      },
            { type: 'VISIT',       label: 'Visitas'      },
            { type: 'SEGUIMIENTO', label: 'Seguimientos' },
          ].map(({ type, label }) => {
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            return (
              <div key={type} className={cn('rounded-2xl p-4 flex flex-col gap-1', meta.color)}>
                <Icon className="h-4 w-4 mb-1 opacity-70" />
                <span className="text-2xl font-black">{totals[type] || 0}</span>
                <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</span>
              </div>
            );
          })}
        </div>
        </>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        {/* Filtro de vendedor: solo visible para ADMIN */}
        {isAdmin && (
          <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm">
            <Filter className="h-3.5 w-3.5 text-gray-400" />
            <select
              className="bg-transparent font-bold text-xs text-gray-700 outline-none cursor-pointer"
              value={filterSeller}
              onChange={e => setFilterSeller(e.target.value)}
            >
              <option value="">Todos los vendedores</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-3 border border-gray-100 shadow-sm">
          <Filter className="h-3.5 w-3.5 text-gray-400" />
          <select
            className="bg-transparent font-bold text-xs text-gray-700 outline-none cursor-pointer"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Pipeline colapsable por etapa */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Activity className="h-10 w-10 text-primary animate-pulse" />
          <p className="font-black text-gray-400 text-[10px] uppercase">Cargando pipeline...</p>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Activity className="h-12 w-12 text-gray-200" />
          <p className="font-black text-gray-300 text-[10px] uppercase tracking-widest">Sin tratos registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {PIPELINE_STAGES.map(stage => {
            const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
            return (
              <StageSection
                key={stage.id}
                stage={stage}
                deals={stageDeals}
                actsByDeal={actsByDeal}
                onOpenProfile={deal => navigate(`/crm/seguimientos/${deal.id}`, { state: { deal } })}
                onEdit={openEdit}
                onDelete={setDeletingDeal}
              />
            );
          })}
        </div>
      )}

      {/* ── Modal Editar ──────────────────────────────────────────────────── */}
      {editingDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Editar trato</p>
                <h3 className="text-sm font-black text-gray-900 truncate max-w-[280px]">{editingDeal.title}</h3>
              </div>
              <button onClick={() => setEditingDeal(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Título */}
              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Título *</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Empresa + Etapa */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Empresa</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    value={editForm.company}
                    onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Etapa</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                    value={editForm.stage}
                    onChange={e => setEditForm(f => ({ ...f, stage: e.target.value }))}
                  >
                    {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Contacto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Nombre contacto</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    value={editForm.contactName}
                    onChange={e => setEditForm(f => ({ ...f, contactName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Teléfono</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    value={editForm.contactPhone}
                    onChange={e => setEditForm(f => ({ ...f, contactPhone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Correo contacto</label>
                  <input
                    type="email"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    value={editForm.contactEmail}
                    onChange={e => setEditForm(f => ({ ...f, contactEmail: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Valor ($)</label>
                  <input
                    type="number"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    value={editForm.value}
                    onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Fuente</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    value={editForm.source}
                    onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Cierre esperado</label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    value={editForm.expectedClose}
                    onChange={e => setEditForm(f => ({ ...f, expectedClose: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Descripción</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Notas internas</label>
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                  value={editForm.notes}
                  onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setEditingDeal(null)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-xs font-black text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editForm.title.trim()}
                className="flex-1 py-3 rounded-2xl bg-primary text-white text-xs font-black flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Eliminar ───────────────────────────────────────── */}
      {deletingDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-7 w-7 text-red-500" />
              </div>
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Confirmar eliminación</p>
                <p className="text-sm font-black text-gray-900">{deletingDeal.title}</p>
                {deletingDeal.company && (
                  <p className="text-xs font-bold text-gray-400 mt-0.5">{deletingDeal.company}</p>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Se eliminarán también todas las actividades de este trato. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingDeal(null)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-xs font-black text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-xs font-black flex items-center justify-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
