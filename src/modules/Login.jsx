import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';
import {
  LayoutGrid, User, ArrowRight, GraduationCap,
  Lock, Mail, AlertCircle, Eye, EyeOff, Shield, Sun, Moon
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════════
   PALETAS  dark / light
═══════════════════════════════════════════════ */
const makeC = (dark) => dark ? {
  /* oscuro */
  bg:          '#070B14',
  panelL:      '#0A1220',
  panelR:      '#0C1528',
  blue:        '#3B82F6',
  blueL:       '#60A5FA',
  blueD:       '#1D4ED8',
  text:        '#E2E8F0',
  dim:         '#94A3B8',
  muted:       '#64748B',
  border:      'rgba(255,255,255,0.07)',
  iconBg:      'rgba(255,255,255,0.04)',
  iconBorder:  'rgba(255,255,255,0.06)',
  dotInactive: 'rgba(255,255,255,0.12)',
  subtleText:  'rgba(255,255,255,0.14)',
  copyright:   'rgba(255,255,255,0.18)',
  logoFilter:  'brightness(0) invert(1) opacity(.88)',
  gridClr:     'rgba(255,255,255,.022)',
  vignette:    'radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(7,11,20,.88) 100%)',
  orbTR:       'radial-gradient(circle, rgba(37,99,235,.13) 0%, transparent 68%)',
  orbBL:       'radial-gradient(circle, rgba(59,130,246,.07) 0%, transparent 68%)',
  cardShadow:  '0 60px 130px rgba(0,0,0,.85), 0 0 0 1px rgba(255,255,255,.03)',
  overlayBg:   'rgba(7,11,20,.92)',
  toggleBg:    'rgba(255,255,255,.07)',
  toggleHover: 'rgba(255,255,255,.12)',
  errorText:   '#fca5a5',
  errorBg:     'rgba(239,68,68,.08)',
  errorBorder: 'rgba(239,68,68,.25)',
} : {
  /* claro */
  bg:          '#EEF2FF',
  panelL:      '#DBEAFE',
  panelR:      '#FFFFFF',
  blue:        '#2563EB',
  blueL:       '#3B82F6',
  blueD:       '#1E40AF',
  text:        '#0F172A',
  dim:         '#334155',
  muted:       '#64748B',
  border:      'rgba(30,64,175,0.12)',
  iconBg:      'rgba(30,64,175,0.07)',
  iconBorder:  'rgba(30,64,175,0.14)',
  dotInactive: 'rgba(0,0,0,0.15)',
  subtleText:  'rgba(0,0,0,0.32)',
  copyright:   'rgba(0,0,0,0.28)',
  logoFilter:  'none',
  gridClr:     'transparent',
  vignette:    'radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(209,224,255,.55) 100%)',
  orbTR:       'radial-gradient(circle, rgba(37,99,235,.1) 0%, transparent 68%)',
  orbBL:       'radial-gradient(circle, rgba(99,102,241,.07) 0%, transparent 68%)',
  cardShadow:  '0 30px 80px rgba(30,64,175,.14), 0 0 0 1px rgba(30,64,175,.1)',
  overlayBg:   'rgba(238,242,255,.93)',
  toggleBg:    'rgba(30,64,175,0.09)',
  toggleHover: 'rgba(30,64,175,0.16)',
  errorText:   '#b91c1c',
  errorBg:     'rgba(239,68,68,.07)',
  errorBorder: 'rgba(239,68,68,.3)',
};

/* ═══════════════════════════════════════════════
   CSS dinámico según modo
═══════════════════════════════════════════════ */
const makeStyles = (dark) => `
  @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Outfit:wght@300;400;500;600;700&display=swap');

  .lp-root, .lp-root * { box-sizing: border-box; }
  .lp-display  { font-family: 'Chakra Petch', sans-serif !important; }
  .lp-body-fnt { font-family: 'Outfit', sans-serif !important; }

  /* ── Transición de tema ── */
  .lp-root, .lp-panel-l, .lp-panel-r, .lp-card {
    transition: background .35s ease, border-color .35s ease, box-shadow .35s ease, color .35s ease;
  }

  /* ── Pulse rings ── */
  @keyframes lp-ring {
    0%   { transform: scale(1); opacity: 0.55; }
    100% { transform: scale(2.6); opacity: 0; }
  }
  .lp-ring {
    position: absolute; inset: 0; border-radius: 50%;
    border: 1px solid ${dark ? 'rgba(59,130,246,.55)' : 'rgba(37,99,235,.45)'};
    animation: lp-ring 2.8s ease-out infinite;
  }
  .lp-ring-2 { animation-delay: .93s; }
  .lp-ring-3 { animation-delay: 1.86s; }

  /* ── Scanline ── */
  @keyframes lp-scan {
    0%   { top: -2px; opacity: 0; }
    4%   { opacity: 1; }
    96%  { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }
  .lp-scan-line {
    position: absolute; left: 0; right: 0; height: 1px; pointer-events: none; z-index: 3;
    background: linear-gradient(90deg,
      transparent 0%,
      ${dark ? 'rgba(59,130,246,.35)' : 'rgba(37,99,235,.25)'} 25%,
      ${dark ? 'rgba(96,165,250,.9)'  : 'rgba(37,99,235,.65)'} 50%,
      ${dark ? 'rgba(59,130,246,.35)' : 'rgba(37,99,235,.25)'} 75%,
      transparent 100%);
    animation: lp-scan 5s linear infinite;
  }

  /* ── Botón CTA (shimmer azul) ── */
  @keyframes lp-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  .lp-cta-btn {
    background: linear-gradient(110deg,
      ${dark ? '#1e40af' : '#1e3a8a'} 0%,
      ${dark ? '#2563eb' : '#2563eb'} 28%,
      ${dark ? '#93c5fd' : '#60a5fa'} 50%,
      ${dark ? '#2563eb' : '#2563eb'} 72%,
      ${dark ? '#1e40af' : '#1e3a8a'} 100%);
    background-size: 200% auto;
    animation: lp-shimmer 3.5s linear infinite;
    color: #ffffff;
    font-family: 'Chakra Petch', sans-serif; font-weight: 700;
    letter-spacing: .18em; text-transform: uppercase;
    border: none; cursor: pointer;
    transition: transform .2s, box-shadow .2s;
  }
  .lp-cta-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 22px 55px ${dark ? 'rgba(37,99,235,.5)' : 'rgba(37,99,235,.4)'};
  }
  .lp-cta-btn:active:not(:disabled) { transform: translateY(0); }
  .lp-cta-btn:disabled { opacity: .6; cursor: not-allowed; }

  /* ── Inputs ── */
  .lp-input {
    background: ${dark ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.75)'};
    border: 1px solid ${dark ? 'rgba(255,255,255,.07)' : 'rgba(30,64,175,.14)'};
    color: ${dark ? '#e2e8f0' : '#0f172a'};
    transition: all .3s; outline: none;
    font-family: 'Outfit', sans-serif; font-weight: 500;
  }
  .lp-input:focus {
    border-color: ${dark ? 'rgba(59,130,246,.55)' : 'rgba(37,99,235,.6)'};
    background: ${dark ? 'rgba(59,130,246,.04)' : 'rgba(219,234,254,.5)'};
    box-shadow: 0 0 0 3px ${dark ? 'rgba(59,130,246,.1)' : 'rgba(37,99,235,.1)'};
  }
  .lp-input::placeholder { color: ${dark ? 'rgba(148,163,184,.3)' : 'rgba(100,116,139,.45)'}; }

  /* ── Icono input en focus → azul ── */
  .lp-iw:focus-within .lp-ico {
    color: ${dark ? '#3b82f6' : '#2563eb'} !important;
    background: ${dark ? 'rgba(59,130,246,.14)' : 'rgba(37,99,235,.1)'} !important;
  }

  /* ── Portal buttons ── */
  .lp-pb {
    border: 1px solid ${dark ? 'rgba(255,255,255,.07)' : 'rgba(30,64,175,.1)'};
    background: ${dark ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.5)'};
    transition: all .25s; cursor: pointer; text-align: left;
  }
  .lp-pb:hover {
    border-color: ${dark ? 'rgba(59,130,246,.28)' : 'rgba(37,99,235,.3)'};
    background: ${dark ? 'rgba(59,130,246,.05)' : 'rgba(219,234,254,.6)'};
  }
  @keyframes lp-glow {
    0%,100% { box-shadow: 0 0 16px ${dark ? 'rgba(37,99,235,.22)' : 'rgba(37,99,235,.18)'}; }
    50%      { box-shadow: 0 0 34px ${dark ? 'rgba(37,99,235,.42)' : 'rgba(37,99,235,.32)'}; }
  }
  .lp-pb-active {
    border-color: ${dark ? 'rgba(59,130,246,.55)' : 'rgba(37,99,235,.5)'} !important;
    background: ${dark ? 'rgba(59,130,246,.08)' : 'rgba(219,234,254,.8)'} !important;
    animation: lp-glow 2.2s ease-in-out infinite;
  }

  @keyframes lp-glow-ac {
    0%,100% { box-shadow: 0 0 16px ${dark ? 'rgba(99,102,241,.25)' : 'rgba(99,102,241,.2)'}; }
    50%      { box-shadow: 0 0 34px ${dark ? 'rgba(99,102,241,.45)' : 'rgba(99,102,241,.35)'}; }
  }
  .lp-pb-active-ac {
    border-color: ${dark ? 'rgba(129,140,248,.55)' : 'rgba(99,102,241,.5)'} !important;
    background: ${dark ? 'rgba(99,102,241,.09)' : 'rgba(237,233,254,.85)'} !important;
    animation: lp-glow-ac 2.2s ease-in-out infinite;
  }
  .lp-pb-acad:hover {
    border-color: ${dark ? 'rgba(129,140,248,.28)' : 'rgba(99,102,241,.28)'} !important;
    background: ${dark ? 'rgba(99,102,241,.06)' : 'rgba(237,233,254,.55)'} !important;
  }

  /* ── Entrada escalonada ── */
  @keyframes lp-up {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .lp-s1 { animation: lp-up .5s ease .05s both; }
  .lp-s2 { animation: lp-up .5s ease .15s both; }
  .lp-s3 { animation: lp-up .5s ease .25s both; }
  .lp-s4 { animation: lp-up .5s ease .35s both; }
  .lp-s5 { animation: lp-up .5s ease .45s both; }
  .lp-s6 { animation: lp-up .5s ease .55s both; }
  .lp-s7 { animation: lp-up .5s ease .65s both; }

  /* ── Dot pulsante ── */
  @keyframes lp-dot { 0%,100% { opacity:1; } 50% { opacity:.25; } }
  .lp-dot-on { animation: lp-dot 2s ease-in-out infinite; }

  /* ── Spinner CTA ── */
  @keyframes lp-spin { to { transform: rotate(360deg); } }
  .lp-spinner {
    width:20px; height:20px; border-radius:50%;
    border: 2px solid rgba(255,255,255,.3);
    border-top-color: #fff;
    animation: lp-spin .85s linear infinite;
  }

  /* ── Overlay bienvenida ── */
  @keyframes lp-zin { from { opacity:0; transform:scale(.9); } to { opacity:1; transform:scale(1); } }
  .lp-overlay-card { animation: lp-zin .4s ease both; }

  /* ── Spinner doble overlay ── */
  @keyframes lp-spin-rev { to { transform: rotate(-360deg); } }
  .lp-spin-a { animation: lp-spin 1s linear infinite; }
  .lp-spin-b { animation: lp-spin-rev 1.6s linear infinite; }

  /* ── Overlay bienvenida: avatar + nombre ── */
  @keyframes lp-avatar-in {
    0%   { transform: scale(0.5); opacity: 0; }
    70%  { transform: scale(1.08); }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes lp-text-in {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lp-progress {
    from { width: 0%; }
    to   { width: 100%; }
  }
  @keyframes lp-ring-w {
    0%   { transform: scale(1); opacity: .5; }
    100% { transform: scale(1.9); opacity: 0; }
  }

  .lp-av-ring {
    position: absolute; inset: 0; border-radius: 50%;
    border: 1.5px solid ${dark ? 'rgba(59,130,246,.5)' : 'rgba(37,99,235,.4)'};
    animation: lp-ring-w 2s ease-out infinite;
  }
  .lp-av-ring-2 { animation-delay: .66s; }
  .lp-av-ring-3 { animation-delay: 1.32s; }

  .lp-avatar    { animation: lp-avatar-in .6s cubic-bezier(.34,1.56,.64,1) .1s both; }
  .lp-ov-name  { animation: lp-text-in .5s ease .55s both; }
  .lp-ov-label { animation: lp-text-in .5s ease .3s both; }
  .lp-ov-sub   { animation: lp-text-in .5s ease .75s both; }

  .lp-progress-bar {
    height: 3px; border-radius: 2px; overflow: hidden;
    background: ${dark ? 'rgba(255,255,255,.07)' : 'rgba(30,64,175,.1)'};
  }
  .lp-progress-fill {
    height: 100%; border-radius: 2px;
    background: linear-gradient(90deg, ${dark ? '#1d4ed8, #60a5fa' : '#2563eb, #93c5fd'});
    animation: lp-progress 4.6s ease .3s both;
  }

  /* ══ ACADEMY ══════════════════════════════════ */

  /* Scanline índigo */
  .lp-acad-scan {
    position: absolute; left: 0; right: 0; height: 1px; pointer-events: none; z-index: 3;
    background: linear-gradient(90deg,
      transparent 0%,
      ${dark ? 'rgba(129,140,248,.3)' : 'rgba(99,102,241,.22)'} 25%,
      ${dark ? 'rgba(165,180,252,.88)' : 'rgba(99,102,241,.72)'} 50%,
      ${dark ? 'rgba(129,140,248,.3)' : 'rgba(99,102,241,.22)'} 75%,
      transparent 100%);
    animation: lp-scan 5s linear infinite;
  }

  /* Botón índigo shimmer */
  .lp-acad-btn {
    background: linear-gradient(110deg,
      ${dark ? '#2d2b6b' : '#3730a3'} 0%,
      ${dark ? '#4f46e5' : '#4f46e5'} 28%,
      ${dark ? '#a5b4fc' : '#c4b5fd'} 50%,
      ${dark ? '#4f46e5' : '#4f46e5'} 72%,
      ${dark ? '#2d2b6b' : '#3730a3'} 100%);
    background-size: 200% auto;
    animation: lp-shimmer 3.5s linear infinite;
    color: #ffffff; font-family: 'Chakra Petch', sans-serif; font-weight: 700;
    letter-spacing: .18em; text-transform: uppercase;
    border: none; cursor: pointer; transition: transform .2s, box-shadow .2s;
  }
  .lp-acad-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 22px 55px ${dark ? 'rgba(79,70,229,.55)' : 'rgba(79,70,229,.42)'};
  }
  .lp-acad-btn:active:not(:disabled) { transform: translateY(0); }
  .lp-acad-btn:disabled { opacity: .6; cursor: not-allowed; }

  /* Inputs índigo */
  .lp-acad-input {
    background: ${dark ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.85)'};
    border: 1px solid ${dark ? 'rgba(129,140,248,.15)' : 'rgba(99,102,241,.17)'};
    color: ${dark ? '#e8e8f8' : '#1e1b4b'};
    transition: all .3s; outline: none;
    font-family: 'Outfit', sans-serif; font-weight: 500;
  }
  .lp-acad-input:focus {
    border-color: ${dark ? 'rgba(129,140,248,.6)' : 'rgba(99,102,241,.6)'};
    background: ${dark ? 'rgba(99,102,241,.05)' : 'rgba(237,233,254,.6)'};
    box-shadow: 0 0 0 3px ${dark ? 'rgba(99,102,241,.12)' : 'rgba(99,102,241,.1)'};
  }
  .lp-acad-input::placeholder { color: ${dark ? 'rgba(148,163,184,.3)' : 'rgba(107,114,128,.4)'}; }

  /* Icono índigo en focus */
  .lp-acad-iw:focus-within .lp-acad-ico {
    color: ${dark ? '#818cf8' : '#6366f1'} !important;
    background: ${dark ? 'rgba(99,102,241,.16)' : 'rgba(99,102,241,.1)'} !important;
  }

  /* Anillos índigo del ícono de academy */
  .lp-acad-ring {
    position: absolute; inset: 0; border-radius: 50%;
    border: 1px solid ${dark ? 'rgba(129,140,248,.5)' : 'rgba(99,102,241,.45)'};
    animation: lp-ring 2.8s ease-out infinite;
  }
  .lp-acad-ring-2 { animation-delay: .93s; }
  .lp-acad-ring-3 { animation-delay: 1.86s; }

  /* Sparkles flotantes */
  @keyframes lp-float-1 {
    0%,100% { transform: translateY(0) rotate(0deg); opacity: .7; }
    50%      { transform: translateY(-10px) rotate(180deg); opacity: 1; }
  }
  @keyframes lp-float-2 {
    0%,100% { transform: translateY(0) rotate(0deg); opacity: .45; }
    50%      { transform: translateY(-7px) rotate(-120deg); opacity: .8; }
  }
  @keyframes lp-float-3 {
    0%,100% { transform: translateY(0) rotate(0deg); opacity: .35; }
    50%      { transform: translateY(-5px) rotate(90deg); opacity: .6; }
  }
  .lp-star-1 { animation: lp-float-1 4s ease-in-out infinite; }
  .lp-star-2 { animation: lp-float-2 5.5s ease-in-out 1.2s infinite; }
  .lp-star-3 { animation: lp-float-3 3.8s ease-in-out 2.2s infinite; }

  /* ══════════════════════════════════════════════ */

  /* ── Toggle tema ── */
  .lp-toggle {
    display: flex; align-items: center; justify-content: center;
    width: 38px; height: 38px; border-radius: 10px; border: none; cursor: pointer;
    background: ${dark ? 'rgba(255,255,255,.07)' : 'rgba(30,64,175,.09)'};
    color: ${dark ? '#60a5fa' : '#2563eb'};
    transition: background .2s, transform .2s, color .2s;
  }
  .lp-toggle:hover {
    background: ${dark ? 'rgba(255,255,255,.13)' : 'rgba(30,64,175,.16)'};
    transform: rotate(15deg) scale(1.08);
  }
`;

/* ═══════════════════════════════════════════════
   PALETA  ACADEMY  (índigo / violeta)
═══════════════════════════════════════════════ */
const makeAC = (dark) => dark ? {
  accent:     '#818CF8',
  accentL:    '#A5B4FC',
  accentD:    '#4F46E5',
  accentDD:   '#2D2B6B',
  text:       '#E8E8F8',
  dim:        '#9CA3AF',
  muted:      '#6B7080',
  panelBg:    '#0D0F1C',
  iconBg:     'rgba(129,140,248,0.10)',
  border:     'rgba(129,140,248,0.15)',
  errText:    '#fca5a5',
  errBg:      'rgba(239,68,68,.08)',
  errBorder:  'rgba(239,68,68,.25)',
} : {
  accent:     '#6366F1',
  accentL:    '#818CF8',
  accentD:    '#4F46E5',
  accentDD:   '#3730A3',
  text:       '#1E1B4B',
  dim:        '#4B5563',
  muted:      '#6B7280',
  panelBg:    '#FAFAFF',
  iconBg:     'rgba(99,102,241,0.08)',
  border:     'rgba(99,102,241,0.14)',
  errText:    '#b91c1c',
  errBg:      'rgba(239,68,68,.07)',
  errBorder:  'rgba(239,68,68,.3)',
};

const PORTALS = [
  { id: 'SUPERVISOR',   label: 'Portal de Operaciones', sub: 'Gestión de Negocio',         Icon: LayoutGrid    },
  { id: 'COLLABORATOR', label: 'Portal Colaborador',     sub: 'Mi Perfil RH y Solicitudes', Icon: User          },
  { id: 'ACADEMY',      label: 'Olea Academy',           sub: 'Centro de Aprendizaje',       Icon: GraduationCap },
];

/* ═══════════════════════════════════════════════
   COMPONENTE
═══════════════════════════════════════════════ */
export default function Login() {
  const { loginWithCredentials, user } = useAuth();
  const navigate = useNavigate();

  const [dark,        setDark]        = useState(true);
  const [portal,      setPortal]      = useState('SUPERVISOR');
  const [step,        setStep]        = useState(1);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [welcomeMsg,  setWelcomeMsg]  = useState(null);
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [error,       setError]       = useState(null);

  const C  = makeC(dark);
  const AC = makeAC(dark);
  const isAcademy = portal === 'ACADEMY';

  const handlePortalSelect = (p) => {
    setPortal(p);
    if (window.innerWidth < 1024) setStep(2);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);
    try {
      const ok = await loginWithCredentials(email, password, portal);
      if (ok) {
        setWelcomeMsg('Acceso concedido. Cargando tu perfil personalizado…');
        setTimeout(() => {
          if (portal === 'ACADEMY')           navigate('/academy');
          else if (portal === 'COLLABORATOR') navigate('/profile');
          else                                navigate('/');
        }, 5000);
      } else {
        setIsLoggingIn(false);
        setError('Credenciales inválidas. Por favor verifique su correo y contraseña.');
      }
    } catch {
      setIsLoggingIn(false);
      setError('Error de conexión al intentar iniciar sesión.');
    }
  };

  /* helpers de estilo reutilizables */
  const activeIconBox = isAcademy ? {
    background: dark ? 'rgba(129,140,248,.15)' : 'rgba(99,102,241,.12)',
    border: `1px solid ${dark ? 'rgba(129,140,248,.45)' : 'rgba(99,102,241,.38)'}`,
    color: AC.accent,
  } : {
    background: dark ? 'rgba(59,130,246,.14)' : 'rgba(37,99,235,.12)',
    border: `1px solid ${dark ? 'rgba(59,130,246,.4)' : 'rgba(37,99,235,.35)'}`,
    color: C.blue,
  };
  const inactiveIconBox = {
    background: isAcademy ? AC.iconBg : C.iconBg,
    border: `1px solid ${isAcademy ? AC.border : C.iconBorder}`,
    color: isAcademy ? AC.muted : C.muted,
  };

  return (
    <div
      className="lp-root lp-body-fnt"
      style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative', overflow: 'hidden', transition: 'background .35s ease' }}
    >
      <style dangerouslySetInnerHTML={{ __html: makeStyles(dark) }} />

      {/* Fondo: grid de líneas */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${C.gridClr} 1px, transparent 1px), linear-gradient(90deg, ${C.gridClr} 1px, transparent 1px)`,
        backgroundSize: '64px 64px', transition: 'opacity .35s',
      }} />

      {/* Viñeta */}
      <div style={{ position: 'absolute', inset: 0, background: C.vignette, pointerEvents: 'none', transition: 'background .35s' }} />

      {/* Orb top-right */}
      <div style={{ position: 'absolute', top: '-280px', right: '-180px', width: '720px', height: '720px', borderRadius: '50%', background: C.orbTR, pointerEvents: 'none', transition: 'background .35s' }} />

      {/* Orb bottom-left */}
      <div style={{ position: 'absolute', bottom: '-240px', left: '-120px', width: '600px', height: '600px', borderRadius: '50%', background: C.orbBL, pointerEvents: 'none', transition: 'background .35s' }} />

      {/* Toggle tema — flotante fijo, siempre visible */}
      <button
        className="lp-toggle"
        onClick={() => setDark(d => !d)}
        title={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 50 }}
      >
        {dark ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      {/* ══════════════════════════════════════
          TARJETA PRINCIPAL
      ══════════════════════════════════════ */}
      <div
        className="lp-card grid grid-cols-1 lg:grid-cols-5"
        style={{
          position: 'relative', zIndex: 10, width: '100%', maxWidth: '1120px',
          borderRadius: '22px', overflow: 'hidden',
          border: `1px solid ${C.border}`,
          boxShadow: C.cardShadow,
        }}
      >

        {/* ════════ PANEL IZQUIERDO ════════ */}
        <div
          className={cn('lp-panel-l lg:col-span-2', step === 2 ? 'hidden lg:flex' : 'flex')}
          style={{ flexDirection: 'column', background: isAcademy ? (dark ? '#0A0C18' : '#EDE9FE') : C.panelL, borderRight: `1px solid ${isAcademy ? AC.border : C.border}`, padding: '44px 32px', justifyContent: 'space-between', minHeight: '700px', transition: 'background .4s ease, border-color .4s ease' }}
        >

          {/* Logo + Brand */}
          <div className="lp-s1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', textAlign: 'center' }}>

            {/* Logo con anillos — azul o índigo */}
            <div style={{ position: 'relative', width: '136px', height: '136px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {[0, 1, 2].map(n => (
                <div key={n} className={`lp-ring${n ? ` lp-ring-${n + 1}` : ''}`} style={{ width: '136px', height: '136px', top: 0, left: 0, borderColor: isAcademy ? (dark ? 'rgba(129,140,248,.52)' : 'rgba(99,102,241,.42)') : undefined }} />
              ))}
              <div style={{
                width: '112px', height: '112px', borderRadius: '50%',
                background: isAcademy ? (dark ? 'rgba(99,102,241,.08)' : 'rgba(99,102,241,.1)') : (dark ? 'rgba(59,130,246,.06)' : 'rgba(37,99,235,.08)'),
                border: `1px solid ${isAcademy ? (dark ? 'rgba(129,140,248,.24)' : 'rgba(99,102,241,.22)') : (dark ? 'rgba(59,130,246,.22)' : 'rgba(37,99,235,.2)')}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .4s, border-color .4s',
              }}>
                <img
                  src="/img/Insignia.png"
                  style={{ width: '76px', height: '76px', objectFit: 'contain', filter: isAcademy ? (dark ? 'drop-shadow(0 0 14px rgba(129,140,248,.6))' : 'drop-shadow(0 0 10px rgba(99,102,241,.4))') : (dark ? 'drop-shadow(0 0 14px rgba(59,130,246,.55))' : 'drop-shadow(0 0 10px rgba(37,99,235,.35))'), transition: 'filter .4s' }}
                  alt="Olea"
                />
              </div>
            </div>

            {/* Wordmark */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <img
                src="/img/OLEACONTROLS.png"
                style={{ height: '26px', objectFit: 'contain', filter: C.logoFilter, transition: 'filter .35s' }}
                alt="Olea Controls"
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ height: '1px', width: '18px', background: isAcademy ? (dark ? 'rgba(129,140,248,.4)' : 'rgba(99,102,241,.32)') : (dark ? 'rgba(59,130,246,.38)' : 'rgba(37,99,235,.3)'), transition: 'background .4s' }} />
                <span className="lp-display" style={{ fontSize: '8.5px', color: isAcademy ? AC.accent : C.blue, letterSpacing: '.42em', textTransform: 'uppercase', opacity: .85, transition: 'color .4s' }}>
                  Sistema de Operaciones Global
                </span>
                <div style={{ height: '1px', width: '18px', background: isAcademy ? (dark ? 'rgba(129,140,248,.4)' : 'rgba(99,102,241,.32)') : (dark ? 'rgba(59,130,246,.38)' : 'rgba(37,99,235,.3)'), transition: 'background .4s' }} />
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${isAcademy ? AC.border : C.border}, transparent)`, margin: '4px 0', transition: 'background .4s' }} />

          {/* Selector de portal */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ height: '1px', flex: 1, background: isAcademy ? AC.border : C.border, transition: 'background .4s' }} />
              <span className="lp-display" style={{ fontSize: '8px', color: isAcademy ? AC.muted : C.muted, letterSpacing: '.32em', textTransform: 'uppercase' }}>
                Portal de Acceso
              </span>
              <div style={{ height: '1px', flex: 1, background: isAcademy ? AC.border : C.border, transition: 'background .4s' }} />
            </div>

            {PORTALS.map(({ id, label, sub, Icon }, i) => {
              const active = portal === id;
              return (
                <button
                  key={id}
                  onClick={() => handlePortalSelect(id)}
                  className={cn('lp-pb', isAcademy && 'lp-pb-acad', `lp-s${i + 2}`, active && (isAcademy ? 'lp-pb-active-ac' : 'lp-pb-active'))}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderRadius: '12px', width: '100%' }}
                >
                  <div style={{ width: '38px', height: '38px', borderRadius: '9px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .25s', ...(active ? activeIconBox : inactiveIconBox) }}>
                    <Icon size={17} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="lp-display" style={{ fontSize: '12.5px', fontWeight: 600, color: active ? (isAcademy ? AC.accentL : C.blueL) : (isAcademy ? AC.text : C.text), margin: 0, letterSpacing: '.02em', transition: 'color .25s' }}>
                      {label}
                    </p>
                    <p style={{ fontSize: '9.5px', color: isAcademy ? AC.muted : C.muted, margin: '2px 0 0', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                      {sub}
                    </p>
                  </div>
                  <div
                    className={active ? 'lp-dot-on' : ''}
                    style={{ width: '6px', height: '6px', borderRadius: '50%', background: active ? '#4ade80' : (isAcademy ? AC.muted + '55' : C.dotInactive), flexShrink: 0, transition: 'background .25s' }}
                  />
                </button>
              );
            })}
          </div>

          {/* Footer izquierdo */}
          <div style={{ borderTop: `1px solid ${isAcademy ? AC.border : C.border}`, paddingTop: '18px', transition: 'border-color .4s' }}>
            <p className="lp-display" style={{ fontSize: '8px', color: isAcademy ? AC.muted : C.muted, textTransform: 'uppercase', letterSpacing: '.2em', margin: 0 }}>
              Enterprise Edition
            </p>
            <p style={{ fontSize: '7.5px', color: isAcademy ? AC.dim : C.subtleText, letterSpacing: '.07em', margin: '4px 0 0', textTransform: 'uppercase', transition: 'color .4s' }}>
              Sistema General de Control de Instalaciones
            </p>
          </div>
        </div>

        {/* ════════ PANEL DERECHO ════════ */}
        <div
          className={cn('lp-panel-r lg:col-span-3', step === 1 ? 'hidden lg:flex' : 'flex')}
          style={{ flexDirection: 'column', background: isAcademy ? AC.panelBg : C.panelR, padding: '56px 60px', position: 'relative', overflow: 'hidden', transition: 'background .4s ease' }}
        >
          {/* Scanline */}
          <div className={isAcademy ? 'lp-acad-scan' : 'lp-scan-line'} />

          {/* Orbs decorativos academy */}
          {isAcademy && (<>
            <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: `radial-gradient(circle, ${dark ? 'rgba(99,102,241,.2)' : 'rgba(99,102,241,.1)'} 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-70px', left: '-50px', width: '260px', height: '260px', borderRadius: '50%', background: `radial-gradient(circle, ${dark ? 'rgba(139,92,246,.15)' : 'rgba(139,92,246,.08)'} 0%, transparent 70%)`, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: '45%', right: '-10px', width: '140px', height: '140px', borderRadius: '50%', background: `radial-gradient(circle, ${dark ? 'rgba(79,70,229,.12)' : 'rgba(79,70,229,.06)'} 0%, transparent 70%)`, pointerEvents: 'none' }} />
          </>)}

          {/* Indicador "Sistema Activo" */}
          <div style={{ position: 'absolute', top: '22px', right: '22px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="lp-dot-on" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
            <span className="lp-display" style={{ fontSize: '8.5px', color: isAcademy ? AC.muted : C.muted, letterSpacing: '.22em', textTransform: 'uppercase' }}>
              Sistema Activo
            </span>
          </div>

          {/* Botón atrás (mobile) */}
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="lg:hidden lp-display"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: isAcademy ? AC.accent : C.blue, fontSize: '10px', letterSpacing: '.2em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '28px', padding: 0 }}
            >
              <ArrowRight size={13} style={{ transform: 'rotate(180deg)' }} /> Volver a Portales
            </button>
          )}

          {/* ─────────── ACADEMY FORM ─────────── */}
          {isAcademy ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '460px', width: '100%', margin: '0 auto' }}>

              {/* Header academy */}
              <div className="lp-s1" style={{ marginBottom: '36px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

                {/* Ícono graduación con anillos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ position: 'relative', width: '84px', height: '84px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div className="lp-acad-ring"           style={{ width: '84px', height: '84px', top: 0, left: 0 }} />
                    <div className="lp-acad-ring lp-acad-ring-2" style={{ width: '84px', height: '84px', top: 0, left: 0 }} />
                    <div className="lp-acad-ring lp-acad-ring-3" style={{ width: '84px', height: '84px', top: 0, left: 0 }} />
                    <div style={{ width: '66px', height: '66px', borderRadius: '50%', background: `linear-gradient(135deg, ${AC.accentDD}, ${AC.accent})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 28px ${dark ? 'rgba(129,140,248,.55)' : 'rgba(99,102,241,.42)'}` }}>
                      <GraduationCap size={28} color="#fff" />
                    </div>
                    {/* Sparkles flotantes */}
                    <span className="lp-star-1" style={{ position: 'absolute', top: '-6px', right: '-2px', fontSize: '13px', color: AC.accentL, lineHeight: 1 }}>✦</span>
                    <span className="lp-star-2" style={{ position: 'absolute', bottom: '-4px', left: '-8px', fontSize: '10px', color: AC.accent, opacity: .75, lineHeight: 1 }}>✦</span>
                    <span className="lp-star-3" style={{ position: 'absolute', top: '50%', right: '-18px', fontSize: '8px', color: AC.accentL, opacity: .55, lineHeight: 1 }}>✦</span>
                  </div>

                  {/* Badge "Portal Académico" vertical */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ height: '2px', width: '20px', background: `linear-gradient(90deg, ${AC.accentD}, ${AC.accentL})`, borderRadius: '1px' }} />
                      <span className="lp-display" style={{ fontSize: '8.5px', color: AC.accent, letterSpacing: '.35em', textTransform: 'uppercase' }}>Portal Académico</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: AC.accentL, opacity: .6 }} />
                      <span style={{ fontSize: '11px', color: isAcademy ? AC.dim : C.dim, letterSpacing: '.04em' }}>Centro de Aprendizaje</span>
                    </div>
                  </div>
                </div>

                {/* Heading */}
                <div>
                  <h1 className="lp-display" style={{ fontSize: 'clamp(40px,5.2vw,58px)', fontWeight: 700, color: AC.text, margin: 0, lineHeight: .88, letterSpacing: '-.02em' }}>
                    OLEA<br />
                    <span style={{ color: AC.accent }}>ACADEMY</span>
                  </h1>
                  <p style={{ color: AC.dim, fontSize: '14px', margin: '14px 0 0', fontWeight: 300, lineHeight: 1.6 }}>
                    Aprende, crece y certifícate. Tu campus de conocimiento sin límites.
                  </p>
                </div>
              </div>

              {/* Formulario academy */}
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {error && (
                  <div className="lp-s1" style={{ background: AC.errBg, border: `1px solid ${AC.errBorder}`, borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', color: AC.errText, fontSize: '13px', fontWeight: 500 }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />{error}
                  </div>
                )}

                {/* Email */}
                <div className="lp-s2" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="lp-display" style={{ fontSize: '8.5px', color: AC.muted, letterSpacing: '.28em', textTransform: 'uppercase' }}>Correo Institucional</label>
                  <div className="lp-acad-iw" style={{ position: 'relative' }}>
                    <div className="lp-acad-ico" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: AC.muted, padding: '6px', borderRadius: '8px', background: AC.iconBg, transition: 'all .3s', display: 'flex', flexShrink: 0 }}>
                      <Mail size={14} />
                    </div>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@oleaacademy.com" className="lp-acad-input" style={{ width: '100%', paddingLeft: '50px', paddingRight: '16px', paddingTop: '15px', paddingBottom: '15px', borderRadius: '11px', fontSize: '13.5px' }} />
                  </div>
                </div>

                {/* Contraseña */}
                <div className="lp-s3" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="lp-display" style={{ fontSize: '8.5px', color: AC.muted, letterSpacing: '.28em', textTransform: 'uppercase' }}>Contraseña</label>
                    <button type="button" className="lp-display" style={{ fontSize: '8.5px', color: AC.accent, letterSpacing: '.14em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', opacity: .8 }}>¿Olvidaste la clave?</button>
                  </div>
                  <div className="lp-acad-iw" style={{ position: 'relative' }}>
                    <div className="lp-acad-ico" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: AC.muted, padding: '6px', borderRadius: '8px', background: AC.iconBg, transition: 'all .3s', display: 'flex' }}>
                      <Lock size={14} />
                    </div>
                    <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" className="lp-acad-input" style={{ width: '100%', paddingLeft: '50px', paddingRight: '48px', paddingTop: '15px', paddingBottom: '15px', borderRadius: '11px', fontSize: '13.5px' }} />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: AC.muted, padding: '6px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', borderRadius: '8px' }}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Recordar */}
                <div className="lp-s4" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="remember-ac" style={{ width: '15px', height: '15px', accentColor: AC.accent, cursor: 'pointer' }} />
                  <label htmlFor="remember-ac" style={{ fontSize: '13px', color: AC.muted, cursor: 'pointer', fontWeight: 400 }}>Mantener sesión activa</label>
                </div>

                {/* CTA índigo */}
                <div className="lp-s5">
                  <button type="submit" disabled={isLoggingIn} className="lp-acad-btn" style={{ width: '100%', padding: '17px', borderRadius: '11px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '6px' }}>
                    {isLoggingIn ? <div className="lp-spinner" /> : (<><GraduationCap size={15} />Acceder al Campus<ArrowRight size={15} /></>)}
                  </button>
                </div>
              </form>
            </div>

          ) : (
            /* ─────────── FORM ESTÁNDAR ─────────── */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '460px', width: '100%', margin: '0 auto' }}>

              {/* Encabezado */}
              <div className="lp-s1" style={{ marginBottom: '44px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <div style={{ height: '2px', width: '24px', background: `linear-gradient(90deg, ${C.blue}, ${C.blueL})`, borderRadius: '1px' }} />
                  <span className="lp-display" style={{ fontSize: '9px', color: C.blue, letterSpacing: '.38em', textTransform: 'uppercase' }}>Autenticación Segura</span>
                </div>
                <h1 className="lp-display" style={{ fontSize: 'clamp(42px,5.5vw,60px)', fontWeight: 700, color: C.text, margin: 0, lineHeight: .88, letterSpacing: '-.02em', transition: 'color .35s' }}>
                  ACCESO<br /><span style={{ color: C.blue }}>AL SISTEMA</span>
                </h1>
                <p style={{ color: C.dim, fontSize: '14.5px', margin: '18px 0 0', fontWeight: 300, letterSpacing: '.01em', lineHeight: 1.55, transition: 'color .35s' }}>
                  Bienvenido de nuevo. Identifique sus credenciales para continuar.
                </p>
              </div>

              {/* Formulario estándar */}
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {error && (
                  <div className="lp-s1" style={{ background: C.errorBg, border: `1px solid ${C.errorBorder}`, borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', color: C.errorText, fontSize: '13px', fontWeight: 500 }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />{error}
                  </div>
                )}

                <div className="lp-s2" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <label className="lp-display" style={{ fontSize: '8.5px', color: C.muted, letterSpacing: '.28em', textTransform: 'uppercase' }}>Correo Electrónico</label>
                  <div className="lp-iw" style={{ position: 'relative' }}>
                    <div className="lp-ico" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: C.muted, padding: '6px', borderRadius: '8px', background: C.iconBg, transition: 'all .3s', display: 'flex', flexShrink: 0 }}>
                      <Mail size={14} />
                    </div>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@oleacontrols.com" className="lp-input" style={{ width: '100%', paddingLeft: '50px', paddingRight: '16px', paddingTop: '15px', paddingBottom: '15px', borderRadius: '11px', fontSize: '13.5px' }} />
                  </div>
                </div>

                <div className="lp-s3" style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="lp-display" style={{ fontSize: '8.5px', color: C.muted, letterSpacing: '.28em', textTransform: 'uppercase' }}>Contraseña</label>
                    <button type="button" className="lp-display" style={{ fontSize: '8.5px', color: C.blue, letterSpacing: '.14em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', opacity: .8 }}>¿Olvidaste la clave?</button>
                  </div>
                  <div className="lp-iw" style={{ position: 'relative' }}>
                    <div className="lp-ico" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: C.muted, padding: '6px', borderRadius: '8px', background: C.iconBg, transition: 'all .3s', display: 'flex' }}>
                      <Lock size={14} />
                    </div>
                    <input type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" className="lp-input" style={{ width: '100%', paddingLeft: '50px', paddingRight: '48px', paddingTop: '15px', paddingBottom: '15px', borderRadius: '11px', fontSize: '13.5px' }} />
                    <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: C.muted, padding: '6px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', borderRadius: '8px', transition: 'color .2s' }}>
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div className="lp-s4" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="remember" style={{ width: '15px', height: '15px', accentColor: C.blue, cursor: 'pointer' }} />
                  <label htmlFor="remember" style={{ fontSize: '13px', color: C.muted, cursor: 'pointer', fontWeight: 400 }}>Mantener sesión activa</label>
                </div>

                <div className="lp-s5">
                  <button type="submit" disabled={isLoggingIn} className="lp-cta-btn" style={{ width: '100%', padding: '17px', borderRadius: '11px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '6px' }}>
                    {isLoggingIn ? <div className="lp-spinner" /> : (<><Shield size={15} />Validar Credenciales<ArrowRight size={15} /></>)}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Footer derecho */}
          <div className="lp-s7" style={{ marginTop: 'auto', paddingTop: '28px', borderTop: `1px solid ${isAcademy ? AC.border : C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="lp-display" style={{ fontSize: '8px', color: isAcademy ? AC.muted : C.copyright, textTransform: 'uppercase', letterSpacing: '.22em', opacity: .6 }}>
              Olea Controls &copy; 2026
            </span>
            <button style={{ fontSize: '8px', color: isAcademy ? AC.accent : C.blue, letterSpacing: '.16em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', opacity: .75 }} className="lp-display">
              Soporte IT
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          OVERLAY DE BIENVENIDA
      ══════════════════════════════════════ */}
      {isLoggingIn && welcomeMsg && (() => {
        const displayName = user?.name || user?.firstName || 'Usuario';
        const firstName   = displayName.split(' ')[0];
        const initials    = displayName.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.overlayBg, backdropFilter: 'blur(18px)' }}>
            <div
              className="lp-overlay-card"
              style={{ background: C.panelR, padding: '52px 64px', borderRadius: '24px', border: `1px solid ${dark ? 'rgba(59,130,246,.2)' : 'rgba(37,99,235,.15)'}`, boxShadow: `0 40px 100px ${dark ? 'rgba(7,11,20,.7)' : 'rgba(30,64,175,.18)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center', minWidth: '340px' }}
            >
              {/* Avatar con anillos pulsantes */}
              <div className="lp-avatar" style={{ position: 'relative', width: '96px', height: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="lp-av-ring"   style={{ width: '96px',  height: '96px',  top: 0, left: 0 }} />
                <div className="lp-av-ring lp-av-ring-2" style={{ width: '96px', height: '96px', top: 0, left: 0 }} />
                <div className="lp-av-ring lp-av-ring-3" style={{ width: '96px', height: '96px', top: 0, left: 0 }} />
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: `linear-gradient(135deg, ${C.blueD}, ${C.blue})`,
                  boxShadow: `0 0 30px ${dark ? 'rgba(59,130,246,.45)' : 'rgba(37,99,235,.35)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0,
                }}>
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={displayName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    />
                  ) : (
                    <span className="lp-display" style={{ fontSize: '26px', fontWeight: 700, color: '#fff', letterSpacing: '.04em' }}>
                      {initials}
                    </span>
                  )}
                </div>
              </div>

              {/* Texto */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p className="lp-display lp-ov-label" style={{ fontSize: '10px', color: C.blue, letterSpacing: '.4em', textTransform: 'uppercase', margin: 0, opacity: .85 }}>
                  Bienvenido de vuelta
                </p>
                <p className="lp-display lp-ov-name" style={{ fontSize: '32px', fontWeight: 700, color: C.text, margin: 0, letterSpacing: '-.01em', lineHeight: 1.1 }}>
                  {firstName}
                </p>
                {displayName.includes(' ') && (
                  <p className="lp-ov-name" style={{ fontSize: '13px', color: C.muted, margin: 0, fontWeight: 400, letterSpacing: '.01em' }}>
                    {displayName.split(' ').slice(1).join(' ')}
                  </p>
                )}
              </div>

              {/* Divisor */}
              <div style={{ width: '100%', height: '1px', background: `linear-gradient(90deg, transparent, ${C.border}, transparent)` }} />

              {/* Estado + barra */}
              <div className="lp-ov-sub" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} className="lp-dot-on" />
                  <span className="lp-display" style={{ fontSize: '9px', color: C.muted, letterSpacing: '.25em', textTransform: 'uppercase' }}>
                    Acceso verificado · Cargando entorno
                  </span>
                </div>
                <div className="lp-progress-bar" style={{ width: '100%' }}>
                  <div className="lp-progress-fill" />
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
