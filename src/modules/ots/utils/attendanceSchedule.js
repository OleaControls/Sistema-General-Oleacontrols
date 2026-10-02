// ── Horario laboral y reglas de puntualidad ──────────────────────────────────
// El horario ya no es fijo: se guarda en SystemConfig (ver src/lib/techShift.js)
// y las pantallas lo traen con useTechShift(). Con el de por defecto:
//   Entrada 10:00 · Salida 19:00
//   10:00 – 10:04  → A tiempo  (verde)
//   10:05 – 10:09  → Retardo   (amarillo)
//   10:10 en adelante → Tarde  (rojo)
//
// Todas las funciones reciben el horario como último argumento; si no se pasa,
// usan el de por defecto.

import {
  DEFAULT_TECH_SHIFT, normalizeShift, hmToMinutes as toMinutes, minutesToHM as toHM,
} from '@/lib/techShift';

export { toMinutes };

const durationLabel = (mins) => `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;

export const shiftLabel = (shift = DEFAULT_TECH_SHIFT) => {
  const s = normalizeShift(shift);
  return `${s.start} – ${s.end}`;
};

// "Retardo desde 10:05 · Tarde desde 10:10"
export const shiftRulesLabel = (shift = DEFAULT_TECH_SHIFT) => {
  const s = normalizeShift(shift);
  const start = toMinutes(s.start);
  return `Retardo desde ${toHM(start + s.graceMin)} · Tarde desde ${toHM(start + s.lateMin)}`;
};

// Minutos de retardo respecto a la hora de entrada (0 si llegó puntual o antes)
export const minutesLate = (checkInTime, shift = DEFAULT_TECH_SHIFT) => {
  const t = toMinutes(checkInTime);
  if (t === null) return null;
  return Math.max(0, t - toMinutes(normalizeShift(shift).start));
};

/**
 * Estado de puntualidad de la entrada.
 * @returns {{ key: 'ontime'|'retardo'|'tarde', tone: 'emerald'|'amber'|'rose',
 *             label: string, minutesLate: number, detail: string|null } | null}
 */
export const getCheckInStatus = (checkInTime, shift = DEFAULT_TECH_SHIFT) => {
  const s = normalizeShift(shift);
  const late = minutesLate(checkInTime, s);
  if (late === null) return null;

  if (late < s.graceMin) {
    const early = toMinutes(s.start) - toMinutes(checkInTime);
    return {
      key: 'ontime', tone: 'emerald', label: 'A tiempo', minutesLate: late,
      detail: early > 0 ? `${early} min antes` : null,
    };
  }
  if (late < s.lateMin) {
    return {
      key: 'retardo', tone: 'amber', label: 'Retardo', minutesLate: late,
      detail: `${late} min tarde`,
    };
  }
  return {
    key: 'tarde', tone: 'rose', label: 'Tarde', minutesLate: late,
    detail: `${late} min tarde`,
  };
};

/**
 * Estado de la salida respecto a la hora de salida del horario.
 * Si se pasa el log, una salida anticipada muestra su revisión (pendiente,
 * aprobada o rechazada).
 * @returns {{ key: 'complete'|'early', tone: 'blue'|'amber'|'emerald'|'rose',
 *             label: string, minutesEarly: number, overtimeMin: number,
 *             detail: string|null } | null}
 */
export const getCheckOutStatus = (checkOutTime, shift = DEFAULT_TECH_SHIFT, log = null) => {
  const t = toMinutes(checkOutTime);
  if (t === null) return null;
  const early = toMinutes(normalizeShift(shift).end) - t;
  if (early > 0) {
    const review = log?.earlyCheckOutStatus;
    const base = { key: 'early', minutesEarly: early, overtimeMin: 0, detail: `${early} min antes` };
    if (review === 'APROBADA')  return { ...base, tone: 'emerald', label: 'Salida aprobada' };
    if (review === 'RECHAZADA') return { ...base, tone: 'rose',    label: 'Salida rechazada' };
    if (review === 'PENDIENTE') return { ...base, tone: 'amber',   label: 'Salida por revisar' };
    return { ...base, tone: 'amber', label: 'Salida anticipada' };
  }
  const overtime = -early;
  return {
    key: 'complete', tone: 'blue', label: 'Turno completo', minutesEarly: 0, overtimeMin: overtime,
    detail: overtime > 0 ? `+${durationLabel(overtime)} extra` : null,
  };
};

/**
 * Jornada que quedó abierta: hay entrada, no hay salida y el día ya pasó.
 * `day` y `today` son "YYYY-MM-DD".
 */
export const isUnclosed = (log, day, today) =>
  Boolean(log?.checkInTime && !log?.checkOutTime && day < today);

// Duración de la jornada — soporta cruce de medianoche
export const workedLabel = (checkInTime, checkOutTime) => {
  const a = toMinutes(checkInTime);
  const b = toMinutes(checkOutTime);
  if (a === null || b === null) return null;
  let mins = b - a;
  if (mins < 0) mins += 24 * 60;
  return durationLabel(mins);
};
