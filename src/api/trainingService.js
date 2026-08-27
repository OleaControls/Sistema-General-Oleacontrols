import { apiFetch } from '../lib/api';

// Capacitación técnica. Sin rol de RH/proyectos, el API solo devuelve las del
// propio usuario, así que el mismo servicio sirve para las dos vistas.
export const trainingService = {
  async list(employeeId) {
    const res = await apiFetch(`/api/trainings${employeeId ? `?employeeId=${employeeId}` : ''}`);
    if (!res.ok) throw new Error('Error al cargar las capacitaciones');
    return res.json();
  },

  async create(data) {
    const res = await apiFetch('/api/trainings', { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Error al registrar la capacitación');
    return res.json();
  },

  async update(id, data) {
    const res = await apiFetch(`/api/trainings?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Error al actualizar la capacitación');
    return res.json();
  },

  async remove(id) {
    const res = await apiFetch(`/api/trainings?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar la capacitación');
    return res.json();
  },
};

export default trainingService;
