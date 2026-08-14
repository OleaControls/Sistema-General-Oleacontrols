import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin, User2, Plus, Trash2, AlertTriangle, CheckCircle2, XCircle,
  Clock, ChevronLeft, ChevronRight, ClipboardList, Car, ShieldCheck, Pencil, FileDown,
  ScanSearch, Camera, X, ZoomIn, LogIn, LogOut, UserCheck, CalendarDays, ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { hrService } from '@/api/hrService';
import { useAuth, ROLES } from '@/store/AuthContext';
import { generateAttendanceReportPDF } from '../utils/attendanceReportPDF';
import {
  SHIFT_LABEL, getCheckInStatus, getCheckOutStatus, workedLabel,
} from '../utils/attendanceSchedule';

// Paleta por tono sobre fondo claro — puntualidad de la entrada / salida
const TONE_LIGHT = {
  emerald: { card: 'border-emerald-100', pill: 'bg-emerald-50 text-emerald-600 border-emerald-200', tile: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-600' },
  amber:   { card: 'border-amber-200',   pill: 'bg-amber-50   text-amber-700   border-amber-300',   tile: 'bg-amber-50   border-amber-200',   text: 'text-amber-700'   },
  rose:    { card: 'border-rose-200',    pill: 'bg-rose-50    text-rose-700    border-rose-300',    tile: 'bg-rose-50    border-rose-200',    text: 'text-rose-700'    },
  blue:    { card: 'border-blue-100',    pill: 'bg-blue-50    text-blue-600    border-blue-200',    tile: 'bg-blue-50    border-blue-100',    text: 'text-blue-600'    },
};

const PERSONAL_LABELS = {
  // EPP
  casco: 'Casco', gafas: 'Gafas protectoras', chaleco: 'Chaleco multibolsas reflejante',
  camisa: 'Camisa', guantes: 'Guantes de trabajo', rodilleras: 'Rodilleras',
  pantalon: 'Pantalón', zapatos: 'Zapatos con casquillo',
  // Herramientas
  multimetro: 'Multímetro', desPlanoChico: 'Desarmador plano chico',
  desPlanoMed: 'Desarmador plano mediano', desCruzChico: 'Desarmador de cruz chico',
  desCruzMed: 'Desarmador de cruz mediano', kitPerilleros: 'Kit perilleros (6)',
  pinzasElec: 'Pinzas electricista', pinzasPela: 'Pinzas pelacables',
  pinzasPunta: 'Pinzas de punta', pinzasRas: 'Pinzas corte al ras',
  flexometro: 'Flexómetro', portaHerramienta: 'Porta herramienta',
  navaja: 'Navaja', martillo: 'Martillo pequeño', cintasAislar: 'Cintas de aislar',
  // legacy
  lentes: 'Lentes', botas: 'Botas', toolsGeneral: 'Herr. generales', toolsSpecial: 'Herr. especiales',
};
const TOOLS_KEYS = [
  'multimetro','desPlanoChico','desPlanoMed','desCruzChico','desCruzMed','kitPerilleros',
  'pinzasElec','pinzasPela','pinzasPunta','pinzasRas','flexometro',
  'portaHerramienta','navaja','martillo','cintasAislar',
];
const VEHICLE_LABELS = {
  fuel: 'Combustible', cleanInterior: 'Limp. interior',
  cleanExterior: 'Estética', odometer: 'Tacómetro', functionality: 'Funcionalidad',
};

/* ── Utilidades de fecha (locales, sin UTC para no correr el día) ────────── */
const toStr   = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const shiftDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return toStr(d); };

/** Los 7 días (Dom→Sáb) de la semana a la que pertenece `s`. */
const weekOf = (s) => {
  const start = parseDay(s);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return toStr(d);
  });
};

/** Celdas del mes con relleno inicial para alinear al día de la semana. */
const monthCells = (y, m) => {
  const firstDow = new Date(y, m, 1).getDay();
  const total    = new Date(y, m + 1, 0).getDate();
  const cells    = Array.from({ length: firstDow }, () => null);
  for (let i = 1; i <= total; i++) cells.push(toStr(new Date(y, m, i)));
  return cells;
};

