import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Boxes, Search, Loader2, Plus, X, Trash2, AlertCircle, Pencil, Calendar,
} from 'lucide-react';
import storeInventoryService from '@/api/storeInventoryService';
import { useAuth, ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

/* Inventario de tiendas: el material que surte el cliente y se resguarda en
   común. Es UNO SOLO para toda la operación — no cuelga de ningún proyecto —
   así que cualquier OT de tienda consulta este mismo listado desde su pestaña
   de Inventario. Aquí se captura y se actualiza la fecha de corte.

   El resguardo es compartido pero el material no: `brand` dice de qué cadena
   es cada renglón, y el filtro de marca evita surtir una tienda con equipo de
   otra. El catálogo de marcas es abierto —se aprende de lo capturado— igual
   que el de zonas: así no hay que dar de alta una cadena antes de operar. */

const FORM_VACIO = { brand: '', name: '', sku: '', quantity: '', unit: '', location: '', cutoffDate: '', notes: '' };

const SIN_MARCA = 'Sin marca';

const fmtFecha = (d) => d
  ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const fmtCantidad = (n) => Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 });

/** Un registro guardado, en el formato que espera el formulario. */
const aFormulario = (item) => ({
  brand:      item.brand || '',
  name:       item.name || '',
  sku:        item.sku || '',
  quantity:   item.quantity ?? '',
  unit:       item.unit || '',
  location:   item.location || '',
  cutoffDate: item.cutoffDate ? new Date(item.cutoffDate).toISOString().split('T')[0] : '',
  notes:      item.notes || '',
});

