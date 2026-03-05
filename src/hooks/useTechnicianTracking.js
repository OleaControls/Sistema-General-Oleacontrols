import { useEffect, useRef } from 'react';
import { useAuth, ROLES } from '@/store/AuthContext';
import { otService } from '@/api/otService';

export function useTechnicianTracking() {
  const { user } = useAuth();
  const lastPos = useRef(null);

  useEffect(() => {
    if (!user || user.role !== ROLES.TECH) return;

    let intervalId;

    const reportLocation = async (lat, lng) => {
        // OPTIMIZACIÓN: Solo reportar si hay un cambio significativo (> ~200 metros)
        if (lastPos.current) {
            const R = 6371e3; // radio de la tierra en metros
            const dLat = (lat - lastPos.current.lat) * Math.PI / 180;
            const dLng = (lng - lastPos.current.lng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lastPos.current.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                      Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c;

            if (distance < 200) {
                // console.log("Movimiento insignificante, no se gasta token.");
                return;
            }
        }

        try {
            await otService.updateTechnicianLocation(user.id, user.name, lat, lng);
            lastPos.current = { lat, lng };
        } catch (error) {
            console.error('Error reporting location:', error);
        }
    };

    const runTracking = async () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => reportLocation(pos.coords.latitude, pos.coords.longitude),
                (err) => { /* Silencioso para ahorrar logs */ }
            );
        }
    };

    runTracking();
    // OPTIMIZACIÓN: Intervalo de 5 minutos (300,000 ms) en lugar de 15 segundos
    intervalId = setInterval(runTracking, 300000); 

    return () => {
        if (intervalId) clearInterval(intervalId);
    };
  }, [user]);
}
