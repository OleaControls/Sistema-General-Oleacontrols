import { apiFetch } from '@/lib/api';

export const chatService = {
  /** Mis conversaciones, ordenadas por actividad, con no leídos. */
  async conversaciones() {
    const res = await apiFetch('/api/chat?accion=conversaciones');
    if (!res.ok) return { conversaciones: [], sinLeerTotal: 0 };
    return res.json();
  },

  /** Historial. `antesDe` (fecha ISO) pagina hacia atrás. */
  async mensajes(conversacionId, antesDe) {
    const q = new URLSearchParams({ accion: 'mensajes', conversacionId });
    if (antesDe) q.set('antesDe', antesDe);
    const res = await apiFetch(`/api/chat?${q}`);
    if (!res.ok) return { mensajes: [], hayMas: false };
    return res.json();
  },

  async enviar(conversacionId, cuerpo) {
    const res = await apiFetch('/api/chat?accion=enviar', {
      method: 'POST',
      body: JSON.stringify({ conversacionId, cuerpo }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'No se pudo enviar');
    return res.json();
  },

  async marcarLeida(conversacionId) {
    await apiFetch('/api/chat?accion=leer', {
      method: 'POST',
      body: JSON.stringify({ conversacionId }),
    });
  },

  /** Abre la conversación con alguien; si ya existía, devuelve esa misma. */
  async abrirCon(con, { nombre, tipo } = {}) {
    const res = await apiFetch('/api/chat?accion=conversacion', {
      method: 'POST',
      body: JSON.stringify({ con, nombre, tipo }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'No se pudo abrir la conversación');
    return res.json();
  },
};
