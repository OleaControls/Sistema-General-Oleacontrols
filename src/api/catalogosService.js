import { apiFetch } from '@/lib/api';

/**
 * Catálogos de arranque (clientes de OT, plantillas, técnicos) en una petición.
 *
 * Además de juntar las tres llamadas, guarda el resultado: navegar a otra vista
 * y volver era pagar los catálogos otra vez, y no cambian de un minuto a otro.
 *
 * El TTL es corto a propósito. Lo que evita es el ir y venir entre vistas —que
 * es de donde salía el gasto—, no tener el catálogo del día en memoria: si
 * alguien da de alta un cliente desde otra pantalla, se ve al minuto. Las altas
 * y bajas hechas desde esta misma sesión no esperan nada, porque `otService`
 * llama a `invalidarCatalogos()` en cuanto escriben.
 */
const MS_VIGENCIA = 60_000;

const VACIO = { otClients: [], templates: [], tecnicos: [] };

let guardado = null;   // { datos, hasta }
let enVuelo = null;    // Promise, para no pedir dos veces a la vez

export function invalidarCatalogos() {
  guardado = null;
}

export async function getCatalogos({ forzar = false } = {}) {
  if (!forzar && guardado && guardado.hasta > Date.now()) return guardado.datos;

  // Dos componentes que montan a la vez comparten la misma petición.
  if (enVuelo) return enVuelo;

  enVuelo = apiFetch('/api/catalogos')
    .then(async (r) => {
      if (!r.ok) throw new Error(`catalogos: ${r.status}`);
      const datos = await r.json();
      guardado = { datos, hasta: Date.now() + MS_VIGENCIA };
      return datos;
    })
    .catch((err) => {
      /* Un catálogo que no carga no debe tumbar la vista: se devuelven listas
         vacías y los desplegables salen sin opciones, que es recuperable. El
         listado de OTs —lo que el usuario vino a ver— carga aparte. */
      console.error('[catalogos]', err);
      return VACIO;
    })
    .finally(() => { enVuelo = null; });

  return enVuelo;
}
