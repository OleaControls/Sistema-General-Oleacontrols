import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity, MessageSquare, PhoneCall, Send, Coffee,
  CheckSquare, ArrowRight, RefreshCw, Filter, User, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

const TYPE_META = {
  NOTE:         { label: 'Nota',              icon: MessageSquare, color: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400' },
  CALL:         { label: 'Llamada',           icon: PhoneCall,     color: 'bg-blue-50 text-blue-600',     dot: 'bg-blue-500' },
  EMAIL:        { label: 'Email',             icon: Send,          color: 'bg-purple-50 text-purple-600', dot: 'bg-purple-500' },
  MEETING:      { label: 'Reunión',           icon: Coffee,        color: 'bg-amber-50 text-amber-700',   dot: 'bg-amber-500' },
  TASK:         { label: 'Tarea',             icon: CheckSquare,   color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  STAGE_CHANGE: { label: 'Cambio de etapa',   icon: ArrowRight,    color: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
};

const STAGE_LABELS = {
  QUALIFICATION: 'Lead / Prospecto', NEEDS_ANALYSIS: 'Acercamiento',
  VALUE_PROPOSITION: 'Contacto decisor', IDENTIFY_DECISION_MAKERS: 'Oportunidad detectada',
  PROPOSAL_PRICE_QUOTE: 'Levantamiento técnico', PROPOSAL_SENT: 'Cotización enviada',
  NEGOTIATION_1: 'Negociación 1', RECOTIZACION: 'Recotización',
  NEGOTIATION_2: 'Negociación 2', CLOSED_WON_PENDING: 'En espera de autorización',
  CLOSED_WON: 'Ganado', CLOSED_LOST: 'Perdido'
};

const STAGE_COLORS = {
  CLOSED_WON: 'bg-emerald-100 text-emerald-700',
  CLOSED_LOST: 'bg-red-100 text-red-600',
  CLOSED_WON_PENDING: 'bg-yellow-100 text-yellow-700',
};

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'ahora mismo';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function CRMActivityFeed() {
  const [activities, setActivities]   = useState([]);
  const [sellers, setSellers]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterSeller, setFilterSeller] = useState('');
  const [filterType,   setFilterType]   = useState('');

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
      const params = new URLSearchParams({ limit: '300' });
      if (filterSeller) params.set('sellerId', filterSeller);
      if (filterType)   params.set('type', filterType);
      const res  = await apiFetch(`/api/crm/activity-feed?${params}`);
      const data = await res.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filterSeller, filterType]);

  useEffect(() => { fetchSellers(); }, []);
  useEffect(() => { fetchFeed(); }, [fetchFeed]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Registro de Actividad</h2>
          <p className="text-gray-400 font-bold text-[10px] mt-1 uppercase tracking-widest flex items-center gap-2">
            <Activity className="h-3 w-3 text-primary" /> Historial completo del pipeline — {activities.length} registros
          </p>
        </div>
        <button
          onClick={fetchFeed}
          className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
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

      {/* Feed */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Activity className="h-10 w-10 text-primary animate-pulse" />
          <p className="font-black text-gray-400 text-[10px] uppercase">Cargando actividad...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Activity className="h-12 w-12 text-gray-200" />
          <p className="font-black text-gray-300 text-[10px] uppercase tracking-widest">Sin actividad registrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((act) => {
            const meta = TYPE_META[act.type] || TYPE_META.NOTE;
            const Icon = meta.icon;
            const deal = act.deal;
            const stageCurrent = STAGE_LABELS[deal?.stage] || deal?.stage || '—';
            const stageColor   = STAGE_COLORS[deal?.stage] || 'bg-gray-100 text-gray-600';

            return (
              <div
                key={act.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex gap-4 items-start hover:shadow-md transition-shadow"
              >
                {/* Ícono tipo */}
                <div className={cn('p-2.5 rounded-xl flex-shrink-0', meta.color)}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {/* Trato */}
                    <span className="font-black text-gray-900 text-sm truncate">{deal?.title || 'Trato eliminado'}</span>
                    {deal?.company && (
                      <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {deal.company}
                      </span>
                    )}
                    {/* Etapa actual */}
                    <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest', stageColor)}>
                      {stageCurrent}
                    </span>
                  </div>

                  {/* Texto actividad */}
                  <p className="text-xs text-gray-600 font-medium">{act.content}</p>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-lg', meta.color)}>
                      {meta.label}
                    </span>
                    {act.authorName && (
                      <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                        <User className="h-3 w-3" /> {act.authorName}
                      </span>
                    )}
                    {deal?.assignedTo && (
                      <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                        <User className="h-3 w-3 text-primary" /> {deal.assignedTo.name}
                      </span>
                    )}
                    <span className="text-[9px] font-bold text-gray-300 ml-auto">{timeAgo(act.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
