-- ═══════════════════════════════════════════════════════════════════════════
-- CONTROL DE ENTRADA Y SALIDA DE LOS TÉCNICOS
--
-- Hasta ahora la hora de entrada y salida la mandaba el celular y la API la
-- guardaba sin revisar: un técnico podía marcar entrada a las 00:05 y cerrar
-- la jornada en el mismo minuto. Ahora la hora la pone el servidor, y:
--
-- · Una salida antes de la ventana permitida pide motivo y queda PENDIENTE
--   hasta que un supervisor la aprueba o la rechaza.
-- · Un supervisor puede corregir entrada/salida (p. ej. quien olvidó cerrar);
--   cada corrección se guarda con quién, cuándo, por qué y qué había antes.
--
--   node prisma/migrations-manual/aplicar.mjs 2026-10-02-asistencia-tecnicos-control.sql
--
-- Solo agrega columnas opcionales: el código anterior las ignora.
-- Idempotente: correrlo dos veces no rompe ni duplica.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE "TechAttendanceLog"
  ADD COLUMN IF NOT EXISTS "earlyCheckOutReason"     TEXT,
  ADD COLUMN IF NOT EXISTS "earlyCheckOutStatus"     TEXT,
  ADD COLUMN IF NOT EXISTS "earlyCheckOutReviewedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "earlyCheckOutReviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "corrections"             JSONB;

COMMIT;

-- ── Comprobación ──────────────────────────────────────────────────────────
-- Salidas anticipadas esperando revisión:
-- SELECT "techId", date, "checkInTime", "checkOutTime", "earlyCheckOutReason"
--   FROM "TechAttendanceLog" WHERE "earlyCheckOutStatus" = 'PENDIENTE';
