import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, PhoneCall, Building2, Target, Handshake, Star, Award,
  Zap, Activity, CalendarDays, Mail, TrendingUp, MessageSquare,
  Percent, Users, Database, ChevronRight, ArrowUpRight,
  BarChart2, Layers, Flame,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, LabelList, ReferenceLine,
  AreaChart, Area,
} from 'recharts';
import { getBitacora, getReporte, getCartera, calcKPIs } from '@/api/ventasService';
import { cn } from '@/lib/utils';

// ── Paleta ────────────────────────────────────────────────────────────────────
const P = {
  blue:    { hex: '#3b82f6', light: '#eff6ff', dark: '#1d4ed8' },
  violet:  { hex: '#8b5cf6', light: '#f5f3ff', dark: '#6d28d9' },
  emerald: { hex: '#10b981', light: '#ecfdf5', dark: '#065f46' },
  amber:   { hex: '#f59e0b', light: '#fffbeb', dark: '#92400e' },
  rose:    { hex: '#f43f5e', light: '#fff1f2', dark: '#9f1239' },
  sky:     { hex: '#0ea5e9', light: '#f0f9ff', dark: '#075985' },
  teal:    { hex: '#14b8a6', light: '#f0fdfa', dark: '#134e4a' },
};
const PALS = Object.values(P).map(p => p.hex);

