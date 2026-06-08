import { authMiddleware } from '../_lib/auth.js';

// LMS handler — DB models not yet migrated; returns empty stubs so the server
// starts and other endpoints remain functional.
export default async function handler(req, res) {
  const auth = await authMiddleware(req, res);
  if (!auth) return;

  const method   = req.method;
  const resource = req.params?.resource || req.query?.resource || '';

  if (method === 'GET' && resource === 'stats') {
    return res.status(200).json({ coursesCount: 0, enrollmentsCount: 0, certsCount: 0 });
  }

  if (method === 'GET' && resource === 'my-courses') {
    return res.status(200).json([]);
  }

  if (method === 'GET' && resource === 'courses') {
    return res.status(200).json([]);
  }

  if (method === 'GET' && resource) {
    return res.status(404).json({ error: 'Curso no encontrado' });
  }

  if (method === 'POST') {
    return res.status(501).json({ error: 'LMS no implementado aún — pendiente de migración de base de datos' });
  }

  if (method === 'PUT') {
    return res.status(501).json({ error: 'LMS no implementado aún — pendiente de migración de base de datos' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
