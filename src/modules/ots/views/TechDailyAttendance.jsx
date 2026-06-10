import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, User2, Clock, CheckCircle2, XCircle, AlertTriangle, ChevronRight,
  Send, Wrench, ShieldCheck, Car, Fuel, Sparkles, Gauge, Zap, HardHat,
  Package, ClipboardList, CheckCheck, RotateCcw, ExternalLink, Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';
import { generateAttendanceReportPDF } from '../utils/attendanceReportPDF';

// ── Constantes de checklist ──────────────────────────────────────────────────
const PERSONAL_ITEMS = [
  { key: 'uniform',     label: 'Uniforme completo',            icon: User2 },
  { key: 'epp',         label: 'EPP (casco, lentes, guantes, botas)', icon: HardHat },
  { key: 'toolsBasic',  label: 'Herramientas básicas',          icon: Wrench },
  { key: 'toolsSpecial',label: 'Herramientas especiales',       icon: Zap },
  { key: 'materials',   label: 'Materiales / Refacciones',      icon: Package },
];

const VEHICLE_ITEMS = [
  { key: 'fuel',          label: 'Combustible suficiente',               icon: Fuel },
  { key: 'cleanInterior', label: 'Limpieza interior',                    icon: Sparkles },
  { key: 'cleanExterior', label: 'Estética exterior',                    icon: Car },
  { key: 'odometer',      label: 'Tacómetro',  icon: Gauge, isNumber: true },
  { key: 'functionality', label: 'Funcionalidad (luces, frenos, motor)', icon: CheckCheck },
];

