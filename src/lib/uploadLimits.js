/* Límite de tamaño para los archivos que suben técnicos y proyectos.
 *
 * Vive en un solo lugar a propósito: antes cada pantalla decidía su propio
 * máximo (5, 15, 20 MB o ninguno), así que el mismo PDF pasaba en una vista y
 * se rechazaba en otra.
 *
 * Se valida ANTES de leer el archivo. Sin esto, un archivo de 40 MB se carga
 * completo en memoria con FileReader, crece ~33% al convertirse a base64 y
 * recién entonces falla — en un celular de campo eso es una pestaña muerta.
 *
 * La subida real va directo a R2 con URL prefirmada (otService.uploadLargeFile),
 * que sí aguanta 10 MB. Solo el camino de respaldo por /api/upload topa antes,
 * en los 4.5 MB que Vercel corta, y ese caso ya tiene su propio mensaje.
 */
export const MAX_UPLOAD_MB = 10;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/** Texto para poner junto al botón de subir. */
export const MAX_UPLOAD_LABEL = `Máx ${MAX_UPLOAD_MB} MB`;

/**
 * Devuelve un mensaje de error si el archivo excede el límite, o null si cabe.
 * @param {File} file
 * @param {number} [maxMb] Para pantallas que necesiten un tope distinto.
 * @returns {string|null}
 */
export function validarTamanoArchivo(file, maxMb = MAX_UPLOAD_MB) {
  if (!file) return null;
  const max = maxMb * 1024 * 1024;
  if (file.size <= max) return null;
  const mb = (file.size / 1024 / 1024).toFixed(1);
  return `El archivo pesa ${mb} MB y el límite es ${maxMb} MB. Comprímelo o divídelo antes de subirlo.`;
}
