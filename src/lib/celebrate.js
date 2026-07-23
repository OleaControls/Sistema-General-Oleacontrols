// ── Efectos de cierre de trato (ganado / perdido) ─────────────────────────────
// Todo autocontenido: Canvas para la animación y Web Audio para el sonido.
// Sin dependencias externas.

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ── Audio helpers ─────────────────────────────────────────────────────────────
function makeAudioCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { return new AC(); } catch { return null; }
}

// Fanfarria alegre (arpegio ascendente) para la venta ganada.
function playCheer() {
  const ctx = makeAudioCtx();
  if (!ctx) return;
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 · E5 · G5 · C6
  notes.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = f;
    const t = ctx.currentTime + i * 0.11;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.42);
  });
  setTimeout(() => ctx.close?.(), 1800);
}

// "Trombón triste" (womp womp womp descendente) para la venta perdida.
function playBoo() {
  const ctx = makeAudioCtx();
  if (!ctx) return;
  const seq = [
    [293.66, 0.00], // D4
    [277.18, 0.30], // C#4
    [261.63, 0.60], // C4
    [233.08, 0.92], // Bb3 (nota final más grave y larga)
  ];
  seq.forEach(([f, dt], i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 850;
    o.type = 'sawtooth';
    const t = ctx.currentTime + dt;
    const last = i === seq.length - 1;
    const dur = last ? 0.55 : 0.28;
    o.frequency.setValueAtTime(f * 1.06, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.2);
    if (last) o.frequency.exponentialRampToValueAtTime(f * 0.94, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(filt).connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  });
  setTimeout(() => ctx.close?.(), 2200);
}

// ── Canvas a pantalla completa (se autoelimina al terminar) ───────────────────
function mountCanvas() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const resize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);
  const destroy = () => {
    window.removeEventListener('resize', resize);
    canvas.remove();
  };
  return { canvas, ctx, destroy };
}

// ── Ganado: confeti + fanfarria ───────────────────────────────────────────────
export function celebrateWin({ duration = 2800, sound = true } = {}) {
  if (sound) playCheer();
  if (prefersReducedMotion()) return;

  const { canvas, ctx, destroy } = mountCanvas();
  const colors = ['#10b981', '#34d399', '#6ee7b7', '#fbbf24', '#f59e0b',
    '#3b82f6', '#60a5fa', '#a855f7', '#ec4899', '#ef4444'];
  const parts = [];

  const burst = (ox, oy, angle, spread, n) => {
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread;
      const speed = 8 + Math.random() * 9;
      parts.push({
        x: ox, y: oy,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        size: 6 + Math.random() * 7,
        color: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        shape: Math.random() > 0.5 ? 'rect' : 'circ',
        life: 1,
      });
    }
  };
  const W = canvas.width, H = canvas.height;
  // Dos chorros desde las esquinas inferiores apuntando hacia arriba y al centro
  burst(0, H, -Math.PI / 3, Math.PI / 4, 110);
  burst(W, H, -Math.PI * 2 / 3, Math.PI / 4, 110);
  // Lluvia adicional desde arriba
  for (let i = 0; i < 60; i++) {
    parts.push({
      x: Math.random() * W, y: -20,
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      size: 6 + Math.random() * 7,
      color: colors[(Math.random() * colors.length) | 0],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      shape: Math.random() > 0.5 ? 'rect' : 'circ',
      life: 1,
    });
  }

  const start = performance.now();
  const gravity = 0.26;
  const frame = (now) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.vy += gravity;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (elapsed > duration - 800) p.life -= 0.02;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (elapsed < duration) requestAnimationFrame(frame);
    else destroy();
  };
  requestAnimationFrame(frame);
}

// ── Perdido: lluvia de 👎 + destello rojo + trombón triste ────────────────────
export function mournLoss({ duration = 2600, sound = true } = {}) {
  if (sound) playBoo();
  if (prefersReducedMotion()) return;

  const { canvas, ctx, destroy } = mountCanvas();
  const emojis = ['👎', '😞', '💸'];
  const parts = [];
  const W = canvas.width, H = canvas.height;
  for (let i = 0; i < 34; i++) {
    parts.push({
      x: Math.random() * W,
      y: -40 - Math.random() * H * 0.5,
      vy: 2.5 + Math.random() * 3.5,
      size: 26 + Math.random() * 26,
      char: emojis[(Math.random() * emojis.length) | 0],
      rot: (Math.random() - 0.5) * 0.6,
      vr: (Math.random() - 0.5) * 0.05,
      sway: Math.random() * Math.PI * 2,
      life: 1,
    });
  }

  const start = performance.now();
  const frame = (now) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Destello rojo que se desvanece en el primer medio segundo
    const flash = Math.max(0, 0.18 * (1 - elapsed / 500));
    if (flash > 0) {
      ctx.fillStyle = `rgba(239,68,68,${flash})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of parts) {
      p.y += p.vy;
      p.sway += 0.05;
      p.rot += p.vr;
      if (elapsed > duration - 700) p.life -= 0.025;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x + Math.sin(p.sway) * 12, p.y);
      ctx.rotate(p.rot);
      ctx.font = `${p.size}px serif`;
      ctx.fillText(p.char, 0, 0);
      ctx.restore();
    }
    if (elapsed < duration) requestAnimationFrame(frame);
    else destroy();
  };
  requestAnimationFrame(frame);
}
