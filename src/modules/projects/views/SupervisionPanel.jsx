import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, RefreshCw, Loader2, AlertTriangle, CalendarClock, CalendarDays,
  Users, UserCheck, PackagePlus, Flag, FileWarning, Timer, FolderKanban,
  Phone, MapPin, ArrowRight, ClipboardList, Map as MapIcon, GraduationCap,
} from 'lucide-react';
import projectService from '@/api/projectService';
import { cn } from '@/lib/utils';
import {
  typeMeta, priorityMeta, otPriorityMeta, activityLabel, assignmentWindow,
  byWindowUrgency, WINDOW_STATUS, isDueSoon, daysUntil, relDays, fmtDate,
  telHref, zonesFrom,
} from '../utils/reglas';

// ── Panel de Supervisión y Control ─────────────────────────────────────────
// La pantalla del Gerente de Proyectos / Agilizador: qué se está moviendo hoy,
// qué se atrasó, quién está libre y qué hay que asignar antes de que se venza.
// Todo sale de una sola llamada (?scope=supervision) ya agregada en servidor.

const BUCKETS = [
  { key: 'overdue',     label: 'Atrasadas',     icon: AlertTriangle, tone: 'text-red-500' },
  { key: 'today',       label: 'Hoy',           icon: CalendarClock, tone: 'text-primary' },
  { key: 'upcoming',    label: 'Próx. 7 días',  icon: CalendarDays,  tone: 'text-blue-500' },
  { key: 'unscheduled', label: 'Sin programar', icon: Timer,         tone: 'text-amber-500' },
];

const OT_STATUS_LABEL = {
  UNASSIGNED: 'Sin asignar', ASSIGNED: 'Asignada', ACCEPTED: 'Aceptada',
  IN_PROGRESS: 'En proceso', PENDING: 'Pendiente',
};

