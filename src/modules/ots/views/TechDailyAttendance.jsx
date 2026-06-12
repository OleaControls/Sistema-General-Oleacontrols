import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, User2, Clock, CheckCircle2, XCircle, AlertTriangle, ChevronRight, ChevronLeft,
  Send, Wrench, ShieldCheck, Car, Fuel, Sparkles, Gauge, Zap, HardHat,
  Package, ClipboardList, CheckCheck, RotateCcw, ExternalLink, Target, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';
import { generateAttendanceReportPDF } from '../utils/attendanceReportPDF';

// ── Constantes de checklist ──────────────────────────────────────────────────
const PERSONAL_ITEMS = [
  { key: 'uniform',      label: 'Uniforme completo',                   icon: User2 },
  { key: 'epp',          label: 'EPP (casco, lentes, guantes, botas)', icon: HardHat },
  { key: 'toolsBasic',   label: 'Herramientas básicas',                icon: Wrench },
  { key: 'toolsSpecial', label: 'Herramientas especiales',             icon: Zap },
  { key: 'materials',    label: 'Materiales / Refacciones',            icon: Package },
];

const VEHICLE_ITEMS = [
  { key: 'fuel',          label: 'Combustible suficiente',               icon: Fuel },
  { key: 'cleanInterior', label: 'Limpieza interior',                    icon: Sparkles },
  { key: 'cleanExterior', label: 'Estética exterior',                    icon: Car },
  { key: 'odometer',      label: 'Tacómetro',  icon: Gauge, isNumber: true },
  { key: 'functionality', label: 'Funcionalidad (luces, frenos, motor)', icon: CheckCheck },
];

