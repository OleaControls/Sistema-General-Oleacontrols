// ── Horario laboral y reglas de puntualidad ──────────────────────────────────
// Entrada 09:00 · Salida 18:00
//   09:00 – 09:04  → A tiempo  (verde)
//   09:05 – 09:09  → Retardo   (amarillo)
//   09:10 en adelante → Tarde  (rojo)

export const SHIFT_START = '09:00';
export const SHIFT_END   = '18:00';

export const GRACE_MIN = 5;   // minutos de tolerancia antes de contar retardo
export const LATE_MIN  = 10;  // minutos a partir de los cuales ya es "tarde"

export const SHIFT_LABEL = `${SHIFT_START} – ${SHIFT_END}`;

// "HH:MM" → minutos desde medianoche. null si el formato no es válido.
export const toMinutes = (hm) => {
  if (!hm || typeof hm !== 'string') return null;
  const [h, m] = hm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

// Minutos de retardo respecto a la hora de entrada (0 si llegó puntual o antes)
export const minutesLate = (checkInTime) => {
  const t = toMinutes(checkInTime);
  if (t === null) return null;
  return Math.max(0, t - toMinutes(SHIFT_START));
};

/**
 * Estado de puntualidad de la entrada.
 * @returns {{ key: 'ontime'|'retardo'|'tarde', tone: 'emerald'|'amber'|'rose',
 *             label: string, minutesLate: number, detail: string|null } | null}
 */
export const getCheckInStatus = (checkInTime) => {
  const late = minutesLate(checkInTime);
  if (late === null) return null;

  if (late < GRACE_MIN) {
    const early = toMinutes(SHIFT_START) - toMinutes(checkInTime);
    return {
      key: 'ontime', tone: 'emerald', label: 'A tiempo', minutesLate: late,
      detail: early > 0 ? `${early} min antes` : null,
    };
  }
  if (late < LATE_MIN) {
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
 * Estado de la salida respecto a las 18:00.
 * @returns {{ key: 'complete'|'early', tone: 'blue'|'amber',
 *             label: string, minutesEarly: number, detail: string|null } | null}
 */
export const getCheckOutStatus = (checkOutTime) => {
  const t = toMinutes(checkOutTime);
  if (t === null) return null;
  const early = toMinutes(SHIFT_END) - t;
  if (early > 0) {
    return { key: 'early', tone: 'amber', label: 'Salida anticipada', minutesEarly: early, detail: `${early} min antes` };
  }
  return { key: 'complete', tone: 'blue', label: 'Turno completo', minutesEarly: 0, detail: null };
};

// Duración de la jornada — soporta cruce de medianoche
export const workedLabel = (checkInTime, checkOutTime) => {
  const a = toMinutes(checkInTime);
  const b = toMinutes(checkOutTime);
  if (a === null || b === null) return null;
  let mins = b - a;
  if (mins < 0) mins += 24 * 60;
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
};
