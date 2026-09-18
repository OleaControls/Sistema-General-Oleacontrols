-- ═══════════════════════════════════════════════════════════════════════════
-- CHAT INTERNO
--
-- Tres tablas: la conversación, quién está en ella, y los mensajes.
--
-- `ultimaLecturaEn` en el miembro es una marca de agua: los no leídos son los
-- mensajes posteriores a esa fecha. Se guarda una fecha y no un contador para
-- no tener que actualizar una fila por miembro cada vez que alguien escribe —
-- en un grupo de 20 personas eso serían 20 escrituras por mensaje.
--
-- `Conversacion.ultimoMensajeEn` existe por lo mismo: sin él, ordenar la lista
-- por actividad obligaría a leer el último mensaje de cada conversación, una
-- consulta por conversación cada vez que alguien abre el chat.
--
-- Solo `Mensaje` lleva trigger. La conversación y los miembros cambian poco y
-- sus avisos los cubre el propio mensaje; ponerles trigger solo añadiría ruido.
--
--   node prisma/migrations-manual/aplicar.mjs 2026-09-18-chat.sql
--
-- Es idempotente: correrlo dos veces no rompe ni duplica.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS "Conversacion" (
  "id"              TEXT         NOT NULL,
  "tipo"            TEXT         NOT NULL DEFAULT 'DIRECTA',
  "nombre"          TEXT,
  "ultimoMensajeEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creadaPorId"     TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Conversacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MiembroConversacion" (
  "id"              TEXT         NOT NULL,
  "conversacionId"  TEXT         NOT NULL,
  "empleadoId"      TEXT         NOT NULL,
  "ultimaLecturaEn" TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MiembroConversacion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Mensaje" (
  "id"             TEXT         NOT NULL,
  "conversacionId" TEXT         NOT NULL,
  "autorId"        TEXT         NOT NULL,
  "cuerpo"         TEXT         NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Mensaje_pkey" PRIMARY KEY ("id")
);

-- Nadie puede estar dos veces en la misma conversación.
CREATE UNIQUE INDEX IF NOT EXISTS "MiembroConversacion_conversacionId_empleadoId_key"
  ON "MiembroConversacion" ("conversacionId", "empleadoId");

CREATE INDEX IF NOT EXISTS "MiembroConversacion_empleadoId_idx"
  ON "MiembroConversacion" ("empleadoId");
CREATE INDEX IF NOT EXISTS "Conversacion_ultimoMensajeEn_idx"
  ON "Conversacion" ("ultimoMensajeEn");
CREATE INDEX IF NOT EXISTS "Mensaje_conversacionId_createdAt_idx"
  ON "Mensaje" ("conversacionId", "createdAt");

-- Borrar una conversación se lleva sus miembros y sus mensajes; borrar un
-- empleado lo saca de las conversaciones y se lleva lo que escribió.
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN SELECT * FROM (VALUES
    ('MiembroConversacion_conversacionId_fkey', 'MiembroConversacion', 'conversacionId', 'Conversacion'),
    ('MiembroConversacion_empleadoId_fkey',     'MiembroConversacion', 'empleadoId',     'Employee'),
    ('Mensaje_conversacionId_fkey',             'Mensaje',             'conversacionId', 'Conversacion'),
    ('Mensaje_autorId_fkey',                    'Mensaje',             'autorId',        'Employee')
  ) AS t(nombre, tabla, col, destino)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = f.nombre) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I("id") ON DELETE CASCADE ON UPDATE CASCADE',
        f.tabla, f.nombre, f.col, f.destino);
    END IF;
  END LOOP;
END $$;

-- El aviso lleva la conversación como padre. El servidor realtime resuelve
-- quiénes son sus miembros y se lo entrega solo a ellos.
DROP TRIGGER IF EXISTS trg_olea_realtime ON "Mensaje";
CREATE TRIGGER trg_olea_realtime
  AFTER INSERT ON "Mensaje"
  FOR EACH ROW EXECUTE FUNCTION olea_notificar_cambio('conversacionId');

COMMIT;
