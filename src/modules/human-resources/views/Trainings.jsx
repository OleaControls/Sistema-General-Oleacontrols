import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GraduationCap, Plus, Search, Loader2, X, Pencil, Trash2, Upload, ExternalLink,
  CalendarClock, CheckCircle2, AlertCircle, Users,
} from 'lucide-react';
import { hrService } from '@/api/hrService';
import { otService } from '@/api/otService';
import trainingService from '@/api/trainingService';
import { ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

/* Capacitación técnica. Cada renglón es un tema impartido a un técnico con su
   temario, instructor, resultado y evidencia. Lo que de verdad se vigila es
   `nextDate`: la fecha de la próxima capacitación, que también sale en el panel
   de supervisión cuando está por vencerse. */

const RESULTADOS = {
  APROBADO:     { label: 'Aprobado',     cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  NO_APROBADO:  { label: 'No aprobado',  cls: 'bg-red-50 text-red-500 border-red-200' },
  PENDIENTE:    { label: 'Pendiente',    cls: 'bg-gray-50 text-gray-400 border-gray-200' },
};
const RESULTADO_KEYS = Object.keys(RESULTADOS);
const resultadoMeta = (r) => RESULTADOS[r] || RESULTADOS.PENDIENTE;

const fmt = (d) => (d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const DAY = 86400000;
const diasPara = (d) => {
  if (!d) return null;
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(d); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / DAY);
};

const EMPTY = {
  employeeId: '', topic: '', syllabus: '', instructor: '', date: '',
  hours: '', result: 'PENDIENTE', score: '', nextDate: '', evidenceUrl: '', notes: '',
};

export default function Trainings() {
  const [tecnicos, setTecnicos] = useState([]);
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('');       // '' | PROXIMAS | VENCIDAS | PENDIENTES
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [empleados, capacitaciones] = await Promise.all([
        hrService.getEmployees().catch(() => []),
        trainingService.list(),
      ]);
      setTecnicos((Array.isArray(empleados) ? empleados : [])
        .filter(e => e.status !== 'INACTIVE')
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es')));
      setItems(capacitaciones);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const kpis = useMemo(() => {
    const proximas = items.filter(t => {
      const d = diasPara(t.nextDate);
      return d !== null && d >= 0 && d <= 30;
    }).length;
    const vencidas = items.filter(t => {
      const d = diasPara(t.nextDate);
      return d !== null && d < 0;
    }).length;
    return {
      total: items.length,
      aprobadas: items.filter(t => t.result === 'APROBADO').length,
      pendientes: items.filter(t => t.result === 'PENDIENTE').length,
      capacitados: new Set(items.map(t => t.employeeId)).size,
      proximas,
      vencidas,
    };
  }, [items]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter(t => {
      if (q && ![t.topic, t.employee?.name, t.instructor].some(v => (v || '').toLowerCase().includes(q))) return false;
      const d = diasPara(t.nextDate);
      if (filtro === 'PROXIMAS'   && !(d !== null && d >= 0 && d <= 30)) return false;
      if (filtro === 'VENCIDAS'   && !(d !== null && d < 0)) return false;
      if (filtro === 'PENDIENTES' && t.result !== 'PENDIENTE') return false;
      return true;
    });
  }, [items, busqueda, filtro]);

  // Técnicos que todavía no tienen ninguna capacitación registrada.
  const sinCapacitar = useMemo(() => {
    const conRegistro = new Set(items.map(t => t.employeeId));
    return tecnicos.filter(t => t.roles?.includes(ROLES.TECH) && !conRegistro.has(t.id));
  }, [tecnicos, items]);

  const subirEvidencia = async (file) => {
    if (!file) return;
    setSubiendo(true);
    try {
      const dataUri = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const url = await otService.uploadLargeFile(dataUri, 'trainings');
      setForm(f => ({ ...f, evidenceUrl: url }));
    } catch (e) {
      setError('No se pudo subir la evidencia: ' + e.message);
    } finally {
      setSubiendo(false);
    }
  };

  const guardar = async () => {
    if (!form.employeeId) { setError('Elige al técnico.'); return; }
    if (!form.topic.trim()) { setError('Falta el tema.'); return; }
    setGuardando(true);
    try {
      if (form.id) await trainingService.update(form.id, form);
      else await trainingService.create(form);
      setForm(null);
      setError('');
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (t) => {
    if (!confirm(`¿Eliminar la capacitación "${t.topic}" de ${t.employee?.name || 'el técnico'}?`)) return;
    try { await trainingService.remove(t.id); await cargar(); }
    catch (e) { setError(e.message); }
  };

  if (cargando) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="w-full space-y-6">
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <header className="bg-white p-6 rounded-3xl border shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                Recursos Humanos · Sistema General
              </span>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">Capacitación</h1>
              <p className="text-[11px] font-bold text-gray-400 mt-1">
                Tema, temario, instructor, resultado, evidencia y próxima fecha
              </p>
            </div>
          </div>
          <button onClick={() => { setForm({ ...EMPTY }); setError(''); }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-all">
            <Plus className="h-3.5 w-3.5" /> Registrar capacitación
          </button>
        </div>
        {error && <p className="mt-4 text-[11px] font-black text-red-500 uppercase tracking-wider">{error}</p>}
      </header>

      {/* ── Indicadores ────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <Tile icon={GraduationCap} label="Capacitaciones" value={kpis.total} />
        <Tile icon={Users} label="Técnicos capacitados" value={kpis.capacitados} />
        <Tile icon={CheckCircle2} label="Aprobadas" value={kpis.aprobadas} />
        <Tile icon={AlertCircle} label="Pendientes" value={kpis.pendientes} tone={kpis.pendientes > 0 ? 'warn' : undefined} />
        <Tile icon={CalendarClock} label="Próximas 30 días" value={kpis.proximas} />
        <Tile icon={AlertCircle} label="Refuerzo vencido" value={kpis.vencidas} tone={kpis.vencidas > 0 ? 'danger' : undefined} />
      </div>

      {/* ── Filtros ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por técnico, tema o instructor…"
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-2xl text-[11px] font-bold text-gray-700 outline-none focus:border-primary transition-all" />
        </div>
        {[
          ['', 'Todas'],
          ['PROXIMAS', 'Próximas'],
          ['VENCIDAS', 'Vencidas'],
          ['PENDIENTES', 'Sin resultado'],
        ].map(([k, label]) => (
          <button key={k} onClick={() => setFiltro(k)}
            className={cn(
              'px-4 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-wider transition-all',
              filtro === k ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Técnicos sin registro ──────────────────────────────────────── */}
      {sinCapacitar.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">
            Técnicos sin capacitación registrada ({sinCapacitar.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {sinCapacitar.map(t => (
              <button key={t.id} onClick={() => { setForm({ ...EMPTY, employeeId: t.id }); setError(''); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-gray-300 text-[10px] font-black uppercase tracking-wider text-gray-500 hover:border-primary hover:text-primary transition-all">
                <Plus className="h-3 w-3" /> {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Listado ────────────────────────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        {visibles.length === 0 ? (
          <p className="text-[11px] font-bold text-gray-300 py-10 text-center">
            {items.length === 0 ? 'Aún no hay capacitaciones registradas.' : 'Sin resultados con este filtro.'}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-208 text-left">
              <thead>
                <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">
                  <th className="pb-2 pr-3">Técnico</th>
                  <th className="pb-2 pr-3">Tema</th>
                  <th className="pb-2 pr-3">Instructor</th>
                  <th className="pb-2 pr-3 text-center">Fecha</th>
                  <th className="pb-2 pr-3 text-center">Horas</th>
                  <th className="pb-2 pr-3 text-center">Resultado</th>
                  <th className="pb-2 pr-3 text-center">Próxima</th>
                  <th className="pb-2 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visibles.map(t => {
                  const d = diasPara(t.nextDate);
                  return (
                    <tr key={t.id} className="text-[11px] font-bold text-gray-600">
                      <td className="py-2.5 pr-3 text-gray-900 font-black">{t.employee?.name || '—'}</td>
                      <td className="py-2.5 pr-3">
                        {t.topic}
                        {t.syllabus && <span className="block text-[9px] font-bold text-gray-300 truncate max-w-64">{t.syllabus}</span>}
                      </td>
                      <td className="py-2.5 pr-3">{t.instructor || '—'}</td>
                      <td className="py-2.5 pr-3 text-center tabular-nums">{fmt(t.date)}</td>
                      <td className="py-2.5 pr-3 text-center tabular-nums">{t.hours ?? '—'}</td>
                      <td className="py-2.5 pr-3 text-center">
                        <span className={cn('px-2 py-0.5 rounded-lg border text-[9px] font-black uppercase tracking-wider', resultadoMeta(t.result).cls)}>
                          {resultadoMeta(t.result).label}
                        </span>
                        {t.score != null && <span className="block text-[9px] text-gray-400 tabular-nums mt-0.5">{t.score}</span>}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {t.nextDate ? (
                          <>
                            <span className="tabular-nums">{fmt(t.nextDate)}</span>
                            <span className={cn(
                              'block text-[9px] font-black uppercase tracking-wider',
                              d < 0 ? 'text-red-500' : d <= 30 ? 'text-amber-600' : 'text-gray-300'
                            )}>
                              {d < 0 ? `hace ${Math.abs(d)} d` : `en ${d} d`}
                            </span>
                          </>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        {t.evidenceUrl && (
                          <a href={t.evidenceUrl} target="_blank" rel="noreferrer" title="Ver constancia"
                            className="inline-block p-1 text-gray-300 hover:text-primary">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button onClick={() => setForm({
                          ...EMPTY, ...t,
                          date: t.date ? t.date.slice(0, 10) : '',
                          nextDate: t.nextDate ? t.nextDate.slice(0, 10) : '',
                          hours: t.hours ?? '', score: t.score ?? '',
                        })} className="p-1 text-gray-300 hover:text-primary" title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => borrar(t)} className="p-1 text-gray-300 hover:text-red-500" title="Eliminar">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Alta / edición ─────────────────────────────────────────────── */}
      {form && (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-7 py-5 flex items-center justify-between rounded-t-[2rem]">
              <div>
                <h2 className="text-base font-black text-gray-900 tracking-tight">
                  {form.id ? 'Editar capacitación' : 'Nueva capacitación'}
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Capacitación técnica</p>
              </div>
              <button onClick={() => setForm(null)} className="p-2.5 hover:bg-gray-100 rounded-xl">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-7 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Técnico *">
                  <select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="cap-input">
                    <option value="">— Selecciona —</option>
                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </Field>
                <Field label="Tema *">
                  <input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    className="cap-input" placeholder="Ej. Trabajos en altura" />
                </Field>
              </div>

              <Field label="Temario">
                <textarea rows={3} value={form.syllabus || ''} onChange={(e) => setForm({ ...form, syllabus: e.target.value })}
                  className="cap-input" placeholder="Puntos que cubre la capacitación" />
              </Field>

              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Instructor">
                  <input value={form.instructor || ''} onChange={(e) => setForm({ ...form, instructor: e.target.value })} className="cap-input" />
                </Field>
                <Field label="Fecha">
                  <input type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} className="cap-input" />
                </Field>
                <Field label="Duración (horas)">
                  <input type="number" min="0" step="0.5" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} className="cap-input" />
                </Field>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Resultado">
                  <select value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} className="cap-input">
                    {RESULTADO_KEYS.map(k => <option key={k} value={k}>{RESULTADOS[k].label}</option>)}
                  </select>
                </Field>
                <Field label="Calificación">
                  <input type="number" min="0" max="100" step="1" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className="cap-input" />
                </Field>
                <Field label="Próxima capacitación">
                  <input type="date" value={form.nextDate || ''} onChange={(e) => setForm({ ...form, nextDate: e.target.value })} className="cap-input" />
                </Field>
              </div>

              <Field label="Constancia / evidencia">
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[11px] font-bold text-gray-500 hover:border-primary/40 transition-all">
                    {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {subiendo ? 'Subiendo…' : (form.evidenceUrl ? 'Reemplazar archivo' : 'Seleccionar archivo')}
                    <input type="file" className="hidden" onChange={(e) => subirEvidencia(e.target.files?.[0])} />
                  </label>
                  {form.evidenceUrl && (
                    <a href={form.evidenceUrl} target="_blank" rel="noreferrer" className="p-2.5 text-primary hover:bg-primary/5 rounded-xl">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </Field>

              <Field label="Notas">
                <textarea rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="cap-input" />
              </Field>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => setForm(null)}
                  className="flex-1 py-3.5 border border-gray-200 rounded-2xl text-[11px] font-black uppercase tracking-wider text-gray-500 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={guardando}
                  className="flex-[2] py-3.5 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-wider hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <GraduationCap className="h-4 w-4" />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CapStyle />
    </div>
  );
}

function Tile({ icon: Icon, label, value, tone }) {
  const cls = tone === 'danger' ? 'text-red-500' : tone === 'warn' ? 'text-amber-600' : 'text-gray-900';
  return (
    <div className="bg-white p-4 rounded-2xl border shadow-sm">
      <Icon className={cn('h-4 w-4 mb-2', tone ? cls : 'text-gray-300')} />
      <p className={cn('text-2xl font-black tabular-nums leading-none', cls)}>{value}</p>
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1.5 leading-tight">{label}</p>
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

function CapStyle() {
  return (
    <style>{`
      .cap-input {
        width: 100%; padding: 0.65rem 0.9rem; background: #f8fafc;
        border: 1.5px solid #e5e7eb; border-radius: 0.85rem; font-size: 0.78rem;
        font-weight: 600; color: #0f172a; outline: none;
        transition: border-color .18s, background .18s;
      }
      .cap-input::placeholder { color: #94a3b8; font-weight: 500; }
      .cap-input:focus { border-color: var(--color-primary, #2563eb); background: #fff; }
    `}</style>
  );
}
