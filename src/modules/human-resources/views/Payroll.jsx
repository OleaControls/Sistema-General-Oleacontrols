import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DollarSign, Plus, X, Printer,
  CheckCircle2, Clock, Wallet, Users, TrendingDown, TrendingUp,
  Edit2, AlertCircle, Search, Trash2, FileText, Download, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt  = (n) => `$${Number(n||0).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtD = (d) => d ? new Date(d).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : '—';

const STATUS_CFG = {
  DRAFT:    { label:'Borrador', cls:'bg-amber-100 text-amber-700 border-amber-200',   dot:'bg-amber-400'    },
  APPROVED: { label:'Aprobada', cls:'bg-blue-100 text-blue-700 border-blue-200',      dot:'bg-blue-500'     },
  PAID:     { label:'Pagada',   cls:'bg-emerald-100 text-emerald-700 border-emerald-200', dot:'bg-emerald-500' },
};

const TYPE_LABELS = { SEMANAL:'Semanal', QUINCENAL:'Quincenal', MENSUAL:'Mensual' };

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-sky-500','bg-teal-500'];
const avatarColor = (name='') => { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; };
const initials = (name='') => name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

// ── Generador de recibo HTML ──────────────────────────────────────────────────
function buildSlipHTML(item, period, emp = {}, origin = '') {
  const bonuses  = Array.isArray(item.bonuses)        ? item.bonuses        : [];
  const extraDed = Array.isArray(item.extraDeductions) ? item.extraDeductions : [];
  const folio    = `RC-${period.id?.slice(-6).toUpperCase()}-${item.id?.slice(-4).toUpperCase()}`;

  const row = (concept, amount, color='#374151') =>
    `<tr><td style="padding:4px 12px;font-size:9px;color:#374151;font-weight:500;border-bottom:1px solid #f9fafb;">${concept}</td><td style="padding:4px 12px;text-align:right;font-size:9px;font-weight:700;color:${color};white-space:nowrap;border-bottom:1px solid #f9fafb;">${fmt(amount)}</td></tr>`;

  const subLabel = (text, bg='#fafafa', color='#6b7280', border='#f3f4f6') =>
    `<tr><td colspan="2" style="padding:4px 12px 3px;font-size:8px;font-weight:900;color:${color};text-transform:uppercase;letter-spacing:.08em;background:${bg};border-top:1px solid ${border};border-bottom:1px solid ${border};">${text}</td></tr>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Recibo de Nómina — ${item.employeeName}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:10px;color:#1f2937;background:#fff}
  .page{width:794px;min-height:1123px;margin:0 auto;padding:24px 36px;display:flex;flex-direction:column}
  @media print{@page{size:A4;margin:10mm}.page{padding:0}}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:3px solid #0f172a;padding-bottom:14px;margin-bottom:14px;">
    <div style="display:flex;flex-direction:column;align-items:flex-start;gap:4px;">
      <img src="${origin}/img/logo_olea_new.png" alt="OleaControls" style="width:130px;height:auto;object-fit:contain;"/>
      <span style="font-size:9px;font-weight:900;color:#374151;text-transform:uppercase;letter-spacing:.14em;">Recibo de Nómina</span>
    </div>
    <div style="text-align:right;">
      <div style="font-size:10px;font-weight:800;color:#374151;margin-bottom:5px;">OleaControls México, S.A. de C.V.</div>
      <div style="font-size:17px;font-weight:900;color:#0f172a;">Recibo de Nómina</div>
      <div style="font-size:8px;color:#6b7280;font-weight:700;letter-spacing:.08em;margin-top:4px;">Folio: ${folio}</div>
      <div style="font-size:8px;color:#6b7280;font-weight:700;margin-top:2px;">Emitido: ${fmtD(new Date())}</div>
    </div>
  </div>

  <!-- Información del Colaborador -->
  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:11px 14px;margin-bottom:12px;">
    <div style="font-size:7px;font-weight:900;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;padding-bottom:5px;border-bottom:1px solid #e5e7eb;">Información del Colaborador</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px 20px;">
      <div style="display:flex;gap:8px;align-items:baseline;"><span style="font-size:7px;font-weight:900;color:#9ca3af;text-transform:uppercase;white-space:nowrap;">Nombre</span><span style="font-size:12px;font-weight:900;color:#0f172a;">${item.employeeName}</span></div>
      <div style="display:flex;gap:8px;align-items:baseline;"><span style="font-size:7px;font-weight:900;color:#9ca3af;text-transform:uppercase;white-space:nowrap;">Período</span><span style="font-size:9px;font-weight:700;color:#111827;">${period.name} · ${fmtD(period.startDate)} – ${fmtD(period.endDate)}</span></div>
      <div style="display:flex;gap:8px;align-items:baseline;"><span style="font-size:7px;font-weight:900;color:#9ca3af;text-transform:uppercase;white-space:nowrap;">Puesto</span><span style="font-size:9px;font-weight:700;color:#111827;">${item.employeePos||item.employeeDept||'—'}</span></div>
      <div style="display:flex;gap:8px;align-items:baseline;"><span style="font-size:7px;font-weight:900;color:#9ca3af;text-transform:uppercase;white-space:nowrap;">Fecha de Pago</span><span style="font-size:9px;font-weight:700;color:#111827;">${fmtD(period.endDate)}</span></div>
      ${emp.nss        ?`<div style="display:flex;gap:8px;align-items:baseline;"><span style="font-size:7px;font-weight:900;color:#9ca3af;text-transform:uppercase;white-space:nowrap;">Núm. Seguridad Social</span><span style="font-size:9px;font-weight:700;color:#111827;">${emp.nss}</span></div>`:''}
      ${emp.curp       ?`<div style="display:flex;gap:8px;align-items:baseline;"><span style="font-size:7px;font-weight:900;color:#9ca3af;text-transform:uppercase;white-space:nowrap;">CURP</span><span style="font-size:9px;font-weight:700;color:#111827;">${emp.curp}</span></div>`:''}
      ${emp.rfc        ?`<div style="display:flex;gap:8px;align-items:baseline;"><span style="font-size:7px;font-weight:900;color:#9ca3af;text-transform:uppercase;white-space:nowrap;">RFC</span><span style="font-size:9px;font-weight:700;color:#111827;">${emp.rfc}</span></div>`:''}
      ${emp.employeeId ?`<div style="display:flex;gap:8px;align-items:baseline;"><span style="font-size:7px;font-weight:900;color:#9ca3af;text-transform:uppercase;white-space:nowrap;">ID Empleado</span><span style="font-size:9px;font-weight:700;color:#111827;">${emp.employeeId}</span></div>`:''}
      ${emp.bankAccount?`<div style="display:flex;gap:8px;align-items:baseline;"><span style="font-size:7px;font-weight:900;color:#9ca3af;text-transform:uppercase;white-space:nowrap;">CLABE / Cuenta</span><span style="font-size:9px;font-weight:700;color:#111827;">${emp.bankAccount}${emp.bankName?' · '+emp.bankName:''}</span></div>`:''}
    </div>
  </div>

  <!-- Ingresos / Deducciones -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">

    <!-- INGRESOS -->
    <div style="border:1px solid #d1fae5;border-radius:8px;overflow:hidden;">
      <div style="background:#ecfdf5;color:#065f46;padding:6px 12px;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid #d1fae5;">+ Ingresos</div>
      <table style="width:100%;border-collapse:collapse;">
        ${subLabel('Sueldo','#f0fdf4','#059669','#d1fae5')}
        ${row('Salario Base del Período',''+item.baseSalary,'#059669')}
        ${item.overtimePay>0?row(`Tiempo Extra (${item.overtimeHours}h × 1.5)`,''+item.overtimePay,'#059669'):''}
        ${bonuses.filter(b=>b.amount>0&&!['ProEx','M.A.D.','S. Gumby','Humildad','La Panoramización','La Auditoría','La Reiteración','ZAPES','Ciclo OODA','S.T.D.','Visualización','Respiración','MiMMOOTs','Positividad','Código de Honor-CDH','Zoho FSM'].some(e=>b.concept?.includes(e))).length>0?
          subLabel('Bonos / Incentivos / Comisiones'):''}
        ${bonuses.filter(b=>b.amount>0).map(b=>row(b.concept||'Bono',''+b.amount,'#059669')).join('')}
        <tr style="background:#f0fdf4;border-top:2px solid #d1fae5;">
          <td style="padding:6px 12px;font-size:10px;font-weight:900;color:#065f46;">Total Ingresos</td>
          <td style="padding:6px 12px;text-align:right;font-size:11px;font-weight:900;color:#065f46;white-space:nowrap;">${fmt(item.grossPay)}</td>
        </tr>
      </table>
    </div>

    <!-- DEDUCCIONES -->
    <div style="border:1px solid #fecaca;border-radius:8px;overflow:hidden;">
      <div style="background:#fef2f2;color:#991b1b;padding:6px 12px;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;border-bottom:1px solid #fecaca;">− Deducciones</div>
      <table style="width:100%;border-collapse:collapse;">
        ${subLabel('Impuestos','#fef2f2','#991b1b','#fecaca')}
        ${item.absenceDeduct>0?row(`Faltas (${item.absenceDays} día${item.absenceDays!==1?'s':''}) — descuento`,''+item.absenceDeduct,'#dc2626'):''}
        ${row('ISR — Retención Estimada',''+item.isr,'#dc2626')}
        ${row('Impuesto de Seguridad Social (IMSS)',''+item.imss,'#dc2626')}
        ${item.infonavit>0?row('INFONAVIT',''+item.infonavit,'#dc2626'):''}
        ${extraDed.filter(d=>d.amount>0).length>0?subLabel('Escarmientos / Deducciones Adicionales','#fef2f2','#991b1b','#fecaca'):''}
        ${extraDed.filter(d=>d.amount>0).map(d=>row(d.concept||'Deducción',''+d.amount,'#dc2626')).join('')}
        <tr style="background:#fff5f5;border-top:2px solid #fecaca;">
          <td style="padding:6px 12px;font-size:10px;font-weight:900;color:#991b1b;">Total Deducciones</td>
          <td style="padding:6px 12px;text-align:right;font-size:11px;font-weight:900;color:#991b1b;white-space:nowrap;">-${fmt(item.totalDeductions)}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Totales -->
  <div style="background:#0f172a;border-radius:10px;padding:14px 24px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:14px;text-align:center;">
    <div><div style="color:#94a3b8;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px;">Ingresos Brutos</div><div style="color:#fff;font-size:14px;font-weight:900;">${fmt(item.grossPay)}</div></div>
    <div><div style="color:#94a3b8;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px;">Total Deducciones</div><div style="color:#f87171;font-size:14px;font-weight:900;">-${fmt(item.totalDeductions)}</div></div>
    <div><div style="color:#94a3b8;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px;">Neto a Pagar</div><div style="color:#34d399;font-size:22px;font-weight:900;">${fmt(item.netPay)}</div></div>
  </div>

  ${item.notes?`<div style="background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:9px 12px;margin-bottom:12px;font-size:9px;color:#92400e;"><strong>Nota:</strong> ${item.notes}</div>`:''}

  <!-- Firmas -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;padding-top:24px;margin-top:auto;">
    ${[{n:item.employeeName,t:'Colaborador — Recibí conforme'},{n:'Recursos Humanos',t:'Elaboró'},{n:'Dirección General',t:'Autorizó'}].map(s=>`
    <div style="text-align:center;"><div style="height:36px;"></div><div style="border-top:1.5px solid #d1d5db;margin-bottom:5px;"></div>
    <div style="font-size:9px;font-weight:900;color:#374151;">${s.n}</div>
    <div style="font-size:8px;color:#9ca3af;font-weight:600;text-transform:uppercase;letter-spacing:.06em;">${s.t}</div></div>`).join('')}
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #f3f4f6;margin-top:14px;padding-top:8px;display:flex;justify-content:space-between;">
    <p style="font-size:8px;color:#9ca3af;font-weight:600;">OleaControls México, S.A. de C.V. · Sistema Integral de Gestión</p>
    <p style="font-size:8px;color:#9ca3af;font-weight:600;">Folio: ${folio} · ${fmtD(new Date())}</p>
  </div>

