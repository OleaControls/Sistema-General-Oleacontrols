import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Building2, User, Mail, Phone, DollarSign, Calendar,
  Activity, PhoneCall, Send, Coffee, CheckSquare, MessageSquare,
  MessageCircle, MapPin, ClipboardCheck, FileText, ArrowRight,
  Clock, TrendingUp, Target, AlertCircle, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

// ── Metadatos de tipos ────────────────────────────────────────────────────────
const TYPE_META = {
  NOTE:         { label: 'Nota',         icon: MessageSquare,  color: 'bg-gray-100 text-gray-600',      pill: 'bg-gray-100 text-gray-700'      },
  CALL:         { label: 'Llamada',      icon: PhoneCall,      color: 'bg-blue-50 text-blue-600',       pill: 'bg-blue-100 text-blue-700'      },
  MESSAGE:      { label: 'Mensaje',      icon: MessageCircle,  color: 'bg-teal-50 text-teal-600',       pill: 'bg-teal-100 text-teal-700'      },
  EMAIL:        { label: 'Correo',       icon: Send,           color: 'bg-purple-50 text-purple-600',   pill: 'bg-purple-100 text-purple-700'  },
  VISIT:        { label: 'Visita',       icon: MapPin,         color: 'bg-green-50 text-green-600',     pill: 'bg-green-100 text-green-700'    },
  MEETING:      { label: 'Reunión',      icon: Coffee,         color: 'bg-amber-50 text-amber-700',     pill: 'bg-amber-100 text-amber-700'    },
  SEGUIMIENTO:  { label: 'Seguimiento',  icon: ClipboardCheck, color: 'bg-indigo-50 text-indigo-700',   pill: 'bg-indigo-100 text-indigo-700'  },
  TASK:         { label: 'Tarea',        icon: CheckSquare,    color: 'bg-emerald-50 text-emerald-700', pill: 'bg-emerald-100 text-emerald-700'},
  QUOTE:        { label: 'Cotización',   icon: FileText,       color: 'bg-orange-50 text-orange-600',   pill: 'bg-orange-100 text-orange-700'  },
  STAGE_CHANGE: { label: 'Cambio etapa', icon: ArrowRight,     color: 'bg-violet-50 text-violet-700',   pill: 'bg-violet-100 text-violet-700'  },
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
    const diff = day === 0 ? -6 : 1 - day;
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
  { id: 'QUALIFICATION',            label: 'Lead',            short: 'Lead',       color: 'bg-slate-400',   text: 'text-slate-600'   },
  { id: 'NEEDS_ANALYSIS',           label: 'Acercamiento',    short: 'Acerc.',     color: 'bg-blue-400',    text: 'text-blue-600'    },
  { id: 'VALUE_PROPOSITION',        label: 'Contacto dec.',   short: 'C.Dec.',     color: 'bg-indigo-500',  text: 'text-indigo-600'  },
  { id: 'IDENTIFY_DECISION_MAKERS', label: 'Op. detectada',   short: 'Op.Det.',    color: 'bg-violet-500',  text: 'text-violet-600'  },
  { id: 'PROPOSAL_PRICE_QUOTE',     label: 'Levantamiento',   short: 'Levant.',    color: 'bg-amber-500',   text: 'text-amber-700'   },
  { id: 'PROPOSAL_SENT',            label: 'Cot. enviada',    short: 'Cot.',       color: 'bg-orange-500',  text: 'text-orange-700'  },
  { id: 'NEGOTIATION_1',            label: 'Negociación 1',   short: 'Neg.1',      color: 'bg-purple-500',  text: 'text-purple-600'  },
  { id: 'RECOTIZACION',             label: 'Recotización',    short: 'Recot.',     color: 'bg-pink-500',    text: 'text-pink-600'    },
  { id: 'NEGOTIATION_2',            label: 'Negociación 2',   short: 'Neg.2',      color: 'bg-rose-500',    text: 'text-rose-600'    },
  { id: 'CLOSED_WON_PENDING',       label: 'En autorización', short: 'Autor.',     color: 'bg-yellow-500',  text: 'text-yellow-700'  },
  { id: 'CLOSED_WON',               label: 'Ganado',          short: 'Ganado',     color: 'bg-emerald-500', text: 'text-emerald-700' },
  { id: 'CLOSED_LOST',              label: 'Perdido',         short: 'Perdido',    color: 'bg-red-500',     text: 'text-red-600'     },
];

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'ahora mismo';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_COLORS = { PENDING: '#94a3b8', COMPLETED: '#22c55e', FAILED: '#ef4444' };
const STATUS_LABELS = { PENDING: 'Pendiente', COMPLETED: 'Completado', FAILED: 'No completado' };

