import React from 'react';
import { RefreshCw } from 'lucide-react';
import { actualizarAhora, vigilarVersionNueva } from '@/lib/actualizacion';
import { cn } from '@/lib/utils';

/**
 * Recarga la app trayendo la última versión. El punto verde avisa que ya hay
 * una versión nueva esperando.
 */
export default function BotonActualizar({ className }) {
  const [hayNueva, setHayNueva] = React.useState(false);
  const [cargando, setCargando] = React.useState(false);

  React.useEffect(() => vigilarVersionNueva(() => setHayNueva(true)), []);

  const actualizar = () => {
    if (cargando) return;
    setCargando(true);
    actualizarAhora();
  };

  return (
    <button
      type="button"
      onClick={actualizar}
      disabled={cargando}
      className={cn('relative p-2 text-gray-400 hover:text-primary transition-colors', hayNueva && 'text-emerald-600', className)}
      title={hayNueva ? 'Hay una versión nueva: toca para actualizar' : 'Actualizar la app'}
    >
      <RefreshCw className={cn('h-5 w-5', cargando && 'animate-spin')} />
      {hayNueva && (
        <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-white" />
      )}
    </button>
  );
}
