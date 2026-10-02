import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Calendar as CalendarIcon, Clock, MapPin, Search, Building2, Phone, User,
  Loader2, Check, AlignLeft, Sun, Info, ChevronDown,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

/* Formulario para agendar una actividad en la Agenda Operativa.
 *
 * Usa todos los campos que ya guarda CalendarEvent —descripción, hora de fin y
 * "todo el día" existían en la base pero el formulario anterior no los pedía—,
 * así que no hace falta migración. */

const DURACIONES = [
  { min: 30,  label: '30 min' },
  { min: 60,  label: '1 h' },
  { min: 120, label: '2 h' },
  { min: 240, label: '4 h' },
];

const AYUDA_TIPO = {
  VISIT:       { texto: 'Levantamiento, revisión o diagnóstico en sitio.', ejemplo: 'Ej. Levantamiento de cámaras en bodega' },
  MAINTENANCE: { texto: 'Servicio preventivo o correctivo programado.',    ejemplo: 'Ej. Mantenimiento preventivo de control de acceso' },
  OTHER:       { texto: 'Junta, capacitación, entrega u otra actividad.',  ejemplo: 'Ej. Junta de arranque con el cliente' },
};

const pad = (n) => String(n).padStart(2, '0');
const aFechaInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const sumarMin = (hora, min) => {
  const [h, m] = hora.split(':').map(Number);
  const t = Math.min(h * 60 + m + min, 23 * 60 + 59);
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`;
};
const minutosEntre = (a, b) => {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return (bh * 60 + bm) - (ah * 60 + am);
};
// "Jueves, 1 de octubre": mayúscula solo al inicio (la clase `capitalize` de
// CSS ponía "1 De Octubre").
const fechaLarga = (s) => {
  if (!s) return '';
  const t = new Date(`${s}T12:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const textoDuracion = (min) => min >= 60
  ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`
  : `${min} min`;

function proximoLunes() {
  const d = new Date();
  d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7));
  return d;
}

const vacio = (fecha) => ({
  type: 'VISIT', title: '', description: '',
  date: fecha || aFechaInput(new Date()),
  allDay: false, startTime: '09:00', endTime: '10:00',
  otClientId: '',
});

export default function AgendarActividadModal({ open, onClose, onSaved, clients = [], tipos, fechaInicial }) {
  const [form, setForm] = useState(() => vacio(fechaInicial));
  const [buscar, setBuscar] = useState('');
  const [listaAbierta, setListaAbierta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // Cada vez que se abre arranca limpio, en la fecha del día que se tocó.
  useEffect(() => {
    if (open) { setForm(vacio(fechaInicial)); setBuscar(''); setError(''); setListaAbierta(false); }
  }, [open, fechaInicial]);

  const set = (campo) => (v) => setForm(f => ({ ...f, [campo]: v }));
  const tipo = tipos[form.type];
  const acento = tipo?.pill?.dot || '#111827';
  const duracion = form.allDay ? 0 : minutosEntre(form.startTime, form.endTime);
  const cliente = clients.find(c => c.id === form.otClientId);

  const clientesFiltrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    const lista = q
      ? clients.filter(c => [c.name, c.storeName, c.storeNumber, c.contact, c.address]
          .some(v => v?.toLowerCase().includes(q)))
      : clients;
    return lista.slice(0, 30);
  }, [clients, buscar]);

  // Al mover la hora de inicio, la de fin se recorre y conserva la duración.
  const cambiarInicio = (hora) => {
    const dur = duracion > 0 ? duracion : 60;
    setForm(f => ({ ...f, startTime: hora, endTime: sumarMin(hora, dur) }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Ponle un título a la actividad.');
    if (!form.allDay && duracion <= 0) return setError('La hora de fin debe ser después de la de inicio.');

    const inicio = new Date(`${form.date}T${form.allDay ? '00:00' : form.startTime}`);
    const fin = form.allDay ? null : new Date(`${form.date}T${form.endTime}`);
    setGuardando(true);
    try {
      const res = await apiFetch('/api/calendar', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || null,
          type: form.type,
          startDate: inicio.toISOString(),
          endDate: fin ? fin.toISOString() : null,
          allDay: form.allDay,
          // Antes se mandaba `EVENT_TYPES[...].color`, que no existe: siempre
          // quedaba el azul por omisión. Ahora va el color real del tipo.
          color: acento,
          otClientId: form.otClientId || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'No se pudo guardar');
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (!open) return null;

  const etiqueta = 'text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5';
  const campo = 'w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-gray-900 transition-all font-bold text-sm text-gray-900 placeholder:text-gray-300 placeholder:font-medium';

  return (
    <div className="fixed inset-0 modal-seguro bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

        {/* ── Encabezado: toma el color del tipo elegido ── */}
        <div className="relative p-6 sm:p-8 text-white overflow-hidden" style={{ background: `linear-gradient(135deg, #030712 0%, #111827 55%, ${acento}55 100%)` }}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-40" style={{ background: acento }} />
          <button type="button" onClick={onClose} className="absolute top-5 right-5 p-2 hover:bg-white/10 rounded-xl transition-colors" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
          <div className="relative flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${acento}33` }}>
              {tipo ? <tipo.icon className="h-6 w-6" style={{ color: acento }} /> : <CalendarIcon className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-[0.2em]">Agenda Operativa</p>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Agendar actividad</h2>
              <p className="text-xs font-medium text-gray-300 mt-0.5 truncate">
                {fechaLarga(form.date)}{!form.allDay && form.startTime ? ` · ${form.startTime}` : ''}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={guardar} className="p-5 sm:p-8 space-y-7">

          {/* ── 1. ¿Qué? ── */}
          <section className="space-y-4">
            <Paso n={1} titulo="¿Qué vas a hacer?" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {Object.entries(tipos).map(([clave, meta]) => {
                const activo = form.type === clave;
                return (
                  <button
                    key={clave}
                    type="button"
                    onClick={() => set('type')(clave)}
                    className={cn('flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2 p-3.5 rounded-2xl border-2 text-left transition-all',
                      activo ? 'shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200')}
                    style={activo ? { borderColor: meta.pill.dot, background: meta.pill.bg } : undefined}
                  >
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: activo ? meta.pill.dot : '#f3f4f6' }}>
                      <meta.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" style={{ color: activo ? '#fff' : '#9ca3af' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: activo ? meta.pill.text : '#374151' }}>{meta.label}</p>
                      <p className="text-[10px] font-medium text-gray-400 leading-tight mt-0.5">{AYUDA_TIPO[clave]?.texto}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div>
              <label className={etiqueta}>Título *</label>
              <input
                required maxLength={120}
                className={campo}
                placeholder={AYUDA_TIPO[form.type]?.ejemplo || 'Título de la actividad'}
                value={form.title}
                onChange={e => set('title')(e.target.value)}
              />
            </div>

            <div>
              <label className={etiqueta}><AlignLeft className="h-3 w-3" /> Detalles <span className="normal-case tracking-normal font-medium text-gray-300">(opcional)</span></label>
              <textarea
                rows={3} maxLength={1500}
                className={cn(campo, 'resize-none font-medium')}
                placeholder="Qué se va a revisar, material o herramienta a llevar, con quién preguntar al llegar…"
                value={form.description}
                onChange={e => set('description')(e.target.value)}
              />
            </div>
          </section>

          {/* ── 2. ¿Cuándo? ── */}
          <section className="space-y-4">
            <Paso n={2} titulo="¿Cuándo?" />
            <div>
              <label className={etiqueta}><CalendarIcon className="h-3 w-3" /> Fecha *</label>
              <input required type="date" className={campo} value={form.date} onChange={e => set('date')(e.target.value)} />
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  ['Hoy', new Date()],
                  ['Mañana', new Date(Date.now() + 86400000)],
                  ['Próximo lunes', proximoLunes()],
                ].map(([texto, d]) => {
                  const valor = aFechaInput(d);
                  return (
                    <button key={texto} type="button" onClick={() => set('date')(valor)}
                      className={cn('px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all',
                        form.date === valor ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300')}>
                      {texto}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-gray-100 bg-gray-50 cursor-pointer select-none">
              <span className="flex items-center gap-2 text-xs font-black text-gray-700"><Sun className="h-4 w-4 text-amber-500" /> Todo el día</span>
              <span className={cn('relative h-6 w-11 rounded-full transition-colors', form.allDay ? 'bg-gray-900' : 'bg-gray-200')}>
                <input type="checkbox" className="sr-only" checked={form.allDay} onChange={e => set('allDay')(e.target.checked)} />
                <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', form.allDay ? 'left-[22px]' : 'left-0.5')} />
              </span>
            </label>

            {!form.allDay && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={etiqueta}><Clock className="h-3 w-3" /> Inicio *</label>
                    <input required type="time" className={campo} value={form.startTime} onChange={e => cambiarInicio(e.target.value)} />
                  </div>
                  <div>
                    <label className={etiqueta}><Clock className="h-3 w-3" /> Fin *</label>
                    <input required type="time" className={cn(campo, duracion <= 0 && 'border-red-300 bg-red-50')} value={form.endTime} onChange={e => set('endTime')(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-1">Duración</span>
                  {DURACIONES.map(d => (
                    <button key={d.min} type="button" onClick={() => set('endTime')(sumarMin(form.startTime, d.min))}
                      className={cn('px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all',
                        duracion === d.min ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300')}>
                      {d.label}
                    </button>
                  ))}
                  {duracion > 0 && !DURACIONES.some(d => d.min === duracion) && (
                    <span className="text-[10px] font-bold text-gray-500">{textoDuracion(duracion)}</span>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ── 3. ¿Para quién? ── */}
          <section className="space-y-3">
            <Paso n={3} titulo="¿Para quién?" opcional />
            {cliente ? (
              <div className="rounded-2xl border border-gray-200 p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0"><Building2 className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-gray-900 truncate">{cliente.name}</p>
                      {(cliente.storeName || cliente.storeNumber) && (
                        <p className="text-[11px] font-bold text-gray-400 truncate">
                          {[cliente.storeNumber && `#${cliente.storeNumber}`, cliente.storeName].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={() => set('otClientId')('')} className="text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-red-500 shrink-0">Quitar</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-medium text-gray-600">
                  {cliente.contact && <p className="flex items-center gap-1.5 min-w-0"><User className="h-3.5 w-3.5 text-gray-400 shrink-0" /><span className="truncate">{cliente.contact}</span></p>}
                  {cliente.phone && <a href={`tel:${cliente.phone}`} className="flex items-center gap-1.5 hover:text-gray-900"><Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />{cliente.phone}</a>}
                  {(cliente.otAddress || cliente.address) && (
                    <p className="flex items-start gap-1.5 sm:col-span-2"><MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-px" />{cliente.otAddress || cliente.address}</p>
                  )}
                  {cliente.otReference && (
                    <p className="flex items-start gap-1.5 sm:col-span-2 text-gray-500"><Info className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-px" />{cliente.otReference}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  className={cn(campo, 'pl-11 pr-10')}
                  placeholder={clients.length ? 'Buscar cliente, sucursal o contacto…' : 'No hay clientes en el catálogo'}
                  disabled={!clients.length}
                  value={buscar}
                  onFocus={() => setListaAbierta(true)}
                  onChange={e => { setBuscar(e.target.value); setListaAbierta(true); }}
                />
                <ChevronDown className="h-4 w-4 text-gray-300 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                {listaAbierta && clients.length > 0 && (
                  <ul className="absolute z-10 left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-xl py-1">
                    {clientesFiltrados.length === 0 && <li className="px-4 py-3 text-xs font-medium text-gray-400">Sin coincidencias</li>}
                    {clientesFiltrados.map(c => (
                      <li key={c.id}>
                        <button type="button"
                          onClick={() => { set('otClientId')(c.id); setListaAbierta(false); setBuscar(''); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-gray-300 shrink-0" />
                          <span className="min-w-0">
                            <span className="block text-xs font-black text-gray-800 truncate">{c.name}</span>
                            <span className="block text-[10px] font-medium text-gray-400 truncate">
                              {[c.storeName, c.otAddress || c.address].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* ── Resumen ── */}
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: tipo?.pill?.bg || '#f9fafb', border: `1px solid ${tipo?.pill?.border || '#f3f4f6'}` }}>
            <Check className="h-4 w-4 shrink-0 mt-0.5" style={{ color: tipo?.pill?.text }} />
            <p className="text-xs font-bold leading-relaxed" style={{ color: tipo?.pill?.text || '#374151' }}>
              {tipo?.label}: <span className="font-black">{form.title.trim() || 'sin título'}</span>
              {' · '}{fechaLarga(form.date)}
              {' · '}{form.allDay ? 'todo el día' : `${form.startTime}–${form.endTime}${duracion > 0 ? ` (${textoDuracion(duracion)})` : ''}`}
              {cliente && <> · {cliente.name}</>}
            </p>
          </div>

          {error && (
            <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button type="button" onClick={onClose} className="sm:w-40 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 flex items-center justify-center gap-2 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg transition-all disabled:opacity-60"
              style={{ background: '#030712', boxShadow: `0 10px 24px ${acento}40` }}>
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarIcon className="h-4 w-4" />}
              {guardando ? 'Guardando…' : 'Agendar actividad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Paso({ n, titulo, opcional }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-6 w-6 rounded-lg bg-gray-900 text-white text-[11px] font-black flex items-center justify-center">{n}</span>
      <h3 className="text-sm font-black text-gray-900">{titulo}</h3>
      {opcional && <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Opcional</span>}
    </div>
  );
}
