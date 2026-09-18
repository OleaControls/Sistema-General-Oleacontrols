import React from 'react';
import { MessageSquare, Send, Search, Plus, ArrowLeft, Users } from 'lucide-react';
import { chatService } from '@/api/chatService';
import { hrService } from '@/api/hrService';
import { suscribirCambios, hayRealtime } from '@/services/realtime';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

function hora(fecha) {
  return new Date(fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function diaLegible(fecha) {
  const d = new Date(fecha);
  const hoy = new Date();
  const ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
  if (d.toDateString() === hoy.toDateString()) return 'Hoy';
  if (d.toDateString() === ayer.toDateString()) return 'Ayer';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}

function Inicial({ nombre, avatar, tamano = 'h-10 w-10' }) {
  if (avatar) return <img src={avatar} alt="" className={cn(tamano, 'rounded-full object-cover shrink-0')} />;
  return (
    <div className={cn(tamano, 'rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0')}>
      <span className="text-xs font-black">{(nombre || '?').charAt(0).toUpperCase()}</span>
    </div>
  );
}

export default function Chat() {
  const { user } = useAuth();
  const [conversaciones, setConversaciones] = React.useState([]);
  const [activa, setActiva] = React.useState(null);
  const [mensajes, setMensajes] = React.useState([]);
  const [texto, setTexto] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);
  const [cargando, setCargando] = React.useState(true);
  const [buscar, setBuscar] = React.useState('');
  const [nuevaAbierta, setNuevaAbierta] = React.useState(false);
  const [gente, setGente] = React.useState([]);
  const finRef = React.useRef(null);

  const cargarConversaciones = React.useCallback(async () => {
    const { conversaciones } = await chatService.conversaciones();
    setConversaciones(conversaciones);
    setCargando(false);
  }, []);

  React.useEffect(() => { cargarConversaciones(); }, [cargarConversaciones]);

  const cargarMensajes = React.useCallback(async (convId) => {
    const { mensajes } = await chatService.mensajes(convId);
    setMensajes(mensajes);
    await chatService.marcarLeida(convId);
    cargarConversaciones();
  }, [cargarConversaciones]);

  // Abrir una conversación la marca como leída.
  React.useEffect(() => {
    if (activa) cargarMensajes(activa.id);
    else setMensajes([]);
  }, [activa, cargarMensajes]);

  // El servidor entrega el aviso solo a los miembros de la conversación, así
  // que si llega uno es de un hilo mío. Se recarga la lista siempre —para el
  // contador— y el hilo solo si es el que está abierto.
  React.useEffect(() => {
    return suscribirCambios('Mensaje', (evento) => {
      cargarConversaciones();
      if (activa && evento.padre === activa.id) cargarMensajes(activa.id);
    });
  }, [activa, cargarConversaciones, cargarMensajes]);

  // Respaldo con el servidor de la oficina caído: sin esto el chat se quedaría
  // mudo sin avisar, que es peor que ir lento.
  React.useEffect(() => {
    const t = setInterval(() => {
      if (hayRealtime()) return;
      cargarConversaciones();
      if (activa) cargarMensajes(activa.id);
    }, 15000);
    return () => clearInterval(t);
  }, [activa, cargarConversaciones, cargarMensajes]);

  React.useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  const enviar = async (e) => {
    e.preventDefault();
    const cuerpo = texto.trim();
    if (!cuerpo || !activa || enviando) return;
    setEnviando(true);
    setTexto('');
    try {
      const nuevo = await chatService.enviar(activa.id, cuerpo);
      // Se pinta de inmediato en vez de esperar al aviso: quien escribe debe
      // ver su mensaje al instante aunque el servidor realtime esté caído.
      setMensajes(m => [...m, nuevo]);
      cargarConversaciones();
    } catch (err) {
      alert(err.message);
      setTexto(cuerpo); // no se pierde lo escrito
    } finally {
      setEnviando(false);
    }
  };

  const abrirNueva = async () => {
    setNuevaAbierta(true);
    if (!gente.length) {
      try { setGente(await hrService.getEmployees()); } catch { /* lista vacía */ }
    }
  };

  const iniciarCon = async (empleadoId) => {
    try {
      const { id } = await chatService.abrirCon(empleadoId);
      setNuevaAbierta(false);
      await cargarConversaciones();
      const { conversaciones } = await chatService.conversaciones();
      setActiva(conversaciones.find(c => c.id === id) || null);
    } catch (err) { alert(err.message); }
  };

  const filtradas = conversaciones.filter(c =>
    c.nombre?.toLowerCase().includes(buscar.toLowerCase()));

  const candidatos = gente
    .filter(e => e.id !== user?.id && e.status !== 'INACTIVE')
    .filter(e => e.name?.toLowerCase().includes(buscar.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-10rem)] bg-white border-2 border-gray-100 rounded-2xl overflow-hidden">

      {/* ── Lista de conversaciones ─────────────────────────────────────── */}
      <aside className={cn(
        'w-full md:w-80 border-r border-gray-100 flex flex-col shrink-0',
        activa && 'hidden md:flex'
      )}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-gray-900">Mensajes</h2>
            <button
              onClick={abrirNueva}
              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              title="Nueva conversación"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              placeholder={nuevaAbierta ? 'Buscar persona...' : 'Buscar...'}
              className="w-full bg-gray-50 rounded-xl pl-9 pr-3 py-2 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {nuevaAbierta ? (
            <>
              <button
                onClick={() => { setNuevaAbierta(false); setBuscar(''); }}
                className="w-full px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left hover:text-primary"
              >
                ← Volver a mis conversaciones
              </button>
              {candidatos.map(p => (
                <button key={p.id} onClick={() => iniciarCon(p.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left">
                  <Inicial nombre={p.name} avatar={p.avatar} />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-gray-900 truncate">{p.name}</p>
                    <p className="text-[10px] font-medium text-gray-400 truncate">{p.position || 'Sin puesto'}</p>
                  </div>
                </button>
              ))}
            </>
          ) : cargando ? (
            <p className="px-4 py-8 text-center text-xs font-medium text-gray-400">Cargando...</p>
          ) : filtradas.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <MessageSquare className="h-8 w-8 text-gray-200 mx-auto mb-3" />
              <p className="text-xs font-bold text-gray-400">No tienes conversaciones</p>
              <button onClick={abrirNueva} className="mt-2 text-[11px] font-black text-primary hover:underline">
                Empezar una
              </button>
            </div>
          ) : filtradas.map(c => (
            <button key={c.id} onClick={() => setActiva(c)}
              className={cn(
                'w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left border-l-2',
                activa?.id === c.id ? 'bg-primary/5 border-primary' : 'border-transparent'
              )}>
              {c.tipo === 'GRUPO'
                ? <div className="h-10 w-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0"><Users className="h-4 w-4" /></div>
                : <Inicial nombre={c.nombre} avatar={c.avatar} />}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-black text-gray-900 truncate">{c.nombre}</p>
                  {c.sinLeer > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] px-1 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center">
                      {c.sinLeer > 9 ? '9+' : c.sinLeer}
                    </span>
                  )}
                </div>
                <p className={cn('text-[11px] truncate leading-tight mt-0.5',
                  c.sinLeer > 0 ? 'font-bold text-gray-700' : 'font-medium text-gray-400')}>
                  {c.ultimoMensaje
                    ? `${c.ultimoMensaje.mio ? 'Tú: ' : ''}${c.ultimoMensaje.cuerpo}`
                    : 'Sin mensajes'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Hilo ────────────────────────────────────────────────────────── */}
      <section className={cn('flex-1 flex flex-col min-w-0', !activa && 'hidden md:flex')}>
        {!activa ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare className="h-10 w-10 text-gray-200 mb-3" />
            <p className="text-sm font-black text-gray-400">Elige una conversación</p>
            <p className="text-[11px] font-medium text-gray-400 mt-1">o empieza una nueva</p>
          </div>
        ) : (
          <>
            <header className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
              <button onClick={() => setActiva(null)} className="md:hidden p-1 text-gray-400">
                <ArrowLeft className="h-4 w-4" />
              </button>
              {activa.tipo === 'GRUPO'
                ? <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center"><Users className="h-4 w-4" /></div>
                : <Inicial nombre={activa.nombre} avatar={activa.avatar} tamano="h-9 w-9" />}
              <div className="min-w-0">
                <p className="text-xs font-black text-gray-900 truncate">{activa.nombre}</p>
                <p className="text-[10px] font-medium text-gray-400 truncate">
                  {activa.tipo === 'GRUPO'
                    ? `${activa.participantes.length + 1} participantes`
                    : (activa.participantes[0]?.position || '')}
                </p>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50">
              {mensajes.map((m, i) => {
                const mio = m.autorId === user?.id;
                const anterior = mensajes[i - 1];
                const nuevoDia = !anterior ||
                  new Date(anterior.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                return (
                  <React.Fragment key={m.id}>
                    {nuevoDia && (
                      <div className="flex justify-center py-2">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-gray-100">
                          {diaLegible(m.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={cn('flex gap-2', mio ? 'justify-end' : 'justify-start')}>
                      {!mio && <Inicial nombre={m.autor?.name} avatar={m.autor?.avatar} tamano="h-7 w-7" />}
                      <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2',
                        mio ? 'bg-primary text-white' : 'bg-white border border-gray-100')}>
                        {!mio && activa.tipo === 'GRUPO' && (
                          <p className="text-[10px] font-black text-primary mb-0.5">{m.autor?.name}</p>
                        )}
                        <p className={cn('text-xs font-medium leading-relaxed whitespace-pre-wrap break-words',
                          mio ? 'text-white' : 'text-gray-800')}>{m.cuerpo}</p>
                        <p className={cn('text-[9px] font-bold mt-1 text-right',
                          mio ? 'text-white/60' : 'text-gray-400')}>{hora(m.createdAt)}</p>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={finRef} />
            </div>

            <form onSubmit={enviar} className="p-3 border-t border-gray-100 flex items-center gap-2">
              <input
                value={texto}
                onChange={e => setTexto(e.target.value)}
                placeholder="Escribe un mensaje..."
                maxLength={4000}
                className="flex-1 bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                disabled={!texto.trim() || enviando}
                className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
