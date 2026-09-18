import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { notificacionesService } from '@/api/notificacionesService';
import { suscribirCambios, hayRealtime } from '@/services/realtime';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

const MODULOS = {
  OTS:      { etiqueta: 'Operaciones', color: 'bg-blue-50 text-blue-700' },
  COMPRAS:  { etiqueta: 'Compras',     color: 'bg-amber-50 text-amber-700' },
  RH:       { etiqueta: 'Recursos H.', color: 'bg-purple-50 text-purple-700' },
  CRM:      { etiqueta: 'Ventas',      color: 'bg-emerald-50 text-emerald-700' },
  FINANZAS: { etiqueta: 'Finanzas',    color: 'bg-rose-50 text-rose-700' },
};

function haceCuanto(fecha) {
  const min = Math.floor((Date.now() - new Date(fecha).getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

export default function CampanaNotificaciones({ className }) {
  const { user } = useAuth();
  const navegar = useNavigate();
  const [lista, setLista] = React.useState([]);
  const [sinLeer, setSinLeer] = React.useState(0);
  const [abierto, setAbierto] = React.useState(false);

  const cargar = React.useCallback(async () => {
    const { notificaciones, sinLeer } = await notificacionesService.listar();
    setLista(notificaciones);
    setSinLeer(sinLeer);
  }, []);

  React.useEffect(() => { if (user) cargar(); }, [user, cargar]);

  // El servidor entrega estos avisos SOLO a las sesiones del destinatario, así
  // que si llega uno es mío y no hace falta comprobar nada.
  React.useEffect(() => {
    if (!user) return;
    return suscribirCambios('Notificacion', cargar);
  }, [user, cargar]);

  // Respaldo con el servidor de la oficina caído. Cada 2 minutos: una
  // notificación puede esperar ese rato, y son 30 consultas por jornada en vez
  // de las 2 880 que costaría revisar cada 10 segundos.
  React.useEffect(() => {
    if (!user) return;
    const t = setInterval(() => { if (!hayRealtime()) cargar(); }, 120000);
    return () => clearInterval(t);
  }, [user, cargar]);

  const abrir = async (n) => {
    setAbierto(false);
    if (!n.leida) {
      // Optimista: la campana responde al instante y el servidor confirma
      // después. Si falla, el siguiente cargar() la devuelve a como estaba.
      setSinLeer(s => Math.max(0, s - 1));
      setLista(l => l.map(x => x.id === n.id ? { ...x, leida: true } : x));
      await notificacionesService.marcarLeida(n.id);
    }
    if (n.enlace) navegar(n.enlace);
  };

  const marcarTodas = async () => {
    setSinLeer(0);
    setLista(l => l.map(x => ({ ...x, leida: true })));
    await notificacionesService.marcarLeida();
  };

  if (!user) return null;

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        className="relative p-2 text-gray-400 hover:text-primary transition-colors"
        title={sinLeer ? `${sinLeer} sin leer` : 'Notificaciones'}
      >
        <Bell className="h-5 w-5" />
        {sinLeer > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center">
            {sinLeer > 9 ? '9+' : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 mt-2 w-80 z-50 bg-white border-2 border-gray-100 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black text-gray-900 leading-none">Notificaciones</h4>
                <p className="text-[11px] font-medium text-gray-500 mt-1">
                  {sinLeer > 0 ? `${sinLeer} sin leer` : 'Todo al día'}
                </p>
              </div>
              {sinLeer > 0 && (
                <button
                  onClick={marcarTodas}
                  className="flex items-center gap-1 text-[10px] font-black text-primary hover:underline"
                >
                  <CheckCheck className="h-3 w-3" /> Marcar todas
                </button>
              )}
            </div>

            <ul className="max-h-96 overflow-y-auto divide-y divide-gray-50">
              {lista.length === 0 && (
                <li className="px-4 py-8 text-center">
                  <p className="text-xs font-medium text-gray-400">No tienes notificaciones</p>
                </li>
              )}
              {lista.map(n => {
                const mod = MODULOS[n.modulo] || { etiqueta: n.modulo, color: 'bg-gray-50 text-gray-600' };
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => abrir(n)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3',
                        !n.leida && 'bg-blue-50/40'
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full mt-1.5 shrink-0',
                        n.leida ? 'bg-transparent' : 'bg-blue-500')} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn('text-[9px] font-black uppercase px-1.5 py-0.5 rounded', mod.color)}>
                            {mod.etiqueta}
                          </span>
                          <span className="text-[10px] font-medium text-gray-400">{haceCuanto(n.createdAt)}</span>
                        </div>
                        <p className={cn('text-xs leading-tight text-gray-900',
                          n.leida ? 'font-medium' : 'font-black')}>{n.titulo}</p>
                        {n.cuerpo && (
                          <p className="text-[11px] font-medium text-gray-500 leading-tight mt-0.5 line-clamp-2">
                            {n.cuerpo}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
