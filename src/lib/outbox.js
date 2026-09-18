/**
 * Cola de escrituras pendientes, en IndexedDB.
 *
 * El técnico en campo pierde señal a diario. Sin esto, lo que estuviera
 * guardando en ese momento se pierde y tiene que volver a capturarlo — y si ya
 * se fue del sitio, no puede.
 *
 * Se usa IndexedDB y no localStorage por lo mismo que los borradores: un acta
 * lleva fotos y varias rebasan los ~5 MB de localStorage, que además lanza
 * QuotaExceededError justo en el caso que más duele.
 *
 * ORDEN: la cola se reenvía en estricto orden de llegada y se detiene en el
 * primer fallo. Si se saltara el que falla, un cambio viejo podría aplicarse
 * después de uno nuevo y dejar el dato peor que antes.
 *
 * DUPLICADOS: cada petición lleva su clave de idempotencia desde que se encola,
 * no desde que se reenvía. Esa clave es la que permite al servidor distinguir
 * "no llegó, mándalo otra vez" de "sí llegó y se ejecutó, solo se perdió la
 * respuesta".
 */

const DB_NAME = 'olea-outbox';
const STORE = 'pendientes';
const VERSION = 1;
const EVENTO_CAMBIO = 'olea-outbox-cambio';

let dbPromise = null;

function abrirDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'orden', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB bloqueada'));
  }).catch(err => { dbPromise = null; throw err; });
  return dbPromise;
}

function ejecutar(modo, fn) {
  return abrirDB().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, modo);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

function avisarCambio() {
  window.dispatchEvent(new CustomEvent(EVENTO_CAMBIO));
}

/** Escucha los cambios de la cola. Devuelve la función de limpieza. */
export function alCambiarOutbox(fn) {
  window.addEventListener(EVENTO_CAMBIO, fn);
  return () => window.removeEventListener(EVENTO_CAMBIO, fn);
}

/** Clave de idempotencia. crypto.randomUUID no existe en contextos no seguros. */
function nuevaClave() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Mete una petición en la cola. Devuelve su clave de idempotencia.
 * Nunca lanza: si IndexedDB no está disponible devuelve null y quien llama
 * decide qué hacer.
 */
export async function encolar({ url, metodo, cuerpo, descripcion }) {
  const clave = nuevaClave();
  try {
    await ejecutar('readwrite', store => store.add({
      clave, url, metodo, cuerpo,
      descripcion: descripcion || `${metodo} ${url}`,
      creadoEn: Date.now(),
      intentos: 0,
    }));
    avisarCambio();
    return clave;
  } catch (err) {
    console.warn('[outbox] no se pudo encolar:', err?.message);
    return null;
  }
}

/** Cuántas peticiones esperan. */
export async function pendientes() {
  try {
    const todo = await ejecutar('readonly', store => store.getAll());
    return todo?.length || 0;
  } catch { return 0; }
}

/** La lista completa, para mostrarle al usuario qué falta por subir. */
export async function listaPendientes() {
  try {
    return (await ejecutar('readonly', store => store.getAll())) || [];
  } catch { return []; }
}

let reenviando = false;

/**
 * Reenvía la cola en orden, deteniéndose en el primer fallo de red.
 * Devuelve { enviadas, quedan }.
 */
export async function reenviar() {
  if (reenviando || !navigator.onLine) return { enviadas: 0, quedan: await pendientes() };
  reenviando = true;
  let enviadas = 0;

  try {
    const cola = (await ejecutar('readonly', store => store.getAll())) || [];
    const token = localStorage.getItem('olea_token');

    for (const item of cola.sort((a, b) => a.orden - b.orden)) {
      try {
        const res = await fetch(item.url, {
          method: item.metodo,
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': item.clave,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: item.cuerpo,
        });

        // Un 409 significa que el servidor la está atendiendo ahora mismo: se
        // deja en la cola y se reintenta en la siguiente vuelta.
        if (res.status === 409) break;

        // Un 5xx es un fallo del servidor, no de la red: parar y reintentar
        // después, sin perder el orden.
        if (res.status >= 500) break;

        // Cualquier otra respuesta —incluido un 4xx— cuenta como atendida: el
        // servidor la recibió y decidió. Reintentar un 400 daría 400 para
        // siempre y bloquearía toda la cola detrás.
        await ejecutar('readwrite', store => store.delete(item.orden));
        enviadas++;
        if (!res.ok) {
          console.warn(`[outbox] el servidor rechazó "${item.descripcion}" (${res.status}); se descarta`);
        }
      } catch {
        // fetch lanzó: sigue sin haber red. Se para y se conserva el orden.
        break;
      }
    }
  } catch (err) {
    console.warn('[outbox] error reenviando:', err?.message);
  } finally {
    reenviando = false;
    if (enviadas) avisarCambio();
  }

  return { enviadas, quedan: await pendientes() };
}

/** Arranca el reenvío automático: al volver la red, al abrir la app y cada minuto. */
export function iniciarOutbox() {
  window.addEventListener('online', () => { reenviar(); });
  // Al volver a la pestaña: el móvil suele recuperar señal con la app en
  // segundo plano, y el evento 'online' no siempre llega ahí.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reenviar();
  });
  setInterval(() => { reenviar(); }, 60000);
  reenviar();
}
