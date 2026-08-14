import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarPlus, CalendarDays, ShieldCheck, ClipboardList,
  ChevronLeft, ChevronRight, ArrowRight, ArrowLeft, Check, AlertCircle,
  User, Phone, Mail, MapPin, Store, Clock, Loader2, Search, Truck, Copy, FileText,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   GENERE SU CITA — portal público (sin contraseña)

   Reglas de negocio (revalidadas también en /api/appointments):
   · Sólo fechas con 2 días de anticipación como mínimo.
   · Máximo 2 citas Coppel por día. Día lleno → "Sin cita disponible".
   · La cita cae en el calendario de Operaciones y desde ahí se autocompleta
     para generar la OT del técnico.
═══════════════════════════════════════════════════════════════════════════ */

/* Los 4 tipos de cita. Para cambiar textos o agregar uno, edita sólo esta
   lista y APPOINTMENT_TYPES en api/_handlers/appointments.js. */
/* action: 'book'  → abre el calendario y genera una cita nueva.
   action: 'claim' → pide el folio y levanta un reporte de garantía.
   action: 'track' → pide el folio y consulta una cita existente.       */
const TYPES = [
  { id: 'AGENDAR',    action: 'book',  label: 'Agendar cita', sub: 'Servicio programado en sucursal', Icon: CalendarDays },
  { id: 'GARANTIAS',  action: 'claim', label: 'Garantías',
    sub: 'Reporte un problema con el trabajo técnico usando su folio', Icon: ShieldCheck },
  { id: 'PENDIENTES', action: 'track', view: 'pendientes',
    label: 'Seguimiento de pendientes', sub: 'Capture su folio y vea el formato de la OT', Icon: ClipboardList },
];

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/* Estado de la OT traducido a lo que le importa al cliente: cuándo llegan. */
const OT_STATUS = {
  UNASSIGNED:  { label: 'Por asignar técnico', hint: 'Aún estamos asignando al técnico que la atenderá.', color: '#fbbf24' },
  PENDING:     { label: 'Por asignar técnico', hint: 'Aún estamos asignando al técnico que la atenderá.', color: '#fbbf24' },
  ASSIGNED:    { label: 'Técnico asignado',    hint: 'Ya hay técnico asignado para la fecha programada.', color: '#60a5fa' },
  ACCEPTED:    { label: 'Técnico en ruta',     hint: 'El técnico confirmó la asignación.',                color: '#60a5fa' },
  IN_PROGRESS: { label: 'Trabajo en curso',    hint: 'El técnico ya está atendiendo el servicio.',        color: '#4ade80' },
  COMPLETED:   { label: 'Trabajo completado',  hint: 'El servicio se completó en sitio.',                 color: '#4ade80' },
  VALIDATED:   { label: 'Validado',            hint: 'El servicio fue completado y validado.',            color: '#4ade80' },
};

/* Estado de la cita mientras todavía no genera OT. */
const CITA_STATUS = {
  PENDING:   { label: 'Cita por confirmar', hint: 'Recibimos su solicitud. Operaciones la confirmará y asignará técnico.', color: '#fbbf24' },
  CONFIRMED: { label: 'Cita confirmada',    hint: 'Su cita quedó confirmada. Pronto se asignará al técnico.',             color: '#60a5fa' },
  CONVERTED: { label: 'Orden generada',     hint: 'Ya se generó la orden de trabajo de su cita.',                         color: '#4ade80' },
};

