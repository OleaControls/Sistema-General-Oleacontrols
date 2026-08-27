import React, { useEffect, useMemo, useState } from 'react';
import {
  Sparkles, Plus, RefreshCw, Loader2, X, Pencil, Trash2, Filter,
  CheckCircle2, CircleDashed, PlayCircle, Ban, CalendarClock,
} from 'lucide-react';
import improvementService from '@/api/improvementService';
import projectService from '@/api/projectService';
import { cn } from '@/lib/utils';
import {
  PRIORITIES, PRIORITY_KEYS, priorityMeta, daysUntil, relDays, fmtDate,
} from '../utils/reglas';

// ── Mejora continua ────────────────────────────────────────────────────────
// Las "áreas de mejora" dejan de ser una lista suelta: cada renglón es un
// problema con responsable, acción y objetivo, clasificado en el módulo del
// sistema que le toca resolverlo.

// Catálogo de arranque: el mapeo área → módulo que ya se traía documentado.
// Sirve como alta rápida; el campo es libre, no un enum cerrado.
const AREAS_BASE = [
  ['Trabajo en parejas', 'Asignaciones'],
  ['Sistema de seguimiento PR', 'Seguimiento'],
  ['Nube Técnica', 'Documentación'],
  ['Avances PDF', 'Avances'],
  ['AER', 'Recursos'],
  ['Incidentes', 'Incidentes'],
  ['Inventario', 'Inventario'],
  ['Gantt', 'Planeación'],
  ['Solicitud de recursos', 'Recursos'],
  ['Mapeo de zonas', 'Mapa de operaciones'],
  ['Anticipación de asignaciones', 'Planeación'],
  ['Documentación de ingreso', 'Documentación'],
  ['Capacitación', 'Capacitación'],
  ['Calendario', 'Agenda'],
  ['Objetivos', 'Objetivos'],
  ['Iteraciones', 'Seguimiento'],
  ['Zonificación', 'Mapa de operaciones'],
  ['Llamar al encargado', 'Comunicación'],
];

const MODULOS = [...new Set(AREAS_BASE.map(([, m]) => m))].sort((a, b) => a.localeCompare(b, 'es'));

