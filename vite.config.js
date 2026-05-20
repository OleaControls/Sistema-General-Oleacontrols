import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB
        runtimeCaching: [
          {
            // Chunks de Vite tienen hash en el nombre → son inmutables.
            // StaleWhileRevalidate: sirve desde caché inmediatamente y actualiza en segundo plano.
            // Mucho más rápido en móvil que NetworkFirst (sin esperar red).
            urlPattern: /\/assets\/.*\.[a-f0-9]{8}\.(js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'vite-chunks',
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Archivos sin hash (fuentes, imágenes, SVG) — CacheFirst es suficiente
            urlPattern: /\.(?:woff2?|png|svg|webp|avif|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-media',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Olea Controls Platform',
        short_name: 'OleaControls',
        description: 'Plataforma Global de Gestión Olea Controls',
        theme_color: '#0066FF',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    // Chunk de alerta solo si un archivo individual supera 800 kB
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core — siempre cargado, cache permanente
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          // Recharts + dependencias de gráficas — solo se descarga en vistas con charts
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/victory-vendor')) {
            return 'vendor-charts';
          }
          // Framer Motion — solo en vistas que lo usen
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          // Lucide — íconos, mediano tamaño
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // Mapas — Leaflet + react-leaflet, solo en OTs/GPS con mapa
          if (id.includes('node_modules/leaflet') ||
              id.includes('node_modules/react-leaflet') ||
              id.includes('node_modules/@react-leaflet')) {
            return 'vendor-maps';
          }
          // PDF y Excel — solo al generar documentos
          if (id.includes('node_modules/jspdf') ||
              id.includes('node_modules/jspdf-autotable') ||
              id.includes('node_modules/html2canvas') ||
              id.includes('node_modules/html-to-image')) {
            return 'vendor-pdf';
          }
          if (id.includes('node_modules/xlsx')) {
            return 'vendor-xlsx';
          }
          // Firma digital — solo en vistas de cierre de OT
          if (id.includes('node_modules/signature_pad') ||
              id.includes('node_modules/react-signature-canvas')) {
            return 'vendor-signature';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
