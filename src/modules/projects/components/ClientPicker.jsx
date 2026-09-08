import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Search, ChevronDown, Check, MapPin, Phone, X, Plus, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { projectService } from '@/api/projectService';

/**
 * Selector de cliente del catálogo de OTs (/ops/ots/catalogs) para autocompletar
 * un proyecto.
 *
 * El catálogo `OTClient` ya guarda exactamente los datos que el acta pedía a
 * mano en cinco campos distintos. Esta es la única definición de esa
 * equivalencia: si el catálogo cambia, se ajusta aquí y no en cada pantalla.
 */
export function mapClientToProject(c) {
  const sucursal = [c.storeNumber, c.storeName].filter(Boolean).join(' ');
  const direccion = c.otAddress || c.address || '';
  return {
    clientName:         c.name || '',
    clientContactName:  c.contact || '',
    clientContactPhone: c.phone || '',
    clientContactEmail: c.email || '',
    location:           [sucursal, direccion].filter(Boolean).join(' — '),
  };
}

// Qué se va a sobrescribir, para decírselo al usuario antes de que pase.
export const CLIENT_FIELD_LABELS = ['Empresa', 'Encargado', 'Teléfono', 'Correo', 'Ubicación'];

function clientLabel(c) {
  const sucursal = [c.storeNumber, c.storeName].filter(Boolean).join(' ');
  return sucursal ? `${c.name} · ${sucursal}` : c.name;
}

// Los cuatro que el servidor exige (api/_handlers/ot-clients.js). El resto es
// opcional y se puede completar después desde /ops/ots/catalogs.
const NUEVO_VACIO = {
  name: '', storeNumber: '', storeName: '',
  contact: '', phone: '', email: '', address: '', otReference: '',
};

/**
 * Alta rápida de cliente sin salir del proyecto.
 *
 * Existe para que quien levanta el proyecto no se frene cuando el cliente
 * todavía no está en el catálogo: lo captura aquí, se guarda en OTClient y
 * queda disponible para las OT, sin que Operaciones lo capture de nuevo.
 */