const DOW_SHORT = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function TechAttendanceAdmin() {
  const { user } = useAuth();
  const today = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  })();

  const [viewDate,   setViewDate]   = useState(today);
  const [technicians,setTechnicians]= useState([]);
  const [goals,      setGoals]      = useState([]);
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [form,       setForm]       = useState({ techId: '', clientName: '', clientLocation: '', notes: '', otNumber: '', hasVehicle: false });
  const [editGoalId, setEditGoalId] = useState(null);
  const [activeTab,        setActiveTab]        = useState('asistencia'); // 'asistencia' | 'goals' | 'reports' | 'panoramizacion' | 'vehiculos'
  const [panoramizaciones, setPanoramizaciones] = useState([]);
  const [loadingPanora,    setLoadingPanora]    = useState(false);
  const [photoModal,       setPhotoModal]       = useState(null); // { photos, index }

  // ── Navegación por día ────────────────────────────────────────────────────
  const [showCal,   setShowCal]   = useState(false);
  const [calCursor, setCalCursor] = useState(() => { const d = parseDay(today); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [expanded,  setExpanded]  = useState(null); // técnico con detalle abierto
  const [openPano,  setOpenPano]  = useState(null); // panoramización abierta
  const [openGoal,  setOpenGoal]  = useState(null); // meta con checklist abierto

  useEffect(() => {
    hrService.getEmployees().then(data => {
      const all = Array.isArray(data) ? data : data?.employees || [];
      setTechnicians(all.filter(e => (e.roles || [e.role]).includes(ROLES.TECH)));
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gRes, lRes] = await Promise.all([
        apiFetch(`/api/tech-attendance/goals?date=${viewDate}`),
        apiFetch(`/api/tech-attendance/logs?date=${viewDate}`),
      ]);
      setGoals(gRes.ok ? await gRes.json() : []);
      setLogs(lRes.ok  ? await lRes.json() : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [viewDate]);

  useEffect(() => { load(); }, [load]);

  // Sólo las panoramizaciones del día en pantalla — antes se traían todas.
  const loadPanoramizaciones = useCallback(async () => {
    setLoadingPanora(true);
    try {
      const r = await apiFetch(`/api/tech-attendance/panoramizacion?date=${viewDate}`);
      setPanoramizaciones(r.ok ? await r.json() : []);
    } catch { /* silencioso */ }
    finally { setLoadingPanora(false); }
  }, [viewDate]);

  useEffect(() => {
    if (activeTab === 'panoramizacion') loadPanoramizaciones();
  }, [activeTab, loadPanoramizaciones]);

  const goToDay = (d) => { setViewDate(d); setExpanded(null); };
  const prevDay = () => goToDay(shiftDays(viewDate, -1));
  const nextDay = () => goToDay(shiftDays(viewDate, +1));

  const week = weekOf(viewDate);
  const calLabel = new Date(calCursor.y, calCursor.m, 1)
    .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const openNew = () => {
    setEditGoalId(null);
    setForm({ techId: '', clientName: '', clientLocation: '', notes: '', otNumber: '', hasVehicle: false });
    setShowModal(true);
  };
  const openEdit = (g) => {
    setEditGoalId(g.id);
    setForm({ techId: g.techId, clientName: g.clientName, clientLocation: g.clientLocation || '', notes: g.notes || '', otNumber: g.otNumber || '', hasVehicle: g.hasVehicle || false });
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!form.techId || !form.clientName) { alert('Técnico y cliente son requeridos'); return; }
    setSaving(true);
    try {
      const res = await apiFetch('/api/tech-attendance/goals', {
        method: 'POST',
        body: JSON.stringify({ ...form, date: viewDate, id: editGoalId || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setShowModal(false);
      load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta meta?')) return;
    await apiFetch('/api/tech-attendance/goals', { method: 'DELETE', body: JSON.stringify({ id }) });
    load();
  };

  const techMap = Object.fromEntries(technicians.map(t => [t.id, t]));
  const reports = logs.filter(l => l.personalReportSent || l.vehicleReportSent);
  const dayLabel = new Date(viewDate + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' });

  // ── Asistencia diaria — un renglón por técnico, independiente del checklist ──
  const attendanceRows = technicians
    .map(t => {
      const log = logs.find(l => l.techId === t.id) || null;
      return {
        tech: t,
        log,
        checkInTime:  log?.checkInTime  || null,
        checkOutTime: log?.checkOutTime || null,
        checkIn:      getCheckInStatus(log?.checkInTime),
        checkOut:     getCheckOutStatus(log?.checkOutTime),
      };
    })
    .sort((a, b) => {
      if (!!a.checkInTime !== !!b.checkInTime) return a.checkInTime ? -1 : 1;
      if (a.checkInTime && b.checkInTime) return a.checkInTime.localeCompare(b.checkInTime);
      return (a.tech.name || '').localeCompare(b.tech.name || '');
    });

  const onTimeCount  = attendanceRows.filter(r => r.checkIn?.key === 'ontime').length;
  const retardoCount = attendanceRows.filter(r => r.checkIn?.key === 'retardo').length;
  const tardeCount   = attendanceRows.filter(r => r.checkIn?.key === 'tarde').length;
  const absentCount  = attendanceRows.filter(r => !r.checkInTime).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Asistencia Técnicos</h2>
          <p className="text-sm text-gray-500 font-medium mt-1 capitalize">{dayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToDay(today)}
            disabled={viewDate === today}
            className="px-3 py-2.5 rounded-2xl border bg-white text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-40 disabled:hover:bg-white"
          >
            Hoy
          </button>

          {/* Calendario — saltar a cualquier día */}
          <div className="relative">
            <button
              onClick={() => setShowCal(v => !v)}
              className={cn(
                'flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all',
                showCal ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              <CalendarDays className="h-4 w-4" /> Calendario
            </button>

            {showCal && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCal(false)} />
                <div className="absolute right-0 mt-2 z-50 bg-white rounded-3xl border border-gray-100 shadow-2xl p-4 w-72">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setCalCursor(({ y, m }) => { const d = new Date(y, m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; })}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <ChevronLeft className="h-4 w-4 text-gray-500" />
                    </button>
                    <p className="text-xs font-black text-gray-900 capitalize">{calLabel}</p>
                    <button
                      onClick={() => setCalCursor(({ y, m }) => { const d = new Date(y, m + 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; })}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {DOW_SHORT.map((d, i) => (
                      <div key={i} className="text-center text-[9px] font-black text-gray-300 uppercase py-1">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {monthCells(calCursor.y, calCursor.m).map((cell, i) => {
                      if (!cell) return <div key={`p-${i}`} />;
                      const isSel = cell === viewDate;
                      const isToday = cell === today;
                      return (
                        <button
                          key={cell}
                          onClick={() => { goToDay(cell); setShowCal(false); }}
                          className={cn(
                            'aspect-square rounded-xl text-xs font-black tabular-nums transition-all',
                            isSel   ? 'bg-primary text-white shadow-md'
                            : isToday ? 'bg-primary/10 text-primary'
                            : 'text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          {Number(cell.slice(8))}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <Plus className="h-4 w-4" /> Asignar Meta
          </button>
        </div>
      </div>

      {/* Tira de la semana — un clic por día */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-2 flex items-center gap-2">
        <button onClick={prevDay} className="p-2 rounded-xl hover:bg-gray-100 transition-all shrink-0">
          <ChevronLeft className="h-4 w-4 text-gray-400" />
        </button>
        <div className="flex-1 grid grid-cols-7 gap-1">
          {week.map(d => {
            const isSel   = d === viewDate;
            const isToday = d === today;
            const dow     = parseDay(d).getDay();
            return (
              <button
                key={d}
                onClick={() => goToDay(d)}
                className={cn(
                  'py-2 rounded-2xl flex flex-col items-center gap-0.5 transition-all',
                  isSel ? 'bg-primary text-white shadow-md shadow-primary/20' : 'hover:bg-gray-50'
                )}
              >
                <span className={cn(
                  'text-[9px] font-black uppercase tracking-widest',
                  isSel ? 'text-white/70' : dow === 0 ? 'text-rose-300' : 'text-gray-300'
                )}>
                  {DOW_SHORT[dow]}
                </span>
                <span className={cn(
                  'text-sm font-black tabular-nums',
                  isSel ? 'text-white' : isToday ? 'text-primary' : 'text-gray-700'
                )}>
                  {Number(d.slice(8))}
                </span>
                {isToday && !isSel && <span className="h-1 w-1 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
        <button onClick={nextDay} className="p-2 rounded-xl hover:bg-gray-100 transition-all shrink-0">
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {[
          { id: 'asistencia',      label: 'Asistencia',         icon: UserCheck },
          { id: 'goals',           label: 'Metas del día',      icon: ClipboardList },
          { id: 'reports',         label: `Reportes (${reports.length})`, icon: AlertTriangle },
          { id: 'vehiculos',       label: 'Vehículos',          icon: Car },
          { id: 'panoramizacion',  label: 'Panoramización',     icon: ScanSearch },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
              activeTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: ASISTENCIA DIARIA ──────────────────────────────────────────
          Entrada y salida por técnico. Separado del checklist (Reportes) y de
          la Panoramización. */}
      {activeTab === 'asistencia' && (
        <div className="space-y-4">

          {/* Resumen de puntualidad — horario 09:00 – 18:00 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'A tiempo',      value: onTimeCount,  cls: 'text-emerald-500', icon: CheckCircle2 },
              { label: 'Retardo',       value: retardoCount, cls: 'text-amber-500',   icon: Clock },
              { label: 'Tarde',         value: tardeCount,   cls: 'text-rose-500',    icon: AlertTriangle },
              { label: 'Sin registrar', value: absentCount,  cls: 'text-gray-300',    icon: XCircle },
            ].map(({ label, value, cls, icon: Icon }) => (
              <div key={label} className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn('h-3.5 w-3.5 shrink-0', cls)} />
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-tight">{label}</p>
                </div>
                <p className="text-2xl font-black text-gray-900 tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
            Horario {SHIFT_LABEL} · Retardo desde 09:05 · Tarde desde 09:10
          </p>

          {loading ? (
            <div className="bg-white rounded-3xl border border-gray-100 divide-y divide-gray-50">
              {[1,2,3,4].map(i => <div key={i} className="h-14 animate-pulse bg-gray-50" />)}
            </div>
          ) : attendanceRows.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center">
              <UserCheck className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="font-black text-gray-400 text-sm">Sin técnicos registrados</p>
            </div>
          ) : (
            /* Lista compacta — un renglón por técnico, detalle bajo demanda */
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Encabezado de columnas (sólo escritorio) */}
              <div className="hidden md:grid grid-cols-[1fr_84px_84px_96px_120px_32px] gap-3 px-4 py-2.5 bg-gray-50/70 border-b border-gray-100">
                {['Técnico', 'Entrada', 'Salida', 'Jornada', 'Puntualidad', ''].map((h, i) => (
                  <p key={i} className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{h}</p>
                ))}
              </div>

              <div className="divide-y divide-gray-50">
                {attendanceRows.map(({ tech, log, checkInTime, checkOutTime, checkIn, checkOut }) => {
                  const worked  = workedLabel(checkInTime, checkOutTime);
                  const tone    = checkIn ? TONE_LIGHT[checkIn.tone] : null;
                  const outTone = checkOut ? TONE_LIGHT[checkOut.tone] : null;
                  const isOpen  = expanded === tech.id;
                  const chips = [
                    log?.goal?.otNumber && { label: log.goal.otNumber, cls: 'text-blue-600 bg-blue-50 border-blue-200' },
                    log?.status === 'COMPLETE' && { label: 'Checklist enviado', cls: 'text-violet-600 bg-violet-50 border-violet-200' },
                    (log?.personalReportSent || log?.vehicleReportSent) && { label: 'Reporte de faltantes', cls: 'text-amber-600 bg-amber-50 border-amber-200' },
                    checkInTime && { label: checkOutTime ? 'Jornada cerrada' : 'En jornada', cls: 'text-gray-500 bg-gray-50 border-gray-200' },
                  ].filter(Boolean);

                  return (
                    <div key={tech.id} className={cn(checkIn?.key === 'tarde' && 'bg-rose-50/40')}>
                      <button
                        onClick={() => setExpanded(isOpen ? null : tech.id)}
                        className="w-full grid grid-cols-[1fr_auto] md:grid-cols-[1fr_84px_84px_96px_120px_32px] gap-3 items-center px-4 py-3 text-left hover:bg-gray-50/60 transition-all"
                      >
                        {/* Técnico */}
                        <div className="flex items-center gap-3 min-w-0">
                          {tech.avatar
                            ? <img src={tech.avatar} className="h-8 w-8 rounded-xl object-cover border shrink-0" alt="" />
                            : <div className="h-8 w-8 rounded-xl bg-gray-100 flex items-center justify-center text-[11px] font-black text-gray-500 shrink-0">{(tech.name || '?').charAt(0)}</div>
                          }
                          <div className="min-w-0">
                            <p className="font-black text-gray-900 text-[13px] truncate leading-tight">{tech.name}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{tech.position || 'Técnico'}</p>
                          </div>
                        </div>

                        {/* Entrada / Salida / Jornada — sólo escritorio */}
                        <p className={cn('hidden md:block text-sm font-black tabular-nums', checkInTime ? (tone ? tone.text : 'text-gray-900') : 'text-gray-300')}>
                          {checkInTime || '--:--'}
                        </p>
                        <p className={cn('hidden md:block text-sm font-black tabular-nums', checkOutTime ? (outTone ? outTone.text : 'text-gray-900') : 'text-gray-300')}>
                          {checkOutTime || '--:--'}
                        </p>
                        <p className={cn('hidden md:block text-[11px] font-black', worked ? 'text-gray-600' : 'text-gray-300')}>
                          {worked || '—'}
                        </p>

                        {/* Puntualidad + chevron */}
                        <div className="flex items-center gap-2 justify-end md:justify-start">
                          <span className={cn(
                            'text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider whitespace-nowrap',
                            tone ? tone.pill : 'bg-gray-50 text-gray-400 border-gray-200'
                          )}>
                            {checkIn ? checkIn.label : 'Sin registrar'}
                          </span>
                          <ChevronDown className={cn('h-4 w-4 text-gray-300 transition-transform md:hidden', isOpen && 'rotate-180')} />
                        </div>
                        <ChevronDown className={cn('hidden md:block h-4 w-4 text-gray-300 transition-transform justify-self-end', isOpen && 'rotate-180')} />
                      </button>

                      {/* Detalle */}
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 space-y-3 animate-in fade-in duration-200">
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: 'Entrada', time: checkInTime,  icon: LogIn,  status: checkIn  },
                              { label: 'Salida',  time: checkOutTime, icon: LogOut, status: checkOut },
                            ].map(({ label, time, icon: Icon, status }) => {
                              const t = status ? TONE_LIGHT[status.tone] : null;
                              return (
                                <div key={label} className={cn('rounded-2xl p-3 border', t ? `${t.tile} ${t.text}` : 'bg-gray-50 border-gray-100 text-gray-300')}>
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <Icon className="h-3 w-3 shrink-0" />
                                    <p className="text-[9px] font-black uppercase tracking-widest">{label}</p>
                                  </div>
                                  <p className={cn('text-lg font-black tabular-nums', time ? 'text-gray-900' : 'text-gray-300')}>{time || '--:--'}</p>
                                  {status?.detail && <p className="text-[9px] font-black uppercase tracking-widest mt-0.5">{status.detail}</p>}
                                </div>
                              );
                            })}
                          </div>

                          {chips.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {worked && (
                                <span className="text-[9px] font-black text-gray-500 bg-gray-50 border border-gray-200 px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> Jornada de {worked}
                                </span>
                              )}
                              {chips.map((c, i) => (
                                <span key={i} className={cn('text-[9px] font-black px-2 py-1 rounded-full border uppercase tracking-wider', c.cls)}>
                                  {c.label}
                                </span>
                              ))}
                            </div>
                          )}

                          {log?.goal && (
                            <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Meta del día</p>
                              <p className="text-[13px] font-bold text-gray-800">{log.goal.clientName}</p>
                              {log.goal.clientLocation && (
                                <p className="text-[11px] font-bold text-gray-400 flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" /> {log.goal.clientLocation}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: METAS ──────────────────────────────────────────────────────── */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-3xl animate-pulse" />)}</div>
          ) : goals.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center">
              <ClipboardList className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="font-black text-gray-400 text-sm">Sin metas asignadas</p>
              <p className="text-gray-300 text-[10px] font-bold uppercase tracking-widest mt-1">Usa "Asignar Meta" para agregar</p>
            </div>
          ) : (
            goals.map(g => {
              const log = logs.find(l => l.techId === g.techId);
              const tech = techMap[g.techId] || g.tech;
              return (
                <div key={g.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {tech?.avatar
                        ? <img src={tech.avatar} className="h-11 w-11 rounded-2xl object-cover border shrink-0" alt="" />
                        : <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-sm font-black text-primary shrink-0">{(tech?.name || '?').charAt(0)}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 text-sm truncate">{tech?.name || g.techId}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <User2 className="h-3 w-3 text-primary" />
                          <p className="text-xs font-bold text-gray-700 truncate">{g.clientName}</p>
                        </div>
                        {g.clientLocation && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <p className="text-[11px] font-bold text-gray-400 truncate">{g.clientLocation}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Estado del log */}
                      {log ? (
                        <span className={cn(
                          'text-[9px] font-black px-2 py-1 rounded-full border uppercase tracking-wider',
                          log.status === 'COMPLETE' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          log.step === 'PERSONAL'   ? 'bg-blue-50 text-blue-600 border-blue-200' :
                          log.step === 'VEHICLE'    ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                                                      'bg-gray-100 text-gray-500 border-gray-200'
                        )}>
                          {log.status === 'COMPLETE' ? 'Completado' :
                           log.step === 'PERSONAL'   ? 'En Checklist' :
                           log.step === 'VEHICLE'    ? 'En Vehículo'  : 'Iniciado'}
                        </span>
                      ) : (
                        <span className="text-[9px] font-black px-2 py-1 rounded-full border bg-gray-100 text-gray-400 border-gray-200 uppercase tracking-wider">
                          Sin entrada
                        </span>
                      )}
                      <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/8 transition-all">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Hora entrada y alertas */}
                  {log?.checkInTime && (
                    <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                        <Clock className="h-3.5 w-3.5 text-emerald-500" /> Entrada: {log.checkInTime}
                      </span>
                      {(log.personalReportSent || log.vehicleReportSent) && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="h-3 w-3" /> {[log.personalReportSent && 'Equipo', log.vehicleReportSent && 'Vehículo'].filter(Boolean).join(' · ')} — reporte enviado
                        </span>
                      )}
                    </div>
                  )}

                  {/* Checklist completo — plegado para no amontonar la lista */}
                  {log?.status === 'COMPLETE' && log?.checklistPersonal && (
                    <button
                      onClick={() => setOpenGoal(openGoal === g.id ? null : g.id)}
                      className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-all"
                    >
                      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', openGoal === g.id && 'rotate-180')} />
                      {openGoal === g.id ? 'Ocultar checklist' : 'Ver checklist'}
                    </button>
                  )}

                  {log?.status === 'COMPLETE' && log?.checklistPersonal && openGoal === g.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3 animate-in fade-in duration-200">
                      {/* EPP */}
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Equipo Personal</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(log.checklistPersonal)
                            .filter(([k, v]) => k !== 'toolsLife' && !TOOLS_KEYS.includes(k) && v !== undefined)
                            .map(([k, v]) => (
                              <span key={k} className={`text-[8px] font-black px-2 py-0.5 rounded border ${v ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {v ? '✓' : '✗'} {PERSONAL_LABELS[k] || k}
                              </span>
                            ))}
                        </div>
                      </div>

                      {/* Herramientas */}
                      <div>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Herramientas</p>
                        <div className="space-y-1">
                          {TOOLS_KEYS.filter(k => log.checklistPersonal[k] !== undefined).map(k => {
                            const present = log.checklistPersonal[k];
                            const life    = log.checklistPersonal?.toolsLife?.[k];
                            return (
                              <div key={k} className="flex items-center gap-2">
                                <span className={`text-[8px] font-black shrink-0 ${present ? 'text-emerald-600' : 'text-red-500'}`}>{present ? '✓' : '✗'}</span>
                                <span className="text-[10px] font-bold text-gray-700 flex-1">{PERSONAL_LABELS[k] || k}</span>
                                {present && life !== undefined && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full ${life >= 70 ? 'bg-emerald-500' : life >= 40 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${life}%` }} />
                                    </div>
                                    <span className={`text-[9px] font-black tabular-nums w-6 text-right ${life >= 70 ? 'text-emerald-600' : life >= 40 ? 'text-amber-500' : 'text-rose-500'}`}>{life}%</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB: REPORTES ───────────────────────────────────────────────────── */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-300 mx-auto mb-3" />
              <p className="font-black text-gray-400 text-sm">Sin reportes de faltantes</p>
              <p className="text-gray-300 text-[10px] font-bold uppercase tracking-widest mt-1">Todos los técnicos llegaron completos</p>
            </div>
          ) : reports.map(log => {
            const tech = techMap[log.techId] || log.tech;
            return (
              <div key={log.id} className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  {tech?.avatar
                    ? <img src={tech.avatar} className="h-10 w-10 rounded-2xl object-cover border" alt="" />
                    : <div className="h-10 w-10 rounded-2xl bg-amber-100 flex items-center justify-center text-sm font-black text-amber-600">{(tech?.name || '?').charAt(0)}</div>
                  }
                  <div>
                    <p className="font-black text-gray-900 text-sm">{tech?.name || log.techId}</p>
                    <p className="text-[10px] font-bold text-gray-400">Entrada: {log.checkInTime}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    {log.personalReportSent && <ShieldCheck className="h-4 w-4 text-amber-500" />}
                    {log.vehicleReportSent  && <Car         className="h-4 w-4 text-amber-500" />}
                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Reporte pendiente
                    </span>
                  </div>
                </div>

                {log.personalReportSent && (
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" /> Equipo personal — faltantes
                      </p>
                      <button
                        onClick={() => generateAttendanceReportPDF(log, tech?.name || log.techId, log.goal, 'personal')}
                        className="flex items-center gap-1 text-[9px] font-black text-amber-700 bg-white border border-amber-300 px-2.5 py-1 rounded-xl hover:bg-amber-100 transition-all"
                      >
                        <FileDown className="h-3 w-3" /> Ver PDF
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(log.checklistPersonal || {})
                        .filter(([k, v]) => v === false && k !== 'toolsLife')
                        .map(([k]) => (
                          <span key={k} className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">
                            {PERSONAL_LABELS[k] || k}
                          </span>
                        ))}
                    </div>
                    {log.personalMissing && <p className="text-xs font-bold text-amber-800 italic">"{log.personalMissing}"</p>}

                    {/* Vida útil de herramientas */}
                    {log.checklistPersonal?.toolsLife && Object.keys(log.checklistPersonal.toolsLife).length > 0 && (
                      <div className="pt-3 border-t border-amber-200 space-y-1.5">
                        <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Vida útil herramientas</p>
                        <div className="space-y-1.5">
                          {Object.entries(log.checklistPersonal.toolsLife).map(([k, pct]) => (
                            <div key={k} className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-700 flex-1">{PERSONAL_LABELS[k] || k}</span>
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 h-1.5 bg-white rounded-full overflow-hidden border border-amber-200">
                                  <div
                                    className={`h-full rounded-full ${pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-rose-500'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className={`text-[9px] font-black tabular-nums w-7 text-right ${pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>{pct}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {log.vehicleReportSent && (
                  <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                        <Car className="h-3.5 w-3.5" /> Vehículo — recursos requeridos
                      </p>
                      <button
                        onClick={() => generateAttendanceReportPDF(log, tech?.name || log.techId, log.goal, 'vehicle')}
                        className="flex items-center gap-1 text-[9px] font-black text-amber-700 bg-white border border-amber-300 px-2.5 py-1 rounded-xl hover:bg-amber-100 transition-all"
                      >
                        <FileDown className="h-3 w-3" /> Ver PDF
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(log.checklistVehicle || {}).filter(([,v]) => v === false).map(([k]) => (
                        <span key={k} className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">
                          {VEHICLE_LABELS[k] || k}
                        </span>
                      ))}
                    </div>
                    {log.vehicleMissing && <p className="text-xs font-bold text-amber-800 italic">"{log.vehicleMissing}"</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: PANORAMIZACIÓN ─────────────────────────────────────────────── */}
      {activeTab === 'panoramizacion' && (
        <div className="space-y-4">
          {loadingPanora ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : panoramizaciones.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center">
              <ScanSearch className="h-10 w-10 text-violet-200 mx-auto mb-3" />
              <p className="font-black text-gray-400 text-sm">Sin panoramizaciones este día</p>
              <p className="text-gray-300 text-[11px] font-bold mt-1 capitalize">{dayLabel}</p>
            </div>
          ) : (
            /* Una fila por panoramización; el detalle se abre bajo demanda */
            <div className="bg-white rounded-3xl border border-violet-100 shadow-sm overflow-hidden divide-y divide-violet-50">
              {panoramizaciones.map(p => {
                const tech = p.tech;
                const hora = new Date(p.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
                const FIELDS = [
                  { key: 'condicionesSitio', label: 'Plática casual' },
                  { key: 'planEjecucion',    label: 'Meta del cliente' },
                  { key: 'requerimientos',   label: 'Objetivos' },
                  { key: 'obstaculos',       label: 'Obstáculos' },
                  { key: 'algoritmos',       label: 'Algoritmos' },
                  { key: 'deseaLoMejor',     label: 'Desea lo mejor' },
                ].filter(f => p[f.key]?.trim());
                const isOpen = openPano === p.id;

                return (
                  <div key={p.id}>
                    <button
                      onClick={() => setOpenPano(isOpen ? null : p.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-violet-50/40 transition-all"
                    >
                      {tech?.avatar
                        ? <img src={tech.avatar} className="h-8 w-8 rounded-xl object-cover border shrink-0" alt="" />
                        : <div className="h-8 w-8 rounded-xl bg-violet-100 flex items-center justify-center text-[11px] font-black text-violet-600 shrink-0">{(tech?.name || '?').charAt(0)}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 text-[13px] truncate leading-tight">{tech?.name || p.techId}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{hora} · {FIELDS.length} respuesta{FIELDS.length === 1 ? '' : 's'}</p>
                      </div>
                      <span className="text-[9px] font-black text-violet-700 bg-violet-100 border border-violet-200 px-2.5 py-1 rounded-full uppercase tracking-widest shrink-0">
                        {p.otNumber}
                      </span>
                      <ChevronDown className={cn('h-4 w-4 text-gray-300 shrink-0 transition-transform', isOpen && 'rotate-180')} />
                    </button>

                    {isOpen && (
                      <div className="px-4 pb-4 grid md:grid-cols-2 gap-2 animate-in fade-in duration-200">
                        {FIELDS.map(f => (
                          <div key={f.key} className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                            <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <ScanSearch className="h-3 w-3" /> {f.label}
                            </p>
                            <p className="text-[13px] font-bold text-gray-800 leading-relaxed">{p[f.key]}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: VEHÍCULOS ──────────────────────────────────────────────────── */}
      {activeTab === 'vehiculos' && (() => {
        const vehicleLogs = logs.filter(l => l.checklistVehicle?.carDamage);
        const CAR_ZONE_LABELS = {
          frontal: 'Frontal', interior: 'Interior',
          trasero: 'Trasero', ladoIzq: 'Lado Izq.', ladoDer: 'Lado Der.',
        };
        return (
          <div className="space-y-4">
            {vehicleLogs.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center">
                <Car className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                <p className="font-black text-gray-400 text-sm">Sin inspecciones de vehículo este día</p>
                <p className="text-gray-300 text-[11px] font-bold mt-1 capitalize">{dayLabel}</p>
              </div>
            ) : vehicleLogs.map(log => {
              const tech = techMap[log.techId] || log.tech;
              const carDamage  = log.checklistVehicle?.carDamage  || {};
              const carPhotos  = log.checklistVehicle?.carPhotos  || [];
              const damagedZones = Object.entries(carDamage).filter(([,v]) => v === true).map(([k]) => CAR_ZONE_LABELS[k] || k);
              return (
                <div key={log.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    {tech?.avatar
                      ? <img src={tech.avatar} className="h-10 w-10 rounded-2xl object-cover border" alt="" />
                      : <div className="h-10 w-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-sm font-black text-indigo-600">{(tech?.name || '?').charAt(0)}</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-900 text-sm">{tech?.name || log.techId}</p>
                      <p className="text-[10px] font-bold text-gray-400">Entrada: {log.checkInTime || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {damagedZones.length > 0 ? (
                        <span className="text-[9px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full uppercase tracking-wider">
                          {damagedZones.length} zona{damagedZones.length > 1 ? 's' : ''} con detalle
                        </span>
                      ) : (
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full uppercase tracking-wider">
                          Sin daños
                        </span>
                      )}
                      {carPhotos.length > 0 && (
                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <Camera className="h-3 w-3" /> {carPhotos.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Zonas */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {Object.entries(carDamage).map(([zone, val]) => (
                      <div key={zone} className={cn(
                        'rounded-2xl p-2 border text-center',
                        val === false ? 'bg-emerald-50 border-emerald-200' :
                        val === true  ? 'bg-red-50 border-red-200' :
                                        'bg-gray-50 border-gray-100'
                      )}>
                        <div className={cn(
                          'h-5 w-5 rounded-full mx-auto mb-1 flex items-center justify-center',
                          val === false ? 'bg-emerald-500' : val === true ? 'bg-red-500' : 'bg-gray-300'
                        )}>
                          {val === false
                            ? <CheckCircle2 className="h-3 w-3 text-white" />
                            : val === true
                            ? <XCircle className="h-3 w-3 text-white" />
                            : null}
                        </div>
                        <p className={cn(
                          'text-[8px] font-black uppercase tracking-wide',
                          val === true ? 'text-red-600' : val === false ? 'text-emerald-600' : 'text-gray-400'
                        )}>
                          {CAR_ZONE_LABELS[zone] || zone}
                        </p>
                      </div>
                    ))}
                  </div>

                  {log.vehicleMissing && (
                    <p className="text-xs font-bold text-amber-800 italic bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                      "{log.vehicleMissing}"
                    </p>
                  )}

                  {/* Galería de fotos */}
                  {carPhotos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Camera className="h-3.5 w-3.5" /> Evidencia ({carPhotos.length} foto{carPhotos.length > 1 ? 's' : ''})
                      </p>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {carPhotos.map((url, i) => (
                          <button
                            key={i}
                            onClick={() => setPhotoModal({ photos: carPhotos, index: i })}
                            className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all group"
                          >
                            <img src={url} alt={`evidencia ${i+1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                              <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Modal lightbox fotos */}
      {photoModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img
              src={photoModal.photos[photoModal.index]}
              alt="evidencia"
              className="w-full rounded-3xl object-contain max-h-[80vh]"
            />
            <button
              onClick={() => setPhotoModal(null)}
              className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-all"
            >
              <X className="h-4 w-4" />
            </button>
            {photoModal.photos.length > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {photoModal.photos.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoModal(m => ({ ...m, index: i }))}
                    className={cn(
                      'h-12 w-12 rounded-xl overflow-hidden border-2 transition-all',
                      i === photoModal.index ? 'border-white' : 'border-transparent opacity-50 hover:opacity-75'
                    )}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal — asignar meta */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">
              {editGoalId ? 'Editar Meta' : 'Asignar Meta del Día'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Técnico</label>
                <select value={form.techId} onChange={e => setForm(f => ({ ...f, techId: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">Selecciona técnico...</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">No. OT <span className="normal-case font-normal text-gray-300">(opcional — vincula a una OT existente)</span></label>
                <input value={form.otNumber} onChange={e => setForm(f => ({ ...f, otNumber: e.target.value }))}
                  placeholder="Ej. OT-SUCE-001"
                  className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 uppercase" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cliente</label>
                <input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                  placeholder="Nombre del cliente o establecimiento"
                  className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Ubicación</label>
                <input value={form.clientLocation} onChange={e => setForm(f => ({ ...f, clientLocation: e.target.value }))}
                  placeholder="Dirección o zona"
                  className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Metas</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  placeholder="Objetivos a cumplir, material requerido, verificaciones previas..."
                  className="w-full border rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              {/* Toggle vehículo */}
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, hasVehicle: !f.hasVehicle }))}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                  form.hasVehicle
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Car className={`h-4 w-4 ${form.hasVehicle ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <span className="text-xs font-black uppercase tracking-wider">
                    {form.hasVehicle ? 'Técnico lleva vehículo' : 'Sin vehículo asignado'}
                  </span>
                </div>
                <div className={`h-5 w-9 rounded-full transition-colors relative ${form.hasVehicle ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.hasVehicle ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </button>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-2xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50">
                {saving ? 'Guardando...' : editGoalId ? 'Actualizar' : 'Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
