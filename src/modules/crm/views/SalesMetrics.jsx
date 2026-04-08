import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Target, TrendingUp, Users, Award, Percent,
  BarChart2, Activity, Calendar, ChevronRight, RefreshCw,
  CheckCircle2, XCircle, Clock, Briefcase, Star,
  MessageSquare, PhoneCall, Send, Coffee, ArrowRight, User, Building2,
  FileText, MapPin, BookOpen, Layers
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import { useAuth, ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

// ── Paleta de colores para vendedores ─────────────────────────────────────────
const SELLER_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
  '#f43f5e', '#0ea5e9', '#14b8a6', '#ef4444',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt     = (n) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '';

const PERIODS = [
  { key: 'week',      label: 'Semana',   days: 7  },
  { key: 'fortnight', label: '15 Días',  days: 15 },
  { key: 'month',     label: 'Mes',      days: 30 },
];

// ── Tooltip personalizado ─────────────────────────────────────────────────────
const RichTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15,23,42,0.97)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, padding: '10px 14px', boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
      minWidth: 140,
    }}>
      <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </p>
      {payload.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.fill || e.color, flexShrink: 0 }} />
          <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>{e.name}:</span>
          <span style={{ color: '#f8fafc', fontSize: 11, fontWeight: 800 }}>
            {typeof e.value === 'number' && e.name?.includes('$')
              ? fmt(e.value)
              : e.name?.includes('%')
              ? `${e.value}%`
              : e.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Semáforo de estado ────────────────────────────────────────────────────────
const STATUS_META = {
  PENDING:   { label: 'Pendiente',     color: '#94a3b8' },
  COMPLETED: { label: 'Completado',    color: '#22c55e' },
  FAILED:    { label: 'No completado', color: '#ef4444' },
};

// ── Meta de tipos de actividad ────────────────────────────────────────────────
const ACT_META = {
  NOTE:         { label: 'Nota',            icon: MessageSquare, color: '#64748b' },
  CALL:         { label: 'Llamada',         icon: PhoneCall,     color: '#3b82f6' },
  EMAIL:        { label: 'Email',           icon: Send,          color: '#8b5cf6' },
  MEETING:      { label: 'Reunión',         icon: Coffee,        color: '#f59e0b' },
  TASK:         { label: 'Tarea',           icon: CheckCircle2,  color: '#10b981' },
  STAGE_CHANGE: { label: 'Cambio de etapa', icon: ArrowRight,    color: '#6366f1' },
};

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ── Tarjeta de KPI del vendedor ───────────────────────────────────────────────
function SellerCard({ data, color, rank }) {
  const { seller, wonDeals, activeDeals, lostDeals, deals, wonValue, pipelineValue, quotes, acceptedQuotes, leads, closeRate, activities } = data;
  const initial = (seller.name || '?').charAt(0).toUpperCase();

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
      {/* Banda de color */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />

      <div className="p-5 space-y-4">
        {/* Header vendedor */}
        <div className="flex items-center gap-3">
          {seller.avatar ? (
            <img src={seller.avatar} alt={seller.name} className="w-10 h-10 rounded-2xl object-cover flex-shrink-0" />
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: 14, flexShrink: 0,
              background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 16, fontWeight: 900, color }}>{initial}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-sm truncate">{seller.name}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Vendedor #{rank}</p>
          </div>
          <div style={{
            width: 28, height: 28, borderRadius: 10,
            background: rank === 1 ? '#fef3c7' : '#f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {rank === 1
              ? <Star style={{ width: 14, height: 14, color: '#f59e0b' }} />
              : <span style={{ fontSize: 11, fontWeight: 900, color: '#64748b' }}>#{rank}</span>
            }
          </div>
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-2 gap-2">
          <MiniKPI label="Deals Ganados" value={wonDeals} icon={CheckCircle2} hex="#10b981" bg="#ecfdf5" />
          <MiniKPI label="Valor ganado"  value={fmt(wonValue)} icon={DollarSign} hex="#3b82f6" bg="#eff6ff" />
          <MiniKPI label="En Pipeline"   value={activeDeals}   icon={Activity}    hex="#8b5cf6" bg="#f5f3ff" />
          <MiniKPI label="Tasa de Cierre" value={`${closeRate}%`} icon={Target} hex="#f59e0b" bg="#fffbeb" />
        </div>

        {/* Barra de progreso cierre */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tasa de cierre</span>
            <span style={{ fontSize: 11, fontWeight: 900, color }}>{closeRate}%</span>
          </div>
          <div style={{ height: 5, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${Math.min(closeRate, 100)}%`,
              background: `linear-gradient(90deg, ${color}, ${color}bb)`,
              borderRadius: 999, transition: 'width 0.8s ease',
            }} />
          </div>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-4 gap-1 pt-1 border-t border-gray-50">
          <QuickStat label="Deals"       value={deals} />
          <QuickStat label="Cotiz."      value={quotes} />
          <QuickStat label="Leads"       value={leads} />
          <QuickStat label="Actividades" value={activities ?? 0} />
        </div>
      </div>
    </div>
  );
}

function MiniKPI({ label, value, icon: Icon, hex, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '10px 12px' }}>
      <Icon style={{ width: 12, height: 12, color: hex, marginBottom: 4 }} />
      <p style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 8, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>{label}</p>
    </div>
  );
}

function QuickStat({ label, value }) {
  return (
    <div className="text-center py-1">
      <p className="text-base font-black text-gray-800">{value}</p>
      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}

// ── Tabla comparativa ─────────────────────────────────────────────────────────
function ComparisonTable({ metrics, colors }) {
  const sorted = [...metrics].sort((a, b) => b.wonValue - a.wonValue);
  const maxVal = sorted[0]?.wonValue || 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {['#', 'Vendedor', 'Deals', 'Ganados', 'Perdidos', 'Pipeline', 'Cotiz.', 'Aceptadas', 'Valor Ganado', 'Cierre %'].map(h => (
              <th key={h} className="text-left pb-3 pr-4 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((m, i) => {
            const color = colors[i % colors.length];
            return (
              <tr key={m.seller.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="py-3 pr-4">
                  <span style={{
                    width: 22, height: 22, borderRadius: 8, fontSize: 10, fontWeight: 900,
                    background: i === 0 ? '#fef3c7' : '#f1f5f9',
                    color: i === 0 ? '#d97706' : '#475569',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>{i + 1}</span>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div style={{
                      width: 28, height: 28, borderRadius: 9,
                      background: `${color}18`, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color }}>{m.seller.name.charAt(0)}</span>
                    </div>
                    <span className="font-black text-gray-900 text-xs whitespace-nowrap">{m.seller.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 font-black text-gray-700 text-sm">{m.deals}</td>
                <td className="py-3 pr-4">
                  <span className="font-black text-emerald-600 text-sm">{m.wonDeals}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className="font-black text-red-400 text-sm">{m.lostDeals}</span>
                </td>
                <td className="py-3 pr-4 font-black text-violet-500 text-sm">{m.activeDeals}</td>
                <td className="py-3 pr-4 font-black text-gray-700 text-sm">{m.quotes}</td>
                <td className="py-3 pr-4 font-black text-blue-500 text-sm">{m.acceptedQuotes}</td>
                <td className="py-3 pr-4">
                  <div className="space-y-1">
                    <span className="font-black text-gray-900 text-xs whitespace-nowrap">{fmt(m.wonValue)}</span>
                    <div style={{ height: 3, background: '#f1f5f9', borderRadius: 999, width: 80, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.min((m.wonValue / maxVal) * 100, 100)}%`,
                        background: color, borderRadius: 999,
                      }} />
                    </div>
                  </div>
                </td>
                <td className="py-3">
                  <span style={{
                    fontSize: 11, fontWeight: 900, color,
                    background: `${color}15`, borderRadius: 8,
                    padding: '3px 8px', display: 'inline-block',
                  }}>{m.closeRate}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Tabla de actividad y seguimiento de pipeline ──────────────────────────────
const STAGE_LABELS = {
  QUALIFICATION: 'Lead / Prospecto', NEEDS_ANALYSIS: 'Acercamiento',
  VALUE_PROPOSITION: 'Contacto decisor', IDENTIFY_DECISION_MAKERS: 'Oportunidad detectada',
  PROPOSAL_PRICE_QUOTE: 'Levantamiento técnico', PROPOSAL_SENT: 'Cotización enviada',
  NEGOTIATION_1: 'Negociación 1', RECOTIZACION: 'Recotización',
  NEGOTIATION_2: 'Negociación 2', CLOSED_WON_PENDING: 'En espera de autorización',
  CLOSED_WON: 'Ganado', CLOSED_LOST: 'Perdido',
};
const STAGE_DOT = {
  CLOSED_WON: '#10b981', CLOSED_LOST: '#ef4444',
  CLOSED_WON_PENDING: '#f59e0b',
};

function ActivityTable({ activities, deals, metrics }) {
  const [tab,          setTab]          = useState('pipeline');
  const [filterSeller, setFilterSeller] = useState('');
  const [filterType,   setFilterType]   = useState('');

  const sellers = metrics.map(m => m.seller);

  const filteredDeals = deals.filter(d => {
    return !filterSeller || d.assignedTo?.id === filterSeller;
  });

  const filteredActs = activities.filter(a => {
    const sellerOk = !filterSeller || a.deal?.assignedTo?.id === filterSeller;
    const typeOk   = !filterType   || a.type === filterType;
    return sellerOk && typeOk;
  });

  const count = tab === 'pipeline' ? filteredDeals.length : filteredActs.length;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div style={{ width:36, height:36, borderRadius:12, background:'#fef3c7', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Activity style={{ width:16, height:16, color:'#f59e0b' }} />
        </div>
        <div>
          <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">Seguimiento de Pipeline y Actividad</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{count} registros</p>
        </div>
        <div className="flex-1 h-px ml-2" style={{ background:'linear-gradient(90deg, #f59e0b30, transparent)' }} />
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div style={{ height:3, background:'linear-gradient(90deg, #f59e0b, #f59e0b44)' }} />

        {/* Tabs + filtros */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-50">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {[
              { key:'pipeline',   label:'Pipeline / Tratos' },
              { key:'activities', label:'Registro de Actividad' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all',
                  tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                )}
              >{t.label}</button>
            ))}
          </div>

          {/* Filtro vendedor */}
          <select
            className="bg-gray-50 rounded-xl px-3 py-2 font-bold text-xs text-gray-700 outline-none cursor-pointer border border-gray-100"
            value={filterSeller}
            onChange={e => setFilterSeller(e.target.value)}
          >
            <option value="">Todos los vendedores</option>
            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* Filtro tipo (solo en tab actividades) */}
          {tab === 'activities' && (
            <select
              className="bg-gray-50 rounded-xl px-3 py-2 font-bold text-xs text-gray-700 outline-none cursor-pointer border border-gray-100"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {Object.entries(ACT_META).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* ── TAB: PIPELINE ────────────────────────────────────────────────── */}
        {tab === 'pipeline' && (
          filteredDeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <Briefcase className="w-10 h-10 text-gray-200" />
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sin tratos registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Vendedor','Trato','Empresa','Etapa','Valor','Probabilidad','Cierre Esp.','Actividades'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredDeals.map(deal => {
                    const stage = STAGE_LABELS[deal.stage] || deal.stage || '—';
                    const dot   = STAGE_DOT[deal.stage] || '#94a3b8';
                    const close = deal.expectedClose
                      ? new Date(deal.expectedClose).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
                      : '—';
                    return (
                      <tr key={deal.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          {deal.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <div style={{ width:24,height:24,borderRadius:8,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                                <span style={{ fontSize:10,fontWeight:900,color:'#475569' }}>{deal.assignedTo.name.charAt(0)}</span>
                              </div>
                              <span className="font-black text-gray-800 text-[11px]">{deal.assignedTo.name}</span>
                            </div>
                          ) : <span className="text-gray-300 text-[11px]">Sin asignar</span>}
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-black text-gray-900 text-[11px]">{deal.title}</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="font-bold text-gray-500 text-[11px]">{deal.company || '—'}</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div style={{ width:6,height:6,borderRadius:'50%',background:dot,flexShrink:0 }} />
                            <span className="font-bold text-gray-700 text-[10px]">{stage}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="font-black text-emerald-600 text-[11px]">{fmt(deal.value)}</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div style={{ width:48,height:4,background:'#f1f5f9',borderRadius:999,overflow:'hidden' }}>
                              <div style={{ height:'100%',width:`${deal.probability||0}%`,background:dot,borderRadius:999 }} />
                            </div>
                            <span className="font-black text-[10px]" style={{ color:dot }}>{deal.probability||0}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="font-bold text-gray-500 text-[10px]">{close}</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="font-black text-gray-700 text-[11px]">{deal._count?.activities ?? 0}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── TAB: ACTIVIDADES ─────────────────────────────────────────────── */}
        {tab === 'activities' && (
          filteredActs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <Activity className="w-10 h-10 text-gray-200" />
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sin actividad registrada</p>
              <p className="text-[9px] font-bold text-gray-300">Las actividades se crean al mover tratos o registrar notas/llamadas en el pipeline</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Estado','Fecha','Fecha/Hora Act.','Vendedor','Trato','Empresa','Etapa actual','Tipo','Detalle','Registrado por'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredActs.map(act => {
                    const meta  = ACT_META[act.type] || ACT_META.NOTE;
                    const Icon  = meta.icon;
                    const stage = STAGE_LABELS[act.deal?.stage] || act.deal?.stage || '—';
                    const dot   = STAGE_DOT[act.deal?.stage] || '#94a3b8';
                    const sMeta  = STATUS_META[act.status] || STATUS_META.PENDING;
                    const created = new Date(act.createdAt).toLocaleDateString('es-MX', {
                      day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
                    });
                    const due = act.dueDate
                      ? new Date(act.dueDate).toLocaleString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
                      : '—';
                    return (
                      <tr key={act.id} className="hover:bg-amber-50/30 transition-colors">
                        {/* Semáforo */}
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div style={{ width:10, height:10, borderRadius:'50%', background:sMeta.color, flexShrink:0 }} />
                            <span style={{ fontSize:9, fontWeight:800, color:sMeta.color }}>{sMeta.label}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="text-[10px] font-bold text-gray-500">{created}</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="text-[10px] font-bold text-gray-500">{due}</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          {act.deal?.assignedTo ? (
                            <div className="flex items-center gap-2">
                              <div style={{ width:24,height:24,borderRadius:8,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                                <span style={{ fontSize:10,fontWeight:900,color:'#475569' }}>{act.deal.assignedTo.name.charAt(0)}</span>
                              </div>
                              <span className="font-black text-gray-800 text-[11px]">{act.deal.assignedTo.name}</span>
                            </div>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-black text-gray-900 text-[11px]">{act.deal?.title || '—'}</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="font-bold text-gray-500 text-[11px]">{act.deal?.company || '—'}</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div style={{ width:6,height:6,borderRadius:'50%',background:dot,flexShrink:0 }} />
                            <span className="font-bold text-gray-700 text-[10px]">{stage}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div style={{ display:'inline-flex',alignItems:'center',gap:4,background:`${meta.color}15`,borderRadius:8,padding:'3px 8px' }}>
                            <Icon style={{ width:10,height:10,color:meta.color }} />
                            <span style={{ fontSize:9,fontWeight:800,color:meta.color,textTransform:'uppercase',letterSpacing:'0.05em' }}>{meta.label}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 max-w-xs">
                          <span className="font-medium text-gray-600 text-[11px] line-clamp-2">{act.content}</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="font-bold text-gray-400 text-[10px]">{act.authorName || '—'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function SalesMetrics() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('ADMIN') || user?.role === 'ADMIN';

  const [period, setPeriod]         = useState('month');
  const [metrics, setMetrics]       = useState([]);
  const [activities, setActivities] = useState([]);
  const [deals, setDeals]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  // Gestión de datos: bitácora, reporte diario, cartera
  const [salesSummary,   setSalesSummary]   = useState([]);
  const [myReporte,      setMyReporte]      = useState([]);
  const [myBitacora,     setMyBitacora]     = useState([]);
  const [myCartera,      setMyCartera]      = useState([]);

  // Razones de cierre
  const [closedDeals, setClosedDeals] = useState([]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, dealsRes, actsRes] = await Promise.all([
        apiFetch(`/api/crm/sales-metrics?period=${period}`),
        apiFetch('/api/crm/deals'),
        isAdmin ? apiFetch('/api/crm/activity-feed?limit=200') : Promise.resolve(null),
      ]);

      const [metricsData, dealsData] = await Promise.all([
        metricsRes.json(),
        dealsRes.json(),
      ]);

      if (!metricsRes.ok) throw new Error(metricsData.error || 'Error al cargar');
      setMetrics(Array.isArray(metricsData) ? metricsData : []);
      setDeals(Array.isArray(dealsData) ? dealsData : []);

      if (actsRes) {
        const actsData = await actsRes.json();
        setActivities(Array.isArray(actsData) ? actsData : []);
      }

      // Razones de cierre — filtramos del array de deals ya cargado
      const closed = (Array.isArray(dealsData) ? dealsData : [])
        .filter(d => (d.stage === 'CLOSED_WON' || d.stage === 'CLOSED_LOST') && d.closeReason);
      setClosedDeals(closed);

      // Fetch datos de gestión
      if (isAdmin) {
        const summaryRes = await apiFetch('/api/sales-data?type=summary');
        if (summaryRes.ok) setSalesSummary(await summaryRes.json());
      } else {
        const [repRes, bitRes, carRes] = await Promise.all([
          apiFetch('/api/sales-data?type=reporte'),
          apiFetch('/api/sales-data?type=bitacora'),
          apiFetch('/api/sales-data?type=cartera'),
        ]);
        const [rep, bit, car] = await Promise.all([repRes.json(), bitRes.json(), carRes.json()]);
        setMyReporte(Array.isArray(rep) ? rep : []);
        setMyBitacora(Array.isArray(bit) ? bit : []);
        setMyCartera(Array.isArray(car) ? car : []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period, isAdmin]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  // ── Datos para gráficas ────────────────────────────────────────────────────
  const barData = metrics.map((m, i) => ({
    name: m.seller.name.split(' ')[0],
    'Valor Ganado $': Math.round(m.wonValue),
    'Pipeline $':     Math.round(m.pipelineValue),
    Deals:            m.deals,
    'Cierre %':       m.closeRate,
    fill:             SELLER_COLORS[i % SELLER_COLORS.length],
  }));

  const radarData = metrics.length > 0
    ? [
        { metric: 'Deals',      ...Object.fromEntries(metrics.map(m => [m.seller.name.split(' ')[0], m.deals])) },
        { metric: 'Ganados',    ...Object.fromEntries(metrics.map(m => [m.seller.name.split(' ')[0], m.wonDeals])) },
        { metric: 'Cotizac.',   ...Object.fromEntries(metrics.map(m => [m.seller.name.split(' ')[0], m.quotes])) },
        { metric: 'Leads',      ...Object.fromEntries(metrics.map(m => [m.seller.name.split(' ')[0], m.leads])) },
        { metric: 'Cierre %',   ...Object.fromEntries(metrics.map(m => [m.seller.name.split(' ')[0], m.closeRate])) },
      ]
    : [];

  // ── Totales globales (para ADMIN) ──────────────────────────────────────────
  const totals = metrics.reduce((acc, m) => ({
    deals:          acc.deals          + m.deals,
    wonDeals:       acc.wonDeals       + m.wonDeals,
    wonValue:       acc.wonValue       + m.wonValue,
    pipelineValue:  acc.pipelineValue  + m.pipelineValue,
    quotes:         acc.quotes         + m.quotes,
    leads:          acc.leads          + m.leads,
    activities:     acc.activities     + (m.activities || 0),
    avgCloseRate:   0,
  }), { deals: 0, wonDeals: 0, wonValue: 0, pipelineValue: 0, quotes: 0, leads: 0, activities: 0 });
  totals.avgCloseRate = metrics.length > 0
    ? Math.round(metrics.reduce((s, m) => s + m.closeRate, 0) / metrics.length)
    : 0;

  const currentPeriod = PERIODS.find(p => p.key === period);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Cargando métricas...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <XCircle className="w-10 h-10 text-red-400" />
      <p className="text-sm font-black text-gray-600">{error}</p>
      <button onClick={fetchMetrics} className="px-4 py-2 rounded-xl bg-blue-500 text-white font-black text-xs uppercase">
        Reintentar
      </button>
    </div>
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">

      {/* ── HERO HEADER ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0c1a35 100%)',
        borderRadius: 28, padding: '28px 28px 32px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:-60, right:-40, width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle, #3b82f640, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:'35%', width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle, #8b5cf620, transparent 70%)', pointerEvents:'none' }} />

        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-7">
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{ height:2, width:24, background:'#3b82f6', borderRadius:999 }} />
                <span style={{ fontSize:10, fontWeight:800, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                  Panel Comercial
                </span>
              </div>
              <h2 style={{ fontSize:32, fontWeight:900, color:'#f8fafc', lineHeight:1.05, letterSpacing:'-0.025em', margin:0 }}>
                Métricas <span style={{ color:'#60a5fa' }}>de Ventas</span>
              </h2>
              <p style={{ fontSize:12, color:'#94a3b8', fontWeight:600, marginTop:8 }}>
                {metrics.length} vendedor{metrics.length !== 1 ? 'es' : ''} · Últimos {currentPeriod?.days} días
              </p>
            </div>

            {/* Selector de período */}
            <div className="flex gap-2 flex-shrink-0">
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  style={{
                    padding: '8px 16px', borderRadius: 12, fontSize: 11, fontWeight: 800,
                    transition: 'all 0.2s',
                    background: period === p.key ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                    color: period === p.key ? '#fff' : '#94a3b8',
                    border: period === p.key ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  }}>
                  {p.label}
                </button>
              ))}
              <button onClick={fetchMetrics} style={{
                width: 36, height: 36, borderRadius: 10, display:'flex', alignItems:'center', justifyContent:'center',
                background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)',
                color:'#94a3b8', cursor:'pointer',
              }}>
                <RefreshCw style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>

          {/* KPIs globales (solo ADMIN) */}
          {isAdmin && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Deals totales',    value: totals.deals,              icon: Briefcase,   color: '#60a5fa' },
                { label: 'Ganados',          value: totals.wonDeals,           icon: CheckCircle2,color: '#34d399' },
                { label: 'Valor ganado',     value: fmt(totals.wonValue),      icon: DollarSign,  color: '#34d399' },
                { label: 'Pipeline',         value: fmt(totals.pipelineValue), icon: Activity,    color: '#a78bfa' },
                { label: 'Cotizaciones',     value: totals.quotes,             icon: BarChart2,   color: '#fbbf24' },
                { label: 'Actividades',      value: totals.activities,         icon: MessageSquare,color:'#f472b6' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} style={{ background:'rgba(255,255,255,0.06)', borderRadius:16, padding:'14px 16px', backdropFilter:'blur(8px)' }}>
                  <Icon style={{ width:13, height:13, color, marginBottom:8 }} />
                  <p style={{ fontSize:20, fontWeight:900, color:'#f8fafc', lineHeight:1 }}>{value}</p>
                  <p style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:5 }}>{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Sin datos ────────────────────────────────────────────────────────── */}
      {metrics.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <BarChart2 className="w-12 h-12 text-gray-200" />
          <p className="text-sm font-black text-gray-500">Sin datos para este período</p>
          <p className="text-[11px] font-bold text-gray-400">Crea deals, leads o cotizaciones para ver métricas</p>
        </div>
      )}

      {/* ── TARJETAS POR VENDEDOR ─────────────────────────────────────────────── */}
      {metrics.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div style={{ width:36, height:36, borderRadius:12, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Users style={{ width:16, height:16, color:'#3b82f6' }} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">Desempeño por Vendedor</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Últimos {currentPeriod?.days} días</p>
            </div>
            <div className="flex-1 h-px ml-2" style={{ background:'linear-gradient(90deg, #3b82f630, transparent)' }} />
          </div>

          <div className={cn(
            'grid gap-4',
            metrics.length === 1 ? 'grid-cols-1 max-w-sm' :
            metrics.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          )}>
            {[...metrics]
              .sort((a, b) => b.wonValue - a.wonValue)
              .map((m, i) => (
                <SellerCard
                  key={m.seller.id}
                  data={m}
                  color={SELLER_COLORS[i % SELLER_COLORS.length]}
                  rank={i + 1}
                />
              ))}
          </div>
        </section>
      )}

      {/* ── GRÁFICAS COMPARATIVAS (solo si hay 2+ vendedores) ────────────────── */}
      {metrics.length >= 2 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div style={{ width:36, height:36, borderRadius:12, background:'#f5f3ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <BarChart2 style={{ width:16, height:16, color:'#8b5cf6' }} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">Comparativa entre Vendedores</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Período: {currentPeriod?.label}</p>
            </div>
            <div className="flex-1 h-px ml-2" style={{ background:'linear-gradient(90deg, #8b5cf630, transparent)' }} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Gráfica: Valor Ganado vs Pipeline */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div style={{ height:3, background:'linear-gradient(90deg, #3b82f6, #3b82f644)' }} />
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign style={{ width:13, height:13, color:'#3b82f6' }} />
                  <div>
                    <h4 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Valor por Vendedor</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Ganado vs Pipeline</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<RichTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                    <Bar dataKey="Valor Ganado $" fill="#3b82f6" radius={[6,6,0,0]} maxBarSize={36} />
                    <Bar dataKey="Pipeline $"     fill="#8b5cf6" radius={[6,6,0,0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfica: Deals totales y tasa de cierre */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div style={{ height:3, background:'linear-gradient(90deg, #10b981, #10b98144)' }} />
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Target style={{ width:13, height:13, color:'#10b981' }} />
                  <div>
                    <h4 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Deals y Efectividad</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Deals totales vs Tasa de cierre</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left"  tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<RichTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                    <Bar yAxisId="left"  dataKey="Deals"     fill="#10b981" radius={[6,6,0,0]} maxBarSize={36} />
                    <Bar yAxisId="right" dataKey="Cierre %"  fill="#f59e0b" radius={[6,6,0,0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar comparativo (si hay 2-6 vendedores) */}
            {metrics.length <= 6 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden lg:col-span-2">
                <div style={{ height:3, background:'linear-gradient(90deg, #f59e0b, #f59e0b44)' }} />
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Star style={{ width:13, height:13, color:'#f59e0b' }} />
                    <div>
                      <h4 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Radar de Desempeño</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Comparativa multidimensional</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fontWeight: 800, fill: '#475569' }} />
                      <PolarRadiusAxis tick={{ fontSize: 8, fill: '#94a3b8' }} />
                      <Tooltip content={<RichTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                      {metrics.map((m, i) => (
                        <Radar
                          key={m.seller.id}
                          name={m.seller.name.split(' ')[0]}
                          dataKey={m.seller.name.split(' ')[0]}
                          stroke={SELLER_COLORS[i % SELLER_COLORS.length]}
                          fill={SELLER_COLORS[i % SELLER_COLORS.length]}
                          fillOpacity={0.12}
                          strokeWidth={2}
                        />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── TABLA DE ACTIVIDAD Y SEGUIMIENTO DE PIPELINE ─────────────────────── */}
      {isAdmin && (
        <ActivityTable activities={activities} deals={deals} metrics={metrics} />
      )}

      {/* ── TABLA COMPARATIVA ────────────────────────────────────────────────── */}
      {metrics.length >= 2 && isAdmin && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div style={{ width:36, height:36, borderRadius:12, background:'#ecfdf5', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Award style={{ width:16, height:16, color:'#10b981' }} />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">Ranking de Vendedores</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Ordenado por valor ganado</p>
            </div>
            <div className="flex-1 h-px ml-2" style={{ background:'linear-gradient(90deg, #10b98130, transparent)' }} />
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div style={{ height:3, background:'linear-gradient(90deg, #10b981, #10b98144)' }} />
            <div className="p-6">
              <ComparisonTable metrics={metrics} colors={SELLER_COLORS} />
            </div>
          </div>
        </section>
      )}

      {/* ── RAZONES DE CIERRE ────────────────────────────────────────────────── */}
      {closedDeals.length > 0 && (
        <CloseReasonsSection deals={closedDeals} colors={SELLER_COLORS} />
      )}

      {/* ── GESTIÓN DE DATOS: BITÁCORA · REPORTE DIARIO · CARTERA ───────────── */}
      <GestionDatosSection
        isAdmin={isAdmin}
        salesSummary={salesSummary}
        myReporte={myReporte}
        myBitacora={myBitacora}
        myCartera={myCartera}
        colors={SELLER_COLORS}
      />

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN RAZONES DE CIERRE
// ══════════════════════════════════════════════════════════════════════════════
function CloseReasonsSection({ deals, colors }) {
  const [filter, setFilter] = useState('ALL'); // ALL | WON | LOST

  const won  = deals.filter(d => d.stage === 'CLOSED_WON');
  const lost = deals.filter(d => d.stage === 'CLOSED_LOST');

  const filtered = filter === 'WON'  ? won
                 : filter === 'LOST' ? lost
                 : deals;

  // Sellers únicos para agrupar
  const sellerMap = {};
  deals.forEach(d => {
    if (d.assignedTo) sellerMap[d.assignedTo.id] = d.assignedTo;
  });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div style={{ width:36, height:36, borderRadius:12, background:'#fef3c7', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <MessageSquare style={{ width:16, height:16, color:'#f59e0b' }} />
        </div>
        <div>
          <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">Razones de Cierre</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
            {won.length} ganados · {lost.length} perdidos
          </p>
        </div>
        <div className="flex-1 h-px ml-2" style={{ background:'linear-gradient(90deg, #f59e0b30, transparent)' }} />
        <div className="flex gap-1">
          {[
            { key:'ALL',  label:'Todos',   bg:'#f1f5f9', color:'#475569', active:'#0f172a' },
            { key:'WON',  label:'Ganados', bg:'#ecfdf5', color:'#10b981', active:'#059669' },
            { key:'LOST', label:'Perdidos',bg:'#fef2f2', color:'#ef4444', active:'#dc2626' },
          ].map(({ key, label, bg, color, active }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding:'6px 12px', borderRadius:10, fontSize:9, fontWeight:800,
                textTransform:'uppercase', letterSpacing:'0.06em', transition:'all 0.15s',
                background: filter === key ? (key === 'ALL' ? '#0f172a' : bg) : '#f1f5f9',
                color: filter === key ? (key === 'ALL' ? '#fff' : active) : '#94a3b8',
                border: filter === key && key !== 'ALL' ? `1.5px solid ${color}40` : '1.5px solid transparent',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((deal, i) => {
          const isWon = deal.stage === 'CLOSED_WON';
          const color = colors[i % colors.length];
          const seller = deal.assignedTo;
          return (
            <div
              key={deal.id}
              className="bg-white rounded-3xl border shadow-sm overflow-hidden hover:shadow-md transition-all"
              style={{ borderColor: isWon ? '#d1fae5' : '#fee2e2' }}
            >
              <div style={{ height:3, background: isWon ? '#10b981' : '#ef4444' }} />
              <div className="p-5 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{
                        fontSize:8, fontWeight:900, padding:'2px 8px', borderRadius:8,
                        background: isWon ? '#ecfdf5' : '#fef2f2',
                        color: isWon ? '#059669' : '#dc2626',
                        textTransform:'uppercase', letterSpacing:'0.06em',
                      }}>
                        {isWon ? '✓ Ganado' : '✗ Perdido'}
                      </span>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{fmt(deal.value)}</span>
                    </div>
                    <p className="font-black text-gray-900 text-sm truncate">{deal.title}</p>
                    {deal.company && <p className="text-[10px] font-bold text-gray-400 mt-0.5">{deal.company}</p>}
                  </div>
                  {seller && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div style={{ width:28, height:28, borderRadius:10, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontSize:11, fontWeight:900, color }}>{seller.name.charAt(0)}</span>
                      </div>
                      <span className="text-[9px] font-black text-gray-500 whitespace-nowrap">{seller.name.split(' ')[0]}</span>
                    </div>
                  )}
                </div>

                {/* Razón */}
                <div style={{
                  background: isWon ? '#f0fdf4' : '#fff1f2',
                  borderRadius:14, padding:'10px 14px',
                  borderLeft: `3px solid ${isWon ? '#10b981' : '#ef4444'}`,
                }}>
                  <p style={{ fontSize:9, fontWeight:800, color: isWon ? '#059669' : '#dc2626', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>
                    {isWon ? 'Motivo del cierre exitoso' : 'Motivo de pérdida'}
                  </p>
                  <p style={{ fontSize:12, fontWeight:600, color:'#374151', lineHeight:1.5 }}>{deal.closeReason}</p>
                </div>

                {/* Fecha */}
                {deal.updatedAt && (
                  <p style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textAlign:'right' }}>
                    {new Date(deal.updatedAt).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN GESTIÓN DE DATOS
// ══════════════════════════════════════════════════════════════════════════════
function GestionDatosSection({ isAdmin, salesSummary, myReporte, myBitacora, myCartera, colors }) {

  // ── Totales individuales (SALES) ──────────────────────────────────────────
  const myTotals = myReporte.reduce((acc, r) => ({
    llamadas:     acc.llamadas     + (r.llamadas     || 0),
    efec:         acc.efec         + (r.efec         || 0),
    visitas:      acc.visitas      + (r.visitas      || 0),
    correos:      acc.correos      + (r.correos      || 0),
    mensajes:     acc.mensajes     + (r.mensajes     || 0),
    decisorR:     acc.decisorR     + (r.decisorR     || 0),
    decisorFinal: acc.decisorFinal + (r.decisorFinal || 0),
    cotizaciones: acc.cotizaciones + (r.cotizaciones || 0),
    cierres:      acc.cierres      + (r.cierres      || 0),
    venta:        acc.venta        + (r.venta        || 0),
  }), { llamadas:0, efec:0, visitas:0, correos:0, mensajes:0, decisorR:0, decisorFinal:0, cotizaciones:0, cierres:0, venta:0 });

  const myEficiencia  = myTotals.llamadas  ? Math.round((myTotals.efec      / myTotals.llamadas)  * 100) : 0;
  const myTasaCierre  = myTotals.cotizaciones ? Math.round((myTotals.cierres / myTotals.cotizaciones) * 100) : 0;
  const myPotenciales = myBitacora.filter(b => b.potencial).length;
  const myDecisores   = myBitacora.filter(b => b.decisor).length;

  // ── Totales globales admin ────────────────────────────────────────────────
  const adminTotals = salesSummary.reduce((acc, s) => ({
    llamadas:     acc.llamadas     + s.totalLlamadas,
    efec:         acc.efec         + s.totalEfec,
    visitas:      acc.visitas      + s.totalVisitas,
    cotizaciones: acc.cotizaciones + s.totalCotizaciones,
    cierres:      acc.cierres      + s.totalCierres,
    venta:        acc.venta        + s.totalVenta,
    bitacora:     acc.bitacora     + s.bitacora,
    cartera:      acc.cartera      + s.cartera,
  }), { llamadas:0, efec:0, visitas:0, cotizaciones:0, cierres:0, venta:0, bitacora:0, cartera:0 });

  // ── Datos para gráfica comparativa admin ─────────────────────────────────
  const adminBarData = salesSummary.map((s, i) => ({
    name:         s.seller.name.split(' ')[0],
    'Llamadas':   s.totalLlamadas,
    'Efectivas':  s.totalEfec,
    'Visitas':    s.totalVisitas,
    'Cotizac.':   s.totalCotizaciones,
    'Cierres':    s.totalCierres,
    'Venta $':    Math.round(s.totalVenta),
    'Eficiencia': s.eficiencia,
    'T.Cierre %': s.tasaCierre,
    fill:         colors[i % colors.length],
  }));

  // ── Datos reporte individual para gráfica línea ───────────────────────────
  const reporteLineData = [...myReporte]
    .sort((a, b) => new Date(a.semana) - new Date(b.semana))
    .map(r => ({
      dia:          r.dia || r.semana || '',
      'Llamadas':   r.llamadas,
      'Efectivas':  r.efec,
      'Visitas':    r.visitas,
      'Cotizac.':   r.cotizaciones,
      'Cierres':    r.cierres,
    }));

  const hasData = isAdmin ? salesSummary.length > 0 : (myReporte.length > 0 || myBitacora.length > 0 || myCartera.length > 0);

  return (
    <section className="space-y-6">
      {/* Header sección */}
      <div className="flex items-center gap-3">
        <div style={{ width:36, height:36, borderRadius:12, background:'#fdf4ff', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Layers style={{ width:16, height:16, color:'#a855f7' }} />
        </div>
        <div>
          <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">Gestión de Datos de Ventas</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
            Bitácora · Reporte Diario · Cartera
            {isAdmin && salesSummary.length > 0 && ` · ${salesSummary.length} vendedores`}
          </p>
        </div>
        <div className="flex-1 h-px ml-2" style={{ background:'linear-gradient(90deg, #a855f730, transparent)' }} />
      </div>

      {!hasData ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
          <BookOpen className="w-10 h-10 text-gray-200" />
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sin registros de gestión aún</p>
          <p className="text-[9px] font-bold text-gray-300">Ingresa datos en Bitácora, Reporte Diario o Cartera</p>
        </div>
      ) : (
        <>
          {/* ── KPI CARDS ─────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {(isAdmin ? [
              { label:'Llamadas',    value: adminTotals.llamadas,            color:'#3b82f6', bg:'#eff6ff',  icon: PhoneCall },
              { label:'Efectivas',   value: adminTotals.efec,                color:'#10b981', bg:'#ecfdf5',  icon: CheckCircle2 },
              { label:'Visitas',     value: adminTotals.visitas,             color:'#8b5cf6', bg:'#f5f3ff',  icon: MapPin },
              { label:'Correos/Msg', value: adminTotals.efec,                color:'#0ea5e9', bg:'#f0f9ff',  icon: Send },
              { label:'Cotizac.',    value: adminTotals.cotizaciones,        color:'#f59e0b', bg:'#fffbeb',  icon: FileText },
              { label:'Cierres',     value: adminTotals.cierres,             color:'#22c55e', bg:'#f0fdf4',  icon: Award },
              { label:'Venta Total', value: fmt(adminTotals.venta),          color:'#10b981', bg:'#ecfdf5',  icon: DollarSign },
              { label:'Cartera',     value: adminTotals.cartera,             color:'#a855f7', bg:'#fdf4ff',  icon: Layers },
            ] : [
              { label:'Llamadas',    value: myTotals.llamadas,               color:'#3b82f6', bg:'#eff6ff',  icon: PhoneCall },
              { label:'Efectivas',   value: myTotals.efec,                   color:'#10b981', bg:'#ecfdf5',  icon: CheckCircle2 },
              { label:'Visitas',     value: myTotals.visitas,                color:'#8b5cf6', bg:'#f5f3ff',  icon: MapPin },
              { label:'Cotizac.',    value: myTotals.cotizaciones,           color:'#f59e0b', bg:'#fffbeb',  icon: FileText },
              { label:'Cierres',     value: myTotals.cierres,                color:'#22c55e', bg:'#f0fdf4',  icon: Award },
              { label:'Venta Total', value: fmt(myTotals.venta),             color:'#10b981', bg:'#ecfdf5',  icon: DollarSign },
              { label:'Eficiencia',  value: `${myEficiencia}%`,              color:'#0ea5e9', bg:'#f0f9ff',  icon: Percent },
              { label:'T.Cierre',    value: `${myTasaCierre}%`,              color:'#a855f7', bg:'#fdf4ff',  icon: Target },
            ]).map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} style={{ background: bg, borderRadius:16, padding:'12px 14px' }}>
                <Icon style={{ width:12, height:12, color, marginBottom:6 }} />
                <p style={{ fontSize:18, fontWeight:900, color:'#0f172a', lineHeight:1 }}>{value}</p>
                <p style={{ fontSize:8, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:4 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* ── GRÁFICAS ──────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Admin: comparativa actividad por vendedor */}
            {isAdmin && salesSummary.length >= 2 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div style={{ height:3, background:'linear-gradient(90deg, #3b82f6, #3b82f644)' }} />
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <PhoneCall style={{ width:13, height:13, color:'#3b82f6' }} />
                    <div>
                      <h4 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Actividad por Vendedor</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Llamadas · Efectivas · Visitas</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={adminBarData} margin={{ top:4, right:4, left:0, bottom:0 }} barGap={3}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize:10, fontWeight:700, fill:'#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:9, fontWeight:700, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<RichTooltip />} />
                      <Legend wrapperStyle={{ fontSize:10, fontWeight:700 }} />
                      <Bar dataKey="Llamadas"  fill="#3b82f6" radius={[5,5,0,0]} maxBarSize={28} />
                      <Bar dataKey="Efectivas" fill="#10b981" radius={[5,5,0,0]} maxBarSize={28} />
                      <Bar dataKey="Visitas"   fill="#8b5cf6" radius={[5,5,0,0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Admin: comparativa cierres y venta */}
            {isAdmin && salesSummary.length >= 2 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div style={{ height:3, background:'linear-gradient(90deg, #10b981, #10b98144)' }} />
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <DollarSign style={{ width:13, height:13, color:'#10b981' }} />
                    <div>
                      <h4 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Cierres y Venta</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Cotizaciones · Cierres · Venta $</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={adminBarData} margin={{ top:4, right:4, left:0, bottom:0 }} barGap={3}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize:10, fontWeight:700, fill:'#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="left"  tick={{ fontSize:9, fontWeight:700, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize:9, fontWeight:700, fill:'#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<RichTooltip />} />
                      <Legend wrapperStyle={{ fontSize:10, fontWeight:700 }} />
                      <Bar yAxisId="left"  dataKey="Cotizac." fill="#f59e0b" radius={[5,5,0,0]} maxBarSize={28} />
                      <Bar yAxisId="left"  dataKey="Cierres"  fill="#22c55e" radius={[5,5,0,0]} maxBarSize={28} />
                      <Bar yAxisId="right" dataKey="Venta $"  fill="#10b981" radius={[5,5,0,0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Individual: línea de actividad por día */}
            {!isAdmin && reporteLineData.length >= 2 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div style={{ height:3, background:'linear-gradient(90deg, #3b82f6, #3b82f644)' }} />
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Activity style={{ width:13, height:13, color:'#3b82f6' }} />
                    <div>
                      <h4 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Mi Actividad en el Tiempo</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Llamadas · Visitas · Cierres</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={reporteLineData} margin={{ top:4, right:4, left:0, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="dia" tick={{ fontSize:9, fontWeight:700, fill:'#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize:9, fontWeight:700, fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<RichTooltip />} />
                      <Legend wrapperStyle={{ fontSize:10, fontWeight:700 }} />
                      <Line type="monotone" dataKey="Llamadas"  stroke="#3b82f6" strokeWidth={2} dot={{ r:3 }} />
                      <Line type="monotone" dataKey="Efectivas" stroke="#10b981" strokeWidth={2} dot={{ r:3 }} />
                      <Line type="monotone" dataKey="Visitas"   stroke="#8b5cf6" strokeWidth={2} dot={{ r:3 }} />
                      <Line type="monotone" dataKey="Cierres"   stroke="#22c55e" strokeWidth={2} dot={{ r:3 }} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Individual: KPIs bitácora */}
            {!isAdmin && myBitacora.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div style={{ height:3, background:'linear-gradient(90deg, #a855f7, #a855f744)' }} />
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin style={{ width:13, height:13, color:'#a855f7' }} />
                    <div>
                      <h4 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Mi Bitácora de Visitas</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{myBitacora.length} visitas registradas</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label:'Total Visitas',  value: myBitacora.length,   color:'#a855f7', bg:'#fdf4ff' },
                      { label:'Con Potencial',  value: myPotenciales,       color:'#f59e0b', bg:'#fffbeb' },
                      { label:'Decisor Pres.',  value: myDecisores,         color:'#10b981', bg:'#ecfdf5' },
                    ].map(({ label, value, color, bg }) => (
                      <div key={label} style={{ background:bg, borderRadius:14, padding:'12px' }} className="text-center">
                        <p style={{ fontSize:22, fontWeight:900, color, lineHeight:1 }}>{value}</p>
                        <p style={{ fontSize:8, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.05em', marginTop:4 }}>{label}</p>
                      </div>
                    ))}
                  </div>
                  {/* Tabla bitácora resumida */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {['Fecha','Empresa','Contacto','Potencial','Decisor','Resultado'].map(h => (
                            <th key={h} className="text-left pb-2 pr-3 text-[8px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {myBitacora.slice(0, 5).map(b => (
                          <tr key={b.id} className="hover:bg-purple-50/30 transition-colors">
                            <td className="py-2 pr-3 text-[10px] font-bold text-gray-500 whitespace-nowrap">{b.dia ? new Date(b.dia).toLocaleDateString('es-MX', { day:'2-digit', month:'short' }) : '—'}</td>
                            <td className="py-2 pr-3 text-[10px] font-black text-gray-800 whitespace-nowrap">{b.empresaVisitada || '—'}</td>
                            <td className="py-2 pr-3 text-[10px] font-bold text-gray-500 whitespace-nowrap">{b.nombre || '—'}</td>
                            <td className="py-2 pr-3">
                              <span style={{ fontSize:8, fontWeight:800, padding:'2px 6px', borderRadius:6, background: b.potencial ? '#ecfdf5' : '#f1f5f9', color: b.potencial ? '#10b981' : '#94a3b8' }}>
                                {b.potencial ? 'Sí' : 'No'}
                              </span>
                            </td>
                            <td className="py-2 pr-3">
                              <span style={{ fontSize:8, fontWeight:800, padding:'2px 6px', borderRadius:6, background: b.decisor ? '#eff6ff' : '#f1f5f9', color: b.decisor ? '#3b82f6' : '#94a3b8' }}>
                                {b.decisor ? 'Sí' : 'No'}
                              </span>
                            </td>
                            <td className="py-2 text-[10px] font-bold text-gray-500 max-w-[120px] truncate">{b.resultado || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {myBitacora.length > 5 && (
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2 text-right">+{myBitacora.length - 5} más en Gestión de Datos</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── TABLA COMPARATIVA ADMIN (Gestión) ─────────────────────────────── */}
          {isAdmin && salesSummary.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div style={{ height:3, background:'linear-gradient(90deg, #a855f7, #a855f744)' }} />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Layers style={{ width:13, height:13, color:'#a855f7' }} />
                  <div>
                    <h4 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Comparativa de Gestión por Vendedor</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Bitácora · Reporte Diario · Cartera</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['#','Vendedor','Visitas','Llamadas','Efectivas','Correos/Msg','Cotizac.','Cierres','Venta Total','Eficiencia','T.Cierre','Cartera'].map(h => (
                          <th key={h} className="text-left pb-3 pr-4 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[...salesSummary]
                        .sort((a, b) => b.totalVenta - a.totalVenta)
                        .map((s, i) => {
                          const color = colors[i % colors.length];
                          return (
                            <tr key={s.seller.id} className="hover:bg-purple-50/20 transition-colors">
                              <td className="py-3 pr-4">
                                <span style={{ width:22, height:22, borderRadius:8, fontSize:10, fontWeight:900, background: i===0?'#fef3c7':'#f1f5f9', color: i===0?'#d97706':'#475569', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>{i+1}</span>
                              </td>
                              <td className="py-3 pr-4">
                                <div className="flex items-center gap-2">
                                  <div style={{ width:28, height:28, borderRadius:9, background:`${color}18`, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                    <span style={{ fontSize:11, fontWeight:900, color }}>{s.seller.name.charAt(0)}</span>
                                  </div>
                                  <span className="font-black text-gray-900 text-xs whitespace-nowrap">{s.seller.name}</span>
                                </div>
                              </td>
                              <td className="py-3 pr-4 font-black text-purple-600 text-sm">{s.bitacora}</td>
                              <td className="py-3 pr-4 font-black text-blue-600 text-sm">{s.totalLlamadas}</td>
                              <td className="py-3 pr-4 font-black text-emerald-600 text-sm">{s.totalEfec}</td>
                              <td className="py-3 pr-4 font-black text-sky-500 text-sm">{s.totalVisitas}</td>
                              <td className="py-3 pr-4 font-black text-amber-600 text-sm">{s.totalCotizaciones}</td>
                              <td className="py-3 pr-4 font-black text-green-600 text-sm">{s.totalCierres}</td>
                              <td className="py-3 pr-4 font-black text-gray-900 text-sm whitespace-nowrap">{fmt(s.totalVenta)}</td>
                              <td className="py-3 pr-4">
                                <span style={{ fontSize:11, fontWeight:900, color, background:`${color}15`, borderRadius:8, padding:'2px 8px', display:'inline-block' }}>{s.eficiencia}%</span>
                              </td>
                              <td className="py-3 pr-4">
                                <span style={{ fontSize:11, fontWeight:900, color:'#22c55e', background:'#f0fdf4', borderRadius:8, padding:'2px 8px', display:'inline-block' }}>{s.tasaCierre}%</span>
                              </td>
                              <td className="py-3 font-black text-violet-600 text-sm">{s.cartera}</td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── REPORTE DIARIO INDIVIDUAL ──────────────────────────────────────── */}
          {!isAdmin && myReporte.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div style={{ height:3, background:'linear-gradient(90deg, #f59e0b, #f59e0b44)' }} />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart2 style={{ width:13, height:13, color:'#f59e0b' }} />
                  <div>
                    <h4 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Mi Reporte Diario</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{myReporte.length} registros</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Semana','Día','Llam.','Efec.','Visit.','Correos','Msg','Dec.R','Dec.F','Cotizac.','Cierres','Venta'].map(h => (
                          <th key={h} className="text-left pb-2 pr-3 text-[8px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {myReporte.map(r => (
                        <tr key={r.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="py-2 pr-3 text-[10px] font-bold text-gray-500 whitespace-nowrap">{r.semana ? new Date(r.semana).toLocaleDateString('es-MX', { day:'2-digit', month:'short' }) : '—'}</td>
                          <td className="py-2 pr-3 text-[10px] font-black text-gray-800">{r.dia || '—'}</td>
                          <td className="py-2 pr-3 text-[10px] font-black text-blue-600">{r.llamadas}</td>
                          <td className="py-2 pr-3 text-[10px] font-black text-emerald-600">{r.efec}</td>
                          <td className="py-2 pr-3 text-[10px] font-black text-purple-600">{r.visitas}</td>
                          <td className="py-2 pr-3 text-[10px] font-black text-gray-600">{r.correos}</td>
                          <td className="py-2 pr-3 text-[10px] font-black text-gray-600">{r.mensajes}</td>
                          <td className="py-2 pr-3 text-[10px] font-black text-gray-600">{r.decisorR}</td>
                          <td className="py-2 pr-3 text-[10px] font-black text-gray-600">{r.decisorFinal}</td>
                          <td className="py-2 pr-3 text-[10px] font-black text-amber-600">{r.cotizaciones}</td>
                          <td className="py-2 pr-3 text-[10px] font-black text-green-600">{r.cierres}</td>
                          <td className="py-2 text-[10px] font-black text-gray-900 whitespace-nowrap">{fmt(r.venta)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── CARTERA INDIVIDUAL ─────────────────────────────────────────────── */}
          {!isAdmin && myCartera.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div style={{ height:3, background:'linear-gradient(90deg, #0ea5e9, #0ea5e944)' }} />
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Layers style={{ width:13, height:13, color:'#0ea5e9' }} />
                  <div>
                    <h4 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">Mi Cartera de Clientes</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{myCartera.length} cuentas en seguimiento</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Empresa','Mes','Tipo','Últ.Contacto','Próx.Contacto','Decisor','Resultado','Motivo'].map(h => (
                          <th key={h} className="text-left pb-2 pr-3 text-[8px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {myCartera.map(c => (
                        <tr key={c.id} className="hover:bg-sky-50/30 transition-colors">
                          <td className="py-2 pr-3 text-[10px] font-black text-gray-900 whitespace-nowrap">{c.empresa || '—'}</td>
                          <td className="py-2 pr-3 text-[10px] font-bold text-gray-500">{c.mes || '—'}</td>
                          <td className="py-2 pr-3">
                            <span style={{ fontSize:8, fontWeight:800, padding:'2px 6px', borderRadius:6, background:'#eff6ff', color:'#3b82f6' }}>{c.tipo || '—'}</span>
                          </td>
                          <td className="py-2 pr-3 text-[10px] font-bold text-gray-500 whitespace-nowrap">{c.fechaUltContacto ? new Date(c.fechaUltContacto).toLocaleDateString('es-MX', { day:'2-digit', month:'short' }) : '—'}</td>
                          <td className="py-2 pr-3 text-[10px] font-bold text-sky-600 whitespace-nowrap">{c.proxContacto ? new Date(c.proxContacto).toLocaleDateString('es-MX', { day:'2-digit', month:'short' }) : '—'}</td>
                          <td className="py-2 pr-3">
                            <span style={{ fontSize:8, fontWeight:800, padding:'2px 6px', borderRadius:6, background: c.decisor?'#eff6ff':'#f1f5f9', color: c.decisor?'#3b82f6':'#94a3b8' }}>
                              {c.decisor ? 'Sí' : 'No'}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-[10px] font-bold text-gray-600 max-w-[120px] truncate">{c.resultado || '—'}</td>
                          <td className="py-2 text-[10px] font-bold text-gray-500 max-w-[100px] truncate">{c.motivo || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
