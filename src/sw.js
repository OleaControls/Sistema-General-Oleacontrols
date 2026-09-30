/// <reference lib="webworker" />
// Service worker propio (vite-plugin-pwa en modo injectManifest).
//
// Antes Workbox lo generaba solo, pero ese SW no puede escuchar `push`. Lo de
// caché de aquí abajo es lo mismo que generaba, regla por regla: si se toca,
// que siga siendo equivalente, porque de eso depende que el técnico en campo
// abra la app sin red.
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

self.skipWaiting();
clientsClaim();

// La lista la inyecta el build (respeta los globIgnores de vite.config.js).
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA: cualquier navegación sirve el index.html precacheado.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// Chunks de Vite con hash en el nombre (`nombre-HASH.js`) → inmutables.
registerRoute(
  /\/assets\/.+-[\w-]{8}\.(js|css)$/,
  new StaleWhileRevalidate({
    cacheName: 'vite-chunks',
    plugins: [new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
);

// Fuentes, imágenes, SVG sin hash.
registerRoute(
  /\.(?:woff2?|png|svg|webp|avif|ico)$/,
  new CacheFirst({
    cacheName: 'static-media',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  }),
);

// ── Web Push ────────────────────────────────────────────────────────────────
// Lo manda api/_lib/push.js con { titulo, cuerpo, enlace, tag }.
//
// Se muestra SIEMPRE, aunque la app esté abierta: Chrome exige que cada push
// termine en una notificación visible y, si no, pone una genérica suya.
self.addEventListener('push', (event) => {
  let n = {};
  try { n = event.data ? event.data.json() : {}; } catch { n = { titulo: event.data?.text() }; }

  event.waitUntil(
    self.registration.showNotification(n.titulo || 'Olea Controls', {
      body: n.cuerpo || '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: n.tag,
      data: { enlace: n.enlace || '/' },
    }),
  );
});

// Al tocar la notificación: si la app ya está abierta en alguna pestaña se
// trae al frente y se lleva al enlace; si no, se abre una nueva.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.enlace || '/', self.location.origin).href;

  event.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const propia = abiertas.find(c => new URL(c.url).origin === self.location.origin);
    if (propia) {
      await propia.focus();
      // navigate() recarga la página; postMessage deja que el router de React
      // cambie de vista sin perder el estado. Ver src/lib/push.js.
      propia.postMessage({ tipo: 'abrir-enlace', enlace: event.notification.data?.enlace || '/' });
      return;
    }
    await self.clients.openWindow(destino);
  })());
});
