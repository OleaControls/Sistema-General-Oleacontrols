import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, Search, Loader2, Plus, X, ExternalLink,
  Trash2, AlertCircle, Upload,
} from 'lucide-react';
import { hrService } from '@/api/hrService';
import techDocsService from '@/api/techDocsService';
import { otService } from '@/api/otService';
import { FIELD_DOC_TYPES, resumenExpediente, DOC_STATUS, fieldDocLabel } from '@/lib/fieldDocs';
import { ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';
import { validarTamanoArchivo, MAX_UPLOAD_LABEL } from '@/lib/uploadLimits';

/* Expediente de campo: la documentación vigente que la tienda exige para dejar
   entrar a un técnico a tienda. La carga y la renueva el supervisor. Es distinto
   del expediente de RH (HRDocuments.jsx), que guarda contratos e
   identificaciones sin fecha de vencimiento. */

const fmt = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function FieldDocs() {
  const [tecnicos, setTecnicos] = useState([]);
  const [docsPorTec, setDocsPorTec] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(null); // id del técnico expandido
  const [form, setForm] = useState(null);       // { employeeId, type, expiresAt, issuedAt, notes, url }
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const empleados = await hrService.getEmployees();
      const techs = (Array.isArray(empleados) ? empleados : [])
        .filter(e => e.roles?.includes(ROLES.TECH) && e.status !== 'INACTIVE');
      setTecnicos(techs);

      // El expediente se pide por técnico; el endpoint no expone un listado masivo.
      const pares = await Promise.all(techs.map(async (t) => {
        try { return [t.id, await techDocsService.list(t.id)]; }
        catch { return [t.id, []]; }
      }));
      setDocsPorTec(Object.fromEntries(pares));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return tecnicos;
    return tecnicos.filter(t => t.name?.toLowerCase().includes(q) || t.employeeId?.toLowerCase().includes(q));
  }, [tecnicos, busqueda]);

  const totales = useMemo(() => {
    let enRegla = 0, conAlerta = 0;
    for (const t of tecnicos) {
      const r = resumenExpediente(docsPorTec[t.id] || []);
      if (r.alerta) conAlerta++; else enRegla++;
    }
    return { enRegla, conAlerta };
  }, [tecnicos, docsPorTec]);

  const subirYGuardar = async (file) => {
    // Antes de leerlo: el FileReader carga el archivo completo en memoria y el
    // base64 lo engorda ~33% más.
    const excede = validarTamanoArchivo(file);
    if (excede) { setError(excede); return; }

    setGuardando(true);
    setError(null);
    try {
      const dataUri = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const url = await otService.uploadLargeFile(dataUri, 'tech-field-docs');
      const { reemplazaId, ...datos } = form;
      await techDocsService.create({ ...datos, url });
      // Renovación: el nuevo ya quedó guardado, así que se retira el anterior.
      // Si esto falla, el expediente igual muestra el vigente (gana la fecha de
      // vencimiento más lejana), solo queda el viejo colgando.
      if (reemplazaId) {
        try { await techDocsService.remove(reemplazaId); }
        catch (e) { console.warn('No se pudo retirar el documento anterior', e); }
      }
      setForm(null);
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo guardar el documento');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (docId) => {
    setBorrando(docId);
    try {
      await techDocsService.remove(docId);
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
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Cargando expedientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-16">
      {/* ── Encabezado ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Documentación de Campo</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Lo que cada técnico necesita vigente para entrar a tienda · {tecnicos.length} técnicos
          </p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
          <Search className="h-3.5 w-3.5 text-gray-400" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar técnico..."
            className="bg-transparent border-none outline-none text-xs font-bold text-gray-900 w-40"
          />
        </div>
      </div>

      {/* ── Resumen ── */}
      <div className="grid grid-cols-2 gap-3 max-w-md">
        {[
          { label: 'En regla',    valor: totales.enRegla,  icon: ShieldCheck, cls: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Con pendientes', valor: totales.conAlerta, icon: ShieldAlert, cls: 'text-red-600', bg: 'bg-red-50 border-red-100' },
        ].map(({ label, valor, icon: Icon, cls, bg }) => (
          <div key={label} className={cn('rounded-2xl border px-5 py-4 flex items-center gap-3', bg)}>
            <Icon className={cn('h-5 w-5 shrink-0', cls)} />
            <div>
              <p className={cn('text-2xl font-black leading-none', cls)}>{valor}</p>
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-1">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-[11px] font-bold text-red-700">{error}</p>
        </div>
      )}

      {/* ── Técnicos ── */}
      <div className="space-y-3">
        {filtrados.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-3xl py-14 text-center">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sin técnicos</p>
          </div>
        )}

        {filtrados.map(tec => {
          const docs = docsPorTec[tec.id] || [];
          const resumen = resumenExpediente(docs);
          const expandido = abierto === tec.id;

          return (
            <div key={tec.id} className={cn(
              'bg-white border rounded-3xl overflow-hidden shadow-sm',
              resumen.alerta ? 'border-red-200' : 'border-gray-100'
            )}>
              <button
                type="button"
                onClick={() => setAbierto(expandido ? null : tec.id)}
                className="w-full px-6 py-5 flex items-center gap-4 hover:bg-gray-50/60 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-black text-sm shrink-0 overflow-hidden">
                  {tec.avatar
                    ? <img src={tec.avatar} alt={tec.name} className="w-full h-full object-cover" />
                    : (tec.name?.charAt(0)?.toUpperCase() || '?')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">{tec.name}</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-0.5">{tec.employeeId || tec.position || 'Técnico'}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1.5 max-w-[55%]">
                  {resumen.items.filter(i => i.required).map(item => {
                    const meta = DOC_STATUS[item.status];
                    return (
                      <span key={item.key} title={item.label}
                        className={cn('text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-md border', meta.cls)}>
                        {item.short || item.key}
                      </span>
                    );
                  })}
                </div>
              </button>

              {expandido && (
                <div className="border-t border-gray-50 px-6 py-5 space-y-4">
                  {/* Documentos cargados */}
                  <div className="space-y-2">
                    {resumen.items.map(item => {
                      const meta = DOC_STATUS[item.status];
                      return (
                        <div key={item.key} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-gray-800">
                              {item.label}
                              {item.required && <span className="text-red-400 ml-1">*</span>}
                            </p>
                            {item.doc && (
                              <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                Expedido {fmt(item.doc.issuedAt)} · Vence {fmt(item.doc.expiresAt)}
                                {item.doc.uploadedByName ? ` · Cargó ${item.doc.uploadedByName}` : ''}
                              </p>
                            )}
                          </div>
                          <span className={cn('shrink-0 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border', meta.cls)}>
                            {meta.label}
                          </span>
                          {item.doc?.url && (
                            <a href={item.doc.url} target="_blank" rel="noopener noreferrer"
                              className="shrink-0 p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-900 transition-colors">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {item.doc && (
                            <button
                              type="button"
                              onClick={() => setForm({ employeeId: tec.id, type: item.key, issuedAt: '', expiresAt: '', notes: '', reemplazaId: item.doc.id })}
                              className="shrink-0 px-3 py-2 rounded-xl border border-gray-200 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors"
                            >
                              Renovar
                            </button>
                          )}
                          {item.doc && (
                            <button type="button" onClick={() => eliminar(item.doc.id)} disabled={borrando === item.doc.id}
                              aria-label={`Eliminar ${item.label}`}
                              className="shrink-0 p-2 rounded-xl border border-gray-200 text-gray-300 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-40">
                              {borrando === item.doc.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Alta */}
                  {form?.employeeId === tec.id ? (
                    <div className="rounded-2xl border-2 border-gray-200 bg-gray-50/60 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
                          {form.reemplazaId ? `Renovar ${fieldDocLabel(form.type)}` : 'Cargar documento'}
                        </p>
                        <button type="button" onClick={() => setForm(null)} aria-label="Cancelar"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 transition-colors">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Tipo *</label>
                          <select
                            value={form.type}
                            disabled={!!form.reemplazaId}
                            onChange={e => setForm({ ...form, type: e.target.value })}
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                          >
                            {FIELD_DOC_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Expedición</label>
                          <input type="date" value={form.issuedAt}
                            onChange={e => setForm({ ...form, issuedAt: e.target.value })}
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-gray-900" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Vencimiento</label>
                          <input type="date" value={form.expiresAt}
                            onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-gray-900" />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Sin fecha de vencimiento el documento se considera vigente de forma permanente.
                        {form.reemplazaId && ' Al guardar, el archivo anterior de este tipo se retira del expediente.'}
                      </p>
                      <label className={cn(
                        'cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors',
                        guardando && 'opacity-50 pointer-events-none'
                      )}>
                        {guardando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        {guardando ? 'Subiendo' : 'Elegir archivo y guardar'}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" disabled={guardando}
                          onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) subirYGuardar(f); }} />
                      </label>
                      <span className="ml-2 text-[9px] font-black text-gray-300 uppercase tracking-widest">
                        PDF o imagen · {MAX_UPLOAD_LABEL}
                      </span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setForm({ employeeId: tec.id, type: FIELD_DOC_TYPES[0].key, issuedAt: '', expiresAt: '', notes: '' })}
                      className="cursor-pointer flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Cargar documento
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
