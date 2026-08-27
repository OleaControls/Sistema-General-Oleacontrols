/* Compresión de fotos en el navegador antes de subirlas.
   El técnico captura desde el celular, donde una foto cruda pesa varios MB;
   1280 px al 70 % es suficiente para una evidencia legible y mantiene la
   petición muy por debajo del límite de 4.5 MB de Vercel. */

const MAX_LADO = 1280;
const CALIDAD = 0.7;

/**
 * Lee un File y devuelve un data-URI JPEG redimensionado.
 * @param {File} file
 * @param {{max?: number, quality?: number}} [opts]
 * @returns {Promise<string>}
 */
export function comprimirFoto(file, { max = MAX_LADO, quality = CALIDAD } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida'));
      img.onload = () => {
        try {
          const escala = Math.min(1, max / Math.max(img.width, img.height, 1));
          const w = Math.max(1, Math.round(img.width * escala));
          const h = Math.max(1, Math.round(img.height * escala));

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          reject(e);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default comprimirFoto;