function NuevoClienteForm({ nombreSugerido, onCancel, onCreated }) {
  const [f, setF] = useState({ ...NUEVO_VACIO, name: nombreSugerido || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setF(p => ({ ...p, [k]: e.target.value }));
  const listo = f.name.trim() && f.contact.trim() && f.phone.trim() && f.address.trim();

  const guardar = async () => {
    if (!listo || saving) return;
    setSaving(true);
    setError(null);
    try {
      const creado = await projectService.createOtClient({
        name:        f.name.trim(),
        storeNumber: f.storeNumber.trim() || null,
        storeName:   f.storeName.trim()   || null,
        contact:     f.contact.trim(),
        phone:       f.phone.trim(),
        email:       f.email.trim()       || null,
        address:     f.address.trim(),
        otReference: f.otReference.trim() || null,
      });
      onCreated(creado);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const campo = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-[12px] font-bold text-gray-800 outline-none focus:border-primary/50 placeholder:text-gray-300 placeholder:font-medium';
  const etiqueta = 'text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1';

  return (
    <div className="p-3 space-y-2.5">
      <div>
        <label className={etiqueta}>Razón social / Empresa *</label>
        <input value={f.name} onChange={set('name')} className={campo} placeholder="Coppel SA de CV" autoFocus />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={etiqueta}>No. sucursal</label>
          <input value={f.storeNumber} onChange={set('storeNumber')} className={campo} placeholder="152" />
        </div>
        <div>
          <label className={etiqueta}>Nombre sucursal</label>
          <input value={f.storeName} onChange={set('storeName')} className={campo} placeholder="Insurgentes Norte" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={etiqueta}>Contacto en sitio *</label>
          <input value={f.contact} onChange={set('contact')} className={campo} placeholder="Nombre del encargado" />
        </div>
        <div>
          <label className={etiqueta}>Teléfono *</label>
          <input value={f.phone} onChange={set('phone')} className={campo} placeholder="5512345678" inputMode="tel" />
        </div>
      </div>

      <div>
        <label className={etiqueta}>Email de contacto</label>
        <input value={f.email} onChange={set('email')} className={campo} placeholder="contacto@empresa.com" inputMode="email" />
      </div>

      <div>
        <label className={etiqueta}>Dirección *</label>
        <input value={f.address} onChange={set('address')} className={campo} placeholder="Av. Insurgentes Norte 1234, Col. Lindavista" />
      </div>

      <div>
        <label className={etiqueta}>Referencias de acceso</label>
        <input value={f.otReference} onChange={set('otReference')} className={campo} placeholder="Entrada por estacionamiento lateral" />
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[10px] font-bold text-red-600 leading-snug">{error}</p>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button" onClick={onCancel} disabled={saving}
          className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button" onClick={guardar} disabled={!listo || saving}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors',
            listo && !saving ? 'bg-primary text-white hover:bg-primary/90' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          )}
        >
          {saving
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…</>
            : <><Check className="h-3.5 w-3.5" /> Guardar en el catálogo</>}
        </button>
      </div>
      <p className="text-[9px] font-medium text-gray-400 leading-snug">
        Se guarda en el catálogo de clientes OT. Operaciones ya no tendrá que capturarlo.
      </p>
    </div>
  );
}

export default function ClientPicker({ clients = [], onPick, onCreated, compact = false, className }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(null);
  const [creando, setCreando] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (!creando) inputRef.current?.focus();
    // Con el alta abierta no se cierra por clic fuera: se perdería lo capturado.
    const onDown = (e) => {
      if (creando) return;
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (creando) { setCreando(false); return; }
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, creando]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clients.slice(0, 60);
    return clients
      .filter(c => [c.name, c.storeName, c.storeNumber, c.contact, c.phone]
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(t)))
      .slice(0, 60);
  }, [clients, q]);

  const pick = (c) => {
    onPick(mapClientToProject(c), c);
    setPicked(clientLabel(c));
    setOpen(false);
    setQ('');
  };

  // Recién creado: se avisa al padre para que lo sume al catálogo en pantalla
  // y se deja seleccionado, que es a lo que iba el usuario.
  const trasCrear = (creado) => {
    onCreated?.(creado);
    setCreando(false);
    pick(creado);
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div className={cn(
        'flex items-center gap-3 rounded-2xl border transition-colors',
        compact ? 'p-3' : 'p-4',
        picked ? 'border-emerald-200 bg-emerald-50/60' : 'border-primary/20 bg-primary/[0.04]'
      )}>
        <div className={cn(
          'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
          picked ? 'bg-emerald-100 text-emerald-600' : 'bg-primary/10 text-primary'
        )}>
          {picked ? <Check className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
        </div>

        <div className="flex-1 min-w-0">
          {picked ? (
            <>
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Cliente cargado</p>
              <p className="text-[11px] font-black text-gray-800 truncate">{picked}</p>
            </>
          ) : (
            <>
              <p className="text-[9px] font-black text-primary uppercase tracking-widest">Catálogo de clientes</p>
              <p className="text-[10px] font-bold text-gray-400 leading-tight">
                Búscalo y llena {CLIENT_FIELD_LABELS.join(', ').toLowerCase()} de una sola vez, o da de alta uno nuevo
              </p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => { setOpen(o => !o); setCreando(false); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-[10px] font-black text-gray-600 uppercase tracking-wider hover:border-primary/40 hover:text-primary transition-all shrink-0"
        >
          <Search className="h-3.5 w-3.5" />
          {picked ? 'Cambiar' : 'Buscar'}
          <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-180')} />
        </button>
      </div>

      {open && creando && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-100 bg-primary/[0.04]">
            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Nuevo cliente</p>
            <button type="button" onClick={() => setCreando(false)} className="p-1 text-gray-300 hover:text-gray-500">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-[26rem] overflow-y-auto">
            <NuevoClienteForm
              nombreSugerido={q}
              onCancel={() => setCreando(false)}
              onCreated={trasCrear}
            />
          </div>
        </div>
      )}

      {open && !creando && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
            <Search className="h-3.5 w-3.5 text-gray-300 shrink-0" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Empresa, sucursal, contacto o teléfono…"
              className="flex-1 min-w-0 bg-transparent text-[12px] font-bold text-gray-800 outline-none placeholder:text-gray-300 placeholder:font-medium"
            />
            {q && (
              <button type="button" onClick={() => setQ('')} className="p-1 text-gray-300 hover:text-gray-500 shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5">
            {clients.length === 0 ? (
              <p className="px-3 py-6 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">
                No hay clientes en el catálogo
              </p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-[10px] font-black text-gray-300 uppercase tracking-widest">
                Sin coincidencias para “{q}”
              </p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pick(c)}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-primary/5 transition-colors"
                >
                  <p className="text-[12px] font-black text-gray-900 truncate">{c.name}</p>
                  {[c.storeNumber, c.storeName].filter(Boolean).length > 0 && (
                    <p className="text-[10px] font-bold text-primary truncate">
                      {[c.storeNumber, c.storeName].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-0.5 text-[10px] font-medium text-gray-400 min-w-0">
                    {c.contact && <span className="truncate">{c.contact}</span>}
                    {c.phone && (
                      <span className="flex items-center gap-1 shrink-0">
                        <Phone className="h-2.5 w-2.5" />{c.phone}
                      </span>
                    )}
                  </div>
                  {(c.otAddress || c.address) && (
                    <p className="flex items-center gap-1 mt-0.5 text-[10px] font-medium text-gray-300 min-w-0">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{c.otAddress || c.address}</span>
                    </p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Salida cuando el cliente no está: se captura aquí y queda en el
              catálogo, en vez de mandar al usuario a /ops/ots/catalogs. */}
          <button
            type="button"
            onClick={() => setCreando(true)}
            className="w-full flex items-center gap-2 px-3 py-3 border-t border-gray-100 bg-gray-50/80 hover:bg-primary/5 transition-colors text-left"
          >
            <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Plus className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-black text-gray-800 truncate">
                {q.trim() ? `Dar de alta “${q.trim()}”` : 'Dar de alta un cliente nuevo'}
              </span>
              <span className="block text-[9px] font-bold text-gray-400">
                Se guarda en el catálogo de clientes OT
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