const BG_IMAGE = '/img/login/4920575930762202433.jpg';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400;600;700&family=Inter:wght@300;400;500;600&display=swap');

  .ap-root, .ap-root * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
  .ap-display { font-family: 'Chakra Petch', sans-serif !important; }

  @keyframes ap-up { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
  .ap-in { animation: ap-up .45s cubic-bezier(.16,1,.3,1) both; }

  @keyframes ap-spin { to { transform: rotate(360deg) } }
  .ap-spin { animation: ap-spin .9s linear infinite; }

  /* Tarjeta de tipo de cita */
  .ap-type {
    display:flex; align-items:center; gap:16px; width:100%;
    padding:18px 20px; border-radius:16px; cursor:pointer; text-align:left;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.1);
    transition: all .2s;
  }
  .ap-type:hover { background: rgba(59,130,246,.12); border-color: rgba(96,165,250,.35); }
  .ap-type.on {
    background: rgba(37,99,235,.2) !important;
    border-color: rgba(96,165,250,.6) !important;
    box-shadow: 0 0 28px rgba(37,99,235,.28);
  }

  /* Celdas del calendario */
  .ap-day {
    position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:3px; min-height:66px; padding:6px 4px; border-radius:12px;
    border:1px solid transparent; cursor:pointer; transition: all .16s;
    background: rgba(255,255,255,.03);
  }
  .ap-day-free { background: rgba(34,197,94,.14); border-color: rgba(74,222,128,.4); }
  .ap-day-free:hover { background: rgba(34,197,94,.26); transform: translateY(-2px); }
  .ap-day-full { background: rgba(239,68,68,.12); border-color: rgba(248,113,113,.3); cursor:not-allowed; }
  .ap-day-off  { background: rgba(255,255,255,.02); border-color: rgba(255,255,255,.05); cursor:not-allowed; }
  .ap-day-on   { background: rgba(37,99,235,.4) !important; border-color:#93c5fd !important; box-shadow:0 0 22px rgba(59,130,246,.5); }

  .ap-input {
    width:100%; padding:14px 16px; border-radius:12px; font-size:14px;
    background: rgba(5,10,30,.65); border:1px solid rgba(255,255,255,.15);
    color:#f1f5f9; outline:none; transition: all .22s;
  }
  .ap-input::placeholder { color: rgba(255,255,255,.4); }
  .ap-input:focus { background: rgba(59,130,246,.08); border-color:#93c5fd; box-shadow:0 0 0 3px rgba(59,130,246,.12); }

  .ap-btn {
    display:flex; align-items:center; justify-content:center; gap:10px;
    padding:16px 28px; border-radius:12px; border:none; cursor:pointer;
    font-family:'Chakra Petch',sans-serif; font-weight:700; font-size:12px;
    letter-spacing:.16em; text-transform:uppercase; color:#fff;
    background: linear-gradient(110deg,#1e3a8a 0%,#2563eb 45%,#3b82f6 100%);
    transition: transform .18s, box-shadow .18s, opacity .18s;
  }
  .ap-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 18px 44px rgba(37,99,235,.5); }
  .ap-btn:disabled { opacity:.45; cursor:not-allowed; }

  .ap-ghost {
    display:flex; align-items:center; gap:8px; padding:14px 20px; border-radius:12px;
    background:none; border:1px solid rgba(255,255,255,.15); color:rgba(255,255,255,.85);
    cursor:pointer; font-family:'Chakra Petch',sans-serif; font-weight:600; font-size:11px;
    letter-spacing:.14em; text-transform:uppercase; transition: all .2s;
  }
  .ap-ghost:hover { background:rgba(255,255,255,.07); color:#fff; }

  .ap-scroll::-webkit-scrollbar { width:4px }
  .ap-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,.15); border-radius:2px }
`;

const LBL = {
  fontSize: '8.5px', color: 'rgba(255,255,255,.75)', letterSpacing: '.28em',
  textTransform: 'uppercase', display: 'block', marginBottom: '8px',
};

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function AppointmentBooking() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [type, setType] = useState(null);

  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [avail, setAvail] = useState(null);
  const [loadingAvail, setLoadingAvail] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const [form, setForm] = useState({
    storeNumber: '', storeName: '', contactName: '', contactPhone: '',
    contactEmail: '', address: '', description: '', preferredTime: '09:00',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  // ── Modo "¿Cuándo llegan?" — seguimiento por folio ──────────────────────
  const [mode, setMode] = useState('book');           // 'book' | 'track'
  const [trackView, setTrackView] = useState('llegada'); // 'llegada' | 'pendientes'
  const [folioInput, setFolioInput] = useState('');
  const [tracking, setTracking] = useState(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState(null);

  const openTracker = (folio = '', view = 'llegada') => {
    setMode('track');
    setTrackView(view);
    setFolioInput(folio);
    setTracking(null);
    setTrackError(null);
    setError(null);
  };

  // ── Reporte de garantía ─────────────────────────────────────────────────
  // Paso 1: validar el folio y mostrar a qué trabajo se refiere.
  // Paso 2: describir el problema y enviar. Operaciones agenda la revisita.
  const [claimFolio, setClaimFolio] = useState('');
  const [claimCita, setClaimCita] = useState(null);   // cita validada
  const [claimProblem, setClaimProblem] = useState('');
  const [claimContact, setClaimContact] = useState({ contactName: '', contactPhone: '' });
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState(null);
  const [claimDone, setClaimDone] = useState(null);

  const openClaim = () => {
    setMode('claim');
    setClaimFolio(''); setClaimCita(null); setClaimProblem('');
    setClaimContact({ contactName: '', contactPhone: '' });
    setClaimError(null); setClaimDone(null); setError(null);
  };

  const verifyClaimFolio = async (e) => {
    e?.preventDefault();
    const folio = claimFolio.trim();
    if (!folio) return;
    setClaimLoading(true);
    setClaimError(null);
    try {
      const res = await fetch(`/api/appointments?folio=${encodeURIComponent(folio)}`);
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'No se pudo validar el folio');
      setClaimCita(payload);
      setClaimContact({ contactName: payload.contactName || '', contactPhone: '' });
    } catch (err) {
      setClaimCita(null);
      setClaimError(err.message);
    } finally {
      setClaimLoading(false);
    }
  };

  const submitClaim = async (e) => {
    e?.preventDefault();
    setClaimLoading(true);
    setClaimError(null);
    try {
      const res = await fetch('/api/warranty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citaFolio: claimCita.folio, problem: claimProblem, ...claimContact }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'No se pudo enviar el reporte');
      setClaimDone(payload);
    } catch (err) {
      setClaimError(err.message);
    } finally {
      setClaimLoading(false);
    }
  };

  const lookupFolio = async (e) => {
    e?.preventDefault();
    const folio = folioInput.trim();
    if (!folio) return;
    setTrackLoading(true);
    setTrackError(null);
    setTracking(null);
    try {
      const res = await fetch(`/api/appointments?folio=${encodeURIComponent(folio)}`);
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'No se pudo consultar el folio');
      setTracking(payload);
    } catch (err) {
      setTrackError(err.message);
    } finally {
      setTrackLoading(false);
    }
  };

  const monthKey = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`;

  /* ── Disponibilidad del mes ─────────────────────────────────────────────*/
  const loadAvailability = useCallback(async () => {
    setLoadingAvail(true);
    try {
      const res = await fetch(`/api/appointments?availability=1&month=${monthKey}`);
      if (!res.ok) throw new Error('No se pudo consultar la disponibilidad');
      setAvail(await res.json());
      setError(null);
    } catch (err) {
      setAvail(null);
      setError(err.message);
    } finally {
      setLoadingAvail(false);
    }
  }, [monthKey]);

  useEffect(() => { loadAvailability(); }, [loadAvailability]);

  const monthLabel = new Date(cursor.y, cursor.m, 1)
    .toLocaleString('es-MX', { month: 'long', year: 'numeric' });

  // No se puede navegar a meses ya pasados.
  const now = new Date();
  const atFirstMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth();

  const shiftMonth = (delta) => {
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
    setSelectedDate(null);
  };

  const buildGrid = () => {
    const firstDow = new Date(cursor.y, cursor.m, 1).getDay();
    const total = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells = Array.from({ length: firstDow }, () => null);
    for (let d = 1; d <= total; d++) {
      cells.push(`${monthKey}-${String(d).padStart(2, '0')}`);
    }
    return cells;
  };

  /* ── Envío ──────────────────────────────────────────────────────────────*/
  const submit = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, scheduledDate: selectedDate, ...form }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || 'No se pudo registrar la cita');
      setDone(payload);
    } catch (err) {
      setError(err.message);
      // El cupo pudo llenarse mientras el cliente llenaba el formulario.
      loadAvailability();
    } finally {
      setSaving(false);
    }
  };

  const typeMeta = TYPES.find(t => t.id === type);
  const prettyDate = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-MX', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  const canSubmit = type && selectedDate && form.contactName.trim() && form.contactPhone.trim() && !saving;

  /* ═══════════════════════════════════════════════════════════════════════*/
  return (
    <div
      className="ap-root"
      style={{
        minHeight: '100vh', width: '100%', position: 'relative',
        backgroundImage: `url('${BG_IMAGE}')`, backgroundSize: 'cover',
        backgroundPosition: 'center', backgroundAttachment: 'fixed',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(2,6,23,.86), rgba(3,10,32,.92))' }} />

      <div
        className="ap-scroll"
        style={{
          position: 'relative', zIndex: 5, maxWidth: '820px', margin: '0 auto',
          padding: 'clamp(28px,5vw,56px) clamp(20px,5vw,40px) 64px',
        }}
      >
        {/* ── Encabezado ── */}
        <div className="ap-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img src="/img/Insignia.png" alt="Olea" style={{ width: '44px', height: '44px', objectFit: 'contain', filter: 'drop-shadow(0 0 14px rgba(96,165,250,.6))' }} />
            <div>
              <p className="ap-display" style={{ margin: 0, fontSize: '8px', color: '#60a5fa', letterSpacing: '.4em', textTransform: 'uppercase' }}>
                Olea Controls · Coppel
              </p>
              <h1 className="ap-display" style={{ margin: '4px 0 0', fontSize: 'clamp(24px,4vw,34px)', fontWeight: 700, color: '#f8fafc', letterSpacing: '-.01em' }}>
                {mode === 'claim' ? 'REPORTE DE GARANTÍA'
                  : mode !== 'track' ? 'GENERE SU CITA'
                  : trackView === 'pendientes' ? 'SUS PENDIENTES' : '¿CUÁNDO LLEGAN?'}
              </h1>
            </div>
          </div>
          <button className="ap-ghost" onClick={() => navigate('/login')}>
            <ArrowLeft size={14} /> Salir
          </button>
        </div>

        {/* ══ MODO GARANTÍAS — reportar problema con el trabajo técnico ══ */}
        {mode === 'claim' ? (
          <div className="ap-in">
            {claimDone ? (
              <div style={{ background: 'rgba(10,18,40,.72)', border: '1px solid rgba(74,222,128,.3)', borderRadius: '22px', padding: 'clamp(28px,5vw,44px)', textAlign: 'center' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 20px', background: 'rgba(34,197,94,.18)', border: '1px solid rgba(74,222,128,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={32} color="#4ade80" />
                </div>
                <h2 className="ap-display" style={{ color: '#f8fafc', fontSize: '24px', margin: '0 0 8px', fontWeight: 700 }}>Reporte enviado</h2>
                <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.6 }}>
                  Su reporte llegó a Operaciones. Se revisará el trabajo y le confirmaremos la fecha de la revisita al teléfono registrado.
                </p>

                <div style={{ maxWidth: '420px', margin: '0 auto 24px', padding: '18px', borderRadius: '16px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(248,113,113,.3)' }}>
                  <p className="ap-display" style={{ margin: 0, fontSize: '8.5px', color: '#fca5a5', letterSpacing: '.3em', textTransform: 'uppercase' }}>
                    Folio de su reporte
                  </p>
                  <p style={{ margin: '8px 0 0', fontFamily: 'monospace', fontSize: 'clamp(20px,4vw,26px)', fontWeight: 700, color: '#f8fafc', letterSpacing: '.06em' }}>
                    {claimDone.folio}
                  </p>
                  <button type="button" onClick={() => navigator.clipboard?.writeText(claimDone.folio)} className="ap-ghost" style={{ marginTop: '12px', padding: '9px 14px' }}>
                    <Copy size={13} /> Copiar folio
                  </button>
                </div>

                <div style={{ display: 'grid', gap: '10px', textAlign: 'left', maxWidth: '420px', margin: '0 auto 28px' }}>
                  {[
                    ['Cita original', claimDone.citaFolio],
                    ['OT relacionada', claimDone.otNumber || 'Sin OT generada'],
                    ['Sucursal', [claimDone.storeNumber, claimDone.storeName].filter(Boolean).join(' · ') || '—'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 16px', background: 'rgba(255,255,255,.04)', borderRadius: '10px' }}>
                      <span className="ap-display" style={{ fontSize: '9px', color: 'rgba(255,255,255,.6)', letterSpacing: '.2em', textTransform: 'uppercase', paddingTop: '2px' }}>{k}</span>
                      <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600, textAlign: 'right' }}>{v}</span>
                    </div>
                  ))}
                </div>

                <button className="ap-btn" style={{ margin: '0 auto' }} onClick={() => navigate('/login')}>
                  Finalizar <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <>
                {/* Paso 1 — validar folio */}
                <form
                  onSubmit={verifyClaimFolio}
                  style={{ background: 'rgba(10,18,40,.7)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '22px', padding: 'clamp(22px,4vw,32px)', backdropFilter: 'blur(20px)', marginBottom: '20px' }}
                >
                  <p className="ap-display" style={LBL}>Folio de la cita que quiere reportar</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                      className="ap-input"
                      style={{ flex: '1 1 220px', fontFamily: 'monospace', letterSpacing: '.06em', textTransform: 'uppercase' }}
                      placeholder="CITA-2026-0001"
                      value={claimFolio}
                      onChange={e => { setClaimFolio(e.target.value); setClaimCita(null); }}
                      autoFocus
                    />
                    <button type="submit" className="ap-btn" disabled={!claimFolio.trim() || claimLoading}>
                      {claimLoading && !claimCita ? <><Loader2 size={15} className="ap-spin" /> Validando…</> : <><Search size={15} /> Validar folio</>}
                    </button>
                  </div>
                  <p style={{ margin: '12px 0 0', fontSize: '11.5px', color: 'rgba(255,255,255,.55)', lineHeight: 1.6 }}>
                    Necesitamos el folio para saber a qué trabajo se refiere el problema.
                  </p>
                </form>

                {claimError && (
                  <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', color: '#fca5a5', fontSize: '13px' }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} /> {claimError}
                  </div>
                )}

                {/* Paso 2 — describir el problema */}
                {claimCita && (
                  <form onSubmit={submitClaim} className="ap-in" style={{ background: 'rgba(10,18,40,.7)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '22px', padding: 'clamp(22px,4vw,32px)', backdropFilter: 'blur(20px)' }}>
                    {/* A qué trabajo se refiere */}
                    <p className="ap-display" style={LBL}>Trabajo que va a reportar</p>
                    <div style={{ display: 'grid', gap: '10px', marginBottom: '24px' }}>
                      {[
                        ['Folio',    claimCita.folio],
                        ['OT',       claimCita.ot?.otNumber || 'Sin OT generada'],
                        ['Trabajo',  claimCita.ot?.title],
                        ['Técnico',  claimCita.ot?.technicianName],
                        ['Sucursal', [claimCita.storeNumber, claimCita.storeName].filter(Boolean).join(' · ')],
                        ['Atendida', claimCita.ot?.scheduledDate
                          ? new Date(`${String(claimCita.ot.scheduledDate).slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
                          : null],
                      ].filter(([, v]) => v).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 16px', background: 'rgba(255,255,255,.04)', borderRadius: '10px' }}>
                          <span className="ap-display" style={{ fontSize: '9px', color: 'rgba(255,255,255,.55)', letterSpacing: '.2em', textTransform: 'uppercase', paddingTop: '2px', flexShrink: 0 }}>{k}</span>
                          <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600, textAlign: 'right' }}>{v}</span>
                        </div>
                      ))}
                    </div>

                    <Field label="¿Qué problema tuvo con el trabajo? *">
                      <textarea
                        className="ap-input" rows={5} required style={{ resize: 'vertical' }}
                        placeholder="Describa qué falló, desde cuándo y en qué equipo. Entre más detalle, más rápido lo resolvemos."
                        value={claimProblem}
                        onChange={e => setClaimProblem(e.target.value)}
                      />
                    </Field>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px', marginTop: '16px' }}>
                      <Field label="Nombre de contacto" icon={User}>
                        <input className="ap-input" placeholder="Quién reporta" value={claimContact.contactName}
                          onChange={e => setClaimContact(c => ({ ...c, contactName: e.target.value }))} />
                      </Field>
                      <Field label="Teléfono de contacto" icon={Phone}>
                        <input className="ap-input" type="tel" placeholder="10 dígitos" value={claimContact.contactPhone}
                          onChange={e => setClaimContact(c => ({ ...c, contactPhone: e.target.value }))} />
                      </Field>
                    </div>
                    <p style={{ margin: '10px 0 0', fontSize: '11px', color: 'rgba(255,255,255,.45)', lineHeight: 1.6 }}>
                      Si los deja vacíos usaremos los datos de la cita original.
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '26px' }}>
                      <button type="submit" className="ap-btn" disabled={claimProblem.trim().length < 10 || claimLoading}>
                        {claimLoading
                          ? <><Loader2 size={15} className="ap-spin" /> Enviando…</>
                          : <><ShieldCheck size={15} /> Enviar reporte</>}
                      </button>
                    </div>
                  </form>
                )}

                <div style={{ marginTop: '24px' }}>
                  <button type="button" className="ap-ghost" onClick={() => setMode('book')}>
                    <ArrowLeft size={14} /> Volver
                  </button>
                </div>
              </>
            )}
          </div>
        ) :

        /* ══ MODO SEGUIMIENTO — "¿Cuándo llegan?" por folio ══ */
        mode === 'track' ? (
          <div className="ap-in">
            <form
              onSubmit={lookupFolio}
              style={{ background: 'rgba(10,18,40,.7)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '22px', padding: 'clamp(22px,4vw,32px)', backdropFilter: 'blur(20px)', marginBottom: '20px' }}
            >
              <p className="ap-display" style={LBL}>Capture el folio de su cita</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  className="ap-input"
                  style={{ flex: '1 1 220px', fontFamily: 'monospace', letterSpacing: '.06em', textTransform: 'uppercase' }}
                  placeholder="CITA-2026-0001"
                  value={folioInput}
                  onChange={e => setFolioInput(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="ap-btn" disabled={!folioInput.trim() || trackLoading}>
                  {trackLoading ? <><Loader2 size={15} className="ap-spin" /> Buscando…</> : <><Search size={15} /> Consultar</>}
                </button>
              </div>
              <p style={{ margin: '12px 0 0', fontSize: '11.5px', color: 'rgba(255,255,255,.55)', lineHeight: 1.6 }}>
                {trackView === 'pendientes'
                  ? 'Es el folio que recibió al generar su cita. Con él verá los pendientes y, cuando la asignación se cierre, el formato de la orden de trabajo.'
                  : 'Es el folio que recibió al generar su cita. Con él verá cuándo llegan y los datos del técnico asignado.'}
              </p>
            </form>

            {trackError && (
              <div className="ap-in" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', color: '#fca5a5', fontSize: '13px' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} /> {trackError}
              </div>
            )}

            {tracking && (() => {
              const ot = tracking.ot;
              const st = ot
                ? (OT_STATUS[ot.status] || OT_STATUS.PENDING)
                : (CITA_STATUS[tracking.status] || CITA_STATUS.PENDING);
              const fecha = ot?.scheduledDate || tracking.scheduledDate;
              const hora  = ot?.arrivalTime || tracking.preferredTime;
              const fechaTxt = fecha
                ? new Date(`${String(fecha).slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                : '—';

              return (
                <div className="ap-in" style={{ background: 'rgba(10,18,40,.7)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '22px', padding: 'clamp(22px,4vw,32px)', backdropFilter: 'blur(20px)' }}>
                  {/* Estado */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '22px' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#cbd5e1', background: 'rgba(255,255,255,.07)', borderRadius: '8px', padding: '5px 12px' }}>
                      {tracking.folio}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 700, color: st.color, background: 'rgba(255,255,255,.05)', border: `1px solid ${st.color}55`, borderRadius: '999px', padding: '5px 14px' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: st.color }} /> {st.label}
                    </span>
                    <span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.6)' }}>{tracking.typeLabel}</span>
                  </div>

                  {/* ══ Vista PENDIENTES — formato de la OT al cerrarse ══ */}
                  {trackView === 'pendientes' ? (
                    <>
                      {/* Estado de la asignación */}
                      <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '20px', borderRadius: '16px', marginBottom: '20px',
                        background: ot?.isClosed ? 'rgba(34,197,94,.14)' : 'rgba(251,191,36,.12)',
                        border: `1px solid ${ot?.isClosed ? 'rgba(74,222,128,.35)' : 'rgba(251,191,36,.3)'}`,
                      }}>
                        <div style={{
                          width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: ot?.isClosed ? 'rgba(34,197,94,.25)' : 'rgba(251,191,36,.2)',
                          border: `1px solid ${ot?.isClosed ? 'rgba(74,222,128,.4)' : 'rgba(251,191,36,.35)'}`,
                          color: ot?.isClosed ? '#86efac' : '#fcd34d',
                        }}>
                          {ot?.isClosed ? <Check size={22} /> : <Clock size={22} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p className="ap-display" style={{ margin: 0, fontSize: '9px', letterSpacing: '.28em', textTransform: 'uppercase', color: ot?.isClosed ? '#86efac' : '#fcd34d' }}>
                            Asignación
                          </p>
                          <p className="ap-display" style={{ margin: '5px 0 0', fontSize: 'clamp(17px,3vw,21px)', fontWeight: 700, color: '#f8fafc', lineHeight: 1.25 }}>
                            {ot?.isClosed ? 'Cerrada' : ot ? 'En proceso' : 'Sin orden de trabajo aún'}
                          </p>
                          <p style={{ margin: '8px 0 0', fontSize: '11.5px', color: 'rgba(255,255,255,.65)', lineHeight: 1.6 }}>
                            {ot?.isClosed
                              ? 'El técnico terminó la asignación. Ya puede consultar el formato de la orden de trabajo.'
                              : ot
                                ? 'El formato de la orden estará disponible aquí en cuanto el técnico cierre la asignación.'
                                : 'Su cita todavía no genera orden de trabajo. Aquí verá los pendientes y el formato cuando se cierre.'}
                          </p>
                        </div>
                      </div>

                      {/* Formato de la OT — sólo si ya se cerró */}
                      {ot?.isClosed && (
                        <div style={{ marginBottom: '20px' }}>
                          <p className="ap-display" style={LBL}>Formato de la orden de trabajo</p>
                          {ot.deliveryActUrl ? (
                            <a
                              href={ot.deliveryActUrl} target="_blank" rel="noreferrer"
                              className="ap-btn"
                              style={{ textDecoration: 'none', width: '100%' }}
                            >
                              <FileText size={15} /> Ver formato de la OT {ot.otNumber}
                            </a>
                          ) : (
                            <div style={{ padding: '16px 18px', borderRadius: '12px', background: 'rgba(255,255,255,.04)', border: '1px dashed rgba(255,255,255,.15)', fontSize: '12px', color: 'rgba(255,255,255,.55)', lineHeight: 1.6 }}>
                              La asignación está cerrada, pero el formato todavía no se ha cargado. Comuníquese con Operaciones.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pendientes registrados por el técnico */}
                      <p className="ap-display" style={LBL}>Pendientes registrados</p>
                      {ot?.pendingTasks?.length > 0 ? (
                        <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
                          {ot.pendingTasks.map((p, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', background: 'rgba(255,255,255,.04)', borderRadius: '10px' }}>
                              <span style={{ width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0, background: 'rgba(251,191,36,.2)', border: '1px solid rgba(251,191,36,.35)', color: '#fcd34d', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {i + 1}
                              </span>
                              <span style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6 }}>{p}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: '16px 18px', borderRadius: '12px', background: 'rgba(255,255,255,.04)', border: '1px dashed rgba(255,255,255,.12)', fontSize: '12px', color: 'rgba(255,255,255,.5)', marginBottom: '20px' }}>
                          {ot ? 'Sin pendientes registrados en esta orden.' : 'Aún no hay pendientes registrados.'}
                        </div>
                      )}

                      {/* Reporte del técnico */}
                      {ot?.report && (
                        <>
                          <p className="ap-display" style={LBL}>Reporte del técnico</p>
                          <div style={{ padding: '16px 18px', borderRadius: '12px', background: 'rgba(255,255,255,.04)', fontSize: '13px', color: '#e2e8f0', lineHeight: 1.7, marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
                            {ot.report}
                          </div>
                        </>
                      )}

                      {/* Referencia de la orden */}
                      {ot && (
                        <div style={{ display: 'grid', gap: '10px' }}>
                          {[
                            ['Orden de trabajo', ot.otNumber],
                            ['Trabajo',          ot.title],
                            ['Sucursal',         [ot.storeNumber, ot.storeName].filter(Boolean).join(' · ')],
                            ['Técnico',          ot.technicianName],
                            ['Atendida el',      fechaTxt],
                          ].filter(([, v]) => v).map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 16px', background: 'rgba(255,255,255,.04)', borderRadius: '10px' }}>
                              <span className="ap-display" style={{ fontSize: '9px', color: 'rgba(255,255,255,.55)', letterSpacing: '.2em', textTransform: 'uppercase', paddingTop: '2px', flexShrink: 0 }}>{k}</span>
                              <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600, textAlign: 'right', textTransform: k === 'Atendida el' ? 'capitalize' : 'none' }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                  <>
                  {/* Cuándo llegan */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '20px', borderRadius: '16px', background: 'rgba(37,99,235,.14)', border: '1px solid rgba(96,165,250,.3)', marginBottom: '20px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(37,99,235,.3)', border: '1px solid rgba(147,197,253,.4)', color: '#bfdbfe' }}>
                      <Truck size={22} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p className="ap-display" style={{ margin: 0, fontSize: '9px', color: '#93c5fd', letterSpacing: '.28em', textTransform: 'uppercase' }}>Llegan el</p>
                      <p className="ap-display" style={{ margin: '5px 0 0', fontSize: 'clamp(17px,3vw,22px)', fontWeight: 700, color: '#f8fafc', textTransform: 'capitalize', lineHeight: 1.25 }}>
                        {fechaTxt}
                      </p>
                      <p style={{ margin: '5px 0 0', fontSize: '13px', color: '#dbeafe', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} /> Hora estimada de llegada: {hora || '—'}
                      </p>
                      <p style={{ margin: '10px 0 0', fontSize: '11.5px', color: 'rgba(255,255,255,.6)', lineHeight: 1.6 }}>{st.hint}</p>
                    </div>
                  </div>

                  {/* Datos de la OT */}
                  {ot ? (
                    <>
                      <p className="ap-display" style={LBL}>Datos de la orden de trabajo</p>
                      <div style={{ display: 'grid', gap: '10px', marginBottom: '20px' }}>
                        {[
                          ['Orden de trabajo', ot.otNumber],
                          ['Trabajo',          ot.title],
                          ['Sucursal',         [ot.storeNumber, ot.storeName].filter(Boolean).join(' · ')],
                          ['Lugar',            ot.address],
                          ['Referencias',      ot.reference],
                        ].filter(([, v]) => v).map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 16px', background: 'rgba(255,255,255,.04)', borderRadius: '10px' }}>
                            <span className="ap-display" style={{ fontSize: '9px', color: 'rgba(255,255,255,.55)', letterSpacing: '.2em', textTransform: 'uppercase', paddingTop: '2px', flexShrink: 0 }}>{k}</span>
                            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600, textAlign: 'right' }}>{v}</span>
                          </div>
                        ))}
                      </div>

                      {/* Técnico */}
                      <p className="ap-display" style={LBL}>Técnico asignado</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 18px', borderRadius: '14px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0, overflow: 'hidden', background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {ot.technicianAvatar
                            ? <img src={ot.technicianAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <User size={20} color="#fff" />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p className="ap-display" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>
                            {ot.technicianName || 'Por asignar'}
                          </p>
                          <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                            {ot.technicianName ? ot.technicianRole : 'Se asignará antes de la fecha programada'}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="ap-display" style={LBL}>Datos de su solicitud</p>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {[
                          ['Solicitó',  tracking.contactName],
                          ['Sucursal',  [tracking.storeNumber, tracking.storeName].filter(Boolean).join(' · ')],
                          ['Lugar',     tracking.address],
                          ['Detalle',   tracking.description],
                        ].filter(([, v]) => v).map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 16px', background: 'rgba(255,255,255,.04)', borderRadius: '10px' }}>
                            <span className="ap-display" style={{ fontSize: '9px', color: 'rgba(255,255,255,.55)', letterSpacing: '.2em', textTransform: 'uppercase', paddingTop: '2px', flexShrink: 0 }}>{k}</span>
                            <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600, textAlign: 'right' }}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <p style={{ margin: '18px 0 0', fontSize: '11.5px', color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
                        Cuando Operaciones genere la orden de trabajo, aquí aparecerán el técnico asignado y la hora de llegada.
                      </p>
                    </>
                  )}
                  </>
                  )}
                </div>
              );
            })()}

            <div style={{ marginTop: '24px' }}>
              <button type="button" className="ap-ghost" onClick={() => { setMode('book'); setTracking(null); setTrackError(null); }}>
                <ArrowLeft size={14} /> Volver a generar cita
              </button>
            </div>
          </div>
        ) : done ? (
          <div className="ap-in" style={{ background: 'rgba(10,18,40,.72)', border: '1px solid rgba(74,222,128,.3)', borderRadius: '22px', padding: 'clamp(28px,5vw,44px)', textAlign: 'center' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 20px', background: 'rgba(34,197,94,.18)', border: '1px solid rgba(74,222,128,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Check size={32} color="#4ade80" />
            </div>
            <h2 className="ap-display" style={{ color: '#f8fafc', fontSize: '24px', margin: '0 0 8px', fontWeight: 700 }}>Cita registrada</h2>
            <p style={{ color: 'rgba(255,255,255,.7)', fontSize: '14px', margin: '0 0 24px', lineHeight: 1.6 }}>
              Su solicitud llegó al calendario de Operaciones. Le confirmaremos al teléfono registrado.
            </p>

            {/* Folio — es la llave para consultar cuándo llegan */}
            <div style={{ maxWidth: '420px', margin: '0 auto 20px', padding: '18px', borderRadius: '16px', background: 'rgba(37,99,235,.16)', border: '1px solid rgba(96,165,250,.35)' }}>
              <p className="ap-display" style={{ margin: 0, fontSize: '8.5px', color: '#93c5fd', letterSpacing: '.3em', textTransform: 'uppercase' }}>
                Guarde su folio
              </p>
              <p style={{ margin: '8px 0 0', fontFamily: 'monospace', fontSize: 'clamp(20px,4vw,26px)', fontWeight: 700, color: '#f8fafc', letterSpacing: '.06em' }}>
                {done.folio}
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '11.5px', color: 'rgba(255,255,255,.65)', lineHeight: 1.6 }}>
                Con este folio puede consultar cuándo llegan y ver al técnico asignado.
              </p>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(done.folio)}
                className="ap-ghost"
                style={{ marginTop: '12px', padding: '9px 14px' }}
              >
                <Copy size={13} /> Copiar folio
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px', textAlign: 'left', maxWidth: '420px', margin: '0 auto 28px' }}>
              {[
                ['Tipo',    typeMeta?.label],
                ['Fecha',   prettyDate],
                ['Horario', done.preferredTime],
                ['Sucursal', [done.storeNumber, done.storeName].filter(Boolean).join(' · ') || '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 16px', background: 'rgba(255,255,255,.04)', borderRadius: '10px' }}>
                  <span className="ap-display" style={{ fontSize: '9px', color: 'rgba(255,255,255,.6)', letterSpacing: '.2em', textTransform: 'uppercase', paddingTop: '2px' }}>{k}</span>
                  <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 600, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="ap-ghost" onClick={() => openTracker(done.folio)}>
                <Search size={14} /> Consultar cuándo llegan
              </button>
              <button className="ap-btn" onClick={() => navigate('/login')}>
                Finalizar <ArrowRight size={15} />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Pasos ── */}
            <div className="ap-in" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '28px' }}>
              {['Tipo de cita', 'Fecha', 'Sus datos'].map((label, i) => {
                const n = i + 1;
                const state = step === n ? 'on' : step > n ? 'done' : 'off';
                return (
                  <React.Fragment key={label}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700,
                        background: state === 'off' ? 'rgba(255,255,255,.06)' : state === 'done' ? 'rgba(34,197,94,.25)' : '#2563eb',
                        border: `1px solid ${state === 'off' ? 'rgba(255,255,255,.1)' : state === 'done' ? 'rgba(74,222,128,.5)' : '#60a5fa'}`,
                        color: state === 'off' ? 'rgba(255,255,255,.4)' : '#fff',
                      }}>
                        {state === 'done' ? <Check size={13} /> : n}
                      </div>
                      <span className="ap-display" style={{ fontSize: '9px', letterSpacing: '.2em', textTransform: 'uppercase', color: state === 'off' ? 'rgba(255,255,255,.4)' : '#e2e8f0', whiteSpace: 'nowrap' }}>
                        {label}
                      </span>
                    </div>
                    {n < 3 && <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,.1)' }} />}
                  </React.Fragment>
                );
              })}
            </div>

            {error && (
              <div className="ap-in" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', color: '#fca5a5', fontSize: '13px' }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            <div style={{ background: 'rgba(10,18,40,.7)', border: '1px solid rgba(255,255,255,.1)', borderRadius: '22px', padding: 'clamp(22px,4vw,36px)', backdropFilter: 'blur(20px)' }}>

              {/* ═══ PASO 1 — Tipo de cita ═══ */}
              {step === 1 && (
                <div className="ap-in">
                  <p className="ap-display" style={LBL}>¿Qué necesita?</p>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {TYPES.map(({ id, label, sub, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          const t = TYPES.find(x => x.id === id);
                          if (t.action === 'track') { openTracker('', t.view); return; }
                          if (t.action === 'claim') { openClaim(); return; }
                          setType(id); setStep(2);
                        }}
                        className={`ap-type${type === id ? ' on' : ''}`}
                      >
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: type === id ? 'rgba(37,99,235,.35)' : 'rgba(255,255,255,.06)',
                          border: `1px solid ${type === id ? 'rgba(147,197,253,.5)' : 'rgba(255,255,255,.08)'}`,
                          color: type === id ? '#bfdbfe' : 'rgba(255,255,255,.8)',
                        }}>
                          <Icon size={19} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p className="ap-display" style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>{label}</p>
                          <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'rgba(255,255,255,.6)' }}>{sub}</p>
                        </div>
                        <ChevronRight size={16} color="rgba(255,255,255,.45)" />
                      </button>
                    ))}
                  </div>

                  {/* Seguimiento por folio */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0 14px' }}>
                    <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,.08)' }} />
                    <span className="ap-display" style={{ fontSize: '8px', color: 'rgba(255,255,255,.55)', letterSpacing: '.3em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      ¿Ya tiene folio?
                    </span>
                    <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,.08)' }} />
                  </div>

                  <button type="button" onClick={() => openTracker()} className="ap-type">
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)', color: 'rgba(255,255,255,.8)' }}>
                      <Search size={19} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="ap-display" style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>Consultar cuándo llegan</p>
                      <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'rgba(255,255,255,.6)' }}>Capture su folio y vea técnico, lugar y hora</p>
                    </div>
                    <ChevronRight size={16} color="rgba(255,255,255,.45)" />
                  </button>
                </div>
              )}

              {/* ═══ PASO 2 — Calendario ═══ */}
              {step === 2 && (
                <div className="ap-in">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', gap: '12px' }}>
                    <div>
                      <p className="ap-display" style={{ ...LBL, marginBottom: '4px' }}>Escoja su fecha</p>
                      <p className="ap-display" style={{ margin: 0, fontSize: '18px', color: '#f1f5f9', fontWeight: 600, textTransform: 'capitalize' }}>
                        {monthLabel}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button" onClick={() => shiftMonth(-1)} disabled={atFirstMonth}
                        style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', color: '#e2e8f0', cursor: atFirstMonth ? 'not-allowed' : 'pointer', opacity: atFirstMonth ? .35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button" onClick={() => shiftMonth(1)}
                        style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', color: '#e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Leyenda */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                    {[
                      ['#4ade80', 'Con cita disponible'],
                      ['#f87171', 'Sin cita disponible'],
                      ['rgba(255,255,255,.25)', `Domingos y menos de ${avail?.minLeadDays ?? 2} días de anticipación`],
                    ].map(([c, t]) => (
                      <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10.5px', color: 'rgba(255,255,255,.7)' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: c }} /> {t}
                      </span>
                    ))}
                  </div>

                  {/* Rejilla */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', marginBottom: '6px' }}>
                    {DOW.map(d => (
                      <div key={d} className="ap-display" style={{ textAlign: 'center', fontSize: '8.5px', color: 'rgba(255,255,255,.45)', letterSpacing: '.16em', textTransform: 'uppercase', paddingBottom: '4px' }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {loadingAvail ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '60px 0', color: 'rgba(255,255,255,.6)', fontSize: '12px' }}>
                      <Loader2 size={16} className="ap-spin" /> Consultando disponibilidad…
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px' }}>
                      {buildGrid().map((key, i) => {
                        if (!key) return <div key={`pad-${i}`} />;
                        const info = avail?.days?.[key];
                        const dayNum = Number(key.slice(8));
                        const isToday = key === todayStr();
                        const free = !!info?.available;
                        const closed = !!info?.closed;               // domingo
                        const full = !!info?.full && !info?.tooSoon && !closed;
                        const on = selectedDate === key;

                        const cls = ['ap-day',
                          free ? 'ap-day-free' : full ? 'ap-day-full' : 'ap-day-off',
                          on ? 'ap-day-on' : ''].join(' ');

                        return (
                          <button
                            key={key}
                            type="button"
                            disabled={!free}
                            onClick={() => setSelectedDate(key)}
                            className={cls}
                            title={
                              closed ? 'Domingo — no hay servicio'
                              : info?.tooSoon ? `Requiere ${avail?.minLeadDays ?? 2} días de anticipación`
                              : full ? 'Sin cita disponible'
                              : `${info?.remaining ?? 0} de ${avail?.capacity ?? 2} disponibles`
                            }
                          >
                            <span className="ap-display" style={{ fontSize: '15px', fontWeight: 700, color: free || on ? '#f8fafc' : 'rgba(255,255,255,.35)' }}>
                              {dayNum}
                            </span>
                            <span style={{ fontSize: '7.5px', lineHeight: 1.15, textAlign: 'center', letterSpacing: '.02em', color: on ? '#fff' : free ? '#86efac' : full ? '#fca5a5' : 'rgba(255,255,255,.25)' }}>
                              {closed ? 'Cerrado'
                                : info?.tooSoon ? '—'
                                : full ? 'Sin cita'
                                : `${info?.remaining ?? 0} libre${(info?.remaining ?? 0) === 1 ? '' : 's'}`}
                            </span>
                            {isToday && <span style={{ position: 'absolute', top: '5px', right: '6px', width: '4px', height: '4px', borderRadius: '50%', background: '#60a5fa' }} />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '26px' }}>
                    <button type="button" className="ap-ghost" onClick={() => setStep(1)}>
                      <ArrowLeft size={14} /> Atrás
                    </button>
                    <button type="button" className="ap-btn" disabled={!selectedDate} onClick={() => setStep(3)}>
                      Continuar <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* ═══ PASO 3 — Datos ═══ */}
              {step === 3 && (
                <form className="ap-in" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                  {/* Resumen */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
                    {[
                      [typeMeta?.Icon ?? CalendarDays, typeMeta?.label],
                      [CalendarDays, prettyDate],
                    ].map(([Icon, text], i) => (
                      <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '999px', background: 'rgba(37,99,235,.18)', border: '1px solid rgba(96,165,250,.3)', fontSize: '11.5px', color: '#dbeafe', textTransform: 'capitalize' }}>
                        <Icon size={13} /> {text}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px' }}>
                    <Field label="Número de sucursal" icon={Store}>
                      <input className="ap-input" placeholder="Ej. 1024" value={form.storeNumber}
                        onChange={e => setForm(f => ({ ...f, storeNumber: e.target.value }))} />
                    </Field>
                    <Field label="Nombre de sucursal" icon={Store}>
                      <input className="ap-input" placeholder="Ej. Coppel Centro" value={form.storeName}
                        onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))} />
                    </Field>
                    <Field label="Nombre de contacto *" icon={User}>
                      <input className="ap-input" required placeholder="Quién nos recibe" value={form.contactName}
                        onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} />
                    </Field>
                    <Field label="Teléfono *" icon={Phone}>
                      <input className="ap-input" required type="tel" placeholder="10 dígitos" value={form.contactPhone}
                        onChange={e => setForm(f => ({ ...f, contactPhone: e.target.value }))} />
                    </Field>
                    <Field label="Correo" icon={Mail}>
                      <input className="ap-input" type="email" placeholder="contacto@coppel.com" value={form.contactEmail}
                        onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))} />
                    </Field>
                    <Field label="Horario preferente" icon={Clock}>
                      <input className="ap-input" type="time" value={form.preferredTime}
                        onChange={e => setForm(f => ({ ...f, preferredTime: e.target.value }))} />
                    </Field>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <Field label="Dirección de la sucursal" icon={MapPin}>
                      <input className="ap-input" placeholder="Calle, número, colonia, ciudad" value={form.address}
                        onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                    </Field>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <Field label="Detalle del requerimiento">
                      <textarea className="ap-input" rows={4} style={{ resize: 'vertical' }}
                        placeholder="Describa el equipo, la falla o los pendientes a atender"
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </Field>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '26px' }}>
                    <button type="button" className="ap-ghost" onClick={() => setStep(2)}>
                      <ArrowLeft size={14} /> Atrás
                    </button>
                    <button type="submit" className="ap-btn" disabled={!canSubmit}>
                      {saving
                        ? <><Loader2 size={15} className="ap-spin" /> Registrando…</>
                        : <><CalendarPlus size={15} /> Confirmar cita</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span className="ap-display" style={{ ...LBL, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {Icon && <Icon size={11} />} {label}
      </span>
      {children}
    </label>
  );
}
