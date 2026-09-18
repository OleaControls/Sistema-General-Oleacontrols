import React from 'react';
import { CloudOff, Loader2 } from 'lucide-react';
import { pendientes, alCambiarOutbox, reenviar } from '@/lib/outbox';
import { cn } from '@/lib/utils';

/**
 * Cuantas escrituras esperan a que vuelva la red.
 *
 * Se muestra solo cuando hay algo pendiente. La idea es que el tecnico sepa que
 * su trabajo NO se perdio —esta guardado y va a subir solo— en vez de quedarse
 * con la duda de si tiene que volver a capturarlo.
 */
export default function PendientesPorSubir({ className }) {
  const [cuantas, setCuantas] = React.useState(0);
  const [enviando, setEnviando] = React.useState(false);

  const revisar = React.useCallback(async () => setCuantas(await pendientes()), []);

  React.useEffect(() => {
    revisar();
    return alCambiarOutbox(revisar);
  }, [revisar]);

  if (cuantas === 0) return null;

  const intentarAhora = async () => {
    setEnviando(true);
    await reenviar();
    await revisar();
    setEnviando(false);
  };

  return (
    <button
      type="button"
      onClick={intentarAhora}
      disabled={enviando}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors',
        className
      )}
      title="Trabajo guardado en este dispositivo, pendiente de subir. Toca para reintentar."
    >
      {enviando
        ? <Loader2 className="h-3.5 w-3.5 text-amber-700 animate-spin" />
        : <CloudOff className="h-3.5 w-3.5 text-amber-700" />}
      <span className="text-[11px] font-black text-amber-800 leading-none">
        {cuantas} por subir
      </span>
    </button>
  );
}
