import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';

export default function ConnectivityAlert() {
  const isOnline = useNetworkStatus();
  const [showOnline, setShowOnline] = React.useState(false);

  React.useEffect(() => {
    if (isOnline) {
      setShowOnline(true);
      const timer = setTimeout(() => setShowOnline(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
        <div className="bg-white border-2 border-red-100 p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm">
          <div className="h-10 w-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center shrink-0">
            <WifiOff className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900 leading-none mb-1">Sin Conexión</h4>
            <p className="text-[11px] font-medium text-gray-500 leading-tight">Trabajando en modo offline. Los cambios se sincronizarán al volver.</p>
          </div>
        </div>
      </div>
    );
  }

  if (showOnline) {
    return (
      <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-500">
        <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-sm">
          <div className="h-10 w-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center shrink-0">
            <Wifi className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white leading-none mb-1">Conexión Restablecida</h4>
            <p className="text-[11px] font-medium text-gray-400 leading-tight">Sincronización de datos completada exitosamente.</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
