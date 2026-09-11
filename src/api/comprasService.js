import { apiFetch } from '@/lib/api';

/** Lee el error real del servidor en vez de un "algo falló". */
async function fallar(res, porDefecto) {
  const body = await res.json().catch(() => ({}));
  throw new Error(body.error || `${porDefecto} (${res.status})`);
}

const qs = (params = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && v !== 'ALL') p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const comprasService = {
  // ── Proveedores ────────────────────────────────────────────────────────
  async proveedores(params) {
    const res = await apiFetch(`/api/suppliers${qs(params)}`);
    if (!res.ok) await fallar(res, 'No se pudieron cargar los proveedores');
    return res.json();
  },

  async crearProveedor(data) {
    const res = await apiFetch('/api/suppliers', { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) await fallar(res, 'No se pudo guardar el proveedor');
    return res.json();
  },

  async actualizarProveedor(id, data) {
    const res = await apiFetch(`/api/suppliers?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
    if (!res.ok) await fallar(res, 'No se pudo actualizar el proveedor');
    return res.json();
  },

  async eliminarProveedor(id) {
    const res = await apiFetch(`/api/suppliers?id=${id}`, { method: 'DELETE' });
    if (!res.ok) await fallar(res, 'No se pudo eliminar el proveedor');
    return res.json();
  },

  // ── Órdenes de compra ──────────────────────────────────────────────────
  async ordenes(params) {
    const res = await apiFetch(`/api/purchase-orders${qs(params)}`);
    if (!res.ok) await fallar(res, 'No se pudieron cargar las órdenes');
    return res.json();
  },

  async orden(id) {
    const res = await apiFetch(`/api/purchase-orders?id=${id}`);
    if (!res.ok) await fallar(res, 'No se pudo cargar la orden');
    return res.json();
  },

  async crearOrden(data) {
    const res = await apiFetch('/api/purchase-orders', { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) await fallar(res, 'No se pudo crear la orden');
    return res.json();
  },

  async actualizarOrden(id, data) {
    const res = await apiFetch(`/api/purchase-orders?id=${id}`, { method: 'PUT', body: JSON.stringify(data) });
    if (!res.ok) await fallar(res, 'No se pudo guardar la orden');
    return res.json();
  },

  async eliminarOrden(id) {
    const res = await apiFetch(`/api/purchase-orders?id=${id}`, { method: 'DELETE' });
    if (!res.ok) await fallar(res, 'No se pudo eliminar la orden');
    return res.json();
  },

  /**
   * Acciones de flujo.
   * @param {'solicitar'|'autorizar'|'rechazar'|'avanzar'|'cancelar'|'reabrir'} accion
   */
  async accion(id, accion, body = {}) {
    const res = await apiFetch(`/api/purchase-orders?id=${id}&action=${accion}`, {
      method: 'POST', body: JSON.stringify(body),
    });
    if (!res.ok) await fallar(res, `No se pudo ${accion} la orden`);
    return res.json();
  },
};

export default comprasService;
