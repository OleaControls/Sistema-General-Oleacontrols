import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, User2, Clock, CheckCircle2, XCircle, AlertTriangle, ChevronRight, ChevronLeft,
  Send, ShieldCheck, Car, Fuel, Sparkles, Gauge, HardHat, Glasses, Hand, Footprints,
  Wrench, Zap, ClipboardList, CheckCheck, RotateCcw, ExternalLink, Target, X, ChevronDown, Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';
import { generateAttendanceReportPDF } from '../utils/attendanceReportPDF';

// ── EPP — posiciones sobre la imagen corporal del técnico ────────────────────
const EPP_SPOTS = [
  { key: 'casco',   label: 'Casco',   icon: HardHat,    top: '9%',  left: '50%', labelLeft: true },
  { key: 'lentes',  label: 'Lentes',  icon: Glasses,    top: '17%', left: '67%' },
  { key: 'chaleco', label: 'Chaleco', icon: ShieldCheck, top: '35%', left: '50%' },
  { key: 'guantes', label: 'Guantes', icon: Hand,       top: '57%', left: '76%' },
  { key: 'botas',   label: 'Botas',   icon: Footprints, top: '87%', left: '50%' },
];

// ── Herramientas — sin hotspot en imagen ─────────────────────────────────────
const TOOLS_ITEMS = [
  { key: 'toolsGeneral', label: 'Herramientas generales',  icon: Wrench },
  { key: 'toolsSpecial', label: 'Herramientas especiales', icon: Zap    },
];

const VEHICLE_ITEMS = [
  { key: 'fuel',          label: 'Combustible suficiente',               icon: Fuel },
  { key: 'cleanInterior', label: 'Limpieza interior',                    icon: Sparkles },
  { key: 'cleanExterior', label: 'Estética exterior',                    icon: Car },
  { key: 'odometer',      label: 'Tacómetro',  icon: Gauge, isNumber: true },
  { key: 'functionality', label: 'Funcionalidad (luces, frenos, motor)', icon: CheckCheck },
];

