// ── Ventana horaria para crear OTs ───────────────────────────────────────────
// El ADMIN define desde qué hora abre y a qué hora cierra la creación de OTs
// nuevas. Se guarda en SystemConfig bajo OT_WINDOW_KEY.
//
// Esta es la AUTORIDAD: el backend rechaza el POST fuera de la ventana. El
// front tiene una copia de `isWindowOpen` en src/lib/otWindow.js que solo sirve
// para deshabilitar el botón; si las dos se separan, manda esta.

import { BUSINESS_TZ_OFFSET_HOURS } from './businessDay.js';

export const OT_WINDOW_KEY = 'OT_CREATION_WINDOW';

// Deshabilitada por defecto: mientras el ADMIN no la active, nada cambia.
export const DEFAULT_OT_WINDOW = { enabled: false, openHour: 7, closeHour: 19 };

/** Tolera configuraciones incompletas, nulas o con horas fuera de rango. */
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

/**
 * Hora actual (0-23) en el huso operativo de la empresa.
 * Imprescindible: el servidor corre en UTC, así que `getHours()` daría 6 horas
 * de más y la ventana cerraría a destiempo.
 */
export function businessHour(now = new Date()) {
  return new Date(now.getTime() + BUSINESS_TZ_OFFSET_HOURS * 3600 * 1000).getUTCHours();
}

/**
 * ¿Se pueden crear OTs en este momento?
 * - Ventana normal (7 → 19): abierta si openHour <= h < closeHour.
 * - Ventana que cruza medianoche (22 → 6): abierta si h >= openHour || h < closeHour.
 * - Horas iguales: se considera cerrada siempre (el formulario no deja guardarlo).
 */
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

/** "07:00 a 19:00" — para mensajes de error y para la UI. */
export function windowLabel(raw) {
  const w = normalizeWindow(raw);
  return `${pad2(w.openHour)}:00 a ${pad2(w.closeHour)}:00`;
}
