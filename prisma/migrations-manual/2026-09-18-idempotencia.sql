-- ═══════════════════════════════════════════════════════════════════════════
-- PETICIONES IDEMPOTENTES
--
-- Es la pieza que hace segura la cola offline. Sin ella, la cola hace daño:
-- el técnico manda un acta, el servidor la guarda, la respuesta se pierde por
-- el camino, la cola cree que falló y la reenvía — y queda duplicada.
--
-- El cliente genera una clave por intento y la manda en la cabecera
-- `Idempotency-Key`. Si esa clave ya se atendió, el servidor NO vuelve a
-- ejecutar nada: devuelve tal cual la respuesta que dio la primera vez.
--
-- La clave es la llave primaria a propósito: dos reenvíos simultáneos compiten
-- por insertarla y solo uno gana. El que pierde recibe un 409 en vez de
-- ejecutar el trabajo por segunda vez.
--
--   node prisma/migrations-manual/aplicar.mjs 2026-09-18-idempotencia.sql
--
-- Es idempotente: correrlo dos veces no rompe ni duplica.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS "PeticionIdempotente" (
  "clave"      TEXT         NOT NULL,
  "empleadoId" TEXT,
  "ruta"       TEXT         NOT NULL,
  "estado"     INTEGER,
  "respuesta"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PeticionIdempotente_pkey" PRIMARY KEY ("clave")
);

-- Para la limpieza periódica: las claves viejas ya no protegen de nada.
CREATE INDEX IF NOT EXISTS "PeticionIdempotente_createdAt_idx"
  ON "PeticionIdempotente" ("createdAt");

COMMIT;
