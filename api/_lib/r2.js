import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from 'dotenv';
dotenv.config();

let r2Client = null;

function getR2Client() {
  if (r2Client) return r2Client;

  const endpoint = (process.env.R2_ENDPOINT || '').trim();
  const accessKey = (process.env.R2_ACCESS_KEY || '').trim();
  const secretKey = (process.env.R2_SECRET_KEY || '').trim();
  const bucket = (process.env.R2_BUCKET_NAME || '').trim();

  console.log(`[R2-Check] Conectando al Bucket: "${bucket}"`);

  if (!endpoint || !accessKey || !secretKey || !bucket) {
    console.error("❌ ERROR CRÍTICO: Faltan variables de R2 en .env. Revisa Endpoint, AccessKey, SecretKey y BucketName.");
    throw new Error("R2 Credentials missing");
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: endpoint,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });
  return r2Client;
}

/**
 * Genera una URL firmada para un archivo en R2.
 * @param {string} key - El Key (ruta) del archivo en el bucket.
 * @param {number} expiresIn - Tiempo de expiración en segundos (default 1 hora).
 * @returns {Promise<string>} URL firmada.
 */
export async function getSignedUrlForKey(key, expiresIn = 3600) {
  try {
    const client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    // Generar la URL firmada
    const signedUrl = await getSignedUrl(client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error("❌ Error al generar URL firmada:", error);
    throw error;
  }
}

/**
 * Si la URL proporcionada es una URL de R2 (ya sea por dominio personalizado o fallback),
 * intenta convertirla en una URL firmada si es necesario.
 * @param {string} urlOrKey - URL completa o Key del archivo.
 * @returns {Promise<string>} URL firmada o la original si no es de R2.
 */
export async function signUrlIfNeeded(urlOrKey) {
  if (!urlOrKey || typeof urlOrKey !== 'string') return urlOrKey;
  if (urlOrKey.startsWith('data:')) return urlOrKey;

  try {
    let key = urlOrKey;

    // Si es una URL completa de R2, extraemos el key
    if (urlOrKey.startsWith('http')) {
      const publicUrl = process.env.R2_PUBLIC_URL || '';
      const fallbackPrefix = `pub-${process.env.R2_ENDPOINT?.match(/https:\/\/(.+)\.r2/)?.[1]}.r2.dev`;

      if (publicUrl && urlOrKey.includes(publicUrl)) {
        key = urlOrKey.split(publicUrl).pop().replace(/^\//, '');
      } else if (urlOrKey.includes(fallbackPrefix)) {
        key = urlOrKey.split(fallbackPrefix).pop().replace(/^\//, '');
      } else {
        // Si no parece ser de R2, devolvemos tal cual
        return urlOrKey;
      }
    }

    return await getSignedUrlForKey(key);
  } catch (error) {
    console.warn("⚠️ Advertencia: No se pudo firmar la URL, usando original:", error.message);
    return urlOrKey;
  }
}

/**
 * Sube un archivo a Cloudflare R2.
 * @param {string|Buffer} fileData - String Base64 (data-uri) o Buffer binario.
 * @param {string} folder - Carpeta destino ('expenses', 'ots', etc).
 * @param {string} customName - (Opcional) Nombre específico del archivo.
 * @returns {string} URL pública del archivo (o key si preferimos persistir el key).
 */
export async function uploadToR2(fileData, folder = 'general', customName = null) {
  try {
    const client = getR2Client();
    let buffer;
    let contentType;
    let extension;

    // 1. Procesar la entrada (Buffer o Base64)
    if (Buffer.isBuffer(fileData)) {
      buffer = fileData;
      contentType = 'application/octet-stream'; 
      extension = 'bin';
    } else if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      const headerMatch = fileData.match(/^data:([^;]+);base64,(.+)$/);
      if (!headerMatch) throw new Error("Formato Data-URI inválido");

      contentType = headerMatch[1];
      buffer = Buffer.from(headerMatch[2], 'base64');
      extension = contentType.split('/')[1]?.split('+')[0] || 'bin';
    } else {
      // Si ya es una URL, no hacemos nada
      if (typeof fileData === 'string' && fileData.startsWith('http')) return fileData;
      throw new Error("Formato de entrada no soportado (debe ser Buffer o Data-URI)");
    }

    if (!buffer || buffer.length === 0) throw new Error("El archivo está vacío");

    // 2. Generar nombre de archivo
    const fileName = customName 
      ? `${folder}/${customName}`
      : `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;

    // 3. Ejecutar subida S3
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
    });

    await client.send(command);

    // 4. Construir URL Pública (o key)
    // Para mantener compatibilidad con lo existente, seguimos devolviendo la URL.
    // Pero ahora tenemos la capacidad de firmarla al recuperarla.
    let publicUrl;
    if (process.env.R2_PUBLIC_URL) {
      publicUrl = `${process.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${fileName}`;
    } else {
      const accountId = process.env.R2_ENDPOINT?.match(/https:\/\/(.+)\.r2/)?.[1];
      publicUrl = `https://pub-${accountId}.r2.dev/${fileName}`; 
    }

    return publicUrl;
  } catch (error) {
    console.error(`❌ R2 Upload Error (${folder}):`, error.message);
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      return fileData;
    }
    throw error;
  }
}

