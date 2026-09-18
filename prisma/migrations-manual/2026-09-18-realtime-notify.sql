-- ═══════════════════════════════════════════════════════════════════════════
-- AVISOS DE CAMBIO EN TIEMPO REAL (LISTEN/NOTIFY)
--
-- Hace que Postgres avise por sí mismo cuando cambia una fila que a alguien le
-- importa ver al instante. El servidor realtime (realtime-server/server.js)
-- escucha esos avisos y los reenvía a las vistas abiertas.
--
-- POR QUÉ EN LA BASE Y NO EN LOS HANDLERS
-- Si el aviso lo mandara cada handler, habría que acordarse de ponerlo en los
-- 44 — y el día que alguien escriba desde un script, un seed o psql, nadie se
-- entera. Aquí el aviso sale de la base: da igual quién escribió.
--
-- El aviso lleva solo { tabla, op, id }, NUNCA la fila completa. Dos razones:
--   1. pg_notify corta el payload a ~8 KB; un acta con evidencias no cabe.
--   2. El cliente debe releer por la API, que ya aplica permisos por rol.
--      Mandar la fila por el socket se los saltaría.
--
-- NOTIFY es transaccional: solo se dispara al hacer COMMIT. Una transacción que
-- falla no genera avisos fantasma.
--
--   node prisma/migrations-manual/aplicar.mjs 2026-09-18-realtime-notify.sql
--
-- Todo va dentro de una transacción: o pasa completo, o no pasa nada.
-- Es idempotente: correrlo dos veces no rompe ni duplica.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. La función que manda el aviso ────────────────────────────────────────
CREATE OR REPLACE FUNCTION olea_notificar_cambio() RETURNS trigger AS $$
DECLARE
  fila record;
BEGIN
  IF (TG_OP = 'DELETE') THEN fila := OLD; ELSE fila := NEW; END IF;

  PERFORM pg_notify('olea_eventos', json_build_object(
    'tabla', TG_TABLE_NAME,
    'op',    TG_OP,
    'id',    fila.id,
    'ts',    extract(epoch from now())
  )::text);

  RETURN NULL; -- trigger AFTER: el valor de retorno se ignora
END;
$$ LANGUAGE plpgsql;

-- ── 2. Las tablas que avisan ────────────────────────────────────────────────
-- Solo las que un supervisor mira en vivo. Poner el trigger en las 63 tablas
-- llenaría el canal de ruido (cada log de asistencia, cada lectura de aviso)
-- y obligaría al cliente a filtrar avisos que nunca le sirven.
--
-- Para sumar otra tabla, basta agregar su nombre a esta lista y volver a correr
-- el archivo.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['WorkOrder', 'Project', 'Appointment', 'WarrantyClaim']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_olea_realtime ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_olea_realtime AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION olea_notificar_cambio()', t);
  END LOOP;
END $$;

COMMIT;

-- ── Comprobación ────────────────────────────────────────────────────────────
-- En una sesión:  LISTEN olea_eventos;
-- En otra:        UPDATE "WorkOrder" SET "updatedAt" = now() WHERE id = (SELECT id FROM "WorkOrder" LIMIT 1);
-- La primera debe imprimir el aviso.
--
-- OJO: `npx prisma db push` NO borra triggers ni funciones (solo toca tablas y
-- columnas), así que esto sobrevive a los db push. Pero si algún día se
-- RECREA una de estas tablas, su trigger se va con ella: vuelve a correr este
-- archivo después.
