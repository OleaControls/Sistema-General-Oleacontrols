import { apiFetch } from '../lib/api';

// Mapa de Operaciones. El GET trae, en una sola llamada, las zonas con sus
// contadores más los proyectos y las asignaciones abiertas para pintar el mapa.
export const zoneService = {
  async panorama() {
    const res = await apiFetch('/api/zones');
    if (!res.ok) throw new Error('Error al cargar el mapa de operaciones');
    return res.json();
  },

  async create(data) {
    const res = await apiFetch('/api/zones', { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Error al crear la zona');
    return res.json();
  },

  async update(id, data) {
    const res = await apiFetch(`/api/zones?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Error al actualizar la zona');
    return res.json();
  },

  async remove(id) {
    const res = await apiFetch(`/api/zones?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al archivar la zona');
    return res.json();
  },
};

export default zoneService;
