import { apiFetch } from '@/lib/api';

/**
 * Web Push del lado del navegador: pedir permiso, suscribir este dispositivo y
 * avisarle al servidor. El envío lo hace api/_lib/push.js y la notificación la
 * pinta src/sw.js.
 */

const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const instalada = () => window.matchMedia?.('(display-mode: standalone)').matches
  || window.navigator.standalone === true;

const soportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

/**
 * 'activo' | 'inactivo' | 'denegado' | 'instalar' | 'no-soportado'
 *
 * 'instalar' es el iPhone desde Safari: Apple solo permite push a la app
 * agregada a la pantalla de inicio, así que ahí no hay botón que sirva.
 */
export async function estadoPush() {
  if (!soportado()) return esIOS() && !instalada() ? 'instalar' : 'no-soportado';
  if (Notification.permission === 'denied') return 'denegado';
  if (Notification.permission !== 'granted') return 'inactivo';
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) ? 'activo' : 'inactivo';
}

function claveABytes(base64) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(crudo, c => c.charCodeAt(0));
}

async function suscribirYRegistrar() {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const res = await apiFetch('/api/notificaciones?action=push-clave');
    const { clave } = res.ok ? await res.json() : {};
    if (!clave) throw new Error('El servidor no tiene configurados los avisos push');
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: claveABytes(clave),
    });
  }
  const res = await apiFetch('/api/notificaciones?action=push-suscribir', {
    method: 'POST',
    body: JSON.stringify({ suscripcion: sub.toJSON() }),
  });
  if (!res.ok) throw new Error('No se pudo registrar este dispositivo');
}

/**
 * Pide permiso y suscribe. Tiene que llamarse desde un clic: los navegadores
 * ignoran (o castigan) el permiso pedido sin que el usuario haga nada.
 */
export async function activarPush() {
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return false;
  await suscribirYRegistrar();
  return true;
}

/**
 * Deja de recibir avisos en este dispositivo. Al cerrar sesión se llama con el
 * token de quien sale, porque para cuando termine ya se habrá borrado.
 */
export async function desactivarPush(token) {
  if (!soportado()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await apiFetch('/api/notificaciones?action=push-desuscribir', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe();
  } catch (error) {
    console.warn('[push] No se pudo desactivar:', error.message);
  }
}

let iniciado = false;

/**
 * Una vez por carga de la app (la campana se monta dos veces: móvil y
 * escritorio):
 *  - Si el permiso ya está dado, vuelve a registrar la suscripción. Cubre que
 *    el navegador la haya renovado o que en este equipo haya entrado otra
 *    persona: el servidor la reasigna a quien está ahora.
 *  - Escucha los clics en notificaciones que el SW manda a una pestaña ya
 *    abierta, para navegar con el router sin recargar.
 */
export function iniciarPush(navegar) {
  if (iniciado || !soportado()) return;
  iniciado = true;

  if (Notification.permission === 'granted') {
    suscribirYRegistrar().catch(error => console.warn('[push]', error.message));
  }

  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.tipo === 'abrir-enlace' && e.data.enlace) navegar(e.data.enlace);
  });
}
