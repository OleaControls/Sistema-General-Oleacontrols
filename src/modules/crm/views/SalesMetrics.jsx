import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Target, TrendingUp, Users, Activity, Calendar, ChevronDown, RefreshCw,
  CheckCircle2, XCircle, Clock, Briefcase, Star,
  MessageSquare, PhoneCall, Send, Coffee, ArrowRight, Building2,
  FileText, UserPlus, UserCheck, Package, AlertTriangle, LayoutGrid, Eye,
  TrendingDown, ClipboardList, ArrowUpRight, ArrowDownRight, Minus,
  Download, Timer, Gauge, Snowflake, CalendarClock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area,
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

/** Moneda abreviada para KPIs grandes: $1.2M, $340k, $980 */
const fmtShort = (n) => {
  const v = Number(n || 0), a = Math.abs(v), s = v < 0 ? '-' : '';
  if (a >= 1e9) return `${s}$${(a / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  if (a >= 1e6) return `${s}$${(a / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (a >= 1e4) return `${s}$${Math.round(a / 1e3)}k`;
  if (a >= 1e3) return `${s}$${(a / 1e3).toFixed(1).replace(/\.0$/, '')}k`;
  return `${s}$${Math.round(a)}`;
};

/** Variación % vs. período anterior. `null` = sin base comparable (no se inventa un %). */
const pctDelta = (cur, prev) => {
  if (!prev) return null;
  return Math.round(((cur - prev) / Math.abs(prev)) * 100);
};

const PERIODS = [
  { key: 'week',      label: '7 días',  days: 7  },
  { key: 'fortnight', label: '15 días', days: 15 },
  { key: 'month',     label: '30 días', days: 30 },
  { key: 'quarter',   label: '90 días', days: 90 },
];

const isOpenStage   = (stage) => !['CLOSED_WON', 'CLOSED_LOST'].includes(stage);
/** El CRM no persiste `closedAt`; para tratos cerrados `updatedAt` es la mejor aproximación. */
const closedAtOf    = (d) => new Date(d.updatedAt || d.createdAt);
const createdAtOf   = (d) => new Date(d.createdAt);
const STALL_DAYS    = 30;

/**
 * Motor de métricas: calcula el período actual, el período inmediatamente anterior
 * (misma duración) para comparar, la serie de tendencia y el avance del embudo.
 */
function buildAnalytics({ deals = [], quotes = [], activities = [], days }) {
  const now       = Date.now();
  const windowMs  = days * 86400000;
  const sinceTs   = now - windowMs;
  const prevTs    = now - windowMs * 2;

  const inWindow = (d) => d.getTime() >= sinceTs;
  const inPrev   = (d) => d.getTime() >= prevTs && d.getTime() < sinceTs;

  const won  = deals.filter(d => d.stage === 'CLOSED_WON');
  const lost = deals.filter(d => d.stage === 'CLOSED_LOST');
  const open = deals.filter(d => isOpenStage(d.stage));

  const sliceBy = (test) => {
    const w       = won.filter(d => test(closedAtOf(d)));
    const l       = lost.filter(d => test(closedAtOf(d)));
    const created = deals.filter(d => test(createdAtOf(d)));
    const q       = quotes.filter(x => test(new Date(x.createdAt)));
    const qOk     = q.filter(x => x.status === 'ACCEPTED');
    const acts    = activities.filter(a => test(new Date(a.createdAt)));

    const wonValue = w.reduce((s, d) => s + (d.value || 0), 0);
    const closedN  = w.length + l.length;
    const cycles   = w
      .map(d => (closedAtOf(d) - createdAtOf(d)) / 86400000)
      .filter(n => Number.isFinite(n) && n >= 0);

    return {
      wonCount:       w.length,
      lostCount:      l.length,
      wonValue,
      newDeals:       created.length,
      newValue:       created.reduce((s, d) => s + (d.value || 0), 0),
      winRate:        closedN ? Math.round((w.length / closedN) * 100) : 0,
      avgTicket:      w.length ? Math.round(wonValue / w.length) : 0,
      cycleDays:      cycles.length ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : 0,
      quotes:         q.length,
      quotedValue:    q.reduce((s, x) => s + (x.total || 0), 0),
      acceptedQuotes: qOk.length,
      acceptedValue:  qOk.reduce((s, x) => s + (x.total || 0), 0),
      quoteWinRate:   q.length ? Math.round((qOk.length / q.length) * 100) : 0,
      activities:     acts.length,
    };
  };

  const current  = sliceBy(inWindow);
  const previous = sliceBy(inPrev);

  // ── Fotografía del embudo abierto (independiente de la ventana) ────────────
  const openValue     = open.reduce((s, d) => s + (d.value || 0), 0);
  const weightedValue = open.reduce((s, d) => s + ((d.value || 0) * (d.probability ?? 0)) / 100, 0);
  const stalled       = open.filter(d => now - new Date(d.updatedAt || d.createdAt).getTime() > STALL_DAYS * 86400000);
  const slipping      = open.filter(d => d.expectedClose && new Date(d.expectedClose).getTime() < now);

  // ── Serie de tendencia ────────────────────────────────────────────────────
  const buckets = days <= 15 ? days : days <= 30 ? 15 : 12;
  const step    = windowMs / buckets;
  const trend   = Array.from({ length: buckets }, (_, i) => {
    const a = sinceTs + i * step;
    const b = a + step;
    const within = (t) => t >= a && t < b;
    const w = won.filter(d => within(closedAtOf(d).getTime()));
    const c = deals.filter(d => within(createdAtOf(d).getTime()));
    const q = quotes.filter(x => within(new Date(x.createdAt).getTime()));
    return {
      label:    new Date(a).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      ganado:   w.reduce((s, d) => s + (d.value || 0), 0),
      creado:   c.reduce((s, d) => s + (d.value || 0), 0),
      cotizado: q.reduce((s, x) => s + (x.total || 0), 0),
      tratos:   c.length,
    };
  });

  return {
    since: new Date(sinceTs),
    current, previous,
    openCount: open.length, openValue, weightedValue,
    stalled, slipping,
    wonTotalValue: won.reduce((s, d) => s + (d.value || 0), 0),
    trend,
  };
}

/**
 * Avance del embudo: cuántos tratos alcanzaron cada etapa. Como el CRM no guarda
 * el historial de etapas, se infiere por el orden del pipeline (un trato en
 * "Negociación 2" ya pasó por las etapas previas). Los perdidos se excluyen
 * porque no se sabe hasta dónde llegaron antes de caerse.
 */
function buildFunnel(deals, stages) {
  const order = stages.filter(s => s.key !== 'CLOSED_LOST');
  const index = Object.fromEntries(order.map((s, i) => [s.key, i]));
  const alive = deals.filter(d => d.stage !== 'CLOSED_LOST' && index[d.stage] !== undefined);
  const top   = alive.length || 1;

  return order.map((stage, i) => {
    const reached = alive.filter(d => index[d.stage] >= i);
    const here    = alive.filter(d => d.stage === stage.key);
    const prev    = i === 0 ? alive.length : alive.filter(d => index[d.stage] >= i - 1).length;
    return {
      ...stage,
      reached:    reached.length,
      here:       here.length,
      hereValue:  here.reduce((s, d) => s + (d.value || 0), 0),
      pctOfTop:   Math.round((reached.length / top) * 100),
      stepRate:   prev ? Math.round((reached.length / prev) * 100) : 0,
    };
  });
}

/** Descarga un CSV generado en el navegador (sin dependencias). */
function downloadCsv(filename, rows) {
  const esc  = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const body = rows.map(r => r.map(esc).join(',')).join('\r\n');
  const url  = URL.createObjectURL(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' }));
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ── Acordeón de sección ───────────────────────────────────────────────────────
function AccordionSection({ title, subtitle, icon: Icon, accent = '#1d4ed8', defaultOpen = true, badge, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderRadius:20, overflow:'hidden', border:'1px solid #f1f5f9', background:'#fff', boxShadow:'0 2px 8px rgba(0,0,0,0.04)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'14px 20px', background:'#fff', border:'none', cursor:'pointer', transition:'background 0.15s', borderBottom: open ? '1px solid #f1f5f9' : 'none' }}
        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
      >
        <div style={{ width:32, height:32, borderRadius:10, background:`${accent}12`, border:`1px solid ${accent}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon style={{ width:14, height:14, color:accent }} />
        </div>
        <div style={{ flex:1, textAlign:'left' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <p style={{ fontSize:12, fontWeight:900, color:'#0f172a', letterSpacing:'-0.01em' }}>{title}</p>
            {badge !== undefined && (
              <span style={{ fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:999, background:`${accent}15`, color:accent }}>{badge}</span>
            )}
          </div>
          {subtitle && <p style={{ fontSize:9, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.07em', marginTop:2 }}>{subtitle}</p>}
        </div>
        <div style={{ width:24, height:24, borderRadius:8, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <ChevronDown style={{ width:13, height:13, color:'#64748b' }} />
        </div>
      </button>
      {open && <div style={{ padding:'0' }}>{children}</div>}
    </div>
  );
}

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

// ══════════════════════════════════════════════════════════════════════════════
// TARJETA DE KPI CON VARIACIÓN VS. PERÍODO ANTERIOR
// ══════════════════════════════════════════════════════════════════════════════
/**
 * @param invert  true cuando "menos es mejor" (ciclo de venta, tratos perdidos)
 * @param delta   variación % vs. período anterior; null = sin base comparable
 */
function KpiTile({ label, value, hint, icon: Icon, accent, delta, invert = false, onClick }) {
  const neutral   = delta === null || delta === 0;
  const isGood    = neutral ? null : invert ? delta < 0 : delta > 0;
  const DeltaIcon = neutral ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const deltaColor = neutral ? '#94a3b8' : isGood ? '#059669' : '#dc2626';
  const deltaBg    = neutral ? '#f1f5f9' : isGood ? '#ecfdf5' : '#fef2f2';

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff', borderRadius: 16, border: '1px solid #e8edf5',
        padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)', cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.18s, transform 0.18s, border-color 0.18s',
      }}
      onMouseEnter={e => { if (!onClick) return; e.currentTarget.style.boxShadow = '0 10px 28px rgba(15,23,42,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = `${accent}55`; }}
      onMouseLeave={e => { if (!onClick) return; e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,0.04)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#e8edf5'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: `${accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon style={{ width: 13, height: 13, color: accent }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        </div>
        {delta !== undefined && (
          <span
            title={delta === null ? 'Sin datos en el período anterior para comparar' : `${delta > 0 ? '+' : ''}${delta}% vs. período anterior`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: deltaBg, color: deltaColor, borderRadius: 7, padding: '3px 7px', fontSize: 10, fontWeight: 800, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
          >
            <DeltaIcon style={{ width: 11, height: 11 }} />
            {delta === null ? '—' : `${Math.abs(delta)}%`}
          </span>
        )}
      </div>
      <p style={{ fontSize: 26, fontWeight: 800, color: '#0a0f1e', letterSpacing: '-0.035em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {hint && <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', lineHeight: 1.3 }}>{hint}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GRÁFICO DE TENDENCIA
// ══════════════════════════════════════════════════════════════════════════════
const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(10,15,30,0.97)', borderRadius: 12, padding: '10px 13px', boxShadow: '0 16px 40px rgba(0,0,0,0.35)' }}>
      <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</p>
      {payload.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: e.color || e.stroke, flexShrink: 0 }} />
          <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{e.name}</span>
          <span style={{ color: '#f8fafc', fontSize: 11, fontWeight: 800, marginLeft: 'auto', fontVariantNumeric: 'tabular-nums' }}>{fmt(e.value)}</span>
        </div>
      ))}
    </div>
  );
};

function TrendChart({ data }) {
  const empty = data.every(d => !d.ganado && !d.creado && !d.cotizado);
  if (empty) {
    return (
      <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#cbd5e1' }}>
        <TrendingUp style={{ width: 28, height: 28 }} />
        <p style={{ fontSize: 11, fontWeight: 700 }}>Sin movimiento registrado en el período</p>
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gWon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#059669" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gQuoted" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0284c7" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#0284c7" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gNew" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#7c3aed" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={64} />
        <Tooltip content={<TrendTooltip />} />
        <Area type="monotone" dataKey="creado"   name="Creado"     stroke="#7c3aed" strokeWidth={1.5} fill="url(#gNew)"    strokeDasharray="4 3" />
        <Area type="monotone" dataKey="cotizado" name="Cotizado"   stroke="#0284c7" strokeWidth={2}   fill="url(#gQuoted)" />
        <Area type="monotone" dataKey="ganado"   name="Ganado"     stroke="#059669" strokeWidth={2.5} fill="url(#gWon)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EMBUDO DE CONVERSIÓN
// ══════════════════════════════════════════════════════════════════════════════
const FUNNEL_COLORS = ['#94a3b8','#60a5fa','#6366f1','#8b5cf6','#f59e0b','#f97316','#a855f7','#ec4899','#f43f5e','#eab308','#10b981'];

function ConversionFunnel({ rows }) {
  if (!rows.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {rows.map((r, i) => {
        const color = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
        const drop  = i > 0 && r.stepRate < 100;
        return (
          <div key={r.key}>
            {i > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0 2px 10px' }}>
                <div style={{ width: 1, height: 12, background: '#e2e8f0' }} />
                <span style={{ fontSize: 9, fontWeight: 800, color: drop ? '#dc2626' : '#059669', letterSpacing: '0.02em' }}>
                  {r.stepRate}% avanza
                </span>
                {drop && <span style={{ fontSize: 9, fontWeight: 600, color: '#cbd5e1' }}>· se detienen {100 - r.stepRate}%</span>}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                    {r.here > 0 ? `${r.here} aquí · ${fmtShort(r.hereValue)}` : '—'}
                  </span>
                </div>
                <div style={{ position: 'relative', height: 26, background: '#f4f7fb', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${Math.max(r.pctOfTop, 2)}%`, background: `linear-gradient(90deg, ${color}, ${color}b0)`, borderRadius: 7, transition: 'width 0.7s ease' }} />
                  <span style={{ position: 'absolute', left: 10, top: 0, height: '100%', display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 800, color: r.pctOfTop > 14 ? '#fff' : '#475569', fontVariantNumeric: 'tabular-nums' }}>
                    {r.reached}
                  </span>
                </div>
              </div>
              <span style={{ width: 42, textAlign: 'right', fontSize: 12, fontWeight: 800, color: '#0a0f1e', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{r.pctOfTop}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tarjeta de KPI del vendedor ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
// MODAL DETALLE VENDEDOR (admin click en card)
// ══════════════════════════════════════════════════════════════════════════════
const QUOTE_STATUS = {
  PENDING:  { label: 'Pendiente',     color: '#f59e0b', bg: '#fffbeb', icon: Clock },
  ACCEPTED: { label: 'Aprobada',      color: '#10b981', bg: '#ecfdf5', icon: CheckCircle2 },
  REJECTED: { label: 'No concretada', color: '#ef4444', bg: '#fef2f2', icon: XCircle },
  EXPIRED:  { label: 'Expirada',      color: '#94a3b8', bg: '#f8fafc', icon: AlertTriangle },
};
const STAGE_LABEL_MAP = {
  QUALIFICATION:'Lead', NEEDS_ANALYSIS:'Acercamiento', VALUE_PROPOSITION:'Contacto decisor',
  IDENTIFY_DECISION_MAKERS:'Oportunidad', PROPOSAL:'Propuesta', NEGOTIATION:'Negociación 1',
  NEGOTIATION_2:'Negociación 2', CLOSED_WON_PENDING:'En espera', CLOSED_WON:'Ganado', CLOSED_LOST:'Perdido',
};

function SellerDetailModal({ data, color, rank, allDeals, allActivities, allQuotes, period, onClose }) {
  const { seller, wonDeals, activeDeals, lostDeals, wonValue, pipelineValue, quotes, acceptedQuotes, leads, closeRate, activities: actCount } = data;
  const [tab, setTab] = useState('deals');

  const sellerDeals = allDeals.filter(d => d.assignedTo?.id === seller.id || d.creatorId === seller.id);
  const sellerActs  = allActivities.filter(a => a.deal?.assignedTo?.id === seller.id || a.authorId === seller.id);
  const sellerQuotes= allQuotes.filter(q => q.sellerId === seller.id || q.creatorId === seller.id);

  const now = new Date();
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';

  const overdueActs = sellerActs.filter(a => a.status === 'PENDING' && a.dueDate && new Date(a.dueDate) < now);

  const TABS = [
    { key:'deals',  label:`Tratos (${sellerDeals.length})` },
    { key:'acts',   label:`Actividades (${sellerActs.length})` },
    { key:'quotes', label:`Cotizaciones (${sellerQuotes.length})` },
  ];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:24, boxShadow:'0 40px 80px rgba(0,0,0,0.3)', width:'100%', maxWidth:860, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Header con gradiente */}
        <div style={{ background:`linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`, padding:'24px 28px', position:'relative', overflow:'hidden', flexShrink:0 }}>
          <div style={{ position:'absolute', right:-30, top:-30, width:130, height:130, borderRadius:'50%', background:'rgba(255,255,255,0.07)' }} />
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative' }}>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              {seller.avatar ? (
                <img src={seller.avatar} alt={seller.name} style={{ width:56, height:56, borderRadius:16, objectFit:'cover', border:'2px solid rgba(255,255,255,0.4)' }} />
              ) : (
                <div style={{ width:56, height:56, borderRadius:16, background:'rgba(255,255,255,0.2)', border:'2px solid rgba(255,255,255,0.35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:24, fontWeight:900, color:'#fff' }}>{seller.name.charAt(0)}</span>
                </div>
              )}
              <div>
                <p style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:'-0.02em' }}>{seller.name}</p>
                <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:3 }}>
                  Ejecutivo de ventas · #{rank} en el período
                </p>
                {overdueActs.length > 0 && (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#dc2626', color:'#fff', padding:'3px 10px', borderRadius:8, fontSize:9, fontWeight:800, marginTop:6 }}>
                    <AlertTriangle style={{ width:10, height:10 }} /> {overdueActs.length} actividad{overdueActs.length>1?'es':''} vencida{overdueActs.length>1?'s':''}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ width:36, height:36, borderRadius:'50%', border:'none', background:'rgba(255,255,255,0.2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <XCircle style={{ width:18, height:18, color:'#fff' }} />
            </button>
          </div>

          {/* KPIs rápidos */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginTop:20, position:'relative' }}>
            {[
              { label:'Valor Ganado', value: fmt(wonValue),     highlight: true },
              { label:'Tasa Cierre',  value: `${closeRate}%`,   highlight: false },
              { label:'Embudo',       value: fmt(pipelineValue || 0), highlight: false },
              { label:'Cotizaciones', value: quotes,             highlight: false },
              { label:'Actividades',  value: actCount ?? 0,      highlight: false },
            ].map(({ label, value, highlight }) => (
              <div key={label} style={{ background: highlight ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)', borderRadius:12, padding:'10px 12px', border:'1px solid rgba(255,255,255,0.2)' }}>
                <p style={{ fontSize: highlight ? 18 : 16, fontWeight:900, color:'#fff', letterSpacing:'-0.02em', lineHeight:1 }}>{value}</p>
                <p style={{ fontSize:8, fontWeight:700, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.07em', marginTop:4 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:0, borderBottom:'1px solid #f1f5f9', flexShrink:0, background:'#fff' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex:1, padding:'12px 16px', border:'none', cursor:'pointer', fontSize:10, fontWeight:800,
              textTransform:'uppercase', letterSpacing:'0.07em', transition:'all 0.15s',
              background:'transparent',
              color: tab === t.key ? color : '#94a3b8',
              borderBottom: tab === t.key ? `2px solid ${color}` : '2px solid transparent',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Contenido con scroll */}
        <div style={{ flex:1, overflowY:'auto' }}>

          {/* TAB: TRATOS */}
          {tab === 'deals' && (
            <div>
              {sellerDeals.length === 0 ? (
                <div style={{ padding:'48px', textAlign:'center', color:'#94a3b8' }}>
                  <Briefcase style={{ width:32, height:32, margin:'0 auto 8px', opacity:0.3 }} />
                  <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase' }}>Sin tratos</p>
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                      {['Trato','Empresa','Etapa','Valor','Prob.','Cierre Esp.','Actos','Motivo de cierre'].map(h => (
                        <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:8, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sellerDeals.map(d => {
                      const isWon  = d.stage === 'CLOSED_WON';
                      const isLost = d.stage === 'CLOSED_LOST';
                      const isClosed = isWon || isLost;
                      return (
                        <tr key={d.id} style={{ borderBottom:'1px solid #f8fafc' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding:'10px 16px', fontWeight:800, color:'#0f172a', fontSize:12, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.title}</td>
                          <td style={{ padding:'10px 16px', fontSize:11, color:'#64748b', fontWeight:700 }}>{d.company || '—'}</td>
                          <td style={{ padding:'10px 16px' }}>
                            <span style={{ fontSize:8, fontWeight:800, padding:'3px 8px', borderRadius:7,
                              background: isWon ? '#ecfdf5' : isLost ? '#fef2f2' : '#eff6ff',
                              color: isWon ? '#059669' : isLost ? '#dc2626' : color,
                              textTransform:'uppercase', letterSpacing:'0.06em' }}>
                              {STAGE_LABEL_MAP[d.stage] || d.stage}
                            </span>
                          </td>
                          <td style={{ padding:'10px 16px', fontWeight:900, fontSize:12, color:'#0f172a', whiteSpace:'nowrap' }}>
                            {d.value ? fmt(d.value) : '—'}
                          </td>
                          <td style={{ padding:'10px 16px', fontSize:11, fontWeight:800, color }}>
                            {d.probability ? `${d.probability}%` : '—'}
                          </td>
                          <td style={{ padding:'10px 16px', fontSize:11, fontWeight:700, color:'#64748b', whiteSpace:'nowrap' }}>
                            {fmtDate(d.expectedClose)}
                          </td>
                          <td style={{ padding:'10px 16px', fontWeight:900, fontSize:13, color:'#0f172a', textAlign:'center' }}>
                            {d._count?.activities ?? 0}
                          </td>
                          <td style={{ padding:'10px 16px', maxWidth:200 }}>
                            {isClosed ? (
                              d.closeReason
                                ? <span title={d.closeReason} style={{ fontSize:11, fontWeight:600, color: isWon ? '#059669' : '#dc2626', display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'help' }}>{d.closeReason}</span>
                                : <span style={{ fontSize:10, fontWeight:600, color:'#cbd5e1', fontStyle:'italic' }}>Sin motivo</span>
                            ) : <span style={{ color:'#e2e8f0' }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB: ACTIVIDADES */}
          {tab === 'acts' && (
            <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:8 }}>
              {sellerActs.length === 0 ? (
                <div style={{ padding:'48px', textAlign:'center', color:'#94a3b8' }}>
                  <Activity style={{ width:32, height:32, margin:'0 auto 8px', opacity:0.3 }} />
                  <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase' }}>Sin actividades</p>
                </div>
              ) : sellerActs.map(a => {
                const meta = ACT_TYPE_META[a.type] || ACT_TYPE_META.NOTE;
                const Icon = meta.icon;
                const overdue = a.status === 'PENDING' && a.dueDate && new Date(a.dueDate) < now;
                return (
                  <div key={a.id} style={{ display:'flex', gap:12, padding:'10px 14px', borderRadius:12,
                    background: overdue ? '#fff5f5' : '#fafafa',
                    border: overdue ? '1px solid #fecaca' : '1px solid #f1f5f9' }}>
                    <div style={{ width:32, height:32, borderRadius:10, background: overdue ? '#fee2e2' : meta.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon style={{ width:13, height:13, color: overdue ? '#dc2626' : meta.color }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ fontSize:8, fontWeight:900, padding:'2px 8px', borderRadius:6, background: overdue ? '#fecaca' : meta.bg, color: overdue ? '#dc2626' : meta.color, textTransform:'uppercase' }}>
                          {overdue ? '⚠ VENCIDA' : meta.label}
                        </span>
                        {a.deal?.title && <span style={{ fontSize:10, fontWeight:800, color:'#1d4ed8' }}>{a.deal.title}</span>}
                        <span style={{ marginLeft:'auto', fontSize:9, fontWeight:700, color:'#94a3b8' }}>{fmtDateTime(a.createdAt)}</span>
                      </div>
                      <p style={{ fontSize:11, fontWeight:600, color:'#334155', marginTop:4, lineHeight:1.4 }}>{a.title || a.content || '—'}</p>
                      {a.dueDate && (
                        <p style={{ fontSize:9, fontWeight:700, color: overdue ? '#dc2626' : '#94a3b8', marginTop:3 }}>
                          Vence: {fmtDateTime(a.dueDate)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: COTIZACIONES */}
          {tab === 'quotes' && (
            <div>
              {sellerQuotes.length === 0 ? (
                <div style={{ padding:'48px', textAlign:'center', color:'#94a3b8' }}>
                  <FileText style={{ width:32, height:32, margin:'0 auto 8px', opacity:0.3 }} />
                  <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase' }}>Sin cotizaciones</p>
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                      {['Folio','Fecha','Cliente','Proyecto','Items','Total','Estado'].map(h => (
                        <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:8, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sellerQuotes.map(q => {
                      const st = (QUOTE_STATUS || {})[q.status] || { label: q.status, color:'#64748b', bg:'#f1f5f9', icon: Clock };
                      const StIcon = st.icon || Clock;
                      return (
                        <tr key={q.id} style={{ borderBottom:'1px solid #f8fafc' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding:'10px 16px', fontFamily:'monospace', fontWeight:900, fontSize:11, color:'#1d4ed8' }}>{q.quoteNumber}</td>
                          <td style={{ padding:'10px 16px', fontSize:11, color:'#64748b', fontWeight:700, whiteSpace:'nowrap' }}>{fmtDate(q.createdAt)}</td>
                          <td style={{ padding:'10px 16px', fontSize:12, fontWeight:800, color:'#0f172a' }}>{q.client?.companyName || '—'}</td>
                          <td style={{ padding:'10px 16px', fontSize:11, color:'#475569', fontWeight:700, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.projectName || '—'}</td>
                          <td style={{ padding:'10px 16px', textAlign:'center', fontWeight:900, fontSize:13 }}>{Array.isArray(q.items) ? q.items.length : 0}</td>
                          <td style={{ padding:'10px 16px', fontWeight:900, fontSize:13, color:'#0f172a', whiteSpace:'nowrap' }}>
                            ${Number(q.total || 0).toLocaleString('es-MX', { minimumFractionDigits:2, maximumFractionDigits:2 })}
                          </td>
                          <td style={{ padding:'10px 16px' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4, background: st.bg, color: st.color, padding:'4px 10px', borderRadius:8, fontSize:8, fontWeight:800, textTransform:'uppercase' }}>
                              <StIcon style={{ width:10, height:10 }} /> {st.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SellerCard({ data, color, rank }) {
  const { seller, wonDeals, activeDeals, lostDeals, deals, wonValue, pipelineValue, quotes, acceptedQuotes, acceptedValue = 0, leads, closeRate, activities } = data;
  const initial = (seller.name || '?').charAt(0).toUpperCase();
  const isTop = rank === 1;
  const totalDeals = (wonDeals || 0) + (activeDeals || 0) + (lostDeals || 0);

  return (
    <div style={{
      borderRadius: 20, overflow: 'hidden', background: '#fff',
      boxShadow: isTop
        ? `0 8px 32px ${color}25, 0 2px 8px rgba(0,0,0,0.06)`
        : '0 2px 12px rgba(0,0,0,0.06)',
      border: isTop ? `1.5px solid ${color}40` : '1px solid #f1f5f9',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 40px ${color}20, 0 4px 12px rgba(0,0,0,0.08)`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = isTop ? `0 8px 32px ${color}25, 0 2px 8px rgba(0,0,0,0.06)` : '0 2px 12px rgba(0,0,0,0.06)'; }}
    >
      {/* Banner superior con gradiente */}
      <div style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`,
        padding: '20px 20px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Círculo decorativo */}
        <div style={{ position:'absolute', right:-20, top:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.08)' }} />
        <div style={{ position:'absolute', right:20, bottom:-30, width:70, height:70, borderRadius:'50%', background:'rgba(255,255,255,0.06)' }} />

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', position:'relative' }}>
          {/* Avatar */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {seller.avatar ? (
              <img src={seller.avatar} alt={seller.name} style={{ width:48, height:48, borderRadius:14, objectFit:'cover', border:'2px solid rgba(255,255,255,0.4)' }} />
            ) : (
              <div style={{ width:48, height:48, borderRadius:14, background:'rgba(255,255,255,0.2)', border:'2px solid rgba(255,255,255,0.35)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)' }}>
                <span style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:'-0.02em' }}>{initial}</span>
              </div>
            )}
            <div>
              <p style={{ fontSize:13, fontWeight:900, color:'#fff', letterSpacing:'-0.01em', lineHeight:1.2 }}>{seller.name}</p>
              <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.07em', marginTop:3 }}>Ejecutivo de ventas</p>
            </div>
          </div>
          {/* Rank badge */}
          <div style={{
            width:34, height:34, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
            background: isTop ? '#fef3c7' : 'rgba(255,255,255,0.2)',
            border: isTop ? '1px solid #fde68a' : '1px solid rgba(255,255,255,0.3)',
          }}>
            {isTop
              ? <Star style={{ width:16, height:16, color:'#d97706' }} />
              : <span style={{ fontSize:13, fontWeight:900, color:'#fff' }}>#{rank}</span>
            }
          </div>
        </div>
      </div>

      {/* Valor ganado flotando sobre el banner */}
      <div style={{ margin:'-20px 16px 0', position:'relative', zIndex:1 }}>
        <div style={{
          background:'#fff', borderRadius:14, padding:'14px 16px',
          boxShadow:'0 4px 16px rgba(0,0,0,0.10)', border:`1px solid ${color}20`,
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <p style={{ fontSize:8, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>Valor Ganado</p>
            <p style={{ fontSize:24, fontWeight:900, color, letterSpacing:'-0.03em', lineHeight:1 }}>{fmt(wonValue)}</p>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:8, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Tasa Cierre</p>
            <p style={{ fontSize:22, fontWeight:900, color: closeRate >= 50 ? '#059669' : closeRate >= 25 ? '#f59e0b' : '#dc2626', letterSpacing:'-0.02em' }}>{closeRate}%</p>
          </div>
        </div>
      </div>

      {/* Cotizado autorizado (monto) */}
      <div style={{ margin:'10px 16px 0' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'9px 14px' }}>
          <span style={{ fontSize:8, fontWeight:900, color:'#059669', textTransform:'uppercase', letterSpacing:'0.1em' }}>Cotizado Autorizado · {acceptedQuotes} cot.</span>
          <span style={{ fontSize:15, fontWeight:900, color:'#059669', fontFamily:'monospace' }}>{fmt(acceptedValue)}</span>
        </div>
      </div>

      {/* Cuerpo */}
      <div style={{ padding:'16px 16px 14px' }}>
        {/* Barra de pipeline */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:8, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>Progreso del embudo</span>
            <span style={{ fontSize:8, fontWeight:800, color }}>
              {wonDeals}/{totalDeals} cerrados
            </span>
          </div>
          <div style={{ height:6, background:'#f1f5f9', borderRadius:999, overflow:'hidden' }}>
            <div style={{ height:'100%', display:'flex', borderRadius:999, overflow:'hidden' }}>
              <div style={{ width:`${totalDeals ? (wonDeals/totalDeals)*100 : 0}%`, background:'#059669', transition:'width 0.8s ease' }} />
              <div style={{ width:`${totalDeals ? (activeDeals/totalDeals)*100 : 0}%`, background: color, transition:'width 0.8s ease', opacity:0.7 }} />
              <div style={{ width:`${totalDeals ? (lostDeals/totalDeals)*100 : 0}%`, background:'#fca5a5', transition:'width 0.8s ease' }} />
            </div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:5 }}>
            {[['#059669','Ganados',wonDeals],['#94a3b8','Activos',activeDeals],['#fca5a5','Perdidos',lostDeals]].map(([c,l,v]) => (
              <div key={l} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <div style={{ width:6, height:6, borderRadius:2, background:c }} />
                <span style={{ fontSize:8, fontWeight:700, color:'#94a3b8' }}>{l}: <strong style={{ color:'#334155' }}>{v}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* KPI grid 2x2 */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
          {[
            { label:'Embudo', value: fmt(pipelineValue || 0), icon: TrendingUp,   col:'#7c3aed', bg:'#faf5ff' },
            { label:'Cotizac.', value: quotes,                   icon: FileText,     col:'#0284c7', bg:'#f0f9ff' },
            { label:'Aceptadas',value: acceptedQuotes,           icon: CheckCircle2, col:'#059669', bg:'#f0fdf4' },
            { label:'Activid.', value: activities ?? 0,          icon: Activity,     col:'#b45309', bg:'#fffbeb' },
          ].map(({ label, value, icon: Icon, col, bg }) => (
            <div key={label} style={{ background:bg, borderRadius:12, padding:'10px 12px', border:`1px solid ${col}15`, display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:28, height:28, borderRadius:9, background:`${col}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon style={{ width:12, height:12, color:col }} />
              </div>
              <div>
                <p style={{ fontSize:16, fontWeight:900, color:col, letterSpacing:'-0.02em', lineHeight:1 }}>{value}</p>
                <p style={{ fontSize:8, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:3 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', borderTop:'1px solid #f1f5f9', paddingTop:12, gap:4 }}>
          {[
            { label:'Total Deals', value: deals },
            { label:'Leads',       value: leads },
            { label:'Perdidos',    value: lostDeals },
          ].map(({ label, value }, i, arr) => (
            <div key={label} style={{ textAlign:'center', borderRight: i < arr.length-1 ? '1px solid #f1f5f9' : 'none' }}>
              <p style={{ fontSize:16, fontWeight:900, color:'#0f172a', letterSpacing:'-0.02em' }}>{value}</p>
              <p style={{ fontSize:8, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
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
            {['#', 'Vendedor', 'Tratos', 'Ganados', 'Perdidos', 'Activos', 'Cotiz.', 'Aceptadas', 'Valor Ganado', 'Cierre %'].map(h => (
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

// ═══════════════════════════════════════════════════════════════════════════════
export default function SalesMetrics() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.roles?.includes('ADMIN') || user?.role === 'ADMIN';

  const [period, setPeriod]         = useState('month');
  const [metrics, setMetrics]       = useState([]);
  const [activities, setActivities] = useState([]);
  const [deals, setDeals]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [sellerModal, setSellerModal] = useState(null);

  const [closedDeals, setClosedDeals] = useState([]);
  const [allQuotes, setAllQuotes]     = useState([]);
  const [clients, setClients]         = useState([]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, dealsRes, actsRes, quotesRes, clientsRes] = await Promise.all([
        apiFetch(`/api/crm/sales-metrics?period=${period}`),
        apiFetch('/api/crm/deals'),
        apiFetch('/api/crm/activity-feed?limit=200'),
        isAdmin ? apiFetch('/api/quotes')      : Promise.resolve(null),
        isAdmin ? apiFetch('/api/crm/clients') : Promise.resolve(null),
      ]);

      const [metricsData, dealsData] = await Promise.all([
        metricsRes.json(),
        dealsRes.json(),
      ]);

      if (!metricsRes.ok) throw new Error(metricsData.error || 'Error al cargar');
      setMetrics(Array.isArray(metricsData) ? metricsData : []);
      setDeals(Array.isArray(dealsData) ? dealsData : []);

      const actsData = await actsRes.json();
      setActivities(Array.isArray(actsData) ? actsData : []);
      if (quotesRes)  { const d = await quotesRes.json();  setAllQuotes(Array.isArray(d) ? d : []); }
      if (clientsRes) { const d = await clientsRes.json(); setClients(Array.isArray(d) ? d : []); }

      const closed = (Array.isArray(dealsData) ? dealsData : [])
        .filter(d => d.stage === 'CLOSED_WON' || d.stage === 'CLOSED_LOST');
      setClosedDeals(closed);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period, isAdmin]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const currentPeriod = PERIODS.find(p => p.key === period) || PERIODS[2];

  // ── Motor de métricas (período actual vs. anterior, tendencia y embudo) ────
  const A = useMemo(
    () => buildAnalytics({ deals, quotes: allQuotes, activities, days: currentPeriod.days }),
    [deals, allQuotes, activities, currentPeriod.days]
  );
  const funnel = useMemo(() => buildFunnel(deals, KANBAN_STAGES), [deals]);

  // Valor ganado por vendedor calculado sobre el pipeline real, para que las
  // tarjetas concuerden con el Kanban y entre sí.
  const wonValueBySeller = useCallback((sellerId) => deals
    .filter(d => d.stage === 'CLOSED_WON' && (d.assignedTo?.id === sellerId || d.assignedToId === sellerId))
    .reduce((s, d) => s + (d.value || 0), 0), [deals]);

  const overdueCount = useMemo(
    () => activities.filter(a => a.status === 'PENDING' && a.dueDate && new Date(a.dueDate) < new Date()).length,
    [activities]
  );

  const exportCsv = useCallback(() => {
    const head = ['Vendedor','Tratos','Ganados','Perdidos','Activos','Valor ganado','Embudo','Cotizaciones','Cotiz. aceptadas','Tasa de cierre %'];
    const rows = [...metrics]
      .sort((a, b) => wonValueBySeller(b.seller.id) - wonValueBySeller(a.seller.id))
      .map(m => [
        m.seller.name, m.deals, m.wonDeals, m.lostDeals, m.activeDeals,
        wonValueBySeller(m.seller.id), m.pipelineValue, m.quotes, m.acceptedQuotes, m.closeRate,
      ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`metricas-comerciales-${currentPeriod.days}d-${stamp}.csv`, [head, ...rows]);
  }, [metrics, wonValueBySeller, currentPeriod.days]);

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

  const { current: C, previous: P } = A;

  return (
    <div className="space-y-4 pb-12">

      {/* ── ENCABEZADO ────────────────────────────────────────────────────────── */}
      <div style={{ position:'relative', overflow:'hidden', background:'linear-gradient(135deg, #0b1220 0%, #16233b 55%, #0b1220 100%)', borderRadius:22, padding:'26px 30px', boxShadow:'0 10px 36px rgba(11,18,32,0.22)' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle, rgba(255,255,255,.045) 1px, transparent 1px)', backgroundSize:'26px 26px' }} />
        <div style={{ position:'absolute', right:-90, top:-90, width:340, height:340, background:'radial-gradient(circle, rgba(59,130,246,.12) 0%, transparent 65%)' }} />
        <div style={{ position:'absolute', left:'38%', bottom:-70, width:240, height:240, background:'radial-gradient(circle, rgba(16,185,129,.09) 0%, transparent 70%)' }} />

        <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:9 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 0 3px rgba(16,185,129,.18)' }} />
              <span style={{ fontSize:9, fontWeight:700, color:'#7c8ba1', textTransform:'uppercase', letterSpacing:'0.2em', fontFamily:'ui-monospace, monospace' }}>
                Panel Comercial · Oleacontrols
              </span>
            </div>
            <h2 style={{ fontSize:'clamp(1.55rem, 4vw, 2.2rem)', fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.035em', margin:0, lineHeight:1.02 }}>
              Métricas de Ventas
            </h2>
            <p style={{ fontSize:11.5, color:'#7c8ba1', fontWeight:600, marginTop:9 }}>
              Últimos {currentPeriod.days} días&ensp;·&ensp;desde el {A.since.toLocaleDateString('es-MX', { day:'2-digit', month:'long' })}
              &ensp;·&ensp;{metrics.length} vendedor{metrics.length !== 1 ? 'es' : ''}
              &ensp;·&ensp;comparado contra los {currentPeriod.days} días previos
            </p>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <div style={{ display:'flex', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.09)', borderRadius:11, padding:3, gap:2 }}>
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)} style={{
                  padding:'6px 13px', borderRadius:8, fontSize:11, fontWeight:700, cursor:'pointer', transition:'all 0.15s',
                  background: period === p.key ? '#f8fafc' : 'transparent',
                  color:      period === p.key ? '#0b1220' : '#8b9ab1',
                  border:'none',
                }}>{p.label}</button>
              ))}
            </div>
            {[
              { icon: Download,  label: 'Exportar CSV',        onClick: exportCsv,    show: metrics.length > 0 },
              { icon: RefreshCw, label: 'Actualizar métricas', onClick: fetchMetrics, show: true },
            ].filter(b => b.show).map(({ icon: Icon, label, onClick }) => (
              <button key={label} onClick={onClick} title={label} aria-label={label} style={{
                width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
                background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.09)', cursor:'pointer', color:'#8b9ab1', transition:'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,.13)'; e.currentTarget.style.color='#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,.05)'; e.currentTarget.style.color='#8b9ab1'; }}
              >
                <Icon style={{ width:14, height:14 }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPIs PRINCIPALES (con variación vs. período anterior) ──────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(210px, 1fr))', gap:12 }}>
        <KpiTile
          label="Ingreso ganado" accent="#059669" icon={DollarSign}
          value={fmtShort(C.wonValue)}
          hint={`${C.wonCount} trato${C.wonCount !== 1 ? 's' : ''} cerrado${C.wonCount !== 1 ? 's' : ''} · ${fmt(C.wonValue)}`}
          delta={pctDelta(C.wonValue, P.wonValue)}
        />
        <KpiTile
          label="Embudo abierto" accent="#7c3aed" icon={TrendingUp}
          value={fmtShort(A.openValue)}
          hint={`${A.openCount} tratos activos · ${fmtShort(A.weightedValue)} ponderado por probabilidad`}
        />
        <KpiTile
          label="Tasa de cierre" accent="#0284c7" icon={Target}
          value={`${C.winRate}%`}
          hint={`${C.wonCount} ganados vs. ${C.lostCount} perdidos en el período`}
          delta={pctDelta(C.winRate, P.winRate)}
        />
        <KpiTile
          label="Ticket promedio" accent="#b45309" icon={Gauge}
          value={fmtShort(C.avgTicket)}
          hint={C.wonCount ? `Promedio de ${C.wonCount} cierre${C.wonCount !== 1 ? 's' : ''}` : 'Sin cierres en el período'}
          delta={pctDelta(C.avgTicket, P.avgTicket)}
        />
        <KpiTile
          label="Ciclo de venta" accent="#0d9488" icon={Timer}
          value={C.cycleDays ? `${C.cycleDays} d` : '—'}
          hint="Días promedio entre alta y cierre del trato"
          delta={pctDelta(C.cycleDays, P.cycleDays)} invert
        />
        <KpiTile
          label="Cotizado autorizado" accent="#1d4ed8" icon={FileText}
          value={fmtShort(C.acceptedValue)}
          hint={`${C.acceptedQuotes} de ${C.quotes} cotizaciones · ${C.quoteWinRate}% de aceptación`}
          delta={pctDelta(C.acceptedValue, P.acceptedValue)}
        />
      </div>

      {/* ── TENDENCIA + EMBUDO ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-3">
        <div className={D.card}>
          <CardAccent color="#059669" />
          <div style={{ padding:'18px 20px 8px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div>
                <h3 style={{ fontSize:13, fontWeight:800, color:D.ink, letterSpacing:'-0.01em', margin:0 }}>Evolución del período</h3>
                <p style={{ fontSize:10, fontWeight:600, color:D.faint, marginTop:3 }}>
                  Monto cerrado, cotizado y dado de alta durante los últimos {currentPeriod.days} días
                </p>
              </div>
              <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                {[
                  { c:'#059669', l:'Ganado',   v: C.wonValue },
                  { c:'#0284c7', l:'Cotizado', v: C.quotedValue },
                  { c:'#7c3aed', l:'Creado',   v: C.newValue },
                ].map(({ c, l, v }) => (
                  <div key={l} style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ width:8, height:8, borderRadius:2, background:c, flexShrink:0 }} />
                    <div>
                      <p style={{ fontSize:9, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>{l}</p>
                      <p style={{ fontSize:12, fontWeight:800, color:'#0a0f1e', fontVariantNumeric:'tabular-nums' }}>{fmtShort(v)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ padding:'0 12px 12px' }}>
            <TrendChart data={A.trend} />
          </div>
        </div>

        <div className={D.card}>
          <CardAccent color="#7c3aed" />
          <div style={{ padding:'18px 20px' }}>
            <h3 style={{ fontSize:13, fontWeight:800, color:D.ink, letterSpacing:'-0.01em', margin:0 }}>Avance del embudo</h3>
            <p style={{ fontSize:10, fontWeight:600, color:D.faint, marginTop:3, marginBottom:16 }}>
              Tratos que alcanzaron cada etapa. Los perdidos se excluyen: el CRM no guarda hasta dónde llegaron.
            </p>
            <ConversionFunnel rows={funnel} />
          </div>
        </div>
      </div>

      {/* ── SEÑALES DE RIESGO ─────────────────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(210px, 1fr))', gap:12 }}>
        {[
          { label:'Tratos estancados', icon: Snowflake, accent:'#dc2626',
            value: A.stalled.length,
            money: A.stalled.reduce((s, d) => s + (d.value || 0), 0),
            hint: `Sin movimiento en más de ${STALL_DAYS} días` },
          { label:'Cierre vencido', icon: CalendarClock, accent:'#ea580c',
            value: A.slipping.length,
            money: A.slipping.reduce((s, d) => s + (d.value || 0), 0),
            hint: 'Pasó la fecha de cierre esperada y siguen abiertos' },
          { label:'Actividades vencidas', icon: AlertTriangle, accent:'#b45309',
            value: overdueCount, money: null,
            hint: 'Tareas pendientes fuera de fecha' },
          { label:'Actividades del período', icon: Activity, accent:'#0284c7',
            value: C.activities, money: null,
            hint: `${C.newDeals} tratos nuevos dados de alta`, delta: pctDelta(C.activities, P.activities) },
        ].map(({ label, icon: Icon, accent, value, money, hint, delta }) => (
          <div key={label} style={{ background:'#fff', borderRadius:16, border:'1px solid #e8edf5', padding:'14px 16px', display:'flex', alignItems:'center', gap:13, boxShadow:'0 1px 2px rgba(15,23,42,0.04)' }}>
            <div style={{ width:38, height:38, borderRadius:12, background:`${accent}12`, border:`1px solid ${accent}22`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon style={{ width:16, height:16, color:accent }} />
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:7 }}>
                <p style={{ fontSize:21, fontWeight:800, color: value > 0 ? accent : '#0a0f1e', letterSpacing:'-0.03em', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{value}</p>
                {money > 0 && <span style={{ fontSize:11, fontWeight:700, color:'#64748b', fontVariantNumeric:'tabular-nums' }}>{fmtShort(money)}</span>}
                {delta !== undefined && delta !== null && (
                  <span style={{ fontSize:10, fontWeight:800, color: delta >= 0 ? '#059669' : '#dc2626' }}>{delta > 0 ? '+' : ''}{delta}%</span>
                )}
              </div>
              <p style={{ fontSize:10.5, fontWeight:700, color:'#334155', marginTop:4 }}>{label}</p>
              <p style={{ fontSize:9.5, fontWeight:600, color:'#94a3b8', marginTop:1 }}>{hint}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══ KANBAN — siempre visible ══════════════════════════════════════════ */}
      <PipelineKanbanReadOnly deals={deals} metrics={metrics} colors={SELLER_COLORS} onDealClick={(id) => navigate('/crm/deals/' + id)} />

      {/* ══ SECCIONES ═════════════════════════════════════════════════════════ */}
      <div className="space-y-3">

        {/* 1 · Actividades vencidas — alerta al top */}
        {overdueCount > 0 && (
          <AccordionSection icon={AlertTriangle} title="Actividades Vencidas" subtitle={`${overdueCount} actividad${overdueCount > 1 ? 'es' : ''} requiere${overdueCount > 1 ? 'n' : ''} atención`} accent="#dc2626" badge={overdueCount} defaultOpen={true}>
            <div style={{ padding:'20px' }}>
              <OverdueActivitiesSection activities={activities} />
            </div>
          </AccordionSection>
        )}

        {/* 2 · Tabla comparativa de vendedores — abierta por defecto */}
        {metrics.length > 0 && (
          <AccordionSection icon={ClipboardList} title="Comparativa de Vendedores" subtitle={`Ranking por valor ganado · últimos ${currentPeriod.days} días`} accent="#0f172a" badge={metrics.length} defaultOpen={true}>
            <div style={{ padding:'8px 20px 16px' }}>
              <ComparisonTable
                metrics={metrics.map(m => ({ ...m, wonValue: wonValueBySeller(m.seller.id) }))}
                colors={SELLER_COLORS}
              />
            </div>
          </AccordionSection>
        )}

        {/* 3 · Desempeño por Vendedor */}
        {metrics.length > 0 && (
          <AccordionSection icon={Users} title="Desempeño por Vendedor" subtitle={`${metrics.length} vendedores · clic en card para ver detalle`} accent="#1d4ed8" badge={metrics.length} defaultOpen={false}>
            <div style={{ padding:'20px' }}>
              <div className={cn(
                'grid gap-4',
                metrics.length === 1 ? 'grid-cols-1 max-w-sm' :
                metrics.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
              )}>
                {[...metrics]
                  .sort((a, b) => wonValueBySeller(b.seller.id) - wonValueBySeller(a.seller.id))
                  .map((m, i) => {
                    const color = SELLER_COLORS[i % SELLER_COLORS.length];
                    const acceptedValue = allQuotes
                      .filter(q => q.status === 'ACCEPTED' && (q.sellerId === m.seller.id || q.creatorId === m.seller.id))
                      .reduce((s, q) => s + (q.total || 0), 0);
                    const cardData = { ...m, acceptedValue, wonValue: wonValueBySeller(m.seller.id) };
                    return (
                      <div key={m.seller.id} onClick={() => isAdmin && setSellerModal({ data: cardData, color, rank: i + 1 })}
                        style={{ cursor: isAdmin ? 'pointer' : 'default' }}>
                        <SellerCard data={cardData} color={color} rank={i + 1} />
                      </div>
                    );
                  })}
              </div>
            </div>
          </AccordionSection>
        )}

        {/* 4 · Cotizaciones */}
        {isAdmin && allQuotes.length > 0 && (
          <AccordionSection icon={FileText} title="Cotizaciones" subtitle={`${allQuotes.length} cotizaciones · clic para ver detalle`} accent="#0284c7" badge={allQuotes.length} defaultOpen={false}>
            <div style={{ padding:'20px' }}>
              <QuotesViewerSection quotes={allQuotes} metrics={metrics} />
            </div>
          </AccordionSection>
        )}

        {/* 4b · Líneas / productos más vendidos */}
        {isAdmin && allQuotes.length > 0 && (
          <AccordionSection icon={Package} title="Venta por Líneas / Productos" subtitle={`Top productos cotizados · últimos ${currentPeriod.days} días`} accent="#7c3aed" defaultOpen={false}>
            <div style={{ padding:'20px' }}>
              <ProductLinesSection quotes={allQuotes} sinceDate={A.since} />
            </div>
          </AccordionSection>
        )}

        {/* 4c · Análisis de clientes */}
        {isAdmin && clients.length > 0 && (
          <AccordionSection icon={UserCheck} title="Análisis de Clientes" subtitle={`${clients.length} clientes en cartera · nuevos, recuperados y top por valor`} accent="#059669" badge={clients.length} defaultOpen={false}>
            <div style={{ padding:'20px' }}>
              <ClientInsightsSection clients={clients} deals={deals} quotes={allQuotes} sinceDate={A.since} colors={SELLER_COLORS} />
            </div>
          </AccordionSection>
        )}

        {/* 5 · Razones de cierre */}
        {closedDeals.length > 0 && (
          <AccordionSection icon={TrendingDown} title="Razones de Cierre" subtitle={`${closedDeals.length} tratos cerrados con razón registrada`} accent="#dc2626" badge={closedDeals.length} defaultOpen={false}>
            <div style={{ padding:'20px' }}>
              <CloseReasonsSection deals={closedDeals} colors={SELLER_COLORS} />
            </div>
          </AccordionSection>
        )}

        {/* 6 · Registro de actividades */}
        {activities.length > 0 && (
          <AccordionSection icon={Activity} title="Registro de Actividades" subtitle={`${activities.length} actividades · historial completo`} accent="#b45309" badge={activities.length} defaultOpen={false}>
            <div style={{ padding:'20px' }}>
              <GlobalActivitiesTimeline activities={activities} deals={deals} metrics={metrics} />
            </div>
          </AccordionSection>
        )}

      </div>

      {/* Modal detalle vendedor */}
      {sellerModal && (
        <SellerDetailModal
          data={sellerModal.data}
          color={sellerModal.color}
          rank={sellerModal.rank}
          allDeals={deals}
          allActivities={activities}
          allQuotes={allQuotes}
          period={currentPeriod}
          onClose={() => setSellerModal(null)}
        />
      )}

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VISUALIZADOR DE COTIZACIONES (admin)
// ══════════════════════════════════════════════════════════════════════════════
function QuotesViewerSection({ quotes, metrics }) {
  const [filterSeller, setFilterSeller] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState(null);

  const fmtMXN  = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const sellers = metrics.map(m => m.seller);

  const filtered = quotes.filter(q => {
    if (filterSeller && q.sellerId !== filterSeller && q.creatorId !== filterSeller) return false;
    if (filterStatus && q.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !q.quoteNumber?.toLowerCase().includes(s) &&
        !q.client?.companyName?.toLowerCase().includes(s) &&
        !q.projectName?.toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  // ── Resumen de cotizaciones AUTORIZADAS (aprobadas / ganadas) ──────────────
  const acceptedQuotes = quotes.filter(q => q.status === 'ACCEPTED');
  const totalAccepted  = acceptedQuotes.reduce((s, q) => s + (q.total || 0), 0);
  const perSellerAccepted = sellers
    .map(s => {
      const sq = acceptedQuotes.filter(q => q.sellerId === s.id || q.creatorId === s.id);
      return { seller: s, count: sq.length, sum: sq.reduce((a, q) => a + (q.total || 0), 0) };
    })
    .filter(x => x.count > 0)
    .sort((a, b) => b.sum - a.sum);

  return (
    <section className="space-y-4">
      <SectionHeader
        icon={Eye}
        title="Cotizaciones"
        subtitle={`${filtered.length} cotizaciones · haz clic para ver detalle`}
        accent="#0284c7"
        extra={
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <input
              style={{ background:'#f8fafc', borderRadius:10, padding:'6px 12px', fontWeight:700, fontSize:11, color:'#334155', outline:'none', border:'1px solid #e2e8f0', minWidth:160 }}
              placeholder="Buscar folio / cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select style={{ background:'#f8fafc', borderRadius:10, padding:'6px 12px', fontWeight:700, fontSize:11, color:'#334155', outline:'none', cursor:'pointer', border:'1px solid #e2e8f0' }}
              value={filterSeller} onChange={e => setFilterSeller(e.target.value)}>
              <option value="">Todos los vendedores</option>
              {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select style={{ background:'#f8fafc', borderRadius:10, padding:'6px 12px', fontWeight:700, fontSize:11, color:'#334155', outline:'none', cursor:'pointer', border:'1px solid #e2e8f0' }}
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(QUOTE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        }
      />

      {/* Resumen de cotizaciones autorizadas */}
      {acceptedQuotes.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background:'linear-gradient(135deg,#065f46,#0f172a)' }}>
            <p style={{ fontSize:8, fontWeight:900, color:'#6ee7b7', textTransform:'uppercase', letterSpacing:'0.14em' }}>Total Autorizado</p>
            <p style={{ fontSize:28, fontWeight:900, marginTop:6, fontFamily:'monospace', letterSpacing:'-0.02em', lineHeight:1 }}>{fmtMXN(totalAccepted)}</p>
            <p style={{ fontSize:10, color:'#94a3b8', fontWeight:700, marginTop:6 }}>
              {acceptedQuotes.length} cotización{acceptedQuotes.length !== 1 ? 'es' : ''} autorizada{acceptedQuotes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-2 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Autorizado por vendedor</p>
            {perSellerAccepted.length === 0 ? (
              <p className="text-[11px] font-bold text-slate-300 py-2">Sin autorizadas asignadas a un vendedor.</p>
            ) : (
              <div className="space-y-2">
                {perSellerAccepted.map(({ seller, count, sum }) => (
                  <div key={seller.id} className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                      {seller.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                    <span className="text-xs font-bold text-slate-700 flex-1 truncate">{seller.name}</span>
                    <span className="text-[10px] font-black text-slate-400 shrink-0">{count} cot.</span>
                    <span className="text-sm font-black text-emerald-600 font-mono shrink-0">{fmtMXN(sum)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={D.card}>
        <CardAccent color="#0284c7" />
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div style={{ padding:'48px 24px', textAlign:'center', color:'#94a3b8' }}>
              <FileText style={{ width:32, height:32, margin:'0 auto 8px', opacity:0.3 }} />
              <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em' }}>Sin cotizaciones</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'2px solid #f1f5f9' }}>
                  {['Folio','Fecha','Cliente','Proyecto','Vendedor','Items','Total','Estado',''].map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:8, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => {
                  const st = QUOTE_STATUS[q.status] || QUOTE_STATUS.PENDING;
                  const StIcon = st.icon;
                  const items = Array.isArray(q.items) ? q.items : [];
                  return (
                    <tr key={q.id} style={{ borderBottom:'1px solid #f8fafc', cursor:'pointer', transition:'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => setSelected(q)}
                    >
                      <td style={{ padding:'12px 16px', fontFamily:'monospace', fontWeight:900, fontSize:11, color:'#1d4ed8', whiteSpace:'nowrap' }}>{q.quoteNumber}</td>
                      <td style={{ padding:'12px 16px', fontSize:11, fontWeight:700, color:'#64748b', whiteSpace:'nowrap' }}>{fmtDate(q.createdAt)}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <p style={{ fontSize:12, fontWeight:800, color:'#0f172a' }}>{q.client?.companyName || '—'}</p>
                        {q.contactName && <p style={{ fontSize:9, fontWeight:600, color:'#94a3b8' }}>{q.contactName}</p>}
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:11, fontWeight:700, color:'#334155', maxWidth:180 }}>
                        <span style={{ display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{q.projectName || '—'}</span>
                      </td>
                      <td style={{ padding:'12px 16px', fontSize:11, fontWeight:700, color:'#334155', whiteSpace:'nowrap' }}>
                        {sellers.find(s => s.id === q.sellerId || s.id === q.creatorId)?.name?.split(' ')[0] || '—'}
                      </td>
                      <td style={{ padding:'12px 16px', textAlign:'center' }}>
                        <span style={{ fontWeight:900, fontSize:13, color:'#0f172a' }}>{items.length}</span>
                      </td>
                      <td style={{ padding:'12px 16px', fontWeight:900, fontSize:13, color:'#0f172a', whiteSpace:'nowrap' }}>{fmtMXN(q.total)}</td>
                      <td style={{ padding:'12px 16px', whiteSpace:'nowrap' }}>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:4, background: st.bg, color: st.color, padding:'4px 10px', borderRadius:8, fontSize:8, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                          <StIcon style={{ width:10, height:10 }} /> {st.label}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <Eye style={{ width:14, height:14, color:'#94a3b8' }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal de detalle */}
      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={() => setSelected(null)}>
          <div style={{ background:'#fff', borderRadius:24, boxShadow:'0 40px 80px rgba(0,0,0,0.3)', width:'100%', maxWidth:760, maxHeight:'90vh', overflow:'auto' }}
            onClick={e => e.stopPropagation()}>
            {/* Header modal */}
            <div style={{ padding:'20px 24px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <p style={{ fontFamily:'monospace', fontWeight:900, fontSize:16, color:'#1d4ed8' }}>{selected.quoteNumber}</p>
                <p style={{ fontSize:9, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginTop:2 }}>
                  {fmtDate(selected.createdAt)} · {selected.client?.companyName}
                </p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                {(() => { const st = QUOTE_STATUS[selected.status] || QUOTE_STATUS.PENDING; const Icon = st.icon; return (
                  <span style={{ display:'inline-flex', alignItems:'center', gap:5, background: st.bg, color: st.color, padding:'6px 14px', borderRadius:10, fontSize:9, fontWeight:800, textTransform:'uppercase' }}>
                    <Icon style={{ width:12, height:12 }} /> {st.label}
                  </span>
                ); })()}
                <button onClick={() => setSelected(null)} style={{ padding:8, borderRadius:'50%', border:'none', background:'#f1f5f9', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <XCircle style={{ width:18, height:18, color:'#64748b' }} />
                </button>
              </div>
            </div>

            {/* Datos cliente + proyecto */}
            <div style={{ padding:'16px 24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ background:'#f8fafc', borderRadius:12, padding:'12px 16px' }}>
                <p style={{ fontSize:8, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Cliente</p>
                <p style={{ fontWeight:900, color:'#0f172a', fontSize:13 }}>{selected.client?.companyName || '—'}</p>
                {selected.contactName && <p style={{ fontSize:11, fontWeight:700, color:'#64748b', marginTop:2 }}>{selected.contactName}</p>}
              </div>
              <div style={{ background:'#f8fafc', borderRadius:12, padding:'12px 16px' }}>
                <p style={{ fontSize:8, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Proyecto</p>
                <p style={{ fontWeight:800, color:'#0f172a', fontSize:12 }}>{selected.projectName || '—'}</p>
                <p style={{ fontSize:10, fontWeight:600, color:'#94a3b8', marginTop:2 }}>Fase: {selected.projectPhase || '—'} · Vigente: {fmtDate(selected.validUntil)}</p>
              </div>
            </div>

            {/* Tabla de items */}
            <div style={{ padding:'0 24px 16px' }}>
              <p style={{ fontSize:8, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Conceptos</p>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['#','SKU','Concepto','Cant.','P. Unit.','Total'].map(h => (
                      <th key={h} style={{ padding:'8px 10px', textAlign: h === 'Total' || h === 'Cant.' || h === 'P. Unit.' ? 'right' : 'left', fontSize:8, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(selected.items) ? selected.items : []).map((item, i) => (
                    <tr key={i} style={{ borderTop:'1px solid #f1f5f9' }}>
                      <td style={{ padding:'8px 10px', fontWeight:800, color:'#94a3b8', fontSize:10 }}>{i + 1}</td>
                      <td style={{ padding:'8px 10px', fontFamily:'monospace', fontWeight:700, color:'#1d4ed8', fontSize:10 }}>{item.serial || '—'}</td>
                      <td style={{ padding:'8px 10px', maxWidth:260 }}>
                        <p style={{ fontWeight:800, color:'#0f172a' }}>{item.name}</p>
                        {item.desc && <p style={{ fontSize:9, color:'#94a3b8', fontWeight:600, marginTop:2 }}>{item.desc}</p>}
                      </td>
                      <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:800, color:'#334155' }}>{item.qty}</td>
                      <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:700, color:'#334155' }}>{fmtMXN(item.price)}</td>
                      <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:900, color:'#0f172a' }}>{fmtMXN(Number(item.qty) * Number(item.price))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div style={{ padding:'12px 24px 24px', display:'flex', justifyContent:'flex-end' }}>
              <div style={{ background:'#0f172a', borderRadius:16, padding:'16px 24px', minWidth:220, color:'white' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:10, fontWeight:700, opacity:0.5 }}>Subtotal</span>
                  <span style={{ fontSize:11, fontWeight:800 }}>{fmtMXN(selected.subtotal)}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                  <span style={{ fontSize:10, fontWeight:700, opacity:0.5 }}>IVA (16%)</span>
                  <span style={{ fontSize:11, fontWeight:800 }}>{fmtMXN(selected.tax)}</span>
                </div>
                <div style={{ borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:12, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, fontWeight:900, color:'#60a5fa', textTransform:'uppercase' }}>Total</span>
                  <span style={{ fontSize:22, fontWeight:900 }}>{fmtMXN(selected.total)}</span>
                </div>
              </div>
            </div>

            {selected.terms && (
              <div style={{ padding:'0 24px 20px' }}>
                <p style={{ fontSize:8, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Términos y condiciones</p>
                <p style={{ fontSize:10, color:'#64748b', fontWeight:600, lineHeight:1.6 }}>{selected.terms}</p>
              </div>
            )}
          </div>
        </div>
      )}
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
    ...deals.flatMap(d => (new Date(d.createdAt || d.updatedAt) >= sinceDate && d.clientId) ? [d.clientId] : []),
    ...quotes.flatMap(q => (new Date(q.createdAt) >= sinceDate && q.clientId) ? [q.clientId] : []),
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
                      <span style={{ fontSize:8, fontWeight:700, color:'#8b5cf6' }}>◈ {fmt(tc.pipeline)} embudo</span>
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
  { key: 'QUALIFICATION',            label: 'Lead / Prospecto',          prob: 10,  color: 'bg-slate-400',   text: 'text-slate-600',   bg: 'bg-slate-50'   },
  { key: 'NEEDS_ANALYSIS',           label: 'Acercamiento',              prob: 20,  color: 'bg-blue-400',    text: 'text-blue-600',    bg: 'bg-blue-50'    },
  { key: 'VALUE_PROPOSITION',        label: 'Contacto Decisor',          prob: 30,  color: 'bg-indigo-500',  text: 'text-indigo-600',  bg: 'bg-indigo-50'  },
  { key: 'IDENTIFY_DECISION_MAKERS', label: 'Oportunidad',               prob: 40,  color: 'bg-violet-500',  text: 'text-violet-600',  bg: 'bg-violet-50'  },
  { key: 'PROPOSAL_PRICE_QUOTE',     label: 'Levantamiento',             prob: 50,  color: 'bg-amber-500',   text: 'text-amber-700',   bg: 'bg-amber-50'   },
  { key: 'PROPOSAL_SENT',            label: 'Cotización Enviada',        prob: 65,  color: 'bg-orange-500',  text: 'text-orange-700',  bg: 'bg-orange-50'  },
  { key: 'NEGOTIATION_1',            label: 'Negociación 1',             prob: 75,  color: 'bg-purple-500',  text: 'text-purple-600',  bg: 'bg-purple-50'  },
  { key: 'RECOTIZACION',             label: 'Recotización',              prob: 80,  color: 'bg-pink-500',    text: 'text-pink-600',    bg: 'bg-pink-50'    },
  { key: 'NEGOTIATION_2',            label: 'Negociación 2',             prob: 90,  color: 'bg-rose-500',    text: 'text-rose-600',    bg: 'bg-rose-50'    },
  { key: 'CLOSED_WON_PENDING',       label: 'En espera autorización',    prob: 95,  color: 'bg-yellow-500',  text: 'text-yellow-700',  bg: 'bg-yellow-50'  },
  { key: 'CLOSED_WON',               label: 'Ganado',                    prob: 100, color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  { key: 'CLOSED_LOST',              label: 'Perdido',                   prob: 0,   color: 'bg-red-500',     text: 'text-red-600',     bg: 'bg-red-50'     },
];

function PipelineKanbanReadOnly({ deals, metrics, colors, onDealClick }) {
  const [filterSeller, setFilterSeller] = useState('');
  const [search, setSearch] = useState('');
  const sellers = metrics.map(m => m.seller);

  const filtered = deals.filter(d => {
    if (filterSeller && d.assignedTo?.id !== filterSeller) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!d.title?.toLowerCase().includes(s) && !d.company?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const stageMap = {};
  KANBAN_STAGES.forEach(s => { stageMap[s.key] = []; });
  filtered.forEach(d => {
    if (stageMap[d.stage]) stageMap[d.stage].push(d);
    else stageMap['QUALIFICATION'].push(d);
  });

  const totalPipeline = deals.filter(d => d.stage !== 'CLOSED_LOST').reduce((s, d) => s + (d.value || 0), 0);
  const totalWon      = deals.filter(d => d.stage === 'CLOSED_WON').reduce((s, d) => s + (d.value || 0), 0);
  const totalActive   = deals.filter(d => !['CLOSED_WON','CLOSED_LOST'].includes(d.stage)).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutGrid className="h-4 w-4 text-violet-600" />
              <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">Embudo</h3>
              <span className="text-[8px] font-black bg-violet-100 text-violet-700 px-2 py-0.5 rounded-lg uppercase tracking-widest">{totalActive} activos</span>
            </div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
              Tratos / Oportunidades · Clic en trato para ver detalle
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* KPIs mini */}
            <div className="flex gap-2">
              {[
                { label:'Embudo', value: fmt(totalPipeline), color:'text-blue-600', bg:'bg-blue-50' },
                { label:'Ganado',   value: fmt(totalWon),      color:'text-emerald-600', bg:'bg-emerald-50' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={cn('flex flex-col px-3 py-1.5 rounded-xl', bg)}>
                  <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
                  <span className={cn('text-xs font-black', color)}>{value}</span>
                </div>
              ))}
            </div>
            {/* Buscar */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                type="text"
                placeholder="Buscar trato..."
                className="bg-transparent border-none outline-none font-bold text-[11px] text-gray-900 w-28"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {/* Filtro vendedor */}
            {sellers.length > 1 && (
              <select
                className="bg-gray-50 rounded-xl px-3 py-2 font-black text-[10px] uppercase text-gray-600 outline-none border border-gray-100 cursor-pointer"
                value={filterSeller}
                onChange={e => setFilterSeller(e.target.value)}
              >
                <option value="">Todos los vendedores</option>
                {sellers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ── Board ── */}
      <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 580 }}>
        <div className="flex gap-3 p-4 min-w-max" style={{ minHeight: 520 }}>
          {KANBAN_STAGES.map((stage) => {
            const stageDeals = stageMap[stage.key] || [];
            const stageValue = stageDeals.reduce((s, d) => s + (d.value || 0), 0);

            return (
              <div
                key={stage.key}
                className={cn('w-56 flex flex-col flex-shrink-0 rounded-3xl', stage.bg)}
              >
                {/* Cabecera columna */}
                <div className="p-3 space-y-1 sticky top-0 bg-white/80 backdrop-blur-sm rounded-t-3xl border-b border-black/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', stage.color)} />
                      <span className="text-[8px] font-black text-gray-800 uppercase tracking-wider leading-tight">{stage.label}</span>
                    </div>
                    <span className="text-[8px] font-black bg-white rounded-lg px-2 py-0.5 text-gray-500 shadow-sm">{stageDeals.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={cn('text-[8px] font-bold', stage.text)}>{stage.prob}% prob.</span>
                    <span className="text-[8px] font-black text-gray-700">{stageValue > 0 ? fmt(stageValue) : '—'}</span>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ minHeight: 200 }}>
                  {stageDeals.map(deal => {
                    const daysUntil = deal.expectedClose
                      ? Math.ceil((new Date(deal.expectedClose) - Date.now()) / 86400000)
                      : null;
                    const closeColor = daysUntil === null ? null
                      : daysUntil < 0  ? 'text-red-500'
                      : daysUntil <= 7 ? 'text-amber-500'
                      : 'text-emerald-600';
                    const prob = deal.probability ?? stage.prob ?? 0;

                    return (
                      <div
                        key={deal.id}
                        onClick={() => onDealClick?.(deal.id)}
                        className="bg-white rounded-2xl border border-gray-100 cursor-pointer transition-all hover:shadow-lg hover:border-gray-200 group overflow-hidden"
                      >
                        <div className={cn('h-1 w-full', stage.color)} />
                        <div className="p-3 space-y-2">
                          <p className="text-[11px] font-black text-gray-900 leading-tight line-clamp-2">{deal.title}</p>
                          {deal.company && (
                            <p className="text-[8px] font-bold text-gray-500 flex items-center gap-1 truncate">
                              <Building2 className="h-2.5 w-2.5 flex-shrink-0 text-gray-400" />
                              {deal.company}
                            </p>
                          )}
                          <div className="pt-1.5 border-t border-gray-50 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className={cn('text-sm font-black', stage.text)}>{fmt(deal.value)}</span>
                              <span className="text-[9px] font-black text-gray-500">{prob}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full', stage.color)} style={{ width: `${prob}%` }} />
                            </div>
                          </div>
                          {deal.expectedClose && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-2.5 w-2.5 text-gray-300 flex-shrink-0" />
                              <span className={cn('text-[8px] font-black', closeColor || 'text-gray-400')}>
                                {fmtDate(deal.expectedClose)}
                              </span>
                              {daysUntil !== null && (
                                <span className={cn('text-[7px] font-bold', closeColor)}>
                                  {daysUntil < 0 ? `(vencido ${Math.abs(daysUntil)}d)` : daysUntil === 0 ? '(hoy)' : `(${daysUntil}d)`}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                            {deal.assignedTo ? (
                              <div className="flex items-center gap-1.5">
                                <div className={cn('h-5 w-5 rounded-full flex items-center justify-center text-[7px] font-black text-white flex-shrink-0', stage.color)}>
                                  {deal.assignedTo.name.charAt(0)}
                                </div>
                                <span className="text-[8px] font-bold text-gray-400 truncate max-w-[70px]">
                                  {deal.assignedTo.name.split(' ')[0]}
                                </span>
                              </div>
                            ) : <span />}
                            {deal._count?.activities > 0 && (
                              <span className="text-[7px] font-black text-gray-400 flex items-center gap-0.5 bg-gray-50 px-1.5 py-0.5 rounded-lg">
                                <MessageSquare className="h-2 w-2" />
                                {deal._count.activities}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {stageDeals.length === 0 && (
                    <div className="h-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-black/10">
                      <p className="text-[7px] font-black text-gray-300 uppercase tracking-widest">Sin tratos</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// TIMELINE GLOBAL DE ACTIVIDADES
// ══════════════════════════════════════════════════════════════════════════════
const ACT_TYPE_META = {
  NOTE:         { label:'Nota',         color:'#64748b', bg:'#f1f5f9', icon: MessageSquare },
  CALL:         { label:'Llamada',      color:'#3b82f6', bg:'#eff6ff', icon: PhoneCall },
  EMAIL:        { label:'Email',        color:'#8b5cf6', bg:'#f5f3ff', icon: Send },
  MEETING:      { label:'Reunión',      color:'#f59e0b', bg:'#fffbeb', icon: Coffee },
  TASK:         { label:'Tarea',        color:'#10b981', bg:'#ecfdf5', icon: CheckCircle2 },
  SEGUIMIENTO:  { label:'Seguimiento',  color:'#1d4ed8', bg:'#eff6ff', icon: ClipboardList },
  STAGE_CHANGE: { label:'Etapa',        color:'#6366f1', bg:'#eef2ff', icon: ArrowRight },
};

function GlobalActivitiesTimeline({ activities, deals, metrics }) {
  const [filterType,   setFilterType]   = useState('');
  const [filterSeller, setFilterSeller] = useState('');
  const [filterDeal,   setFilterDeal]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expanded,     setExpanded]     = useState(null);

  const now = new Date();
  const sellers = metrics.map(m => m.seller);

  // Tratos únicos que tienen actividades
  const dealsWithActs = [...new Map(
    activities.filter(a => a.deal?.id).map(a => [a.deal.id, a.deal])
  ).values()];

  const filtered = activities.filter(a => {
    if (filterType   && a.type !== filterType) return false;
    if (filterSeller && a.deal?.assignedTo?.id !== filterSeller) return false;
    if (filterDeal   && a.deal?.id !== filterDeal) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const fmtDate = (d) => d ? new Date(d).toLocaleString('es-MX', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
  const isOverdue = (a) => a.dueDate && new Date(a.dueDate) < now && a.status !== 'COMPLETED';

  return (
    <section className="space-y-4">
      <SectionHeader icon={Activity} title="Timeline de Actividades" subtitle={`${filtered.length} de ${activities.length} actividades · historial global por trato`} accent="#b45309" />

      <div className={D.card}>
        <CardAccent color="#b45309" />

        {/* Filtros */}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'14px 20px', borderBottom:'1px solid #f1f5f9' }}>
          {/* Vendedor */}
          <select style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'6px 10px', fontSize:10, fontWeight:700, color:'#334155', outline:'none', cursor:'pointer' }}
            value={filterSeller} onChange={e => setFilterSeller(e.target.value)}>
            <option value="">Todos los vendedores</option>
            {sellers.map(s => <option key={s.id} value={s.id}>{s.name.split(' ')[0]}</option>)}
          </select>

          {/* Trato */}
          {dealsWithActs.length > 0 && (
            <select style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'6px 10px', fontSize:10, fontWeight:700, color:'#334155', outline:'none', cursor:'pointer', maxWidth:200 }}
              value={filterDeal} onChange={e => setFilterDeal(e.target.value)}>
              <option value="">Todos los tratos</option>
              {dealsWithActs.map(d => <option key={d.id} value={d.id}>{d.title}{d.company ? ` · ${d.company}` : ''}</option>)}
            </select>
          )}

          {/* Tipo */}
          <select style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'6px 10px', fontSize:10, fontWeight:700, color:'#334155', outline:'none', cursor:'pointer' }}
            value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(ACT_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          {/* Estado */}
          <select style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'6px 10px', fontSize:10, fontWeight:700, color:'#334155', outline:'none', cursor:'pointer' }}
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="IN_PROGRESS">En progreso</option>
            <option value="COMPLETED">Completada</option>
          </select>

          <span style={{ marginLeft:'auto', alignSelf:'center', fontSize:9, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Timeline */}
        {filtered.length === 0 ? (
          <div style={{ padding:'48px 24px', textAlign:'center', color:'#94a3b8' }}>
            <Activity style={{ width:32, height:32, margin:'0 auto 8px', opacity:0.3 }} />
            <p style={{ fontSize:10, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.08em' }}>Sin actividades</p>
          </div>
        ) : (
          <div style={{ maxHeight:520, overflowY:'auto', padding:'8px 20px 20px' }}>
            {/* Agrupar por fecha */}
            {(() => {
              const groups = {};
              filtered.forEach(a => {
                const key = new Date(a.createdAt).toLocaleDateString('es-MX', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
                if (!groups[key]) groups[key] = [];
                groups[key].push(a);
              });
              return Object.entries(groups).map(([fecha, acts]) => (
                <div key={fecha}>
                  {/* Separador de fecha */}
                  <div style={{ display:'flex', alignItems:'center', gap:10, margin:'16px 0 10px' }}>
                    <div style={{ flex:1, height:1, background:'#f1f5f9' }} />
                    <span style={{ fontSize:8, fontWeight:900, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', whiteSpace:'nowrap', padding:'0 4px', background:'#fff' }}>{fecha}</span>
                    <div style={{ flex:1, height:1, background:'#f1f5f9' }} />
                  </div>
                  {/* Items del día */}
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {acts.map(a => {
                      const meta = ACT_TYPE_META[a.type] || ACT_TYPE_META.NOTE;
                      const Icon = meta.icon;
                      const overdue = isOverdue(a);
                      const isExpanded = expanded === a.id;
                      const sellerName = sellers.find(s => s.id === a.deal?.assignedTo?.id)?.name || a.authorName || '—';
                      return (
                        <div key={a.id}
                          onClick={() => setExpanded(isExpanded ? null : a.id)}
                          style={{
                            display:'flex', gap:12, padding:'10px 14px', borderRadius:12, cursor:'pointer',
                            background: overdue ? '#fff5f5' : '#fafafa',
                            border: overdue ? '1px solid #fecaca' : '1px solid #f1f5f9',
                            transition:'all 0.15s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = overdue ? '#fee2e2' : '#f1f5f9'}
                          onMouseLeave={e => e.currentTarget.style.background = overdue ? '#fff5f5' : '#fafafa'}
                        >
                          {/* Ícono tipo */}
                          <div style={{ width:32, height:32, borderRadius:10, background: overdue ? '#fee2e2' : meta.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                            <Icon style={{ width:13, height:13, color: overdue ? '#dc2626' : meta.color }} />
                          </div>

                          {/* Contenido */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                              {/* Badge tipo */}
                              <span style={{ fontSize:8, fontWeight:900, padding:'2px 8px', borderRadius:6, background: overdue ? '#fecaca' : meta.bg, color: overdue ? '#dc2626' : meta.color, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                                {overdue ? '⚠ VENCIDA' : meta.label}
                              </span>
                              {/* Trato */}
                              {a.deal?.title && (
                                <span style={{ fontSize:10, fontWeight:800, color:'#1d4ed8' }}>
                                  {a.deal.title}{a.deal.company ? ` · ${a.deal.company}` : ''}
                                </span>
                              )}
                              {/* Vendedor */}
                              <span style={{ fontSize:9, fontWeight:700, color:'#94a3b8', marginLeft:'auto' }}>{sellerName.split(' ')[0]}</span>
                            </div>

                            {/* Contenido/título */}
                            <p style={{ fontSize:11, fontWeight:600, color:'#334155', marginTop:4, lineHeight:1.4,
                              ...(isExpanded ? {} : { display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical', overflow:'hidden' })
                            }}>
                              {a.title || a.content || '—'}
                            </p>

                            {/* Expandido: descripción + fechas */}
                            {isExpanded && (
                              <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid #f1f5f9' }}>
                                {a.content && a.title && (
                                  <p style={{ fontSize:11, color:'#64748b', lineHeight:1.5, marginBottom:8 }}>{a.content}</p>
                                )}
                                <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                                  <div>
                                    <span style={{ fontSize:8, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>Creado</span>
                                    <p style={{ fontSize:10, fontWeight:700, color:'#475569', marginTop:2 }}>{fmtDate(a.createdAt)}</p>
                                  </div>
                                  {a.dueDate && (
                                    <div>
                                      <span style={{ fontSize:8, fontWeight:800, color: overdue ? '#dc2626' : '#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>Vencimiento</span>
                                      <p style={{ fontSize:10, fontWeight:700, color: overdue ? '#dc2626' : '#475569', marginTop:2 }}>{fmtDate(a.dueDate)}</p>
                                    </div>
                                  )}
                                  <div>
                                    <span style={{ fontSize:8, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>Estado</span>
                                    <p style={{ fontSize:10, fontWeight:800, marginTop:2,
                                      color: a.status === 'COMPLETED' ? '#059669' : a.status === 'IN_PROGRESS' ? '#f59e0b' : overdue ? '#dc2626' : '#64748b'
                                    }}>
                                      {a.status === 'COMPLETED' ? 'Completada' : a.status === 'IN_PROGRESS' ? 'En progreso' : overdue ? 'Vencida' : 'Pendiente'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Hora */}
                          <div style={{ flexShrink:0, textAlign:'right' }}>
                            <span style={{ fontSize:9, fontWeight:700, color:'#94a3b8' }}>
                              {a.createdAt ? new Date(a.createdAt).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' }) : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
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
                {/* Header: estado + vendedor */}
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
                    </div>
                    <p className="font-black text-gray-900 text-sm leading-tight">{deal.title}</p>
                    {deal.company && <p className="text-[10px] font-bold text-gray-500 mt-0.5">{deal.company}</p>}
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

                {/* Datos del trato */}
                <div style={{ background:'#f8fafc', borderRadius:12, padding:'10px 14px', display:'flex', flexDirection:'column', gap:6 }}>
                  <p style={{ fontSize:9, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.07em' }}>Datos del trato</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px' }}>
                    <div>
                      <p style={{ fontSize:8, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>Valor</p>
                      <p style={{ fontSize:12, fontWeight:900, color: isWon ? '#059669' : '#dc2626' }}>{fmt(deal.value)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize:8, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>Probabilidad</p>
                      <p style={{ fontSize:12, fontWeight:900, color:'#334155' }}>{deal.probability ?? 0}%</p>
                    </div>
                    {deal.contactName && (
                      <div style={{ gridColumn:'1 / -1' }}>
                        <p style={{ fontSize:8, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>Contacto</p>
                        <p style={{ fontSize:11, fontWeight:700, color:'#334155' }}>{deal.contactName}</p>
                      </div>
                    )}
                    {deal.source && (
                      <div>
                        <p style={{ fontSize:8, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>Fuente</p>
                        <p style={{ fontSize:11, fontWeight:700, color:'#334155' }}>{deal.source}</p>
                      </div>
                    )}
                    {deal.expectedClose && (
                      <div>
                        <p style={{ fontSize:8, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>Cierre esperado</p>
                        <p style={{ fontSize:11, fontWeight:700, color:'#334155' }}>{new Date(deal.expectedClose).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })}</p>
                      </div>
                    )}
                    {deal.updatedAt && (
                      <div>
                        <p style={{ fontSize:8, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em' }}>Fecha cierre</p>
                        <p style={{ fontSize:11, fontWeight:700, color:'#334155' }}>{new Date(deal.updatedAt).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Razón de cierre */}
                <div style={{
                  background: deal.closeReason ? (isWon ? '#f0fdf4' : '#fff1f2') : '#f8fafc',
                  borderRadius:14, padding:'10px 14px',
                  borderLeft: `3px solid ${deal.closeReason ? (isWon ? '#10b981' : '#ef4444') : '#cbd5e1'}`,
                }}>
                  <p style={{ fontSize:9, fontWeight:800, color: deal.closeReason ? (isWon ? '#059669' : '#dc2626') : '#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>
                    {isWon ? 'Motivo del cierre exitoso' : 'Motivo de pérdida'}
                  </p>
                  {deal.closeReason
                    ? <p style={{ fontSize:12, fontWeight:600, color:'#374151', lineHeight:1.5 }}>{deal.closeReason}</p>
                    : <p style={{ fontSize:11, fontWeight:600, color:'#94a3b8', fontStyle:'italic' }}>Sin motivo registrado</p>
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
