import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, Save, Plus, X, Pencil, Trash2, LayoutDashboard,
  FileText, ListChecks, DollarSign, Users, ShieldCheck, MessageSquare,
  AlertTriangle, FolderOpen, GitPullRequestArrow, Flag, CheckCircle2,
  FileDown, Upload, Link2, History, Archive, Check, Ban, Bell
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import projectService from '@/api/projectService';
import { otService } from '@/api/otService';
import { useAuth } from '@/store/AuthContext';
import { generateProjectActaPDF } from '../utils/projectPDF';
import { PROJECT_STATUS } from './ProjectsList';
import { cn } from '@/lib/utils';

const money = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

// ── Definición de secciones CRUD (una por área tipo lista) ──────────────────
// fields → formulario; columns → tabla.
const SECTIONS = [
  {
    key: 'tasks', sub: 'tasks', label: 'Cronograma', icon: ListChecks,
    fields: [
      { name: 'name', label: 'Actividad', type: 'text', required: true },
      { name: 'type', label: 'Tipo', type: 'select', options: [['TASK', 'Tarea'], ['MILESTONE', 'Hito']] },
      { name: 'status', label: 'Estado', type: 'select', options: [['PENDING', 'Pendiente'], ['IN_PROGRESS', 'En proceso'], ['DONE', 'Completada'], ['BLOCKED', 'Bloqueada']] },
      { name: 'progress', label: 'Avance %', type: 'number' },
      { name: 'startDate', label: 'Inicio', type: 'date' },
      { name: 'endDate', label: 'Fin', type: 'date' },
      { name: 'responsibleName', label: 'Responsable', type: 'employee' },
      { name: 'dependsOn', label: 'Depende de', type: 'depends' },
    ],
    columns: [
      { name: 'name', label: 'Actividad' },
      { name: 'type', label: 'Tipo', render: (v) => (v === 'MILESTONE' ? 'Hito' : 'Tarea') },
      { name: 'status', label: 'Estado', badge: true },
      { name: 'progress', label: 'Avance', render: (v) => `${v || 0}%` },
      { name: 'endDate', label: 'Fin', render: fmtDate },
      { name: 'responsibleName', label: 'Responsable' },
      { name: 'dependsOn', label: 'Dep.', render: (v) => (v && v.length ? String(v.length) : '—') },
    ],
  },
  {
    key: 'risks', sub: 'risks', label: 'Riesgos', icon: AlertTriangle,
    fields: [
      { name: 'description', label: 'Descripción del riesgo', type: 'textarea', required: true },
      { name: 'probability', label: 'Probabilidad', type: 'select', options: [['BAJA', 'Baja'], ['MEDIA', 'Media'], ['ALTA', 'Alta']] },
      { name: 'impact', label: 'Impacto', type: 'select', options: [['BAJO', 'Bajo'], ['MEDIO', 'Medio'], ['ALTO', 'Alto']] },
      { name: 'mitigation', label: 'Plan de mitigación', type: 'textarea' },
      { name: 'ownerName', label: 'Responsable', type: 'employee' },
      { name: 'status', label: 'Estado', type: 'select', options: [['ABIERTO', 'Abierto'], ['MITIGADO', 'Mitigado'], ['CERRADO', 'Cerrado'], ['MATERIALIZADO', 'Materializado']] },
    ],
    columns: [
      { name: 'description', label: 'Riesgo' },
      { name: 'probability', label: 'Prob.' },
      { name: 'impact', label: 'Impacto' },
      { name: 'ownerName', label: 'Responsable' },
      { name: 'status', label: 'Estado', badge: true },
    ],
  },
  {
    key: 'costs', sub: 'costs', label: 'Costos', icon: DollarSign,
    fields: [
      { name: 'concept', label: 'Concepto', type: 'text', required: true },
      { name: 'category', label: 'Categoría', type: 'select', options: [['MATERIAL', 'Material'], ['MANO_OBRA', 'Mano de obra'], ['EQUIPO', 'Equipo'], ['OTRO', 'Otro']] },
      { name: 'budgeted', label: 'Presupuestado ($)', type: 'number' },
      { name: 'actual', label: 'Gasto real ($)', type: 'number' },
      { name: 'date', label: 'Fecha', type: 'date' },
      { name: 'notes', label: 'Notas', type: 'textarea' },
    ],
    columns: [
      { name: 'concept', label: 'Concepto' },
      { name: 'category', label: 'Categoría' },
      { name: 'budgeted', label: 'Presupuesto', render: money },
      { name: 'actual', label: 'Real', render: money },
      { name: 'date', label: 'Fecha', render: fmtDate },
    ],
  },
  {
    key: 'resources', sub: 'resources', label: 'Recursos', icon: Users,
    fields: [
      { name: 'name', label: 'Recurso', type: 'text', required: true },
      { name: 'type', label: 'Tipo', type: 'select', options: [['PERSONAL', 'Personal'], ['EQUIPO', 'Equipo'], ['MATERIAL', 'Material']] },
      { name: 'quantity', label: 'Cantidad', type: 'number' },
      { name: 'unit', label: 'Unidad', type: 'text' },
      { name: 'cost', label: 'Costo ($)', type: 'number' },
      { name: 'responsibility', label: 'Responsabilidad asignada', type: 'textarea' },
      { name: 'assignedName', label: 'Asignado a', type: 'employee' },
    ],
    columns: [
      { name: 'name', label: 'Recurso' },
      { name: 'type', label: 'Tipo', badge: true },
      { name: 'quantity', label: 'Cant.' },
      { name: 'cost', label: 'Costo', render: money },
      { name: 'assignedName', label: 'Asignado' },
    ],
  },
  {
    key: 'quality', sub: 'quality', label: 'Calidad', icon: ShieldCheck,
    fields: [
      { name: 'type', label: 'Tipo', type: 'select', options: [['CRITERIO', 'Criterio de aceptación'], ['INSPECCION', 'Inspección'], ['PRUEBA', 'Prueba'], ['INDICADOR', 'Indicador']] },
      { name: 'description', label: 'Descripción', type: 'textarea', required: true },
      { name: 'target', label: 'Criterio / valor esperado', type: 'text' },
      { name: 'result', label: 'Resultado', type: 'text' },
      { name: 'status', label: 'Estado', type: 'select', options: [['PENDIENTE', 'Pendiente'], ['APROBADO', 'Aprobado'], ['RECHAZADO', 'Rechazado']] },
    ],
    columns: [
      { name: 'type', label: 'Tipo', badge: true },
      { name: 'description', label: 'Descripción' },
      { name: 'result', label: 'Resultado' },
      { name: 'status', label: 'Estado', badge: true },
    ],
  },
  {
    key: 'communications', sub: 'communications', label: 'Comunicaciones', icon: MessageSquare,
    fields: [
      { name: 'type', label: 'Tipo', type: 'select', options: [['MINUTA', 'Minuta'], ['REPORTE', 'Reporte de avance'], ['REUNION', 'Reunión']] },
      { name: 'title', label: 'Título', type: 'text', required: true },
      { name: 'content', label: 'Contenido', type: 'textarea' },
      { name: 'channel', label: 'Canal', type: 'text' },
      { name: 'date', label: 'Fecha', type: 'date' },
    ],
    columns: [
      { name: 'type', label: 'Tipo', badge: true },
      { name: 'title', label: 'Título' },
      { name: 'channel', label: 'Canal' },
      { name: 'date', label: 'Fecha', render: fmtDate },
    ],
  },
  {
    key: 'incidents', sub: 'incidents', label: 'Incidencias', icon: Flag,
    fields: [
      { name: 'title', label: 'Problema detectado', type: 'text', required: true },
      { name: 'description', label: 'Descripción', type: 'textarea' },
      { name: 'priority', label: 'Prioridad', type: 'select', options: [['BAJA', 'Baja'], ['MEDIA', 'Media'], ['ALTA', 'Alta'], ['CRITICA', 'Crítica']] },
      { name: 'responsibleName', label: 'Responsable', type: 'employee' },
      { name: 'status', label: 'Estado', type: 'select', options: [['ABIERTA', 'Abierta'], ['EN_PROCESO', 'En proceso'], ['RESUELTA', 'Resuelta']] },
    ],
    columns: [
      { name: 'title', label: 'Problema' },
      { name: 'priority', label: 'Prioridad', badge: true },
      { name: 'responsibleName', label: 'Responsable' },
      { name: 'status', label: 'Estado', badge: true },
    ],
  },
  {
    key: 'documents', sub: 'documents', label: 'Documental', icon: FolderOpen,
    fields: [
      { name: 'name', label: 'Nombre del documento', type: 'text', required: true },
      { name: 'category', label: 'Categoría', type: 'select', options: [['PLANO', 'Plano'], ['MANUAL', 'Manual'], ['CONTRATO', 'Contrato'], ['EVIDENCIA', 'Evidencia'], ['OTRO', 'Otro']] },
      { name: 'url', label: 'Archivo', type: 'file' },
      { name: 'version', label: 'Versión', type: 'text' },
    ],
    columns: [
      { name: 'name', label: 'Documento', render: (v, row) => row.url ? v : v },
      { name: 'category', label: 'Categoría', badge: true },
      { name: 'version', label: 'Versión' },
      { name: 'url', label: 'Enlace', render: (v) => v ? '🔗 Abrir' : '—', link: true },
    ],
  },
  {
    key: 'changes', sub: 'changes', label: 'Control de cambios', icon: GitPullRequestArrow,
    fields: [
      { name: 'title', label: 'Solicitud de cambio', type: 'text', required: true },
      { name: 'description', label: 'Descripción', type: 'textarea' },
      { name: 'impact', label: 'Evaluación del impacto', type: 'textarea' },
      { name: 'requestedByName', label: 'Solicitado por', type: 'employee' },
      { name: 'status', label: 'Estado', type: 'select', options: [['SOLICITADO', 'Solicitado'], ['APROBADO', 'Aprobado'], ['RECHAZADO', 'Rechazado']] },
    ],
    columns: [
      { name: 'title', label: 'Solicitud' },
      { name: 'requestedByName', label: 'Solicitante' },
      { name: 'status', label: 'Estado', badge: true },
      { name: 'createdAt', label: 'Fecha', render: fmtDate },
    ],
  },
];

