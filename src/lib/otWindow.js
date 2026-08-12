// ── Ventana horaria para crear OTs (lado cliente) ────────────────────────────
// Copia de la lógica de api/_lib/otWindow.js. Aquí solo sirve para deshabilitar
// el botón y mostrar el horario; QUIEN MANDA ES EL BACKEND, que rechaza el POST
// fuera de la ventana. Si tocas las reglas, cambia primero api/_lib/otWindow.js.

export const OT_WINDOW_KEY = 'OT_CREATION_WINDOW';

export const DEFAULT_OT_WINDOW = { enabled: false, openHour: 7, closeHour: 19 };

// Offset fijo de México (UTC-6, sin horario de verano desde 2022). Se usa el
// mismo que api/_lib/businessDay.js para que el botón y el servidor coincidan
// aunque el navegador esté en otro huso.
const BUSINESS_TZ_OFFSET_HOURS = -6;

export function normalizeWindow(raw) {
  const v = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
  const hour = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isInteger(n) && n >= 0 && n <= 23 ? n : fallback;
  };
  return {
    enabled:   Boolean(v.enabled),
    openHour:  hour(v.openHour,  DEFAULT_OT_WINDOW.openHour),
    closeHour: hour(v.closeHour, DEFAULT_OT_WINDOW.closeHour),
  };
}

export function businessHour(now = new Date()) {
  return new Date(now.getTime() + BUSINESS_TZ_OFFSET_HOURS * 3600 * 1000).getUTCHours();
}

export function isWindowOpen(raw, now = new Date()) {
  const w = normalizeWindow(raw);
  if (!w.enabled) return true;
  if (w.openHour === w.closeHour) return false;
  const h = businessHour(now);
  return w.openHour < w.closeHour
    ? (h >= w.openHour && h < w.closeHour)
    : (h >= w.openHour || h < w.closeHour);
}

const pad2 = (n) => String(n).padStart(2, '0');

export const hourLabel = (h) => `${pad2(h)}:00`;

export function windowLabel(raw) {
  const w = normalizeWindow(raw);
  return `${hourLabel(w.openHour)} a ${hourLabel(w.closeHour)}`;
}
