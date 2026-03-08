import { uploadToR2 } from './_lib/r2.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { file, folder } = req.body;
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
