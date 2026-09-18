import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { chatService } from '@/api/chatService';
import { suscribirCambios, hayRealtime } from '@/services/realtime';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

/** Mensajes sin leer. Lleva al chat de un clic. */
export default function IndicadorChat({ className }) {
  const { user } = useAuth();
  const navegar = useNavigate();
  const [sinLeer, setSinLeer] = React.useState(0);

  const cargar = React.useCallback(async () => {
    const { sinLeerTotal } = await chatService.conversaciones();
    setSinLeer(sinLeerTotal || 0);
  }, []);

  React.useEffect(() => { if (user) cargar(); }, [user, cargar]);

  React.useEffect(() => {
    if (!user) return;
    return suscribirCambios('Mensaje', cargar);
  }, [user, cargar]);

  // Respaldo sin realtime. Cada 2 minutos: el chat en si ya refresca cada 15s
  // cuando esta abierto, esto solo mantiene vivo el contador desde otra vista.
  React.useEffect(() => {
    if (!user) return;
    const t = setInterval(() => { if (!hayRealtime()) cargar(); }, 120000);
    return () => clearInterval(t);
  }, [user, cargar]);

  if (!user) return null;

  return (
    <button
      type="button"
      onClick={() => navegar('/chat')}
      className={cn('relative p-2 text-gray-400 hover:text-primary transition-colors', className)}
      title={sinLeer ? `${sinLeer} mensaje(s) sin leer` : 'Mensajes'}
    >
      <MessageSquare className="h-5 w-5" />
      {sinLeer > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center">
          {sinLeer > 9 ? '9+' : sinLeer}
        </span>
      )}
    </button>
  );
}
