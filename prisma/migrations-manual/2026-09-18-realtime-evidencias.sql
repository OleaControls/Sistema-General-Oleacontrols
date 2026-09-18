-- ═══════════════════════════════════════════════════════════════════════════
-- AVISOS DE EVIDENCIAS, Y EL "PADRE" EN EL AVISO
--
-- Las evidencias cuelgan de una OT. Si el aviso solo dijera "cambió la
-- evidencia X", cada cliente que tuviera abierta CUALQUIER OT tendría que
-- recargar para averiguar si le tocaba — justo el gasto de consultas que
-- estamos tratando de quitar.
--
-- Por eso el aviso ahora puede llevar un campo `padre`: la columna que dice de
-- quién cuelga la fila. Se indica al crear el trigger:
--
--   ... EXECUTE FUNCTION olea_notificar_cambio('workOrderId')
--
-- Así el cliente filtra sin preguntarle nada a la base: si el padre no es la
-- OT que está viendo, ignora el aviso y no gasta una sola consulta.
--
-- Las firmas (signature, clientSignature) viven en WorkOrder, que ya tiene su
-- trigger desde la migración anterior: aparecen al instante sin tocar nada.
--
--   node prisma/migrations-manual/aplicar.mjs 2026-09-18-realtime-evidencias.sql
--
-- Compatible con los triggers ya instalados: los que no reciben argumento
-- siguen mandando `padre` en nulo, exactamente como antes.
-- Es idempotente: correrlo dos veces no rompe ni duplica.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. La función, ahora con padre opcional ─────────────────────────────────
CREATE OR REPLACE FUNCTION olea_notificar_cambio() RETURNS trigger AS $$
DECLARE
  fila  record;
  datos jsonb;
  padre text;
BEGIN
  IF (TG_OP = 'DELETE') THEN fila := OLD; ELSE fila := NEW; END IF;

  -- to_jsonb permite leer una columna cuyo nombre solo se conoce en tiempo de
  -- ejecución. Con `fila.<campo>` habría que escribir una función por tabla.
  datos := to_jsonb(fila);
  IF TG_NARGS > 0 THEN
    padre := datos ->> TG_ARGV[0];
  END IF;

  PERFORM pg_notify('olea_eventos', json_build_object(
    'tabla', TG_TABLE_NAME,
    'op',    TG_OP,
    'id',    datos ->> 'id',
    'padre', padre,
    'ts',    extract(epoch from now())
  )::text);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ── 2. Trigger de evidencias, diciendo de quién cuelgan ─────────────────────
DROP TRIGGER IF EXISTS trg_olea_realtime ON "Evidence";
CREATE TRIGGER trg_olea_realtime
  AFTER INSERT OR UPDATE OR DELETE ON "Evidence"
  FOR EACH ROW EXECUTE FUNCTION olea_notificar_cambio('workOrderId');

COMMIT;
