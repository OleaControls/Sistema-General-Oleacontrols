import { uploadToR2, getUploadUrl } from '../_lib/r2.js'
import { authMiddleware } from '../_lib/auth.js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  // Este endpoint no comprobaba nada. Cualquiera que conociera la URL podia
  // subir archivos al bucket, o pedir una URL firmada para subir directo: coste
  // de almacenamiento ajeno y contenido arbitrario alojado bajo este dominio.
  //
  // Se comprobo antes de cerrarlo que los cinco lugares que lo usan
  // (otService, HRDocuments, HRSettings, MyProfile) van por apiFetch, que ya
  // manda el token. Cerrar esto no rompe ningun flujo existente.
  const auth = authMiddleware(req, res);
  if (!auth) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { file, folder, presign, contentType, extension } = req.body;

    // Modo presigned: devuelve una URL de subida directa a R2 (sin cuerpo pesado).
    // Permite subir archivos grandes (PDFs) evitando el límite de 4.5 MB de Vercel.
    if (presign) {
      const { uploadUrl, publicUrl } = await getUploadUrl(
        folder || 'uploads',
        contentType || 'application/octet-stream',
        extension || 'bin'
      );
      return res.status(200).json({ uploadUrl, publicUrl });
    }

    if (!file || !file.startsWith('data:')) {
        return res.status(400).json({ error: 'Archivo no válido o ausente' });
    }

    const url = await uploadToR2(file, folder || 'uploads');
    return res.status(200).json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: error.message });
  }
}
