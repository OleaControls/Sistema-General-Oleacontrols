import React, { useEffect, useState } from 'react';

/* Lienzo de la pantalla de espera de la plataforma (SplashScreen).

   Criterio de diseño: nada de degradados, resplandores ni animaciones flotando.
   Tinta plana con grano, marco de página impresa, la frase en serif como cita
   editorial y los datos técnicos en mono. El único color de marca es el azul y
   solo aparece en la barra y en el cuadro del estado. */

const GRANO = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const AZUL   = '#2F6BFF';
export const TINTA  = '#0E0F11';
export const PAPEL  = '#F2F1ED';

export const CANVAS_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap');

  .lc-mono  { font-family: 'Chakra Petch', ui-monospace, monospace; }
  .lc-serif { font-family: 'Instrument Serif', Georgia, 'Times New Roman', serif; }

  /* Entradas: una sola curva, un solo gesto. Nada se mueve para siempre. */
  @keyframes lc-rise {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .lc-rise { animation: lc-rise .75s cubic-bezier(.16,1,.3,1) both; }

  @keyframes lc-fade { from { opacity: 0; } to { opacity: 1; } }
  .lc-fade { animation: lc-fade .9s ease-out both; }

  /* Cursor de terminal: parpadeo mecánico, sin suavizado. */
  @keyframes lc-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
  .lc-cursor {
    display: inline-block; width: 7px; height: 13px; margin-left: 8px;
    background: ${AZUL}; vertical-align: -2px;
    animation: lc-blink 1.1s steps(1, end) infinite;
  }

  /* Barra indeterminada: recorrido lineal, como un instrumento. */
  @keyframes lc-run { from { transform: translateX(-100%); } to { transform: translateX(400%); } }
  .lc-run { animation: lc-run 2.4s linear infinite; }

  @media (prefers-reduced-motion: reduce) {
    .lc-rise, .lc-fade, .lc-cursor, .lc-run { animation: none; opacity: 1; transform: none; }
  }
`;

const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

/** Fecha y hora reales del equipo. Un dato vivo, no un adorno. */
export function Reloj({ style }) {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  const hh = String(ahora.getHours()).padStart(2, '0');
  const mm = String(ahora.getMinutes()).padStart(2, '0');
  const dd = String(ahora.getDate()).padStart(2, '0');
  return (
    <span className="lc-mono" style={{
      fontSize: '10px', letterSpacing: '.2em', color: 'rgba(242,241,237,.4)',
      fontVariantNumeric: 'tabular-nums', ...style,
    }}>
      {hh}:{mm}  ·  {dd} {MESES[ahora.getMonth()]} {ahora.getFullYear()}
    </span>
  );
}

/** Etiqueta técnica en versalitas. */
export function Etiqueta({ children, tono = 'rgba(242,241,237,.4)', style }) {
  return (
    <span className="lc-mono" style={{
      fontSize: '10px', fontWeight: 500, letterSpacing: '.26em',
      textTransform: 'uppercase', color: tono, ...style,
    }}>
      {children}
    </span>
  );
}

/** La frase, tratada como cita: serif grande, alineada a la izquierda. */
export function Cita({ texto, style, className = '' }) {
  return (
    <p className={`lc-serif ${className}`} style={{
      margin: 0, color: PAPEL, letterSpacing: '-.01em',
      fontSize: 'clamp(27px, 5vw, 54px)', lineHeight: 1.14,
      textWrap: 'balance', ...style,
    }}>
      {texto}
    </p>
  );
}

/**
 * Página completa de espera: marco, grano, encabezado y pie fijos.
 * @param {React.ReactNode} pieIzq   estado (abajo a la izquierda)
 * @param {React.ReactNode} pieDer   avance (abajo a la derecha)
 * @param {React.ReactNode} barra    la línea a sangre del borde inferior
 */
export default function LoadingCanvas({ children, pieIzq, pieDer, barra }) {
  return (
    <div style={{
      position: 'relative', minHeight: '100vh', width: '100%',
      background: TINTA, color: PAPEL, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      padding: 'clamp(26px, 4.5vw, 60px)',
    }}>
      <style dangerouslySetInnerHTML={{ __html: CANVAS_CSS }} />

      {/* Grano de película: rompe lo plano sin ensuciar */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: GRANO, opacity: .05,
      }} />

      {/* Marco de página */}
      <div className="lc-fade" style={{
        position: 'absolute', inset: 'clamp(13px, 2vw, 26px)',
        border: '1px solid rgba(242,241,237,.09)', pointerEvents: 'none',
      }} />

      {/* Encabezado */}
      <header className="lc-fade" style={{
        position: 'relative', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
          <img src="/img/Insignia.png" alt="" style={{ width: '22px', height: '22px', objectFit: 'contain', opacity: .85 }} />
          <Etiqueta tono="rgba(242,241,237,.62)">Olea Controls</Etiqueta>
        </div>
        <Reloj />
      </header>

      {/* Cuerpo */}
      <main style={{
        position: 'relative', flex: 1,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        maxWidth: '860px', padding: 'clamp(40px, 8vh, 96px) 0',
      }}>
        {children}
      </main>

      {/* Pie */}
      <footer className="lc-fade" style={{
        position: 'relative', display: 'flex', alignItems: 'flex-end',
        justifyContent: 'space-between', gap: '16px', animationDelay: '.35s',
      }}>
        <div>{pieIzq}</div>
        <div>{pieDer}</div>
      </footer>

      {/* Línea de avance, a sangre en el borde inferior */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: '2px',
        background: 'rgba(242,241,237,.08)', overflow: 'hidden',
      }}>
        {barra}
      </div>
    </div>
  );
}