// ── Componente item checklist ────────────────────────────────────────────────
function CheckItem({ item, value, onChange, disabled }) {
  const Icon = item.icon;

  // Ítem numérico (ej. tacómetro)
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
            type="number"
            min="0"
            value={value ?? ''}
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

  // Ítem booleano estándar
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
          <button
            onClick={() => onChange(item.key, true)}
            className={cn(
              'h-8 w-8 rounded-xl flex items-center justify-center border transition-all',
              value === true ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-emerald-400 hover:text-emerald-500'
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onChange(item.key, false)}
            className={cn(
              'h-8 w-8 rounded-xl flex items-center justify-center border transition-all',
              value === false ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-500'
            )}
          >
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

// ── Vista principal ──────────────────────────────────────────────────────────
export default function TechDailyAttendance() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);

  const navigate = useNavigate();

  const [log,           setLog]           = useState(null);   // TechAttendanceLog
  const [goals,         setGoals]         = useState([]);     // TechDailyGoal[]
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);

  // Checklist state
  const [personal,      setPersonal]      = useState({});
  const [vehicle,       setVehicle]       = useState({});
  const [personalNotes, setPersonalNotes] = useState('');
  const [vehicleNotes,  setVehicleNotes]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logRes, goalRes] = await Promise.all([
        apiFetch(`/api/tech-attendance/log?techId=${user.id}&date=${today}`),
        apiFetch(`/api/tech-attendance/goals?techId=${user.id}&date=${today}`),
      ]);
      const logData   = logRes.ok  ? await logRes.json()  : null;
      const allGoals  = goalRes.ok ? await goalRes.json() : [];
      setLog(logData);
      setGoals(Array.isArray(allGoals) ? allGoals : []);
      if (logData) {
        setPersonal(logData.checklistPersonal || {});
        setVehicle(logData.checklistVehicle  || {});
        setPersonalNotes(logData.personalMissing || '');
        setVehicleNotes(logData.vehicleMissing   || '');
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user.id, today]);

  useEffect(() => { load(); }, [load]);

  // ── Check-in ────────────────────────────────────────────────────────────
  const handleCheckIn = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/tech-attendance/log', {
        method: 'POST',
        body: JSON.stringify({ techId: user.id, goalId: goals[0]?.id || null }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLog(data);
    } catch { alert('Error al registrar entrada'); }
    finally { setSaving(false); }
  };

  // ── Guardar checklist personal ───────────────────────────────────────────
  const savePersonalChecklist = async (sendReport) => {
    setSaving(true);
    try {
      const missingText = personalNotes || buildMissingText(PERSONAL_ITEMS, personal);
      const data = {
        id: log.id,
        checklistPersonal: personal,
        step: 'VEHICLE',
        ...(sendReport && {
          personalMissing: missingText,
          personalReportSent: true,
        }),
      };
      const res = await apiFetch('/api/tech-attendance/log', { method: 'PATCH', body: JSON.stringify(data) });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setLog(updated);
      // Generar y descargar PDF del reporte si hay faltantes
      if (sendReport) {
        generateAttendanceReportPDF(
          { ...updated, checklistPersonal: personal, personalMissing: missingText },
          user.name,
          goals[0] || null,
          'personal'
        );
      }
    } catch { alert('Error al guardar'); }
    finally { setSaving(false); }
  };

  // ── Guardar checklist vehículo ───────────────────────────────────────────
  const saveVehicleChecklist = async (sendReport) => {
    setSaving(true);
    try {
      const missingText = vehicleNotes || buildMissingText(VEHICLE_ITEMS.filter(i => !i.isNumber), vehicle);
      const data = {
        id: log.id,
        checklistVehicle: vehicle,
        step: 'DONE',
        status: 'COMPLETE',
        ...(sendReport && {
          vehicleMissing: missingText,
          vehicleReportSent: true,
        }),
      };
      const res = await apiFetch('/api/tech-attendance/log', { method: 'PATCH', body: JSON.stringify(data) });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setLog(updated);
      // Generar y descargar PDF del reporte si hay faltantes
      if (sendReport) {
        generateAttendanceReportPDF(
          { ...updated, checklistVehicle: vehicle, vehicleMissing: missingText },
          user.name,
          goals[0] || null,
          'vehicle'
        );
      }
    } catch { alert('Error al guardar'); }
    finally { setSaving(false); }
  };

  const buildMissingText = (items, values) =>
    items.filter(i => values[i.key] === false).map(i => i.label).join(', ');

  const allPersonalAnswered = PERSONAL_ITEMS.every(i => personal[i.key] !== undefined);
  const allVehicleAnswered  = VEHICLE_ITEMS.every(i => {
    const v = vehicle[i.key];
    if (i.isNumber) return v !== undefined && v !== null && v !== '';
    return v !== undefined;
  });
  const personalHasMissing  = Object.values(personal).some(v => v === false);
  const vehicleHasMissing   = VEHICLE_ITEMS.filter(i => !i.isNumber).some(i => vehicle[i.key] === false);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const step = log?.step || 'CHECKIN';
  const isDone = step === 'DONE';

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-20">

      {/* Header */}
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
                {g.otNumber && (
                  <span className="text-[9px] font-black text-blue-400 bg-blue-900/40 px-2 py-0.5 rounded-full border border-blue-800/50 uppercase tracking-widest">
                    {g.otNumber}
                  </span>
                )}
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
              {g.otNumber && isDone && (
                <button
                  onClick={() => navigate(`/ots/${g.otNumber}`)}
                  className="w-full mt-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-300 text-[11px] font-black uppercase tracking-widest hover:bg-blue-600/30 transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ir a OT {g.otNumber}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Estado / hora entrada */}
        {log?.checkInTime && (
          <div className="mt-3 flex items-center gap-2 text-emerald-400">
            <Clock className="h-4 w-4" />
            <span className="text-xs font-black">Día confirmado: {log.checkInTime}</span>
          </div>
        )}
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 px-2">
        {['Entrada', 'Equipo personal', 'Vehículo', 'Listo'].map((s, i) => {
          const steps = ['CHECKIN', 'PERSONAL', 'VEHICLE', 'DONE'];
          const idx   = steps.indexOf(step);
          const done  = i < idx || isDone;
          const active= i === idx && !isDone;
          return (
            <React.Fragment key={s}>
              <div className={cn(
                'flex flex-col items-center gap-1 flex-1',
                done ? 'opacity-100' : active ? 'opacity-100' : 'opacity-30'
              )}>
                <div className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all',
                  done   ? 'bg-emerald-500 border-emerald-500 text-white' :
                  active ? 'bg-primary border-primary text-white'         :
                           'bg-white border-gray-200 text-gray-400'
                )}>
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-wider text-center leading-tight">{s}</p>
              </div>
              {i < 3 && <div className={cn('h-0.5 flex-1 -mt-4 transition-all', done ? 'bg-emerald-400' : 'bg-gray-200')} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── STEP: CHECK-IN ─────────────────────────────────────────────────── */}
      {step === 'CHECKIN' && (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center space-y-6">
          <div className="h-16 w-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center mx-auto">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">Confirmación de Día</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">
              {new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button
            onClick={handleCheckIn}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving ? 'Confirmando...' : 'Confirmar Día'}
          </button>
        </div>
      )}

      {/* ── STEP: CHECKLIST PERSONAL ────────────────────────────────────────── */}
      {step === 'PERSONAL' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Uniforme · EPP · Herramientas</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Checklist de equipo personal</p>
            </div>
          </div>

          <div className="space-y-3">
            {PERSONAL_ITEMS.map(item => (
              <CheckItem
                key={item.key}
                item={item}
                value={personal[item.key]}
                onChange={(k, v) => setPersonal(p => ({ ...p, [k]: v }))}
                disabled={false}
              />
            ))}
          </div>

          {personalHasMissing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs font-bold text-amber-700">Hay ítems faltantes. Se enviará reporte al supervisor.</p>
              </div>
              <textarea
                value={personalNotes}
                onChange={e => setPersonalNotes(e.target.value)}
                placeholder="Detalla qué falta o cualquier observación adicional..."
                rows={2}
                className="w-full border border-amber-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-amber-50/50"
              />
            </div>
          )}

          <button
            onClick={() => savePersonalChecklist(personalHasMissing)}
            disabled={!allPersonalAnswered || saving}
            className={cn(
              'w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-40',
              personalHasMissing
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200'
                : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
            )}
          >
            <span className="flex items-center justify-center gap-2">
              {personalHasMissing ? <Send className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {saving ? 'Guardando...' : personalHasMissing ? 'Enviar Reporte y Continuar' : 'Todo en orden · Continuar'}
            </span>
          </button>
        </div>
      )}

      {/* ── STEP: CHECKLIST VEHÍCULO ─────────────────────────────────────────── */}
      {step === 'VEHICLE' && (
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <Car className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Checklist de Vehículo</h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Combustible · Limpieza · Funcionalidad</p>
            </div>
          </div>

          <div className="space-y-3">
            {VEHICLE_ITEMS.map(item => (
              <CheckItem
                key={item.key}
                item={item}
                value={vehicle[item.key]}
                onChange={(k, v) => setVehicle(p => ({ ...p, [k]: v }))}
                disabled={false}
              />
            ))}
          </div>

          {vehicleHasMissing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs font-bold text-amber-700">Se generará reporte de recursos faltantes para operaciones.</p>
              </div>
              <textarea
                value={vehicleNotes}
                onChange={e => setVehicleNotes(e.target.value)}
                placeholder="Detalla los recursos o reparaciones necesarias..."
                rows={2}
                className="w-full border border-amber-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-amber-50/50"
              />
            </div>
          )}

          <button
            onClick={() => saveVehicleChecklist(vehicleHasMissing)}
            disabled={!allVehicleAnswered || saving}
            className={cn(
              'w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all disabled:opacity-40',
              vehicleHasMissing
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200'
                : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200'
            )}
          >
            <span className="flex items-center justify-center gap-2">
              {vehicleHasMissing ? <Send className="h-4 w-4" /> : <CheckCheck className="h-4 w-4" />}
              {saving ? 'Guardando...' : vehicleHasMissing ? 'Enviar Reporte y Finalizar' : 'Todo OK · Completar Registro'}
            </span>
          </button>
        </div>
      )}

      {/* ── STEP: DONE ───────────────────────────────────────────────────────── */}
      {isDone && (
        <div className="bg-emerald-600 rounded-3xl p-8 text-white text-center space-y-4">
          <CheckCheck className="h-14 w-14 mx-auto opacity-90" />
          <div>
            <h2 className="text-xl font-black">¡Día confirmado!</h2>
            <p className="text-sm text-emerald-200 font-bold mt-1">Confirmación: {log?.checkInTime} · {today}</p>
          </div>

          {/* Resumen reportes enviados */}
          {(log?.personalReportSent || log?.vehicleReportSent) && (
            <div className="bg-white/10 rounded-2xl p-4 text-left space-y-2 border border-white/20">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Reportes enviados a operaciones</p>
              {log.personalReportSent && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-300 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-white/90">Equipo personal: {log.personalMissing}</p>
                </div>
              )}
              {log.vehicleReportSent && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-300 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-white/90">Vehículo: {log.vehicleMissing}</p>
                </div>
              )}
            </div>
          )}

          {/* Resumen checklists */}
          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="bg-white/10 rounded-2xl p-3 border border-white/20">
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200 mb-2">Equipo personal</p>
              {PERSONAL_ITEMS.map(i => (
                <div key={i.key} className="flex items-center gap-1.5 mb-1">
                  {log?.checklistPersonal?.[i.key]
                    ? <CheckCircle2 className="h-3 w-3 text-emerald-300" />
                    : <XCircle     className="h-3 w-3 text-red-300" />}
                  <span className="text-[10px] font-bold text-white/80">{i.label.split(' ')[0]}</span>
                </div>
              ))}
            </div>
            <div className="bg-white/10 rounded-2xl p-3 border border-white/20">
              <p className="text-[9px] font-black uppercase tracking-wider text-emerald-200 mb-2">Vehículo</p>
              {VEHICLE_ITEMS.map(i => {
                const val = log?.checklistVehicle?.[i.key];
                return (
                  <div key={i.key} className="flex items-center gap-1.5 mb-1">
                    {i.isNumber
                      ? <Gauge className="h-3 w-3 text-emerald-300" />
                      : val ? <CheckCircle2 className="h-3 w-3 text-emerald-300" /> : <XCircle className="h-3 w-3 text-red-300" />
                    }
                    <span className="text-[10px] font-bold text-white/80">
                      {i.isNumber
                        ? `${i.label}: ${val != null && val !== '' ? `${Number(val).toLocaleString()} km` : '—'}`
                        : i.label.split(' ')[0]
                      }
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Botones descarga PDF */}
          <div className="flex flex-col gap-2 pt-2">
            {log?.personalReportSent && (
              <button
                onClick={() => generateAttendanceReportPDF(log, user.name, goals[0] || null, 'personal')}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-white/15 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/25 transition-all"
              >
                <ShieldCheck className="h-4 w-4" /> Descargar Reporte Equipo Personal (PDF)
              </button>
            )}
            {log?.vehicleReportSent && (
              <button
                onClick={() => generateAttendanceReportPDF(log, user.name, goals[0] || null, 'vehicle')}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-white/15 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/25 transition-all"
              >
                <Car className="h-4 w-4" /> Descargar Reporte Vehículo (PDF)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
