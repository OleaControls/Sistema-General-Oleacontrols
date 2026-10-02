import { apiFetch } from '@/lib/api';

export const notificacionesService = {
  /** Devuelve { notificaciones, sinLeer }. El destinatario lo decide el token. */
  async listar(pagina = 1) {
    const res = await apiFetch(`/api/notificaciones?pagina=${pagina}`);
    if (!res.ok) return { notificaciones: [], sinLeer: 0 };
    return res.json();
  },

  /** Marca una como leída; sin id, marca todas las mías. */
  async marcarLeida(id) {
    const res = await apiFetch('/api/notificaciones?action=leer', {
      method: 'POST',
      body: JSON.stringify(id ? { id } : {}),
    });
    return res.ok;
  },

  /** Borra: `{ id }` una, `{ leidas: true }` las leídas, `{ todas: true }` todas las mías. */
  async borrar(cuales) {
    const res = await apiFetch('/api/notificaciones?action=borrar', {
      method: 'POST',
      body: JSON.stringify(cuales),
    });
    return res.ok;
  },
};
