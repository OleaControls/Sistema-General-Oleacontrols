/**
 * Estilo base de todos los mapas del sistema.
 *
 * Por defecto: teselas estándar de OpenStreetMap, gratuitas y sin API key.
 * El gris desaturado tipo "Positron" se consigue con un filtro CSS sobre el
 * panel de teselas (`.leaflet-tile-pane` en index.css), no con el proveedor —
 * así el mapa es fondo y los pines azul (OTs) y verde (técnicos) quedan como
 * lo único saturado en pantalla.
 *
 * Antes se usaba CARTO Positron, pero CARTO empezó a exigir clave y sirve las
 * teselas marcadas con "API KEY REQUIRED". Si algún día se contrata una clave,
 * basta con poner VITE_CARTO_API_KEY en el .env: este módulo vuelve solo a
 * Positron y el filtro CSS sigue siendo inofensivo.
 *
 * La atribución es obligatoria por la licencia de OpenStreetMap: no quitarla.
 *
 * Uso:
 *   import { TILE_LAYER } from '@/lib/mapTiles';
 *   <TileLayer {...TILE_LAYER} />
 */
const CARTO_KEY = import.meta.env.VITE_CARTO_API_KEY;

export const TILE_LAYER = CARTO_KEY
  ? {
      url: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?api_key=${CARTO_KEY}`,
      subdomains: 'abcd',
      maxZoom: 20,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }
  : {
      // Un solo host: la política de uso de OSM pide no repartir en a/b/c.
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    };
