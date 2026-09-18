import { otService } from '@/api/otService';
import { apiFetch } from '@/lib/api';
import { registrarTarea } from '@/lib/outbox';
import { clearDraft } from '@/lib/draftStore';

export const TAREA_ACTA = 'acta-entrega';

/**
 * Sube un acta de entrega que se capturó sin red.
 *
 * El acta no cabía en el molde de "una petición encolada": sube dos firmas, N
 * fotos, N incidencias y un PDF a R2, y solo al final actualiza la OT. Encolar
 * únicamente el último paso habría guardado un acta apuntando a archivos que
 * nunca se subieron.
 *
 * Cada paso anota su resultado en el progreso. Si la señal se cae después de
 * tres fotos, el siguiente intento sigue desde la cuarta: sin eso, cada
 * reintento volvería a subirlo todo y dejaría copias huérfanas en el bucket.
 *
 * El PDF se genera ANTES de encolar, en la vista: jsPDF trabaja sin red, y el
 * generador vive dentro del componente y usa su estado. Aquí solo se sube.
 */
async function subirActa(datos, { clave, progreso, guardarProgreso }) {
  const { otId, claveBorrador, firmaTecnico, firmaCliente, fotos, incidentes, pdf, campos } = datos;

  // ── Firmas ────────────────────────────────────────────────────────────────
  let { urlFirmaTecnico, urlFirmaCliente } = progreso;
  if (!urlFirmaTecnico) {
    urlFirmaTecnico = await otService.uploadFile(firmaTecnico, 'signatures');
    await guardarProgreso({ urlFirmaTecnico });
  }
  if (!urlFirmaCliente) {
    urlFirmaCliente = await otService.uploadFile(firmaCliente, 'signatures');
    await guardarProgreso({ urlFirmaCliente });
  }

  // ── Fotos e incidencias ───────────────────────────────────────────────────
  // Se suben de una en una, no en paralelo: con la señal a medias, en paralelo
  // fallarían todas a la vez y no se conservaría ninguna. Así cada foto que
  // logra subir queda anotada.
  const subirLista = async (lista, campoProgreso) => {
    const hechas = progreso[campoProgreso] || [];
    for (let i = hechas.length; i < (lista || []).length; i++) {
      const item = lista[i];
      const url = item.url?.startsWith('data:')
        ? await otService.uploadFile(item.url, 'evidences')
        : item.url;
      hechas.push({ url, description: (item.description || '').trim() || null });
      await guardarProgreso({ [campoProgreso]: hechas });
    }
    return hechas;
  };

  const urlsFotos = await subirLista(fotos, 'urlsFotos');
  const urlsIncidentes = await subirLista(incidentes, 'urlsIncidentes');

  // ── PDF ───────────────────────────────────────────────────────────────────
  let { urlPdf } = progreso;
  if (!urlPdf) {
    urlPdf = await otService.uploadLargeFile(pdf, 'delivery-acts');
    await guardarProgreso({ urlPdf });
  }

  // ── Cerrar la OT ──────────────────────────────────────────────────────────
  // Va con la clave de idempotencia de la tarea: si esta petición llegó pero su
  // respuesta se perdió, el reintento no cierra la OT dos veces ni dispara otra
  // vez sus notificaciones.
  const res = await apiFetch('/api/ots', {
    method: 'PUT',
    claveIdempotencia: clave,
    body: JSON.stringify({
      id: otId,
      ...campos,
      signature: urlFirmaTecnico,
      clientSignature: urlFirmaCliente,
      deliveryActUrl: urlPdf,
      photos: urlsFotos,
      incidents: urlsIncidentes,
    }),
  });

  if (!res.ok) {
    // Un 4xx aquí es definitivo (la OT ya no admite el cierre, por ejemplo). Se
    // deja que la cola lo descarte en vez de reintentarlo para siempre.
    if (res.status >= 400 && res.status < 500) {
      console.warn(`[acta] el servidor rechazó el cierre de la OT ${otId} (${res.status})`);
      if (claveBorrador) await clearDraft(claveBorrador);
      return;
    }
    throw new Error(`El servidor respondió ${res.status}`);
  }

  // El acta ya está arriba: el borrador local deja de servir y ocupa espacio
  // con las fotos en base64.
  if (claveBorrador) await clearDraft(claveBorrador);
}

/** Se llama al arrancar la app, no desde la vista: un acta encolada debe poder
 *  subir aunque el técnico haya cerrado esa pantalla o recargado. */
export function registrarTareaActa() {
  registrarTarea(TAREA_ACTA, subirActa);
}
