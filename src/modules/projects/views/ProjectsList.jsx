import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, Plus, X, Calendar, DollarSign, User, ListChecks,
  AlertTriangle, Loader2, ArrowRight, Search, FileSpreadsheet,
  Columns3, List, GripVertical
} from 'lucide-react';
import projectService from '@/api/projectService';
import { cn } from '@/lib/utils';

// Las 5 fases del pipeline de proyectos (en orden) con sus estilos.
export const PROJECT_STATUS = {
  INICIACION:     { label: 'Iniciación',     cls: 'bg-blue-50 text-blue-600 border-blue-200',       dot: 'bg-blue-500',    col: 'bg-blue-50/60',    ring: 'ring-blue-300' },
  PLANEACION:     { label: 'Planeación',     cls: 'bg-amber-50 text-amber-600 border-amber-200',    dot: 'bg-amber-500',   col: 'bg-amber-50/60',   ring: 'ring-amber-300' },
  IMPLEMENTACION: { label: 'Implementación', cls: 'bg-violet-50 text-violet-600 border-violet-200', dot: 'bg-violet-500',  col: 'bg-violet-50/60',  ring: 'ring-violet-300' },
  CALIDAD:        { label: 'Calidad',        cls: 'bg-cyan-50 text-cyan-600 border-cyan-200',       dot: 'bg-cyan-500',    col: 'bg-cyan-50/60',    ring: 'ring-cyan-300' },
  CIERRE:         { label: 'Cierre',         cls: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500', col: 'bg-emerald-50/60', ring: 'ring-emerald-300' },
};

// Orden de las fases (para el pipeline y filtros).
export const PROJECT_PHASES = Object.keys(PROJECT_STATUS);

// Conecta estados antiguos (INICIO/EJECUCION/CERRADO) con las 5 fases nuevas.
const PHASE_ALIAS = { INICIO: 'INICIACION', EJECUCION: 'IMPLEMENTACION', CERRADO: 'CIERRE' };
export const normalizePhase = (s) => PHASE_ALIAS[s] || (PROJECT_STATUS[s] ? s : 'INICIACION');

const money = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;

const EMPTY_FORM = {
  name: '', objective: '', scope: '', justification: '',
  sponsor: '', managerName: '', clientName: '',
  startDate: '', endDate: '', budget: '',
};

export default function ProjectsList() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [employees, setEmployees] = useState([]);
  const [otClients, setOtClients] = useState([]);
  const [view, setView] = useState('pipeline'); // 'pipeline' | 'lista'

  const load = async () => {
    setLoading(true);
    try {
      setProjects(await projectService.list());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    projectService.employees().then(setEmployees).catch(() => {});
    projectService.otClients().then(setOtClients).catch(() => {});
  }, []);

  // Filtro por texto y fase.
  const filtered = projects.filter(p => {
    if (statusFilter && normalizePhase(p.status) !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return [p.name, p.code, p.managerName, p.clientName].some(v => (v || '').toLowerCase().includes(q));
    }
    return true;
  });

  // Resumen consolidado.
  const summary = {
    total: projects.length,
    activos: projects.filter(p => normalizePhase(p.status) !== 'CIERRE').length,
    presupuesto: projects.reduce((a, p) => a + (p.budget || 0), 0),
    porFase: (fase) => projects.filter(p => normalizePhase(p.status) === fase).length,
  };

  // Mueve un proyecto a otra fase (drag & drop en el pipeline).
  const moveProject = async (projectId, phase) => {
    const p = projects.find(x => x.id === projectId);
    if (!p || normalizePhase(p.status) === phase) return;
    setProjects(prev => prev.map(x => x.id === projectId ? { ...x, status: phase } : x)); // optimista
    try { await projectService.update(projectId, { status: phase }); }
    catch (e) { setError(e.message); load(); }
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const rows = projects.map(p => ({
      Código: p.code, Nombre: p.name, Estado: PROJECT_STATUS[normalizePhase(p.status)]?.label || p.status,
      Responsable: p.managerName || '', Cliente: p.clientName || '',
      Avance: `${p.progress || 0}%`, Presupuesto: p.budget || 0,
      Tareas: p._count?.tasks || 0, Riesgos: p._count?.risks || 0,
      Inicio: p.startDate ? new Date(p.startDate).toLocaleDateString('es-MX') : '',
      Fin: p.endDate ? new Date(p.endDate).toLocaleDateString('es-MX') : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Proyectos');
    XLSX.writeFile(wb, `Proyectos-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('El nombre del proyecto es obligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        budget: parseFloat(form.budget) || 0,
        status: 'INICIACION',
      };
      const created = await projectService.create(payload);
      setShowModal(false);
      setForm(EMPTY_FORM);
      navigate(`/projects/${created.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <FolderKanban className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">Proyectos</h1>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              {projects.length} proyecto{projects.length !== 1 && 's'} activo{projects.length !== 1 && 's'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-3 border border-gray-200 text-gray-600 rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-gray-50 transition-all">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
          <button
            onClick={() => { setForm(EMPTY_FORM); setError(''); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
          >
            <Plus className="h-4 w-4" /> Nuevo Proyecto
          </button>
        </div>
      </header>

      {error && !showModal && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-[11px] font-bold text-red-600">{error}</div>
      )}

      {/* Resumen consolidado */}
      {projects.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryTile label="Proyectos" value={summary.total} sub={`${summary.activos} activos`} />
          <SummaryTile label="Presupuesto total" value={money(summary.presupuesto)} sub="Autorizado" />
          <SummaryTile label="Implementación" value={summary.porFase('IMPLEMENTACION')} sub="En curso" />
          <SummaryTile label="En cierre" value={summary.porFase('CIERRE')} sub="Fase final" />
        </div>
      )}

      {/* Barra de filtros */}
      {projects.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, código, responsable o cliente…"
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-2xl text-[11px] font-bold text-gray-700 outline-none focus:border-primary transition-all" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-[11px] font-black uppercase tracking-wider text-gray-600 outline-none focus:border-primary cursor-pointer">
            <option value="">Todas las fases</option>
            {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {/* Toggle Pipeline / Lista */}
          <div className="flex bg-white border border-gray-200 rounded-2xl p-1">
            <button onClick={() => setView('pipeline')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
                view === 'pipeline' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
              <Columns3 className="h-3.5 w-3.5" /> Pipeline
            </button>
            <button onClick={() => setView('lista')}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
                view === 'lista' ? 'bg-primary text-white shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
              <List className="h-3.5 w-3.5" /> Lista
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="py-24 flex justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="py-24 text-center">
          <FolderKanban className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Sin proyectos aún</p>
          <p className="text-[11px] font-bold text-gray-300 mt-1">Crea tu primer proyecto para empezar.</p>
        </div>
      ) : view === 'pipeline' ? (
        <PipelineBoard projects={filtered} onMove={moveProject} onOpen={(id) => navigate(`/projects/${id}`)} />
      ) : filtered.length === 0 ? (
        <div className="py-24 text-center">
          <FolderKanban className="h-12 w-12 text-gray-200 mx-auto mb-4" />
          <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Sin resultados</p>
          <p className="text-[11px] font-bold text-gray-300 mt-1">Ajusta la búsqueda o el filtro.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const st = PROJECT_STATUS[normalizePhase(p.status)] || PROJECT_STATUS.INICIACION;
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/projects/${p.id}`)}
                className="group text-left bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md hover:border-primary/30 transition-all relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">{p.code}</span>
                  <span className={cn('px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border', st.cls)}>
                    {st.label}
                  </span>
                </div>
                <h3 className="text-sm font-black text-gray-900 leading-tight mb-4 line-clamp-2 min-h-[2.5rem]">{p.name}</h3>

                {/* Barra de avance */}
                <div className="mb-4">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                    <span>Avance</span><span>{p.progress || 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.progress || 0}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-gray-500">
                  <span className="flex items-center gap-1.5"><User className="h-3 w-3 text-gray-300" />{p.managerName || '—'}</span>
                  <span className="flex items-center gap-1.5"><DollarSign className="h-3 w-3 text-gray-300" />{money(p.budget)}</span>
                  <span className="flex items-center gap-1.5"><ListChecks className="h-3 w-3 text-gray-300" />{p._count?.tasks || 0} tareas</span>
                  <span className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 text-gray-300" />{p._count?.risks || 0} riesgos</span>
                </div>

                <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-gray-200 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </button>
            );
          })}
        </div>
      )}

      {/* Modal Acta de inicio */}
      {showModal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-8 py-5 flex items-center justify-between rounded-t-[2rem]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-2xl">
                  <FolderKanban className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 tracking-tight">Acta de Inicio</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nuevo proyecto</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-8 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] font-bold text-red-600">{error}</div>
              )}

              <Field label="Nombre del proyecto *">
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input" placeholder="Ej. Instalación CCTV Sucursal Centro" />
              </Field>

              <Field label="Objetivo">
                <textarea rows={2} value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })}
                  className="input" placeholder="¿Qué se busca lograr?" />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Alcance">
                  <textarea rows={2} value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="input" />
                </Field>
                <Field label="Justificación">
                  <textarea rows={2} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} className="input" />
                </Field>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Patrocinador">
                  <input value={form.sponsor} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} className="input" />
                </Field>
                <Field label="Responsable">
                  <select value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} className="input">
                    <option value="">— Selecciona —</option>
                    {employees.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                  </select>
                </Field>
                <Field label="Cliente">
                  <input list="proj-clients" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} className="input" />
                  <datalist id="proj-clients">
                    {otClients.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </Field>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Fecha inicio">
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input" />
                </Field>
                <Field label="Fecha fin">
                  <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input" />
                </Field>
                <Field label="Presupuesto ($)">
                  <input type="number" min="0" step="0.01" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="input" />
                </Field>
              </div>

              <div className="flex gap-3 pt-5 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3.5 border border-gray-200 rounded-2xl text-[11px] font-black uppercase tracking-wider text-gray-500 hover:bg-gray-50 transition-all">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-[2] py-3.5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-primary/25 hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Crear proyecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Estilos locales de inputs */}
      <style>{`
        .input {
          width: 100%;
          padding: 0.6rem 0.9rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.9rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: #111827;
          outline: none;
          transition: border-color .2s;
        }
        .input:focus { border-color: var(--color-primary, #2563eb); }
      `}</style>
    </div>
  );
}

// ── Tablero Pipeline (Kanban de fases con drag & drop) ───────────────────────
function PipelineBoard({ projects, onMove, onOpen }) {
  const [draggedId, setDraggedId] = useState(null);
  const [overPhase, setOverPhase] = useState(null);

  return (
    <div className="overflow-x-auto pb-4 -mx-1 px-1">
      <div className="flex gap-4 min-w-max">
        {PROJECT_PHASES.map((phase, i) => {
          const meta = PROJECT_STATUS[phase];
          const items = projects.filter(p => normalizePhase(p.status) === phase);
          const isOver = overPhase === phase;
          return (
            <div key={phase}
              onDragOver={(e) => { e.preventDefault(); setOverPhase(phase); }}
              onDragLeave={() => setOverPhase(null)}
              onDrop={() => { if (draggedId) onMove(draggedId, phase); setDraggedId(null); setOverPhase(null); }}
              className={cn('w-72 shrink-0 rounded-3xl border p-3 transition-all', meta.col, isOver ? `ring-2 ${meta.ring} border-transparent` : 'border-transparent')}>
              <div className="flex items-center justify-between px-2 py-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-gray-300">{i + 1}</span>
                  <span className={cn('w-2.5 h-2.5 rounded-full', meta.dot)} />
                  <span className="text-[10px] font-black text-gray-700 uppercase tracking-wider">{meta.label}</span>
                </div>
                <span className="text-[9px] font-black bg-white rounded-lg px-2 py-0.5 text-gray-500 shadow-sm">{items.length}</span>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {items.map(p => (
                  <PipelineCard key={p.id} p={p}
                    onOpen={() => onOpen(p.id)}
                    onDragStart={() => setDraggedId(p.id)}
                    onDragEnd={() => setDraggedId(null)} />
                ))}
                {items.length === 0 && (
                  <div className="h-24 flex items-center justify-center rounded-2xl border-2 border-dashed border-black/10">
                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Arrastra aquí</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PipelineCard({ p, onOpen, onDragStart, onDragEnd }) {
  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onOpen}
      className="bg-white rounded-2xl border shadow-sm p-3 cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[8px] font-black text-primary uppercase tracking-widest">{p.code}</span>
        <GripVertical className="h-3.5 w-3.5 text-gray-200 group-hover:text-gray-400 shrink-0" />
      </div>
      <h4 className="text-[12px] font-black text-gray-900 leading-tight mb-2 line-clamp-2">{p.name}</h4>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div className="h-full bg-primary rounded-full" style={{ width: `${p.progress || 0}%` }} />
      </div>
      <div className="flex items-center justify-between text-[9px] font-bold text-gray-500">
        <span className="flex items-center gap-1 truncate"><User className="h-3 w-3 text-gray-300 shrink-0" />{p.managerName || '—'}</span>
        <span>{p.progress || 0}%</span>
      </div>
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

function SummaryTile({ label, value, sub }) {
  return (
    <div className="bg-white p-5 rounded-3xl border shadow-sm">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
      <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
      <p className="text-[10px] font-bold text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}