export default function StoreInventory() {
  const { user } = useAuth();
  const roles = user?.roles || [];
  const puedeEditar = [ROLES.ADMIN, ROLES.PM, ROLES.OPS].some(r => roles.includes(r));

  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [marca, setMarca] = useState('');      // '' = todas las marcas
  const [form, setForm] = useState(null);      // null = formulario cerrado
  const [editandoId, setEditandoId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setItems(await storeInventoryService.list());
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  // Marcas que ya se usaron. Catálogo abierto: se aprende de lo capturado.
  const marcas = useMemo(() => {
    const set = new Set();
    for (const i of items) if (i.brand?.trim()) set.add(i.brand.trim());
    return [...set].sort((a, b) => a.localeCompare(b, 'es'));
  }, [items]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter(i => {
      if (marca && (i.brand || '') !== marca) return false;
      if (!q) return true;
      return i.brand?.toLowerCase().includes(q)
        || i.name?.toLowerCase().includes(q)
        || i.sku?.toLowerCase().includes(q)
        || i.location?.toLowerCase().includes(q);
    });
  }, [items, busqueda, marca]);

  // La fecha de corte más reciente dice qué tan al día está el inventario.
  const ultimoCorte = useMemo(() => {
    const fechas = items.map(i => i.cutoffDate).filter(Boolean).map(d => new Date(d).getTime());
    return fechas.length ? new Date(Math.max(...fechas)) : null;
  }, [items]);

  const abrirAlta = () => { setEditandoId(null); setForm({ ...FORM_VACIO }); };
  const abrirEdicion = (item) => { setEditandoId(item.id); setForm(aFormulario(item)); };
  const cerrarForm = () => { setEditandoId(null); setForm(null); };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Falta el nombre del material'); return; }
    setGuardando(true);
    setError(null);
    try {
      if (editandoId) await storeInventoryService.update(editandoId, form);
      else            await storeInventoryService.create(form);
      cerrarForm();
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    setBorrando(id);
    setError(null);
    try {
      await storeInventoryService.remove(id);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setBorrando(null);
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-7 w-7 text-gray-300 animate-spin" />
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Cargando inventario...</p>
      </div>
    );
  }

  const campo = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:border-gray-900 transition-colors';
  const etiqueta = 'text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5';

  return (
    <div className="space-y-5 pb-16 max-w-6xl mx-auto">
      {/* ── Encabezado ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <Boxes className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Inventario de Tiendas</h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">
              Material surtido por el cliente · {items.length} {items.length === 1 ? 'registro' : 'registros'}
              {ultimoCorte && <> · último corte {fmtFecha(ultimoCorte)}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
            <Search className="h-3.5 w-3.5 text-gray-400" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar marca, material, clave o ubicación..."
              className="bg-transparent border-none outline-none text-xs font-bold text-gray-900 w-56"
            />
          </div>
          {marcas.length > 0 && (
            <select
              value={marca}
              onChange={e => setMarca(e.target.value)}
              className="cursor-pointer bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-[10px] font-black text-gray-700 uppercase tracking-widest outline-none focus:border-gray-900 transition-colors"
            >
              <option value="">Todas las marcas</option>
              {marcas.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
          {puedeEditar && !form && (
            <button
              type="button"
              onClick={abrirAlta}
              className="cursor-pointer flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
            >
              <Plus className="h-3 w-3" /> Agregar material
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] text-gray-400 font-medium">
        Este inventario es el mismo para todos los proyectos de tiendas. Cualquier técnico lo ve
        desde la pestaña <b>Inventario</b> de su orden de trabajo. La <b>marca</b> dice de qué
        cadena es cada material: filtra antes de surtir.
      </p>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-[11px] font-bold text-red-700">{error}</p>
        </div>
      )}

      {/* ── Alta / edición ── */}
      {form && (
        <form onSubmit={guardar} className="rounded-3xl border-2 border-gray-200 bg-gray-50/60 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
              {editandoId ? 'Editar material' : 'Nuevo material'}
            </p>
            <button type="button" onClick={cerrarForm} aria-label="Cancelar"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className={etiqueta}>Marca</label>
              <input list="marcas-inventario" className={campo} value={form.brand}
                onChange={e => setForm({ ...form, brand: e.target.value })}
                placeholder="Coppel, Elektra..." />
              <datalist id="marcas-inventario">
                {marcas.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div className="lg:col-span-2">
              <label className={etiqueta}>Material / equipo *</label>
              <input required className={campo} value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Luminaria LED 40W" />
            </div>
            <div>
              <label className={etiqueta}>Clave del cliente</label>
              <input className={campo} value={form.sku}
                onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="SKU" />
            </div>
            <div>
              <label className={etiqueta}>Cantidad disponible</label>
              <input type="number" step="any" className={campo} value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className={etiqueta}>Unidad</label>
              <input className={campo} value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="pza, m, rollo..." />
            </div>
            <div>
              <label className={etiqueta}>Ubicación / resguardo</label>
              <input className={campo} value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Bodega, tienda 213..." />
            </div>
            <div>
              <label className={etiqueta}>Fecha de corte</label>
              <input type="date" className={campo} value={form.cutoffDate}
                onChange={e => setForm({ ...form, cutoffDate: e.target.value })} />
            </div>
            <div className="lg:col-span-2">
              <label className={etiqueta}>Notas</label>
              <input className={campo} value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Observaciones del resguardo o del surtido" />
            </div>
          </div>

          <button type="submit" disabled={guardando}
            className={cn(
              'cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors',
              guardando && 'opacity-50 pointer-events-none'
            )}>
            {guardando && <Loader2 className="h-3 w-3 animate-spin" />}
            {guardando ? 'Guardando' : (editandoId ? 'Guardar cambios' : 'Agregar al inventario')}
          </button>
        </form>
      )}

      {/* ── Listado ── */}
      {filtrados.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-3xl py-16 text-center">
          <Boxes className="h-9 w-9 text-gray-200 mx-auto mb-3" />
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
            {items.length === 0 ? 'Inventario vacío' : 'Sin coincidencias'}
          </p>
          {items.length === 0 && puedeEditar && (
            <p className="text-[11px] text-gray-400 font-medium mt-2">
              Captura el material que la tienda tiene surtido para que los técnicos lo consulten.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['Marca', 'Material', 'Clave', 'Disponible', 'Ubicación', 'Corte', ''].map((h, i) => (
                    <th key={i} className="px-5 py-3 text-[9px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtrados.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={cn(
                        'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border',
                        item.brand
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-gray-50 text-gray-400 border-gray-200'
                      )}>
                        {item.brand || SIN_MARCA}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-black text-gray-900">{item.name}</p>
                      {item.notes && <p className="text-[10px] font-medium text-gray-400 mt-0.5">{item.notes}</p>}
                    </td>
                    <td className="px-5 py-4 text-[11px] font-mono font-bold text-gray-500 whitespace-nowrap">
                      {item.sku || '—'}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-sm font-black text-gray-900">{fmtCantidad(item.quantity)}</span>
                      {item.unit && <span className="text-[10px] font-bold text-gray-400 ml-1">{item.unit}</span>}
                    </td>
                    <td className="px-5 py-4 text-[11px] font-bold text-gray-500">{item.location || '—'}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                        <Calendar className="h-3 w-3 text-gray-300" /> {fmtFecha(item.cutoffDate)}
                      </span>
                      {item.updatedByName && (
                        <p className="text-[9px] font-medium text-gray-300 mt-0.5">por {item.updatedByName}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {puedeEditar && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button type="button" onClick={() => abrirEdicion(item)}
                            aria-label={`Editar ${item.name}`}
                            className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-400 transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => eliminar(item.id)} disabled={borrando === item.id}
                            aria-label={`Eliminar ${item.name}`}
                            className="p-2 rounded-xl border border-gray-200 text-gray-300 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-40">
                            {borrando === item.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
