/**
 * Estilo base de todos los mapas del sistema.
 *
 * CARTO Positron: gris muy claro y desaturado. Se eligió sobre las teselas por
 * defecto de OpenStreetMap porque en un tablero el mapa es fondo, no
 * protagonista — con Positron los pines azul (OTs) y verde (técnicos) quedan
 * como lo único saturado en pantalla.
 *
 * Gratuito y sin API key. La atribución es obligatoria por la licencia de
 * OpenStreetMap y los términos de CARTO: no quitar `attribution`.
 *
 * Uso:
 *   import { TILE_LAYER } from '@/lib/mapTiles';
 *   <TileLayer {...TILE_LAYER} />
 *
 * Otros estilos del mismo proveedor, por si se quiere cambiar después:
 *   dark_all      → fondo oscuro
 *   voyager       → claro con algo de color, calles más legibles
 *   light_nolabels→ sin nombres, sólo geometría
 */
export const TILE_LAYER = {
  url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  subdomains: 'abcd',
  maxZoom: 20,
  attribution: '&copy; OpenStreetMap &copy; CARTO',
};
