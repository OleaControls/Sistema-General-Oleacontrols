import { apiFetch } from '../lib/api';

// Servicio del módulo de Gestión de Proyectos.
// Proyecto principal + sub-recursos (tareas, riesgos, costos, etc.).
export const projectService = {
  // ── Proyectos ──────────────────────────────────────────────────────────
  async list() {
    const res = await apiFetch('/api/projects');
    if (!res.ok) throw new Error('Error al cargar proyectos');
    return res.json();
  },

  async get(id) {
    const res = await apiFetch(`/api/projects?id=${id}`);
    if (!res.ok) throw new Error('Error al cargar el proyecto');
    return res.json();
  },

  async create(data) {
    const res = await apiFetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al crear el proyecto');
    return res.json();
  },

  async update(id, data) {
    const res = await apiFetch(`/api/projects?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar el proyecto');
    return res.json();
  },

  async remove(id) {
    const res = await apiFetch(`/api/projects?id=${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar el proyecto');
    return res.json();
  },

  // ── Sub-recursos genéricos ─────────────────────────────────────────────
  // sub ∈ tasks | risks | costs | resources | quality | communications |
  //        incidents | documents | changes
  async addItem(projectId, sub, data) {
    const res = await apiFetch(`/api/projects?id=${projectId}&sub=${sub}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al crear el registro');
    return res.json();
  },

  async updateItem(sub, subId, data) {
    const res = await apiFetch(`/api/projects?sub=${sub}&subId=${subId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Error al actualizar el registro');
    return res.json();
  },

  async removeItem(sub, subId) {
    const res = await apiFetch(`/api/projects?sub=${sub}&subId=${subId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error al eliminar el registro');
    return res.json();
  },

  // ── Catálogos auxiliares (para pickers e integración) ──────────────────
  async _fetchArray(url) {
    try {
      const res = await apiFetch(url);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : (Array.isArray(json?.data) ? json.data : []);
    } catch { return []; }
  },

  // Empleados (para responsables): devuelve [{id, name, position}]
  employees() { return this._fetchArray('/api/employees'); },

  // Clientes operativos (catálogo OT): [{id, name, ...}]
  otClients() { return this._fetchArray('/api/ot-clients'); },

  // Órdenes de trabajo: [{id, otNumber, title, ...}]
  ots() { return this._fetchArray('/api/ots?limit=500'); },

  // Cotizaciones: [{id, quoteNumber, projectName, ...}]
  quotes() { return this._fetchArray('/api/quotes'); },
};

export default projectService;
