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
        try {
            await otService.updateTechnicianLocation(user.id, user.name, lat, lng);
            lastPos.current = { lat, lng };
            // console.log(`Location reported for ${user.name}: ${lat}, ${lng}`);
        } catch (error) {
            console.error('Error reporting location:', error);
        }
    };

    const runTracking = async () => {
        if ("geolocation" in navigator && window.isSecureContext) {
            navigator.geolocation.getCurrentPosition(
                (pos) => reportLocation(pos.coords.latitude, pos.coords.longitude),
                (err) => runSimulation()
            );
        } else {
            runSimulation();
        }
    };

    const runSimulation = async () => {
        // More realistic simulation: move toward an OT location
        const ots = await otService.getOTs();
        const myActiveOT = ots.find(o => 
            (o.leadTechId === user.id || o.supportTechs?.some(st => st.id === user.id)) &&
            ['ACCEPTED', 'IN_PROGRESS'].includes(o.status)
        );

        let targetLat = 19.4326;
        let targetLng = -99.1332;

        if (myActiveOT) {
            targetLat = myActiveOT.lat;
            targetLng = myActiveOT.lng;
        }

        const currentPos = lastPos.current || { lat: 19.43, lng: -99.13 };
        
        // Move 5% closer to target each step
        const newLat = currentPos.lat + (targetLat - currentPos.lat) * 0.05;
        const newLng = currentPos.lng + (targetLng - currentPos.lng) * 0.05;
        
        reportLocation(newLat, newLng);
    };

    runTracking();
    intervalId = setInterval(runTracking, 15000); // More frequent for prototype visibility

    return () => {
        if (intervalId) clearInterval(intervalId);
    };
  }, [user]);
}