export default function SupervisionPanel() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [zone, setZone] = useState('');
  const [bucket, setBucket] = useState('today');

  const load = async () => {
    setLoading(true);
    try {
      setData(await projectService.supervision());
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const projects = data?.projects || [];
  const assignments = data?.assignments || {};
  const technicians = data?.technicians || [];
  const fieldDocs = data?.fieldDocs || [];
  const trainings = data?.trainings || [];

  const zones = useMemo(
    () => zonesFrom(projects, ...Object.values(assignments)),
    [projects, assignments]
  );

  // El filtro de zona recorre todo el panel: es la vista "zonificada" de la
  // operación que pide el mapa de zonas.
  const inZone = (x) => !zone || (x?.zone || '') === zone;
  const proyectos = projects.filter(inZone);
  const asignaciones = Object.fromEntries(
    BUCKETS.map(b => [b.key, (assignments[b.key] || []).filter(inZone)])
  );

  // Un técnico cuenta como "de la zona" si trae alguna asignación ahí.
  const techIdsEnZona = useMemo(() => {
    if (!zone) return null;
    const ids = new Set();
    for (const list of Object.values(asignaciones)) {
      for (const ot of list) if (ot.technicianId) ids.add(ot.technicianId);
    }
    return ids;
  }, [zone, asignaciones]);
  const tecnicos = techIdsEnZona ? technicians.filter(t => techIdsEnZona.has(t.id)) : technicians;

  const kpis = useMemo(() => {
    const activos = proyectos.filter(p => !['APROBACION', 'CIERRE', 'CERRADO'].includes(p.status));
    return {
      activos: activos.length,
      hoy: asignaciones.today?.length || 0,
      atrasadas: asignaciones.overdue?.length || 0,
      libres: tecnicos.filter(t => !t.busy).length,
      ocupados: tecnicos.filter(t => t.busy).length,
      recursos: proyectos.reduce((a, p) => a + (p.pendingRequests || 0), 0),
      incidentes: proyectos.reduce((a, p) => a + (p.openIncidents || 0), 0),
      docs: fieldDocs.length,
      capacitacion: trainings.length,
      porVencer: activos.filter(p => isDueSoon(p)).length,
    };
  }, [proyectos, asignaciones, tecnicos, fieldDocs, trainings]);

  // Regla de anticipación: proyectos que ya entraron en ventana sin nadie
  // asignado, o que se pasaron del compromiso.
  const porAsignar = useMemo(
    () => proyectos
      .filter(p => ['URGENTE', 'VENCIDO'].includes(assignmentWindow(p).status))
      .sort(byWindowUrgency),
    [proyectos]
  );

  const agenda = proyectos.slice().sort(byWindowUrgency);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <header className="bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                Sistema General · Proyectos
              </span>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                Supervisión y Control
              </h1>
              <p className="text-[11px] font-bold text-gray-400 mt-1">
                Qué se mueve hoy, qué se atrasó y qué hay que asignar antes de que se venza
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {zones.length > 0 && (
              <div className="relative">
                <MapIcon className="h-3.5 w-3.5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select value={zone} onChange={(e) => setZone(e.target.value)}
                  className="pl-8 pr-4 py-2.5 border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-wider text-gray-600 bg-white appearance-none">
                  <option value="">Todas las zonas</option>
                  {zones.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
            )}
            <button onClick={load}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-2xl text-[10px] font-black uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-all">
              <RefreshCw className="h-3.5 w-3.5" /> Actualizar
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 text-[11px] font-black text-red-500 uppercase tracking-wider">{error}</p>
        )}
      </header>

      {/* ── Indicadores ────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <Tile icon={FolderKanban}  label="Proyectos activos"  value={kpis.activos} />
        <Tile icon={CalendarClock} label="Asignaciones de hoy" value={kpis.hoy}
          onClick={() => setBucket('today')} />
        <Tile icon={AlertTriangle} label="Asignaciones atrasadas" value={kpis.atrasadas}
          tone={kpis.atrasadas > 0 ? 'danger' : undefined} onClick={() => setBucket('overdue')} />
        <Tile icon={UserCheck}     label="Técnicos disponibles" value={kpis.libres} />
        <Tile icon={Users}         label="Técnicos ocupados"    value={kpis.ocupados} />
        <Tile icon={PackagePlus}   label="Recursos pendientes"  value={kpis.recursos}
          tone={kpis.recursos > 0 ? 'warn' : undefined} />
        <Tile icon={Flag}          label="Incidentes abiertos"  value={kpis.incidentes}
          tone={kpis.incidentes > 0 ? 'warn' : undefined} />
        <Tile icon={FileWarning}   label="Documentación por vencer" value={kpis.docs}
          tone={kpis.docs > 0 ? 'warn' : undefined} />
        <Tile icon={Timer}         label="Proyectos por vencer" value={kpis.porVencer}
          tone={kpis.porVencer > 0 ? 'danger' : undefined} />
        <Tile icon={ClipboardList} label="Por asignar (regla)"  value={porAsignar.length}
          tone={porAsignar.length > 0 ? 'danger' : undefined} />
        <Tile icon={GraduationCap} label="Capacitación por vencer" value={kpis.capacitacion}
          tone={kpis.capacitacion > 0 ? 'warn' : undefined} />
      </div>

      {/* ── Regla de anticipación ──────────────────────────────────────── */}
      <section className="bg-white p-6 rounded-3xl border shadow-sm">
        <SectionTitle icon={ClipboardList} title="Hay que asignar"
          hint={`La ventana la marca el tipo de proyecto: Tienda ${typeMeta('TIENDA').leadDays} d · Mantenimiento ${typeMeta('MANTENIMIENTO').leadDays} d · Implementación ${typeMeta('IMPLEMENTACION').leadDays} d · Diseño ${typeMeta('DISENO').leadDays} d`} />

        {porAsignar.length === 0 ? (
          <Empty text="Ningún proyecto entró en ventana sin asignación." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {porAsignar.map(p => {
              const w = assignmentWindow(p);
              const t = typeMeta(p.projectType);
              return (
                <div key={p.id} className="p-4 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => navigate(`/projects/${p.id}`)} className="text-left min-w-0">
                      <p className="text-[11px] font-black text-gray-900 truncate">{p.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                        {p.code} · {p.clientName || 'Sin cliente'}
                      </p>
                    </button>
                    <Chip cls={WINDOW_STATUS[w.status].cls}>{WINDOW_STATUS[w.status].label}</Chip>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                    <Chip cls={t.cls}>{t.label}</Chip>
                    <Chip cls={priorityMeta(p.priority).cls}>{priorityMeta(p.priority).label}</Chip>
                    {p.zone && <Chip cls="bg-gray-50 text-gray-500 border-gray-200"><MapPin className="h-2.5 w-2.5" /> {p.zone}</Chip>}
                  </div>

                  <p className="text-[10px] font-bold text-gray-500 mt-2.5">
                    Compromiso {fmtDate(w.target)} · <span className={cn(w.daysLeft < 0 ? 'text-red-500' : 'text-amber-600')}>{relDays(w.daysLeft)}</span>
                    <span className="text-gray-300"> · ventana {w.lead} d</span>
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    <button onClick={() => navigate(`/projects/${p.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:opacity-90 transition-all">
                      Abrir <ArrowRight className="h-3 w-3" />
                    </button>
                    <CallButton project={p} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Asignaciones ───────────────────────────────────────────────── */}
      <section className="bg-white p-6 rounded-3xl border shadow-sm">
        <SectionTitle icon={CalendarClock} title="Asignaciones"
          hint="Quién hace qué, dónde y cuándo" />

        <div className="flex flex-wrap gap-2 mb-4">
          {BUCKETS.map(b => {
            const n = asignaciones[b.key]?.length || 0;
            const active = bucket === b.key;
            return (
              <button key={b.key} onClick={() => setBucket(b.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all',
                  active ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                )}>
                <b.icon className={cn('h-3 w-3', active ? 'text-white' : b.tone)} />
                {b.label}
                <span className={cn('tabular-nums', active ? 'text-white/70' : 'text-gray-300')}>{n}</span>
              </button>
            );
          })}
        </div>

        {(asignaciones[bucket] || []).length === 0 ? (
          <Empty text="Sin asignaciones en esta ventana." />
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-208 text-left">
              <thead>
                <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">
                  <th className="pb-2 pr-3">Folio / trabajo</th>
                  <th className="pb-2 pr-3">Cliente / sitio</th>
                  <th className="pb-2 pr-3">Zona</th>
                  <th className="pb-2 pr-3">Actividad</th>
                  <th className="pb-2 pr-3">Técnico</th>
                  <th className="pb-2 pr-3 text-center">Fecha</th>
                  <th className="pb-2 pr-3 text-center">Prioridad</th>
                  <th className="pb-2 text-center">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(asignaciones[bucket] || []).map(ot => (
                  <tr key={ot.id} onClick={() => navigate(`/ots/${ot.id}`)}
                    className="text-[11px] font-bold text-gray-600 hover:bg-gray-50 cursor-pointer">
                    <td className="py-2.5 pr-3">
                      <span className="font-mono text-[10px] font-black text-gray-900">{ot.otNumber}</span>
                      <span className="block text-[10px] font-bold text-gray-400 truncate max-w-56">{ot.title}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      {ot.clientName}
                      {ot.storeName && <span className="block text-[9px] font-bold text-gray-300 uppercase tracking-wider">{ot.storeName}</span>}
                    </td>
                    <td className="py-2.5 pr-3">{ot.zone || <span className="text-gray-300">—</span>}</td>
                    <td className="py-2.5 pr-3">{activityLabel(ot.activity)}</td>
                    <td className="py-2.5 pr-3">
                      {ot.technician?.name || <span className="text-amber-600">Sin asignar</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-center tabular-nums">
                      {ot.scheduledDate ? fmtDate(ot.scheduledDate) : <span className="text-gray-300">—</span>}
                      {ot.arrivalTime && <span className="block text-[9px] text-gray-300">{ot.arrivalTime}</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-center">
                      <Chip cls={otPriorityMeta(ot.priority).cls}>{otPriorityMeta(ot.priority).label}</Chip>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">
                        {OT_STATUS_LABEL[ot.status] || ot.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        {/* ── Proyectos ─────────────────────────────────────────────────── */}
        <section className="bg-white p-6 rounded-3xl border shadow-sm">
          <SectionTitle icon={FolderKanban} title="Proyectos"
            hint="Ordenados por lo que exige acción" />

          {agenda.length === 0 ? (
            <Empty text="Sin proyectos en esta zona." />
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-208 text-left">
                <thead>
                  <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">
                    <th className="pb-2 pr-3">Proyecto</th>
                    <th className="pb-2 pr-3">Tipo</th>
                    <th className="pb-2 pr-3">Zona</th>
                    <th className="pb-2 pr-3 text-center">Avance</th>
                    <th className="pb-2 pr-3 text-center">Compromiso</th>
                    <th className="pb-2 pr-3 text-center">Asign.</th>
                    <th className="pb-2 pr-3 text-center">Inc.</th>
                    <th className="pb-2 pr-3 text-center">Rec.</th>
                    <th className="pb-2 text-right">Encargado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {agenda.map(p => {
                    const w = assignmentWindow(p);
                    const t = typeMeta(p.projectType);
                    return (
                      <tr key={p.id} className="text-[11px] font-bold text-gray-600 hover:bg-gray-50">
                        <td className="py-2.5 pr-3">
                          <button onClick={() => navigate(`/projects/${p.id}`)} className="text-left">
                            <span className="font-black text-gray-900">{p.name}</span>
                            <span className="block text-[9px] font-bold text-gray-300 uppercase tracking-wider">
                              {p.code} · {p.clientName || 'Sin cliente'}
                            </span>
                          </button>
                        </td>
                        <td className="py-2.5 pr-3"><Chip cls={t.cls}>{t.label}</Chip></td>
                        <td className="py-2.5 pr-3">{p.zone || <span className="text-gray-300">—</span>}</td>
                        <td className="py-2.5 pr-3 text-center tabular-nums">{p.progress || 0}%</td>
                        <td className="py-2.5 pr-3 text-center">
                          {w.target ? (
                            <>
                              <span className="tabular-nums">{fmtDate(w.target)}</span>
                              <span className={cn(
                                'block text-[9px] font-black uppercase tracking-wider',
                                w.daysLeft < 0 ? 'text-red-500' : w.daysLeft <= 7 ? 'text-amber-600' : 'text-gray-300'
                              )}>
                                {relDays(w.daysLeft)}
                              </span>
                            </>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-2.5 pr-3 text-center">
                          <Chip cls={WINDOW_STATUS[w.status].cls}>
                            {p.openAssignments || 0}
                          </Chip>
                        </td>
                        <td className={cn('py-2.5 pr-3 text-center tabular-nums', p.openIncidents > 0 && 'text-red-500 font-black')}>
                          {p.openIncidents || 0}
                        </td>
                        <td className={cn('py-2.5 pr-3 text-center tabular-nums', p.pendingRequests > 0 && 'text-amber-600 font-black')}>
                          {p.pendingRequests || 0}
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[10px] text-gray-400 truncate max-w-32">
                              {p.clientContactName || '—'}
                            </span>
                            <CallButton project={p} compact />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-6">
          {/* ── Técnicos ───────────────────────────────────────────────── */}
          <section className="bg-white p-6 rounded-3xl border shadow-sm">
            <SectionTitle icon={Users} title="Técnicos" hint="Carga de trabajo abierta" />
            {tecnicos.length === 0 ? (
              <Empty text="Sin técnicos en esta zona." />
            ) : (
              <ul className="space-y-2.5">
                {tecnicos.slice().sort((a, b) => (b.today - a.today) || (b.open - a.open)).map(t => (
                  <li key={t.id} className="flex items-center gap-3">
                    <span className={cn('h-2 w-2 rounded-full shrink-0', t.busy ? 'bg-orange-500' : 'bg-emerald-500')} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black text-gray-800 truncate">{t.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                        {t.busy ? 'Ocupado' : 'Disponible'}
                        {t.overdue > 0 && <span className="text-red-500"> · {t.overdue} atrasada{t.overdue === 1 ? '' : 's'}</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-black text-gray-900 tabular-nums">{t.today}</p>
                      <p className="text-[8px] font-black text-gray-300 uppercase tracking-wider">hoy · {t.open} abiertas</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── Documentación de campo ─────────────────────────────────── */}
          <section className="bg-white p-6 rounded-3xl border shadow-sm">
            <SectionTitle icon={FileWarning} title="Documentación de campo"
              hint="Vigencias que la tienda revisa en el acceso" />
            {fieldDocs.length === 0 ? (
              <Empty text="Nada por vencer en 30 días." />
            ) : (
              <ul className="space-y-2.5">
                {fieldDocs.slice(0, 12).map(d => {
                  const dias = daysUntil(d.expiresAt);
                  return (
                    <li key={d.id} className="flex items-center gap-3">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', d.expired ? 'bg-red-500' : 'bg-amber-500')} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black text-gray-800 truncate">{d.employeeName || 'Sin nombre'}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{d.type}</p>
                      </div>
                      <span className={cn(
                        'text-[9px] font-black uppercase tracking-wider shrink-0',
                        d.expired ? 'text-red-500' : 'text-amber-600'
                      )}>
                        {d.expired ? 'Vencido' : relDays(dias)}
                      </span>
                    </li>
                  );
                })}
                {fieldDocs.length > 12 && (
                  <li className="text-[9px] font-black text-gray-300 uppercase tracking-wider pt-1">
                    +{fieldDocs.length - 12} más en Docs. de Campo
                  </li>
                )}
              </ul>
            )}
          </section>

          {/* ── Capacitación ───────────────────────────────────────────── */}
          <section className="bg-white p-6 rounded-3xl border shadow-sm">
            <SectionTitle icon={GraduationCap} title="Capacitación"
              hint="Refuerzos programados para los próximos 30 días" />
            {trainings.length === 0 ? (
              <Empty text="Sin capacitaciones por vencer." />
            ) : (
              <ul className="space-y-2.5">
                {trainings.slice(0, 12).map(t => {
                  const dias = daysUntil(t.nextDate);
                  return (
                    <li key={t.id} className="flex items-center gap-3">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', t.overdue ? 'bg-red-500' : 'bg-amber-500')} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-black text-gray-800 truncate">{t.employeeName || 'Sin nombre'}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate">{t.topic}</p>
                      </div>
                      <span className={cn(
                        'text-[9px] font-black uppercase tracking-wider shrink-0',
                        t.overdue ? 'text-red-500' : 'text-amber-600'
                      )}>
                        {t.overdue ? 'Vencida' : relDays(dias)}
                      </span>
                    </li>
                  );
                })}
                {trainings.length > 12 && (
                  <li className="text-[9px] font-black text-gray-300 uppercase tracking-wider pt-1">
                    +{trainings.length - 12} más en Capacitación
                  </li>
                )}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Piezas ─────────────────────────────────────────────────────────────────
function Tile({ icon: Icon, label, value, tone, onClick }) {
  const cls = tone === 'danger'
    ? 'text-red-500'
    : tone === 'warn' ? 'text-amber-600' : 'text-gray-900';
  return (
    <button onClick={onClick} disabled={!onClick}
      className={cn(
        'bg-white p-4 rounded-2xl border shadow-sm text-left transition-all',
        onClick && 'hover:border-gray-300 hover:shadow-md'
      )}>
      <Icon className={cn('h-4 w-4 mb-2', tone ? cls : 'text-gray-300')} />
      <p className={cn('text-2xl font-black tabular-nums leading-none', cls)}>{value}</p>
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1.5 leading-tight">
        {label}
      </p>
    </button>
  );
}

function SectionTitle({ icon: Icon, title, hint }) {
  return (
    <div className="flex items-start gap-2 mb-4">
      <Icon className="h-4 w-4 text-primary mt-0.5" />
      <div>
        <h3 className="text-[11px] font-black uppercase tracking-wider text-gray-700">{title}</h3>
        {hint && <p className="text-[10px] font-bold text-gray-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function Chip({ cls, children }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider',
      cls
    )}>
      {children}
    </span>
  );
}

function Empty({ text }) {
  return <p className="text-[11px] font-bold text-gray-300 py-8 text-center">{text}</p>;
}

// Llamar al encargado del cliente sin salir del panel.
function CallButton({ project, compact }) {
  const href = telHref(project.clientContactPhone);
  if (!href) {
    return compact ? null : (
      <span className="px-3 py-2 rounded-xl border border-dashed border-gray-200 text-[9px] font-black uppercase tracking-wider text-gray-300">
        Sin teléfono
      </span>
    );
  }
  return (
    <a href={href} title={`Llamar a ${project.clientContactName || 'el encargado'}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all',
        compact ? 'h-7 w-7 shrink-0' : 'px-3 py-2 text-[9px] font-black uppercase tracking-wider'
      )}>
      <Phone className="h-3 w-3" />
      {!compact && 'Llamar'}
    </a>
  );
}
