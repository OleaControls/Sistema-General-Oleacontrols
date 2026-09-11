import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, PlusCircle, Search, Loader2, AlertCircle, Edit3, Trash2, X, ArrowLeft, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/AuthContext';
import comprasService from '@/api/comprasService';
import { puedeEditarCompras } from '@/lib/compras';
import {
  HeaderPremium, BotonPrimario, BotonFantasma, CajaFiltro, SortTH, VacioTabla, ordenar,
} from '../components/ComprasUI';

const VACIO = {
  name: '', rfc: '', contactName: '', phone: '', email: '',
  address: '', city: '', state: '', zip: '', country: 'México',
  paymentTerms: '', notes: '',
};

const input = 'w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[13px] font-bold text-gray-800 outline-none focus:border-slate-400 placeholder:text-gray-300 placeholder:font-medium';
const label = 'text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5';

export default function Suppliers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const roles = user?.roles || [user?.role].filter(Boolean);
  const puedeEditar = puedeEditarCompras(roles);

  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', dir: 1 });
  const [form, setForm] = useState(null);      // null = cerrado
  const [editId, setEditId] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setProveedores(await comprasService.proveedores({ all: '1' })); }
    catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const toggleSort = (col) =>
    setSortConfig(c => (c.key === col ? { key: col, dir: -c.dir } : { key: col, dir: 1 }));

  const activos   = useMemo(() => proveedores.filter(p => p.status !== 'INACTIVE').length, [proveedores]);
  const inactivos = useMemo(() => proveedores.filter(p => p.status === 'INACTIVE').length, [proveedores]);
  const conRfc    = useMemo(() => proveedores.filter(p => p.rfc).length, [proveedores]);

  const visibles = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    const base = !t ? proveedores : proveedores.filter(p =>
      [p.name, p.rfc, p.contactName, p.city].filter(Boolean)
        .some(v => String(v).toLowerCase().includes(t))
    );
    return ordenar(base, sortConfig, (p, key) => ({
      name: p.name, rfc: p.rfc, contacto: p.contactName,
      ciudad: [p.city, p.state].filter(Boolean).join(', '), terms: p.paymentTerms,
    })[key]);
  }, [proveedores, busqueda, sortConfig]);

  const abrirNuevo = () => { setForm({ ...VACIO }); setEditId(null); setError(null); };
  const abrirEdicion = (p) => {
    setForm({ ...VACIO, ...Object.fromEntries(Object.keys(VACIO).map(k => [k, p[k] ?? ''])) });
    setEditId(p.id);
    setError(null);
  };

  const setF = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const guardar = async () => {
    if (!form.name.trim()) { setError('La razón social es obligatoria.'); return; }
    setGuardando(true); setError(null);
    try {
      if (editId) await comprasService.actualizarProveedor(editId, form);
      else await comprasService.crearProveedor(form);
      setForm(null); setEditId(null);
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (p) => {
    if (!confirm(`¿Eliminar a ${p.name}?`)) return;
    try {
      const r = await comprasService.eliminarProveedor(p.id);
      if (r.desactivado) {
        alert(`${p.name} tiene ${r.ordenes} ${r.ordenes === 1 ? 'orden' : 'órdenes'} de compra, así que se marcó como inactivo en vez de borrarlo. Su historial se conserva.`);
      }
      await cargar();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6 pb-20">

      <HeaderPremium
        eyebrow="OleaControls · Compras"
        titulo="Proveedores"
        subtitulo={`${proveedores.length} proveedor${proveedores.length !== 1 ? 'es' : ''} en el catálogo`}
        accion={
          <>
            <BotonFantasma onClick={() => navigate('/compras')}>
              <ArrowLeft size={15} /> Órdenes
            </BotonFantasma>
            {puedeEditar && (
              <BotonPrimario onClick={abrirNuevo}>
                <PlusCircle size={16} /> Nuevo Proveedor
              </BotonPrimario>
            )}
          </>
        }
        kpis={[
          { label: 'Activos',   value: activos,   color: '#6ee7b7', accent: 'rgba(110,231,183,.15)' },
          { label: 'Inactivos', value: inactivos, color: '#cbd5e1', accent: 'rgba(203,213,225,.12)' },
          { label: 'Con RFC',   value: conRfc,    color: '#a5b4fc', accent: 'rgba(165,180,252,.15)' },
        ]}
      />

      {error && !form && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
          <p className="text-[12px] font-bold text-red-600">{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <CajaFiltro>
          <Search size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Razón social, RFC, contacto o ciudad..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: '#0f172a', flex: 1, minWidth: 0 }}
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0 }}>
              <X size={12} style={{ color: '#94a3b8' }} />
            </button>
          )}
        </CajaFiltro>
      </div>

      {cargando ? (
        <div className="p-10 text-center animate-pulse font-black text-gray-400 text-xs tracking-widest uppercase">
          Cargando proveedores...
        </div>
      ) : visibles.length === 0 ? (
        <VacioTabla icon={Building2} texto={proveedores.length === 0 ? 'Sin proveedores' : 'Sin resultados'} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Escritorio */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full border-collapse text-left min-w-[820px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200">
                  <SortTH label="Razón social" col="name"     sortConfig={sortConfig} onSort={toggleSort} className="pl-4" />
                  <SortTH label="RFC"          col="rfc"      sortConfig={sortConfig} onSort={toggleSort} />
                  <SortTH label="Contacto"     col="contacto" sortConfig={sortConfig} onSort={toggleSort} />
                  <SortTH label="Ubicación"    col="ciudad"   sortConfig={sortConfig} onSort={toggleSort} />
                  <SortTH label="Condiciones"  col="terms"    sortConfig={sortConfig} onSort={toggleSort} />
                  <th className="px-3 py-2.5 pr-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={cn(
                      'group border-b border-slate-100 transition-colors',
                      p.status === 'INACTIVE' && 'opacity-50',
                      idx % 2 ? 'bg-slate-50/40 hover:bg-emerald-50/40' : 'bg-white hover:bg-emerald-50/40'
                    )}
                  >
                    <td className="pl-4 pr-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-1 h-8 rounded-full flex-shrink-0"
                          style={{ background: p.status === 'INACTIVE' ? '#cbd5e1' : '#10b981' }}
                        />
                        <div className="min-w-0">
                          <span className="block max-w-[220px] truncate text-xs font-black text-slate-900">{p.name}</span>
                          {p.status === 'INACTIVE' && (
                            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Inactivo</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-mono text-[11px] font-bold text-slate-500">{p.rfc || '—'}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-[11px] font-bold text-slate-700">{p.contactName || '—'}</p>
                      <p className="text-[10px] font-medium text-slate-400">{p.phone || p.email || ''}</p>
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-500">
                      {[p.city, p.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-500">{p.paymentTerms || '—'}</td>
                    <td className="px-3 py-2.5 pr-4">
                      {puedeEditar && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirEdicion(p)} title="Editar"
                            className="rounded-lg bg-slate-100 p-1.5 text-slate-500 transition-all hover:bg-slate-900 hover:text-white"
                          ><Edit3 size={14} /></button>
                          <button
                            onClick={() => eliminar(p)} title="Eliminar"
                            className="rounded-lg p-1.5 text-slate-300 transition-all hover:bg-red-50 hover:text-red-600"
                          ><Trash2 size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil */}
          <div className="md:hidden divide-y divide-slate-100">
            {visibles.map(p => (
              <div key={p.id} className={cn('flex items-start gap-3 p-4', p.status === 'INACTIVE' && 'opacity-50')}>
                <span
                  className="mt-0.5 h-10 w-1 flex-shrink-0 rounded-full"
                  style={{ background: p.status === 'INACTIVE' ? '#cbd5e1' : '#10b981' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-black text-slate-900">{p.name}</p>
                  <p className="font-mono text-[10px] font-bold text-slate-400">{p.rfc || 'Sin RFC'}</p>
                  <p className="mt-1 truncate text-[11px] font-semibold text-slate-500">
                    {[p.contactName, p.phone].filter(Boolean).join(' · ') || 'Sin contacto'}
                  </p>
                </div>
                {puedeEditar && (
                  <div className="flex flex-shrink-0 gap-1">
                    <button onClick={() => abrirEdicion(p)} className="rounded-lg bg-slate-100 p-2 text-slate-500"><Edit3 size={14} /></button>
                    <button onClick={() => eliminar(p)} className="rounded-lg p-2 text-slate-300"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alta / edición */}
      {form && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div>
                <h2 className="text-base font-black text-gray-900">{editId ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Catálogo de compras</p>
              </div>
              <button onClick={() => { setForm(null); setEditId(null); }} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-bold text-red-600">{error}</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={label}>Razón social *</label>
                  <input value={form.name} onChange={setF('name')} className={input} placeholder="Proveedora del Norte SA de CV" autoFocus /></div>
                <div><label className={label}>RFC</label>
                  <input value={form.rfc} onChange={setF('rfc')} className={input} placeholder="XAXX010101000" /></div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div><label className={label}>Contacto</label>
                  <input value={form.contactName} onChange={setF('contactName')} className={input} placeholder="Nombre" /></div>
                <div><label className={label}>Teléfono</label>
                  <input value={form.phone} onChange={setF('phone')} className={input} placeholder="5512345678" /></div>
                <div><label className={label}>Correo</label>
                  <input value={form.email} onChange={setF('email')} className={input} placeholder="ventas@proveedor.com" /></div>
              </div>

              <div><label className={label}>Dirección</label>
                <input value={form.address} onChange={setF('address')} className={input} placeholder="Calle y número, colonia" /></div>

              <div className="grid sm:grid-cols-4 gap-4">
                <div><label className={label}>Ciudad</label><input value={form.city} onChange={setF('city')} className={input} /></div>
                <div><label className={label}>Estado</label><input value={form.state} onChange={setF('state')} className={input} /></div>
                <div><label className={label}>C.P.</label><input value={form.zip} onChange={setF('zip')} className={input} /></div>
                <div><label className={label}>País</label><input value={form.country} onChange={setF('country')} className={input} /></div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={label}>Condiciones de pago</label>
                  <input value={form.paymentTerms} onChange={setF('paymentTerms')} className={input} placeholder="Crédito 30 días" /></div>
                <div><label className={label}>Notas</label>
                  <input value={form.notes} onChange={setF('notes')} className={input} placeholder="Lo que convenga recordar" /></div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => { setForm(null); setEditId(null); }}
                  className="px-5 py-3 rounded-xl bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-wider">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={guardando || !form.name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 disabled:opacity-40">
                  {guardando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  {editId ? 'Guardar cambios' : 'Guardar proveedor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
