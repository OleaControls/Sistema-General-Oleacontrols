import React, { useState, useEffect } from 'react';
import {
  Award, Briefcase, Calendar, FileText, Download, User,
  Palmtree, HardHat, Mail, MapPin, Phone,
  Clock, CheckCircle2, AlertTriangle, Sparkles,
  Star, TrendingUp, Users, DollarSign, Shield, X,
  ChevronRight, ChevronLeft, BadgeCheck, Zap, Plus, ClipboardList, ChevronDown, Trash2,
  Megaphone, ClipboardCheck, CalendarDays, Wallet, XCircle, Umbrella, HeartPulse,
  Send, Loader2, Inbox, Coins, Check, ThumbsUp, ThumbsDown, LayoutGrid,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth, ROLES } from '@/store/AuthContext';
import { hrService } from '@/api/hrService';
import { cn } from '@/lib/utils';

const money = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Sistema de estilos compartido ─────────────────────────────────────────────
const CARD = 'bg-white rounded-3xl border border-slate-100 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.12)]';

function SectionHead({ icon: Icon, title, subtitle, accent = '#6366f1', bg = '#eef2ff' }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: bg }}>
        <Icon className="h-4.5 w-4.5" style={{ color: accent, width: 18, height: 18 }} />
      </div>
      <div>
        <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">{title}</h3>
        {subtitle && <p className="text-[13px] font-medium text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center py-14 px-6 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/40">
      <div className="h-14 w-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-sm">
        <Icon className="h-6 w-6 text-slate-300" />
      </div>
      <p className="text-sm font-black text-slate-800 uppercase tracking-wider">{title}</p>
      {hint && <p className="text-xs font-medium text-slate-400 max-w-xs">{hint}</p>}
    </div>
  );
}

