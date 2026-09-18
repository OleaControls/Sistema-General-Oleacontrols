-- ═══════════════════════════════════════════════════════════════════════════
-- NOTIFICACIONES
--
-- Por que una tabla y no solo el socket: una notificacion que unicamente viaja
-- por el socket se pierde si el destinatario no estaba conectado. Y justo esas
-- son las que importan —"te asignaron una OT", "te aprobaron la vacacion"—,
-- porque le llegan a alguien que no estaba mirando la pantalla.
--
-- El socket es el acelerador: hace que aparezca sin recargar. La tabla es la
-- que garantiza que llegue.
--
-- El trigger manda `destinatarioId` como padre, y el servidor realtime la
-- entrega SOLO a las sesiones de esa persona: las notificaciones de cada quien
-- no viajan a las pantallas de los demas.
--
-- Se crea la tabla aqui, en vez de con `prisma db push`, para no correr un push
-- contra produccion: si el esquema tuviera cualquier deriva, push la
-- "arreglaria" sin preguntar. Los tipos son los que Prisma genera, asi que un
-- push posterior la vera igual y no la tocara.
--
--   node prisma/migrations-manual/aplicar.mjs 2026-09-18-notificaciones.sql
--
-- Es idempotente: correrlo dos veces no rompe ni duplica.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS "Notificacion" (
  "id"             TEXT         NOT NULL,
  "destinatarioId" TEXT         NOT NULL,
  "modulo"         TEXT         NOT NULL,
  "tipo"           TEXT         NOT NULL,
  "titulo"         TEXT         NOT NULL,
  "cuerpo"         TEXT,
  "enlace"         TEXT,
  "leida"          BOOLEAN      NOT NULL DEFAULT false,
  "leidaEn"        TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- Si se borra el empleado se van sus notificaciones: no le sirven a nadie mas.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notificacion_destinatarioId_fkey') THEN
    ALTER TABLE "Notificacion"
      ADD CONSTRAINT "Notificacion_destinatarioId_fkey"
      FOREIGN KEY ("destinatarioId") REFERENCES "Employee"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- La consulta de la campana: las mias, sin leer, de la mas nueva a la mas vieja.
CREATE INDEX IF NOT EXISTS "Notificacion_destinatarioId_leida_createdAt_idx"
  ON "Notificacion" ("destinatarioId", "leida", "createdAt");

-- El aviso lleva al destinatario como padre, para que el servidor lo entregue
-- solo a esa persona.
DROP TRIGGER IF EXISTS trg_olea_realtime ON "Notificacion";
CREATE TRIGGER trg_olea_realtime
  AFTER INSERT OR UPDATE OR DELETE ON "Notificacion"
  FOR EACH ROW EXECUTE FUNCTION olea_notificar_cambio('destinatarioId');

COMMIT;
