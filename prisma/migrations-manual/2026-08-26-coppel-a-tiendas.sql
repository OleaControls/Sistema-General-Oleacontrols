-- ═══════════════════════════════════════════════════════════════════════════
-- Coppel deja de ser un cliente especial y pasa a ser una marca más.
--
-- El proyecto ya no maneja UNA tienda: maneja varias, de varias cadenas. Por eso
-- el concepto "COPPEL" se generaliza a "TIENDA" y aparece un campo `brand` que
-- guarda de qué cadena es cada orden, proyecto, cita y material.
--
-- CORRER ESTE ARCHIVO ANTES DE `npx prisma db push`.
-- Si se hace al revés, `db push` ve la tabla CoppelInventory como sobrante y la
-- borra junto con todo el inventario capturado.
--
--   psql "$DATABASE_URL" -f prisma/migrations-manual/2026-08-26-coppel-a-tiendas.sql
--
-- Todo va dentro de una transacción: o pasa completo, o no pasa nada.
-- Es idempotente: correrlo dos veces no rompe ni duplica.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Clase de orden: COPPEL → TIENDA ──────────────────────────────────────
UPDATE "WorkOrder" SET "kind" = 'TIENDA' WHERE "kind" = 'COPPEL';

-- ── 2. Embudo comercial del proyecto: COPPEL → TIENDAS ──────────────────────
UPDATE "Project" SET "serviceType" = 'TIENDAS' WHERE "serviceType" = 'COPPEL';

-- ── 3. Campo Marca ──────────────────────────────────────────────────────────
ALTER TABLE "WorkOrder"     ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "Project"       ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "Appointment"   ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "WarrantyClaim" ADD COLUMN IF NOT EXISTS "brand" TEXT;

-- Lo ya capturado era todo de Coppel: se marca como tal para no perder el dato.
-- A partir de aquí cada alta escoge su marca.
UPDATE "WorkOrder"     SET "brand" = 'Coppel' WHERE "brand" IS NULL AND "kind" = 'TIENDA';
UPDATE "Project"       SET "brand" = 'Coppel' WHERE "brand" IS NULL AND "serviceType" = 'TIENDAS';
UPDATE "Appointment"   SET "brand" = 'Coppel' WHERE "brand" IS NULL;
UPDATE "WarrantyClaim" SET "brand" = 'Coppel' WHERE "brand" IS NULL;

-- ── 4. Inventario: CoppelInventory → StoreInventory ─────────────────────────
-- Rename, no drop-and-create: el material resguardado se conserva.
-- Todo va dentro del bloque porque en una base que nunca tuvo el inventario
-- (una copia limpia, un entorno de pruebas) ninguna de las dos tablas existe:
-- fuera del bloque, el ALTER de abajo tronaría y abortaría la migración
-- completa. En ese caso no hay nada que migrar y `db push` crea la tabla ya con
-- su columna `brand`.
DO $$
DECLARE
  existe_vieja BOOLEAN;
  existe_nueva BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = current_schema() AND table_name = 'CoppelInventory')
    INTO existe_vieja;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = current_schema() AND table_name = 'StoreInventory')
    INTO existe_nueva;

  IF existe_vieja AND NOT existe_nueva THEN
    ALTER TABLE "CoppelInventory" RENAME TO "StoreInventory";
    existe_nueva := TRUE;
  END IF;

  IF existe_nueva THEN
    ALTER TABLE "StoreInventory" ADD COLUMN IF NOT EXISTS "brand" TEXT;
    UPDATE "StoreInventory" SET "brand" = 'Coppel' WHERE "brand" IS NULL;
    CREATE INDEX IF NOT EXISTS "StoreInventory_brand_idx" ON "StoreInventory" ("brand");
  END IF;
END $$;

-- ── 5. Índices nuevos ───────────────────────────────────────────────────────
-- El del inventario se crea arriba, dentro del bloque, porque depende de que la
-- tabla exista.
CREATE INDEX IF NOT EXISTS "WorkOrder_brand_idx" ON "WorkOrder" ("brand");

-- El índice del inventario viejo conserva su nombre tras el rename; se alinea
-- para que `db push` no lo vea como diferencia.
ALTER INDEX IF EXISTS "CoppelInventory_name_idx" RENAME TO "StoreInventory_name_idx";
ALTER INDEX IF EXISTS "CoppelInventory_pkey"     RENAME TO "StoreInventory_pkey";

COMMIT;

-- ── Comprobación ────────────────────────────────────────────────────────────
-- Después de correrlo, esto debe devolver 0 filas:
--   SELECT 'ot' AS t, COUNT(*) FROM "WorkOrder" WHERE "kind" = 'COPPEL'
--   UNION ALL
--   SELECT 'proyecto', COUNT(*) FROM "Project" WHERE "serviceType" = 'COPPEL';
