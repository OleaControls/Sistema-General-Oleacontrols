-- ═══════════════════════════════════════════════════════════════════════════
-- FRENO A LA FUERZA BRUTA EN EL LOGIN
--
-- Hasta ahora /api/login aceptaba intentos ilimitados: con las contraseñas de
-- los empleados, eso es fuerza bruta servida. Estas dos columnas llevan la
-- cuenta de fallos por cuenta y la hora hasta la que queda bloqueada.
--
-- POR QUÉ EN LA BASE Y NO EN MEMORIA
-- La API corre en Vercel. Cada invocación puede caer en una instancia nueva, y
-- un contador en memoria se reiniciaría con ella: el atacante solo tendría que
-- esperar a un arranque en frío. En la base el contador es uno solo, lo vean
-- las instancias que lo vean.
--
-- POR QUÉ NO SE BORRA EL BLOQUEO SOLO
-- No hace falta tarea de limpieza: `bloqueadoHasta` se compara contra `now()`
-- y un login correcto pone el contador a cero. Una fila vieja no estorba.
--
--   node prisma/migrations-manual/aplicar.mjs 2026-09-28-freno-fuerza-bruta.sql
--
-- Idempotente: correrlo dos veces no rompe ni duplica.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE "Credentials"
  ADD COLUMN IF NOT EXISTS "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "bloqueadoHasta"   TIMESTAMPTZ;

COMMIT;

-- ── Comprobación ────────────────────────────────────────────────────────────
-- SELECT email, "intentosFallidos", "bloqueadoHasta" FROM "Credentials" LIMIT 5;
--
-- Para desbloquear una cuenta a mano (alguien que se bloqueó solo):
-- UPDATE "Credentials" SET "intentosFallidos" = 0, "bloqueadoHasta" = NULL
--  WHERE email = 'persona@oleacontrols.com';
