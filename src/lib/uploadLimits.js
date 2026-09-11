/* Qué tan grande puede ser un archivo que sube un técnico o un proyecto.
 *
 * Respuesta corta: sin límite. La subida va directo a R2 con URL prefirmada
 * (otService.uploadArchivo), en binario y sin pasar por el servidor, así que
 * no hay un tope que imponer desde aquí. Antes sí lo había —10 MB— porque el
 * archivo se leía completo en memoria con FileReader y crecía ~33% al volverse
 * base64; eso ya no ocurre.
 *
 * Queda un tope, pero solo en el camino de respaldo: si la subida directa
 * falla, otService reintenta por /api/upload, donde Vercel corta el request en
 * 4.5 MB. Ese caso lo detecta y lo explica el propio servicio, no esta pantalla.
 *
 * El único techo real es el de R2: 5 GB por objeto en una sola escritura. Para
 * más haría falta subida multiparte, que hoy no está implementada.
 */

/** Texto para poner junto al botón de subir. */
export const MAX_UPLOAD_LABEL = 'Sin límite de tamaño';
