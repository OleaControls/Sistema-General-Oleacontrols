/* Reglas de compras para los handlers.
 *
 * El contenido vive en src/lib/compras.js —una sola definición para el
 * navegador y para la API— y aquí solo se reexporta, para que los handlers lo
 * importen desde api/_lib como el resto de sus utilidades.
 *
 * No se puso al revés porque en desarrollo Vite hace proxy de /api al Express
 * del puerto 3001: un módulo servido desde /api/_lib/... nunca llegaría al
 * navegador.
 */
export * from '../../src/lib/compras.js';
