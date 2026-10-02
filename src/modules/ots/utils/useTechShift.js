import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { TECH_SHIFT_KEY, DEFAULT_TECH_SHIFT, normalizeShift } from '@/lib/techShift';

/**
 * Horario de los técnicos guardado en SystemConfig.
 * Mientras carga (o si falla) devuelve el de por defecto.
 */
export function useTechShift() {
  const [shift, setShift] = useState(DEFAULT_TECH_SHIFT);

  useEffect(() => {
    let alive = true;
    apiFetch(`/api/config?key=${TECH_SHIFT_KEY}`)
      .then(r => (r.ok ? r.json() : null))
      .then(v => { if (alive && v) setShift(normalizeShift(v)); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const saveShift = useCallback(async (draft) => {
    const value = normalizeShift(draft);
    const res = await apiFetch('/api/config', {
      method: 'POST',
      body: JSON.stringify({ key: TECH_SHIFT_KEY, value }),
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(payload?.error || 'No se pudo guardar el horario');
    }
    setShift(value);
    return value;
  }, []);

  return { shift, saveShift };
}
