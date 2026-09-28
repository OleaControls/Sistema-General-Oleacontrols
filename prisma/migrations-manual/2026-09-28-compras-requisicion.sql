-- ═══════════════════════════════════════════════════════════════════════════
-- LIGAR LAS PARTIDAS DE COMPRA CON LA REQUISICIÓN
--
-- Una requisición (ProjectResourceRequest) dice qué se necesita y cuánto:
-- "50 m de cable THW cal. 12". Hasta ahora nada conectaba eso con lo que
-- realmente se compró, así que no había forma de saber cuánto faltaba por
-- surtir salvo revisando las órdenes a mano.
--
-- Esta columna hace esa conexión: cada partida de una orden de compra puede
-- apuntar al renglón de requisición que surte.
--
-- POR QUÉ NO HAY COLUMNA "CANTIDAD SURTIDA"
-- Lo surtido se SUMA al leer, desde las partidas de órdenes autorizadas. Un
-- contador guardado tendría que actualizarse en cada aprobación, cancelación,
-- reapertura y edición de partidas; el día que se olvide uno de esos caminos,
-- el número queda mintiendo y nadie se entera. Sumando al vuelo no hay nada
-- que se pueda desfasar.
--
-- QUÉ CUENTA COMO SURTIDO
-- Solo las órdenes de APROBADA en adelante (APROBADA, ENVIADA, RECIBIDA,
-- FACTURADA, PAGADA). Un borrador o una orden esperando firma todavía no
-- comprometen nada, y una rechazada o cancelada no compró nunca.
--
--   node prisma/migrations-manual/aplicar.mjs 2026-09-28-compras-requisicion.sql
--
-- Idempotente: correrlo dos veces no rompe ni duplica.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE "PurchaseOrderItem"
  ADD COLUMN IF NOT EXISTS "resourceRequestId" TEXT;

-- ON DELETE SET NULL: si se borra una requisición, la orden de compra sigue
-- existiendo —ese dinero se gastó de verdad— y la partida solo se queda sin
-- renglón al que descontar.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PurchaseOrderItem_resourceRequestId_fkey'
  ) THEN
    ALTER TABLE "PurchaseOrderItem"
      ADD CONSTRAINT "PurchaseOrderItem_resourceRequestId_fkey"
      FOREIGN KEY ("resourceRequestId") REFERENCES "ProjectResourceRequest"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_resourceRequestId_idx"
  ON "PurchaseOrderItem"("resourceRequestId");

COMMIT;

-- ── Comprobación ────────────────────────────────────────────────────────────
-- Lo surtido de cada renglón de requisición de un proyecto:
--
-- SELECT r.id, r.name, r.quantity AS solicitado,
--        COALESCE(SUM(i.quantity), 0) AS surtido
--   FROM "ProjectResourceRequest" r
--   LEFT JOIN "PurchaseOrderItem" i ON i."resourceRequestId" = r.id
--   LEFT JOIN "PurchaseOrder" o     ON o.id = i."purchaseOrderId"
--        AND o.status IN ('APROBADA','ENVIADA','RECIBIDA','FACTURADA','PAGADA')
--  WHERE r."projectId" = 'EL-PROYECTO'
--  GROUP BY r.id, r.name, r.quantity;
