import { uploadToR2, getUploadUrl } from '../_lib/r2.js'

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
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