// ── CheckItem ────────────────────────────────────────────────────────────────
function CheckItem({ item, value, onChange, disabled }) {
  const Icon = item.icon;

  if (item.isNumber) {
    const hasValue = value !== undefined && value !== null && value !== '';
    return (
      <div className={cn(
        'p-4 rounded-2xl border transition-all',
        hasValue ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'
      )}>
        <div className="flex items-center gap-3 mb-3">
          <div className={cn(
            'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
            hasValue ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-gray-400 border'
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <p className="text-sm font-bold text-gray-800">{item.label}</p>
          {hasValue && !disabled && (
            <span className="ml-auto text-[9px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">Registrado</span>
          )}
        </div>
        {!disabled ? (
          <input
            type="number" min="0" value={value ?? ''}
            onChange={e => onChange(item.key, e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="Escribe la lectura del tacómetro (km)"
            className="w-full border rounded-xl px-3 py-2 text-sm font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
          />
        ) : (
          <p className="text-sm font-black text-gray-900">
            {hasValue ? `${Number(value).toLocaleString()} km` : <span className="text-gray-400 italic font-bold">No registrado</span>}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center justify-between p-4 rounded-2xl border transition-all',
      value === true  ? 'bg-emerald-50 border-emerald-200'  :
      value === false ? 'bg-red-50 border-red-200'          :
                        'bg-gray-50 border-gray-100 hover:border-gray-200'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'h-9 w-9 rounded-xl flex items-center justify-center',
          value === true  ? 'bg-emerald-100 text-emerald-600' :
          value === false ? 'bg-red-100 text-red-600'         :
                            'bg-white text-gray-400 border'
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-bold text-gray-800">{item.label}</p>
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <button onClick={() => onChange(item.key, true)}
            className={cn(
              'h-8 w-8 rounded-xl flex items-center justify-center border transition-all',
              value === true ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-emerald-400 hover:text-emerald-500'
            )}>
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <button onClick={() => onChange(item.key, false)}
            className={cn(
              'h-8 w-8 rounded-xl flex items-center justify-center border transition-all',
              value === false ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-500'
            )}>
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}
      {disabled && value !== null && value !== undefined && (
        <span className={cn(
          'text-[10px] font-black px-2 py-1 rounded-full border uppercase tracking-wider',
          value ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
        )}>
          {value ? 'OK' : 'Faltante'}
        </span>
      )}
    </div>
  );
}

// ── ChecklistModal ────────────────────────────────────────────────────────────
function ChecklistModal({ goal, techName, log: existingLog, onClose }) {
  const STEPS_DEF = ['Equipo Personal', ...(goal?.hasVehicle ? ['Vehículo'] : []), 'Resumen'];

  const [modalStep,    setModalStep]    = useState(0);
  const [mPersonal,    setMPersonal]    = useState({});
  const [mVehicle,     setMVehicle]     = useState({});
  const [mPNotes,      setMPNotes]      = useState('');
  const [mVNotes,      setMVNotes]      = useState('');
  const [generating,   setGenerating]   = useState(false);
  const [sendStatus,   setSendStatus]   = useState(null); // null | 'sending' | 'sent' | 'error'

  const dateLabel = (() => {
    if (!goal?.date) return '';
    const dateOnly = new Date(goal.date).toISOString().slice(0, 10);
    return new Date(dateOnly + 'T12:00:00Z').toLocaleDateString('es-MX', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
  })();

  const pHasMissing  = PERSONAL_ITEMS.some(i => mPersonal[i.key] === false);
  const vHasMissing  = goal?.hasVehicle && VEHICLE_ITEMS.filter(i => !i.isNumber).some(i => mVehicle[i.key] === false);
  const pAllDone     = PERSONAL_ITEMS.every(i => mPersonal[i.key] !== undefined);
  const vAllDone     = !goal?.hasVehicle || VEHICLE_ITEMS.every(i => {
    const v = mVehicle[i.key];
    return i.isNumber ? (v !== undefined && v !== null && v !== '') : v !== undefined;
  });

  const canNext = modalStep === 0 ? pAllDone : vAllDone;
  const isLast  = modalStep === STEPS_DEF.length - 1;

  const handleGenerate = async () => {
    setGenerating(true);
    setSendStatus(null);
    try {
      const pMissing   = mPNotes || PERSONAL_ITEMS.filter(i => mPersonal[i.key] === false).map(i => i.label).join(', ') || null;
      const vMissing   = mVNotes || VEHICLE_ITEMS.filter(i => !i.isNumber && mVehicle[i.key] === false).map(i => i.label).join(', ') || null;
      const hasMissing = pHasMissing || vHasMissing;
      const now        = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

      // 1. Crear log si no existe y guardar datos del checklist en BD
      let logId = existingLog?.id;
      if (!logId) {
        const createRes = await apiFetch('/api/tech-attendance/log', {
          method: 'POST',
          body: JSON.stringify({ techId: goal.techId, goalId: goal.id }),
        });
        if (createRes.ok) {
          const created = await createRes.json();
          logId = created.id;
        }
      }
      if (logId) {
        await apiFetch('/api/tech-attendance/log', {
          method: 'PATCH',
          body: JSON.stringify({
            id: logId,
            checklistPersonal:  mPersonal,
            checklistVehicle:   goal.hasVehicle ? mVehicle : null,
            personalMissing:    pMissing,
            vehicleMissing:     vMissing,
            personalReportSent: pHasMissing || false,
            vehicleReportSent:  (goal.hasVehicle && vHasMissing) || false,
            checkInTime:        existingLog?.checkInTime || now,
            status:             'COMPLETE',
          }),
        });
      }

      // 2. Generar PDF
      const checkInTime = existingLog?.checkInTime || now;
      const { blob, filename } = await generateAttendanceReportPDF(
        { date: goal.date, checklistPersonal: mPersonal,
          checklistVehicle: goal.hasVehicle ? mVehicle : null,
          personalMissing: pMissing, vehicleMissing: vMissing, checkInTime },
        techName, goal, goal?.hasVehicle ? 'both' : 'personal'
      );

      // 3. Enviar PDF al supervisor vía Telegram
      setSendStatus('sending');
      const pdfBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const caption = hasMissing
        ? `⚠️ <b>Reporte de Faltantes</b>\n👷 <b>Técnico:</b> ${techName}${goal?.otNumber ? `\n🔧 <b>OT:</b> ${goal.otNumber}` : ''}\n👤 <b>Cliente:</b> ${goal?.clientName || '—'}`
        : `✅ <b>Checklist Completado</b>\n👷 <b>Técnico:</b> ${techName}${goal?.otNumber ? `\n🔧 <b>OT:</b> ${goal.otNumber}` : ''}\n👤 <b>Cliente:</b> ${goal?.clientName || '—'}`;

      const res = await apiFetch('/api/tech-attendance/send-report', {
        method: 'POST',
        body: JSON.stringify({ pdfBase64, filename, caption }),
      });
      setSendStatus(res.ok ? 'sent' : 'error');
    } catch {
      alert('Error al generar PDF');
      setSendStatus('error');
    } finally { setGenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">

        {/* ── Header identificación ── */}
        <div className="bg-gray-950 p-6 rounded-t-3xl shrink-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-0.5">Checklist de asistencia</p>
              <div className="flex items-center gap-2 flex-wrap">
                {goal?.otNumber && (
                  <span className="text-[9px] font-black text-blue-400 bg-blue-900/40 px-2 py-0.5 rounded-full border border-blue-800/50 uppercase tracking-widest">
                    {goal.otNumber}
                  </span>
                )}
                {goal?.hasVehicle && (
                  <span className="text-[9px] font-black text-indigo-400 bg-indigo-900/40 px-2 py-0.5 rounded-full border border-indigo-800/50 uppercase tracking-widest flex items-center gap-1">
                    <Car className="h-2.5 w-2.5" /> Vehículo
                  </span>
                )}
              </div>
              <p className="text-base font-black text-white mt-1 truncate">{goal?.clientName || '—'}</p>
              {goal?.clientLocation && <p className="text-[11px] font-bold text-gray-400 truncate">{goal.clientLocation}</p>}
            </div>
            <button onClick={onClose}
              className="h-9 w-9 rounded-2xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Datos técnico + fecha */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{techName}</span>
            {dateLabel && <><span className="text-gray-600">·</span><span className="text-[9px] font-bold text-gray-500">{dateLabel}</span></>}
            {existingLog?.checkInTime && <><span className="text-gray-600">·</span><span className="text-[9px] font-black text-emerald-400 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{existingLog.checkInTime}</span></>}
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2">
            {STEPS_DEF.map((s, i) => (
              <React.Fragment key={s}>
                <div className={cn('flex flex-col items-center gap-0.5', i <= modalStep ? 'opacity-100' : 'opacity-30')}>
                  <div className={cn(
                    'h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-black border-2 transition-all',
                    i < modalStep  ? 'bg-emerald-500 border-emerald-500 text-white' :
                    i === modalStep ? 'bg-primary border-primary text-white' :
                                     'bg-white/10 border-white/20 text-white'
                  )}>
                    {i < modalStep ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                  </div>
                  <p className="text-[7px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">{s}</p>
                </div>
                {i < STEPS_DEF.length - 1 && (
                  <div className={cn('h-0.5 flex-1 -mt-4 transition-all', i < modalStep ? 'bg-emerald-400' : 'bg-white/20')} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Contenido scrollable ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">

          {/* Paso 0: Equipo Personal */}
          {modalStep === 0 && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900">Equipo Personal</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Uniforme · EPP · Herramientas</p>
                </div>
              </div>
              <div className="space-y-3">
                {PERSONAL_ITEMS.map(item => (
                  <CheckItem key={item.key} item={item} value={mPersonal[item.key]}
                    onChange={(k, v) => setMPersonal(p => ({ ...p, [k]: v }))} disabled={false} />
                ))}
              </div>
              {pHasMissing && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-xs font-bold text-amber-700">Ítems faltantes — se incluirán en el reporte PDF.</p>
                  </div>
                  <textarea value={mPNotes} onChange={e => setMPNotes(e.target.value)}
                    placeholder="Detalla qué falta en el equipo personal..." rows={2}
                    className="w-full border border-amber-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-amber-50/50" />
                </div>
              )}
            </>
          )}

          {/* Paso 1 (vehículo): solo si aplica */}
          {goal?.hasVehicle && modalStep === 1 && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <Car className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900">Vehículo</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Combustible · Limpieza · Funcionalidad</p>
                </div>
              </div>
              <div className="space-y-3">
                {VEHICLE_ITEMS.map(item => (
                  <CheckItem key={item.key} item={item} value={mVehicle[item.key]}
                    onChange={(k, v) => setMVehicle(p => ({ ...p, [k]: v }))} disabled={false} />
                ))}
              </div>
              {vHasMissing && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-xs font-bold text-amber-700">Recursos faltantes — se incluirán en el reporte.</p>
                  </div>
                  <textarea value={mVNotes} onChange={e => setMVNotes(e.target.value)}
                    placeholder="Detalla recursos o reparaciones necesarias..." rows={2}
                    className="w-full border border-amber-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-amber-50/50" />
                </div>
              )}
            </>
          )}

          {/* Paso final: Resumen */}
          {isLast && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Resumen del checklist</p>
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Equipo personal</p>
                  {PERSONAL_ITEMS.map(i => (
                    <div key={i.key} className="flex items-center gap-2">
                      {mPersonal[i.key] === true
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                      <span className="text-xs font-bold text-gray-700">{i.label}</span>
                    </div>
                  ))}
                </div>
                {goal?.hasVehicle && (
                  <div className="border-t border-gray-200 pt-3 space-y-1.5">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Vehículo</p>
                    {VEHICLE_ITEMS.map(i => {
                      const val = mVehicle[i.key];
                      return (
                        <div key={i.key} className="flex items-center gap-2">
                          {i.isNumber
                            ? <Gauge className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                            : val ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                          <span className="text-xs font-bold text-gray-700">
                            {i.isNumber
                              ? `${i.label}: ${val != null && val !== '' ? `${Number(val).toLocaleString()} km` : '—'}`
                              : i.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <button onClick={handleGenerate} disabled={generating || sendStatus === 'sent'}
                className={cn(
                  'w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50',
                  sendStatus === 'sent'
                    ? 'bg-emerald-500 text-white'
                    : (pHasMissing || vHasMissing)
                      ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                )}>
                <Send className="h-4 w-4" />
                {generating
                  ? 'Generando PDF...'
                  : sendStatus === 'sending'
                  ? 'Enviando a supervisores...'
                  : sendStatus === 'sent'
                  ? 'PDF enviado a supervisores ✓'
                  : sendStatus === 'error'
                  ? 'Error al enviar — reintentar'
                  : (pHasMissing || vHasMissing)
                  ? 'Generar y Enviar Reporte de Faltantes'
                  : 'Descargar y Enviar Reporte al Supervisor'}
              </button>
            </div>
          )}
        </div>

        {/* ── Navegación ── */}
        <div className="p-5 border-t border-gray-100 flex gap-3 shrink-0">
          {modalStep > 0 && (
            <button onClick={() => setModalStep(s => s - 1)}
              className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl border border-gray-200 text-gray-600 text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">
              <ChevronLeft className="h-4 w-4" /> Atrás
            </button>
          )}
          {!isLast && (
            <button onClick={() => setModalStep(s => s + 1)} disabled={!canNext}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-primary text-white text-[11px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-40">
              Siguiente <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {isLast && modalStep === 0 && (
            // Solo 1 paso (sin vehículo) y ya es el resumen — botón ya está arriba, no necesita nav
            null
          )}
        </div>
      </div>
    </div>
  );
}

// ── Vista principal ──────────────────────────────────────────────────────────
export default function TechDailyAttendance() {
  const { user } = useAuth();
  const today = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  })();
  const navigate = useNavigate();

  const [goals,        setGoals]        = useState([]);
  const [upcoming,     setUpcoming]     = useState([]);
  const [log,          setLog]          = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);
  const [checklistModal, setChecklistModal] = useState(null);

  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [goalRes, upcomingRes, logRes] = await Promise.all([
        apiFetch(`/api/tech-attendance/goals?techId=${userId}&date=${today}`),
        apiFetch(`/api/tech-attendance/goals?techId=${userId}&upcoming=true`),
        apiFetch(`/api/tech-attendance/log?techId=${userId}&date=${today}`),
      ]);
      const allGoals     = goalRes.ok     ? await goalRes.json()     : [];
      const upcomingData = upcomingRes.ok ? await upcomingRes.json() : [];
      const logData      = logRes.ok      ? await logRes.json()      : null;
      setGoals(Array.isArray(allGoals) ? allGoals : []);
      setUpcoming(Array.isArray(upcomingData) ? upcomingData : []);
      setLog(logData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [userId, today]);

  useEffect(() => {
    if (!userId) return;
    load();
  }, [userId, load]);

  const confirmGoal = async (goalId, confirmed) => {
    setConfirmingId(goalId);
    try {
      const res = await apiFetch('/api/tech-attendance/goals', {
        method: 'POST',
        body: JSON.stringify({ id: goalId, confirmed }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setUpcoming(prev => prev.map(g => g.id === goalId ? { ...g, confirmed: updated.confirmed } : g));
    } catch { alert('Error al confirmar'); }
    finally { setConfirmingId(null); }
  };

  const hasGoals = goals.length > 0;

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-20">

      {/* ── Modal checklist ── */}
      {checklistModal && (
        <ChecklistModal
          goal={checklistModal}
          techName={user.name}
          log={log}
          onClose={() => { setChecklistModal(null); load(); }}
        />
      )}

      {/* ── Header ── */}
      <div className="bg-gray-950 rounded-[2.5rem] p-7 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })}
        </p>
        <h1 className="text-2xl font-black leading-tight">Mi Asistencia</h1>

        {/* Metas / OTs del día */}
        <div className="mt-4 space-y-2">
          {goals.length === 0 ? (
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <p className="text-[11px] font-bold text-gray-500 text-center">Sin metas asignadas hoy</p>
            </div>
          ) : goals.map(g => (
            <div key={g.id} className="bg-white/8 rounded-2xl p-4 space-y-2 border border-white/10">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9px] font-black text-primary uppercase tracking-widest">Meta del día</p>
                <div className="flex items-center gap-2">
                  {g.hasVehicle && (
                    <span className="text-[9px] font-black text-indigo-400 bg-indigo-900/40 px-2 py-0.5 rounded-full border border-indigo-800/50 uppercase tracking-widest flex items-center gap-1">
                      <Car className="h-2.5 w-2.5" /> Vehículo
                    </span>
                  )}
                  {g.otNumber && (
                    <span className="text-[9px] font-black text-blue-400 bg-blue-900/40 px-2 py-0.5 rounded-full border border-blue-800/50 uppercase tracking-widest">
                      {g.otNumber}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User2 className="h-4 w-4 text-gray-400 shrink-0" />
                <p className="text-sm font-black text-white">{g.clientName}</p>
              </div>
              {g.clientLocation && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                  <p className="text-xs font-bold text-gray-300">{g.clientLocation}</p>
                </div>
              )}
              {g.notes && (
                <div className="border-t border-white/10 pt-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3 w-3 text-amber-400" />
                    <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Metas</p>
                  </div>
                  <p className="text-[11px] text-gray-400 font-bold">{g.notes}</p>
                </div>
              )}
              <div className="flex gap-2 mt-1">
                  {g.otNumber && (
                    <button onClick={() => navigate(`/ots/${g.otNumber}`)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-[11px] font-black uppercase tracking-widest hover:bg-blue-600/30 transition-all">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ir a OT {g.otNumber}
                    </button>
                  )}
                  <button onClick={() => setChecklistModal(g)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">
                    <ClipboardList className="h-3.5 w-3.5" />
                    Checklist
                  </button>
                </div>
            </div>
          ))}
        </div>

      </div>

      {/* ── Próximas Órdenes ── */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-violet-50 flex items-center justify-center">
              <ClipboardList className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Próximas Órdenes</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Confirma tu asistencia con anticipación</p>
            </div>
          </div>

          <div className="space-y-3">
            {upcoming.map(g => {
              const dateOnly  = new Date(g.date).toISOString().slice(0, 10);
              const dateLabel = new Date(dateOnly + 'T12:00:00Z').toLocaleDateString('es-MX', {
                weekday: 'short', day: '2-digit', month: 'short',
              });
              const isConfirming = confirmingId === g.id;

              return (
                <div key={g.id} className={cn(
                  'rounded-2xl border p-4 space-y-3 transition-all',
                  g.confirmed ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'
                )}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={cn(
                      'text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border',
                      g.confirmed ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-violet-100 text-violet-700 border-violet-200'
                    )}>
                      {dateLabel}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {g.hasVehicle && (
                        <span className="text-[9px] font-black text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200 uppercase tracking-widest flex items-center gap-1">
                          <Car className="h-2.5 w-2.5" /> Vehículo
                        </span>
                      )}
                      {g.otNumber && (
                        <span className="text-[9px] font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-200 uppercase tracking-widest">
                          {g.otNumber}
                        </span>
                      )}
                      {g.confirmed && (
                        <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Confirmado
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <p className="text-sm font-black text-gray-900">{g.clientName}</p>
                    </div>
                    {g.clientLocation && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <p className="text-xs font-bold text-gray-500">{g.clientLocation}</p>
                      </div>
                    )}
                    {g.notes && (
                      <div className="flex items-start gap-2 pt-1">
                        <Target className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-gray-600">{g.notes}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    {!g.confirmed ? (
                      <button onClick={() => confirmGoal(g.id, true)} disabled={isConfirming}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {isConfirming ? 'Guardando...' : 'Confirmar'}
                      </button>
                    ) : (
                      <button onClick={() => confirmGoal(g.id, false)} disabled={isConfirming}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-[11px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200 transition-all disabled:opacity-50">
                        <RotateCcw className="h-3.5 w-3.5" />
                        {isConfirming ? 'Guardando...' : 'Cancelar'}
                      </button>
                    )}
                    <button onClick={() => setChecklistModal(g)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-blue-600 border border-blue-200 text-[11px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Checklist
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
