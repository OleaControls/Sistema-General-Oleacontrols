import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Target, TrendingUp, Users, Award, Percent,
  BarChart2, Activity, Calendar, ChevronRight, RefreshCw,
  CheckCircle2, XCircle, Clock, Briefcase, Star,
  MessageSquare, PhoneCall, Send, Coffee, ArrowRight, User, Building2,
  FileText, MapPin, BookOpen, Layers, UserPlus, UserCheck,
  Package, AlertTriangle, LayoutGrid, Eye, TrendingDown, ShoppingBag
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line,
  PieChart, Pie,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import { useAuth, ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

// ── Paleta de colores para vendedores ─────────────────────────────────────────
const SELLER_COLORS = [
  '#1d4ed8', '#059669', '#7c3aed', '#b45309',
  '#dc2626', '#0284c7', '#0d9488', '#9333ea',
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

// ── Sistema de diseño ─────────────────────────────────────────────────────────
const D = {
  card:  'bg-white rounded-2xl border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden',
  cardHover: 'hover:shadow-[0_4px_24px_rgba(0,0,0,0.10)] hover:-translate-y-0.5 transition-all duration-200',
  ink:   '#0a0f1e',
  muted: '#64748b',
  faint: '#94a3b8',
  border:'#e2e8f0',
};

function SectionHeader({ icon: Icon, title, subtitle, accent = '#1d4ed8', extra }) {
  return (
    <div className="flex items-center gap-4">
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: `${accent}12`, border: `1.5px solid ${accent}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon style={{ width: 17, height: 17, color: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 style={{ fontSize: 13, fontWeight: 800, color: D.ink, letterSpacing: '-0.01em', margin: 0 }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 10, fontWeight: 600, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{subtitle}</p>}
      </div>
      {extra && <div className="flex-shrink-0">{extra}</div>}
      <div style={{ width: 1, height: 32, background: 'linear-gradient(180deg, transparent, #e2e8f0, transparent)', marginLeft: 4 }} />
    </div>
  );
}

function CardAccent({ color }) {
  return <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}55)` }} />;
}

// ── Tarjeta de KPI del vendedor ───────────────────────────────────────────────
function SellerCard({ data, color, rank }) {
  const { seller, wonDeals, activeDeals, lostDeals, deals, wonValue, pipelineValue, quotes, acceptedQuotes, leads, closeRate, activities } = data;
  const initial = (seller.name || '?').charAt(0).toUpperCase();
  const isTop = rank === 1;

  return (
    <div className={`${D.card} ${D.cardHover}`} style={{ borderTop: `3px solid ${color}` }}>
      <div className="p-5">
        {/* Header vendedor */}
        <div className="flex items-center gap-3 mb-5">
          {seller.avatar ? (
            <img src={seller.avatar} alt={seller.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0 ring-2" style={{ ringColor: `${color}30` }} />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
              background: `${color}15`, border: `1.5px solid ${color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 17, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{initial}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 14, fontWeight: 800, color: D.ink, letterSpacing: '-0.01em', marginBottom: 2 }} className="truncate">{seller.name}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Ejecutivo de ventas</span>
            </div>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: isTop ? '#fef3c7' : `${color}10`, border: isTop ? '1px solid #fde68a' : `1px solid ${color}20`,
          }}>
            {isTop
              ? <Star style={{ width: 14, height: 14, color: '#d97706' }} />
              : <span style={{ fontSize: 11, fontWeight: 900, color }}>{rank}</span>
            }
          </div>
        </div>

        {/* Valor ganado - highlight principal */}
        <div style={{ background: `${color}08`, border: `1px solid ${color}18`, borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Valor Ganado</p>
          <p style={{ fontSize: 26, fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{fmt(wonValue)}</p>
          <div style={{ marginTop: 8, height: 3, background: `${color}20`, borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(closeRate, 100)}%`, background: color, borderRadius: 999, transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: D.faint }}>Tasa de cierre</span>
            <span style={{ fontSize: 9, fontWeight: 800, color }}>{closeRate}%</span>
          </div>
        </div>

        {/* Grid de KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Deals Ganados',  value: wonDeals,              col: '#059669', bg: '#f0fdf4' },
            { label: 'En Pipeline',    value: activeDeals,           col: '#7c3aed', bg: '#faf5ff' },
            { label: 'Cotizaciones',   value: quotes,                col: '#0284c7', bg: '#f0f9ff' },
            { label: 'Actividades',    value: activities ?? 0,       col: '#b45309', bg: '#fffbeb' },
          ].map(({ label, value, col, bg }) => (
            <div key={label} style={{ background: bg, borderRadius: 12, padding: '10px 12px', border: `1px solid ${col}15` }}>
              <p style={{ fontSize: 20, fontWeight: 900, color: col, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: 8, fontWeight: 700, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Stats footer */}
        <div style={{ borderTop: `1px solid ${D.border}`, paddingTop: 12, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { label: 'Deals',  value: deals },
            { label: 'Leads',  value: leads },
            { label: 'Cotiz.', value: quotes },
            { label: 'Perdid.', value: lostDeals },
          ].map(({ label, value }, i, arr) => (
            <div key={label} style={{ textAlign: 'center', borderRight: i < arr.length - 1 ? `1px solid ${D.border}` : 'none' }}>
              <p style={{ fontSize: 15, fontWeight: 900, color: D.ink, letterSpacing: '-0.02em' }}>{value}</p>
              <p style={{ fontSize: 8, fontWeight: 700, color: D.faint, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniKPI({ label, value, icon: Icon, hex, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '12px 14px', border: `1px solid ${hex}18` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
        <Icon style={{ width: 11, height: 11, color: hex }} />
        <span style={{ fontSize: 8, fontWeight: 700, color: hex, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
      </div>
      <p style={{ fontSize: 22, fontWeight: 900, color: '#0a0f1e', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
    </div>
  );
}

function QuickStat({ label, value }) {
  return (
    <div style={{ textAlign: 'center', padding: '6px 4px' }}>
      <p style={{ fontSize: 17, fontWeight: 900, color: '#0a0f1e', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>{label}</p>
    </div>
  );
}

// ── Tabla comparativa ─────────────────────────────────────────────────────────
function ComparisonTable({ metrics, colors }) {
  const sorted = [...metrics].sort((a, b) => b.wonValue - a.wonValue);
  const maxVal = sorted[0]?.wonValue || 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
            {['#', 'Vendedor', 'Deals', 'Ganados', 'Perdidos', 'Pipeline', 'Cotiz.', 'Aceptadas', 'Valor Ganado', 'Cierre %'].map(h => (
              <th key={h} style={{ padding: '10px 16px 10px 0', textAlign: 'left', fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((m, i) => {
            const color = colors[i % colors.length];
            return (
              <tr key={m.seller.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '12px 16px 12px 0' }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 8, fontSize: 10, fontWeight: 900,
                    background: i === 0 ? '#fef3c7' : '#f1f5f9',
                    color: i === 0 ? '#d97706' : '#475569',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    border: i === 0 ? '1px solid #fde68a' : '1px solid #e2e8f0',
                  }}>{i + 1}</div>
                </td>
                <td style={{ padding: '12px 16px 12px 0', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10,
                      background: `${color}15`, flexShrink: 0, border: `1.5px solid ${color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 900, color }}>{m.seller.name.charAt(0)}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#0a0f1e' }}>{m.seller.name}</span>
                  </div>
                </td>
                <td style={{ padding: '12px 16px 12px 0', fontSize: 13, fontWeight: 800, color: '#334155' }}>{m.deals}</td>
                <td style={{ padding: '12px 16px 12px 0' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#059669' }}>{m.wonDeals}</span>
                </td>
                <td style={{ padding: '12px 16px 12px 0' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>{m.lostDeals}</span>
                </td>
                <td style={{ padding: '12px 16px 12px 0', fontSize: 13, fontWeight: 800, color: '#7c3aed' }}>{m.activeDeals}</td>
                <td style={{ padding: '12px 16px 12px 0', fontSize: 13, fontWeight: 800, color: '#334155' }}>{m.quotes}</td>
                <td style={{ padding: '12px 16px 12px 0', fontSize: 13, fontWeight: 800, color: '#0284c7' }}>{m.acceptedQuotes}</td>
                <td style={{ padding: '12px 16px 12px 0' }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#0a0f1e', display: 'block' }}>{fmt(m.wonValue)}</span>
                    <div style={{ height: 3, background: '#f1f5f9', borderRadius: 999, width: 72, overflow: 'hidden', marginTop: 4 }}>
                      <div style={{ height: '100%', width: `${Math.min((m.wonValue / maxVal) * 100, 100)}%`, background: color, borderRadius: 999 }} />
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 0 12px 0' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800, color,
                    background: `${color}12`, borderRadius: 8, border: `1px solid ${color}25`,
                    padding: '4px 10px', display: 'inline-block', letterSpacing: '-0.01em',
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
      <SectionHeader icon={Activity} title="Seguimiento de Pipeline y Actividad" subtitle={`${count} registros`} accent="#b45309" />

      <div className={D.card}>
        <CardAccent color="#b45309" />

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

  // Nuevas secciones admin
  const [allQuotes,  setAllQuotes]  = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [allLeads,   setAllLeads]   = useState([]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, dealsRes, actsRes, quotesRes, clientsRes, leadsRes] = await Promise.all([
        apiFetch(`/api/crm/sales-metrics?period=${period}`),
        apiFetch('/api/crm/deals'),
        isAdmin ? apiFetch('/api/crm/activity-feed?limit=200') : Promise.resolve(null),
        isAdmin ? apiFetch('/api/quotes') : Promise.resolve(null),
        isAdmin ? apiFetch('/api/crm/clients') : Promise.resolve(null),
        isAdmin ? apiFetch('/api/crm/leads') : Promise.resolve(null),
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
      if (quotesRes)  { const d = await quotesRes.json();  setAllQuotes(Array.isArray(d) ? d : []); }
      if (clientsRes) { const d = await clientsRes.json(); setAllClients(Array.isArray(d) ? d : []); }
      if (leadsRes)   { const d = await leadsRes.json();   setAllLeads(Array.isArray(d) ? d : []); }

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
  const sinceDate = new Date(Date.now() - (currentPeriod?.days || 30) * 24 * 60 * 60 * 1000);

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
        background: 'linear-gradient(145deg, #050d1a 0%, #0d1f3c 45%, #0a1628 100%)',
        borderRadius: 24, padding: '32px 32px 36px', position: 'relative', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.04) inset',
      }}>
        {/* Fondo con grid sutil */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)', backgroundSize:'48px 48px', pointerEvents:'none' }} />
        {/* Orbes de luz */}
        <div style={{ position:'absolute', top:-80, right:-40, width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle, #1d4ed825, transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-80, left:'30%', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, #7c3aed18, transparent 65%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'20%', left:-30, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle, #059669 10, transparent 65%)', pointerEvents:'none' }} />

        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-8">
            <div>
              {/* Eyebrow */}
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:12, background:'rgba(29,78,216,0.2)', border:'1px solid rgba(59,130,246,0.25)', borderRadius:999, padding:'4px 12px 4px 8px' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:'#60a5fa', boxShadow:'0 0 8px #60a5fa' }} />
                <span style={{ fontSize:10, fontWeight:700, color:'#93c5fd', textTransform:'uppercase', letterSpacing:'0.12em' }}>Panel Comercial · Oleacontrols</span>
              </div>
              <h2 style={{ fontSize:36, fontWeight:900, color:'#f0f6ff', lineHeight:1, letterSpacing:'-0.04em', margin:0, marginBottom:10 }}>
                Métricas <span style={{ background:'linear-gradient(135deg, #60a5fa, #818cf8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>de Ventas</span>
              </h2>
              <p style={{ fontSize:12, color:'rgba(148,163,184,0.8)', fontWeight:500, letterSpacing:'0.02em' }}>
                {metrics.length} vendedor{metrics.length !== 1 ? 'es' : ''} activos&ensp;·&ensp;Últimos {currentPeriod?.days} días
              </p>
            </div>

            {/* Controles */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'flex-end' }}>
              <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, padding:4 }}>
                {PERIODS.map(p => (
                  <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                    padding: '7px 18px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                    transition: 'all 0.18s ease', letterSpacing:'0.04em',
                    background: period === p.key ? 'rgba(29,78,216,0.9)' : 'transparent',
                    color: period === p.key ? '#fff' : 'rgba(148,163,184,0.7)',
                    boxShadow: period === p.key ? '0 2px 12px rgba(29,78,216,0.4)' : 'none',
                    border: 'none',
                  }}>
                    {p.label}
                  </button>
                ))}
              </div>
              <button onClick={fetchMetrics} style={{
                width: 34, height: 34, borderRadius: 10, display:'flex', alignItems:'center', justifyContent:'center',
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                color:'rgba(148,163,184,0.6)', cursor:'pointer', transition:'all 0.15s',
              }}>
                <RefreshCw style={{ width: 13, height: 13 }} />
              </button>
            </div>
          </div>

          {/* KPIs globales (solo ADMIN) */}
          {isAdmin && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Deals totales',    value: totals.deals,              icon: Briefcase,    color: '#60a5fa', glow:'#1d4ed8' },
                { label: 'Ganados',          value: totals.wonDeals,           icon: CheckCircle2, color: '#34d399', glow:'#059669' },
                { label: 'Valor ganado',     value: fmt(totals.wonValue),      icon: DollarSign,   color: '#34d399', glow:'#059669' },
                { label: 'Pipeline activo',  value: fmt(totals.pipelineValue), icon: Activity,     color: '#a78bfa', glow:'#7c3aed' },
                { label: 'Cotizaciones',     value: totals.quotes,             icon: FileText,     color: '#fbbf24', glow:'#b45309' },
                { label: 'Actividades',      value: totals.activities,         icon: MessageSquare,color: '#f9a8d4', glow:'#be185d' },
              ].map(({ label, value, icon: Icon, color, glow }) => (
                <div key={label} style={{
                  background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: '18px 18px 16px',
                  backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.09)',
                  boxShadow: `0 0 0 0 transparent, inset 0 1px 0 rgba(255,255,255,0.07)`,
                  transition: 'all 0.2s',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
                    <div style={{ width:26, height:26, borderRadius:8, background:`${glow}30`, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Icon style={{ width:12, height:12, color }} />
                    </div>
                    <span style={{ fontSize:9, fontWeight:700, color:'rgba(148,163,184,0.6)', textTransform:'uppercase', letterSpacing:'0.1em', lineHeight:1.2 }}>{label}</span>
                  </div>
                  <p style={{ fontSize:24, fontWeight:900, color:'#f0f6ff', lineHeight:1, letterSpacing:'-0.04em' }}>{value}</p>
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
          <SectionHeader icon={Users} title="Desempeño por Vendedor" subtitle={`Últimos ${currentPeriod?.days} días`} accent="#1d4ed8" />

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
          <SectionHeader icon={BarChart2} title="Comparativa entre Vendedores" subtitle={`Período: ${currentPeriod?.label}`} accent="#7c3aed" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Gráfica: Valor Ganado vs Pipeline */}
            <div className={D.card}>
              <CardAccent color="#1d4ed8" />
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign style={{ width:13, height:13, color:'#1d4ed8' }} />
                  <div>
                    <h4 style={{ fontSize:11, fontWeight:800, color:'#0a0f1e', letterSpacing:'-0.01em' }}>Valor por Vendedor</h4>
                    <p style={{ fontSize:9, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Ganado vs Pipeline</p>
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
            <div className={D.card}>
              <CardAccent color="#059669" />
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Target style={{ width:13, height:13, color:'#059669' }} />
                  <div>
                    <h4 style={{ fontSize:11, fontWeight:800, color:'#0a0f1e', letterSpacing:'-0.01em' }}>Deals y Efectividad</h4>
                    <p style={{ fontSize:9, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Deals totales vs Tasa de cierre</p>
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
              <div className={`${D.card} lg:col-span-2`}>
                <CardAccent color="#b45309" />
                <div className="p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Star style={{ width:13, height:13, color:'#b45309' }} />
                    <div>
                      <h4 style={{ fontSize:11, fontWeight:800, color:'#0a0f1e', letterSpacing:'-0.01em' }}>Radar de Desempeño</h4>
                      <p style={{ fontSize:9, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>Comparativa multidimensional</p>
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
          <SectionHeader icon={Award} title="Ranking de Vendedores" subtitle="Ordenado por valor ganado" accent="#059669" />

          <div className={D.card}>
            <CardAccent color="#059669" />
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

      {/* ── ESTATUS DE COTIZACIONES ───────────────────────────────────────────── */}
      {isAdmin && allQuotes.length > 0 && (
        <QuoteStatusSection quotes={allQuotes} sinceDate={sinceDate} metrics={metrics} colors={SELLER_COLORS} />
      )}

      {/* ── CLIENTES NUEVOS / RECUPERADOS / CARTERA ───────────────────────────── */}
      {isAdmin && (
        <ClientInsightsSection clients={allClients} deals={deals} quotes={allQuotes} sinceDate={sinceDate} colors={SELLER_COLORS} />
      )}

      {/* ── VENTA POR LÍNEAS (top productos de cotizaciones) ──────────────────── */}
      {isAdmin && allQuotes.length > 0 && (
        <ProductLinesSection quotes={allQuotes} sinceDate={sinceDate} />
      )}

      {/* ── PIPELINE KANBAN (solo visualización admin) ────────────────────────── */}
      {isAdmin && deals.filter(d => !['CLOSED_WON','CLOSED_LOST'].includes(d.stage)).length > 0 && (
        <PipelineKanbanReadOnly deals={deals} metrics={metrics} colors={SELLER_COLORS} />
      )}

      {/* ── ACTIVIDADES VENCIDAS ─────────────────────────────────────────────── */}
      {isAdmin && activities.length > 0 && (
        <OverdueActivitiesSection activities={activities} />
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
// ESTATUS DE COTIZACIONES
// ══════════════════════════════════════════════════════════════════════════════
const QUOTE_STATUS = {
  PENDING:  { label: 'Pendiente',     color: '#f59e0b', bg: '#fffbeb', icon: Clock },
  ACCEPTED: { label: 'Aprobada',      color: '#10b981', bg: '#ecfdf5', icon: CheckCircle2 },
  REJECTED: { label: 'No concretada', color: '#ef4444', bg: '#fef2f2', icon: XCircle },
  EXPIRED:  { label: 'Expirada',      color: '#94a3b8', bg: '#f8fafc', icon: AlertTriangle },
};

function QuoteStatusSection({ quotes, sinceDate, metrics, colors }) {
  const [filterSeller, setFilterSeller] = useState('');

  const filtered = filterSeller
    ? quotes.filter(q => q.sellerId === filterSeller || q.creatorId === filterSeller)
    : quotes;

  const inPeriod = filtered.filter(q => new Date(q.createdAt) >= sinceDate);

  const byStatus = {};
  Object.keys(QUOTE_STATUS).forEach(k => {
    byStatus[k] = { count: 0, value: 0 };
  });
  inPeriod.forEach(q => {
    const st = q.status || 'PENDING';
    if (byStatus[st]) { byStatus[st].count++; byStatus[st].value += q.total || 0; }
  });

  const total = inPeriod.length;
  const totalValue = inPeriod.reduce((s, q) => s + (q.total || 0), 0);

  // Por vendedor
  const sellerQuotes = {};
  metrics.forEach(m => { sellerQuotes[m.seller.id] = { name: m.seller.name, counts: { PENDING:0, ACCEPTED:0, REJECTED:0, EXPIRED:0 }, value: 0 }; });
  inPeriod.forEach(q => {
    const sid = q.sellerId || q.creatorId;
    if (sid && sellerQuotes[sid]) {
      sellerQuotes[sid].counts[q.status || 'PENDING']++;
      sellerQuotes[sid].value += q.total || 0;
    }
  });

  const pieData = Object.entries(byStatus)
    .filter(([, v]) => v.count > 0)
    .map(([k, v]) => ({ name: QUOTE_STATUS[k].label, value: v.count, color: QUOTE_STATUS[k].color }));

  const sellers = metrics.map(m => m.seller);

  return (
    <section className="space-y-4">
      <SectionHeader icon={FileText} title="Estatus de Cotizaciones" subtitle={`${total} cotizaciones · ${fmt(totalValue)} en valor`} accent="#b45309"
        extra={
          <select style={{ background:'#f8fafc', borderRadius:10, padding:'6px 12px', fontWeight:700, fontSize:11, color:'#334155', outline:'none', cursor:'pointer', border:'1px solid #e2e8f0' }}
            value={filterSeller} onChange={e => setFilterSeller(e.target.value)}>
            <option value="">Todos los vendedores</option>
            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        }
      />

      <div className={D.card}>
        <CardAccent color="#b45309" />
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cards de estado */}
          <div className="space-y-3">
            {Object.entries(QUOTE_STATUS).map(([key, meta]) => {
              const Icon = meta.icon;
              const data = byStatus[key] || { count: 0, value: 0 };
              const pct  = total ? Math.round((data.count / total) * 100) : 0;
              return (
                <div key={key} style={{ background: meta.bg, borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:14, border:`1px solid ${meta.color}18` }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 1px 4px ${meta.color}20, 0 0 0 1px ${meta.color}15` }}>
                    <Icon style={{ width:16, height:16, color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ fontSize:9, fontWeight:800, color: meta.color, textTransform:'uppercase', letterSpacing:'0.08em' }}>{meta.label}</span>
                      <span style={{ fontSize:9, fontWeight:700, color:'#94a3b8' }}>{pct}%</span>
                    </div>
                    <div style={{ height:4, background:'rgba(0,0,0,0.06)', borderRadius:999, overflow:'hidden', marginBottom:6 }}>
                      <div style={{ height:'100%', width:`${pct}%`, background: meta.color, borderRadius:999, transition:'width 0.8s ease' }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize:18, fontWeight:900, color:'#0f172a' }}>{data.count}</span>
                      <span style={{ fontSize:11, fontWeight:800, color: meta.color }}>{fmt(data.value)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pie + tabla por vendedor */}
          <div className="space-y-4">
            {pieData.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend wrapperStyle={{ fontSize:10, fontWeight:700 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {/* Tabla por vendedor */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Vendedor','Pend.','Aprobadas','No Conc.','Valor'].map(h => (
                      <th key={h} className="text-left pb-2 pr-3 text-[8px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {Object.values(sellerQuotes).filter(s => Object.values(s.counts).some(v => v > 0)).map((sq, i) => (
                    <tr key={i} className="hover:bg-gray-50/60">
                      <td className="py-2 pr-3 font-black text-gray-900 text-[11px] whitespace-nowrap">{sq.name.split(' ')[0]}</td>
                      <td className="py-2 pr-3"><span style={{ fontWeight:900, color:'#f59e0b', fontSize:12 }}>{sq.counts.PENDING}</span></td>
                      <td className="py-2 pr-3"><span style={{ fontWeight:900, color:'#10b981', fontSize:12 }}>{sq.counts.ACCEPTED}</span></td>
                      <td className="py-2 pr-3"><span style={{ fontWeight:900, color:'#ef4444', fontSize:12 }}>{sq.counts.REJECTED}</span></td>
                      <td className="py-2"><span style={{ fontWeight:900, color:'#0f172a', fontSize:11 }}>{fmt(sq.value)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CLIENTES NUEVOS / RECUPERADOS / CARTERA
// ══════════════════════════════════════════════════════════════════════════════
function ClientInsightsSection({ clients, deals, quotes, sinceDate, colors }) {
  const newClients = clients.filter(c => new Date(c.createdAt) >= sinceDate);

  // Recuperados: tienen deals recientes pero su cliente es anterior al período
  const activeClientIdsInPeriod = new Set([
    ...deals.filter(d => new Date(d.createdAt || d.updatedAt) >= sinceDate).map(d => d.clientId).filter(Boolean),
    ...quotes.filter(q => new Date(q.createdAt) >= sinceDate).map(q => q.clientId).filter(Boolean),
  ]);
  const recoveredClients = clients.filter(c =>
    new Date(c.createdAt) < sinceDate && activeClientIdsInPeriod.has(c.id)
  );

  // Top clientes por valor total de deals ganados
  const clientValueMap = {};
  deals.forEach(d => {
    if (!d.clientId) return;
    if (!clientValueMap[d.clientId]) clientValueMap[d.clientId] = { client: d.client, deals: 0, won: 0, value: 0, pipeline: 0 };
    clientValueMap[d.clientId].deals++;
    if (d.stage === 'CLOSED_WON') { clientValueMap[d.clientId].won++; clientValueMap[d.clientId].value += d.value || 0; }
    else if (!['CLOSED_WON','CLOSED_LOST'].includes(d.stage)) { clientValueMap[d.clientId].pipeline += d.value || 0; }
  });
  const topClients = Object.values(clientValueMap)
    .filter(c => c.client)
    .sort((a, b) => (b.value + b.pipeline) - (a.value + a.pipeline))
    .slice(0, 10);

  const maxClientVal = topClients[0] ? topClients[0].value + topClients[0].pipeline : 1;

  return (
    <section className="space-y-4">
      <SectionHeader icon={Users} title="Análisis de Clientes" subtitle={`${newClients.length} nuevos · ${recoveredClients.length} recuperados · ${clients.length} total`} accent="#059669" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Clientes nuevos */}
        <div className={D.card}>
          <CardAccent color="#1d4ed8" />
          <div className="p-5">
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${D.border}` }}>
              <div style={{ width:44, height:44, borderRadius:14, background:'#eff6ff', border:'1.5px solid #bfdbfe', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <UserPlus style={{ width:18, height:18, color:'#1d4ed8' }} />
              </div>
              <div>
                <p style={{ fontSize:28, fontWeight:900, color:'#0a0f1e', letterSpacing:'-0.04em', lineHeight:1 }}>{newClients.length}</p>
                <p style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>Clientes Nuevos</p>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:192, overflowY:'auto' }}>
              {newClients.length === 0 ? (
                <p style={{ fontSize:11, fontWeight:600, color:'#cbd5e1', textAlign:'center', padding:'16px 0' }}>Sin clientes nuevos en el período</p>
              ) : newClients.slice(0, 8).map((c) => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'#f8fafc', borderRadius:10, border:'1px solid #f1f5f9' }}>
                  <div style={{ width:28, height:28, borderRadius:9, background:'#dbeafe', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:11, fontWeight:900, color:'#1d4ed8' }}>{(c.companyName||'?').charAt(0)}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'#0a0f1e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.companyName}</p>
                    <p style={{ fontSize:9, fontWeight:500, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.email}</p>
                  </div>
                </div>
              ))}
              {newClients.length > 8 && <p style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textAlign:'center' }}>+{newClients.length - 8} más</p>}
            </div>
          </div>
        </div>

        {/* Clientes recuperados */}
        <div className={D.card}>
          <CardAccent color="#059669" />
          <div className="p-5">
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${D.border}` }}>
              <div style={{ width:44, height:44, borderRadius:14, background:'#ecfdf5', border:'1.5px solid #a7f3d0', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <UserCheck style={{ width:18, height:18, color:'#059669' }} />
              </div>
              <div>
                <p style={{ fontSize:28, fontWeight:900, color:'#0a0f1e', letterSpacing:'-0.04em', lineHeight:1 }}>{recoveredClients.length}</p>
                <p style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>Clientes Recuperados</p>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:192, overflowY:'auto' }}>
              {recoveredClients.length === 0 ? (
                <p style={{ fontSize:11, fontWeight:600, color:'#cbd5e1', textAlign:'center', padding:'16px 0' }}>Sin clientes recuperados en el período</p>
              ) : recoveredClients.slice(0, 8).map((c) => (
                <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', background:'#f8fafc', borderRadius:10, border:'1px solid #f1f5f9' }}>
                  <div style={{ width:28, height:28, borderRadius:9, background:'#d1fae5', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span style={{ fontSize:11, fontWeight:900, color:'#059669' }}>{(c.companyName||'?').charAt(0)}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'#0a0f1e', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.companyName}</p>
                    <p style={{ fontSize:9, fontWeight:500, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.contactName || c.email}</p>
                  </div>
                </div>
              ))}
              {recoveredClients.length > 8 && <p style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textAlign:'center' }}>+{recoveredClients.length - 8} más</p>}
            </div>
          </div>
        </div>

        {/* Análisis de cartera */}
        <div className={D.card}>
          <CardAccent color="#7c3aed" />
          <div className="p-5">
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, paddingBottom:14, borderBottom:`1px solid ${D.border}` }}>
              <div style={{ width:44, height:44, borderRadius:14, background:'#f5f3ff', border:'1.5px solid #ddd6fe', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Building2 style={{ width:18, height:18, color:'#7c3aed' }} />
              </div>
              <div>
                <p style={{ fontSize:28, fontWeight:900, color:'#0a0f1e', letterSpacing:'-0.04em', lineHeight:1 }}>{topClients.length}</p>
                <p style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>Cartera Principal</p>
              </div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {topClients.slice(0, 7).map((tc, i) => {
                const barW = Math.round(((tc.value + tc.pipeline) / maxClientVal) * 100);
                return (
                  <div key={i} style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#334155', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'60%' }}>{tc.client.companyName}</span>
                      <span style={{ fontSize:11, fontWeight:900, color:'#7c3aed', flexShrink:0 }}>{fmt(tc.value + tc.pipeline)}</span>
                    </div>
                    <div style={{ height:4, background:'#f1f5f9', borderRadius:999, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${barW}%`, background:`linear-gradient(90deg, #7c3aed, #a78bfa)`, borderRadius:999, transition:'width 0.8s ease' }} />
                    </div>
                    <div className="flex gap-3">
                      <span style={{ fontSize:8, fontWeight:700, color:'#10b981' }}>✓ {fmt(tc.value)} ganado</span>
                      <span style={{ fontSize:8, fontWeight:700, color:'#8b5cf6' }}>◈ {fmt(tc.pipeline)} pipeline</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VENTA POR LÍNEAS (top productos de cotizaciones aceptadas)
// ══════════════════════════════════════════════════════════════════════════════
function ProductLinesSection({ quotes, sinceDate }) {
  const inPeriod = quotes.filter(q => new Date(q.createdAt) >= sinceDate);

  // Agrupar items de todas las cotizaciones por nombre de producto
  const productMap = {};
  inPeriod.forEach(q => {
    const items = Array.isArray(q.items) ? q.items : [];
    items.forEach(item => {
      if (!item.name) return;
      const key = item.name.trim();
      if (!productMap[key]) productMap[key] = { name: key, qty: 0, value: 0, count: 0 };
      productMap[key].qty   += Number(item.qty)   || 0;
      productMap[key].value += Number(item.total || (item.qty * item.price)) || 0;
      productMap[key].count++;
    });
  });

  const topProducts = Object.values(productMap)
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  const maxVal = topProducts[0]?.value || 1;

  const PRODUCT_COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#0ea5e9','#14b8a6','#a855f7','#f43f5e','#84cc16','#fb923c','#6366f1'];

  if (topProducts.length === 0) return null;

  return (
    <section className="space-y-4">
      <SectionHeader icon={Package} title="Venta por Líneas / Productos" subtitle="Top productos por valor en cotizaciones" accent="#1d4ed8" />

      <div className={D.card}>
        <CardAccent color="#1d4ed8" />
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Barras horizontales */}
          <div className="space-y-3">
            {topProducts.slice(0, 8).map((p, i) => {
              const pct = Math.round((p.value / maxVal) * 100);
              const color = PRODUCT_COLORS[i % PRODUCT_COLORS.length];
              return (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ fontSize:11, fontWeight:700, color:'#374151' }} className="truncate flex-1">{p.name}</span>
                    <span style={{ fontSize:11, fontWeight:900, color, flexShrink:0 }}>{fmt(p.value)}</span>
                  </div>
                  <div style={{ height:6, background:'#f1f5f9', borderRadius:999, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:999, transition:'width 0.8s ease' }} />
                  </div>
                  <div className="flex gap-3">
                    <span style={{ fontSize:8, fontWeight:700, color:'#94a3b8' }}>Cant: {p.qty}</span>
                    <span style={{ fontSize:8, fontWeight:700, color:'#94a3b8' }}>En {p.count} cotizaciones</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Gráfica de barras verticales */}
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topProducts.slice(0, 8).map((p, i) => ({
              name: p.name.length > 14 ? p.name.slice(0,12)+'…' : p.name,
              'Valor $': Math.round(p.value),
              fill: PRODUCT_COLORS[i % PRODUCT_COLORS.length],
            }))} margin={{ top:4, right:4, left:0, bottom:40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize:8, fontWeight:700, fill:'#64748b' }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
              <YAxis tick={{ fontSize:9, fontWeight:700, fill:'#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<RichTooltip />} />
              <Bar dataKey="Valor $" radius={[6,6,0,0]} maxBarSize={40}>
                {topProducts.slice(0, 8).map((_, i) => <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PIPELINE KANBAN SOLO VISUALIZACIÓN (admin)
// ══════════════════════════════════════════════════════════════════════════════
const KANBAN_STAGES = [
  { key: 'QUALIFICATION',            label: 'Prospecto',            color: '#64748b' },
  { key: 'NEEDS_ANALYSIS',           label: 'Acercamiento',         color: '#0ea5e9' },
  { key: 'VALUE_PROPOSITION',        label: 'Contacto Decisor',     color: '#3b82f6' },
  { key: 'IDENTIFY_DECISION_MAKERS', label: 'Oportunidad',          color: '#6366f1' },
  { key: 'PROPOSAL_PRICE_QUOTE',     label: 'Levantamiento',        color: '#8b5cf6' },
  { key: 'PROPOSAL_SENT',            label: 'Cotización Enviada',   color: '#a855f7' },
  { key: 'NEGOTIATION_1',            label: 'Negociación 1',        color: '#f59e0b' },
  { key: 'RECOTIZACION',             label: 'Recotización',         color: '#fb923c' },
  { key: 'NEGOTIATION_2',            label: 'Negociación 2',        color: '#f97316' },
  { key: 'CLOSED_WON_PENDING',       label: 'Autorización',         color: '#22c55e' },
];

function PipelineKanbanReadOnly({ deals, metrics, colors }) {
  const [filterSeller, setFilterSeller] = useState('');
  const sellers = metrics.map(m => m.seller);

  const activeDeals = deals.filter(d => !['CLOSED_WON','CLOSED_LOST'].includes(d.stage));
  const filtered = filterSeller ? activeDeals.filter(d => d.assignedTo?.id === filterSeller) : activeDeals;

  const stageMap = {};
  KANBAN_STAGES.forEach(s => { stageMap[s.key] = []; });
  filtered.forEach(d => {
    if (stageMap[d.stage]) stageMap[d.stage].push(d);
    else stageMap['QUALIFICATION']?.push(d);
  });

  const nonEmpty = KANBAN_STAGES.filter(s => stageMap[s.key]?.length > 0);

  return (
    <section className="space-y-4">
      <SectionHeader icon={LayoutGrid} title="Pipeline — Vista Kanban" subtitle={`Solo visualización · ${filtered.length} tratos activos`} accent="#0284c7"
        extra={<div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5, background:'#eff6ff', borderRadius:8, padding:'4px 10px', border:'1px solid #bfdbfe' }}>
            <Eye style={{ width:10, height:10, color:'#1d4ed8' }} />
            <span style={{ fontSize:8, fontWeight:800, color:'#1d4ed8', textTransform:'uppercase', letterSpacing:'0.08em' }}>Read only</span>
          </div>
          <select style={{ background:'#f8fafc', borderRadius:10, padding:'6px 12px', fontWeight:700, fontSize:11, color:'#334155', outline:'none', cursor:'pointer', border:'1px solid #e2e8f0' }}
            value={filterSeller} onChange={e => setFilterSeller(e.target.value)}>
            <option value="">Todos los vendedores</option>
            {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>}
      />

      <div className={D.card}>
        <CardAccent color="#0284c7" />
        <div className="overflow-x-auto p-5">
          <div style={{ display:'flex', gap:14, minWidth: nonEmpty.length * 228 }}>
            {nonEmpty.map(stage => {
              const stageDeals = stageMap[stage.key] || [];
              const stageValue = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
              return (
                <div key={stage.key} style={{ minWidth:214, maxWidth:214, flexShrink:0 }}>
                  {/* Encabezado columna */}
                  <div style={{ background:`${stage.color}0d`, border:`1px solid ${stage.color}25`, borderRadius:12, padding:'10px 14px', marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <div style={{ width:6, height:6, borderRadius:'50%', background:stage.color, flexShrink:0 }} />
                        <span style={{ fontSize:8, fontWeight:800, color: stage.color, textTransform:'uppercase', letterSpacing:'0.08em' }}>{stage.label}</span>
                      </div>
                      <span style={{ fontSize:10, fontWeight:900, color: stage.color, background:`${stage.color}18`, borderRadius:6, padding:'1px 7px', border:`1px solid ${stage.color}20` }}>{stageDeals.length}</span>
                    </div>
                    <p style={{ fontSize:13, fontWeight:900, color:D.ink, letterSpacing:'-0.02em' }}>{fmt(stageValue)}</p>
                  </div>
                  {/* Tarjetas */}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {stageDeals.map(deal => {
                      const sellerIdx = metrics.findIndex(m => m.seller.id === deal.assignedTo?.id);
                      const color = sellerIdx >= 0 ? colors[sellerIdx % colors.length] : '#94a3b8';
                      return (
                        <div key={deal.id} style={{ background:'#fff', border:`1px solid ${D.border}`, borderRadius:12, padding:'11px 13px', cursor:'default', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                          <p style={{ fontSize:11, fontWeight:700, color:D.ink, marginBottom:3, lineHeight:1.35, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{deal.title}</p>
                          {deal.company && <p style={{ fontSize:9, fontWeight:600, color:D.faint, marginBottom:8 }}>{deal.company}</p>}
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <span style={{ fontSize:12, fontWeight:900, color:'#059669', letterSpacing:'-0.02em' }}>{fmt(deal.value)}</span>
                            {deal.assignedTo && (
                              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                                <div style={{ width:22, height:22, borderRadius:7, background:`${color}18`, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                  <span style={{ fontSize:9, fontWeight:900, color }}>{deal.assignedTo.name.charAt(0)}</span>
                                </div>
                                <span style={{ fontSize:9, fontWeight:600, color:D.faint }}>{deal.assignedTo.name.split(' ')[0]}</span>
                              </div>
                            )}
                          </div>
                          {deal.probability > 0 && (
                            <div style={{ marginTop:8 }}>
                              <div style={{ height:3, background:'#f1f5f9', borderRadius:999, overflow:'hidden' }}>
                                <div style={{ height:'100%', width:`${deal.probability}%`, background: stage.color, borderRadius:999 }} />
                              </div>
                              <span style={{ fontSize:8, fontWeight:600, color:D.faint }}>{deal.probability}% prob.</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {nonEmpty.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 w-full gap-3">
                <LayoutGrid className="w-10 h-10 text-gray-200" />
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sin tratos activos en el pipeline</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVIDADES VENCIDAS
// ══════════════════════════════════════════════════════════════════════════════
function OverdueActivitiesSection({ activities }) {
  const now = new Date();
  const overdue = activities.filter(a =>
    a.status === 'PENDING' && a.dueDate && new Date(a.dueDate) < now
  ).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  const upcoming = activities.filter(a => {
    if (a.status !== 'PENDING' || !a.dueDate) return false;
    const due = new Date(a.dueDate);
    const diff = (due - now) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3;
  }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  if (overdue.length === 0 && upcoming.length === 0) return null;

  const fmtDue = (d) => new Date(d).toLocaleString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
  const daysOverdue = (d) => Math.floor((now - new Date(d)) / (1000 * 60 * 60 * 24));

  return (
    <section className="space-y-4">
      <SectionHeader icon={AlertTriangle} title="Actividades Vencidas y Próximas" subtitle={`${overdue.length} vencidas · ${upcoming.length} próximas (72h)`} accent="#dc2626" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vencidas */}
        {overdue.length > 0 && (
          <div className={D.card}>
            <div style={{ height:3, background:'linear-gradient(90deg, #dc2626, #ef4444)' }} />
            <div className="p-5">
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, paddingBottom:12, borderBottom:`1px solid #fee2e2` }}>
                <div style={{ width:32, height:32, borderRadius:10, background:'#fef2f2', border:'1px solid #fecaca', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <AlertTriangle style={{ width:14, height:14, color:'#dc2626' }} />
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:800, color:'#dc2626', letterSpacing:'-0.01em' }}>{overdue.length} Vencidas</p>
                  <p style={{ fontSize:9, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em' }}>Requieren atención inmediata</p>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:288, overflowY:'auto' }}>
                {overdue.map(act => {
                  const meta = ACT_META[act.type] || ACT_META.NOTE;
                  const Icon = meta.icon;
                  const days = daysOverdue(act.dueDate);
                  return (
                    <div key={act.id} style={{ background:'#fff5f5', borderRadius:12, padding:'10px 13px', borderLeft:'3px solid #dc2626', border:'1px solid #fee2e2', borderLeftWidth:3 }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                        <div style={{ display:'flex', alignItems:'flex-start', gap:8, flex:1, minWidth:0 }}>
                          <div style={{ width:24, height:24, borderRadius:7, background:`${meta.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                            <Icon style={{ width:11, height:11, color: meta.color }} />
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:11, fontWeight:700, color:D.ink, lineHeight:1.35, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{act.content}</p>
                            <p style={{ fontSize:9, fontWeight:600, color:D.faint, marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{act.deal?.title || '—'} · {act.deal?.assignedTo?.name || '—'}</p>
                          </div>
                        </div>
                        <div style={{ flexShrink:0, textAlign:'right' }}>
                          <span style={{ fontSize:9, fontWeight:900, color:'#dc2626', background:'#fee2e2', padding:'2px 8px', borderRadius:8 }}>
                            {days === 0 ? 'Hoy' : `${days}d vencida`}
                          </span>
                          <p style={{ fontSize:8, fontWeight:700, color:'#94a3b8', marginTop:3 }}>{fmtDue(act.dueDate)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Próximas 72h */}
        {upcoming.length > 0 && (
          <div className={D.card}>
            <div style={{ height:3, background:'linear-gradient(90deg, #d97706, #f59e0b)' }} />
            <div className="p-5">
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, paddingBottom:12, borderBottom:`1px solid #fef3c7` }}>
                <div style={{ width:32, height:32, borderRadius:10, background:'#fffbeb', border:'1px solid #fde68a', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Clock style={{ width:14, height:14, color:'#d97706' }} />
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:800, color:'#b45309', letterSpacing:'-0.01em' }}>{upcoming.length} Próximas</p>
                  <p style={{ fontSize:9, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em' }}>Vencen en las próximas 72h</p>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:288, overflowY:'auto' }}>
                {upcoming.map(act => {
                  const meta = ACT_META[act.type] || ACT_META.NOTE;
                  const Icon = meta.icon;
                  const hoursLeft = Math.round((new Date(act.dueDate) - now) / (1000 * 60 * 60));
                  return (
                    <div key={act.id} style={{ background:'#fffdf0', borderRadius:12, padding:'10px 13px', border:'1px solid #fef3c7', borderLeftWidth:3, borderLeftColor:'#d97706' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}>
                        <div style={{ display:'flex', alignItems:'flex-start', gap:8, flex:1, minWidth:0 }}>
                          <div style={{ width:24, height:24, borderRadius:7, background:`${meta.color}15`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                            <Icon style={{ width:11, height:11, color: meta.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-800 text-[11px] line-clamp-2">{act.content}</p>
                            <p className="text-[9px] font-bold text-gray-400 mt-0.5">{act.deal?.title || '—'} · {act.deal?.assignedTo?.name || '—'}</p>
                          </div>
                        </div>
                        <div style={{ flexShrink:0, textAlign:'right' }}>
                          <span style={{ fontSize:9, fontWeight:900, color:'#d97706', background:'#fef3c7', padding:'2px 8px', borderRadius:8 }}>
                            {hoursLeft < 1 ? 'Ahora' : hoursLeft < 24 ? `${hoursLeft}h` : `${Math.floor(hoursLeft/24)}d`}
                          </span>
                          <p style={{ fontSize:8, fontWeight:700, color:'#94a3b8', marginTop:3 }}>{fmtDue(act.dueDate)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
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
      <SectionHeader icon={MessageSquare} title="Razones de Cierre" subtitle={`${won.length} ganados · ${lost.length} perdidos`} accent="#d97706" extra={
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
      } />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((deal, i) => {
          const isWon = deal.stage === 'CLOSED_WON';
          const color = colors[i % colors.length];
          const seller = deal.assignedTo;
          return (
            <div
              key={deal.id}
              className={cn(D.card, D.cardHover)}
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
        <div className={`${D.card} flex flex-col items-center justify-center py-16 gap-3`}>
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
              <div className={D.card}>
                <CardAccent color="#1d4ed8" />
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
              <div className={D.card}>
                <CardAccent color="#059669" />
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
              <div className={D.card}>
                <CardAccent color="#1d4ed8" />
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
              <div className={D.card}>
                <CardAccent color="#9333ea" />
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
            <div className={D.card}>
              <CardAccent color="#9333ea" />
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
            <div className={D.card}>
              <CardAccent color="#b45309" />
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
            <div className={D.card}>
              <CardAccent color="#0284c7" />
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
