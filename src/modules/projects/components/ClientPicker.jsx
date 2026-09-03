import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Search, ChevronDown, Check, MapPin, Phone, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

export default function ClientPicker({ clients = [], onPick, compact = false, className }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(null);
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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
                Llena {CLIENT_FIELD_LABELS.join(', ').toLowerCase()} de una sola vez
              </p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-[10px] font-black text-gray-600 uppercase tracking-wider hover:border-primary/40 hover:text-primary transition-all shrink-0"
        >
          <Search className="h-3.5 w-3.5" />
          {picked ? 'Cambiar' : 'Buscar'}
          <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', open && 'rotate-180')} />
        </button>
      </div>

      {open && (
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
        </div>
      )}
    </div>
  );
}