</div></body></html>`;
}

// ── Hoja de Cultura ───────────────────────────────────────────────────────────
const CULTURA_PERCEPCIONES = [
  'Club 6am',
  'Gigas ilimitados celular',
  'Meta alcanzada',
  'Gimnasio (comprobante mensual)',
  'Limpieza dental (comprobante semestral)',
  'Lectura Reto libro',
  'Consulta médica Preventiva - CMP',
  'Consulta Psicológica Preventiva - CPP',
  'Comisión por imagen personal',
  'Comisión por cuidar herramientas',
  'Comi por llevar herramientas',
];
const CULTURA_ESCARMIENTOS = [
  'ProEx','M.A.D.','S. Gumby','Humildad','La Panoramización',
  'La Auditoría','La Reiteración','ZAPES','Ciclo OODA','S.T.D.',
  'Visualización','Respiración','MiMMOOTs','Positividad',
  'Código de Honor - CDH','Zoho FSM',
];

function buildCulturaHTML(empName, empPos, empData = {}, period, origin = '', catalog = null) {
  const percRows = catalog?.percepciones ? catalog.percepciones.map(c=>c.label) : CULTURA_PERCEPCIONES;
  const escRows  = catalog?.escarmientos ? catalog.escarmientos.map(c=>c.label) : CULTURA_ESCARMIENTOS;
  const start = new Date(period.startDate);
  const end   = new Date(period.endDate);
  const year  = start.getFullYear();
  const monthName = start.toLocaleDateString('es-MX',{month:'long'});

  const days = [];
  const cur = new Date(start);
  while (cur <= end) { days.push(new Date(cur)); cur.setDate(cur.getDate()+1); }
  const DN = ['D','L','M','M','J','V','S'];
  const CW = Math.max(20, Math.min(30, Math.floor(480/Math.max(days.length,1))));

  const dayHdr   = days.map(d=>`<th style="width:${CW}px;padding:2px 1px;text-align:center;border:1px solid #e2e8f0;font-size:7px;font-weight:900;color:#0f172a;background:#f8fafc;">${d.getDate()}</th>`).join('');
  const daySubHdr= days.map(d=>`<th style="width:${CW}px;padding:1px;text-align:center;border:1px solid #e2e8f0;font-size:6px;color:#94a3b8;font-weight:700;background:#f8fafc;">${DN[d.getDay()]}</th>`).join('');
  const cells    = () => days.map(()=>`<td style="width:${CW}px;border:1px solid #e2e8f0;text-align:center;padding:3px 0;"></td>`).join('');
  const conceptRow = (n, label, isEsc) =>
    `<tr style="background:${isEsc?'#fff5f5':'#fff'};">
      <td style="padding:3px 6px;border:1px solid #e2e8f0;font-size:7px;font-weight:900;color:#94a3b8;text-align:center;">${n}</td>
      <td style="padding:3px 8px;border:1px solid #e2e8f0;font-size:8px;font-weight:600;color:${isEsc?'#991b1b':'#374151'};white-space:nowrap;">${label}</td>
      ${cells()}
    </tr>`;

  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Cultura — ${empName}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;background:#fff}
.page{width:1060px;margin:0 auto;padding:18px 24px}
@media print{@page{size:A3 landscape;margin:7mm}.page{padding:0;width:100%}}</style>
</head><body><div class="page">

  <!-- Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #0f172a;padding-bottom:10px;margin-bottom:10px;">
    <div style="display:flex;flex-direction:column;gap:3px;">
      <img src="${origin}/img/logo_olea_new.png" alt="OleaControls" style="width:90px;height:auto;object-fit:contain;"/>
      <span style="font-size:8px;font-weight:900;color:#374151;text-transform:uppercase;letter-spacing:.1em;">Hoja de Cultura</span>
    </div>
    <div style="text-align:right;">
      <div style="font-size:9px;font-weight:800;color:#374151;">OleaControls México, S.A. de C.V.</div>
      <div style="font-size:14px;font-weight:900;color:#0f172a;">Control de Cultura</div>
    </div>
  </div>

  <!-- Info -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:7px;padding:9px 12px;margin-bottom:10px;">
    ${[['Institución','OleaControls México'],['Colaborador',empName],['Cargo',empPos||'—'],['Período',period.name],
       ['Año',''+year],['Mes',monthName.charAt(0).toUpperCase()+monthName.slice(1)],
       ...(empData.nss?[['NSS',empData.nss]]:[]),
       ...(empData.rfc?[['RFC',empData.rfc]]:[])].map(([l,v])=>
      `<div><div style="font-size:6px;font-weight:900;color:#9ca3af;text-transform:uppercase;margin-bottom:1px;">${l}</div>
       <div style="font-size:9px;font-weight:${l==='Colaborador'?'900':'700'};color:#0f172a;">${v}</div></div>`).join('')}
  </div>

  <!-- Tabla -->
  <div style="overflow-x:auto;">
    <table style="border-collapse:collapse;width:100%;">
      <thead>
        <tr>
          <th style="padding:4px 6px;border:1px solid #0f172a;background:#0f172a;color:#fff;font-size:7px;font-weight:900;text-align:center;width:24px;">#</th>
          <th style="padding:4px 10px;border:1px solid #0f172a;background:#0f172a;color:#fff;font-size:8px;font-weight:900;text-align:left;min-width:170px;">Concepto</th>
          ${dayHdr}
        </tr>
        <tr>
          <th style="border:1px solid #cbd5e1;background:#1e293b;"></th>
          <th style="border:1px solid #cbd5e1;background:#1e293b;"></th>
          ${daySubHdr}
        </tr>
      </thead>
      <tbody>
        <tr><td colspan="${days.length+2}" style="padding:4px 10px;background:#ecfdf5;border:1px solid #d1fae5;font-size:8px;font-weight:900;color:#065f46;text-transform:uppercase;letter-spacing:.08em;">Percepciones / Bonificaciones</td></tr>
        ${percRows.map((c,i)=>conceptRow(i+1,c,false)).join('')}
        <tr><td colspan="${days.length+2}" style="padding:4px 10px;background:#fef2f2;border:1px solid #fecaca;font-size:8px;font-weight:900;color:#991b1b;text-transform:uppercase;letter-spacing:.08em;">Escarmientos / Deducciones de Cultura</td></tr>
        ${escRows.map((c,i)=>conceptRow(percRows.length+i+1,c,true)).join('')}
      </tbody>
    </table>
  </div>

  <div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:7px;border-top:1px solid #f3f4f6;">
    <p style="font-size:7px;color:#9ca3af;font-weight:600;">OleaControls México, S.A. de C.V. · Sistema Integral de Gestión</p>
    <p style="font-size:7px;color:#9ca3af;font-weight:600;">${period.name} · Generado: ${new Date().toLocaleDateString('es-MX')}</p>
  </div>

</div></body></html>`;
}

