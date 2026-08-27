import { apiFetch } from '../lib/api';

/* Documentación de campo del técnico (vigencias). Vive aparte del expediente de
   RH, que guarda los documentos como campos sueltos de Employee sin vencimiento. */
export const techDocsService = {
  /** Expediente de un técnico. Sin `employeeId` devuelve el del usuario en sesión. */
  async list(employeeId) {
    const qs = employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : '';
    const res = await apiFetch(`/api/tech-docs${qs}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo cargar el expediente');
    }
    return res.json();
  },

  /** Expediente de todos los técnicos de una OT, para el semáforo de la orden. */
  async byOT(otId) {
    const res = await apiFetch(`/api/tech-docs?otId=${encodeURIComponent(otId)}`);
    if (!res.ok) return [];
    return res.json();
  },

  async create(data) {
    const res = await apiFetch('/api/tech-docs', { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo guardar el documento');
    }
    return res.json();
  },

  async update(id, data) {
    const res = await apiFetch(`/api/tech-docs?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo actualizar el documento');
    }
    return res.json();
  },

  async remove(id) {
    const res = await apiFetch(`/api/tech-docs?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('No se pudo eliminar el documento');
    return res.json();
  },
};

export default techDocsService;
