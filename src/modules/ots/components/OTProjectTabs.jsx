import React, { useState } from 'react';
import {
  Boxes, PackagePlus, FolderOpen, ListTodo, Plus, Loader2,
  ExternalLink, Calendar, AlertCircle, Check,
} from 'lucide-react';
import { otService } from '@/api/otService';
import { cn } from '@/lib/utils';

/* Pestañas del proyecto que el técnico ve dentro de su OT de tienda.
   Los datos llegan por /api/ots?sub=…, no por /api/projects: ese módulo está
   reservado a Gerente de Proyectos y Admin. Aquí solo se exponen los cuatro
   apartados que el técnico necesita en sitio. */

const fmtFecha = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const REQUEST_STATUS = {
  SOLICITADO: { label: 'Solicitado', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  APROBADO:   { label: 'Aprobado',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  RECHAZADO:  { label: 'Rechazado',  cls: 'bg-red-50 text-red-700 border-red-200' },
  SURTIDO:    { label: 'Surtido',    cls: 'bg-blue-50 text-blue-700 border-blue-200' },
};

const PENDING_STATUS = {
  ABIERTO:    { label: 'Abierto',    cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  EN_PROCESO: { label: 'En proceso', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  CERRADO:    { label: 'Cerrado',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

function Panel({ icon: Icon, title, subtitle, action, children }) {
  return (
    <div className="bg-white border border-gray-100 rounded-[1.75rem] overflow-hidden shadow-sm">
      <div className="px-7 py-5 border-b border-gray-50 flex items-center gap-3">
        <Icon className="h-4 w-4 text-gray-400" />
        <div className="flex-1 min-w-0">
          <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest">{title}</h3>
          {subtitle && <p className="text-[10px] text-gray-400 font-medium mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function VacioPanel({ icon: Icon, texto }) {
  return (
    <div className="py-14 flex flex-col items-center justify-center gap-3">
      <Icon className="h-9 w-9 text-gray-200" />
      <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{texto}</p>
    </div>
  );
}

/* ── RECURSOS ─────────────────────────────────────────────────────────────── */
function ResourcesPanel({ otId, project, onReload, puedeEditar }) {
  const [form, setForm] = useState({ name: '', quantity: 1, unit: '', justification: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [abierto, setAbierto] = useState(false);

  const solicitudes = project.resourceRequests || [];

  const enviar = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await otService.requestResource(otId, form);
      setForm({ name: '', quantity: 1, unit: '', justification: '' });
      setAbierto(false);
      await onReload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      icon={PackagePlus}
      title="Recursos"
      subtitle={`${solicitudes.length} solicitud${solicitudes.length === 1 ? '' : 'es'} · las autoriza el Gerente de Proyectos`}
      action={puedeEditar && (
        <button
          type="button"
          onClick={() => setAbierto(a => !a)}
          className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-3 w-3" /> Solicitar
        </button>
      )}
    >
      {abierto && puedeEditar && (
        <form onSubmit={enviar} className="p-7 border-b border-gray-50 bg-gray-50/50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Qué necesitas *</label>
              <input
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Cable calibre 12"
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-gray-900 transition-all"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Cantidad</label>
              <input
                type="number" min="1" step="any"
                value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-gray-900 transition-all"
              />
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Unidad</label>
              <input
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                placeholder="pza, m..."
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-gray-900 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Para qué se necesita</label>
            <textarea
              rows={2}
              value={form.justification}
              onChange={e => setForm({ ...form, justification: e.target.value })}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-gray-900 transition-all resize-none"
            />
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-red-600">
              <AlertCircle className="h-3 w-3" /> {error}
            </p>
          )}
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40 hover:bg-gray-800 transition-colors"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Enviar solicitud
          </button>
        </form>
      )}

      {solicitudes.length === 0
        ? <VacioPanel icon={PackagePlus} texto="Sin solicitudes de recurso" />
        : (
          <div className="divide-y divide-gray-50">
            {solicitudes.map(r => {
              const st = REQUEST_STATUS[r.status] || REQUEST_STATUS.SOLICITADO;
              return (
                <div key={r.id} className="px-7 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-900">
                      {r.name}
                      <span className="ml-2 font-bold text-gray-400">{r.quantity} {r.unit || ''}</span>
                    </p>
                    {r.justification && <p className="text-[11px] text-gray-500 font-medium mt-1">{r.justification}</p>}
                    <p className="text-[10px] text-gray-400 font-bold mt-1.5">
                      {r.requestedByName || '—'} · {fmtFecha(r.requestedAt)}
                    </p>
                    {r.decisionNotes && (
                      <p className="text-[10px] text-gray-500 font-medium mt-1 italic">“{r.decisionNotes}”</p>
                    )}
                  </div>
                  <span className={cn('shrink-0 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider', st.cls)}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
    </Panel>
  );
}

/* ── INVENTARIO ─────────────────────────────────────────────────────────────
   Es el inventario general de tiendas, no uno del proyecto: el mismo listado se
   ve desde cualquier OT de tienda. Aquí es solo de lectura; se administra en
   Proyectos › Inventario de Tiendas. */
function InventoryPanel({ project }) {
  const items = project.inventory || [];
  // El corte más reciente indica a qué día está actualizado lo que surtió la tienda.
  const ultimoCorte = items
    .map(i => i.cutoffDate)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0];

  return (
    <Panel
      icon={Boxes}
      title="Inventario disponible"
      subtitle={ultimoCorte
        ? `Material que surte el cliente · el mismo para toda la operación · corte al ${fmtFecha(ultimoCorte)}`
        : 'Material que surte el cliente · el mismo para toda la operación'}
    >
      {items.length === 0
        ? <VacioPanel icon={Boxes} texto="Sin inventario capturado" />
        : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Material', 'Clave', 'Disponible', 'Ubicación', 'Corte'].map(h => (
                    <th key={h} className="text-left px-7 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(it => (
                  <tr key={it.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-7 py-3">
                      <span className="text-xs font-black text-gray-900">{it.name}</span>
                      {it.notes && <p className="text-[10px] text-gray-400 font-medium mt-0.5">{it.notes}</p>}
                    </td>
                    <td className="px-7 py-3 text-[11px] font-bold text-gray-500 whitespace-nowrap">{it.sku || '—'}</td>
                    <td className="px-7 py-3 whitespace-nowrap">
                      <span className="text-xs font-black text-gray-900">{it.quantity}</span>
                      <span className="text-[10px] font-bold text-gray-400 ml-1">{it.unit || ''}</span>
                    </td>
                    <td className="px-7 py-3 text-[11px] font-bold text-gray-500">{it.location || '—'}</td>
                    <td className="px-7 py-3 text-[11px] font-bold text-gray-500 whitespace-nowrap">{fmtFecha(it.cutoffDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </Panel>
  );
}

/* ── DOCUMENTACIÓN ────────────────────────────────────────────────────────── */
const DOC_CATEGORIES = [
  ['EVIDENCIA', 'Evidencia'], ['PLANO', 'Plano'], ['MANUAL', 'Manual'],
  ['CONTRATO', 'Contrato'], ['OTRO', 'Otro'],
];

function DocumentsPanel({ otId, project, onReload, puedeEditar }) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);
  const docs = project.documents || [];

  const subir = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;

    setSubiendo(true);
    setError(null);
    try {
      const dataUri = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const url = await otService.uploadLargeFile(dataUri, 'project-docs');
      await otService.addOTDocument(otId, { name: file.name, category: 'EVIDENCIA', url });
      await onReload();
    } catch (err) {
      setError(err.message || 'No se pudo subir el archivo');
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Panel
      icon={FolderOpen}
      title="Documentación"
      subtitle={`${docs.length} documento${docs.length === 1 ? '' : 's'} · lo que pide la tienda`}
      action={puedeEditar && (
        <label className={cn(
          'cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-950 text-white text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition-colors',
          subiendo && 'opacity-50 pointer-events-none'
        )}>
          {subiendo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          {subiendo ? 'Subiendo' : 'Subir'}
          <input type="file" className="hidden" onChange={subir} disabled={subiendo} />
        </label>
      )}
    >
      {error && (
        <p className="px-7 py-3 flex items-center gap-1.5 text-[10px] font-bold text-red-600 border-b border-gray-50">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
      {docs.length === 0
        ? <VacioPanel icon={FolderOpen} texto="Sin documentos" />
        : (
          <div className="divide-y divide-gray-50">
            {docs.map(d => (
              <a
                key={d.id}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-4 flex items-center gap-4 hover:bg-gray-50/60 transition-colors group"
              >
                <FolderOpen className="h-4 w-4 text-gray-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-900 truncate">{d.name}</p>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                    {d.category} · v{d.version} · {fmtFecha(d.createdAt)}
                  </p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-600 transition-colors shrink-0" />
              </a>
            ))}
          </div>
        )}
    </Panel>
  );
}

/* ── PENDIENTES ───────────────────────────────────────────────────────────── */
function PendingsPanel({ otId, project, onReload, puedeEditar }) {
  const [guardando, setGuardando] = useState(null);
  const pendientes = project.pendings || [];

  const avanzar = async (p, nuevo) => {
    setGuardando(p.id);
    try {
      await otService.updateOTPending(otId, p.id, nuevo);
      await onReload();
    } catch (err) {
      console.error(err);
    } finally {
      setGuardando(null);
    }
  };

  const abiertos = pendientes.filter(p => p.status !== 'CERRADO').length;

  return (
    <Panel
      icon={ListTodo}
      title="Pendientes del proyecto"
      subtitle={`${abiertos} sin cerrar de ${pendientes.length}`}
    >
      {pendientes.length === 0
        ? <VacioPanel icon={ListTodo} texto="Sin pendientes" />
        : (
          <div className="divide-y divide-gray-50">
            {pendientes.map(p => {
              const st = PENDING_STATUS[p.status] || PENDING_STATUS.ABIERTO;
              const vencido = p.dueDate && p.status !== 'CERRADO' && new Date(p.dueDate) < new Date();
              return (
                <div key={p.id} className="px-7 py-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-900">{p.title}</p>
                    {p.notes && <p className="text-[11px] text-gray-500 font-medium mt-1">{p.notes}</p>}
                    <div className="flex items-center gap-3 mt-1.5">
                      {p.ownerName && <span className="text-[10px] text-gray-400 font-bold">{p.ownerName}</span>}
                      {p.dueDate && (
                        <span className={cn(
                          'flex items-center gap-1 text-[10px] font-bold',
                          vencido ? 'text-red-600' : 'text-gray-400'
                        )}>
                          <Calendar className="h-2.5 w-2.5" />
                          {fmtFecha(p.dueDate)}{vencido && ' · vencido'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider', st.cls)}>
                      {st.label}
                    </span>
                    {puedeEditar && p.status !== 'CERRADO' && (
                      <button
                        type="button"
                        disabled={guardando === p.id}
                        onClick={() => avanzar(p, p.status === 'ABIERTO' ? 'EN_PROCESO' : 'CERRADO')}
                        title={p.status === 'ABIERTO' ? 'Marcar en proceso' : 'Marcar cerrado'}
                        className="cursor-pointer p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-900 hover:border-gray-400 transition-colors disabled:opacity-40"
                      >
                        {guardando === p.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Check className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </Panel>
  );
}

/* ── Entrada ──────────────────────────────────────────────────────────────── */
export default function OTProjectTabs({ tab, otId, project, loading, error, onReload, puedeEditar }) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-[1.75rem] py-16 flex flex-col items-center gap-3 shadow-sm">
        <Loader2 className="h-6 w-6 text-gray-300 animate-spin" />
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Cargando proyecto...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="bg-white border border-gray-100 rounded-[1.75rem] py-16 flex flex-col items-center gap-3 shadow-sm">
        <AlertCircle className="h-7 w-7 text-gray-200" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {error || 'Esta OT todavía no está vinculada a un proyecto'}
        </p>
        <p className="text-[10px] text-gray-400 font-medium max-w-sm text-center">
          El Gerente de Proyectos la vincula desde la pestaña Vínculos del proyecto.
        </p>
      </div>
    );
  }

  const comunes = { otId, project, onReload, puedeEditar };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 px-1">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Proyecto</span>
        <span className="text-[10px] font-black text-gray-900">{project.code} · {project.name}</span>
      </div>
      {tab === 'RESOURCES' && <ResourcesPanel {...comunes} />}
      {tab === 'INVENTORY' && <InventoryPanel project={project} />}
      {tab === 'DOCS'      && <DocumentsPanel {...comunes} />}
      {tab === 'PENDINGS'  && <PendingsPanel {...comunes} />}
    </div>
  );
}
