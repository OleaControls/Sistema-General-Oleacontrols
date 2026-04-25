import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Star, Zap, Clock, Shield, Flame, Crown,
  ChevronUp, RefreshCw, Timer, Swords, TrendingUp,
  Activity, Target, Award, Sparkles, ChevronDown, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

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
function PodiumCard({ tech, place, delay = 0 }) {
  const r = RANKS[tech.rank] || RANKS.BRONCE;
  const isFirst = place === 1;

  const placeConfig = {
    1: { height: 'h-36', label: '👑', labelClass: 'text-4xl', scale: 'scale-110 z-10' },
    2: { height: 'h-24', label: '2', labelClass: 'text-xl font-black text-slate-300' },
    3: { height: 'h-16', label: '3', labelClass: 'text-xl font-black text-orange-600' },
  }[place] || { height: 'h-16', label: place, labelClass: 'text-lg font-black text-gray-400' };

  return (
    <motion.div
      className={cn('flex flex-col items-center gap-0', placeConfig.scale)}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Avatar + info */}
      <div
        className={cn(
          'relative flex flex-col items-center gap-3 rounded-3xl border p-5 mb-0 w-full',
          'bg-gray-900/80 backdrop-blur-xl',
          r.border,
        )}
        style={{ boxShadow: isFirst ? r.glow : r.glowSm }}
      >
        {isFirst && (
          <motion.div
            className="absolute -top-5 left-1/2 -translate-x-1/2 text-3xl"
            animate={{ y: [-3, 3, -3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            👑
          </motion.div>
        )}

        <Avatar src={tech.avatar} name={tech.name} size={isFirst ? 'xl' : 'lg'} rank={tech.rank} />

        <div className="text-center">
          <p className={cn('font-black text-white leading-tight', isFirst ? 'text-base' : 'text-sm')}>
            {tech.name}
          </p>
          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
            {tech.position || 'Técnico'}
          </p>
        </div>

        <RankBadge rank={tech.rank} size={isFirst ? 'md' : 'sm'} />

        <div className="text-center">
          <p className={cn('font-black text-white tracking-tighter', isFirst ? 'text-3xl' : 'text-2xl')}>
            {tech.points.toLocaleString()}
          </p>
          <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">pts período</p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full pt-3 border-t border-white/10 text-center">
          <div>
            <p className={cn('font-black text-white', isFirst ? 'text-sm' : 'text-xs')}>{tech.totalOTs}</p>
            <p className="text-[7px] text-gray-500 font-black uppercase">OTs</p>
          </div>
          <div>
            <p className={cn('font-black', isFirst ? 'text-sm' : 'text-xs', tech.avgRating ? 'text-amber-400' : 'text-gray-600')}>
              {tech.avgRating ? `${tech.avgRating}★` : '—'}
            </p>
            <p className="text-[7px] text-gray-500 font-black uppercase">Rating</p>
          </div>
          <div>
            <p className={cn('font-black text-white', isFirst ? 'text-sm' : 'text-xs')}>{tech.leadOTs}</p>
            <p className="text-[7px] text-gray-500 font-black uppercase">Líder</p>
          </div>
        </div>
      </div>

      {/* Pedestal */}
      <div
        className={cn('w-full rounded-b-2xl', placeConfig.height, 'flex items-center justify-center')}
        style={{
          background: isFirst
            ? 'linear-gradient(to bottom, #1a1500, #0a0800)'
            : place === 2
            ? 'linear-gradient(to bottom, #1a1a1a, #0d0d0d)'
            : 'linear-gradient(to bottom, #1a1008, #0d0804)',
          borderLeft: `2px solid ${r.bar}30`,
          borderRight: `2px solid ${r.bar}30`,
          borderBottom: `2px solid ${r.bar}30`,
        }}
      >
        <span className={placeConfig.labelClass}>{!isFirst ? place : ''}</span>
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

      {/* Rating */}
      <td className="px-4 py-4 text-center hidden lg:table-cell">
        {tech.avgRating ? (
          <div>
            <div className="flex items-center justify-center gap-1">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              <span className="text-sm font-black text-amber-400">{tech.avgRating}</span>
            </div>
            <p className="text-[8px] text-gray-500 font-bold uppercase">{tech.evalCount} eval</p>
          </div>
        ) : <span className="text-gray-700 text-xs font-black">—</span>}
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
    <div
      className="min-h-screen relative"
      style={{ background: 'linear-gradient(160deg, #06060f 0%, #0d0b1a 40%, #060c15 100%)' }}
    >
      <Particles />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 pb-24 space-y-8">

        {/* ── HEADER ──────────────────────────────────────────────────── */}
        <motion.div
          className="text-center space-y-3"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Trophy className="h-10 w-10 text-amber-400" style={{ filter: 'drop-shadow(0 0 16px rgba(251,191,36,0.8))' }} />
            </motion.div>
            <h1
              className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter text-white"
              style={{ textShadow: '0 0 40px rgba(139,92,246,0.5), 0 0 80px rgba(139,92,246,0.2)' }}
            >
              Arena de Líderes
            </h1>
            <motion.div
              animate={{ rotate: [5, -5, 5] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Trophy className="h-10 w-10 text-amber-400" style={{ filter: 'drop-shadow(0 0 16px rgba(251,191,36,0.8))' }} />
            </motion.div>
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-500">
            Métricas Reales · Técnicos Líder & Apoyo · OleaControls
          </p>

          {/* Línea decorativa */}
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-24 bg-gradient-to-r from-transparent to-violet-500/60" />
            <Sparkles className="h-4 w-4 text-violet-500" />
            <div className="h-px w-24 bg-gradient-to-l from-transparent to-violet-500/60" />
          </div>
        </motion.div>

        {/* ── SELECTOR DE PERÍODO ─────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-2">
          {PERIODS.map(p => {
            const Icon = p.icon;
            return (
              <motion.button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all duration-300',
                  period === p.id
                    ? 'bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-500/30'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:border-white/20'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {p.label}
              </motion.button>
            );
          })}
          <motion.button
            onClick={handleRefresh}
            whileTap={{ scale: 0.9 }}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all"
          >
            <RefreshCw className={cn('h-4 w-4 text-gray-400', (loading || refreshing) && 'animate-spin')} />
          </motion.button>
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
                      {['#', 'Técnico', 'OTs', 'Rating', 'Reacción', 'Resolución', 'Puntos'].map(h => (
                        <th
                          key={h}
                          className={cn(
                            'px-5 py-3 text-[8px] font-black text-gray-600 uppercase tracking-widest',
                            ['OTs', 'Rating', 'Reacción', 'Resolución', 'Puntos'].includes(h) && 'text-center',
                            h === 'Puntos' && 'text-right',
                            h === 'Reacción' || h === 'Resolución' ? 'hidden xl:table-cell' : '',
                            h === 'Rating' ? 'hidden lg:table-cell' : '',
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
