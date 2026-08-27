import { apiFetch } from '../lib/api';

// Mejora continua: el registro de problemas, acciones y objetivos por módulo.
export const improvementService = {
  async list(status) {
    const res = await apiFetch(`/api/improvements${status ? `?status=${status}` : ''}`);
    if (!res.ok) throw new Error('Error al cargar la mejora continua');
    return res.json();
  },

  async create(data) {
    const res = await apiFetch('/api/improvements', { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Error al crear la mejora');
    return res.json();
  },

  async update(id, data) {
    const res = await apiFetch(`/api/improvements?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Error al actualizar la mejora');
    return res.json();
  },

  async remove(id) {
    const res = await apiFetch(`/api/improvements?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar la mejora');
    return res.json();
  },
};

export default improvementService;