// ── Tooltip rico ───────────────────────────────────────────────────────────────
const RichTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const isM = (n) => n === 'Venta' || n?.includes('$');
  const isPct = (n) => n?.includes('%') || n?.includes('Efic') || n?.includes('Tasa') || n?.includes('Conversión');
  return (
    <div style={{
      background: 'rgba(15,23,42,0.97)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      padding: '12px 16px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      minWidth: 150,
    }}>
      <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 6 }}>
        {label}
      </p>
      {payload.map((e, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < payload.length - 1 ? 4 : 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
          <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>{e.name}:</span>
          <span style={{ color: '#f8fafc', fontSize: 11, fontWeight: 800 }}>
            {isM(e.name) ? `$${Number(e.value).toLocaleString('es-MX')}` : isPct(e.name) ? `${e.value}%` : e.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Defs SVG para gradientes en gráficas ──────────────────────────────────────
function GradientDefs() {
  return (
    <defs>
      <linearGradient id="gBlue"    x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#60a5fa" stopOpacity={1} />
        <stop offset="100%" stopColor="#2563eb" stopOpacity={0.85} />
      </linearGradient>
      <linearGradient id="gViolet"  x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#a78bfa" stopOpacity={1} />
        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.85} />
      </linearGradient>
      <linearGradient id="gEmerald" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#34d399" stopOpacity={1} />
        <stop offset="100%" stopColor="#059669" stopOpacity={0.85} />
      </linearGradient>
      <linearGradient id="gAmber"   x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#fbbf24" stopOpacity={1} />
        <stop offset="100%" stopColor="#d97706" stopOpacity={0.85} />
      </linearGradient>
      <linearGradient id="gRose"    x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#fb7185" stopOpacity={1} />
        <stop offset="100%" stopColor="#e11d48" stopOpacity={0.85} />
      </linearGradient>
      <linearGradient id="gSky"     x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#38bdf8" stopOpacity={1} />
        <stop offset="100%" stopColor="#0284c7" stopOpacity={0.85} />
      </linearGradient>
      <linearGradient id="gTeal"    x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#2dd4bf" stopOpacity={1} />
        <stop offset="100%" stopColor="#0d9488" stopOpacity={0.85} />
      </linearGradient>
      {/* Gradientes de área */}
      <linearGradient id="aBlue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#3b82f6" stopOpacity={0.3} />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="aEmerald" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#10b981" stopOpacity={0.3} />
        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="aRose" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor="#f43f5e" stopOpacity={0.25} />
        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

const GRAD_IDS = ['gBlue','gViolet','gEmerald','gAmber','gRose','gSky','gTeal'];

// ── Estilos de ejes compartidos ───────────────────────────────────────────────
const axisStyle = { fontSize: 10, fontWeight: 700, fill: '#64748b' };
const gridStyle = { strokeDasharray: '3 3', stroke: '#f1f5f9' };

// ── KPI Héroe ─────────────────────────────────────────────────────────────────
function HeroKPI({ icon: Icon, label, value, sub, gradient, glowColor }) {
  return (
    <div style={{
      background: gradient,
      borderRadius: 24,
      padding: '28px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow orb */}
      <div style={{
        position: 'absolute', top: -30, right: -30,
        width: 120, height: 120, borderRadius: '50%',
        background: glowColor, filter: 'blur(40px)', opacity: 0.5,
      }} />
      {/* Top circles deco */}
      <div style={{
        position: 'absolute', bottom: -20, left: '50%',
        width: 80, height: 80, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)',
      }} />
      <div className="relative space-y-4">
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: 20, height: 20, color: '#fff' }} />
        </div>
        <div>
          <p style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        </div>
        {sub && (
          <p style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
            background: 'rgba(255,255,255,0.1)', borderRadius: 20,
            padding: '3px 10px', display: 'inline-block',
          }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

// ── KPI Estándar con barra de progreso ────────────────────────────────────────
function StatCard({ label, value, sub, pct, icon: Icon, hex, lightBg, darkText }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div style={{
          width: 36, height: 36, borderRadius: 12,
          background: lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: 16, height: 16, color: hex }} />
        </div>
        {pct != null && (
          <span style={{
            fontSize: 10, fontWeight: 800, color: hex,
            background: lightBg, borderRadius: 20, padding: '2px 8px',
            letterSpacing: '0.04em',
          }}>
            {pct}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900 leading-none tracking-tight">{value}</p>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1.5 leading-tight">{label}</p>
      </div>
      {pct != null && (
        <div style={{ height: 4, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${Math.min(pct, 100)}%`,
            background: `linear-gradient(90deg, ${hex}, ${hex}cc)`,
            borderRadius: 999, transition: 'width 1s ease',
          }} />
        </div>
      )}
      {sub && !pct && (
        <p style={{
          fontSize: 10, fontWeight: 700, color: hex,
          background: lightBg, borderRadius: 20, padding: '2px 8px',
          display: 'inline-block', letterSpacing: '0.03em',
        }}>{sub}</p>
      )}
    </div>
  );
}

// ── Panel de sección con encabezado visual ────────────────────────────────────
function Section({ icon: Icon, hex, lightBg, title, subtitle, children, className = '' }) {
  return (
    <section className={cn('space-y-5', className)}>
      <div className="flex items-center gap-3">
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: lightBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon style={{ width: 17, height: 17, color: hex }} />
        </div>
        <div>
          <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">{title}</h3>
          {subtitle && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex-1 h-px ml-2" style={{ background: `linear-gradient(90deg, ${hex}30, transparent)` }} />
      </div>
      {children}
    </section>
  );
}

// ── Contenedor de gráfica ─────────────────────────────────────────────────────
function ChartCard({ title, subtitle, icon: Icon, hex, children, className = '' }) {
  return (
    <div className={cn('bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden', className)}>
      {/* Banda de color superior */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${hex}, ${hex}44)` }} />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Icon style={{ width: 14, height: 14, color: hex }} />
          <div>
            <h4 className="font-black text-gray-900 text-[11px] uppercase tracking-widest">{title}</h4>
            {subtitle && <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Stat rápido del resumen ───────────────────────────────────────────────────
function QuickStat({ label, value, unit, hex, lightBg, pct }) {
  return (
    <div style={{ background: lightBg, borderRadius: 16, padding: 16 }} className="space-y-2">
      <p style={{ fontSize: 26, fontWeight: 900, color: hex, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
      <p className="text-[9px] font-black text-gray-500 uppercase tracking-wider leading-tight">{label}</p>
      {pct != null ? (
        <>
          <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: hex, borderRadius: 999 }} />
          </div>
          <p className="text-[9px] font-bold text-gray-400 uppercase">{unit}</p>
        </>
      ) : (
        <p className="text-[9px] font-bold text-gray-400 uppercase">{unit}</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function SalesMetrics() {
  const [K, setK] = useState({});
  const [reporte, setReporte]   = useState([]);
  const [bitacora, setBitacora] = useState([]);
  const [cartera, setCartera]   = useState([]);

  const loadAll = useCallback(() => {
    const b = getBitacora(), r = getReporte(), c = getCartera();
    setBitacora(b); setReporte(r); setCartera(c);
    setK(calcKPIs(b, r, c));
  }, []);
  useEffect(() => { loadAll(); }, [loadAll]);

  const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

  // ── Datos para gráficas ────────────────────────────────────────────────────
  const funnelAbs = [
    { etapa: 'Llamadas',   valor: K.totalLlamadas    || 0 },
    { etapa: 'Efectivas',  valor: K.totalEfec        || 0 },
    { etapa: 'Visitas',    valor: K.totalVisitas     || 0 },
    { etapa: 'Decisor R',  valor: K.totalDecisorR    || 0 },
    { etapa: 'Decisor F',  valor: K.totalDecisorF    || 0 },
    { etapa: 'Cotizac.',   valor: K.totalCotizaciones|| 0 },
    { etapa: 'Cierres',    valor: K.totalCierres     || 0 },
  ];
  const funnelPct = [
    { etapa: 'Llam→Efec',  pct: K.convLlamadaEfec   || 0 },
    { etapa: 'Efec→Visit', pct: K.convEfecVisita     || 0 },
    { etapa: 'Visit→Dec',  pct: K.convVisitaDecisor  || 0 },
    { etapa: 'Dec→Cot',    pct: K.convDecisorCot     || 0 },
    { etapa: 'Cot→Cierre', pct: K.convCotCierre      || 0 },
  ];
  const ejData    = K.porEjecutivo || [];
  const semData   = K.porSemana   || [];
  const diaData   = K.porDia      || [];
  const canalData = [
    { canal: 'Correos',   total: K.totalCorreos        || 0 },
    { canal: 'Mensajes',  total: K.totalMensajes       || 0 },
    { canal: 'Decisor R', total: K.totalDecisorR       || 0 },
    { canal: 'Cotizac.',  total: K.totalCotizaciones   || 0 },
  ];
  const carteraChart = [
    { tipo: 'Prospectos', val: K.prospectos        || 0 },
    { tipo: 'Clientes',   val: K.clientes          || 0 },
    { tipo: 'Con Decisor',val: K.carteraConDecisor || 0 },
  ];
  const actReporte = reporte.slice(-10).map(r => ({
    label: `${r.dia?.slice(0,3) || ''} ${r.semana?.slice(5,10) || ''}`.trim(),
    Llamadas: r.llamadas, Efectivas: r.efec, Visitas: r.visitas,
  }));

  const noData = (h = 180) => (
    <div style={{ height: h, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <BarChart2 style={{ width: 24, height: 24, color: '#cbd5e1' }} />
      <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Sin datos suficientes
      </p>
    </div>
  );

  return (
    <div className="space-y-10 pb-12 animate-in fade-in duration-500">

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* HERO HEADER                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0c1a35 100%)',
        borderRadius: 28,
        padding: '32px 32px 36px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Orbes decorativos */}
        <div style={{ position:'absolute', top:-60, right:-40, width:240, height:240, borderRadius:'50%', background:'radial-gradient(circle, #3b82f640, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-80, left:'30%', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, #8b5cf620, transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'50%', left:-60, transform:'translateY(-50%)', width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle, #10b98115, transparent 70%)', pointerEvents:'none' }} />

        <div className="relative">
          {/* Fila superior: título + botón */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-8">
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <div style={{ height:2, width:28, background:'#3b82f6', borderRadius:999 }} />
                <span style={{ fontSize:10, fontWeight:800, color:'#60a5fa', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                  Panel Comercial
                </span>
              </div>
              <h2 style={{ fontSize:36, fontWeight:900, color:'#f8fafc', lineHeight:1.05, letterSpacing:'-0.025em', margin:0 }}>
                Métricas<br />
                <span style={{ color:'#60a5fa' }}>de Ventas</span>
              </h2>
              <p style={{ fontSize:12, color:'#94a3b8', fontWeight:600, marginTop:10 }}>
                {reporte.length} registros · {bitacora.length} visitas · {cartera.length} en cartera
              </p>
            </div>
            <Link
              to="/sales/datos"
              style={{
                display:'inline-flex', alignItems:'center', gap:8,
                background:'rgba(59,130,246,0.15)',
                border:'1px solid rgba(59,130,246,0.3)',
                color:'#93c5fd', padding:'10px 20px',
                borderRadius:14, fontSize:13, fontWeight:700,
                textDecoration:'none', flexShrink:0,
                backdropFilter:'blur(8px)', transition:'all 0.2s',
              }}
            >
              <Database style={{ width:16, height:16 }} />
              Gestionar Datos
              <ChevronRight style={{ width:14, height:14 }} />
            </Link>
          </div>

          {/* 3 KPIs Héroe */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <HeroKPI
              icon={DollarSign}
              label="Venta Total Acumulada"
              value={fmt(K.totalVenta)}
              sub={`${K.totalCierres || 0} cierres confirmados`}
              gradient="linear-gradient(135deg, #059669 0%, #047857 100%)"
              glowColor="#10b981"
            />
            <HeroKPI
              icon={Target}
              label="Tasa de Cierre"
              value={`${K.tasaCierre || 0}%`}
              sub={`${K.tasaContacto || 0}% contacto decisor`}
              gradient="linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
              glowColor="#3b82f6"
            />
            <HeroKPI
              icon={Star}
              label="Ticket Promedio"
              value={fmt(K.ticketPromedio)}
              sub="Ingreso por cierre"
              gradient="linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)"
              glowColor="#8b5cf6"
            />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 1 – RESULTADOS COMERCIALES                                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section icon={DollarSign} hex={P.emerald.hex} lightBg={P.emerald.light}
        title="Resultados Comerciales" subtitle="Cifras de negocio acumuladas">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Cierres" value={K.totalCierres||0}
            sub={`Tasa ${K.tasaCierre||0}%`} icon={Handshake}
            hex={P.emerald.hex} lightBg={P.emerald.light} />
          <StatCard label="Cotizaciones" value={K.totalCotizaciones||0}
            pct={K.convCotCierre} sub="Enviadas" icon={Award}
            hex={P.blue.hex} lightBg={P.blue.light} />
          <StatCard label="Total Llamadas" value={K.totalLlamadas||0}
            pct={K.eficiencia} icon={PhoneCall}
            hex={P.sky.hex} lightBg={P.sky.light} />
          <StatCard label="Visitas en Campo" value={K.totalVisitas||0}
            pct={K.tasaPotencial} icon={Building2}
            hex={P.teal.hex} lightBg={P.teal.light} />
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 2 – ACTIVIDAD COMERCIAL                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section icon={Zap} hex={P.violet.hex} lightBg={P.violet.light}
        title="Actividad Comercial" subtitle="Productividad y contacto con decisores">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Llamadas Efectivas" value={K.totalEfec||0}
            pct={K.eficiencia} icon={Zap}
            hex={P.violet.hex} lightBg={P.violet.light} />
          <StatCard label="Decisores R" value={K.totalDecisorR||0}
            sub="En revisión" icon={Target}
            hex={P.amber.hex} lightBg={P.amber.light} />
          <StatCard label="Decisores Finales" value={K.totalDecisorF||0}
            pct={K.tasaContacto} icon={Award}
            hex={P.blue.hex} lightBg={P.blue.light} />
          <StatCard label="Actividad Total" value={K.actividadTotal||0}
            sub="Todos los contactos" icon={Activity}
            hex={P.rose.hex} lightBg={P.rose.light} />
          <StatCard label="Días Activos" value={K.diasActivos||0}
            sub={`~${K.promLlamadasDia||0} llam/día`} icon={CalendarDays}
            hex={P.sky.hex} lightBg={P.sky.light} />
          <StatCard label="Prospectos" value={K.prospectos||0}
            sub={`${K.totalCartera||0} cartera`} icon={Users}
            hex={P.teal.hex} lightBg={P.teal.light} />
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 3 – BITÁCORA + CARTERA                                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Bitácora */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div style={{ height: 3, background: `linear-gradient(90deg, ${P.sky.hex}, ${P.sky.hex}44)` }} />
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div style={{ width:36, height:36, borderRadius:12, background:P.sky.light, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Building2 style={{ width:16, height:16, color:P.sky.hex }} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">Bitácora de Salidas</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{bitacora.length} visitas registradas</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Visitas" value={K.totalBitacora||0}
                sub="En bitácora" icon={Building2}
                hex={P.sky.hex} lightBg={P.sky.light} />
              <StatCard label="Con Potencial" value={K.conPotencial||0}
                pct={K.tasaPotencial} icon={Target}
                hex={P.emerald.hex} lightBg={P.emerald.light} />
              <StatCard label="Decisor Contactado" value={K.conDecisor||0}
                pct={K.tasaDecisorBit} icon={Handshake}
                hex={P.blue.hex} lightBg={P.blue.light} />
              <StatCard label="Sin Potencial" value={K.sinPotencial||0}
                sub="Descartar" icon={Activity}
                hex={P.rose.hex} lightBg={P.rose.light} />
            </div>
          </div>
        </div>

        {/* Cartera */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div style={{ height: 3, background: `linear-gradient(90deg, ${P.violet.hex}, ${P.violet.hex}44)` }} />
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div style={{ width:36, height:36, borderRadius:12, background:P.violet.light, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Mail style={{ width:16, height:16, color:P.violet.hex }} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">Cartera de Clientes</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{cartera.length} empresas registradas</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Cartera" value={K.totalCartera||0}
                sub="Empresas activas" icon={Building2}
                hex={P.blue.hex} lightBg={P.blue.light} />
              <StatCard label="Prospectos" value={K.prospectos||0}
                sub="Por convertir" icon={Target}
                hex={P.violet.hex} lightBg={P.violet.light} />
              <StatCard label="Clientes" value={K.clientes||0}
                sub="Convertidos" icon={Star}
                hex={P.emerald.hex} lightBg={P.emerald.light} />
              <StatCard label="Con Decisor" value={K.carteraConDecisor||0}
                pct={K.tasaDecCartera} icon={Award}
                hex={P.amber.hex} lightBg={P.amber.light} />
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 4 – FUNNEL DE VENTAS                                         */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section icon={Layers} hex={P.blue.hex} lightBg={P.blue.light}
        title="Funnel de Ventas" subtitle="Volumen y tasas de conversión por etapa">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          <ChartCard title="Volumen por Etapa" subtitle="Total acumulado de actividades"
            icon={BarChart2} hex={P.blue.hex}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={funnelAbs} margin={{ top:8, right:8, left:-12, bottom:0 }} barSize={32}>
                <GradientDefs />
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="etapa" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<RichTooltip />} cursor={{ fill:'rgba(59,130,246,0.06)' }} />
                <Bar dataKey="valor" name="Total" radius={[8,8,0,0]}>
                  {funnelAbs.map((_, i) => (
                    <Cell key={i} fill={`url(#${GRAD_IDS[i % GRAD_IDS.length]})`} />
                  ))}
                  <LabelList dataKey="valor" position="top"
                    style={{ fontSize:10, fontWeight:800, fill:'#475569' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Tasa de Conversión" subtitle="% de paso entre etapas del funnel"
            icon={Percent} hex={P.violet.hex}>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={funnelPct} margin={{ top:8, right:8, left:-12, bottom:0 }} barSize={38}>
                <GradientDefs />
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="etapa" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<RichTooltip />} cursor={{ fill:'rgba(139,92,246,0.06)' }} />
                <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="4 4" />
                <Bar dataKey="pct" name="Conversión %" radius={[8,8,0,0]}>
                  {funnelPct.map((_, i) => (
                    <Cell key={i} fill={`url(#${['gEmerald','gBlue','gViolet','gAmber','gRose'][i]})`} />
                  ))}
                  <LabelList dataKey="pct" position="top" formatter={v=>`${v}%`}
                    style={{ fontSize:10, fontWeight:800, fill:'#475569' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 5 – TENDENCIA Y ACTIVIDAD                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section icon={TrendingUp} hex={P.teal.hex} lightBg={P.teal.light}
        title="Tendencia y Actividad" subtitle="Evolución temporal y patrones de comportamiento">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Tendencia semanal — AreaChart */}
          <ChartCard title="Tendencia Semanal" subtitle="Evolución de actividad por semana"
            icon={TrendingUp} hex={P.teal.hex}>
            {semData.length === 0 ? noData() : (
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={semData} margin={{ top:8, right:8, left:-12, bottom:0 }}>
                  <GradientDefs />
                  <CartesianGrid {...gridStyle} vertical={false} />
                  <XAxis dataKey="semana" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                  <Tooltip content={<RichTooltip />} cursor={{ stroke:'rgba(20,184,166,0.2)', strokeWidth:2 }} />
                  <Legend wrapperStyle={{ fontSize:10, fontWeight:700, paddingTop:8 }} />
                  <Area type="monotone" dataKey="llamadas" name="Llamadas"
                    stroke={P.blue.hex} fill="url(#aBlue)" strokeWidth={2.5} dot={{ fill:P.blue.hex, r:3, strokeWidth:0 }} />
                  <Area type="monotone" dataKey="visitas" name="Visitas"
                    stroke={P.emerald.hex} fill="url(#aEmerald)" strokeWidth={2.5} dot={{ fill:P.emerald.hex, r:3, strokeWidth:0 }} />
                  <Area type="monotone" dataKey="cierres" name="Cierres"
                    stroke={P.rose.hex} fill="url(#aRose)" strokeWidth={2.5} dot={{ fill:P.rose.hex, r:4, strokeWidth:0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Actividad por registro */}
          <ChartCard title="Actividad por Registro" subtitle="Últimas 10 entradas del reporte"
            icon={CalendarDays} hex={P.sky.hex}>
            {actReporte.length === 0 ? noData() : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={actReporte} margin={{ top:8, right:8, left:-12, bottom:0 }} barSize={14}>
                  <GradientDefs />
                  <CartesianGrid {...gridStyle} vertical={false} />
                  <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                  <Tooltip content={<RichTooltip />} cursor={{ fill:'rgba(14,165,233,0.06)' }} />
                  <Legend wrapperStyle={{ fontSize:10, fontWeight:700, paddingTop:8 }} />
                  <Bar dataKey="Llamadas"  fill="url(#gBlue)"    radius={[5,5,0,0]} />
                  <Bar dataKey="Efectivas" fill="url(#gViolet)"  radius={[5,5,0,0]} />
                  <Bar dataKey="Visitas"   fill="url(#gEmerald)" radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Patrón por día de semana */}
          <ChartCard title="Patrón por Día de Semana" subtitle="Distribución acumulada de actividad"
            icon={BarChart2} hex={P.amber.hex}>
            {diaData.length === 0 ? noData() : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={diaData} margin={{ top:8, right:8, left:-12, bottom:0 }} barSize={18}>
                  <GradientDefs />
                  <CartesianGrid {...gridStyle} vertical={false} />
                  <XAxis dataKey="dia" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                  <Tooltip content={<RichTooltip />} cursor={{ fill:'rgba(245,158,11,0.06)' }} />
                  <Legend wrapperStyle={{ fontSize:10, fontWeight:700, paddingTop:8 }} />
                  <Bar dataKey="llamadas"  name="Llamadas"  fill="url(#gBlue)"    radius={[5,5,0,0]} />
                  <Bar dataKey="efectivas" name="Efectivas" fill="url(#gViolet)"  radius={[5,5,0,0]} />
                  <Bar dataKey="visitas"   name="Visitas"   fill="url(#gEmerald)" radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Canales de contacto */}
          <ChartCard title="Canales de Contacto" subtitle="Distribución de impactos por canal"
            icon={MessageSquare} hex={P.sky.hex}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={canalData} margin={{ top:8, right:8, left:-12, bottom:0 }} barSize={44}>
                <GradientDefs />
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="canal" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<RichTooltip />} cursor={{ fill:'rgba(14,165,233,0.06)' }} />
                <Bar dataKey="total" name="Total" radius={[8,8,0,0]}>
                  {canalData.map((_, i) => (
                    <Cell key={i} fill={`url(#${['gSky','gViolet','gAmber','gEmerald'][i]})`} />
                  ))}
                  <LabelList dataKey="total" position="top"
                    style={{ fontSize:11, fontWeight:800, fill:'#475569' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 6 – POR EJECUTIVO (condicional)                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {ejData.length > 0 && (
        <Section icon={Flame} hex={P.rose.hex} lightBg={P.rose.light}
          title="Ranking por Ejecutivo" subtitle="Comparativa de rendimiento individual">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            <ChartCard title="Llamadas · Efectivas · Visitas" subtitle="Actividad por vendedor"
              icon={PhoneCall} hex={P.violet.hex}>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={ejData} margin={{ top:8, right:8, left:-12, bottom:0 }} barSize={18}>
                  <GradientDefs />
                  <CartesianGrid {...gridStyle} vertical={false} />
                  <XAxis dataKey="ejecutivo" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
                  <Tooltip content={<RichTooltip />} cursor={{ fill:'rgba(139,92,246,0.06)' }} />
                  <Legend wrapperStyle={{ fontSize:10, fontWeight:700, paddingTop:8 }} />
                  <Bar dataKey="llamadas"  name="Llamadas"  fill="url(#gBlue)"    radius={[5,5,0,0]} />
                  <Bar dataKey="efectivas" name="Efectivas" fill="url(#gViolet)"  radius={[5,5,0,0]} />
                  <Bar dataKey="visitas"   name="Visitas"   fill="url(#gEmerald)" radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Venta & Cierres" subtitle="Resultados económicos por vendedor"
              icon={DollarSign} hex={P.emerald.hex}>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={ejData} margin={{ top:8, right:8, left:4, bottom:0 }} barSize={26}>
                  <GradientDefs />
                  <CartesianGrid {...gridStyle} vertical={false} />
                  <XAxis dataKey="ejecutivo" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="v" tickFormatter={v=>v>=1000?`$${v/1000}k`:v} tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="c" orientation="right" allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                  <Tooltip content={<RichTooltip />} cursor={{ fill:'rgba(16,185,129,0.06)' }} />
                  <Legend wrapperStyle={{ fontSize:10, fontWeight:700, paddingTop:8 }} />
                  <Bar yAxisId="v" dataKey="venta"   name="Venta"   fill="url(#gEmerald)" radius={[5,5,0,0]} />
                  <Bar yAxisId="c" dataKey="cierres" name="Cierres" fill="url(#gBlue)"    radius={[5,5,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Eficiencia %" subtitle="% Llamadas efectivas por ejecutivo"
              icon={Zap} hex={P.amber.hex}>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={ejData} margin={{ top:8, right:8, left:-12, bottom:0 }} barSize={44}>
                  <GradientDefs />
                  <CartesianGrid {...gridStyle} vertical={false} />
                  <XAxis dataKey="ejecutivo" tick={axisStyle} axisLine={false} tickLine={false} />
                  <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={axisStyle} axisLine={false} tickLine={false} />
                  <Tooltip content={<RichTooltip />} cursor={{ fill:'rgba(245,158,11,0.06)' }} />
                  <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="4 4" label={{ value:'50%', position:'right', fontSize:9, fill:'#94a3b8' }} />
                  <Bar dataKey="eficiencia" name="Eficiencia %" radius={[8,8,0,0]}>
                    {ejData.map((_, i) => <Cell key={i} fill={`url(#${GRAD_IDS[i % GRAD_IDS.length]})`} />)}
                    <LabelList dataKey="eficiencia" position="top" formatter={v=>`${v}%`}
                      style={{ fontSize:10, fontWeight:800, fill:'#475569' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </Section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 7 – CARTERA VISUAL                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Section icon={Mail} hex={P.emerald.hex} lightBg={P.emerald.light}
        title="Distribución de Cartera" subtitle="Prospectos · Clientes activos · Con decisor">
        <ChartCard title="Cartera de Clientes" subtitle="Estado de cada empresa en cartera"
          icon={Users} hex={P.emerald.hex}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={carteraChart} margin={{ top:8, right:8, left:-12, bottom:0 }} barSize={72}>
              <GradientDefs />
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="tipo" tick={{ ...axisStyle, fontSize:12 }} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<RichTooltip />} cursor={{ fill:'rgba(16,185,129,0.06)' }} />
              <Bar dataKey="val" name="Empresas" radius={[10,10,0,0]}>
                {carteraChart.map((_, i) => (
                  <Cell key={i} fill={`url(#${['gViolet','gBlue','gEmerald'][i]})`} />
                ))}
                <LabelList dataKey="val" position="top"
                  style={{ fontSize:13, fontWeight:900, fill:'#475569' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECCIÓN 8 – RESUMEN EJECUTIVO                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <section>
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 28,
          padding: '28px 28px 32px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle, #f59e0b20, transparent 70%)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-40, left:'20%', width:120, height:120, borderRadius:'50%', background:'radial-gradient(circle, #3b82f615, transparent 70%)', pointerEvents:'none' }} />

          <div className="relative space-y-6">
            <div className="flex items-center gap-3">
              <div style={{ width:36, height:36, borderRadius:12, background:'rgba(245,158,11,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <BarChart2 style={{ width:16, height:16, color:'#fbbf24' }} />
              </div>
              <div>
                <h3 style={{ fontSize:13, fontWeight:900, color:'#f8fafc', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>
                  Resumen Ejecutivo
                </h3>
                <p style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.06em', marginTop:2 }}>
                  Indicadores clave consolidados
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <QuickStat label="Prom. Llamadas / Día"
                value={`${K.promLlamadasDia||0}`} unit="llamadas / día"
                hex="#60a5fa" lightBg="rgba(59,130,246,0.1)" />
              <QuickStat label="Prom. Visitas / Día"
                value={`${K.promVisitasDia||0}`} unit="visitas / día"
                hex="#34d399" lightBg="rgba(16,185,129,0.1)" />
              <QuickStat label="Venta por Efectiva"
                value={fmt(K.ventaEfec)} unit="/ llamada efectiva"
                hex="#a78bfa" lightBg="rgba(139,92,246,0.1)" />
              <QuickStat label="Correos + Mensajes"
                value={`${(K.totalCorreos||0)+(K.totalMensajes||0)}`}
                unit="contactos digitales"
                hex="#fbbf24" lightBg="rgba(245,158,11,0.1)" />
              <QuickStat label="Decisores en Revisión"
                value={`${K.totalDecisorR||0}`} unit="prospectos activos"
                hex="#38bdf8" lightBg="rgba(14,165,233,0.1)" />
              <QuickStat label="Tasa Contacto Decisor"
                value={`${K.tasaContacto||0}%`} unit="de llamadas"
                pct={K.tasaContacto} hex="#2dd4bf" lightBg="rgba(20,184,166,0.1)" />
              <QuickStat label="Tasa Potencial"
                value={`${K.tasaPotencial||0}%`} unit="de visitados"
                pct={K.tasaPotencial} hex="#34d399" lightBg="rgba(16,185,129,0.1)" />
              <QuickStat label="Tasa Decisor Cartera"
                value={`${K.tasaDecCartera||0}%`} unit="de cartera total"
                pct={K.tasaDecCartera} hex="#fb7185" lightBg="rgba(244,63,94,0.1)" />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