// ── EppVisualStep — imagen + hotspots + tarjetas ─────────────────────────────
function EppVisualStep({ values, onChange }) {
  const doneCount = EPP_SPOTS.filter(s => values[s.key] !== undefined).length;

  return (
    <div className="space-y-5">
      {/* Imagen técnico con indicadores de estado */}
      <div className="flex justify-center">
        <div className="relative w-full max-w-[240px] aspect-square mx-auto">
          <img
            src="/tecnicos/svgtec.svg"
            className="w-full h-full object-contain select-none pointer-events-none"
            alt="Técnico EPP"
            draggable={false}
          />
          {EPP_SPOTS.map(({ key, label, top, left, labelLeft }) => {
            const v = values[key];
            const pill = (
              <span className={cn(
                'text-[7px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-sm',
                v === true  ? 'bg-emerald-500 text-white' :
                v === false ? 'bg-red-500 text-white' :
                              'bg-gray-900/80 text-white'
              )}>
                {label}
              </span>
            );
            const dot = (
              <div className={cn(
                'h-6 w-6 rounded-full border-2 border-white shadow-lg transition-all duration-300 flex items-center justify-center shrink-0',
                v === true  ? 'bg-emerald-500' :
                v === false ? 'bg-red-500' :
                              'bg-gray-500/80 animate-pulse'
              )}>
                {v === true  && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                {v === false && <XCircle       className="h-3.5 w-3.5 text-white" />}
              </div>
            );
            return (
              <button
                key={key}
                onClick={() => onChange(key, v === true ? false : true)}
                style={{ top, left, transform: 'translate(-50%, -50%)' }}
                className="absolute z-10 flex flex-col items-center gap-0.5 active:scale-95 transition-transform touch-manipulation"
              >
                <div className="relative flex items-center">
                  {labelLeft && (
                    <span className="absolute right-full mr-1.5">{pill}</span>
                  )}
                  {dot}
                </div>
                {!labelLeft && pill}
              </button>
            );
          })}
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${(doneCount / EPP_SPOTS.length) * 100}%` }}
          />
        </div>
        <span className="text-[10px] font-black text-gray-500 tabular-nums shrink-0">
          {doneCount}/{EPP_SPOTS.length}
        </span>
      </div>

      {/* Tarjetas de verificación */}
      <div className="space-y-2">
        {EPP_SPOTS.map(({ key, label, icon: Icon }) => {
          const v = values[key];
          return (
            <div
              key={key}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border transition-all',
                v === true  ? 'bg-emerald-50 border-emerald-200' :
                v === false ? 'bg-red-50 border-red-200' :
                              'bg-gray-50 border-gray-100'
              )}
            >
              <div className={cn(
                'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                v === true  ? 'bg-emerald-100 text-emerald-600' :
                v === false ? 'bg-red-100 text-red-600' :
                              'bg-white text-gray-400 border border-gray-200'
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-bold text-gray-800 flex-1">{label}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onChange(key, true)}
                  className={cn(
                    'min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center border transition-all touch-manipulation',
                    v === true
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-400 active:border-emerald-400 active:text-emerald-500'
                  )}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onChange(key, false)}
                  className={cn(
                    'min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center border transition-all touch-manipulation',
                    v === false
                      ? 'bg-red-500 border-red-500 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-400 active:border-red-400 active:text-red-500'
                  )}
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Herramientas (sin hotspot) ── */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-gray-200" />
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Herramientas</p>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
        {TOOLS_ITEMS.map(({ key, label, icon: Icon }) => {
          const v = values[key];
          return (
            <div
              key={key}
              className={cn(
                'flex items-center gap-3 p-3 rounded-2xl border transition-all',
                v === true  ? 'bg-emerald-50 border-emerald-200' :
                v === false ? 'bg-red-50 border-red-200' :
                              'bg-gray-50 border-gray-100'
              )}
            >
              <div className={cn(
                'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                v === true  ? 'bg-emerald-100 text-emerald-600' :
                v === false ? 'bg-red-100 text-red-600' :
                              'bg-white text-gray-400 border border-gray-200'
              )}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-bold text-gray-800 flex-1">{label}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => onChange(key, true)}
                  className={cn(
                    'min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center border transition-all touch-manipulation',
                    v === true
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-400 active:border-emerald-400 active:text-emerald-500'
                  )}
                >
                  <CheckCircle2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onChange(key, false)}
                  className={cn(
                    'min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center border transition-all touch-manipulation',
                    v === false
                      ? 'bg-red-500 border-red-500 text-white shadow-sm'
                      : 'bg-white border-gray-200 text-gray-400 active:border-red-400 active:text-red-500'
                  )}
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

  const [modalStep,       setModalStep]       = useState(0);
  const [mPersonal,       setMPersonal]       = useState({});
  const [mVehicle,        setMVehicle]        = useState({});
  const [mPNotes,         setMPNotes]         = useState('');
  const [mVNotes,         setMVNotes]         = useState('');
  const [generating,      setGenerating]      = useState(false);
  const [downloading,     setDownloading]     = useState(false);
  const [sendStatus,      setSendStatus]      = useState(null);
  const [headerExpanded,  setHeaderExpanded]  = useState(false);

  const dateLabel = (() => {
    if (!goal?.date) return '';
    const dateOnly = new Date(goal.date).toISOString().slice(0, 10);
    return new Date(dateOnly + 'T12:00:00Z').toLocaleDateString('es-MX', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    });
  })();

  const ALL_PERSONAL = [...EPP_SPOTS, ...TOOLS_ITEMS];
  const pHasMissing  = ALL_PERSONAL.some(i => mPersonal[i.key] === false);
  const vHasMissing  = goal?.hasVehicle && VEHICLE_ITEMS.filter(i => !i.isNumber).some(i => mVehicle[i.key] === false);
  const pAllDone     = ALL_PERSONAL.every(i => mPersonal[i.key] !== undefined);
  const vAllDone     = !goal?.hasVehicle || VEHICLE_ITEMS.every(i => {
    const v = mVehicle[i.key];
    return i.isNumber ? (v !== undefined && v !== null && v !== '') : v !== undefined;
  });

  const canNext = modalStep === 0 ? pAllDone : vAllDone;
  const isLast  = modalStep === STEPS_DEF.length - 1;

  // PDF solo se genera cuando todo está respondido y si hay faltantes, las notas están llenas
  const pNotesRequired = pHasMissing && mPNotes.trim() === '';
  const vNotesRequired = goal?.hasVehicle && vHasMissing && mVNotes.trim() === '';
  const canGenerate = pAllDone && vAllDone && !pNotesRequired && !vNotesRequired;

  const buildPdfParams = () => {
    const now         = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
    const pMissing    = mPNotes || ALL_PERSONAL.filter(i => mPersonal[i.key] === false).map(i => i.label).join(', ') || null;
    const vMissing    = mVNotes || VEHICLE_ITEMS.filter(i => !i.isNumber && mVehicle[i.key] === false).map(i => i.label).join(', ') || null;
    const checkInTime = existingLog?.checkInTime || now;
    const type        = goal?.hasVehicle ? 'both' : 'personal';
    const logData     = { date: goal.date, checklistPersonal: mPersonal,
                          checklistVehicle: goal.hasVehicle ? mVehicle : null,
                          personalMissing: pMissing, vehicleMissing: vMissing, checkInTime };
    return { now, pMissing, vMissing, checkInTime, type, logData };
  };

  const saveLog = async (pMissing, vMissing, now) => {
    let logId = existingLog?.id;
    if (!logId) {
      const r = await apiFetch('/api/tech-attendance/log', {
        method: 'POST',
        body: JSON.stringify({ techId: goal.techId, goalId: goal.id }),
      });
      if (r.ok) logId = (await r.json()).id;
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
  };

  // Botón principal: guarda en BD + envía PDF a supervisores (sin descarga local)
  const handleSend = async () => {
    setGenerating(true);
    setSendStatus(null);
    try {
      const { now, pMissing, vMissing, type, logData } = buildPdfParams();
      await saveLog(pMissing, vMissing, now);

      const { blob, filename } = await generateAttendanceReportPDF(
        logData, techName, goal, type, { download: false }
      );

      setSendStatus('sending');
      const pdfBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const hasMissing = pHasMissing || vHasMissing;
      const caption = hasMissing
        ? `⚠️ <b>Reporte de Faltantes</b>\n👷 <b>Técnico:</b> ${techName}${goal?.otNumber ? `\n🔧 <b>OT:</b> ${goal.otNumber}` : ''}\n👤 <b>Cliente:</b> ${goal?.clientName || '—'}`
        : `✅ <b>Checklist Completado</b>\n👷 <b>Técnico:</b> ${techName}${goal?.otNumber ? `\n🔧 <b>OT:</b> ${goal.otNumber}` : ''}\n👤 <b>Cliente:</b> ${goal?.clientName || '—'}`;

      const res = await apiFetch('/api/tech-attendance/send-report', {
        method: 'POST',
        body: JSON.stringify({ pdfBase64, filename, caption }),
      });
      setSendStatus(res.ok ? 'sent' : 'error');
    } catch {
      alert('Error al enviar reporte');
      setSendStatus('error');
    } finally { setGenerating(false); }
  };

  // Botón opcional: descarga PDF localmente
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { now, pMissing, vMissing, type, logData } = buildPdfParams();
      await saveLog(pMissing, vMissing, now);
      await generateAttendanceReportPDF(logData, techName, goal, type, { download: true });
    } catch {
      alert('Error al descargar PDF');
    } finally { setDownloading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center touch-none">
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl flex flex-col overflow-hidden shadow-2xl"
        style={{ maxHeight: 'min(92dvh, 92svh, 92vh)' }}
      >

        {/* ── Header comprimible ── */}
        <div className="bg-gray-950 px-4 pt-4 pb-3 rounded-t-3xl shrink-0">

          {/* Fila principal — siempre visible */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-wrap">
              {goal?.otNumber && (
                <span className="text-[8px] font-black text-blue-400 bg-blue-900/40 px-2 py-0.5 rounded-full border border-blue-800/50 uppercase tracking-widest shrink-0">
                  {goal.otNumber}
                </span>
              )}
              {goal?.hasVehicle && (
                <span className="text-[8px] font-black text-indigo-400 bg-indigo-900/40 px-2 py-0.5 rounded-full border border-indigo-800/50 uppercase tracking-widest flex items-center gap-1 shrink-0">
                  <Car className="h-2.5 w-2.5" /> Vehículo
                </span>
              )}
              <p className="text-sm font-black text-white truncate">{goal?.clientName || '—'}</p>
            </div>
            <button
              onClick={() => setHeaderExpanded(e => !e)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white/60 hover:text-white active:bg-white/20 transition-all shrink-0 touch-manipulation"
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', headerExpanded ? 'rotate-180' : '')} />
            </button>
            <button onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white hover:text-white/70 active:bg-white/20 transition-all shrink-0 touch-manipulation">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Detalles expandibles */}
          {headerExpanded && (
            <div className="mb-3 pb-3 border-b border-white/10 space-y-1">
              {goal?.clientLocation && (
                <p className="text-[10px] font-bold text-gray-400 truncate">{goal.clientLocation}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{techName}</span>
                {dateLabel && (
                  <><span className="text-gray-600">·</span>
                  <span className="text-[8px] font-bold text-gray-500">{dateLabel}</span></>
                )}
                {existingLog?.checkInTime && (
                  <><span className="text-gray-600">·</span>
                  <span className="text-[8px] font-black text-emerald-400 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />{existingLog.checkInTime}
                  </span></>
                )}
              </div>
            </div>
          )}

          {/* Stepper — siempre visible */}
          <div className="flex items-center gap-2">
            {STEPS_DEF.map((s, i) => (
              <React.Fragment key={s}>
                <div className={cn('flex flex-col items-center gap-0.5', i <= modalStep ? 'opacity-100' : 'opacity-30')}>
                  <div className={cn(
                    'h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-black border-2 transition-all',
                    i < modalStep   ? 'bg-emerald-500 border-emerald-500 text-white' :
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
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* Paso 0: EPP — Equipo de Protección Personal */}
          {modalStep === 0 && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900">Equipo Personal</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Casco · Lentes · Chaleco · Guantes · Botas</p>
                </div>
              </div>
              <EppVisualStep
                values={mPersonal}
                onChange={(k, v) => setMPersonal(p => ({ ...p, [k]: v }))}
              />
              {pHasMissing && (
                <div className="space-y-2 pt-2">
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
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">EPP</p>
                  {EPP_SPOTS.map(s => (
                    <div key={s.key} className="flex items-center gap-2">
                      {mPersonal[s.key] === true
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                      <span className="text-xs font-bold text-gray-700">{s.label}</span>
                    </div>
                  ))}
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-2 mb-1">Herramientas</p>
                  {TOOLS_ITEMS.map(t => (
                    <div key={t.key} className="flex items-center gap-2">
                      {mPersonal[t.key] === true
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                      <span className="text-xs font-bold text-gray-700">{t.label}</span>
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

              {/* Aviso cuando faltan notas de recursos faltantes */}
              {(pNotesRequired || vNotesRequired) && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-amber-700">
                    {pNotesRequired && vNotesRequired
                      ? 'Describe los recursos faltantes del equipo personal y del vehículo para poder generar el reporte.'
                      : pNotesRequired
                      ? 'Describe qué falta en el equipo personal para poder generar el reporte.'
                      : 'Describe los recursos faltantes del vehículo para poder generar el reporte.'}
                  </p>
                </div>
              )}

              {/* Botón principal: Enviar a supervisores */}
              <button
                onClick={handleSend}
                disabled={!canGenerate || generating || sendStatus === 'sent'}
                className={cn(
                  'w-full min-h-[52px] rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 touch-manipulation',
                  sendStatus === 'sent'
                    ? 'bg-emerald-500 text-white'
                    : (pHasMissing || vHasMissing)
                      ? 'bg-amber-500 text-white active:bg-amber-600 shadow-lg shadow-amber-200'
                      : 'bg-blue-600 text-white active:bg-blue-700 shadow-lg shadow-blue-200'
                )}
              >
                <Send className="h-4 w-4" />
                {generating
                  ? 'Generando...'
                  : sendStatus === 'sending'
                  ? 'Enviando a supervisores...'
                  : sendStatus === 'sent'
                  ? 'Reporte enviado a supervisores ✓'
                  : sendStatus === 'error'
                  ? 'Error al enviar — reintentar'
                  : (pHasMissing || vHasMissing)
                  ? 'Enviar Reporte de Faltantes'
                  : 'Enviar Reporte al Supervisor'}
              </button>

              {/* Botón secundario: Descargar PDF (opcional) */}
              <button
                onClick={handleDownload}
                disabled={!canGenerate || downloading || generating}
                className="w-full min-h-[44px] rounded-2xl border border-gray-200 text-gray-500 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:bg-gray-50 disabled:opacity-40 touch-manipulation"
              >
                <Download className="h-3.5 w-3.5" />
                {downloading ? 'Generando PDF...' : 'Descargar PDF (opcional)'}
              </button>
            </div>
          )}
        </div>

        {/* ── Navegación ── */}
        <div
          className="px-4 pt-3 border-t border-gray-100 flex gap-3 shrink-0"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          {modalStep > 0 && (
            <button onClick={() => setModalStep(s => s - 1)}
              className="flex items-center justify-center gap-1.5 px-5 min-h-[48px] rounded-2xl border border-gray-200 text-gray-600 text-[11px] font-black uppercase tracking-widest active:bg-gray-50 transition-all touch-manipulation">
              <ChevronLeft className="h-4 w-4" /> Atrás
            </button>
          )}
          {!isLast && (
            <button onClick={() => setModalStep(s => s + 1)} disabled={!canNext}
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[48px] rounded-2xl bg-primary text-white text-[11px] font-black uppercase tracking-widest active:bg-primary/90 transition-all disabled:opacity-40 touch-manipulation">
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
