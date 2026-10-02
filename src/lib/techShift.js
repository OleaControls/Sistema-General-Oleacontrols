/* Horario de los técnicos — fuente única, usada por el navegador y por la API.
 *
 * Antes vivía fijo en src/modules/ots/utils/attendanceSchedule.js (09:00 –
 * 18:00) y cambiarlo pedía un deploy. Ahora se guarda en SystemConfig bajo
 * TECH_SHIFT_KEY y lo edita ADMIN o Supervisor desde Asistencia Técnicos.
 *
 * Las reglas de las ventanas (cuándo se puede marcar entrada y salida) viven
 * aquí para que la pantalla deshabilite el botón con exactamente la misma
 * cuenta con la que la API rechaza. Si las dos se separan, manda la API.
 *
 * Vive en src/ por la misma razón que src/lib/permisos.js: la API lo
 * reexporta desde api/_lib/techShift.js. Por eso aquí no se usan alias '@/'.
 */

export const TECH_SHIFT_KEY = 'TECH_SHIFT';

// Si nadie lo ha guardado todavía, este es el horario.
export const DEFAULT_TECH_SHIFT = {
  start: '10:00',
  end:   '19:00',
  graceMin: 5,            // desde aquí cuenta "retardo"
  lateMin:  10,           // desde aquí cuenta "tarde"
  checkInOpensMin:  60,   // la entrada se habilita X min antes del inicio
  checkOutOpensMin: 15,   // la salida normal se habilita X min antes del fin
  allowEarlyCheckOut: true, // antes de eso: con motivo (true) o bloqueada (false)
};

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Tolera configuraciones incompletas, nulas o con valores fuera de rango. */
export function normalizeShift(raw) {
  const v = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
  const hm = (value, fallback) => (typeof value === 'string' && HM.test(value) ? value : fallback);
  const mins = (value, fallback, max = 180) => {
    const n = parseInt(value, 10);
    return Number.isInteger(n) && n >= 0 && n <= max ? n : fallback;
  };
  const d = DEFAULT_TECH_SHIFT;
  const graceMin = mins(v.graceMin, d.graceMin);
  return {
    start: hm(v.start, d.start),
    end:   hm(v.end,   d.end),
    graceMin,
    // "Tarde" nunca puede empezar antes que "retardo".
    lateMin: Math.max(graceMin, mins(v.lateMin, d.lateMin)),
    checkInOpensMin:  mins(v.checkInOpensMin,  d.checkInOpensMin, 720),
    checkOutOpensMin: mins(v.checkOutOpensMin, d.checkOutOpensMin, 720),
    allowEarlyCheckOut: typeof v.allowEarlyCheckOut === 'boolean' ? v.allowEarlyCheckOut : d.allowEarlyCheckOut,
  };
}

// "HH:MM" → minutos desde medianoche. null si el formato no es válido.
export const hmToMinutes = (hm) => {
  if (!hm || typeof hm !== 'string') return null;
  const [h, m] = hm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

// minutos desde medianoche → "HH:MM" (da la vuelta en 24 h)
export const minutesToHM = (mins) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

// Huso de la empresa (México, UTC-6 fijo). El mismo que api/_lib/businessDay.js.
const BUSINESS_TZ_OFFSET_HOURS = -6;

/** Hora actual "HH:MM" en el huso de la empresa, sin importar dónde corra. */
export const businessNowHM = (now = Date.now()) =>
  new Date(now + BUSINESS_TZ_OFFSET_HOURS * 3600 * 1000).toISOString().slice(11, 16);

/**
 * ¿Se puede marcar la entrada a esta hora?
 * Abre `checkInOpensMin` antes del inicio y no cierra: llegar tarde se marca
 * como "tarde", no se impide.
 */
export function checkInWindow(rawShift, nowHM) {
  const s = normalizeShift(rawShift);
  const opens = hmToMinutes(s.start) - s.checkInOpensMin;
  const now = hmToMinutes(nowHM);
  return { open: now !== null && now >= opens, opensAt: minutesToHM(opens) };
}

/**
 * ¿Cómo se puede marcar la salida a esta hora?
 * - 'normal'   → dentro de la ventana (o ya pasó la hora de salida).
 * - 'early'    → antes de la ventana; pide motivo y revisión del supervisor.
 * - 'blocked'  → antes de la ventana y la salida anticipada está desactivada.
 */
export function checkOutWindow(rawShift, nowHM) {
  const s = normalizeShift(rawShift);
  const opens = hmToMinutes(s.end) - s.checkOutOpensMin;
  const now = hmToMinutes(nowHM);
  const mode = now !== null && now >= opens ? 'normal' : (s.allowEarlyCheckOut ? 'early' : 'blocked');
  return { mode, opensAt: minutesToHM(opens) };
}
