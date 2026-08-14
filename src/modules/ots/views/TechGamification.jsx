import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Star, Zap, Clock, Shield, Flame, Crown,
  ChevronUp, RefreshCw, Timer, Swords, TrendingUp,
  Activity, Target, Award, Sparkles, ChevronDown, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

/* ═══════════════════════════════════════════════════════════════════════════
   SALÓN DE CAMPEONES

   Se abandonó el look de HUD de videojuego (morado neón, partículas, trofeos
   meciéndose) por un tablero de campeonato: fondo tinta, metal de verdad en el
   podio —oro, plata y bronce con brillo que recorre la superficie— y tipografía
   de cartel. Anton para los titulares, IBM Plex Mono para las cifras.
═══════════════════════════════════════════════════════════════════════════ */
const LB_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Anton&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');

  .lb-display { font-family:'Anton', ui-sans-serif, sans-serif !important; letter-spacing:.01em; }
  .lb-num     { font-family:'IBM Plex Mono', ui-monospace, monospace !important; font-variant-numeric: tabular-nums; }

  /* Fondo: tinta con vignette y grano fino, sin partículas */
  .lb-bg { position:relative; background:#0a0d14; }
  .lb-bg::before {
    content:''; position:absolute; inset:0; pointer-events:none;
    background:
      radial-gradient(ellipse 70% 50% at 50% -8%, rgba(212,175,55,.16), transparent 62%),
      radial-gradient(ellipse 90% 60% at 50% 108%, rgba(30,58,95,.35), transparent 65%);
  }
  .lb-bg::after {
    content:''; position:absolute; inset:0; pointer-events:none; opacity:.5;
    background-image:
      linear-gradient(rgba(255,255,255,.022) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.022) 1px, transparent 1px);
    background-size: 64px 64px;
    mask-image: radial-gradient(ellipse 70% 70% at 50% 30%, #000 20%, transparent 75%);
  }

  /* Metal: degradado con veta y brillo que recorre */
  .lb-metal { position:relative; overflow:hidden; }
  .lb-metal::after {
    content:''; position:absolute; top:0; bottom:0; width:38%;
    background: linear-gradient(100deg, transparent, rgba(255,255,255,.5), transparent);
    animation: lb-sheen 4.5s ease-in-out infinite;
  }
  @keyframes lb-sheen { 0% { left:-45%; } 55%,100% { left:120%; } }

  .lb-gold   { background: linear-gradient(160deg,#7a5c14 0%,#d4af37 28%,#f7e08a 48%,#d4af37 68%,#6b4f10 100%); }
  .lb-silver { background: linear-gradient(160deg,#5b636e 0%,#b9c2cc 30%,#eef2f6 50%,#aab3bd 70%,#525a64 100%); }
  .lb-bronze { background: linear-gradient(160deg,#5e3313 0%,#a9682f 30%,#d99a5c 50%,#9c5f28 70%,#4d2a0f 100%); }

  /* Tarjeta de campeón */
  .lb-card {
    background: linear-gradient(180deg, rgba(23,29,42,.94), rgba(13,17,26,.94));
    border:1px solid rgba(255,255,255,.09);
    backdrop-filter: blur(14px);
  }
  .lb-card-1 { border-color: rgba(212,175,55,.42); box-shadow: 0 22px 60px -26px rgba(212,175,55,.55); }

  /* Fila */
  .lb-row { transition: background .16s, transform .16s; }
  .lb-row:hover { background: rgba(255,255,255,.04); }

  .lb-chip {
    display:inline-flex; align-items:center; gap:6px;
    padding:4px 10px; border-radius:999px;
    font-size:9px; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
    border:1px solid;
  }

  @media (prefers-reduced-motion: reduce) {
    .lb-metal::after { animation:none; display:none; }
  }
`;

// ── Configuración de rangos ───────────────────────────────────────────────────
const RANKS = {
  ELITE: {
    label: 'Élite', short: 'ELT',
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-600',
    glow: '0 0 30px rgba(139,92,246,0.8), 0 0 60px rgba(139,92,246,0.4)',
    glowSm: '0 0 15px rgba(139,92,246,0.6)',
    border: 'border-violet-500/60',
    ring: 'ring-violet-500',
    text: 'text-violet-400',
    bg: 'bg-violet-500/10',
    icon: Flame,
    bar: '#8b5cf6',
    pts: '20,000',
    order: 5,
  },
  DIAMANTE: {
    label: 'Diamante', short: 'DIA',
    gradient: 'from-cyan-400 via-sky-500 to-blue-600',
    glow: '0 0 30px rgba(34,211,238,0.7), 0 0 60px rgba(34,211,238,0.3)',
    glowSm: '0 0 15px rgba(34,211,238,0.5)',
    border: 'border-cyan-400/60',
    ring: 'ring-cyan-400',
    text: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    icon: Shield,
    bar: '#22d3ee',
    pts: '10,000',
    order: 4,
  },
  ORO: {
    label: 'Oro', short: 'ORO',
    gradient: 'from-amber-400 via-yellow-400 to-orange-500',
    glow: '0 0 30px rgba(251,191,36,0.8), 0 0 60px rgba(251,191,36,0.4)',
    glowSm: '0 0 15px rgba(251,191,36,0.6)',
    border: 'border-amber-400/60',
    ring: 'ring-amber-400',
    text: 'text-amber-400',
    bg: 'bg-amber-400/10',
    icon: Trophy,
    bar: '#fbbf24',
    pts: '5,000',
    order: 3,
  },
  PLATA: {
    label: 'Plata', short: 'PLT',
    gradient: 'from-slate-300 via-gray-400 to-slate-500',
    glow: '0 0 20px rgba(148,163,184,0.5)',
    glowSm: '0 0 10px rgba(148,163,184,0.4)',
    border: 'border-slate-400/50',
    ring: 'ring-slate-400',
    text: 'text-slate-400',
    bg: 'bg-slate-400/10',
    icon: Award,
    bar: '#94a3b8',
    pts: '1,000',
    order: 2,
  },
  BRONCE: {
    label: 'Bronce', short: 'BRZ',
    gradient: 'from-orange-500 via-amber-600 to-orange-700',
    glow: '0 0 20px rgba(234,88,12,0.5)',
    glowSm: '0 0 10px rgba(234,88,12,0.3)',
    border: 'border-orange-600/50',
    ring: 'ring-orange-500',
    text: 'text-orange-500',
    bg: 'bg-orange-500/10',
    icon: Target,
    bar: '#ea580c',
    pts: '0',
    order: 1,
  },
};

const PERIODS = [
  { id: 'month', label: 'Mes', icon: Activity },
  { id: 'year',  label: 'Año', icon: TrendingUp },
  { id: 'all',   label: '∞ Total', icon: Star },
];

// ── Partículas de fondo ───────────────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    duration: Math.random() * 8 + 4,
    delay: Math.random() * 4,
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            opacity: 0.15,
          }}
          animate={{ y: [-10, 10, -10], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 'md', rank }) {
  const sizes = {
    sm:  'h-10 w-10 text-sm',
    md:  'h-14 w-14 text-base',
    lg:  'h-20 w-20 text-xl',
    xl:  'h-24 w-24 text-2xl',
  };
  const r = RANKS[rank] || RANKS.BRONCE;
  return (
    <div className="relative">
      <div
        className={cn(sizes[size], 'rounded-2xl overflow-hidden shrink-0 ring-2', r.ring)}
        style={{ boxShadow: r.glowSm }}
      >
        {src
          ? <img src={src} className="w-full h-full object-cover" alt={name} />
          : <div className={cn('w-full h-full flex items-center justify-center font-black bg-gradient-to-br', r.gradient)}>
              <span className="text-white">{name?.charAt(0).toUpperCase()}</span>
            </div>
        }
      </div>
    </div>
  );
}

// ── Badge de rango ────────────────────────────────────────────────────────────
function RankBadge({ rank, size = 'sm' }) {
  const r = RANKS[rank] || RANKS.BRONCE;
  const Icon = r.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-black uppercase tracking-wider rounded-full text-white bg-gradient-to-r',
        r.gradient,
        size === 'xs' ? 'text-[7px] px-2 py-0.5' :
        size === 'sm' ? 'text-[9px] px-2.5 py-1' :
                        'text-[11px] px-3.5 py-1.5'
      )}
      style={{ boxShadow: r.glowSm }}
    >
      <Icon className={size === 'xs' ? 'h-2 w-2' : size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {r.label}
    </span>
  );
}

// ── Barra de progreso ─────────────────────────────────────────────────────────
function ProgressBar({ rank, progress, nextRank, lifetimePoints, nextAt }) {
  const r = RANKS[rank] || RANKS.BRONCE;
  const n = nextRank ? RANKS[nextRank] : null;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest">
        <span className={r.text}>{r.label}</span>
        {n && <span className="text-gray-500">{(nextAt - lifetimePoints).toLocaleString()} pts → {n.label}</span>}
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
        <motion.div
          className={cn('h-full rounded-full bg-gradient-to-r', r.gradient)}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          style={{ boxShadow: `0 0 8px ${r.bar}` }}
        />
      </div>
    </div>
  );
}

// ── Tarjeta del podio ─────────────────────────────────────────────────────────
/** Medalla metálica del podio: oro, plata o bronce con brillo que recorre. */
const MEDAL = {
  1: { metal: 'lb-gold',   ink: '#3d2c05', label: 'Oro',    pedestal: 'h-32' },
  2: { metal: 'lb-silver', ink: '#2b3138', label: 'Plata',  pedestal: 'h-20' },
  3: { metal: 'lb-bronze', ink: '#3a1f0a', label: 'Bronce', pedestal: 'h-14' },
};

function PodiumCard({ tech, place, delay = 0 }) {
  const isFirst = place === 1;
  const m = MEDAL[place] || MEDAL[3];

  return (
    <motion.div
      className={cn('flex flex-col items-center', isFirst && 'lg:-mt-8 z-10')}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={cn('relative w-full rounded-3xl p-5 lb-card', isFirst && 'lb-card-1')}>

        {/* Medalla — sustituye a la corona emoji */}
        <div className="flex justify-center -mt-11 mb-3">
          <div className={cn('lb-metal rounded-full flex items-center justify-center shadow-xl', m.metal)}
               style={{ height: isFirst ? 56 : 46, width: isFirst ? 56 : 46 }}>
            <span className="lb-display relative z-10" style={{ color: m.ink, fontSize: isFirst ? 26 : 21 }}>
              {place}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Avatar src={tech.avatar} name={tech.name} size={isFirst ? 'xl' : 'lg'} rank={tech.rank} />

          <div className="text-center">
            <p className={cn('lb-display text-white uppercase leading-none', isFirst ? 'text-xl' : 'text-base')}>
              {tech.name}
            </p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1.5">
              {tech.position || 'Técnico'}
            </p>
          </div>

          <RankBadge rank={tech.rank} size={isFirst ? 'md' : 'sm'} />

          {/* Puntos del período — el número que ordena la tabla */}
          <div className="text-center">
            <p className={cn('lb-num font-bold text-white leading-none', isFirst ? 'text-4xl' : 'text-3xl')}>
              {tech.points.toLocaleString()}
            </p>
            <p className="text-[8px] text-gray-500 font-bold uppercase tracking-[0.24em] mt-1.5">puntos</p>
          </div>

          {/* Desglose real: OTs, cuántas como líder, tiempo medio de resolución */}
          <div className="grid grid-cols-3 gap-2 w-full pt-3.5 border-t border-white/10 text-center">
            {[
              { v: tech.totalOTs, l: 'OTs' },
              { v: tech.leadOTs,  l: 'Líder' },
              { v: tech.avgResolution ? `${tech.avgResolution}h` : '—', l: 'Prom.' },
            ].map(s => (
              <div key={s.l}>
                <p className={cn('lb-num font-bold text-white', isFirst ? 'text-base' : 'text-sm')}>{s.v}</p>
                <p className="text-[7.5px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pedestal metálico */}
      <div className={cn('lb-metal w-[86%] rounded-b-xl flex items-start justify-center pt-2', m.metal, m.pedestal)}
           style={{ opacity: .92 }}>
        <span className="lb-display relative z-10 text-[10px] uppercase tracking-[0.3em]" style={{ color: m.ink }}>
          {m.label}
        </span>
      </div>
    </motion.div>
  );
}

// ── Fila del leaderboard ──────────────────────────────────────────────────────
function LeaderRow({ tech, index, delay = 0 }) {
  const r = RANKS[tech.rank] || RANKS.BRONCE;
  const isTop3 = index < 3;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="group border-b border-white/5 hover:bg-white/5 transition-all duration-300"
    >
      {/* # */}
      <td className="px-5 py-4 w-14">
        <div className={cn(
          'h-8 w-8 rounded-xl flex items-center justify-center font-black text-xs',
          isTop3
            ? `bg-gradient-to-br ${r.gradient} text-white shadow-lg`
            : 'bg-white/5 text-gray-500'
        )}
          style={isTop3 ? { boxShadow: r.glowSm } : {}}
        >
          {index + 1}
        </div>
      </td>

      {/* Técnico */}
      <td className="px-3 py-4">
        <div className="flex items-center gap-3">
          <Avatar src={tech.avatar} name={tech.name} size="sm" rank={tech.rank} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-black text-white leading-none">{tech.name}</p>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <RankBadge rank={tech.rank} size="xs" />
              <div className="w-24 hidden lg:block">
                <ProgressBar
                  rank={tech.rank}
                  progress={tech.rankProgress}
                  nextRank={tech.nextRank}
                  lifetimePoints={tech.lifetimePoints}
                  nextAt={tech.nextAt}
                />
              </div>
            </div>
          </div>
        </div>
      </td>

      {/* OTs */}
      <td className="px-4 py-4 text-center hidden md:table-cell">
        <p className="text-sm font-black text-white">{tech.totalOTs}</p>
        <p className="text-[8px] font-bold uppercase tracking-wider mt-0.5">
          <span className="text-violet-400">{tech.leadOTs}L</span>
          <span className="text-gray-600 mx-0.5">·</span>
          <span className="text-cyan-400">{tech.supportOTs}A</span>
        </p>
      </td>

      {/* Líder / Apoyo — reemplaza a la columna Rating, que la API todavía no
          calcula (avgRating llega siempre en null) y salía vacía para todos. */}
      <td className="px-4 py-4 text-center hidden lg:table-cell">
        <div className="flex items-center justify-center gap-1 lb-num">
          <span className="text-sm font-bold text-amber-400">{tech.leadOTs}</span>
          <span className="text-gray-600 text-xs">/</span>
          <span className="text-sm font-bold text-gray-400">{tech.supportOTs}</span>
        </div>
        <p className="text-[8px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Líder / Apoyo</p>
      </td>

      {/* Reacción */}
      <td className="px-4 py-4 text-center hidden xl:table-cell">
        {tech.avgReaction ? (
          <div>
            <p className="text-sm font-black text-cyan-400">{tech.avgReaction}m</p>
            <p className="text-[8px] text-gray-500 font-bold uppercase">Reacción</p>
          </div>
        ) : <span className="text-gray-700 text-xs">—</span>}
      </td>

      {/* Resolución */}
      <td className="px-4 py-4 text-center hidden xl:table-cell">
        {tech.avgResolution ? (
          <div>
            <p className="text-sm font-black text-violet-400">{tech.avgResolution}h</p>
            <p className="text-[8px] text-gray-500 font-bold uppercase">Resolución</p>
          </div>
        ) : <span className="text-gray-700 text-xs">—</span>}
      </td>

      {/* Puntos */}
      <td className="px-5 py-4 text-right">
        <div
          className="inline-flex flex-col items-end"
        >
          <p className="text-lg font-black text-white group-hover:scale-105 transition-transform">
            {tech.points.toLocaleString()}
          </p>
          <p className="text-[8px] text-gray-500 font-bold flex items-center gap-0.5">
            <Zap className="h-2 w-2 text-amber-500 fill-amber-500" />
            {tech.lifetimePoints.toLocaleString()} total
          </p>
        </div>
      </td>
    </motion.tr>
  );
}

// ── Panel de reglas ───────────────────────────────────────────────────────────
function RulesPanel() {
  const [open, setOpen] = useState(false);
  const rules = [
    { label: 'OT Urgente · Líder',  pts: '+200', color: 'text-red-400',    sub: '+130 apoyo' },
    { label: 'OT Alta · Líder',     pts: '+150', color: 'text-orange-400', sub: '+97 apoyo' },
    { label: 'OT Media · Líder',    pts: '+100', color: 'text-blue-400',   sub: '+65 apoyo' },
    { label: 'OT Baja · Líder',     pts: '+60',  color: 'text-gray-400',   sub: '+39 apoyo' },
    { label: 'Reacción < 30 min',   pts: '+50',  color: 'text-cyan-400',   sub: 'bonus velocidad' },
    { label: 'Reacción < 60 min',   pts: '+25',  color: 'text-cyan-600',   sub: 'bonus velocidad' },
    { label: 'Resolución < 4 h',    pts: '+40',  color: 'text-violet-400', sub: 'bonus eficiencia' },
    { label: 'Resolución < 8 h',    pts: '+20',  color: 'text-violet-600', sub: 'bonus eficiencia' },
    { label: 'OT Validada',         pts: '+20',  color: 'text-emerald-400',sub: 'bonus calidad' },
  ];
  return (
    <div className="bg-gray-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-amber-400" />
          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sistema de Puntuación</span>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-gray-500 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {rules.map(r => (
                <div key={r.label} className="bg-white/5 rounded-xl p-3 border border-white/10 text-center">
                  <p className={cn('text-xl font-black', r.color)}>{r.pts}</p>
                  <p className="text-[9px] font-black text-gray-300 leading-tight mt-0.5">{r.label}</p>
                  <p className="text-[8px] text-gray-600 mt-0.5">{r.sub}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TechGamification() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState('month');
  const [refreshing, setRefreshing] = useState(false);

  const load = async (p) => {
    setLoading(true);
    try {
      const res  = await apiFetch(`/api/gamification?period=${p}`);
      const data = await res.json();
      setLeaders(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(period); }, [period]);

  const handleRefresh = () => { setRefreshing(true); load(period); };

  const top3  = leaders.slice(0, 3);
  const rest  = leaders.slice(3);
  // Orden podio: 2º izq, 1º centro, 3º der
  const podium = top3.length === 3
    ? [top3[1], top3[0], top3[2]]
    : top3;
  const podiumPlaces = top3.length === 3 ? [2, 1, 3] : [1, 2, 3];

  return (
    <div className="lb-bg min-h-screen relative">
      <style dangerouslySetInnerHTML={{ __html: LB_CSS }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 pb-24 space-y-8">

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <motion.header
          className="text-center"
          initial={{ opacity: 0, y: -22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="lb-num text-[10px] font-semibold uppercase tracking-[0.42em] text-amber-500/70">
            Olea Controls · Operaciones
          </p>

          <h1 className="lb-display text-white uppercase leading-[0.88] mt-3"
              style={{ fontSize: 'clamp(2.9rem, 9vw, 5.5rem)' }}>
            Salón de<br />
            <span style={{
              background: 'linear-gradient(100deg,#8a6a1c,#d4af37 35%,#f7e08a 50%,#d4af37 65%,#8a6a1c)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              Campeones
            </span>
          </h1>

          <div className="flex items-center justify-center gap-3 mt-5">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-500/50" />
            <p className="lb-num text-[9px] font-medium uppercase tracking-[0.3em] text-gray-500">
              Puntos por OTs como líder y apoyo
            </p>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-500/50" />
          </div>
        </motion.header>

        {/* ── SELECTOR DE PERÍODO ─────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-1.5">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
            {PERIODS.map(p => {
              const Icon = p.icon;
              const on = period === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.14em] transition-all',
                    on ? 'bg-amber-400 text-[#2a1f05] shadow-lg shadow-amber-500/25'
                       : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {p.label}
                </button>
              );
            })}
          </div>
          <button
            onClick={handleRefresh}
            title="Actualizar"
            className="p-3 rounded-2xl border border-white/10 bg-white/[0.04] hover:bg-white/10 transition-all"
          >
            <RefreshCw className={cn('h-4 w-4 text-gray-400', (loading || refreshing) && 'animate-spin')} />
          </button>
        </div>

        {/* ── CARGANDO ────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center gap-4 py-32">
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Zap className="h-12 w-12 text-violet-500" style={{ filter: 'drop-shadow(0 0 12px rgba(139,92,246,0.8))' }} />
            </motion.div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.5em]">
              Calculando puntuaciones…
            </p>
          </div>

        ) : leaders.length === 0 ? (
          <div className="text-center py-32">
            <Trophy className="h-16 w-16 text-gray-800 mx-auto mb-4" />
            <p className="text-gray-600 font-black uppercase text-xs tracking-widest">
              Sin combatientes en este período
            </p>
          </div>

        ) : (
          <>
            {/* ── PANEL REGLAS ─────────────────────────────────────────── */}
            <RulesPanel />

            {/* ── PODIO ────────────────────────────────────────────────── */}
            {top3.length > 0 && (
              <div className="pt-6">
                <div className={cn(
                  'grid gap-4 items-end',
                  top3.length === 3 ? 'grid-cols-3' : `grid-cols-${top3.length}`
                )}>
                  {podium.map((tech, i) => (
                    <PodiumCard
                      key={tech.id}
                      tech={tech}
                      place={podiumPlaces[i]}
                      delay={0.1 + i * 0.15}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── TABLA COMPLETA ────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="bg-gray-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl"
            >
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-400" />
                  <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                    Clasificación Completa
                  </h3>
                </div>
                <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">
                  {leaders.length} combatientes
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['#', 'Técnico', 'OTs', 'Líder/Apoyo', 'Reacción', 'Resolución', 'Puntos'].map(h => (
                        <th
                          key={h}
                          className={cn(
                            'px-5 py-3 text-[8px] font-black text-gray-600 uppercase tracking-widest',
                            ['OTs', 'Líder/Apoyo', 'Reacción', 'Resolución', 'Puntos'].includes(h) && 'text-center',
                            h === 'Puntos' && 'text-right',
                            h === 'Reacción' || h === 'Resolución' ? 'hidden xl:table-cell' : '',
                            h === 'Líder/Apoyo' ? 'hidden lg:table-cell' : '',
                            h === 'OTs' ? 'hidden md:table-cell' : '',
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {leaders.map((tech, i) => (
                      <LeaderRow
                        key={tech.id}
                        tech={tech}
                        index={i}
                        delay={0.7 + i * 0.04}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* ── LEYENDA DE RANGOS ─────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.6 }}
            >
              <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest text-center mb-4">
                Rangos · Puntos Históricos Acumulados
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {Object.entries(RANKS).map(([key, r]) => {
                  const Icon = r.icon;
                  return (
                    <motion.div
                      key={key}
                      whileHover={{ scale: 1.04, y: -2 }}
                      className={cn(
                        'rounded-2xl p-4 border text-center space-y-2 bg-gray-900/60 backdrop-blur-xl cursor-default',
                        r.border,
                      )}
                      style={{ boxShadow: r.glowSm }}
                    >
                      <div className={cn('inline-flex p-2 rounded-xl', r.bg)}>
                        <Icon className={cn('h-5 w-5', r.text)} />
                      </div>
                      <p className={cn('text-xs font-black', r.text)}>{r.label}</p>
                      <p className="text-[8px] text-gray-600 font-bold">{r.pts}+ pts</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
