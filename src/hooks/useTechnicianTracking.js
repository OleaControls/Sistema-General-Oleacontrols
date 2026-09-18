import { useEffect, useRef, useCallback } from 'react';
import { useAuth, ROLES } from '@/store/AuthContext';
import { otService } from '@/api/otService';
import { enviarUbicacion, socket } from '@/services/realtime';

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

    // Por el socket, un reporte no cuesta ni una función de Vercel ni una
    // escritura en la base: el servidor lo guarda en memoria y lo persiste cada
    // 5 minutos. Por eso se puede reportar mucho más seguido y el supervisor ve
    // moverse al técnico de verdad, en vez de a saltos de 200 metros.
    // Si no hay socket, sale por la API y vuelven los umbrales de antes: ahí
    // cada envío sí cuesta.
    const porSocket = socket.connected;
    const metrosMin = porSocket ? 50 : 200;
    const msMin = porSocket ? 60_000 : 300_000;

    if (lastPos.current) {
      const R = 6371e3;
      const dLat = (lat - lastPos.current.lat) * Math.PI / 180;
      const dLng = (lng - lastPos.current.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lastPos.current.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      if (distance < metrosMin && timeSinceLast < msMin) return;
    }

    try {
      // El socket es el camino barato; la API, la red de seguridad para cuando
      // el servidor de la oficina no está.
      if (!enviarUbicacion(lat, lng)) {
        await otService.updateTechnicianLocation(user.id, user.name, lat, lng);
      }
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