const ESTADOS = [
  { key: 'ABIERTA',      label: 'Abiertas',      icon: CircleDashed, cls: 'bg-blue-50 text-blue-600 border-blue-200',          dot: 'bg-blue-500' },
  { key: 'EN_PROCESO',   label: 'En proceso',    icon: PlayCircle,   cls: 'bg-amber-50 text-amber-600 border-amber-200',       dot: 'bg-amber-500' },
  { key: 'IMPLEMENTADA', label: 'Implementadas', icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' },
  { key: 'DESCARTADA',   label: 'Descartadas',   icon: Ban,          cls: 'bg-gray-50 text-gray-400 border-gray-200',          dot: 'bg-gray-300' },
];
const ESTADO_MAP = Object.fromEntries(ESTADOS.map(e => [e.key, e]));

const EMPTY = {
  area: '', module: '', problem: '', action: '', objective: '',
  ownerName: '', priority: 'MEDIA', status: 'ABIERTA', dueDate: '', zone: '', notes: '',
};

export default function ContinuousImprovement() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [moduleFilter, setModuleFilter] = useState('');
  const [employees, setEmployees] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await improvementService.list());
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    projectService.employees().then(setEmployees).catch(() => {});
  }, []);

  const modulos = useMemo(
    () => [...new Set([...MODULOS, ...items.map(i => i.module).filter(Boolean)])].sort((a, b) => a.localeCompare(b, 'es')),
    [items]
  );

  const visibles = moduleFilter ? items.filter(i => i.module === moduleFilter) : items;

  const abiertas = visibles.filter(i => i.status === 'ABIERTA').length;
  const enProceso = visibles.filter(i => i.status === 'EN_PROCESO').length;
  const implementadas = visibles.filter(i => i.status === 'IMPLEMENTADA').length;
  const vencidas = visibles.filter(
    i => i.dueDate && !['IMPLEMENTADA', 'DESCARTADA'].includes(i.status) && daysUntil(i.dueDate) < 0
  ).length;

  // Áreas de la propuesta que todavía no se registran: alta con un clic.
  const pendientes = AREAS_BASE.filter(([area]) => !items.some(i => i.area === area));

  const guardar = async () => {
    if (!modal.area.trim() || !modal.problem.trim()) {
      setError('El área y el problema son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      if (modal.id) await improvementService.update(modal.id, modal);
      else await improvementService.create(modal);
      setModal(null);
      setError('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // El cambio de estado es la acción más frecuente: va directo, sin abrir nada.
  const mover = async (item, status) => {
    setItems(prev => prev.map(x => (x.id === item.id ? { ...x, status } : x))); // optimista
    try { await improvementService.update(item.id, { status }); }
    catch (e) { setError(e.message); load(); }
  };

  const borrar = async (item) => {
    if (!confirm(`¿Eliminar la mejora "${item.area}"?`)) return;
    try { await improvementService.remove(item.id); await load(); }
    catch (e) { setError(e.message); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="w-full space-y-6">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <header className="bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                Sistema General · Proyectos
              </span>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                Mejora Continua
              </h1>
              <p className="text-[11px] font-bold text-gray-400 mt-1">
                Cada área de mejora con su problema, responsable, acción y objetivo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModal({ ...EMPTY })}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-all">
              <Plus className="h-3.5 w-3.5" /> Nueva mejora
            </button>
            <button onClick={load}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-all">
              <RefreshCw className="h-3.5 w-3.5" /> Actualizar
            </button>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-gray-300" />
            <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-wider text-gray-600 outline-none">
              <option value="">Todos los módulos</option>
              {modulos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase tracking-wider ml-auto">
            <span className="text-blue-600 tabular-nums">{abiertas} abiertas</span>
            <span className="text-amber-600 tabular-nums">{enProceso} en proceso</span>
            <span className="text-emerald-600 tabular-nums">{implementadas} implementadas</span>
            {vencidas > 0 && <span className="text-red-500 tabular-nums">{vencidas} vencidas</span>}
          </div>
        </div>

        {error && <p className="mt-4 text-[11px] font-black text-red-500 uppercase tracking-wider">{error}</p>}
      </header>

      {/* ── Altas rápidas del catálogo base ────────────────────────────── */}
      {pendientes.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
            Áreas detectadas sin registrar — un clic para levantarlas
          </p>
          <div className="flex flex-wrap gap-2">
            {pendientes.map(([area, modulo]) => (
              <button key={area} onClick={() => setModal({ ...EMPTY, area, module: modulo })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-[10px] font-black uppercase tracking-wider text-gray-500 hover:border-primary hover:text-primary transition-all">
                <Plus className="h-3 w-3" /> {area}
                <span className="text-[8px] text-gray-300">{modulo}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Tablero por estado ─────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ESTADOS.map(estado => {
          const lista = visibles.filter(i => i.status === estado.key);
          return (
            <div key={estado.key} className="bg-white rounded-3xl border shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className={cn('w-2.5 h-2.5 rounded-full', estado.dot)} />
                <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider">{estado.label}</span>
                <span className="ml-auto text-[9px] font-black bg-gray-50 rounded-lg px-2 py-0.5 text-gray-500 tabular-nums">
                  {lista.length}
                </span>
              </div>

              {lista.length === 0 ? (
                <p className="text-[10px] font-bold text-gray-300 py-8 text-center">Sin registros</p>
              ) : (
                <div className="space-y-2.5">
                  {lista.map(item => {
                    const dias = item.dueDate ? daysUntil(item.dueDate) : null;
                    const vencida = dias !== null && dias < 0 && !['IMPLEMENTADA', 'DESCARTADA'].includes(item.status);
                    return (
                      <div key={item.id} className="p-3.5 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[11px] font-black text-gray-900 leading-tight">{item.area}</p>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button onClick={() => setModal({ ...EMPTY, ...item, dueDate: item.dueDate ? item.dueDate.slice(0, 10) : '' })}
                              className="p-1 text-gray-300 hover:text-primary" title="Editar">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => borrar(item)} className="p-1 text-gray-300 hover:text-red-500" title="Eliminar">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {item.module && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-lg border border-gray-200 bg-gray-50 text-[8px] font-black uppercase tracking-wider text-gray-500">
                            {item.module}
                          </span>
                        )}

                        <p className="text-[10px] font-bold text-gray-500 mt-2 leading-snug line-clamp-3">{item.problem}</p>
                        {item.action && (
                          <p className="text-[10px] font-bold text-gray-400 mt-1.5 leading-snug line-clamp-2">
                            <span className="text-gray-300 uppercase tracking-wider text-[8px]">Acción · </span>{item.action}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                          <span className={cn('px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-wider', priorityMeta(item.priority).cls)}>
                            {priorityMeta(item.priority).label}
                          </span>
                          {item.dueDate && (
                            <span className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-wider',
                              vencida ? 'bg-red-50 text-red-500 border-red-200' : 'bg-gray-50 text-gray-400 border-gray-200'
                            )}>
                              <CalendarClock className="h-2.5 w-2.5" /> {fmtDate(item.dueDate)}
                              {vencida && ` · ${relDays(dias)}`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-gray-100">
                          <span className="text-[9px] font-bold text-gray-400 truncate flex-1">
                            {item.ownerName || 'Sin responsable'}
                          </span>
                          <select value={item.status} onChange={(e) => mover(item, e.target.value)}
                            className="px-2 py-1 rounded-lg border border-gray-200 text-[8px] font-black uppercase tracking-wider text-gray-500 bg-white outline-none cursor-pointer">
                            {ESTADOS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Alta / edición ─────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-7 py-5 flex items-center justify-between rounded-t-[2rem]">
              <div>
                <h2 className="text-base font-black text-gray-900 tracking-tight">
                  {modal.id ? 'Editar mejora' : 'Nueva mejora'}
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {ESTADO_MAP[modal.status]?.label || 'Abierta'}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="p-2.5 hover:bg-gray-100 rounded-xl">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-7 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Área *">
                  <input list="mejora-areas" value={modal.area} onChange={(e) => {
                    const area = e.target.value;
                    const base = AREAS_BASE.find(([a]) => a === area);
                    setModal({ ...modal, area, module: modal.module || base?.[1] || '' });
                  }} className="mej-input" placeholder="Ej. Trabajo en parejas" />
                  <datalist id="mejora-areas">
                    {AREAS_BASE.map(([a]) => <option key={a} value={a} />)}
                  </datalist>
                </Field>
                <Field label="Módulo del sistema">
                  <input list="mejora-modulos" value={modal.module || ''}
                    onChange={(e) => setModal({ ...modal, module: e.target.value })} className="mej-input" />
                  <datalist id="mejora-modulos">
                    {modulos.map(m => <option key={m} value={m} />)}
                  </datalist>
                </Field>
              </div>

              <Field label="Problema detectado *">
                <textarea rows={2} value={modal.problem} onChange={(e) => setModal({ ...modal, problem: e.target.value })}
                  className="mej-input" placeholder="Qué está fallando hoy" />
              </Field>
              <Field label="Acción acordada">
                <textarea rows={2} value={modal.action || ''} onChange={(e) => setModal({ ...modal, action: e.target.value })}
                  className="mej-input" placeholder="Qué se va a hacer" />
              </Field>
              <Field label="Objetivo">
                <textarea rows={2} value={modal.objective || ''} onChange={(e) => setModal({ ...modal, objective: e.target.value })}
                  className="mej-input" placeholder="A qué se quiere llegar y cómo se mide" />
              </Field>

              <div className="grid sm:grid-cols-4 gap-4">
                <Field label="Responsable">
                  <select value={modal.ownerName || ''} onChange={(e) => setModal({ ...modal, ownerName: e.target.value })} className="mej-input">
                    <option value="">— Selecciona —</option>
                    {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                  </select>
                </Field>
                <Field label="Prioridad">
                  <select value={modal.priority} onChange={(e) => setModal({ ...modal, priority: e.target.value })} className="mej-input">
                    {PRIORITY_KEYS.map(k => <option key={k} value={k}>{PRIORITIES[k].label}</option>)}
                  </select>
                </Field>
                <Field label="Estado">
                  <select value={modal.status} onChange={(e) => setModal({ ...modal, status: e.target.value })} className="mej-input">
                    {ESTADOS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
                  </select>
                </Field>
                <Field label="Compromiso">
                  <input type="date" value={modal.dueDate || ''} onChange={(e) => setModal({ ...modal, dueDate: e.target.value })} className="mej-input" />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Zona (opcional)">
                  <input value={modal.zone || ''} onChange={(e) => setModal({ ...modal, zone: e.target.value })} className="mej-input" />
                </Field>
                <Field label="Notas">
                  <input value={modal.notes || ''} onChange={(e) => setModal({ ...modal, notes: e.target.value })} className="mej-input" />
                </Field>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => setModal(null)}
                  className="flex-1 py-3.5 border border-gray-200 rounded-2xl text-[11px] font-black uppercase tracking-wider text-gray-500 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={saving}
                  className="flex-[2] py-3.5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MejoraStyle />
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function MejoraStyle() {
  return (
    <style>{`
      .mej-input {
        width: 100%; padding: 0.65rem 0.9rem; background: #f8fafc;
        border: 1.5px solid #e5e7eb; border-radius: 0.85rem; font-size: 0.78rem;
        font-weight: 600; color: #0f172a; outline: none;
        transition: border-color .18s, background .18s;
      }
      .mej-input::placeholder { color: #94a3b8; font-weight: 500; }
      .mej-input:focus { border-color: var(--color-primary, #2563eb); background: #fff; }
    `}</style>
  );
}