// ── Métricas individuales ─────────────────────────────────────────────────────
const MetricsSection = ({ targetId }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/evaluations?targetId=${targetId}&days=15`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setMetrics(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [targetId]);

  if (loading) return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
    </div>
  );

  if (!metrics?.current || metrics.current.total === 0) return (
    <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-50 border border-amber-100">
      <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
        <Star className="h-5 w-5 text-amber-500" />
      </div>
      <div>
        <p className="text-xs font-black text-amber-800 uppercase tracking-wider">Sin evaluaciones recientes</p>
        <p className="text-[10px] font-bold text-amber-600 mt-0.5">No hay datos suficientes en los últimos 15 días.</p>
      </div>
    </div>
  );

  const { current } = metrics;
  const avgTotal = current.totalAvg || 0;
  let projectedBonus = 0;
  if (avgTotal >= 4.8) projectedBonus = 1500;
  else if (avgTotal >= 4.5) projectedBonus = 1000;
  else if (avgTotal >= 4.0) projectedBonus = 500;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MetricTile label="Satisfacción" value={(current.avg1 || 0).toFixed(1)} icon={Star} hex="#f59e0b" lightBg="#fffbeb" suffix="/5" />
      <MetricTile label="Liderazgo" value={(current.avg2 || 0).toFixed(1)} icon={TrendingUp} hex="#3b82f6" lightBg="#eff6ff" suffix="/5" />
      <MetricTile label="Feedbacks" value={current.total || 0} icon={Users} hex="#8b5cf6" lightBg="#f5f3ff" />
      <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)' }}>
        <div className="absolute -top-4 -right-4 h-16 w-16 rounded-full bg-white/10" />
        <DollarSign className="h-3.5 w-3.5 text-white/70 mb-2" />
        <p className="text-[22px] font-black text-white leading-none">${projectedBonus.toLocaleString()}</p>
        <p className="text-[9px] font-extrabold text-white/70 uppercase tracking-wider mt-1.5">Bono proyectado</p>
      </div>
    </div>
  );
};

function MetricTile({ label, value, icon: Icon, hex, lightBg, suffix = '' }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: lightBg }}>
      <Icon className="h-3.5 w-3.5 mb-2" style={{ color: hex }} />
      <p className="text-[22px] font-black text-slate-900 leading-none">
        {value}{suffix && <span className="text-[13px] font-bold text-slate-400">{suffix}</span>}
      </p>
      <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mt-1.5">{label}</p>
    </div>
  );
}

// ═══ COMUNICADOS ════════════════════════════════════════════════════════════════
const ANN_TYPE = {
  INFO:    { label: 'Información', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  URGENT:  { label: 'Urgente',    color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  SUCCESS: { label: 'Logro',      color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  WARNING: { label: 'Aviso',      color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
};

function AnnouncementsTab({ announcements, loading, onRead }) {
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(null);

  const handleRead = async (id) => {
    setBusy(id);
    await onRead(id);
    setBusy(null);
  };

  if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 rounded-3xl bg-white border border-slate-100 animate-pulse" />)}</div>;
  if (!announcements.length) return <EmptyState icon={Megaphone} title="Sin comunicados" hint="Cuando la empresa publique un comunicado aparecerá aquí." />;

  return (
    <div className="space-y-3">
      {announcements.map(a => {
        const meta = ANN_TYPE[a.type] || ANN_TYPE.INFO;
        const isOpen = expanded === a.id;
        return (
          <div key={a.id} className={cn(CARD, 'overflow-hidden transition-shadow', !a.readByMe && 'ring-1 ring-indigo-100')}>
            <button onClick={() => setExpanded(isOpen ? null : a.id)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50/60 transition-colors">
              <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: meta.bg }}>
                <Megaphone className="h-5 w-5" style={{ color: meta.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-slate-900 truncate">{a.title}</p>
                  {!a.readByMe && <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 animate-pulse" />}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border" style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>{meta.label}</span>
                  <span className="text-[10px] font-bold text-slate-400">{new Date(a.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  {a.requiresConfirmation && !a.readByMe && <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-600">· Requiere confirmación</span>}
                </div>
              </div>
              <ChevronDown className={cn('h-4 w-4 text-slate-300 shrink-0 transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-1 border-t border-slate-50 animate-in fade-in duration-200">
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap mt-3">{a.content}</p>
                {!a.readByMe && (
                  <button
                    onClick={() => handleRead(a.id)}
                    disabled={busy === a.id}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-60"
                  >
                    {busy === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    {a.requiresConfirmation ? 'Confirmar lectura' : 'Marcar como leído'}
                  </button>
                )}
                {a.readByMe && (
                  <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-black uppercase tracking-wider border border-emerald-100">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Leído
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══ ENCUESTAS ══════════════════════════════════════════════════════════════════
function SurveysTab({ surveys, loading, onRespond }) {
  const [openId, setOpenId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);

  const setAns = (qid, val) => setAnswers(a => ({ ...a, [qid]: val }));

  const submit = async (survey) => {
    const qs = Array.isArray(survey.questions) ? survey.questions : [];
    for (const q of qs) {
      if (answers[q.id] === undefined || answers[q.id] === '') {
        alert('Responde todas las preguntas antes de enviar.');
        return;
      }
    }
    setBusy(true);
    const ok = await onRespond(survey.id, answers);
    setBusy(false);
    if (ok) { setOpenId(null); setAnswers({}); }
  };

  if (loading) return <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-28 rounded-3xl bg-white border border-slate-100 animate-pulse" />)}</div>;

  const active = surveys.filter(s => s.status === 'ACTIVE');
  if (!active.length) return <EmptyState icon={ClipboardCheck} title="Sin encuestas activas" hint="No tienes encuestas pendientes por responder." />;

  return (
    <div className="space-y-3">
      {active.map(s => {
        const done = s.answeredByMe;
        const isOpen = openId === s.id;
        const qs = Array.isArray(s.questions) ? s.questions : [];
        return (
          <div key={s.id} className={cn(CARD, 'overflow-hidden', !done && 'ring-1 ring-violet-100')}>
            <div className="flex items-center gap-4 p-5">
              <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: done ? '#ecfdf5' : '#f5f3ff' }}>
                <ClipboardCheck className="h-5 w-5" style={{ color: done ? '#059669' : '#8b5cf6' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{s.title}</p>
                {s.description && <p className="text-[11px] font-medium text-slate-400 truncate mt-0.5">{s.description}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  {s.anonymous && <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-0.5 rounded-md bg-slate-100">Anónima</span>}
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{qs.length} preguntas</span>
                </div>
              </div>
              {done ? (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Respondida
                </span>
              ) : (
                <button
                  onClick={() => { setOpenId(isOpen ? null : s.id); setAnswers({}); }}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-[11px] font-black uppercase tracking-wider hover:bg-violet-700 transition-colors"
                >
                  {isOpen ? 'Cerrar' : 'Responder'}
                </button>
              )}
            </div>

            {isOpen && !done && (
              <div className="px-5 pb-5 pt-2 border-t border-slate-50 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                {qs.map((q, i) => (
                  <div key={q.id || i} className="space-y-2.5">
                    <p className="text-[13px] font-black text-slate-800">{i + 1}. {q.text}</p>

                    {q.type === 'RATING' && (
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(v => (
                          <button key={v} type="button" onClick={() => setAns(q.id, v)}
                            className={cn('h-11 w-11 rounded-xl border-2 flex items-center justify-center text-sm font-black transition-all',
                              answers[q.id] === v ? 'bg-amber-400 border-amber-400 text-white scale-105' : 'bg-white border-slate-200 text-slate-400 hover:border-amber-300')}>
                            {v}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === 'YESNO' && (
                      <div className="flex gap-2">
                        {[{ v: 'Sí', icon: ThumbsUp }, { v: 'No', icon: ThumbsDown }].map(({ v, icon: Ic }) => (
                          <button key={v} type="button" onClick={() => setAns(q.id, v)}
                            className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all',
                              answers[q.id] === v ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300')}>
                            <Ic className="h-4 w-4" /> {v}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === 'TEXT' && (
                      <textarea rows={2} value={answers[q.id] || ''} onChange={e => setAns(q.id, e.target.value)}
                        placeholder="Tu respuesta…"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all resize-none" />
                    )}

                    {q.type === 'MULTIPLE' && (
                      <div className="flex flex-col gap-2">
                        {(q.options || []).map(opt => (
                          <button key={opt} type="button" onClick={() => setAns(q.id, opt)}
                            className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-bold text-left transition-all',
                              answers[q.id] === opt ? 'bg-violet-50 border-violet-500 text-violet-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300')}>
                            <span className={cn('h-4 w-4 rounded-full border-2 shrink-0', answers[q.id] === opt ? 'border-violet-500 bg-violet-500' : 'border-slate-300')} />
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={() => submit(s)} disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-violet-500/20 hover:opacity-95 transition-opacity disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Enviar respuestas
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══ ASISTENCIA ═════════════════════════════════════════════════════════════════
const ATT_TYPES = {
  PRESENT:    { label: 'Asistencia',  color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: CheckCircle2 },
  ABSENT:     { label: 'Falta',       color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: XCircle },
  LATE:       { label: 'Retardo',     color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: Clock },
  PERMISSION: { label: 'Permiso',     color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: Umbrella },
  MEDICAL:    { label: 'Incapacidad', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', icon: HeartPulse },
  HOLIDAY:    { label: 'Vacaciones',  color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: Palmtree },
};

function AttendanceTab({ employeeId }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { month: d.getMonth() + 1, year: d.getFullYear() }; });
  const [data, setData] = useState({ records: [], summary: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    apiFetch(`/api/attendance?employeeId=${employeeId}&month=${cursor.month}&year=${cursor.year}`)
      .then(r => r.ok ? r.json() : { records: [], summary: {} })
      .then(d => setData(d))
      .catch(() => setData({ records: [], summary: {} }))
      .finally(() => setLoading(false));
  }, [employeeId, cursor]);

  const move = (delta) => setCursor(c => {
    let m = c.month + delta, y = c.year;
    if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
    return { month: m, year: y };
  });

  const monthLabel = new Date(cursor.year, cursor.month - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const { records, summary } = data;

  return (
    <div className="space-y-5">
      {/* Selector de mes */}
      <div className="flex items-center justify-between">
        <SectionHead icon={CalendarDays} title="Mi Asistencia" subtitle="Historial mensual de incidencias" accent="#0891b2" bg="#ecfeff" />
        <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-100 p-1 shadow-sm">
          <button onClick={() => move(-1)} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-[11px] font-black text-slate-700 tracking-wider capitalize px-2 min-w-[130px] text-center">{monthLabel}</span>
          <button onClick={() => move(1)} className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-colors"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {Object.entries(ATT_TYPES).map(([key, cfg]) => (
          <div key={key} className="rounded-2xl p-4 border" style={{ background: cfg.bg, borderColor: cfg.border }}>
            <cfg.icon className="h-4 w-4 mb-2" style={{ color: cfg.color }} />
            <p className="text-2xl font-black leading-none" style={{ color: cfg.color }}>{summary[key] || 0}</p>
            <p className="text-[9px] font-extrabold uppercase tracking-wider mt-1 opacity-70" style={{ color: cfg.color }}>{cfg.label}</p>
          </div>
        ))}
      </div>

      {summary.totalMinutesLate > 0 && (
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-amber-50 border border-amber-100">
          <Clock className="h-4 w-4 text-amber-600" />
          <p className="text-[13px] font-bold text-amber-800">Acumulaste <span className="font-black">{summary.totalMinutesLate} min</span> de retardo este mes.</p>
        </div>
      )}

      {/* Registros */}
      <div className={cn(CARD, 'p-5')}>
        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-4">Registros del mes</h4>
        {loading ? (
          <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-slate-50 animate-pulse" />)}</div>
        ) : !records.length ? (
          <EmptyState icon={CalendarDays} title="Sin registros" hint="No hay incidencias registradas en este mes." />
        ) : (
          <div className="space-y-2">
            {records.map(r => {
              const cfg = ATT_TYPES[r.type] || ATT_TYPES.PRESENT;
              return (
                <div key={r.id} className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-50/70 border border-slate-100">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
                    <cfg.icon className="h-4 w-4" style={{ color: cfg.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-black text-slate-800">
                      {new Date(r.date).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </p>
                    {r.notes && <p className="text-[11px] font-medium text-slate-400 truncate">{r.notes}</p>}
                  </div>
                  {(r.checkIn || r.checkOut) && (
                    <p className="text-[10px] font-mono font-bold text-slate-400 shrink-0 hidden sm:block">{r.checkIn || '—'} → {r.checkOut || '—'}</p>
                  )}
                  {r.minutesLate ? <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md shrink-0">+{r.minutesLate}m</span> : null}
                  <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border shrink-0" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ NÓMINA ═════════════════════════════════════════════════════════════════════
const PAY_STATUS = {
  APPROVED: { label: 'Aprobada', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  PAID:     { label: 'Pagada',   color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
};

function PayrollTab({ employeeId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    if (!employeeId) return;
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/payroll');
        const { periods = [] } = res.ok ? await res.json() : {};
        // Solo períodos visibles al empleado (no borradores)
        const visible = periods.filter(p => p.status === 'APPROVED' || p.status === 'PAID');
        const details = await Promise.all(visible.map(p =>
          apiFetch(`/api/payroll?id=${p.id}`).then(r => r.ok ? r.json() : null).catch(() => null)
        ));
        const rows = details.flatMap(period => {
          if (!period?.items) return [];
          const item = period.items.find(it => it.employeeId === employeeId);
          return item ? [{ period, item }] : [];
        });
        setEntries(rows);
      } catch { setEntries([]); }
      finally { setLoading(false); }
    })();
  }, [employeeId]);

  if (loading) return <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 rounded-3xl bg-white border border-slate-100 animate-pulse" />)}</div>;
  if (!entries.length) return <EmptyState icon={Wallet} title="Sin recibos disponibles" hint="Tus recibos de nómina aparecerán aquí una vez que RH publique el período." />;

  return (
    <div className="space-y-3">
      {entries.map(({ period, item }) => {
        const st = PAY_STATUS[period.status] || PAY_STATUS.APPROVED;
        const isOpen = openId === period.id;
        return (
          <div key={period.id} className={cn(CARD, 'overflow-hidden')}>
            <button onClick={() => setOpenId(isOpen ? null : period.id)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50/60 transition-colors">
              <div className="h-11 w-11 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                <Coins className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{period.name}</p>
                <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                  {new Date(period.startDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} → {new Date(period.endDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-slate-900 leading-none">{money(item.netPay)}</p>
                <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border" style={{ color: st.color, background: st.bg, borderColor: st.border }}>{st.label}</span>
              </div>
              <ChevronDown className={cn('h-4 w-4 text-slate-300 shrink-0 transition-transform', isOpen && 'rotate-180')} />
            </button>

            {isOpen && (
              <div className="px-5 pb-5 pt-1 border-t border-slate-50 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
                  {/* Percepciones */}
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Percepciones</p>
                    <div className="space-y-2">
                      <Row label="Sueldo base" value={money(item.baseSalary)} />
                      {item.overtimeHours > 0 && <Row label={`Horas extra (${item.overtimeHours}h)`} value={money(item.overtimePay)} />}
                      {item.bonusTotal > 0 && <Row label="Bonos" value={money(item.bonusTotal)} />}
                      <Row label="Total percepciones" value={money(item.grossPay)} strong />
                    </div>
                  </div>
                  {/* Deducciones */}
                  <div>
                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-3">Deducciones</p>
                    <div className="space-y-2">
                      <Row label="IMSS" value={money(item.imss)} />
                      <Row label="ISR" value={money(item.isr)} />
                      {item.absenceDays > 0 && <Row label={`Faltas (${item.absenceDays}d)`} value={money(item.absenceDeduct)} />}
                      <Row label="Total deducciones" value={money(item.totalDeductions)} strong />
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between px-5 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600">
                  <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">Neto a pagar</span>
                  <span className="text-2xl font-black text-white">{money(item.netPay)}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Row({ label, value, strong }) {
  return (
    <div className={cn('flex items-center justify-between py-1.5', strong && 'border-t border-slate-100 pt-2.5 mt-1')}>
      <span className={cn('text-[13px]', strong ? 'font-black text-slate-800' : 'font-medium text-slate-500')}>{label}</span>
      <span className={cn('text-[13px] font-mono', strong ? 'font-black text-slate-900' : 'font-bold text-slate-600')}>{value}</span>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  PENDING:  { bg: '#fffbeb', text: '#d97706', label: 'Pendiente' },
  APPROVED: { bg: '#ecfdf5', text: '#059669', label: 'Aprobado' },
  REJECTED: { bg: '#fff1f2', text: '#e11d48', label: 'Rechazado' },
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function MyProfile() {
  const { user, updateUser } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [vacationInfo, setVacationInfo] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [isUploading, setIsUploading] = useState(false);
  const [reglamento, setReglamento] = useState(null);
  const [loadingReglamento, setLoadingReglamento] = useState(true);
  const [isUploadingReglamento, setIsUploadingReglamento] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Comunicados y encuestas (para badges + pestañas)
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnn, setLoadingAnn] = useState(true);
  const [surveys, setSurveys] = useState([]);
  const [loadingSurveys, setLoadingSurveys] = useState(true);

  // Auditoría
  const emptyItems = (n) => Array.from({ length: n }, () => ({ desc: '' }));
  const [audits, setAudits] = useState([]);
  const [loadingAudits, setLoadingAudits] = useState(true);
  const [showAuditForm, setShowAuditForm] = useState(false);
  const [isSavingAudit, setIsSavingAudit] = useState(false);
  const [expandedAudit, setExpandedAudit] = useState(null);
  const [auditForm, setAuditForm] = useState({
    projectName: '', auditDate: '', isLeader: false, actionArea: '',
    didWell: emptyItems(3), didPoor: emptyItems(2), improvements: emptyItems(2),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '', endDate: '', days: '', reason: '', type: 'ANNUAL',
  });

  useEffect(() => {
    (async () => {
      const allEmployees = await hrService.getEmployees();
      const emp = allEmployees.find(e => e.email === user.email || e.id === user.id);
      if (emp) {
        const [details, vInfo, assetList] = await Promise.all([
          hrService.getEmployeeDetail(emp.id),
          hrService.getVacationStatus(emp.id).catch(() => null),
          hrService.getAssets(emp.id).catch(() => []),
        ]);
        setEmployee(details);
        setVacationInfo(vInfo);
        setAssets(assetList);
      } else {
        setEmployee({ ...user });
      }
      setLoading(false);
    })();
  }, [user]);

  // Reglamento
  useEffect(() => {
    apiFetch('/api/config?key=REGLAMENTO')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.url) setReglamento(data); })
      .catch(() => {})
      .finally(() => setLoadingReglamento(false));
  }, []);

  // Auditorías
  useEffect(() => {
    if (!employee?.id) return;
    apiFetch(`/api/personal-audits?employeeId=${employee.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setAudits(data))
      .catch(() => {})
      .finally(() => setLoadingAudits(false));
  }, [employee?.id]);

  // Comunicados + Encuestas (personal: por employeeId)
  useEffect(() => {
    if (!employee?.id) return;
    apiFetch(`/api/announcements?employeeId=${employee.id}`)
      .then(r => r.ok ? r.json() : { announcements: [] })
      .then(d => setAnnouncements(Array.isArray(d.announcements) ? d.announcements : []))
      .catch(() => {})
      .finally(() => setLoadingAnn(false));
    apiFetch(`/api/surveys?employeeId=${employee.id}`)
      .then(r => r.ok ? r.json() : { surveys: [] })
      .then(d => setSurveys(Array.isArray(d.surveys) ? d.surveys : []))
      .catch(() => {})
      .finally(() => setLoadingSurveys(false));
  }, [employee?.id]);

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const diff = Math.ceil(Math.abs(new Date(formData.endDate) - new Date(formData.startDate)) / 86400000) + 1;
      if (!isNaN(diff) && diff > 0) setFormData(p => ({ ...p, days: diff.toString() }));
    }
  }, [formData.startDate, formData.endDate]);

  const markAnnouncementRead = async (id) => {
    try {
      const res = await apiFetch('/api/announcements?action=read', {
        method: 'POST',
        body: JSON.stringify({ announcementId: id, employeeId: employee.id }),
      });
      if (res.ok) setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, readByMe: true, readCount: (a.readCount || 0) + 1 } : a));
    } catch { /* noop */ }
  };

  const submitSurvey = async (surveyId, answers) => {
    try {
      const res = await apiFetch('/api/surveys?action=respond', {
        method: 'POST',
        body: JSON.stringify({ surveyId, employeeId: employee.id, answers }),
      });
      if (!res.ok) { alert('No se pudo enviar la encuesta.'); return false; }
      setSurveys(prev => prev.map(s => s.id === surveyId ? { ...s, answeredByMe: true } : s));
      return true;
    } catch { alert('Error de red al enviar la encuesta.'); return false; }
  };

  const handleVacationRequest = async (e) => {
    e.preventDefault();
    if (!employee?.id || isSubmitting) return;
    const requested = parseInt(formData.days);
    if (requested > (vacationInfo?.vacationBalance || 0)) {
      alert(`No puedes solicitar ${requested} días. Tu saldo es ${vacationInfo?.vacationBalance} días.`);
      return;
    }
    setIsSubmitting(true);
    try {
      await hrService.requestVacation({ ...formData, employeeId: employee.id });
      setShowRequestModal(false);
      setFormData({ startDate: '', endDate: '', days: '', reason: '', type: 'ANNUAL' });
      alert('Solicitud enviada exitosamente.');
      const vInfo = await hrService.getVacationStatus(employee.id);
      setVacationInfo(vInfo);
    } catch (err) {
      alert('Error al enviar: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canManageReglamento = user.role === ROLES.ADMIN || user.role === ROLES.HR;

  const handleReglamentoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('El archivo no debe superar 20 MB.'); return; }
    setIsUploadingReglamento(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const uploadRes = await apiFetch('/api/upload', {
          method: 'POST',
          body: JSON.stringify({ file: reader.result, folder: 'reglamento' }),
        });
        if (!uploadRes.ok) throw new Error('Error al subir el archivo');
        const { url } = await uploadRes.json();
        const meta = { url, name: file.name, uploadedAt: new Date().toISOString(), uploadedBy: user.name };
        const configRes = await apiFetch('/api/config', {
          method: 'POST',
          body: JSON.stringify({ key: 'REGLAMENTO', value: meta }),
        });
        if (!configRes.ok) throw new Error('Error al guardar la configuración');
        setReglamento(meta);
        setIsUploadingReglamento(false);
      };
    } catch (err) {
      alert('Error: ' + err.message);
      setIsUploadingReglamento(false);
    }
  };

  const handleSaveAudit = async (e) => {
    e.preventDefault();
    if (isSavingAudit) return;
    setIsSavingAudit(true);
    try {
      const payload = {
        employeeId: employee.id,
        projectName: auditForm.projectName,
        auditDate: auditForm.auditDate,
        isLeader: auditForm.isLeader,
        actionArea: auditForm.actionArea,
        didWell: auditForm.didWell.flatMap(i => i.desc ? [i.desc] : []),
        didPoor: auditForm.didPoor.flatMap(i => i.desc ? [i.desc] : []),
        improvements: auditForm.improvements.flatMap(i => i.desc ? [i.desc] : []),
      };
      const res = await apiFetch('/api/personal-audits', { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Error al guardar');
      }
      const saved = await res.json();
      setAudits(prev => [saved, ...prev]);
      setShowAuditForm(false);
      setAuditForm({
        projectName: '', auditDate: '', isLeader: false, actionArea: '',
        didWell: emptyItems(3), didPoor: emptyItems(2), improvements: emptyItems(2),
      });
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsSavingAudit(false);
    }
  };

  const handleDeleteAudit = async (id) => {
    if (!confirm('¿Eliminar esta auditoría? Esta acción no se puede deshacer.')) return;
    setAudits(prev => prev.filter(a => a.id !== id));
    try {
      await apiFetch(`/api/personal-audits?id=${id}`, { method: 'DELETE' });
    } catch {
      const r = await apiFetch(`/api/personal-audits?employeeId=${employee.id}`);
      if (r.ok) setAudits(await r.json());
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Máximo 5 MB.'); return; }
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const res = await apiFetch('/api/employees', {
          method: 'PUT',
          body: JSON.stringify({ id: employee.id, avatar: reader.result }),
        });
        if (!res.ok) throw new Error();
        const updated = await res.json();
        setEmployee(p => ({ ...p, avatar: updated.avatar }));
        updateUser({ id: employee.id, avatar: updated.avatar });
        setIsUploading(false);
      };
    } catch {
      alert('No se pudo actualizar la foto.');
      setIsUploading(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando perfil…</p>
    </div>
  );

  const isCollaborator = user.role === ROLES.COLLABORATOR;
  const roleLabel = {
    [ROLES.ADMIN]: 'Administrador', [ROLES.OPS]: 'Operaciones',
    [ROLES.TECH]: 'Técnico', [ROLES.HR]: 'Recursos Humanos',
    [ROLES.SALES]: 'Ventas', [ROLES.COLLABORATOR]: 'Colaborador',
  }[user.role] || user.role;

  const vacBalance = vacationInfo?.vacationBalance ?? 0;
  const vacPending = vacationInfo?.vacationRequests?.filter(r => r.status === 'PENDING').length ?? 0;
  const vacRenewal = vacationInfo?.vacationLastRenewal
    ? new Date(vacationInfo.vacationLastRenewal).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'No registrada';

  const unreadAnn = announcements.filter(a => !a.readByMe).length;
  const pendingSurveys = surveys.filter(s => s.status === 'ACTIVE' && !s.answeredByMe).length;

  const PROFILE_TABS = [
    { id: 'OVERVIEW', label: 'Resumen', icon: LayoutGrid },
    { id: 'ANNOUNCEMENTS', label: 'Comunicados', icon: Megaphone, badge: unreadAnn },
    { id: 'SURVEYS', label: 'Encuestas', icon: ClipboardCheck, badge: pendingSurveys },
    { id: 'ATTENDANCE', label: 'Asistencia', icon: CalendarDays },
    { id: 'TIMEOFF', label: 'Tiempo libre', icon: Palmtree, badge: vacPending },
    { id: 'PAYROLL', label: 'Nómina', icon: Wallet },
    { id: 'ASSETS', label: 'Equipamiento', icon: HardHat },
    { id: 'REGLAMENTO', label: 'Reglamento', icon: Shield },
    { id: 'AUDITORIA', label: 'Auditoría', icon: ClipboardList },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-16 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-[288px_1fr] gap-6 items-start">

        {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-4 space-y-4">

          {/* Tarjeta de identidad */}
          <div className="relative overflow-hidden rounded-3xl" style={{ background: 'linear-gradient(160deg, #0b1220 0%, #17233b 55%, #0d1e33 100%)' }}>
            <div className="absolute inset-0 pointer-events-none opacity-50" style={{ backgroundImage: 'radial-gradient(circle at 25% 0%, rgba(99,102,241,0.35), transparent 45%), radial-gradient(circle at 100% 100%, rgba(14,165,233,0.25), transparent 50%)' }} />
            <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '38px 38px' }} />

            <div className="relative p-6 flex flex-col items-center text-center">
              {/* Avatar */}
              <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-input').click()}>
                <div className="relative overflow-hidden" style={{ width: 104, height: 104, borderRadius: 28, border: '3px solid rgba(255,255,255,0.14)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                  <img src={employee.avatar} alt={employee.name}
                    className={cn('w-full h-full object-cover', isUploading ? 'opacity-40 blur-sm' : 'group-hover:scale-105 transition-transform duration-300')} />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-400 border-[3px] border-slate-900" />
                <input id="avatar-input" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={isUploading} />
              </div>

              <h1 className="text-lg font-black text-slate-50 leading-tight tracking-tight mt-4">{employee.name}</h1>
              <p className="text-[11px] text-slate-400 font-semibold mt-1 break-all">{employee.email}</p>

              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                <span className="text-[9px] font-extrabold uppercase tracking-wider rounded-full px-2.5 py-1" style={{ color: '#93c5fd', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)' }}>{roleLabel}</span>
                {employee.department && (
                  <span className="text-[9px] font-extrabold uppercase tracking-wider rounded-full px-2.5 py-1" style={{ color: '#a78bfa', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>{employee.department}</span>
                )}
                <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider rounded-full px-2.5 py-1" style={{ color: '#6ee7b7', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <CheckCircle2 className="h-2.5 w-2.5" /> Activo
                </span>
              </div>

              {/* Mini stats */}
              <div className="grid grid-cols-3 gap-2 w-full mt-5">
                {[
                  { label: 'Vacac.', value: vacBalance, color: '#34d399' },
                  { label: 'Activos', value: assets.length, color: '#60a5fa' },
                  { label: 'Pend.', value: unreadAnn + pendingSurveys, color: '#c084fc' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl py-2.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p className="text-lg font-black text-slate-50 leading-none" style={{ color }}>{value}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Navegación vertical */}
          <nav className={cn(CARD, 'p-2 flex lg:flex-col gap-1 overflow-x-auto')}>
            {PROFILE_TABS.map(tab => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={cn('group relative shrink-0 flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-all',
                    active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800')}>
                  <span className={cn('h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                    active ? 'bg-white/15' : 'bg-slate-100 group-hover:bg-slate-200')}>
                    <tab.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-[11px] font-black uppercase tracking-wide whitespace-nowrap">{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className={cn('inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black shrink-0',
                      active ? 'bg-white text-slate-900' : 'bg-rose-500 text-white')}>{tab.badge}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── CONTENIDO ───────────────────────────────────────────────────── */}
        <main className="min-w-0 space-y-6">

      {/* ═══ RESUMEN ═══ */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in slide-in-from-bottom-3 duration-400">
          {/* Columna izquierda */}
          <div className="space-y-5">
            {/* Contacto */}
            <div className={cn(CARD, 'p-6 space-y-5')}>
              <SectionHead icon={Phone} title="Contacto" subtitle="Datos de tu expediente" accent="#3b82f6" bg="#eff6ff" />
              <div className="space-y-4">
                {[
                  { label: 'ID Empleado', value: employee.id || 'TEMP-USER', icon: BadgeCheck, color: '#6366f1' },
                  { label: 'Email', value: employee.email, icon: Mail, color: '#3b82f6' },
                  { label: 'Teléfono', value: employee.phone || '—', icon: Phone, color: '#0ea5e9' },
                  { label: 'Ubicación', value: employee.location || '—', icon: MapPin, color: '#14b8a6' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}14` }}>
                      <Icon className="h-3.5 w-3.5" style={{ color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">{label}</p>
                      <p className="text-[13px] font-bold text-slate-900 truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Antigüedad */}
            <div className={cn(CARD, 'p-6 space-y-4')}>
              <SectionHead icon={Calendar} title="Antigüedad" accent="#059669" bg="#ecfdf5" />
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Fecha de Ingreso</p>
                <p className="text-lg font-black text-slate-900 mt-1">{employee.joinDate || '—'}</p>
              </div>
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-[11px] font-extrabold uppercase tracking-wide">Expediente completo</span>
              </div>
            </div>

            {/* Insignias */}
            {!isCollaborator && employee.certifications?.length > 0 && (
              <div className={cn(CARD, 'p-6 space-y-4')}>
                <SectionHead icon={Award} title="Mis Insignias" accent="#f59e0b" bg="#fffbeb" />
                <div className="flex flex-wrap gap-2">
                  {employee.certifications.map(c => (
                    <div key={c.id} title={c.name} className="h-11 w-11 rounded-2xl flex items-center justify-center" style={{ background: '#fffbeb', border: '1px solid #fef3c7' }}>
                      <Award className="h-5 w-5" style={{ color: '#f59e0b' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-5">
            {/* Bienvenida + pendientes */}
            <div className="relative overflow-hidden rounded-3xl p-7" style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)', border: '1px solid #e0e7ff' }}>
              <div className="absolute -right-5 -top-5 opacity-10 pointer-events-none"><Sparkles className="h-24 w-24 text-indigo-500" /></div>
              <p className="text-[11px] font-extrabold text-indigo-500 uppercase tracking-wider mb-1.5">Bienvenido de vuelta</p>
              <h2 className="text-2xl font-black text-indigo-950 leading-tight">Hola, {employee.name?.split(' ')[0]}</h2>
              <p className="text-[13px] font-semibold text-indigo-500/70 mt-2">Gestiona tus comunicados, encuestas, nómina y solicitudes desde aquí.</p>
              {(unreadAnn > 0 || pendingSurveys > 0) && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {unreadAnn > 0 && (
                    <button onClick={() => setActiveTab('ANNOUNCEMENTS')} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-indigo-100 text-[11px] font-black text-indigo-700 shadow-sm hover:shadow transition-shadow">
                      <Megaphone className="h-3.5 w-3.5" /> {unreadAnn} comunicado{unreadAnn > 1 ? 's' : ''} sin leer <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                  {pendingSurveys > 0 && (
                    <button onClick={() => setActiveTab('SURVEYS')} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-violet-100 text-[11px] font-black text-violet-700 shadow-sm hover:shadow transition-shadow">
                      <ClipboardCheck className="h-3.5 w-3.5" /> {pendingSurveys} encuesta{pendingSurveys > 1 ? 's' : ''} pendiente{pendingSurveys > 1 ? 's' : ''} <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Métricas */}
            {(user.role === ROLES.TECH || user.role === ROLES.OPS || user.role === ROLES.SALES) && (
              <div className={cn(CARD, 'p-6 space-y-4')}>
                <SectionHead icon={Zap} title="Mi Desempeño" subtitle="Últimos 15 días" accent="#8b5cf6" bg="#f5f3ff" />
                <MetricsSection targetId={user.id} />
              </div>
            )}

            {/* Vacaciones resumen */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', border: '1px solid #a7f3d0' }}>
                <Palmtree className="h-4.5 w-4.5 mb-2" style={{ color: '#059669', width: 18, height: 18 }} />
                <p className="text-[32px] font-black leading-none" style={{ color: '#064e3b' }}>{vacBalance}</p>
                <p className="text-[10px] font-extrabold uppercase tracking-wider mt-1.5" style={{ color: '#6ee7b7' }}>Días disponibles</p>
                <div className="h-1 bg-black/10 rounded-full mt-3 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (vacBalance / 20) * 100)}%`, background: '#059669' }} />
                </div>
              </div>
              <div className="rounded-3xl p-6" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe' }}>
                <Clock className="h-4.5 w-4.5 mb-2" style={{ color: '#2563eb', width: 18, height: 18 }} />
                <p className="text-[32px] font-black leading-none" style={{ color: '#1e3a8a' }}>{vacPending}</p>
                <p className="text-[10px] font-extrabold uppercase tracking-wider mt-1.5" style={{ color: '#93c5fd' }}>Solicitudes pendientes</p>
                <button onClick={() => setActiveTab('TIMEOFF')} className="inline-flex items-center gap-1 mt-3 text-[9px] font-extrabold uppercase tracking-wider text-blue-500">
                  Ver solicitudes <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ COMUNICADOS ═══ */}
      {activeTab === 'ANNOUNCEMENTS' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400">
          <SectionHead icon={Megaphone} title="Comunicados" subtitle="Avisos y noticias de la empresa" accent="#2563eb" bg="#eff6ff" />
          <AnnouncementsTab announcements={announcements} loading={loadingAnn} onRead={markAnnouncementRead} />
        </div>
      )}

      {/* ═══ ENCUESTAS ═══ */}
      {activeTab === 'SURVEYS' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400">
          <SectionHead icon={ClipboardCheck} title="Encuestas" subtitle="Tu opinión ayuda a mejorar" accent="#8b5cf6" bg="#f5f3ff" />
          <SurveysTab surveys={surveys} loading={loadingSurveys} onRespond={submitSurvey} />
        </div>
      )}

      {/* ═══ ASISTENCIA ═══ */}
      {activeTab === 'ATTENDANCE' && (
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-400">
          <AttendanceTab employeeId={employee?.id} />
        </div>
      )}

      {/* ═══ NÓMINA ═══ */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400">
          <SectionHead icon={Wallet} title="Mi Nómina" subtitle="Recibos y desglose de pagos" accent="#059669" bg="#ecfdf5" />
          <PayrollTab employeeId={employee?.id} />
        </div>
      )}

      {/* ═══ TIEMPO LIBRE ═══ */}
      {activeTab === 'TIMEOFF' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <SectionHead icon={Palmtree} title="Tiempo Libre" subtitle="Saldos y solicitudes de vacaciones y permisos" accent="#059669" bg="#ecfdf5" />
            <button onClick={() => setShowRequestModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-slate-900/15 shrink-0"
              style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
              <Palmtree className="h-3.5 w-3.5" /> Nueva Solicitud
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Días disponibles', value: vacBalance, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', icon: Palmtree },
              { label: 'Solicitudes en proceso', value: vacPending, color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: Clock },
              { label: 'Última renovación', value: vacRenewal, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: Calendar, small: true },
            ].map(({ label, value, color, bg, border, icon: Icon, small }) => (
              <div key={label} className="rounded-3xl p-6" style={{ background: bg, border: `1px solid ${border}` }}>
                <Icon className="h-4 w-4 mb-2.5" style={{ color }} />
                <p className="font-black text-slate-900 leading-none" style={{ fontSize: small ? 16 : 32 }}>{value}</p>
                <p className="text-[9px] font-extrabold uppercase tracking-wider mt-1.5 opacity-80" style={{ color }}>{label}</p>
                {!small && (
                  <div className="h-1 bg-black/10 rounded-full mt-3 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (vacBalance / 20) * 100)}%`, background: color }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={cn(CARD, 'p-6 space-y-4')}>
            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Mis Solicitudes</h4>
            {vacationInfo?.vacationRequests?.length > 0 ? (
              <div className="space-y-3">
                {vacationInfo.vacationRequests.map((req, i) => {
                  const s = STATUS_STYLES[req.status] || STATUS_STYLES.PENDING;
                  return (
                    <div key={i} className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
                      <div className="flex items-center gap-3.5">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: s.bg }}>
                          <Palmtree className="h-4.5 w-4.5" style={{ color: s.text, width: 18, height: 18 }} />
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-slate-900">
                            {req.type === 'ANNUAL' ? 'Vacaciones' : req.type === 'PERSONAL' ? 'Permiso Personal' : 'Incapacidad'} · {req.days} días
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                            {new Date(req.startDate).toLocaleDateString('es-MX')} → {new Date(req.endDate).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider rounded-full px-3 py-1" style={{ color: s.text, background: s.bg, border: `1px solid ${s.text}30` }}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Palmtree} title="Sin solicitudes" hint="No has registrado solicitudes de tiempo libre." />
            )}
          </div>
        </div>
      )}

      {/* ═══ EQUIPAMIENTO ═══ */}
      {activeTab === 'ASSETS' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400">
          <SectionHead icon={HardHat} title="Equipamiento y EPP" subtitle="Activos asignados bajo tu resguardo" accent="#059669" bg="#ecfdf5" />
          {assets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assets.map(asset => (
                <div key={asset.id} className={cn(CARD, 'p-5 flex items-center justify-between hover:shadow-md transition-shadow')}>
                  <div className="flex items-center gap-3.5">
                    <div className="h-11 w-11 rounded-2xl flex items-center justify-center" style={{ background: '#f0fdf4' }}>
                      {asset.category === 'EPP' ? <HardHat className="h-5 w-5 text-emerald-600" /> : <Briefcase className="h-5 w-5 text-emerald-600" />}
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-slate-900">{asset.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{asset.category} · S/N: {asset.serialNumber || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] font-extrabold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">Asignado</span>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{new Date(asset.assignedDate).toLocaleDateString('es-MX')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Briefcase} title="Sin activos asignados" hint="No tienes herramientas ni EPP registrados bajo tu responsabilidad." />
          )}
        </div>
      )}

      {/* ═══ REGLAMENTO ═══ */}
      {activeTab === 'REGLAMENTO' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400">
          <SectionHead icon={Shield} title="Reglamento Interno" subtitle="Políticas y normas oficiales de la empresa" accent="#0f172a" bg="#f1f5f9" />
          {loadingReglamento ? (
            <div className="h-48 rounded-3xl bg-white border border-slate-100 animate-pulse" />
          ) : reglamento ? (
            <div className={cn(CARD, 'overflow-hidden')}>
              <div className="flex items-center gap-6 p-8" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
                <div className="h-16 w-16 rounded-3xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Shield className="h-7 w-7" style={{ color: '#93c5fd' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Documento Vigente</p>
                  <p className="text-lg font-black text-slate-50 truncate">{reglamento.name}</p>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Subido por <span className="text-slate-300 font-bold">{reglamento.uploadedBy}</span> · {new Date(reglamento.uploadedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="p-6 flex flex-col sm:flex-row gap-3">
                <a href={reglamento.url} target="_blank" rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-opacity hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 4px 20px rgba(37,99,235,0.25)' }}>
                  <FileText className="h-4 w-4" /> Ver Reglamento
                </a>
                <a href={reglamento.url} download
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest text-slate-600 bg-slate-50 border border-slate-200 transition-colors hover:bg-slate-100">
                  <Download className="h-4 w-4" /> Descargar PDF
                </a>
              </div>
              {canManageReglamento && (
                <div className="px-6 pb-6">
                  <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-dashed border-slate-200 px-6 py-5">
                    <div>
                      <p className="text-[13px] font-black text-slate-900">Reemplazar documento</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">PDF · máximo 20 MB</p>
                    </div>
                    <label className={cn(isUploadingReglamento ? 'cursor-not-allowed' : 'cursor-pointer')}>
                      <input type="file" accept=".pdf" className="hidden" disabled={isUploadingReglamento} onChange={handleReglamentoUpload} />
                      <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-[11px] font-black uppercase tracking-wider" style={{ background: isUploadingReglamento ? '#94a3b8' : '#0f172a' }}>
                        {isUploadingReglamento ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Subiendo…</> : <><Zap className="h-3.5 w-3.5" /> Subir nuevo</>}
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={cn(CARD, 'flex flex-col items-center gap-4 text-center px-9 py-14')}>
              <div className="h-18 w-18 rounded-3xl bg-slate-100 flex items-center justify-center" style={{ width: 72, height: 72 }}>
                <Shield className="h-8 w-8 text-slate-400" />
              </div>
              <div>
                <p className="text-base font-black text-slate-900">Sin reglamento publicado</p>
                <p className="text-[13px] text-slate-400 mt-1 max-w-sm">
                  {canManageReglamento ? 'Sube el reglamento interno para que todos los colaboradores puedan consultarlo.' : 'El equipo de administración aún no ha publicado el reglamento.'}
                </p>
              </div>
              {canManageReglamento && (
                <label className={cn('mt-2', isUploadingReglamento ? 'cursor-not-allowed' : 'cursor-pointer')}>
                  <input type="file" accept=".pdf" className="hidden" disabled={isUploadingReglamento} onChange={handleReglamentoUpload} />
                  <span className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/25" style={{ background: isUploadingReglamento ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                    {isUploadingReglamento ? <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo…</> : <><Plus className="h-4 w-4" /> Publicar Reglamento</>}
                  </span>
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ AUDITORÍA ═══ */}
      {activeTab === 'AUDITORIA' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-400">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <SectionHead icon={ClipboardList} title="Auditoría Personal" subtitle="Registro diario de desempeño y áreas de mejora" accent="#2563eb" bg="#eff6ff" />
            <button onClick={() => setShowAuditForm(v => !v)}
              className={cn('inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all shrink-0',
                showAuditForm ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'text-white shadow-lg shadow-slate-900/15')}
              style={showAuditForm ? {} : { background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
              {showAuditForm ? <><X className="h-3.5 w-3.5" /> Cancelar</> : <><Plus className="h-3.5 w-3.5" /> Nueva Auditoría</>}
            </button>
          </div>

          {showAuditForm && (
            <div className={cn(CARD, 'overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300')}>
              <div className="px-7 py-6" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
                <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">Nueva entrada</p>
                <h4 className="text-lg font-black text-slate-50">Auditoría Personal</h4>
              </div>
              <form onSubmit={handleSaveAudit} className="p-7 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Nombre del Proyecto *</label>
                    <input required type="text" value={auditForm.projectName} onChange={e => setAuditForm(p => ({ ...p, projectName: e.target.value }))}
                      placeholder="Ej: Instalación Planta Norte"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] font-bold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Fecha y Hora *</label>
                    <input required type="datetime-local" value={auditForm.auditDate} onChange={e => setAuditForm(p => ({ ...p, auditDate: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] font-bold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">¿Eres Líder? *</label>
                    <div className="flex gap-2">
                      {[{ label: 'Sí', value: true }, { label: 'No', value: false }].map(opt => (
                        <button key={String(opt.value)} type="button" onClick={() => setAuditForm(p => ({ ...p, isLeader: opt.value }))}
                          className={cn('flex-1 py-3 rounded-2xl text-xs font-black transition-all',
                            auditForm.isLeader === opt.value ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'bg-slate-50 text-slate-500 border border-slate-200')}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Área de Acción *</label>
                    <input required type="text" value={auditForm.actionArea} onChange={e => setAuditForm(p => ({ ...p, actionArea: e.target.value }))}
                      placeholder="Ej: Eléctrica, Mecánica, Supervisión…"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] font-bold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                  </div>
                </div>

                {[
                  { key: 'didWell', label: '¿Qué hice bien?', min: 3, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                  { key: 'didPoor', label: '¿Qué hice mal?', min: 2, color: '#dc2626', bg: '#fff1f2', border: '#fecaca' },
                  { key: 'improvements', label: '¿Cómo podemos mejorar?', min: 2, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                ].map(({ key, label, min, color, bg, border }) => (
                  <div key={key} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">{label} <span style={{ color }} className="font-black">· mín {min}</span></label>
                      <button type="button" onClick={() => setAuditForm(p => ({ ...p, [key]: [...p[key], { desc: '' }] }))}
                        className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider rounded-full px-3 py-1" style={{ color, background: bg, border: `1px solid ${border}` }}>
                        <Plus className="h-2.5 w-2.5" /> Agregar
                      </button>
                    </div>
                    <div className="space-y-2">
                      {auditForm[key].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black" style={{ background: bg, border: `1px solid ${border}`, color }}>{idx + 1}</div>
                          <input required type="text" value={item.desc}
                            onChange={e => setAuditForm(p => { const arr = [...p[key]]; arr[idx] = { desc: e.target.value }; return { ...p, [key]: arr }; })}
                            placeholder={`Acción ${idx + 1}…`}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                          {auditForm[key].length > min && (
                            <button type="button" onClick={() => setAuditForm(p => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }))}
                              className="h-7 w-7 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                              <X className="h-3 w-3 text-rose-600" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAuditForm(false)} className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-wider">Cancelar</button>
                  <button type="submit" disabled={isSavingAudit}
                    className="flex-[2] py-3.5 rounded-2xl text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-blue-500/25 disabled:opacity-60"
                    style={{ background: isSavingAudit ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                    {isSavingAudit ? 'Guardando…' : 'Guardar Auditoría'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-3">
            {loadingAudits ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100 animate-pulse" />)
            ) : audits.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Sin auditorías registradas" hint="Registra tu primera auditoría personal para dar seguimiento a tu desempeño." />
            ) : (
              audits.map(audit => {
                const isOpen = expandedAudit === audit.id;
                const dateStr = new Date(audit.auditDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={audit.id} className={cn(CARD, 'overflow-hidden hover:shadow-md transition-shadow')}>
                    <button type="button" onClick={() => setExpandedAudit(isOpen ? null : audit.id)} className="w-full flex items-center gap-4 p-5 text-left">
                      <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1px solid #bfdbfe' }}>
                        <ClipboardList className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate mb-1">{audit.projectName}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{dateStr}</span>
                          <span className="text-[9px] font-extrabold uppercase tracking-wider rounded-full px-2.5 py-0.5" style={{ color: audit.isLeader ? '#059669' : '#64748b', background: audit.isLeader ? '#ecfdf5' : '#f1f5f9', border: `1px solid ${audit.isLeader ? '#a7f3d0' : '#e2e8f0'}` }}>{audit.isLeader ? 'Líder' : 'Colaborador'}</span>
                          <span className="text-[9px] font-extrabold uppercase tracking-wider rounded-full px-2.5 py-0.5" style={{ color: '#6366f1', background: '#f5f3ff', border: '1px solid #e0e7ff' }}>{audit.actionArea}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={ev => { ev.stopPropagation(); handleDeleteAudit(audit.id); }} className="h-8 w-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                          <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                        </button>
                        <ChevronDown className={cn('h-4.5 w-4.5 text-slate-400 transition-transform', isOpen && 'rotate-180')} style={{ width: 18, height: 18 }} />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-slate-50 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                          {[
                            { label: '¿Qué hice bien?', items: audit.didWell, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
                            { label: '¿Qué hice mal?', items: audit.didPoor, color: '#dc2626', bg: '#fff1f2', border: '#fecaca' },
                            { label: '¿Cómo podemos mejorar?', items: audit.improvements, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
                          ].map(({ label, items, color, bg, border }) => (
                            <div key={label} className="rounded-2xl p-4" style={{ background: bg, border: `1px solid ${border}` }}>
                              <p className="text-[9px] font-black uppercase tracking-wider mb-2.5" style={{ color }}>{label}</p>
                              <ul className="space-y-1.5 list-none m-0 p-0">
                                {(items || []).map((it, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="h-[18px] w-[18px] rounded-md flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5" style={{ background: `${color}20`, border: `1px solid ${color}40`, color }}>{i + 1}</span>
                                    <span className="text-[12px] font-semibold text-slate-800 leading-snug">{it}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

        </main>
      </div>

      {/* ── MODAL SOLICITUD VACACIONES ── */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg overflow-hidden rounded-[28px] bg-white animate-in zoom-in-95 duration-300" style={{ boxShadow: '0 40px 120px rgba(0,0,0,0.3)' }}>
            <div className="relative overflow-hidden px-8 py-7" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
              <div className="absolute -top-8 -right-8 opacity-[0.08] pointer-events-none"><Palmtree className="h-24 w-24 text-white" /></div>
              <div className="flex items-start justify-between relative">
                <div>
                  <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Capital Humano</p>
                  <h3 className="text-xl font-black text-slate-50">Nueva Solicitud</h3>
                  <p className="text-[12px] font-semibold text-slate-500 mt-1.5">Completa los datos para enviar a RH.</p>
                </div>
                <button onClick={() => setShowRequestModal(false)} className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-400" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <form onSubmit={handleVacationRequest} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[{ label: 'Fecha Inicio', field: 'startDate' }, { label: 'Fecha Fin', field: 'endDate' }].map(({ label, field }) => (
                  <div key={field} className="space-y-2">
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">{label}</label>
                    <input type="date" required value={formData[field]} onChange={e => setFormData(p => ({ ...p, [field]: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] font-bold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Días Solicitados</label>
                  <input type="number" readOnly value={formData.days} placeholder="0"
                    className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] font-black text-slate-900 outline-none cursor-not-allowed" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Tipo de Permiso</label>
                  <select value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] font-bold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all">
                    <option value="ANNUAL">Vacaciones Anuales</option>
                    <option value="PERSONAL">Permiso Personal</option>
                    <option value="SICK">Incapacidad (Con Receta)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Motivo / Notas adicionales</label>
                <textarea value={formData.reason} onChange={e => setFormData(p => ({ ...p, reason: e.target.value }))}
                  placeholder="Ej: Viaje familiar, trámite personal…"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] font-semibold text-slate-800 outline-none resize-none h-22 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all" style={{ height: 88 }} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowRequestModal(false)} className="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-600 text-[11px] font-black uppercase tracking-wider">Cancelar</button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 py-3.5 rounded-2xl text-white text-[11px] font-black uppercase tracking-wider shadow-lg shadow-blue-500/25 disabled:opacity-60"
                  style={{ background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
                  {isSubmitting ? 'Enviando…' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
