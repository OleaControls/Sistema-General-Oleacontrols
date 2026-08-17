/**
 * Almacén de borradores en IndexedDB.
 *
 * Se usa IndexedDB y no localStorage porque un borrador de acta incluye las
 * fotos de evidencia en base64 (~200-400 KB cada una) y varias evidencias
 * rebasan el límite de ~5 MB de localStorage. Peor aún, al rebasarlo lanza
 * QuotaExceededError y se perdería el borrador completo justo en el caso que
 * más duele: el técnico que documentó mucho trabajo.
 *
 * Todas las funciones fallan en silencio (devuelven null / no lanzan): si el
 * navegador bloquea IndexedDB (modo privado, permisos), el formulario debe
 * seguir funcionando como siempre, solo sin red de seguridad.
 */

const DB_NAME = 'olea-drafts';
const STORE = 'drafts';
const VERSION = 1;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB bloqueada'));
  }).catch(err => {
    dbPromise = null; // permite reintentar en la siguiente llamada
    throw err;
  });
  return dbPromise;
}

function run(mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

/** Guarda (o reemplaza) el borrador bajo `key`. Devuelve true si se guardó. */
export async function saveDraft(key, value) {
  try {
    await run('readwrite', store => store.put(value, key));
    return true;
  } catch (err) {
    console.warn('No se pudo guardar el borrador:', err?.message);
    return false;
  }
}

/**
 * Devuelve el borrador de `key`, o null si no existe o ya caducó.
 * Un borrador viejo se borra en el momento para no acumular fotos en el
 * dispositivo del técnico.
 */
export async function loadDraft(key, maxAgeMs) {
  try {
    const draft = await run('readonly', store => store.get(key));
    if (!draft) return null;
    if (maxAgeMs && draft.savedAt && Date.now() - draft.savedAt > maxAgeMs) {
      await clearDraft(key);
      return null;
    }
    return draft;
  } catch (err) {
    console.warn('No se pudo leer el borrador:', err?.message);
    return null;
  }
}

/** Elimina el borrador de `key`. */
export async function clearDraft(key) {
  try {
    await run('readwrite', store => store.delete(key));
    return true;
  } catch (err) {
    console.warn('No se pudo borrar el borrador:', err?.message);
    return false;
  }
}
