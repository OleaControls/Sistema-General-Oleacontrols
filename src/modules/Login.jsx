import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/store/AuthContext';
import {
  LayoutGrid, User, ArrowRight,
  Lock, Mail, AlertCircle, Eye, EyeOff, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Imagen de fondo ───────────────────────────────────────────────────────
   Coloca tu imagen en /public/img/login-bg.jpg
   (o cambia BG_IMAGE por la ruta que prefieras)
─────────────────────────────────────────────────────────────────────────── */
const BG_IMAGE = '/img/login/4920575930762202433.jpg';

/* ─── CSS global ─────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400;600;700&family=Inter:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  .lp-display { font-family: 'Chakra Petch', sans-serif !important; }
  .lp-body    { font-family: 'Inter', sans-serif !important; }

  /* ── Scrollbar oculta ── */
  .lp-noscroll::-webkit-scrollbar { display: none; }
  .lp-noscroll { -ms-overflow-style: none; scrollbar-width: none; }

  /* ── Animaciones ── */
  @keyframes lp-ring {
    0%   { transform: scale(1);   opacity: .6; }
    100% { transform: scale(2.8); opacity: 0;  }
  }
  .lp-ring {
    position: absolute; inset: 0; border-radius: 50%;
    border: 1px solid rgba(59,130,246,.5);
    animation: lp-ring 3s ease-out infinite;
  }
  .lp-ring-2 { animation-delay: 1s; }
  .lp-ring-3 { animation-delay: 2s; }

  @keyframes lp-scan {
    0%   { top: -1px; opacity: 0; }
    5%   { opacity: 1; }
    95%  { opacity: .6; }
    100% { top: 100%;  opacity: 0; }
  }
  .lp-scan {
    position: absolute; left: 0; right: 0; height: 1px;
    pointer-events: none; z-index: 4;
    background: linear-gradient(90deg,
      transparent 0%,
      rgba(96,165,250,.5) 30%,
      rgba(147,197,253,.9) 50%,
      rgba(96,165,250,.5) 70%,
      transparent 100%);
    animation: lp-scan 6s linear infinite;
  }

  @keyframes lp-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  .lp-btn {
    background: linear-gradient(110deg,
      #1e3a8a 0%, #2563eb 28%, #93c5fd 50%, #2563eb 72%, #1e3a8a 100%);
    background-size: 200% auto;
    animation: lp-shimmer 3.5s linear infinite;
    color: #fff; border: none; cursor: pointer;
    font-family: 'Chakra Petch', sans-serif; font-weight: 700;
    letter-spacing: .16em; text-transform: uppercase;
    transition: transform .2s, box-shadow .2s, opacity .2s;
  }
  .lp-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 20px 50px rgba(37,99,235,.55);
  }
  .lp-btn:active:not(:disabled) { transform: translateY(0); }
  .lp-btn:disabled { opacity: .5; cursor: not-allowed; }

  /* ── Inputs glass ── */
  .lp-input {
    background: rgba(5,10,30,.65);
    border: 1px solid rgba(255,255,255,.15);
    color: #f1f5f9;
    font-family: 'Inter', sans-serif; font-weight: 400;
    outline: none; transition: all .25s;
  }
  .lp-input::placeholder { color: rgba(255,255,255,.45); }
  .lp-input:focus {
    background: rgba(59,130,246,.08);
    border-color: #93c5fd;
    box-shadow: 0 0 0 3px rgba(59,130,246,.12);
  }
  .lp-iw:focus-within .lp-ico {
    color: #60a5fa !important;
    background: rgba(59,130,246,.18) !important;
  }

  /* ── Portal buttons ── */
  .lp-pb {
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    cursor: pointer; text-align: left;
    transition: all .22s;
  }
  .lp-pb:hover {
    background: rgba(59,130,246,.1);
    border-color: rgba(96,165,250,.28);
  }
  @keyframes lp-glow {
    0%,100% { box-shadow: 0 0 18px rgba(37,99,235,.25); }
    50%      { box-shadow: 0 0 36px rgba(37,99,235,.5);  }
  }
  .lp-pb-active {
    background: rgba(37,99,235,.18) !important;
    border-color: rgba(96,165,250,.5) !important;
    animation: lp-glow 2.2s ease-in-out infinite;
  }

  /* ── Entradas escalonadas ── */
  @keyframes lp-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  .lp-s1 { animation: lp-up .5s ease .05s both; }
  .lp-s2 { animation: lp-up .5s ease .12s both; }
  .lp-s3 { animation: lp-up .5s ease .19s both; }
  .lp-s4 { animation: lp-up .5s ease .26s both; }
  .lp-s5 { animation: lp-up .5s ease .33s both; }
  .lp-s6 { animation: lp-up .5s ease .40s both; }
  .lp-s7 { animation: lp-up .5s ease .47s both; }

  /* ── Dot pulsante ── */
  @keyframes lp-dot { 0%,100% { opacity:1; } 50% { opacity:.2; } }
  .lp-dot { animation: lp-dot 2s ease-in-out infinite; }

  /* ── Spinner ── */
  @keyframes lp-spin { to { transform: rotate(360deg); } }
  .lp-spinner {
    width: 20px; height: 20px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,.25);
    border-top-color: #fff;
    animation: lp-spin .8s linear infinite;
  }

  /* ── Overlay welcome ── */
  @keyframes lp-zin {
    from { opacity:0; transform:scale(.92); }
    to   { opacity:1; transform:scale(1);   }
  }
  .lp-wcard { animation: lp-zin .4s ease both; }

  @keyframes lp-avatar-in {
    0%   { transform: scale(.5); opacity: 0; }
    70%  { transform: scale(1.08); }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes lp-text-in {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes lp-progress {
    from { width: 0%; }
    to   { width: 100%; }
  }
  @keyframes lp-av-ring {
    0%   { transform: scale(1);   opacity: .5; }
    100% { transform: scale(1.9); opacity: 0;  }
  }
  .lp-av-ring {
    position: absolute; inset: 0; border-radius: 50%;
    border: 1.5px solid rgba(59,130,246,.5);
    animation: lp-av-ring 2s ease-out infinite;
  }
  .lp-av-ring-2 { animation-delay: .66s; }
  .lp-av-ring-3 { animation-delay: 1.32s; }
  .lp-avatar   { animation: lp-avatar-in .6s cubic-bezier(.34,1.56,.64,1) .1s both; }
  .lp-ov-lbl   { animation: lp-text-in .5s ease .3s  both; }
  .lp-ov-name  { animation: lp-text-in .5s ease .55s both; }
  .lp-ov-sub   { animation: lp-text-in .5s ease .75s both; }
  .lp-pbar {
    height: 3px; border-radius: 2px; overflow: hidden;
    background: rgba(255,255,255,.08);
  }
  .lp-pfill {
    height: 100%; border-radius: 2px;
    background: linear-gradient(90deg, #1d4ed8, #60a5fa);
    animation: lp-progress 4.6s ease .3s both;
  }

  /* ── Línea diagonal decorativa en panel izquierdo ── */
  .lp-diag {
    position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(135deg,
      transparent 40%,
      rgba(59,130,246,.06) 40%,
      rgba(59,130,246,.06) 60%,
      transparent 60%);
  }
`;

const PORTALS = [
  { id: 'SUPERVISOR',   label: 'Portal de Operaciones', sub: 'Gestión de Negocio',         Icon: LayoutGrid },
  { id: 'COLLABORATOR', label: 'Portal Colaborador',     sub: 'Mi Perfil RH y Solicitudes', Icon: User       },
];

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTE
═══════════════════════════════════════════════════════════════════════════ */
export default function Login() {
  const { loginWithCredentials, user } = useAuth();
  const navigate = useNavigate();

  const [portal,      setPortal]      = useState('SUPERVISOR');
  const [step,        setStep]        = useState(1);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [welcomeMsg,  setWelcomeMsg]  = useState(null);
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [error,       setError]       = useState(null);

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
        setWelcomeMsg('Acceso concedido.');
        setTimeout(() => {
          if (portal === 'COLLABORATOR') navigate('/profile');
          else                           navigate('/');
        }, 4500);
      } else {
        setIsLoggingIn(false);
        setError('Credenciales inválidas. Verifique su correo y contraseña.');
      }
    } catch {
      setIsLoggingIn(false);
      setError('Error de conexión. Intente nuevamente.');
    }
  };

  /* ── Render ── */
  return (
    <div
      className="lp-body"
      style={{
        height: '100vh', width: '100vw',
        display: 'flex', overflow: 'hidden',
        position: 'relative',
        backgroundImage: `url('${BG_IMAGE}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'left center',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* ── Overlay oscuro sobre imagen ── */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to right, rgba(2,6,23,.3) 0%, rgba(4,10,28,.35) 42%, rgba(2,8,28,.45) 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Orb azul top-right ── */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: '55vw', height: '55vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,.18) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* ── Orb azul bottom-left ── */}
      <div style={{
        position: 'absolute', bottom: '-20%', left: '-10%',
        width: '45vw', height: '45vw', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,.1) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* ══════════════════════════════════════════════════════════════════════
          LAYOUT  2 columnas
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="grid grid-cols-1 lg:grid-cols-5"
        style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}
      >

        {/* ══════════════════════════════════════
            PANEL IZQUIERDO — Marca + Portales
        ══════════════════════════════════════ */}
        <div
          className={cn('lg:col-span-2', step === 2 ? 'hidden lg:flex' : 'flex')}
          style={{
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px 44px',
            height: '100%',
            background: 'rgba(2,6,20,.15)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            borderRight: '1px solid rgba(255,255,255,.1)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Línea diagonal decorativa */}
          <div className="lp-diag" />

          {/* ── BRAND ── */}
          <div className="lp-s1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', textAlign: 'center' }}>

            {/* Insignia con anillos */}
            <div style={{ position: 'relative', width: '140px', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="lp-ring"   style={{ width: '140px', height: '140px', top: 0, left: 0 }} />
              <div className="lp-ring lp-ring-2" style={{ width: '140px', height: '140px', top: 0, left: 0 }} />
              <div className="lp-ring lp-ring-3" style={{ width: '140px', height: '140px', top: 0, left: 0 }} />
              <div style={{
                width: '110px', height: '110px', borderRadius: '50%',
                background: 'rgba(37,99,235,.12)',
                border: '1px solid rgba(96,165,250,.25)',
                backdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img
                  src="/img/Insignia.png"
                  style={{ width: '72px', height: '72px', objectFit: 'contain', filter: 'drop-shadow(0 0 18px rgba(96,165,250,.7))' }}
                  alt="Olea"
                />
              </div>
            </div>

            {/* Logo wordmark */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <img
                src="/img/OLEACONTROLS.png"
                style={{ height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1) opacity(.92)' }}
                alt="Olea Controls"
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ height: '1px', width: '22px', background: 'rgba(96,165,250,.4)' }} />
                <span className="lp-display" style={{ fontSize: '8px', color: 'rgba(255,255,255,.9)', letterSpacing: '.45em', textTransform: 'uppercase' }}>
                  Sistema de Operaciones Global
                </span>
                <div style={{ height: '1px', width: '22px', background: 'rgba(96,165,250,.4)' }} />
              </div>
            </div>
          </div>

          {/* ── SELECTOR DE PORTAL ── */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '14px' }}>

            {/* Label sección */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,.08)' }} />
              <span className="lp-display" style={{ fontSize: '8px', color: 'rgba(255,255,255,.9)', letterSpacing: '.35em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                Selecciona tu Portal
              </span>
              <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,.08)' }} />
            </div>

            {PORTALS.map(({ id, label, sub, Icon }, i) => {
              const active = portal === id;
              return (
                <button
                  key={id}
                  onClick={() => handlePortalSelect(id)}
                  className={cn('lp-pb', `lp-s${i + 2}`, active && 'lp-pb-active')}
                  style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', borderRadius: '14px', width: '100%' }}
                >
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '11px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? 'rgba(37,99,235,.28)' : 'rgba(255,255,255,.05)',
                    border: `1px solid ${active ? 'rgba(96,165,250,.5)' : 'rgba(255,255,255,.08)'}`,
                    color: active ? '#93c5fd' : 'rgba(255,255,255,.85)',
                    transition: 'all .22s',
                  }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <p className="lp-display" style={{ fontSize: '13px', fontWeight: 600, color: active ? '#e0f2fe' : '#ffffff', margin: 0, letterSpacing: '.02em', transition: 'color .22s' }}>
                      {label}
                    </p>
                    <p style={{ fontSize: '9.5px', color: 'rgba(255,255,255,.85)', margin: '3px 0 0', letterSpacing: '.06em', textTransform: 'uppercase', fontFamily: 'Inter, sans-serif' }}>
                      {sub}
                    </p>
                  </div>
                  <div
                    className={active ? 'lp-dot' : ''}
                    style={{ width: '7px', height: '7px', borderRadius: '50%', background: active ? '#4ade80' : 'rgba(255,255,255,.15)', flexShrink: 0, transition: 'background .22s' }}
                  />
                </button>
              );
            })}
          </div>

          {/* ── FOOTER ── */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,.07)', paddingTop: '20px' }}>
            <p className="lp-display" style={{ fontSize: '8px', color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', letterSpacing: '.22em', margin: 0 }}>
              Enterprise Edition · © 2026 Olea Controls
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════
            PANEL DERECHO — Formulario
        ══════════════════════════════════════ */}
        <div
          className={cn('lp-noscroll lg:col-span-3', step === 1 ? 'hidden lg:flex' : 'flex')}
          style={{
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '56px clamp(32px, 6vw, 96px)',
            height: '100%',
            overflowY: 'auto',
            background: 'rgba(3,8,22,.35)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            position: 'relative',
          }}
        >
          {/* Scanline */}
          <div className="lp-scan" />

          {/* Indicador sistema activo */}
          <div style={{ position: 'absolute', top: '24px', right: '28px', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div className="lp-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
            <span className="lp-display" style={{ fontSize: '8px', color: 'rgba(255,255,255,.85)', letterSpacing: '.25em', textTransform: 'uppercase' }}>
              Sistema Activo
            </span>
          </div>

          {/* Botón atrás (mobile) */}
          {step === 2 && (
            <button
              onClick={() => setStep(1)}
              className="lg:hidden lp-display"
              style={{ position: 'absolute', top: '22px', left: '28px', display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontSize: '10px', letterSpacing: '.2em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <ArrowRight size={13} style={{ transform: 'rotate(180deg)' }} /> Portales
            </button>
          )}

          {/* ── Contenedor centrado del formulario ── */}
          <div style={{ maxWidth: '440px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0' }}>

            {/* Cabecera */}
            <div className="lp-s1" style={{ marginBottom: '48px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <div style={{ height: '2px', width: '28px', background: 'linear-gradient(90deg, #2563eb, #60a5fa)', borderRadius: '2px' }} />
                <span className="lp-display" style={{ fontSize: '9px', color: '#60a5fa', letterSpacing: '.4em', textTransform: 'uppercase' }}>
                  Autenticación Segura
                </span>
              </div>

              <h1 className="lp-display" style={{ fontSize: 'clamp(44px, 5.5vw, 64px)', fontWeight: 700, color: '#f8fafc', margin: '0 0 4px', lineHeight: .85, letterSpacing: '-.02em', textShadow: '0 2px 24px rgba(0,0,0,.9), 0 0 60px rgba(0,0,0,.7)' }}>
                ACCESO
              </h1>
              <h1 className="lp-display" style={{ fontSize: 'clamp(44px, 5.5vw, 64px)', fontWeight: 700, color: '#3b82f6', margin: '0 0 20px', lineHeight: .85, letterSpacing: '-.02em', textShadow: '0 2px 24px rgba(0,0,0,.9), 0 0 40px rgba(37,99,235,.5)' }}>
                AL SISTEMA
              </h1>
              <p style={{ color: '#ffffff', fontSize: '14px', margin: 0, fontWeight: 300, lineHeight: 1.6, textShadow: '0 1px 12px rgba(0,0,0,.9)' }}>
                Bienvenido. Ingrese sus credenciales para continuar.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="lp-s1" style={{ marginBottom: '20px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', color: '#fca5a5', fontSize: '13px' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />{error}
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Email */}
              <div className="lp-s2" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="lp-display" style={{ fontSize: '8.5px', color: 'rgba(255,255,255,.9)', letterSpacing: '.3em', textTransform: 'uppercase' }}>
                  Correo Electrónico
                </label>
                <div className="lp-iw" style={{ position: 'relative' }}>
                  <div className="lp-ico" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.8)', padding: '7px', borderRadius: '9px', background: 'rgba(255,255,255,.05)', transition: 'all .25s', display: 'flex' }}>
                    <Mail size={14} />
                  </div>
                  <input
                    type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="usuario@oleacontrols.com"
                    className="lp-input"
                    style={{ width: '100%', paddingLeft: '52px', paddingRight: '18px', paddingTop: '16px', paddingBottom: '16px', borderRadius: '12px', fontSize: '14px' }}
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="lp-s3" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="lp-display" style={{ fontSize: '8.5px', color: 'rgba(255,255,255,.9)', letterSpacing: '.3em', textTransform: 'uppercase' }}>
                    Contraseña
                  </label>
                  <button type="button" className="lp-display" style={{ fontSize: '8.5px', color: 'rgba(96,165,250,.7)', letterSpacing: '.14em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}>
                    ¿Olvidaste la clave?
                  </button>
                </div>
                <div className="lp-iw" style={{ position: 'relative' }}>
                  <div className="lp-ico" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.8)', padding: '7px', borderRadius: '9px', background: 'rgba(255,255,255,.05)', transition: 'all .25s', display: 'flex' }}>
                    <Lock size={14} />
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="lp-input"
                    style={{ width: '100%', paddingLeft: '52px', paddingRight: '52px', paddingTop: '16px', paddingBottom: '16px', borderRadius: '12px', fontSize: '14px' }}
                  />
                  <button
                    type="button" onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.8)', padding: '7px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', borderRadius: '8px', transition: 'color .2s' }}
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Recordar sesión */}
              <div className="lp-s4" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="remember" style={{ width: '15px', height: '15px', accentColor: '#3b82f6', cursor: 'pointer' }} />
                <label htmlFor="remember" style={{ fontSize: '13px', color: 'rgba(255,255,255,.85)', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  Mantener sesión activa
                </label>
              </div>

              {/* CTA */}
              <div className="lp-s5">
                <button
                  type="submit" disabled={isLoggingIn}
                  className="lp-btn"
                  style={{ width: '100%', padding: '18px', borderRadius: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '4px' }}
                >
                  {isLoggingIn
                    ? <div className="lp-spinner" />
                    : (<><Shield size={15} />Validar Credenciales<ArrowRight size={15} /></>)
                  }
                </button>
              </div>

            </form>

            {/* Footer form */}
            <div className="lp-s7" style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="lp-display" style={{ fontSize: '8px', color: 'rgba(255,255,255,.75)', letterSpacing: '.2em', textTransform: 'uppercase' }}>
                Olea Controls © 2026
              </span>
              <button className="lp-display" style={{ fontSize: '8px', color: '#93c5fd', letterSpacing: '.16em', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer' }}>
                Soporte IT
              </button>
            </div>
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
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,6,23,.75)', backdropFilter: 'blur(24px)' }}>
            <div
              className="lp-wcard"
              style={{
                background: 'rgba(10,18,40,.85)',
                backdropFilter: 'blur(32px)',
                padding: '52px 64px', borderRadius: '24px',
                border: '1px solid rgba(59,130,246,.2)',
                boxShadow: '0 40px 100px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '24px', textAlign: 'center', minWidth: '340px',
              }}
            >
              <div className="lp-avatar" style={{ position: 'relative', width: '96px', height: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="lp-av-ring"   style={{ width: '96px', height: '96px', top: 0, left: 0 }} />
                <div className="lp-av-ring lp-av-ring-2" style={{ width: '96px', height: '96px', top: 0, left: 0 }} />
                <div className="lp-av-ring lp-av-ring-3" style={{ width: '96px', height: '96px', top: 0, left: 0 }} />
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', boxShadow: '0 0 32px rgba(59,130,246,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {user?.avatar
                    ? <img src={user.avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : <span className="lp-display" style={{ fontSize: '26px', fontWeight: 700, color: '#fff' }}>{initials}</span>
                  }
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p className="lp-display lp-ov-lbl" style={{ fontSize: '10px', color: '#60a5fa', letterSpacing: '.4em', textTransform: 'uppercase', margin: 0, opacity: .85 }}>
                  Bienvenido de vuelta
                </p>
                <p className="lp-display lp-ov-name" style={{ fontSize: '32px', fontWeight: 700, color: '#f8fafc', margin: 0, letterSpacing: '-.01em', lineHeight: 1.1 }}>
                  {firstName}
                </p>
                {displayName.includes(' ') && (
                  <p className="lp-ov-name" style={{ fontSize: '13px', color: 'rgba(255,255,255,.85)', margin: 0, fontWeight: 300 }}>
                    {displayName.split(' ').slice(1).join(' ')}
                  </p>
                )}
              </div>

              <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,.07)' }} />

              <div className="lp-ov-sub" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div className="lp-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                  <span className="lp-display" style={{ fontSize: '9px', color: 'rgba(255,255,255,.9)', letterSpacing: '.25em', textTransform: 'uppercase' }}>
                    Acceso verificado · Cargando entorno
                  </span>
                </div>
                <div className="lp-pbar">
                  <div className="lp-pfill" />
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