const BADGE_CLS = {
  DONE: 'bg-emerald-50 text-emerald-600', APROBADO: 'bg-emerald-50 text-emerald-600',
  RESUELTA: 'bg-emerald-50 text-emerald-600', MITIGADO: 'bg-emerald-50 text-emerald-600', CERRADO: 'bg-emerald-50 text-emerald-600',
  IN_PROGRESS: 'bg-blue-50 text-blue-600', EN_PROCESO: 'bg-blue-50 text-blue-600',
  PENDING: 'bg-gray-100 text-gray-500', PENDIENTE: 'bg-gray-100 text-gray-500', SOLICITADO: 'bg-amber-50 text-amber-600',
  BLOCKED: 'bg-red-50 text-red-600', RECHAZADO: 'bg-red-50 text-red-600', MATERIALIZADO: 'bg-red-50 text-red-600',
  ABIERTA: 'bg-amber-50 text-amber-600', ABIERTO: 'bg-amber-50 text-amber-600',
  ALTA: 'bg-red-50 text-red-600', CRITICA: 'bg-red-50 text-red-600', ALTO: 'bg-red-50 text-red-600',
  MEDIA: 'bg-amber-50 text-amber-600', MEDIO: 'bg-amber-50 text-amber-600',
  BAJA: 'bg-gray-100 text-gray-500', BAJO: 'bg-gray-100 text-gray-500',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('resumen');
  const [employees, setEmployees] = useState([]);

  const load = async () => {
    try { setProject(await projectService.get(id)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    projectService.employees().then(setEmployees).catch(() => {});
    /* eslint-disable-next-line */
  }, [id]);

  const reload = () => projectService.get(id).then(setProject).catch(console.error);

  const kpis = useMemo(() => computeKpis(project), [project]);
  const alerts = useMemo(() => computeAlerts(project), [project]);

  if (loading) return <div className="py-24 flex justify-center"><Loader2 className="h-8 w-8 text-primary animate-spin" /></div>;
  if (!project) return <div className="py-24 text-center text-sm font-black text-red-400">Proyecto no encontrado.</div>;

  const st = PROJECT_STATUS[project.status] || PROJECT_STATUS.INICIO;

  const archive = async () => {
    if (!confirm('¿Archivar este proyecto? Dejará de aparecer en la lista.')) return;
    await projectService.remove(id);
    navigate('/projects');
  };

  const TABS = [
    { key: 'resumen', label: 'Acta', icon: FileText },
    { key: 'kpis', label: 'KPIs', icon: LayoutDashboard },
    ...SECTIONS.map(s => ({ key: s.key, label: s.label, icon: s.icon })),
    { key: 'vinculos', label: 'Vínculos', icon: Link2 },
    { key: 'actividad', label: 'Actividad', icon: History },
    { key: 'cierre', label: 'Cierre', icon: CheckCircle2 },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <header className="bg-white p-6 rounded-3xl border shadow-sm">
        <button onClick={() => navigate('/projects')} className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-primary mb-4">
          <ArrowLeft className="h-3.5 w-3.5" /> Proyectos
        </button>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <span className="text-[9px] font-black text-primary uppercase tracking-widest">{project.code}</span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">{project.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={project.status}
              onChange={async (e) => { await projectService.update(id, { status: e.target.value }); reload(); }}
              className={cn('px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer', st.cls)}
            >
              {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={archive} title="Archivar proyecto"
              className="p-2.5 border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-200 transition-all">
              <Archive className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Avance global */}
        <div className="mt-5">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
            <span>Avance global {project.autoProgress && '· automático'}</span><span>{project.progress || 0}%</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${project.progress || 0}%` }} />
          </div>
        </div>
      </header>

      {/* Alertas */}
      {alerts.total > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <Bell className="h-4 w-4 text-amber-500 shrink-0" />
          {alerts.overdue > 0 && <AlertChip label={`${alerts.overdue} tarea(s) vencida(s)`} />}
          {alerts.highRisks > 0 && <AlertChip label={`${alerts.highRisks} riesgo(s) alto(s) abierto(s)`} />}
          {alerts.openInc > 0 && <AlertChip label={`${alerts.openInc} incidencia(s) sin resolver`} />}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all',
              tab === t.key ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border text-gray-500 hover:text-gray-700'
            )}>
            <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === 'resumen' && <ActaTab project={project} onSaved={reload} employees={employees} />}
      {tab === 'kpis' && <KpisTab kpis={kpis} project={project} />}
      {tab === 'vinculos' && <VinculosTab project={project} onSaved={reload} />}
      {tab === 'actividad' && <ActividadTab activities={project.activities || []} />}
      {tab === 'cierre' && <CierreTab project={project} onSaved={reload} />}
      {SECTIONS.map(s => tab === s.key && (
        <div key={s.key} className="space-y-6">
          {s.key === 'tasks' && <GanttChart tasks={project.tasks || []} />}
          <CrudSection section={s} items={project[relationKey(s.key)] || []} projectId={id} onChanged={reload} employees={employees} />
        </div>
      ))}
    </div>
  );
}

function AlertChip({ label }) {
  return <span className="px-2.5 py-1 bg-white rounded-full text-[10px] font-black text-amber-600 uppercase tracking-wider border border-amber-200">{label}</span>;
}

function computeAlerts(project) {
  if (!project) return { total: 0 };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const overdue = (project.tasks || []).filter(t => t.status !== 'DONE' && t.endDate && new Date(t.endDate) < today).length;
  const highRisks = (project.risks || []).filter(r => (r.impact === 'ALTO' || r.probability === 'ALTA') && (r.status === 'ABIERTO' || r.status === 'MATERIALIZADO')).length;
  const openInc = (project.incidents || []).filter(i => i.status !== 'RESUELTA').length;
  return { overdue, highRisks, openInc, total: overdue + highRisks + openInc };
}

// El include del backend usa nombres de relación distintos al key de sección.
function relationKey(key) {
  return ({ quality: 'qualityItems' })[key] || key;
}

function computeKpis(project) {
  if (!project) return {};
  const tasks = project.tasks || [];
  const doneTasks = tasks.filter(t => t.status === 'DONE').length;
  const costs = project.costs || [];
  const spent = costs.reduce((a, c) => a + (c.actual || 0), 0);
  const risks = project.risks || [];
  const openRisks = risks.filter(r => r.status === 'ABIERTO' || r.status === 'MATERIALIZADO').length;
  const incidents = project.incidents || [];
  const openInc = incidents.filter(i => i.status !== 'RESUELTA').length;

  let timeUsed = null;
  if (project.startDate && project.endDate) {
    const start = new Date(project.startDate).getTime();
    const end = new Date(project.endDate).getTime();
    const now = Date.now();
    if (end > start) timeUsed = Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
  }

  return {
    progress: project.progress || 0,
    timeUsed,
    budget: project.budget || 0,
    spent,
    budgetPct: project.budget ? Math.round((spent / project.budget) * 100) : 0,
    tasksDone: doneTasks,
    tasksTotal: tasks.length,
    openRisks,
    openInc,
  };
}

// ── Tab KPIs ────────────────────────────────────────────────────────────────
const TASK_STATUS_META = [
  { key: 'DONE', label: 'Completadas', color: '#10b981' },
  { key: 'IN_PROGRESS', label: 'En proceso', color: '#3b82f6' },
  { key: 'PENDING', label: 'Pendientes', color: '#94a3b8' },
  { key: 'BLOCKED', label: 'Bloqueadas', color: '#ef4444' },
];

function KpisTab({ kpis, project }) {
  const cards = [
    { label: '% de avance', value: `${kpis.progress}%`, sub: 'Avance reportado' },
    { label: 'Tiempo consumido', value: kpis.timeUsed == null ? '—' : `${kpis.timeUsed}%`, sub: `${fmtDate(project.startDate)} → ${fmtDate(project.endDate)}` },
    { label: 'Presupuesto utilizado', value: `${kpis.budgetPct}%`, sub: `${money(kpis.spent)} de ${money(kpis.budget)}` },
    { label: 'Tareas completadas', value: `${kpis.tasksDone}/${kpis.tasksTotal}`, sub: 'Del cronograma' },
    { label: 'Riesgos abiertos', value: kpis.openRisks, sub: 'Requieren atención', alert: kpis.openRisks > 0 },
    { label: 'Incidencias pendientes', value: kpis.openInc, sub: 'Sin resolver', alert: kpis.openInc > 0 },
  ];

  // Datos para gráficas
  const tasks = project.tasks || [];
  const taskPie = TASK_STATUS_META
    .map(m => ({ name: m.label, value: tasks.filter(t => t.status === m.key).length, color: m.color }))
    .filter(d => d.value > 0);

  const costs = project.costs || [];
  const byCat = {};
  costs.forEach(c => {
    const k = c.category || 'GENERAL';
    if (!byCat[k]) byCat[k] = { name: k, Presupuestado: 0, Real: 0 };
    byCat[k].Presupuestado += c.budgeted || 0;
    byCat[k].Real += c.actual || 0;
  });
  const costData = Object.values(byCat);
  const budgetData = costData.length
    ? costData
    : [{ name: 'Total', Presupuestado: project.budget || 0, Real: kpis.spent }];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white p-6 rounded-3xl border shadow-sm">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">{c.label}</p>
            <p className={cn('text-3xl font-black tracking-tight', c.alert ? 'text-red-500' : 'text-gray-900')}>{c.value}</p>
            <p className="text-[10px] font-bold text-gray-400 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Presupuesto vs Real */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Presupuesto vs Gasto real</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={budgetData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#cbd5e1" />
              <YAxis tick={{ fontSize: 10 }} stroke="#cbd5e1" width={48} />
              <Tooltip formatter={(v) => money(v)} contentStyle={{ borderRadius: 12, fontSize: 12, fontWeight: 700 }} />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              <Bar dataKey="Presupuestado" fill="#93c5fd" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Real" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Estado de tareas */}
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Estado de tareas</p>
          {taskPie.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-[11px] font-black text-gray-300 uppercase tracking-widest">Sin tareas</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={taskPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {taskPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, fontWeight: 700 }} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Gantt del cronograma ─────────────────────────────────────────────────────
function GanttChart({ tasks }) {
  const dated = tasks.filter(t => t.startDate && t.endDate);
  if (dated.length === 0) {
    return (
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Línea de tiempo (Gantt)</p>
        <p className="text-[11px] font-bold text-gray-300">Agrega tareas con fecha de inicio y fin para ver el cronograma.</p>
      </div>
    );
  }
  const starts = dated.map(t => new Date(t.startDate).getTime());
  const ends = dated.map(t => new Date(t.endDate).getTime());
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const span = Math.max(1, max - min);
  const pct = (ms) => ((ms - min) / span) * 100;

  const now = Date.now();
  const todayPct = now >= min && now <= max ? pct(now) : null;
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);

  const statusColor = { DONE: 'bg-emerald-500', IN_PROGRESS: 'bg-blue-500', BLOCKED: 'bg-red-500', PENDING: 'bg-gray-300' };

  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Línea de tiempo (Gantt)</p>
        <p className="text-[10px] font-bold text-gray-400">{fmtDate(min)} → {fmtDate(max)}</p>
      </div>
      <div className="space-y-2.5">
        {dated.map(t => {
          const left = pct(new Date(t.startDate).getTime());
          const width = Math.max(2, pct(new Date(t.endDate).getTime()) - left);
          const isMilestone = t.type === 'MILESTONE';
          const overdue = t.status !== 'DONE' && new Date(t.endDate) < today0;
          return (
            <div key={t.id} className="grid grid-cols-[minmax(90px,180px)_1fr] gap-3 items-center">
              <span className={cn('text-[10px] font-black truncate uppercase tracking-wide', overdue ? 'text-red-500' : 'text-gray-600')}>{t.name}</span>
              <div className="relative h-6 bg-gray-50 rounded-lg">
                {todayPct != null && <div className="absolute top-0 bottom-0 w-px bg-red-400/70 z-10" style={{ left: `${todayPct}%` }} title="Hoy" />}
                {isMilestone ? (
                  <div className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rotate-45 bg-primary shadow" style={{ left: `calc(${left}% - 7px)` }} title={t.name} />
                ) : (
                  <div className={cn('absolute top-1 bottom-1 rounded-md shadow-sm flex items-center', statusColor[t.status] || 'bg-gray-300', overdue && 'ring-2 ring-red-400')}
                    style={{ left: `${left}%`, width: `${width}%` }} title={`${fmtDate(t.startDate)} → ${fmtDate(t.endDate)}${overdue ? ' · VENCIDA' : ''}`}>
                    <span className="px-2 text-[8px] font-black text-white/90 truncate">{t.progress || 0}%</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {todayPct != null && (
        <p className="mt-4 flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest">
          <span className="inline-block w-3 h-px bg-red-400" /> Línea roja = hoy
        </p>
      )}
    </div>
  );
}

// ── Tab Acta de inicio (editable) ───────────────────────────────────────────
const ACTA_FIELDS = [
  { name: 'name', label: 'Nombre del proyecto', type: 'text' },
  { name: 'objective', label: 'Objetivo', type: 'textarea' },
  { name: 'scope', label: 'Alcance', type: 'textarea' },
  { name: 'justification', label: 'Justificación', type: 'textarea' },
  { name: 'requirements', label: 'Requerimientos', type: 'textarea' },
  { name: 'deliverables', label: 'Entregables', type: 'textarea' },
  { name: 'sponsor', label: 'Patrocinador', type: 'text' },
  { name: 'managerName', label: 'Responsable del proyecto', type: 'employee' },
  { name: 'clientName', label: 'Cliente', type: 'text' },
  { name: 'startDate', label: 'Fecha de inicio', type: 'date' },
  { name: 'endDate', label: 'Fecha de fin', type: 'date' },
  { name: 'budget', label: 'Presupuesto ($)', type: 'number' },
  { name: 'progress', label: '% de avance', type: 'number' },
];

function ActaTab({ project, onSaved, employees }) {
  const [form, setForm] = useState(() => buildForm(project, ACTA_FIELDS));
  const [autoProgress, setAutoProgress] = useState(!!project.autoProgress);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  const save = async () => {
    setSaving(true); setOk(false);
    try {
      await projectService.update(project.id, {
        ...form,
        autoProgress,
        budget: parseFloat(form.budget) || 0,
        progress: Math.max(0, Math.min(100, parseInt(form.progress, 10) || 0)),
      });
      setOk(true);
      onSaved();
      setTimeout(() => setOk(false), 2000);
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {ACTA_FIELDS.filter(f => !(autoProgress && f.name === 'progress')).map(f => (
          <div key={f.name} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <FieldInput field={f} value={form[f.name]} onChange={(v) => setForm({ ...form, [f.name]: v })} context={{ employees }} />
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer pt-1">
        <input type="checkbox" checked={autoProgress} onChange={(e) => setAutoProgress(e.target.checked)} className="h-4 w-4 accent-[color:var(--color-primary,#2563eb)]" />
        <span className="text-[11px] font-black text-gray-600 uppercase tracking-wider">Calcular avance automáticamente desde las tareas</span>
      </label>
      <div className="flex justify-end items-center gap-3 pt-2">
        {ok && <span className="text-[11px] font-black text-emerald-500 uppercase tracking-wider">✓ Guardado</span>}
        <button onClick={() => generateProjectActaPDF(project, 'inicio')}
          className="flex items-center gap-2 px-5 py-3 border border-gray-200 text-gray-600 rounded-2xl text-[11px] font-black uppercase tracking-wider hover:bg-gray-50 transition-all">
          <FileDown className="h-4 w-4" /> Descargar PDF
        </button>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar acta
        </button>
      </div>
    </div>
  );
}

// ── Tab Cierre ──────────────────────────────────────────────────────────────
function CierreTab({ project, onSaved }) {
  const [form, setForm] = useState({
    lessonsLearned: project.lessonsLearned || '',
    closureNotes: project.closureNotes || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const save = async (close) => {
    setSaving(true);
    try {
      await projectService.update(project.id, {
        ...form,
        ...(close ? { status: 'CERRADO', closedAt: new Date().toISOString(), progress: 100 } : {}),
      });
      onSaved();
    } finally { setSaving(false); }
  };

  // Genera el acta de cierre, la sube a R2 y guarda el enlace en el proyecto.
  const attachPdf = async () => {
    setUploading(true);
    try {
      const dataUri = await generateProjectActaPDF({ ...project, ...form }, 'cierre', { download: false, returnDataUri: true });
      const url = await otService.uploadLargeFile(dataUri, 'project-actas');
      await projectService.update(project.id, { closureActUrl: url });
      onSaved();
    } catch (e) {
      alert('No se pudo adjuntar el acta: ' + e.message);
    } finally { setUploading(false); }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
      <div>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Validación de entregables / Lecciones aprendidas</p>
        <textarea rows={4} value={form.lessonsLearned} onChange={(e) => setForm({ ...form, lessonsLearned: e.target.value })} className="proj-input" />
      </div>
      <div>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Notas de cierre / Documentación final</p>
        <textarea rows={4} value={form.closureNotes} onChange={(e) => setForm({ ...form, closureNotes: e.target.value })} className="proj-input" />
      </div>
      {project.closedAt && (
        <p className="text-[11px] font-black text-emerald-500 uppercase tracking-wider">✓ Proyecto cerrado el {fmtDate(project.closedAt)}</p>
      )}
      {project.closureActUrl && (
        <a href={project.closureActUrl} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-black text-primary uppercase tracking-wider hover:underline">
          <Link2 className="h-3.5 w-3.5" /> Acta de cierre adjunta
        </a>
      )}

      <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-gray-100">
        <button onClick={() => generateProjectActaPDF({ ...project, ...form }, 'cierre')}
          className="flex items-center gap-2 px-5 py-3 border border-gray-200 rounded-2xl text-[11px] font-black uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-all">
          <FileDown className="h-4 w-4" /> Descargar PDF
        </button>
        <button onClick={attachPdf} disabled={uploading}
          className="flex items-center gap-2 px-5 py-3 border border-gray-200 rounded-2xl text-[11px] font-black uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Adjuntar acta
        </button>
        <button onClick={() => save(false)} disabled={saving}
          className="px-5 py-3 border rounded-2xl text-[11px] font-black uppercase tracking-wider text-gray-500 hover:bg-gray-50 disabled:opacity-50">
          Guardar
        </button>
        <button onClick={() => save(true)} disabled={saving}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:opacity-90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Cerrar proyecto
        </button>
      </div>
      <ProjInputStyle />
    </div>
  );
}

// ── Tab Vínculos (OTs y cotizaciones existentes) ─────────────────────────────
function VinculosTab({ project, onSaved }) {
  const navigate = useNavigate();
  const [ots, setOts] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const linkedOtIds = Array.isArray(project.linkedOtIds) ? project.linkedOtIds : [];
  const linkedQuoteIds = Array.isArray(project.linkedQuoteIds) ? project.linkedQuoteIds : [];

  useEffect(() => {
    Promise.all([projectService.ots(), projectService.quotes()])
      .then(([o, q]) => { setOts(o); setQuotes(q); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveLinks = (field, ids) => projectService.update(project.id, { [field]: ids }).then(onSaved);

  const otById = (oid) => ots.find(o => o.id === oid);
  const quoteById = (qid) => quotes.find(q => q.id === qid);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* OTs vinculadas */}
      <LinkCard
        title="Órdenes de Trabajo"
        icon={ListChecks}
        loading={loading}
        options={ots.filter(o => !linkedOtIds.includes(o.id)).map(o => ({ id: o.id, label: `${o.otNumber || ''} · ${o.title || ''}` }))}
        onAdd={(oid) => saveLinks('linkedOtIds', [...linkedOtIds, oid])}
        linked={linkedOtIds.map(oid => {
          const o = otById(oid);
          return { id: oid, label: o ? `${o.otNumber || ''} · ${o.title || ''}` : oid, onOpen: () => navigate(`/ots/${oid}`) };
        })}
        onRemove={(oid) => saveLinks('linkedOtIds', linkedOtIds.filter(x => x !== oid))}
      />
      {/* Cotizaciones vinculadas */}
      <LinkCard
        title="Cotizaciones"
        icon={FileText}
        loading={loading}
        options={quotes.filter(q => !linkedQuoteIds.includes(q.id)).map(q => ({ id: q.id, label: `${q.quoteNumber || ''} · ${q.projectName || ''}` }))}
        onAdd={(qid) => saveLinks('linkedQuoteIds', [...linkedQuoteIds, qid])}
        linked={linkedQuoteIds.map(qid => {
          const q = quoteById(qid);
          return { id: qid, label: q ? `${q.quoteNumber || ''} · ${q.projectName || ''}` : qid };
        })}
        onRemove={(qid) => saveLinks('linkedQuoteIds', linkedQuoteIds.filter(x => x !== qid))}
      />
    </div>
  );
}

function LinkCard({ title, icon: Icon, loading, options, onAdd, linked, onRemove }) {
  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b">
        <Icon className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">{title}</h2>
        <span className="text-[10px] font-bold text-gray-400">({linked.length})</span>
      </div>
      <div className="p-6 space-y-3">
        {loading ? (
          <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 text-primary animate-spin" /></div>
        ) : (
          <>
            <select defaultValue="" onChange={(e) => { if (e.target.value) { onAdd(e.target.value); e.target.value = ''; } }}
              className="proj-input cursor-pointer">
              <option value="">+ Vincular…</option>
              {options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            {linked.length === 0 ? (
              <p className="text-[11px] font-bold text-gray-300 py-2">Sin vínculos.</p>
            ) : (
              <div className="space-y-2">
                {linked.map(l => (
                  <div key={l.id} className="flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-50 rounded-xl">
                    <button disabled={!l.onOpen} onClick={l.onOpen}
                      className={cn('text-[11px] font-bold text-gray-700 truncate text-left', l.onOpen && 'hover:text-primary cursor-pointer')}>
                      {l.label}
                    </button>
                    <button onClick={() => onRemove(l.id)} className="p-1 text-gray-300 hover:text-red-500 shrink-0"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <ProjInputStyle />
    </div>
  );
}

// ── Tab Actividad (bitácora de auditoría) ────────────────────────────────────
function ActividadTab({ activities }) {
  if (!activities || activities.length === 0) {
    return <div className="bg-white p-6 rounded-3xl border shadow-sm text-[11px] font-black text-gray-300 uppercase tracking-widest text-center py-16">Sin actividad registrada</div>;
  }
  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b">
        <History className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Bitácora del proyecto</h2>
      </div>
      <div className="divide-y">
        {activities.map(a => (
          <div key={a.id} className="flex items-start gap-3 px-6 py-3.5">
            <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-gray-800">{a.action}{a.detail ? <span className="font-bold text-gray-500"> · {a.detail}</span> : null}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                {a.authorName || 'Sistema'} · {new Date(a.createdAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sección CRUD genérica ───────────────────────────────────────────────────
function CrudSection({ section, items, projectId, onChanged, employees }) {
  const { user } = useAuth();
  const [modal, setModal] = useState(null); // null | {} (nuevo) | item (editar)
  const [saving, setSaving] = useState(false);

  // Aprobar / rechazar solicitudes de cambio.
  const decide = async (item, status) => {
    await projectService.updateItem('changes', item.id, {
      status,
      decidedByName: user?.name || '',
      decidedAt: new Date().toISOString(),
    });
    onChanged();
  };

  const openNew = () => setModal(defaultsFor(section.fields));
  const openEdit = (item) => setModal(buildForm(item, section.fields, item.id));

  const save = async () => {
    setSaving(true);
    try {
      const payload = coerce(modal, section.fields);
      if (modal.id) await projectService.updateItem(section.sub, modal.id, payload);
      else await projectService.addItem(projectId, section.sub, payload);
      setModal(null);
      onChanged();
    } catch (e) { alert(e.message); } finally { setSaving(false); }
  };

  const del = async (item) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await projectService.removeItem(section.sub, item.id);
    onChanged();
  };

  return (
    <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="flex items-center gap-2 text-sm font-black text-gray-900 uppercase tracking-tight">
          <section.icon className="h-4 w-4 text-primary" /> {section.label}
          <span className="text-[10px] font-bold text-gray-400">({items.length})</span>
        </h2>
        <button onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:opacity-90">
          <Plus className="h-3.5 w-3.5" /> Agregar
        </button>
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center text-[11px] font-black text-gray-300 uppercase tracking-widest">Sin registros</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-gray-50/50">
                {section.columns.map(c => (
                  <th key={c.name} className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">{c.label}</th>
                ))}
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50/50">
                  {section.columns.map(c => (
                    <td key={c.name} className="px-6 py-3 text-[11px] font-bold text-gray-700 max-w-[220px] truncate">
                      {renderCell(c, item)}
                    </td>
                  ))}
                  <td className="px-6 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {section.key === 'changes' && item.status === 'SOLICITADO' && (
                        <>
                          <button onClick={() => decide(item, 'APROBADO')} title="Aprobar" className="p-1.5 text-gray-300 hover:text-emerald-500"><Check className="h-3.5 w-3.5" /></button>
                          <button onClick={() => decide(item, 'RECHAZADO')} title="Rechazar" className="p-1.5 text-gray-300 hover:text-red-500"><Ban className="h-3.5 w-3.5" /></button>
                        </>
                      )}
                      <button onClick={() => openEdit(item)} className="p-1.5 text-gray-300 hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => del(item)} className="p-1.5 text-gray-300 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal alta/edición */}
      {modal && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-8 py-5 flex items-center justify-between rounded-t-[2rem]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-2xl">
                  <section.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900 tracking-tight">{modal.id ? 'Editar registro' : 'Nuevo registro'}</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{section.label}</p>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors"><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <div className="p-8 space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                {section.fields.map(f => (
                  <div key={f.name} className={(f.type === 'textarea' || f.type === 'depends' || f.type === 'file') ? 'sm:col-span-2' : ''}>
                    <FieldInput field={f} value={modal[f.name]} onChange={(v) => setModal({ ...modal, [f.name]: v })}
                      context={{ items, currentId: modal.id, employees }} />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-5 border-t border-gray-100">
                <button onClick={() => setModal(null)} className="flex-1 py-3.5 border border-gray-200 rounded-2xl text-[11px] font-black uppercase tracking-wider text-gray-500 hover:bg-gray-50 transition-all">Cancelar</button>
                <button onClick={save} disabled={saving}
                  className="flex-[2] py-3.5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-wider shadow-lg shadow-primary/25 hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ProjInputStyle />
    </div>
  );
}

// ── Helpers de formulario ────────────────────────────────────────────────────
function fieldDefault(f) {
  if (f.type === 'select') return f.options[0][0];
  if (f.type === 'depends') return [];
  return '';
}

function FieldInput({ field, value, onChange, context }) {
  const base = 'proj-input';
  const [uploading, setUploading] = useState(false);
  const labelEl = (
    <span className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">{field.label}{field.required && ' *'}</span>
  );

  // ── Subida de archivo a R2 ──────────────────────────────────────────────
  if (field.type === 'file') {
    const handleFile = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      try {
        const dataUri = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        onChange(await otService.uploadLargeFile(dataUri, 'project-docs'));
      } catch (err) { alert('Error al subir el archivo: ' + err.message); }
      finally { setUploading(false); }
    };
    return (
      <label className="block">
        {labelEl}
        <div className="flex items-center gap-2">
          <label className="flex-1 cursor-pointer flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold text-gray-500 hover:border-primary/40 transition-all">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Subiendo…' : (value ? 'Reemplazar archivo' : 'Seleccionar archivo')}
            <input type="file" className="hidden" onChange={handleFile} />
          </label>
          {value && (
            <a href={value} target="_blank" rel="noreferrer" className="p-2.5 text-primary hover:bg-primary/5 rounded-xl" title="Ver archivo">
              <Link2 className="h-4 w-4" />
            </a>
          )}
        </div>
      </label>
    );
  }

  // ── Selector de empleado (del directorio) ───────────────────────────────
  if (field.type === 'employee') {
    const emps = context?.employees || [];
    return (
      <label className="block">
        {labelEl}
        <select className={base} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Selecciona —</option>
          {emps.map(emp => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
          {value && !emps.some(emp => emp.name === value) && <option value={value}>{value}</option>}
        </select>
      </label>
    );
  }

  // ── Dependencias (multiselección de otras tareas) ───────────────────────
  if (field.type === 'depends') {
    const options = (context?.items || []).filter(t => t.id !== context?.currentId);
    const selected = Array.isArray(value) ? value : [];
    const toggle = (tid) => onChange(selected.includes(tid) ? selected.filter(x => x !== tid) : [...selected, tid]);
    return (
      <label className="block">
        {labelEl}
        {options.length === 0 ? (
          <p className="text-[10px] font-bold text-gray-300">No hay otras tareas para depender.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
            {options.map(o => (
              <button type="button" key={o.id} onClick={() => toggle(o.id)}
                className={cn('px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide border transition-all',
                  selected.includes(o.id) ? 'bg-primary text-white border-primary' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300')}>
                {o.name}
              </button>
            ))}
          </div>
        )}
      </label>
    );
  }

  return (
    <label className="block">
      {labelEl}
      {field.type === 'textarea' ? (
        <textarea rows={2} className={base} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      ) : field.type === 'select' ? (
        <select className={base} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {field.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ) : (
        <input type={field.type} className={base} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function defaultsFor(fields) {
  const o = {};
  for (const f of fields) o[f.name] = fieldDefault(f);
  return o;
}

// Prellena un formulario desde un registro existente (fechas → yyyy-mm-dd).
function buildForm(record, fields, id) {
  const o = id ? { id } : {};
  for (const f of fields) {
    let v = record?.[f.name];
    if (f.type === 'date' && v) v = new Date(v).toISOString().slice(0, 10);
    o[f.name] = v ?? fieldDefault(f);
  }
  return o;
}

// Convierte valores del formulario a los tipos correctos para el API.
function coerce(form, fields) {
  const o = { ...form };
  delete o.id;
  for (const f of fields) {
    if (f.type === 'number') o[f.name] = o[f.name] === '' ? 0 : Number(o[f.name]);
  }
  return o;
}

function renderCell(col, item) {
  const raw = item[col.name];
  const val = col.render ? col.render(raw, item) : (raw ?? '—');
  if (col.link && raw) return <a href={raw} target="_blank" rel="noreferrer" className="text-primary hover:underline">{val}</a>;
  if (col.badge && raw) {
    return <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider', BADGE_CLS[raw] || 'bg-gray-100 text-gray-500')}>{val}</span>;
  }
  return <span>{val === '' ? '—' : val}</span>;
}

function ProjInputStyle() {
  return (
    <style>{`
      .proj-input {
        width: 100%; padding: 0.6rem 0.9rem; background: #f9fafb;
        border: 1px solid #e5e7eb; border-radius: 0.9rem; font-size: 0.75rem;
        font-weight: 700; color: #111827; outline: none; transition: border-color .2s;
      }
      .proj-input:focus { border-color: var(--color-primary, #2563eb); }
    `}</style>
  );
}
