// ── Día operativo de la empresa ──────────────────────────────────────────────
// Los registros diarios (asistencia, checklist) se guardan con `date` a
// medianoche UTC del día operativo. El servidor corre en UTC, así que usar la
// fecha UTC directa hace que a partir de las 18:00 hora de México el registro
// caiga en el día siguiente. Este helper aplica el offset fijo de México
// (UTC-6, sin horario de verano desde 2022) para que "hoy" signifique lo mismo
// en el cliente, en el guardado y en las validaciones.

export const BUSINESS_TZ_OFFSET_HOURS = -6; // America/Mexico_City

/**
 * Día operativo como Date a medianoche UTC.
 * @param {Date|string|null} dateLike Fecha explícita ("2026-07-29" o Date) o
 *        null/undefined para usar el momento actual.
 */
export function businessDay(dateLike) {
  if (dateLike) {
    // Fecha explícita: se respeta tal cual, ya viene en día calendario
    const dateOnly = dateLike instanceof Date
      ? shiftToBusiness(dateLike).toISOString().slice(0, 10)
      : String(dateLike).slice(0, 10);
    return new Date(dateOnly + 'T00:00:00.000Z');
  }
  const dateOnly = shiftToBusiness(new Date()).toISOString().slice(0, 10);
  return new Date(dateOnly + 'T00:00:00.000Z');
}

function shiftToBusiness(d) {
  return new Date(d.getTime() + BUSINESS_TZ_OFFSET_HOURS * 3600 * 1000);
}
