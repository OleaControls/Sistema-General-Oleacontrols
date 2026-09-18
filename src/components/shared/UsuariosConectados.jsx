import React from 'react';
import { Users } from 'lucide-react';
import { suscribirPresencia, hayRealtime } from '@/services/realtime';
import { cn } from '@/lib/utils';

/**
 * Indicador de quién está trabajando ahora mismo.
 *
 * Solo lo alimenta el servidor para los roles de supervisión; a los demás
 * simplemente no les llega nada y el componente no se pinta.
 *
 * Si el servidor de la oficina está caído no hay forma de saber quién está
 * conectado, así que se oculta. Mostrar "0 conectados" seria mentir: diria
 * que no hay nadie trabajando cuando lo que pasa es que no nos consta.
 */
export default function UsuariosConectados({ className }) {
  const [gente, setGente] = React.useState(null);
  const [abierto, setAbierto] = React.useState(false);

  React.useEffect(() => suscribirPresencia(setGente), []);

  if (!gente || !hayRealtime()) return null;

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-colors"
        title="Usuarios conectados ahora"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <Users className="h-3.5 w-3.5 text-emerald-700" />
        <span className="text-xs font-black text-emerald-800 leading-none">{gente.length}</span>
      </button>

      {abierto && (
        <>
          {/* Capa para cerrar al tocar fuera, sin listeners globales. */}
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 mt-2 w-64 z-50 bg-white border-2 border-gray-100 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h4 className="text-sm font-black text-gray-900 leading-none">En línea ahora</h4>
              <p className="text-[11px] font-medium text-gray-500 mt-1">
                {gente.length} {gente.length === 1 ? 'persona conectada' : 'personas conectadas'}
              </p>
            </div>
            <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
              {gente.map(u => (
                <li key={u.id} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">{u.email}</p>
                    <p className="text-[10px] font-medium text-gray-400 truncate">
                      {(u.roles || []).join(', ') || 'sin rol'}
                      {u.aparatos > 1 && ` · ${u.aparatos} sesiones`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
