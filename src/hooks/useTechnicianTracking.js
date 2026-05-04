import { useEffect, useRef, useCallback } from 'react';
import { useAuth, ROLES } from '@/store/AuthContext';
import { otService } from '@/api/otService';

export function useTechnicianTracking() {
  const { user } = useAuth();
  const lastPos = useRef(null);
  const lastSentAt = useRef(null);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);

  const sendLocation = useCallback(async (lat, lng) => {
    if (!user) return;

    const now = Date.now();
    const timeSinceLast = lastSentAt.current ? now - lastSentAt.current : Infinity;

    if (lastPos.current) {
      const R = 6371e3;
      const dLat = (lat - lastPos.current.lat) * Math.PI / 180;
      const dLng = (lng - lastPos.current.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lastPos.current.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      // Solo enviar si movió > 200m O pasaron > 5 minutos
      if (distance < 200 && timeSinceLast < 300000) return;
    }

    try {
      await otService.updateTechnicianLocation(user.id, user.name, lat, lng);
      lastPos.current = { lat, lng };
      lastSentAt.current = now;
    } catch (err) {
      console.error('[tracking] Error enviando ubicación:', err);
    }
  }, [user]);

  const startWatching = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    if (watchIdRef.current !== null) return; // ya está corriendo

    // Obtener posición inicial de inmediato
    navigator.geolocation.getCurrentPosition(
      (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
      () => {}
    );

    // watchPosition: el navegador notifica cuando hay movimiento real
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 15000 }
    );

    // Respaldo cada 5 min (por si watchPosition se throttlea en background)
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
        () => {}
      );
    }, 300000);
  }, [sendLocation]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== ROLES.TECH) return;

    // Auto-iniciar si el permiso ya fue concedido previamente
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') startWatching();

        // Reaccionar si el usuario cambia el permiso en el navegador
        result.addEventListener('change', () => {
          if (result.state === 'granted') startWatching();
          else stopWatching();
        });
      });
    }

    // Enviar ubicación inmediatamente cuando la tab vuelve a estar visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && watchIdRef.current !== null) {
        navigator.geolocation.getCurrentPosition(
          (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
          () => {}
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopWatching();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, startWatching, stopWatching, sendLocation]);

  // Exponer para que componentes puedan activar manualmente
  return { startWatching, stopWatching };
}