// ── Modal ajuste de ítem ──────────────────────────────────────────────────────
function ItemAdjustModal({ item, onClose, onSave }) {
  const [form, setForm] = useState({
    absenceDays:     item.absenceDays     || 0,
    overtimeHours:   item.overtimeHours   || 0,
    bonuses:         Array.isArray(item.bonuses) ? item.bonuses : [],
    extraDeductions: Array.isArray(item.extraDeductions) ? item.extraDeductions : [],
    notes:           item.notes || '',
  });
  const [saving, setSaving] = useState(false);

  const addBonus    = () => setForm(f=>({...f, bonuses:[...f.bonuses,{concept:'',amount:0}]}));
  const addDeduct   = () => setForm(f=>({...f, extraDeductions:[...f.extraDeductions,{concept:'',amount:0}]}));
  const rmBonus     = (i)=> setForm(f=>({...f, bonuses:f.bonuses.filter((_,j)=>j!==i)}));
  const rmDeduct    = (i)=> setForm(f=>({...f, extraDeductions:f.extraDeductions.filter((_,j)=>j!==i)}));
  const upBonus     = (i,k,v)=> setForm(f=>({...f, bonuses:f.bonuses.map((b,j)=>j===i?{...b,[k]:k==='amount'?parseFloat(v)||0:v}:b)}));
  const upDeduct    = (i,k,v)=> setForm(f=>({...f, extraDeductions:f.extraDeductions.map((d,j)=>j===i?{...d,[k]:k==='amount'?parseFloat(v)||0:v}:d)}));

  const handleSave = async() => {
    setSaving(true);
    try { await onSave(item.id, form); onClose(); }
    catch(e){ alert(e.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-gray-900 text-sm">{item.employeeName}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{item.employeeDept} · Ajustar partida</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-500"/>
          </button>
        </div>

        {/* Faltas y Horas extra */}
        <div className="grid grid-cols-2 gap-3">
          <MF label="Días de Falta">
            <input type="number" min="0" value={form.absenceDays} onChange={e=>setForm(f=>({...f,absenceDays:parseInt(e.target.value)||0}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold bg-gray-50 outline-none focus:bg-white focus:border-rose-300"/>
          </MF>
          <MF label="Horas Extra">
            <input type="number" min="0" step="0.5" value={form.overtimeHours} onChange={e=>setForm(f=>({...f,overtimeHours:parseFloat(e.target.value)||0}))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold bg-gray-50 outline-none focus:bg-white focus:border-emerald-300"/>
          </MF>
        </div>

        {/* Bonos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Bonos / Percepciones</p>
            <button type="button" onClick={addBonus} className="text-[9px] font-black text-primary hover:underline">+ Agregar</button>
          </div>
          {form.bonuses.map((b,i)=>(
            <div key={i} className="flex gap-2 items-center">
              <input value={b.concept} onChange={e=>upBonus(i,'concept',e.target.value)} placeholder="Concepto"
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-medium bg-gray-50 outline-none"/>
              <input type="number" value={b.amount} onChange={e=>upBonus(i,'amount',e.target.value)} placeholder="$"
                className="w-24 border border-emerald-200 rounded-lg px-2.5 py-2 text-xs font-bold bg-emerald-50 outline-none text-emerald-700"/>
              <button onClick={()=>rmBonus(i)} className="text-gray-300 hover:text-rose-500"><X className="h-3.5 w-3.5"/></button>
            </div>
          ))}
        </div>

        {/* Deducciones adicionales */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Deducciones Adicionales</p>
            <button type="button" onClick={addDeduct} className="text-[9px] font-black text-primary hover:underline">+ Agregar</button>
          </div>
          {form.extraDeductions.map((d,i)=>(
            <div key={i} className="flex gap-2 items-center">
              <input value={d.concept} onChange={e=>upDeduct(i,'concept',e.target.value)} placeholder="Concepto"
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-medium bg-gray-50 outline-none"/>
              <input type="number" value={d.amount} onChange={e=>upDeduct(i,'amount',e.target.value)} placeholder="$"
                className="w-24 border border-rose-200 rounded-lg px-2.5 py-2 text-xs font-bold bg-rose-50 outline-none text-rose-600"/>
              <button onClick={()=>rmDeduct(i)} className="text-gray-300 hover:text-rose-500"><X className="h-3.5 w-3.5"/></button>
            </div>
          ))}
        </div>

        {/* Notas */}
        <MF label="Notas Internas">
          <textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Observaciones para esta partida..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium bg-gray-50 outline-none resize-none"/>
        </MF>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50">
            {saving?'Guardando...':'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cultura items catalog ─────────────────────────────────────────────────────
const CULT_PERCEPCIONES = [
  { key:'club6am',    label:'Club 6am',                              costo:39.47 },
  { key:'gigas',      label:'Gigas ilimitados celular',               costo:9.87  },
  { key:'meta',       label:'Meta alcanzada',                         costo:22.00 },
  { key:'gimnasio',   label:'Gimnasio (comprobante mensual)',          costo:18.09 },
  { key:'limpieza',   label:'Limpieza dental (comprobante semestral)', costo:6.58  },
  { key:'lectura',    label:'Lectura Reto libro',                     costo:18.09 },
  { key:'cmp',        label:'Consulta médica Preventiva - CMP',       costo:21.38 },
  { key:'cpp',        label:'Consulta Psicológica Preventiva - CPP',  costo:21.31 },
  { key:'imagen',     label:'Comisión por imagen personal',            costo:11.00 },
  { key:'herr',       label:'Comisión por cuidar herramientas',        costo:5.50  },
  { key:'llevarHerr', label:'Comi por llevar herramientas',            costo:5.50  },
];
const CULT_ESCARMIENTOS = [
  { key:'proex',   label:'ProEx',                  costo:22.00 },
  { key:'mad',     label:'M.A.D.',                 costo:7.00  },
  { key:'gumby',   label:'S. Gumby',               costo:7.00  },
  { key:'humild',  label:'Humildad',               costo:7.00  },
  { key:'panora',  label:'La Panoramización',      costo:5.00  },
  { key:'audit',   label:'La Auditoría',           costo:5.00  },
  { key:'reiter',  label:'La Reiteración',         costo:3.00  },
  { key:'zapes',   label:'ZAPES',                  costo:9.00  },
  { key:'ooda',    label:'Ciclo OODA',             costo:9.00  },
  { key:'std',     label:'S.T.D.',                 costo:6.00  },
  { key:'visual',  label:'Visualización',          costo:22.00 },
  { key:'respir',  label:'Respiración',            costo:22.00 },
  { key:'mimm',    label:'MiMMOOTs',               costo:22.00 },
  { key:'posit',   label:'Positividad',            costo:22.00 },
  { key:'cdh',     label:'Código de Honor - CDH',  costo:33.00 },
  { key:'zoho',    label:'Zoho FSM',               costo:9.00  },
];

// Catálogo por defecto (fallback si aún no se ha guardado uno personalizado en la BD)
const DEFAULT_CULTURA = { percepciones: CULT_PERCEPCIONES, escarmientos: CULT_ESCARMIENTOS };
// Normaliza cualquier catálogo recibido para que siempre tenga las dos listas
const normalizeCatalog = (c) => ({
  percepciones: Array.isArray(c?.percepciones) && c.percepciones.length ? c.percepciones : CULT_PERCEPCIONES,
  escarmientos: Array.isArray(c?.escarmientos) && c.escarmientos.length ? c.escarmientos : CULT_ESCARMIENTOS,
});

function initCulturaForm(item, catalog = DEFAULT_CULTURA) {
  const percList = catalog.percepciones || CULT_PERCEPCIONES;
  const escList  = catalog.escarmientos || CULT_ESCARMIENTOS;
  const bonuses  = Array.isArray(item?.bonuses)         ? item.bonuses         : [];
  const extraDed = Array.isArray(item?.extraDeductions)  ? item.extraDeductions  : [];
  const perc = {};
  percList.forEach(c => {
    const found = bonuses.find(b => b.concept === c.label);
    perc[c.key] = { dias: found ? Math.round(found.amount / c.costo) : 0, costo: c.costo };
  });
  const esc = {};
  escList.forEach(c => {
    const found = extraDed.find(d => d.concept === c.label);
    esc[c.key] = { dias: found ? Math.round(found.amount / c.costo) : 0, costo: c.costo };
  });
  return { perc, esc };
}

function CulturaModal({ item, catalog = DEFAULT_CULTURA, onClose, onSave }) {
  const percList = catalog.percepciones || CULT_PERCEPCIONES;
  const escList  = catalog.escarmientos || CULT_ESCARMIENTOS;
  const [form, setForm] = useState(() => initCulturaForm(item, catalog));
  const [saving, setSaving] = useState(false);

  const setPerc = (key, dias) => setForm(f => ({ ...f, perc: { ...f.perc, [key]: { ...f.perc[key], dias: Math.max(0, parseInt(dias)||0) } } }));
  const setEsc  = (key, dias) => setForm(f => ({ ...f, esc:  { ...f.esc,  [key]: { ...f.esc[key],  dias: Math.max(0, parseInt(dias)||0) } } }));

  const totalPerc = percList.reduce((s,c)=> s + (form.perc[c.key]?.dias||0)*(form.perc[c.key]?.costo||c.costo), 0);
  const totalEsc  = escList.reduce((s,c)=> s + (form.esc[c.key]?.dias||0)*(form.esc[c.key]?.costo||c.costo),  0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const newBonuses = percList
        .filter(c => (form.perc[c.key]?.dias||0) > 0)
        .map(c => ({ concept: c.label, amount: Math.round((form.perc[c.key].dias * form.perc[c.key].costo)*100)/100 }));
      const newDed = escList
        .filter(c => (form.esc[c.key]?.dias||0) > 0)
        .map(c => ({ concept: c.label, amount: Math.round((form.esc[c.key].dias * form.esc[c.key].costo)*100)/100 }));

      const existingBonuses = (item.bonuses||[]).filter(b => !percList.some(c=>c.label===b.concept));
      const existingDed     = (item.extraDeductions||[]).filter(d => !escList.some(c=>c.label===d.concept));

      await onSave(item.id, {
        absenceDays:     item.absenceDays||0,
        overtimeHours:   item.overtimeHours||0,
        bonuses:         [...existingBonuses, ...newBonuses],
        extraDeductions: [...existingDed, ...newDed],
        notes:           item.notes||'',
      });
      onClose();
    } catch(e){ alert(e.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b flex items-center justify-between rounded-t-2xl">
          <div>
            <p className="font-black text-gray-900">{item.employeeName}</p>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Hoja de Cultura · Percepciones y Escarmientos</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-500"/>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Percepciones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Percepciones / Bonificaciones</p>
              <span className="text-sm font-black text-emerald-700">{fmt(totalPerc)}</span>
            </div>
            <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-emerald-100/60">
                  <th className="text-left px-3 py-2 font-black text-emerald-800 text-[9px] uppercase tracking-wider">Concepto</th>
                  <th className="text-center px-3 py-2 font-black text-emerald-800 text-[9px] uppercase tracking-wider w-20">Días/Veces</th>
                  <th className="text-center px-3 py-2 font-black text-emerald-800 text-[9px] uppercase tracking-wider w-20">Costo Unit.</th>
                  <th className="text-right px-3 py-2 font-black text-emerald-800 text-[9px] uppercase tracking-wider w-24">Total</th>
                </tr></thead>
                <tbody className="divide-y divide-emerald-100">
                  {percList.map(c => {
                    const dias  = form.perc[c.key]?.dias||0;
                    const costo = form.perc[c.key]?.costo||c.costo;
                    return (
                      <tr key={c.key} className={dias>0?'bg-emerald-50':''}>
                        <td className="px-3 py-2 text-gray-700 font-medium">{c.label}</td>
                        <td className="px-3 py-2 text-center">
                          <input type="number" min="0" value={dias} onChange={e=>setPerc(c.key,e.target.value)}
                            className="w-16 text-center border border-emerald-200 rounded-lg px-2 py-1 text-sm font-bold bg-white outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"/>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-400 font-bold">${costo.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-black text-emerald-700">{dias>0?fmt(dias*costo):'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr className="bg-emerald-100">
                  <td colSpan={3} className="px-3 py-2 font-black text-emerald-800 text-xs uppercase tracking-wider">Total Percepciones</td>
                  <td className="px-3 py-2 text-right font-black text-emerald-800 text-sm">{fmt(totalPerc)}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>

          {/* Escarmientos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Escarmientos / Deducciones de Cultura</p>
              <span className="text-sm font-black text-rose-600">{fmt(totalEsc)}</span>
            </div>
            <div className="bg-rose-50/50 rounded-xl border border-rose-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-rose-100/60">
                  <th className="text-left px-3 py-2 font-black text-rose-800 text-[9px] uppercase tracking-wider">Concepto</th>
                  <th className="text-center px-3 py-2 font-black text-rose-800 text-[9px] uppercase tracking-wider w-20">Días/Veces</th>
                  <th className="text-center px-3 py-2 font-black text-rose-800 text-[9px] uppercase tracking-wider w-20">Costo Unit.</th>
                  <th className="text-right px-3 py-2 font-black text-rose-800 text-[9px] uppercase tracking-wider w-24">Total</th>
                </tr></thead>
                <tbody className="divide-y divide-rose-100">
                  {escList.map(c => {
                    const dias  = form.esc[c.key]?.dias||0;
                    const costo = form.esc[c.key]?.costo||c.costo;
                    return (
                      <tr key={c.key} className={dias>0?'bg-rose-50':''}>
                        <td className="px-3 py-2 text-gray-700 font-medium">{c.label}</td>
                        <td className="px-3 py-2 text-center">
                          <input type="number" min="0" value={dias} onChange={e=>setEsc(c.key,e.target.value)}
                            className="w-16 text-center border border-rose-200 rounded-lg px-2 py-1 text-sm font-bold bg-white outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-200"/>
                        </td>
                        <td className="px-3 py-2 text-center text-gray-400 font-bold">${costo.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right font-black text-rose-600">{dias>0?fmt(dias*costo):'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr className="bg-rose-100">
                  <td colSpan={3} className="px-3 py-2 font-black text-rose-800 text-xs uppercase tracking-wider">Total Escarmientos</td>
                  <td className="px-3 py-2 text-right font-black text-rose-800 text-sm">{fmt(totalEsc)}</td>
                </tr></tfoot>
              </table>
            </div>
          </div>

          {/* Resumen */}
          <div className="bg-gray-900 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
            <div><p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">+ Percepciones</p><p className="text-emerald-400 font-black text-base">{fmt(totalPerc)}</p></div>
            <div><p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">− Escarmientos</p><p className="text-rose-400 font-black text-base">{fmt(totalEsc)}</p></div>
            <div><p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">Neto Cultura</p><p className="text-white font-black text-base">{fmt(totalPerc - totalEsc)}</p></div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all disabled:opacity-50">
              {saving?'Guardando...':'Guardar Cultura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Configuración del catálogo de Cultura ─────────────────────────────────────
const genKey = () => `k_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;

// Sección editable (módulo-nivel para no perder el foco de los inputs al re-renderizar)
function CulturaSection({ title, accent, list, onField, onRemove, onAdd }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className={cn('text-[10px] font-black uppercase tracking-widest', accent.text)}>{title}</p>
        <button type="button" onClick={onAdd}
          className={cn('flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg transition-all', accent.btn)}>
          <Plus className="h-3 w-3"/> Agregar
        </button>
      </div>
      <div className={cn('rounded-xl border overflow-hidden', accent.border)}>
        <table className="w-full text-xs">
          <thead><tr className={accent.head}>
            <th className={cn('text-left px-3 py-2 font-black text-[9px] uppercase tracking-wider', accent.headText)}>Concepto</th>
            <th className={cn('text-center px-3 py-2 font-black text-[9px] uppercase tracking-wider w-28', accent.headText)}>Costo Unit. $</th>
            <th className="w-10"/>
          </tr></thead>
          <tbody className={cn('divide-y', accent.divide)}>
            {list.length===0 && (
              <tr><td colSpan={3} className="px-3 py-4 text-center text-[10px] font-bold text-gray-300">Sin conceptos — usa “Agregar”.</td></tr>
            )}
            {list.map((c,i)=>(
              <tr key={c.key}>
                <td className="px-3 py-1.5">
                  <input value={c.label} onChange={e=>onField(i,'label',e.target.value)} placeholder="Nombre del concepto"
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white outline-none focus:border-gray-400"/>
                </td>
                <td className="px-3 py-1.5">
                  <input type="number" min="0" step="0.01" value={c.costo} onChange={e=>onField(i,'costo',e.target.value)}
                    className="w-full text-center border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold bg-white outline-none focus:border-gray-400"/>
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button type="button" onClick={()=>onRemove(i)} title="Eliminar concepto"
                    className="h-6 w-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all">
                    <Trash2 className="h-3.5 w-3.5"/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CulturaConfigModal({ catalog = DEFAULT_CULTURA, onClose, onSaved }) {
  const [perc, setPerc] = useState(() => (catalog.percepciones || CULT_PERCEPCIONES).map(c => ({ ...c })));
  const [esc,  setEsc]  = useState(() => (catalog.escarmientos || CULT_ESCARMIENTOS).map(c => ({ ...c })));
  const [saving, setSaving] = useState(false);

  const upRow  = (setter) => (i, field, val) =>
    setter(list => list.map((r,j) => j===i ? { ...r, [field]: val } : r));
  const rmRow  = (setter) => (i) => setter(list => list.filter((_,j)=>j!==i));
  const addRow = (setter) => () => setter(list => [...list, { key: genKey(), label:'', costo:0 }]);

  const handleSave = async () => {
    // Limpieza: descartar filas sin nombre y normalizar el costo a número
    const clean = (list) => list
      .map(r => ({ key: r.key || genKey(), label: (r.label||'').trim(), costo: Math.round((parseFloat(r.costo)||0)*100)/100 }))
      .filter(r => r.label);
    const value = { percepciones: clean(perc), escarmientos: clean(esc) };

    if (!value.percepciones.length && !value.escarmientos.length) {
      alert('Agrega al menos un concepto antes de guardar.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'CULTURA_CATALOG', value }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'No se pudo guardar');
      onSaved(normalizeCatalog(value));
    } catch(e) { alert(e.message); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-teal-50 flex items-center justify-center">
              <Settings className="h-5 w-5 text-teal-600"/>
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm">Configurar Catálogo de Cultura</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Percepciones y escarmientos · costos unitarios</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-500"/>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5"/>
            <p className="text-[10px] font-bold text-amber-700">
              Si renombras un concepto, los registros ya capturados con el nombre anterior no se actualizan. Cambiar el costo solo afecta capturas nuevas.
            </p>
          </div>

          <CulturaSection
            title="Percepciones / Bonificaciones" list={perc}
            accent={{ text:'text-emerald-600', btn:'bg-emerald-50 text-emerald-700 hover:bg-emerald-100', border:'border-emerald-100', head:'bg-emerald-100/60', headText:'text-emerald-800', divide:'divide-emerald-100' }}
            onField={upRow(setPerc)} onRemove={rmRow(setPerc)} onAdd={addRow(setPerc)}
          />
          <CulturaSection
            title="Escarmientos / Deducciones de Cultura" list={esc}
            accent={{ text:'text-rose-500', btn:'bg-rose-50 text-rose-600 hover:bg-rose-100', border:'border-rose-100', head:'bg-rose-100/60', headText:'text-rose-800', divide:'divide-rose-100' }}
            onField={upRow(setEsc)} onRemove={rmRow(setEsc)} onAdd={addRow(setEsc)}
          />

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-teal-700 transition-all disabled:opacity-50">
              {saving?'Guardando...':'Guardar Catálogo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Drawer de detalle de período ──────────────────────────────────────────────
function PeriodDrawer({ periodId, catalog = DEFAULT_CULTURA, onClose, onRefresh }) {
  const [period,      setPeriod]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [editItem,    setEditItem]    = useState(null);
  const [culturaItem, setCulturaItem] = useState(null);
  const [acting,      setActing]      = useState(false);
  const [slipLoading, setSlipLoading] = useState(null); // itemId loading
  const printRef = useRef(null);

  const load = useCallback(async()=>{
    setLoading(true);
    try { const d = await apiFetch(`/api/payroll?id=${periodId}`).then(r=>r.json()); setPeriod(d); }
    catch(e){ console.error(e); }
    finally{ setLoading(false); }
  },[periodId]);

  useEffect(()=>{ load(); },[load]);

  const items = useMemo(()=>{
    if(!period) return [];
    const q = search.toLowerCase();
    if(!q) return period.items||[];
    return (period.items||[]).filter(i=>i.employeeName.toLowerCase().includes(q)||i.employeeDept?.toLowerCase().includes(q));
  },[period,search]);

  const handleAction = async(action)=>{
    if(action==='delete' && !confirm('¿Eliminar este período de nómina? Se borrarán todos los registros.')) return;
    setActing(true);
    try {
      if(action==='delete'){
        await apiFetch('/api/payroll',{method:'DELETE',body:JSON.stringify({id:periodId})});
        onRefresh(); onClose(); return;
      }
      await apiFetch(`/api/payroll?action=${action}`,{method:'POST',body:JSON.stringify({id:periodId})});
      load(); onRefresh();
    } catch(e){ alert(e.message); } finally{ setActing(false); }
  };

  const handleSaveItem = async(itemId, form)=>{
    await apiFetch('/api/payroll?action=update-item',{
      method:'POST',
      body: JSON.stringify({ itemId, ...form }),
    });
    load(); onRefresh();
  };

  // Recibo individual
  const handleSlip = async(item)=>{
    setSlipLoading(item.id);
    let emp = {};
    try { const r = await apiFetch(`/api/employees?id=${item.employeeId}`); if(r.ok) emp = await r.json(); } catch(_){}
    setSlipLoading(null);
    const html = buildSlipHTML(item, period, emp, window.location.origin);
    const win  = window.open('','_blank','width=860,height=900');
    win.document.write(html); win.document.close();
    setTimeout(()=>win.print(), 600);
  };

  // Cultura individual
  const handleCultura = async(item)=>{
    setSlipLoading(`c-${item.id}`);
    let emp = {};
    try { const r = await apiFetch(`/api/employees?id=${item.employeeId}`); if(r.ok) emp = await r.json(); } catch(_){}
    setSlipLoading(null);
    const html = buildCulturaHTML(item.employeeName, item.employeePos||item.employeeDept, emp, period, window.location.origin, catalog);
    const win  = window.open('','_blank','width=1100,height=900');
    win.document.write(html); win.document.close();
    setTimeout(()=>win.print(), 600);
  };

  // Todas las culturas — una por página
  const handleAllCulturas = async()=>{
    setActing(true);
    const allItems = period?.items || [];
    const empMap = {};
    await Promise.all(allItems.map(async it=>{
      try { const r = await apiFetch(`/api/employees?id=${it.employeeId}`); if(r.ok) empMap[it.employeeId]=await r.json(); } catch(_){}
    }));
    setActing(false);
    const pages = allItems.map((it,i)=>{
      const empData = empMap[it.employeeId]||{};
      const html    = buildCulturaHTML(it.employeeName, it.employeePos||it.employeeDept, empData, period, window.location.origin, catalog);
      const body    = html.match(/<body>([\s\S]*)<\/body>/)?.[1]||html;
      return `<div style="page-break-after:${i<allItems.length-1?'always':'avoid'}">${body}</div>`;
    });
    const cssMatch = buildCulturaHTML(allItems[0]?.employeeName||'', '', {}, period, window.location.origin, catalog).match(/<style>([\s\S]*)<\/style>/);
    const css = cssMatch?cssMatch[1]:'';
    const combined = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Cultura — ${period?.name}</title><style>${css}</style></head><body>${pages.join('')}</body></html>`;
    const win = window.open('','_blank','width=1100,height=900');
    win.document.write(combined); win.document.close();
    setTimeout(()=>win.print(), 800);
  };

  // Todos los recibos — un recibo por página, en una sola ventana
  const handleAllSlips = async()=>{
    setActing(true);
    const allItems = period?.items || [];
    // Fetch employees in batch
    const empMap = {};
    await Promise.all(allItems.map(async it => {
      try {
        const r = await apiFetch(`/api/employees?id=${it.employeeId}`);
        if(r.ok) empMap[it.employeeId] = await r.json();
      } catch(_){}
    }));
    setActing(false);
    const pages = allItems.map((it,i)=>{
      const empData = empMap[it.employeeId]||{};
      const html    = buildSlipHTML(it, period, empData, window.location.origin);
      // Extraemos solo el <body> para concatenar páginas
      const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/);
      const body      = bodyMatch ? bodyMatch[1] : html;
      return `<div style="page-break-after:${i<allItems.length-1?'always':'avoid'}">${body}</div>`;
    });

    // Reutilizamos el CSS del primer recibo
    const cssMatch = buildSlipHTML(allItems[0], period, empMap[allItems[0]?.employeeId]||{}, window.location.origin).match(/<style>([\s\S]*)<\/style>/);
    const css = cssMatch ? cssMatch[1] : '';

    const combined = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Todos los Recibos — ${period?.name}</title><style>${css}</style></head><body>${pages.join('')}</body></html>`;
    const win = window.open('','_blank','width=860,height=900');
    win.document.write(combined);
    win.document.close();
    setTimeout(()=>win.print(), 800);
  };

  const handlePrint = ()=>{
    const win = window.open('','_blank');
    win.document.write(`
      <html><head><title>Nómina ${period?.name}</title>
      <style>
        body{font-family:sans-serif;font-size:11px;color:#111;margin:20px}
        h1{font-size:16px;margin:0 0 4px}
        .meta{font-size:10px;color:#555;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:10px}
        th{background:#f3f4f6;text-align:left;padding:6px 8px;font-size:9px;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb}
        td{padding:5px 8px;border-bottom:1px solid #f3f4f6}
        tr:last-child td{border-bottom:none}
        .right{text-align:right}
        .bold{font-weight:700}
        .total-row td{background:#f9fafb;font-weight:700;border-top:2px solid #e5e7eb}
        .net{color:#059669}
        .deduct{color:#dc2626}
        @media print{@page{margin:15mm}}
      </style></head><body>
      <h1>Nómina — ${period?.name}</h1>
      <div class="meta">
        Período: ${fmtD(period?.startDate)} al ${fmtD(period?.endDate)} · Tipo: ${TYPE_LABELS[period?.type]||''} ·
        Generada: ${fmtD(period?.createdAt)} · Colaboradores: ${period?.employeeCount}
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Colaborador</th><th>Área</th>
            <th class="right">Salario Base</th>
            <th class="right">Faltas</th>
            <th class="right">Horas Extra</th>
            <th class="right">Bonos</th>
            <th class="right">Percepción Bruta</th>
            <th class="right">IMSS</th>
            <th class="right">ISR</th>
            <th class="right">Total Deducc.</th>
            <th class="right bold net">Neto a Pagar</th>
          </tr>
        </thead>
        <tbody>
          ${(period?.items||[]).map((it,i)=>`
            <tr>
              <td>${i+1}</td>
              <td class="bold">${it.employeeName}</td>
              <td>${it.employeeDept||'—'}</td>
              <td class="right">${fmt(it.baseSalary)}</td>
              <td class="right deduct">${it.absenceDays>0?`-${fmt(it.absenceDeduct)}`:'—'}</td>
              <td class="right">${it.overtimeHours>0?`+${fmt(it.overtimePay)}`:'—'}</td>
              <td class="right">${it.bonusTotal>0?`+${fmt(it.bonusTotal)}`:'—'}</td>
              <td class="right bold">${fmt(it.grossPay)}</td>
              <td class="right deduct">${fmt(it.imss)}</td>
              <td class="right deduct">${fmt(it.isr)}</td>
              <td class="right deduct">${fmt(it.totalDeductions)}</td>
              <td class="right bold net">${fmt(it.netPay)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="7" class="bold">TOTALES</td>
            <td class="right bold">${fmt(period?.totalGross)}</td>
            <td colspan="2"></td>
            <td class="right deduct bold">${fmt(period?.totalDeductions)}</td>
            <td class="right net bold">${fmt(period?.totalNet)}</td>
          </tr>
        </tfoot>
      </table>
      <br/><p style="font-size:9px;color:#999">Documento generado automáticamente · OleaControls HR System</p>
      </body></html>
    `);
    win.document.close(); win.print();
  };

  const scfg = period ? (STATUS_CFG[period.status]||STATUS_CFG.DRAFT) : STATUS_CFG.DRAFT;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
      <div className="relative ml-auto h-full w-full max-w-7xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin h-6 w-6 rounded-full border-2 border-primary border-t-transparent"/>
          </div>
        ):(
          <>
            <div className="px-6 py-5 border-b bg-gray-50 flex items-start justify-between gap-4 shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                  <span className={cn('text-[9px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest flex items-center gap-1.5',scfg.cls)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full',scfg.dot)}/>
                    {scfg.label}
                  </span>
                  <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                    {TYPE_LABELS[period?.type]||''}
                  </span>
                </div>
                <h3 className="font-black text-gray-900 text-base leading-snug">{period?.name}</h3>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                  {fmtD(period?.startDate)} — {fmtD(period?.endDate)} · {period?.employeeCount} colaboradores
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                <button onClick={handlePrint} className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-black uppercase transition-all">
                  <Printer className="h-3.5 w-3.5"/> Resumen
                </button>
                <button onClick={handleAllSlips} disabled={acting||!(period?.items?.length)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase transition-all disabled:opacity-50">
                  <Download className="h-3.5 w-3.5"/> Todos los Recibos
                </button>
                <button onClick={handleAllCulturas} disabled={acting||!(period?.items?.length)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-black uppercase transition-all disabled:opacity-50">
                  <FileText className="h-3.5 w-3.5"/> Cultura (Todos)
                </button>
                {period?.status==='DRAFT'&&(
                  <button onClick={()=>handleAction('approve')} disabled={acting}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase transition-all disabled:opacity-50">
                    <CheckCircle2 className="h-3.5 w-3.5"/> Aprobar
                  </button>
                )}
                {period?.status==='APPROVED'&&(
                  <button onClick={()=>handleAction('pay')} disabled={acting}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase transition-all disabled:opacity-50">
                    <Wallet className="h-3.5 w-3.5"/> Marcar Pagada
                  </button>
                )}
                <button onClick={onClose} className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                  <X className="h-4 w-4 text-gray-500"/>
                </button>
              </div>
            </div>

            {/* KPIs del período */}
            <div className="px-6 py-4 border-b grid grid-cols-4 gap-3 shrink-0">
              {[
                { label:'Percepción Bruta', value:fmt(period?.totalGross),      cls:'text-gray-900', icon:TrendingUp,  icls:'text-primary'      },
                { label:'Total Deducciones',value:fmt(period?.totalDeductions), cls:'text-rose-600', icon:TrendingDown,icls:'text-rose-400'      },
                { label:'Total Neto',       value:fmt(period?.totalNet),        cls:'text-emerald-700',icon:DollarSign,icls:'text-emerald-500'  },
                { label:'Colaboradores',    value:period?.employeeCount,        cls:'text-gray-900', icon:Users,       icls:'text-gray-400'     },
              ].map(k=>(
                <div key={k.label} className="bg-gray-50/80 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className={cn('h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm')}>
                    <k.icon className={cn('h-4 w-4',k.icls)}/>
                  </div>
                  <div>
                    <p className={cn('text-sm font-black leading-none',k.cls)}>{k.value}</p>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{k.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Búsqueda */}
            <div className="px-6 py-3 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar colaborador..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-primary/50"/>
              </div>
            </div>

            {/* Tabla de ítems */}
            <div className="flex-1 overflow-auto" ref={printRef}>
              <table className="w-full text-sm min-w-[900px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50/95 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-4 py-3 text-left">Colaborador</th>
                    <th className="px-3 py-3 text-right">Salario Base</th>
                    <th className="px-3 py-3 text-right text-rose-400">Faltas</th>
                    <th className="px-3 py-3 text-right text-emerald-600">Horas Extra</th>
                    <th className="px-3 py-3 text-right text-blue-600">Bonos</th>
                    <th className="px-3 py-3 text-right font-black text-gray-600">Bruto</th>
                    <th className="px-3 py-3 text-right text-rose-400">IMSS</th>
                    <th className="px-3 py-3 text-right text-rose-400">ISR</th>
                    <th className="px-3 py-3 text-right text-rose-400">Deducc.</th>
                    <th className="px-3 py-3 text-right text-emerald-700 font-black">Neto</th>
                    <th className="px-4 py-3 text-right sticky right-0 bg-gray-50/95 shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.08)]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map(item=>(
                    <tr key={item.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center text-white text-[9px] font-black shrink-0',avatarColor(item.employeeName))}>
                            {initials(item.employeeName)}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-gray-900 leading-tight">{item.employeeName}</p>
                            <p className="text-[9px] font-bold text-gray-400">{item.employeeDept||item.employeePos||'—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-[11px] font-bold text-gray-600">{fmt(item.baseSalary)}</td>
                      <td className="px-3 py-3 text-right text-[11px] font-bold">
                        {item.absenceDays>0
                          ? <span className="text-rose-500">-{fmt(item.absenceDeduct)}<br/><span className="text-[9px] text-rose-400">{item.absenceDays}d</span></span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-[11px] font-bold">
                        {item.overtimeHours>0
                          ? <span className="text-emerald-600">+{fmt(item.overtimePay)}<br/><span className="text-[9px] text-emerald-400">{item.overtimeHours}h</span></span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-[11px] font-bold">
                        {item.bonusTotal>0
                          ? <span className="text-blue-600">+{fmt(item.bonusTotal)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-[11px] font-black text-gray-900">{fmt(item.grossPay)}</td>
                      <td className="px-3 py-3 text-right text-[10px] font-bold text-rose-500">{fmt(item.imss)}</td>
                      <td className="px-3 py-3 text-right text-[10px] font-bold text-rose-500">{fmt(item.isr)}</td>
                      <td className="px-3 py-3 text-right text-[11px] font-bold text-rose-600">{fmt(item.totalDeductions)}</td>
                      <td className="px-3 py-3 text-right text-[12px] font-black text-emerald-700">{fmt(item.netPay)}</td>
                      <td className="px-4 py-3 text-right sticky right-0 bg-white group-hover:bg-gray-50 shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-end gap-1.5 transition-all">
                          {/* Recibo individual */}
                          <button onClick={()=>handleSlip(item)} disabled={!!slipLoading}
                            title="Imprimir recibo de nómina"
                            className="h-7 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 border border-indigo-100 text-[9px] font-black uppercase transition-all flex items-center gap-1 disabled:opacity-50">
                            {slipLoading===item.id
                              ? <div className="h-3 w-3 rounded-full border border-indigo-300 border-t-indigo-600 animate-spin"/>
                              : <><Printer className="h-3 w-3"/> Recibo</>}
                          </button>
                          {/* Cultura individual */}
                          <button onClick={()=>handleCultura(item)} disabled={!!slipLoading}
                            title="Imprimir hoja de cultura"
                            className="h-7 px-2.5 rounded-lg bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-600 border border-teal-100 text-[9px] font-black uppercase transition-all flex items-center gap-1 disabled:opacity-50">
                            {slipLoading===`c-${item.id}`
                              ? <div className="h-3 w-3 rounded-full border border-teal-300 border-t-teal-600 animate-spin"/>
                              : <><FileText className="h-3 w-3"/> Cultura</>}
                          </button>
                          {/* Ajustar (solo borrador) */}
                          {period?.status==='DRAFT'&&(
                            <>
                              <button onClick={()=>setEditItem(item)}
                                className="h-7 px-2.5 rounded-lg bg-gray-100 hover:bg-primary hover:text-white text-gray-500 text-[9px] font-black uppercase transition-all flex items-center gap-1">
                                <Edit2 className="h-3 w-3"/> Ajustar
                              </button>
                              <button onClick={()=>setCulturaItem(item)}
                                className="h-7 px-2.5 rounded-lg bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-600 border border-teal-100 text-[9px] font-black uppercase transition-all flex items-center gap-1">
                                <FileText className="h-3 w-3"/> Cultura
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Fila de totales */}
                <tfoot>
                  <tr className="bg-gray-900/5 border-t-2 border-gray-200">
                    <td className="px-4 py-3 text-[10px] font-black text-gray-700 uppercase tracking-widest">TOTALES ({items.length} colaboradores)</td>
                    <td className="px-3 py-3 text-right text-[11px] font-black text-gray-700">
                      {fmt(items.reduce((s,i)=>s+i.baseSalary,0))}
                    </td>
                    <td colSpan={3}/>
                    <td className="px-3 py-3 text-right text-[12px] font-black text-gray-900">{fmt(period?.totalGross)}</td>
                    <td className="px-3 py-3 text-right text-[10px] font-black text-rose-500">{fmt(items.reduce((s,i)=>s+i.imss,0))}</td>
                    <td className="px-3 py-3 text-right text-[10px] font-black text-rose-500">{fmt(items.reduce((s,i)=>s+i.isr,0))}</td>
                    <td className="px-3 py-3 text-right text-[12px] font-black text-rose-600">{fmt(period?.totalDeductions)}</td>
                    <td className="px-3 py-3 text-right text-[14px] font-black text-emerald-700">{fmt(period?.totalNet)}</td>
                    <td className="sticky right-0 bg-[#f4f4f5] shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.08)]"/>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer acciones */}
            {period?.status==='DRAFT'&&(
              <div className="px-6 py-4 border-t bg-gray-50/50 flex justify-between items-center shrink-0">
                <button onClick={()=>handleAction('delete')} disabled={acting}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase hover:bg-rose-100 transition-all disabled:opacity-50">
                  <Trash2 className="h-3.5 w-3.5"/> Eliminar Nómina
                </button>
                <p className="text-[9px] font-bold text-gray-400">Los cálculos se actualizan al guardar ajustes individuales</p>
              </div>
            )}
          </>
        )}
      </div>

      {editItem&&(
        <ItemAdjustModal item={editItem} onClose={()=>setEditItem(null)} onSave={handleSaveItem}/>
      )}
      {culturaItem&&(
        <CulturaModal item={culturaItem} catalog={catalog} onClose={()=>setCulturaItem(null)} onSave={handleSaveItem}/>
      )}
    </div>
  );
}

// ── Modal crear período ────────────────────────────────────────────────────────
function CreatePeriodModal({ onClose, onCreated }) {
  const today     = new Date();
  const dayStr    = (d) => d.toISOString().split('T')[0];
  const [form, setForm] = useState({
    name:      '',
    type:      'QUINCENAL',
    startDate: dayStr(today),
    endDate:   dayStr(new Date(today.getTime() + 14*86400000)),
    notes:     '',
  });
  const [saving, setSaving] = useState(false);

  const autoName = () => {
    const s = new Date(form.startDate);
    const m = s.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
    const d = s.getDate();
    if(form.type==='QUINCENAL') return d<=15 ? `1ª Quincena ${m}` : `2ª Quincena ${m}`;
    if(form.type==='MENSUAL')   return `Nómina Mensual ${m}`;
    return `Semana del ${dayStr(s)}`;
  };

  const handleCreate = async e=>{
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim()||autoName() };
      const r = await apiFetch('/api/payroll',{method:'POST',body:JSON.stringify(payload)});
      if(!r.ok) throw new Error((await r.json()).error||'Error');
      const data = await r.json();
      onCreated(data);
    } catch(e){ alert(e.message); } finally{ setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary"/>
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm">Generar Nueva Nómina</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Se calcularán todos los colaboradores activos</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
            <X className="h-4 w-4 text-gray-500"/>
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5"/>
          <p className="text-[10px] font-bold text-amber-700">
            El sistema calculará automáticamente IMSS (6.75%) e ISR según tabla SAT por cada colaborador con salario registrado.
          </p>
        </div>

        <form onSubmit={handleCreate} className="space-y-3">
          <MF label="Tipo de Período">
            <div className="grid grid-cols-3 gap-2">
              {[['SEMANAL','Semanal'],['QUINCENAL','Quincenal'],['MENSUAL','Mensual']].map(([v,l])=>(
                <button key={v} type="button" onClick={()=>setForm(f=>({...f,type:v}))}
                  className={cn('py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all',
                    form.type===v?'bg-primary border-primary text-white shadow-sm':'bg-white border-gray-200 text-gray-500 hover:border-gray-300')}>
                  {l}
                </button>
              ))}
            </div>
          </MF>

          <div className="grid grid-cols-2 gap-3">
            <MF label="Fecha Inicio">
              <input type="date" required value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/>
            </MF>
            <MF label="Fecha Fin">
              <input type="date" required value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/>
            </MF>
          </div>

          <MF label={`Nombre del Período (vacío = auto: "${autoName()}")`}>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              placeholder={autoName()}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/>
          </MF>

          <MF label="Notas (opcional)">
            <textarea rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Observaciones del período..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50 resize-none"/>
          </MF>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all">Cancelar</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {saving?(<><div className="h-3 w-3 rounded-full border border-white/30 border-t-white animate-spin"/><span>Generando…</span></>):'Generar Nómina'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────────
export default function Payroll() {
  const [periods,    setPeriods]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected,   setSelected]   = useState(null);
  const [search,     setSearch]     = useState('');
  const [catalog,    setCatalog]    = useState(DEFAULT_CULTURA);
  const [showConfig, setShowConfig] = useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const d = await apiFetch('/api/payroll').then(r=>r.json());
      setPeriods(d.periods||[]);
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  },[]);

  const loadCatalog = useCallback(async()=>{
    try {
      const c = await apiFetch('/api/config?key=CULTURA_CATALOG').then(r=>r.json());
      setCatalog(normalizeCatalog(c));
    } catch(e){ console.error(e); }
  },[]);

  useEffect(()=>{ load(); loadCatalog(); },[load, loadCatalog]);

  const filtered = useMemo(()=>{
    const q = search.toLowerCase();
    return !q ? periods : periods.filter(p=>p.name.toLowerCase().includes(q)||p.type.toLowerCase().includes(q));
  },[periods,search]);

  const stats = useMemo(()=>{
    const paid     = periods.filter(p=>p.status==='PAID');
    const lastPaid = paid[0];
    return {
      total:     periods.length,
      draft:     periods.filter(p=>p.status==='DRAFT').length,
      approved:  periods.filter(p=>p.status==='APPROVED').length,
      lastTotal: lastPaid?.totalNet || 0,
    };
  },[periods]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Sistema de Nómina</h2>
          <p className="text-sm text-gray-500 font-medium mt-0.5">Generación, revisión y aprobación de nóminas por período</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setShowConfig(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all">
            <Settings className="h-4 w-4 text-teal-600"/> Configurar Cultura
          </button>
          <button onClick={()=>setShowCreate(true)}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
            <Plus className="h-4 w-4"/> Nueva Nómina
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Total Períodos',   value:stats.total,    top:'bg-primary',      icon:FileText    },
          { label:'En Borrador',      value:stats.draft,    top:'bg-amber-400',    icon:Clock       },
          { label:'Por Pagar',        value:stats.approved, top:'bg-blue-500',     icon:CheckCircle2},
          { label:'Último Neto Pagado',value:fmt(stats.lastTotal),top:'bg-emerald-500',icon:DollarSign},
        ].map(s=>(
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className={cn('h-1',s.top)}/>
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                <s.icon className="h-4 w-4 text-gray-400"/>
              </div>
              <div>
                <p className="text-xl font-black text-gray-900 leading-none">{s.value}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar período..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary/50"/>
      </div>

      {/* Tabla de períodos */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading?(
          <div className="divide-y">{[1,2,3,4].map(i=>(
            <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
              <div className="h-10 w-10 bg-gray-100 rounded-xl shrink-0"/>
              <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/3"/><div className="h-2 bg-gray-100 rounded w-1/4"/></div>
              <div className="h-4 bg-gray-100 rounded w-20"/>
              <div className="h-4 bg-gray-100 rounded w-24"/>
            </div>
          ))}</div>
        ):filtered.length===0?(
          <div className="text-center py-20">
            <div className="h-14 w-14 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mx-auto mb-4">
              <DollarSign className="h-6 w-6 text-gray-300"/>
            </div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Sin períodos de nómina</p>
            <p className="text-[10px] font-bold text-gray-300 mt-1">Genera tu primera nómina con el botón de arriba</p>
          </div>
        ):(
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-5 py-3 text-left">Período</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Rango</th>
                <th className="px-4 py-3 text-right">Colaboradores</th>
                <th className="px-4 py-3 text-right">Total Bruto</th>
                <th className="px-4 py-3 text-right text-rose-400">Deducciones</th>
                <th className="px-4 py-3 text-right text-emerald-600">Total Neto</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(p=>{
                const scfg = STATUS_CFG[p.status]||STATUS_CFG.DRAFT;
                return (
                  <tr key={p.id} className="hover:bg-gray-50/60 transition-colors group cursor-pointer"
                    onClick={()=>setSelected(p.id)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <DollarSign className="h-4 w-4 text-primary"/>
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-gray-900 leading-tight">{p.name}</p>
                          {p.notes&&<p className="text-[9px] font-bold text-gray-400 mt-0.5 line-clamp-1">{p.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[9px] font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md uppercase tracking-widest">
                        {TYPE_LABELS[p.type]||p.type}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[10px] font-bold text-gray-500 whitespace-nowrap">
                      {fmtD(p.startDate)} — {fmtD(p.endDate)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="flex items-center justify-end gap-1 text-[11px] font-black text-gray-600">
                        <Users className="h-3.5 w-3.5 text-gray-300"/>{p._count?.items ?? p.employeeCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-[11px] font-bold text-gray-700">{fmt(p.totalGross)}</td>
                    <td className="px-4 py-4 text-right text-[11px] font-bold text-rose-500">{fmt(p.totalDeductions)}</td>
                    <td className="px-4 py-4 text-right text-[12px] font-black text-emerald-700">{fmt(p.totalNet)}</td>
                    <td className="px-4 py-4">
                      <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest flex items-center gap-1.5 w-fit',scfg.cls)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full',scfg.dot)}/>
                        {scfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="h-7 px-3 rounded-lg bg-gray-100 hover:bg-primary hover:text-white text-gray-500 text-[10px] font-black uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100">
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer detalle */}
      {selected&&(
        <PeriodDrawer periodId={selected} catalog={catalog} onClose={()=>setSelected(null)} onRefresh={load}/>
      )}

      {/* Modal crear */}
      {showCreate&&(
        <CreatePeriodModal
          onClose={()=>setShowCreate(false)}
          onCreated={(period)=>{ setShowCreate(false); setPeriods(p=>[period,...p]); setSelected(period.id); }}
        />
      )}

      {/* Modal configurar catálogo de Cultura */}
      {showConfig&&(
        <CulturaConfigModal
          catalog={catalog}
          onClose={()=>setShowConfig(false)}
          onSaved={(cat)=>{ setCatalog(cat); setShowConfig(false); }}
        />
      )}
    </div>
  );
}

function MF({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}