// ── Pipeline progress visual ──────────────────────────────────────────────────
function PipelineProgress({ currentStage }) {
  const activeIndex = PIPELINE_STAGES.findIndex(s => s.id === currentStage);
  const isLost = currentStage === 'CLOSED_LOST';
  const isWon  = currentStage === 'CLOSED_WON';

  // Solo mostrar etapas activas (excluyendo ganado/perdido del flujo normal)
  const mainStages = PIPELINE_STAGES.filter(s => !['CLOSED_WON', 'CLOSED_LOST'].includes(s.id));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {mainStages.map((stage, i) => {
          const stageIdx = PIPELINE_STAGES.findIndex(s => s.id === stage.id);
          const isPast    = !isLost && stageIdx < activeIndex;
          const isCurrent = stage.id === currentStage;
          const isFuture  = stageIdx > activeIndex || isLost;

          return (
            <React.Fragment key={stage.id}>
              <div className={cn(
                'flex-shrink-0 flex flex-col items-center gap-1 transition-all',
                isCurrent ? 'scale-110' : ''
              )}>
                <div className={cn(
                  'h-2.5 w-2.5 rounded-full border-2 border-white shadow-sm',
                  isCurrent ? stage.color + ' ring-2 ring-offset-1 ' + stage.color.replace('bg-', 'ring-') :
                  isPast    ? 'bg-gray-300' :
                  'bg-gray-100'
                )} />
                {isCurrent && (
                  <span className={cn('text-[7px] font-black uppercase tracking-widest whitespace-nowrap', stage.text)}>
                    {stage.short}
                  </span>
                )}
              </div>
              {i < mainStages.length - 1 && (
                <div className={cn('flex-1 h-0.5 min-w-[8px]', isPast && !isLost ? 'bg-gray-300' : 'bg-gray-100')} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Badge etapa actual */}
      <div className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest',
        isWon  ? 'bg-emerald-100 text-emerald-700' :
        isLost ? 'bg-red-100 text-red-600' :
        PIPELINE_STAGES.find(s => s.id === currentStage)?.color.replace('bg-', 'bg-') + '/15 ' +
        (PIPELINE_STAGES.find(s => s.id === currentStage)?.text || 'text-gray-600')
      )}>
        <div className={cn('w-2 h-2 rounded-full', PIPELINE_STAGES.find(s => s.id === currentStage)?.color)} />
        {PIPELINE_STAGES.find(s => s.id === currentStage)?.label || currentStage}
      </div>
    </div>
  );
}

// ── Vista principal ───────────────────────────────────────────────────────────
export default function ProspectoProfile() {
  const { dealId } = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();

  const openQuote = useCallback((content) => {
    const match = content?.match(/Folio:\s*([^\s|]+)/);
    if (match?.[1]) navigate('/crm/quotes', { state: { openQuote: match[1] } });
    else navigate('/crm/quotes');
  }, [navigate]);

  // El deal puede venir por state (desde Seguimientos) o se carga por API
  const [deal, setDeal]         = useState(location.state?.deal || null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filterType,   setFilterType]   = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Si no tenemos deal por state, buscamos en la lista
        if (!deal) {
          const res  = await apiFetch('/api/crm/deals');
          const list = await res.json();
          const found = Array.isArray(list) ? list.find(d => d.id === dealId) : null;
          if (found) setDeal(found);
        }
        // Actividades del trato
        const actRes  = await apiFetch(`/api/crm/deal-activities?dealId=${dealId}`);
        const actData = await actRes.json();
        setActivities(Array.isArray(actData) ? actData : []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [dealId]);

  // Contadores por tipo filtrados por periodo
  const counts = useMemo(() => {
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

  const filteredActs = useMemo(() => {
    const range = getPeriodRange(filterPeriod);
    return activities.filter(a => {
      if (filterType && a.type !== filterType) return false;
      if (range) {
        const d = new Date(a.createdAt);
        if (d < range.from || d > range.to) return false;
      }
      return true;
    });
  }, [activities, filterType, filterPeriod]);

  const daysUntilClose = deal?.expectedClose
    ? Math.ceil((new Date(deal.expectedClose) - Date.now()) / 86400000)
    : null;

  if (loading && !deal) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Activity className="h-10 w-10 text-primary animate-pulse" />
      <p className="font-black text-gray-400 text-[10px] uppercase tracking-widest">Cargando perfil...</p>
    </div>
  );

  if (!deal) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <AlertCircle className="h-10 w-10 text-gray-300" />
      <p className="font-black text-gray-300 text-[10px] uppercase tracking-widest">Prospecto no encontrado</p>
      <button onClick={() => navigate('/crm/seguimientos')} className="text-primary font-black text-xs underline">
        Volver a Seguimientos
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">

      {/* ── Back + título ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/crm/seguimientos')}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Seguimientos / Perfil</p>
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic leading-tight">
            {deal.title}
          </h2>
        </div>
      </div>

      {/* ── Hero card ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">

        {/* Empresa + contacto */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            {deal.company && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span className="text-lg font-black text-gray-900">{deal.company}</span>
              </div>
            )}
            {deal.contactName && (
              <div className="flex items-center gap-2 text-gray-500">
                <User className="h-3.5 w-3.5" />
                <span className="text-sm font-bold">{deal.contactName}</span>
              </div>
            )}
            {deal.contactEmail && (
              <div className="flex items-center gap-2 text-gray-400">
                <Mail className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{deal.contactEmail}</span>
              </div>
            )}
            {deal.contactPhone && (
              <div className="flex items-center gap-2 text-gray-400">
                <Phone className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">{deal.contactPhone}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 text-right">
            {deal.value > 0 && (
              <div className="flex items-center gap-1 justify-end">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-2xl font-black text-emerald-600">{fmt(deal.value)}</span>
              </div>
            )}
            {deal.probability != null && (
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                {deal.probability}% probabilidad
              </div>
            )}
            {deal.assignedTo && (
              <div className="flex items-center gap-1.5 justify-end">
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white text-[8px] font-black">
                  {deal.assignedTo.name.charAt(0)}
                </div>
                <span className="text-[9px] font-bold text-gray-500">{deal.assignedTo.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline progress */}
        <div className="border-t border-gray-50 pt-4">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3">Posición en el Pipeline</p>
          <PipelineProgress currentStage={deal.stage} />
        </div>

        {/* Detalles adicionales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-gray-50 pt-4">
          {deal.source && (
            <div className="bg-gray-50 rounded-2xl p-3">
              <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1">Fuente</p>
              <p className="text-xs font-black text-gray-700">{deal.source}</p>
            </div>
          )}
          {deal.expectedClose && (
            <div className={cn('rounded-2xl p-3', daysUntilClose < 0 ? 'bg-red-50' : daysUntilClose <= 7 ? 'bg-amber-50' : 'bg-gray-50')}>
              <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1">Cierre esperado</p>
              <p className={cn('text-xs font-black', daysUntilClose < 0 ? 'text-red-600' : daysUntilClose <= 7 ? 'text-amber-700' : 'text-gray-700')}>
                {fmtDate(deal.expectedClose)}
              </p>
              {daysUntilClose !== null && (
                <p className={cn('text-[8px] font-bold', daysUntilClose < 0 ? 'text-red-500' : 'text-gray-400')}>
                  {daysUntilClose < 0 ? `Vencido ${Math.abs(daysUntilClose)}d` : daysUntilClose === 0 ? 'Hoy' : `${daysUntilClose}d restantes`}
                </p>
              )}
            </div>
          )}
          <div className="bg-gray-50 rounded-2xl p-3">
            <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1">Creado</p>
            <p className="text-xs font-black text-gray-700">{fmtDate(deal.createdAt)}</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-3">
            <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1">Actualizado</p>
            <p className="text-xs font-black text-gray-700">{fmtDate(deal.updatedAt)}</p>
          </div>
        </div>

        {/* Descripción / Notas */}
        {(deal.description || deal.notes) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-gray-50 pt-4">
            {deal.description && (
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Descripción</p>
                <p className="text-xs text-gray-600 font-medium leading-relaxed">{deal.description}</p>
              </div>
            )}
            {deal.notes && (
              <div className="bg-amber-50 rounded-2xl p-3">
                <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest mb-1">Notas internas</p>
                <p className="text-xs text-amber-800 font-medium leading-relaxed">{deal.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Razón de cierre */}
        {deal.closeReason && (
          <div className={cn('rounded-2xl p-4 border-t border-gray-50 pt-4')}>
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
              {deal.stage === 'CLOSED_WON' ? 'Motivo de cierre exitoso' : 'Motivo de pérdida'}
            </p>
            <p className={cn('text-sm font-bold', deal.stage === 'CLOSED_WON' ? 'text-emerald-700' : 'text-red-600')}>
              {deal.closeReason}
            </p>
          </div>
        )}
      </div>

      {/* ── Contadores de actividades ─────────────────────────────────────── */}
      {!loading && (
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { type: 'CALL',        label: 'Llamadas'     },
            { type: 'MESSAGE',     label: 'Mensajes'     },
            { type: 'EMAIL',       label: 'Correos'      },
            { type: 'VISIT',       label: 'Visitas'      },
            { type: 'SEGUIMIENTO', label: 'Seguimientos' },
            { type: 'QUOTE',       label: 'Cotizaciones' },
          ].map(({ type, label }) => {
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            const count = counts[type] || 0;
            return (
              <button
                key={type}
                onClick={() => setFilterType(t => t === type ? '' : type)}
                className={cn(
                  'rounded-2xl p-4 flex flex-col gap-1 text-left transition-all border-2',
                  filterType === type
                    ? meta.color + ' border-current shadow-sm'
                    : meta.color + ' border-transparent opacity-80 hover:opacity-100'
                )}
              >
                <Icon className="h-4 w-4 mb-1 opacity-70" />
                <span className="text-2xl font-black">{count}</span>
                <span className="text-[9px] font-black uppercase tracking-widest opacity-70">{label}</span>
              </button>
            );
          })}
        </div>
        </>
      )}

      {/* ── Timeline de actividades ───────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-50 bg-gray-50">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Historial de Actividades</h3>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              {filterType ? `Mostrando: ${TYPE_META[filterType]?.label}` : 'Todos los registros'} — {filteredActs.length} entradas
            </p>
          </div>
          {filterType && (
            <button
              onClick={() => setFilterType('')}
              className="text-[8px] font-black text-gray-400 hover:text-gray-700 uppercase tracking-widest px-3 py-1.5 bg-white rounded-xl border transition-colors"
            >
              Ver todos
            </button>
          )}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <Activity className="h-6 w-6 animate-pulse text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">Cargando actividades...</span>
            </div>
          ) : filteredActs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Activity className="h-10 w-10 text-gray-200" />
              <p className="font-black text-gray-300 text-[10px] uppercase tracking-widest">
                {filterType ? 'Sin actividades de este tipo' : 'Sin actividades registradas'}
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {filteredActs.map((act, i) => {
                const meta  = TYPE_META[act.type] || TYPE_META.NOTE;
                const Icon  = meta.icon;
                const isLast = i === filteredActs.length - 1;
                const isOverdue = act.dueDate && new Date(act.dueDate) < new Date() && act.status !== 'COMPLETED';
                const statusColor = STATUS_COLORS[act.status] || STATUS_COLORS.PENDING;
                const statusLabel = STATUS_LABELS[act.status] || 'Pendiente';
                const fmtDT = (d) => d ? new Date(d).toLocaleString('es-MX', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : null;

                return (
                  <div key={act.id} className="flex gap-4">
                    {/* Línea de tiempo */}
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className={cn('h-9 w-9 rounded-2xl flex items-center justify-center', isOverdue ? 'bg-red-100 text-red-500' : meta.color)}>
                        {isOverdue ? <AlertCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      {!isLast && <div className="w-px flex-1 bg-gray-100 my-1" />}
                    </div>

                    {/* Contenido */}
                    <div className={cn('flex-1 pb-5', isLast && 'pb-0')}>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={cn('text-[8px] font-black uppercase tracking-widest', isOverdue ? 'text-red-500' : meta.color.replace('bg-', 'text-').split(' ')[1] || 'text-gray-600')}>
                          {meta.label}
                        </span>
                        {isOverdue && (
                          <span className="text-[7px] font-black px-2 py-0.5 rounded-lg bg-red-500 text-white animate-pulse">VENCIDA</span>
                        )}
                        {/* Semáforo de estado */}
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ background: statusColor }}
                          title={statusLabel}
                        />
                        <span className="text-[8px] font-bold" style={{ color: statusColor }}>{statusLabel}</span>
                        {act.authorName && (
                          <span className="text-[8px] font-bold text-gray-400 flex items-center gap-1">
                            <User className="h-2.5 w-2.5" />{act.authorName}
                          </span>
                        )}
                        <span className="text-[8px] font-bold text-gray-300 ml-auto flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />{timeAgo(act.createdAt)}
                        </span>
                      </div>

                      <div
                        className={cn('rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 leading-relaxed', isOverdue ? 'bg-red-50 text-red-800' : 'bg-gray-50')}
                      >
                        {act.content}
                      </div>

                      {/* Botón ver cotización */}
                      {act.type === 'QUOTE' && (
                        <button
                          onClick={() => openQuote(act.content)}
                          className="mt-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl border border-orange-100 transition-colors"
                        >
                          <FileText className="h-3 w-3" />
                          Ver cotización
                        </button>
                      )}

                      {act.dueDate && (
                        <p className="text-[8px] font-bold mt-1.5 flex items-center gap-1" style={{ color: isOverdue ? '#ef4444' : '#94a3b8' }}>
                          <Calendar className="h-2.5 w-2.5" />
                          {isOverdue ? `Venció: ${fmtDT(act.dueDate)}` : `Fecha: ${fmtDT(act.dueDate)}`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
