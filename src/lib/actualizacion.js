/**
 * Versión nueva de la app después de un deploy.
 *
 * Por qué hacía falta recargar varias veces: el service worker (src/sw.js)
 * sirve el index.html precacheado. La primera recarga todavía pinta la versión
 * vieja y apenas ahí el navegador descubre el SW nuevo; la versión nueva sale
 * hasta la recarga siguiente. Aquí se pide el SW nuevo ANTES de recargar.
 */

const soportado = () => 'serviceWorker' in navigator;

function esperarNuevoControlador(ms) {
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      clearTimeout(t);
      resolve();
    }, { once: true });
  });
}

/**
 * Busca la versión nueva, espera a que tome el control y recarga. Sin red o sin
 * versión nueva recarga igual: el usuario pidió recargar.
 */
export async function actualizarAhora() {
  if (soportado()) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        // src/sw.js hace skipWaiting, así que el nuevo se activa solo; el tope
        // es por si se queda atorado instalando (red lenta en campo).
        if (reg.installing || reg.waiting) await esperarNuevoControlador(10000);
      }
    } catch { /* sin red: se recarga desde el caché */ }
  }
  window.location.reload();
}

/**
 * Llama a `avisar` cuando ya hay una versión nueva lista y esta pestaña sigue
 * pintando la vieja. Revisa al volver a la pestaña y cada 5 minutos. No recarga
 * sola: a un técnico a media captura le borraría el formulario.
 */
export function vigilarVersionNueva(avisar) {
  if (!soportado()) return () => {};

  // Sin controlador es la primera instalación, no una versión nueva.
  const habiaControlador = Boolean(navigator.serviceWorker.controller);
  const alCambiar = () => { if (habiaControlador) avisar(); };
  navigator.serviceWorker.addEventListener('controllerchange', alCambiar);

  const revisar = () => {
    navigator.serviceWorker.getRegistration()
      .then(reg => reg?.update())
      .catch(() => {});
  };
  const alVolver = () => { if (document.visibilityState === 'visible') revisar(); };
  document.addEventListener('visibilitychange', alVolver);
  const intervalo = setInterval(revisar, 5 * 60 * 1000);

  return () => {
    navigator.serviceWorker.removeEventListener('controllerchange', alCambiar);
    document.removeEventListener('visibilitychange', alVolver);
    clearInterval(intervalo);
  };
}
