-- ═══════════════════════════════════════════════════════════════════════════
-- SUSCRIPCIONES WEB PUSH
--
-- La campana y el socket solo avisan con la app abierta. Esta tabla guarda,
-- por cada navegador o celular donde alguien activo los avisos, la direccion a
-- la que el servidor le manda el push. Asi llega aunque la app este cerrada.
--
-- Sin trigger de realtime a proposito: nadie en pantalla necesita enterarse
-- de que otro activo sus avisos.
--
--   node prisma/migrations-manual/aplicar.mjs 2026-09-29-suscripciones-push.sql
--
-- Es idempotente: correrlo dos veces no rompe ni duplica.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS "SuscripcionPush" (
  "id"         TEXT         NOT NULL,
  "empleadoId" TEXT         NOT NULL,
  "endpoint"   TEXT         NOT NULL,
  "p256dh"     TEXT         NOT NULL,
  "auth"       TEXT         NOT NULL,
  "userAgent"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SuscripcionPush_pkey" PRIMARY KEY ("id")
);

-- Si se borra el empleado se van sus dispositivos.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SuscripcionPush_empleadoId_fkey') THEN
    ALTER TABLE "SuscripcionPush"
      ADD CONSTRAINT "SuscripcionPush_empleadoId_fkey"
      FOREIGN KEY ("empleadoId") REFERENCES "Employee"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SuscripcionPush_endpoint_key"
  ON "SuscripcionPush" ("endpoint");

-- La consulta de cada envio: los dispositivos de estas personas.
CREATE INDEX IF NOT EXISTS "SuscripcionPush_empleadoId_idx"
  ON "SuscripcionPush" ("empleadoId");

COMMIT;
