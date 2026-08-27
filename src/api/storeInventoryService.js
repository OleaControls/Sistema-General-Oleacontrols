import { apiFetch } from '../lib/api';

/* Inventario de tiendas. Es uno solo para toda la operación: no cuelga de ningún
   proyecto, y toda OT de tienda consulta el mismo listado. `brand` separa el
   material de cada cadena dentro del mismo resguardo. */

async function leerError(res, porOmision) {
  const err = await res.json().catch(() => ({}));
  return new Error(err.error || porOmision);
}

export const storeInventoryService = {
  async list(brand) {
    const qs = brand ? `?brand=${encodeURIComponent(brand)}` : '';
    const res = await apiFetch(`/api/store-inventory${qs}`);
    if (!res.ok) throw await leerError(res, 'No se pudo cargar el inventario');
    const json = await res.json();
    return Array.isArray(json) ? json : [];
  },

  async create(data) {
    const res = await apiFetch('/api/store-inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await leerError(res, 'No se pudo guardar el material');
    return res.json();
  },

  async update(id, data) {
    const res = await apiFetch(`/api/store-inventory?id=${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await leerError(res, 'No se pudo actualizar el material');
    return res.json();
  },

  async remove(id) {
    const res = await apiFetch(`/api/store-inventory?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (!res.ok) throw await leerError(res, 'No se pudo eliminar el material');
    return res.json();
  },
};

export default storeInventoryService;
