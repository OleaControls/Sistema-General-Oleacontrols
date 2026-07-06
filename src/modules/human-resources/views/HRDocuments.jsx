import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  FileSignature, UploadCloud, Search, CheckCircle2, X,
  FileText, Eye, ShieldCheck, ClipboardCheck, User,
  BookOpen, AlertCircle, ChevronDown, ChevronRight, Upload,
  Loader2, ExternalLink, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hrService } from '@/api/hrService';
import { apiFetch } from '@/lib/api';

// ── Secciones de documentos ────────────────────────────────────────────────────
const SECTIONS = [
  {
    key: 'personal', label: 'Documentos Personales', Icon: User,
    top: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700',
    fields: [
      { key:'ineDoc',          label:'INE / ID Oficial',          type:'file' },
      { key:'curp',            label:'CURP',                       type:'text', placeholder:'18 caracteres' },
      { key:'rfc',             label:'RFC',                        type:'text', placeholder:'13 caracteres' },
      { key:'nss',             label:'Núm. Seguro Social',         type:'text', placeholder:'11 dígitos' },
      { key:'birthCertificate',label:'Acta de Nacimiento',         type:'file' },
      { key:'proofOfResidency',label:'Comprobante de Domicilio',   type:'file' },
      { key:'cv',              label:'Currículum Vitae',           type:'file' },
    ],
  },
  {
    key: 'hiring', label: 'Contratación', Icon: FileSignature,
    top: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700',
    fields: [
      { key:'contractSigned',      label:'Contrato Firmado',       type:'file' },
      { key:'privacyPolicySigned', label:'Aviso de Privacidad',    type:'file' },
      { key:'internalRulesSigned', label:'Reglamento Interno',     type:'file' },
      { key:'imssHigh',            label:'Alta IMSS',              type:'file' },
    ],
  },
  {
    key: 'labor', label: 'Seguimiento Laboral', Icon: BookOpen,
    top: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700',
    fields: [
      { key:'studyCertificate',      label:'Certificado de Estudios',      type:'file' },
      { key:'degreeOrProfessionalId',label:'Título / Cédula Profesional',  type:'file' },
      { key:'diplomasOrCourses',     label:'Diplomas y Cursos',            type:'file' },
      { key:'laborCertifications',   label:'Certificaciones',              type:'file' },
      { key:'recommendationLetter',  label:'Carta de Recomendación',       type:'file' },
      { key:'performanceEvaluations',label:'Evaluaciones de Desempeño',    type:'file' },
      { key:'receivedTraining',      label:'Capacitaciones',               type:'file' },
      { key:'administrativeActs',    label:'Actos Administrativos',        type:'file' },
      { key:'disciplinaryReports',   label:'Reportes Disciplinarios',      type:'file' },
      { key:'permitsOrLicenses',     label:'Permisos y Licencias',         type:'file' },
    ],
  },
  {
    key: 'offboarding', label: 'Baja del Empleado', Icon: AlertCircle,
    top: 'bg-rose-500', badge: 'bg-rose-100 text-rose-700',
    fields: [
      { key:'resignationLetter',    label:'Carta de Renuncia',     type:'file' },
      { key:'settlementOrLiquidation',label:'Finiquito / Liquidación',type:'file' },
      { key:'imssLow',              label:'Baja IMSS',             type:'file' },
      { key:'laborConstancy',       label:'Constancia Laboral',    type:'file' },
    ],
  },
];

const ALL_FIELDS = SECTIONS.flatMap(s => s.fields);
const HIRING_KEYS = SECTIONS[1].fields.map(f => f.key); // los 4 críticos

// ── Helpers ────────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-sky-500','bg-teal-500'];
const avatarColor = (name='') => { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; };

const sectionProgress = (emp, section) => {
  const filled = section.fields.filter(f => emp[f.key] && emp[f.key] !== '').length;
  return { filled, total: section.fields.length, pct: Math.round((filled / section.fields.length) * 100) };
};

const overallProgress = (emp) => {
  const filled = ALL_FIELDS.filter(f => emp[f.key] && emp[f.key] !== '').length;
  return Math.round((filled / ALL_FIELDS.length) * 100);
};

const hiringComplete = (emp) => HIRING_KEYS.every(k => emp[k] && emp[k] !== '');

// ── Componente de campo individual ─────────────────────────────────────────────
function DocField({ field, value, empId, onSaved, uploading, setUploading }) {
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { alert('Archivo mayor a 15MB'); return; }
    setUploading(field.key);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const uploadRes = await apiFetch('/api/upload', {
            method: 'POST',
            body: JSON.stringify({ file: ev.target.result, folder: `hr-docs/${empId}` }),
          });
          if (!uploadRes.ok) throw new Error('Error al subir archivo');
          const { url } = await uploadRes.json();
          const saveRes = await apiFetch('/api/employees', {
            method: 'PUT',
            body: JSON.stringify({ id: empId, [field.key]: url }),
          });
          if (!saveRes.ok) throw new Error('Error al guardar');
          onSaved(field.key, url);
        } catch (err) { alert(err.message); }
        finally { setUploading(null); }
      };
      reader.readAsDataURL(file);
    } catch (err) { alert(err.message); setUploading(null); }
  };

  const handleTextSave = async (val) => {
    try {
      await apiFetch('/api/employees', {
        method: 'PUT',
        body: JSON.stringify({ id: empId, [field.key]: val }),
      });
      onSaved(field.key, val);
    } catch (err) { alert(err.message); }
  };

  const handleRemove = async () => {
    if (!confirm('¿Quitar este documento?')) return;
    try {
      await apiFetch('/api/employees', {
        method: 'PUT',
        body: JSON.stringify({ id: empId, [field.key]: null }),
      });
      onSaved(field.key, null);
    } catch (err) { alert(err.message); }
  };

  const isUploading = uploading === field.key;
  const hasValue = value && value !== '';

  if (field.type === 'text') {
    return (
      <TextDocField label={field.label} value={value} placeholder={field.placeholder}
        onSave={handleTextSave} hasValue={hasValue} />
    );
  }

  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all',
      hasValue ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-100 hover:border-gray-200')}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
          hasValue ? 'bg-emerald-100' : 'bg-gray-200')}>
          {isUploading
            ? <Loader2 className="h-3.5 w-3.5 text-emerald-600 animate-spin"/>
            : hasValue
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600"/>
              : <FileText className="h-3.5 w-3.5 text-gray-400"/>
          }
        </div>
        <span className={cn('text-[11px] font-bold truncate',
          hasValue ? 'text-gray-700' : 'text-gray-400')}>
          {field.label}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {hasValue && (
          <>
            <a href={value} target="_blank" rel="noopener noreferrer"
              className="h-7 w-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-blue-50 hover:border-blue-200 transition-all"
              title="Ver documento">
              <Eye className="h-3.5 w-3.5 text-gray-400 hover:text-blue-600"/>
            </a>
            <button onClick={handleRemove}
              className="h-7 w-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-rose-50 hover:border-rose-200 transition-all"
              title="Quitar">
              <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-rose-500"/>
            </button>
          </>
        )}
        <input type="file" ref={inputRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFile}/>
        <button onClick={() => inputRef.current?.click()} disabled={isUploading}
          className={cn('flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border',
            hasValue
              ? 'bg-white border-gray-200 text-gray-500 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600'
              : 'bg-primary text-white border-primary hover:bg-primary/90',
            isUploading && 'opacity-50 cursor-not-allowed')}>
          <Upload className="h-3 w-3"/>
          {isUploading ? 'Subiendo...' : hasValue ? 'Reemplazar' : 'Subir'}
        </button>
      </div>
    </div>
  );
}

function TextDocField({ label, value, placeholder, onSave, hasValue }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');

  const save = () => { onSave(val); setEditing(false); };

  if (editing) return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5">
      <div className="flex-1">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <input autoFocus value={val} onChange={e=>setVal(e.target.value)} placeholder={placeholder}
          onKeyDown={e=>{ if(e.key==='Enter') save(); if(e.key==='Escape') setEditing(false); }}
          className="w-full text-xs font-bold outline-none bg-transparent text-gray-800"/>
      </div>
      <button onClick={save} className="h-7 w-7 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
        <CheckCircle2 className="h-3.5 w-3.5"/>
      </button>
      <button onClick={()=>setEditing(false)} className="h-7 w-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <X className="h-3.5 w-3.5 text-gray-500"/>
      </button>
    </div>
  );

  return (
    <div className={cn('flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer',
      hasValue ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-100 hover:border-gray-200')}
      onClick={()=>setEditing(true)}>
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
          hasValue ? 'bg-emerald-100' : 'bg-gray-200')}>
          {hasValue ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600"/> : <FileText className="h-3.5 w-3.5 text-gray-400"/>}
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">{label}</p>
          <p className={cn('text-[11px] font-bold mt-0.5 truncate', hasValue?'text-gray-700':'text-gray-300 italic')}>
            {hasValue ? value : 'Sin registrar — clic para editar'}
          </p>
        </div>
      </div>
      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">Editar</span>
    </div>
  );
}

// ── Drawer de expediente ───────────────────────────────────────────────────────
function ExpedientDrawer({ emp, onClose, onUpdate }) {
  const [data, setData] = useState({ ...emp });
  const [uploading, setUploading] = useState(null);
  const [openSections, setOpenSections] = useState({ personal:true, hiring:true, labor:false, offboarding:false });

  // Cargar detalle completo con URLs firmadas al abrir
  useEffect(()=>{
    apiFetch(`/api/employees?id=${emp.id}`)
      .then(r=>r.ok?r.json():null)
      .then(d=>{ if(d) setData(d); })
      .catch(()=>{});
  },[emp.id]);

  const handleSaved = (key, url) => {
    const updated = { ...data, [key]: url };
    setData(updated);
    onUpdate(updated);
  };

  const pct = overallProgress(data);

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
      <div className="relative ml-auto h-full w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 border-b bg-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0', avatarColor(data.name))}>
                {data.name.charAt(0)}
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm leading-tight">{data.name}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5">{data.position || 'Sin cargo'} · {data.department || 'Sin área'}</p>
                <p className="text-[9px] font-bold text-gray-400">{data.contractType || 'Sin tipo de contrato'}</p>
              </div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 transition-colors hover:bg-gray-100">
              <X className="h-4 w-4 text-gray-500"/>
            </button>
          </div>

          {/* Progress bar general */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between items-center">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Expediente completo</p>
              <span className={cn('text-[10px] font-black', pct===100?'text-emerald-600':pct>=50?'text-amber-600':'text-rose-500')}>{pct}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-500',
                pct===100?'bg-emerald-500':pct>=50?'bg-amber-400':'bg-rose-400')}
                style={{width:`${pct}%`}}/>
            </div>
          </div>

          {/* Mini progress por sección */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {SECTIONS.map(s=>{
              const {filled,total,pct:sp} = sectionProgress(data,s);
              return (
                <button key={s.key} onClick={()=>setOpenSections(p=>({...p,[s.key]:!p[s.key]}))}
                  className="text-center p-2 rounded-xl bg-white border border-gray-100 hover:border-gray-200 transition-all">
                  <p className={cn('text-sm font-black leading-none', sp===100?'text-emerald-600':sp>0?'text-amber-500':'text-gray-300')}>{filled}/{total}</p>
                  <p className="text-[8px] font-black text-gray-400 uppercase mt-0.5 truncate">{s.label.split(' ')[0]}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Secciones */}
        <div className="flex-1 overflow-y-auto">
          {SECTIONS.map(s=>{
            const {filled,total,pct:sp} = sectionProgress(data,s);
            const isOpen = openSections[s.key];
            return (
              <div key={s.key} className="border-b last:border-0">
                <button
                  onClick={()=>setOpenSections(p=>({...p,[s.key]:!p[s.key]}))}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0', s.badge)}>
                      <s.Icon className="h-3.5 w-3.5"/>
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-black text-gray-800 uppercase tracking-widest">{s.label}</p>
                      <p className="text-[9px] font-bold text-gray-400 mt-0.5">{filled} de {total} documentos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-md',
                      sp===100?'bg-emerald-100 text-emerald-700':sp>0?'bg-amber-100 text-amber-600':'bg-gray-100 text-gray-400')}>
                      {sp}%
                    </span>
                    {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400"/> : <ChevronRight className="h-4 w-4 text-gray-400"/>}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-4 space-y-2">
                    {s.fields.map(field=>(
                      <DocField key={field.key} field={field} value={data[field.key]}
                        empId={data.id} onSaved={handleSaved}
                        uploading={uploading} setUploading={setUploading}/>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────────
export default function HRDocuments() {
  const [employees, setEmployees]   = useState([]);
  const [loading,   setLoading]     = useState(true);
  const [search,    setSearch]      = useState('');
  const [deptFilter,setDeptFilter]  = useState('ALL');
  const [statusFilter,setStatusFilter] = useState('ALL');
  const [selected,  setSelected]    = useState(null);

  useEffect(()=>{
    setLoading(true);
    hrService.getEmployees()
      .then(d=>setEmployees(Array.isArray(d)?d:d?.employees||[]))
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[]);

  const departments = useMemo(()=>['ALL',...new Set(employees.flatMap(e=>e.department?[e.department]:[]))],[employees]);

  const filtered = useMemo(()=>employees.filter(e=>{
    const q = search.toLowerCase();
    const matchSearch = !q || e.name.toLowerCase().includes(q) || (e.position||'').toLowerCase().includes(q) || (e.department||'').toLowerCase().includes(q);
    const matchDept = deptFilter==='ALL' || e.department===deptFilter;
    const pct = overallProgress(e);
    const matchStatus = statusFilter==='ALL' || (statusFilter==='COMPLETE'&&pct===100) || (statusFilter==='PARTIAL'&&pct>0&&pct<100) || (statusFilter==='EMPTY'&&pct===0);
    return matchSearch && matchDept && matchStatus;
  }),[employees,search,deptFilter,statusFilter]);

  const stats = useMemo(()=>({
    total:    employees.length,
    complete: employees.filter(e=>overallProgress(e)===100).length,
    hiring:   employees.filter(e=>hiringComplete(e)).length,
    missing:  employees.reduce((s,e)=>s+ALL_FIELDS.filter(f=>!e[f.key]||e[f.key]==='').length,0),
  }),[employees]);

  const handleUpdate = useCallback((updated)=>{
    setEmployees(prev=>prev.map(e=>e.id===updated.id?updated:e));
    setSelected(updated);
  },[]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Contratos y Expedientes</h2>
          <p className="text-sm text-gray-500 font-medium mt-0.5">Auditoría de {ALL_FIELDS.length} campos documentales por colaborador</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Total Colaboradores', value:stats.total,    top:'bg-primary'     },
          { label:'Expedientes 100%',    value:stats.complete, top:'bg-emerald-500' },
          { label:'Contratación Completa',value:stats.hiring,  top:'bg-blue-500'    },
          { label:'Docs Faltantes',      value:stats.missing,  top:'bg-rose-400'    },
        ].map(s=>(
          <div key={s.label} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <div className={cn('h-1',s.top)}/>
            <div className="px-4 py-3">
              <p className="text-2xl font-black text-gray-900 leading-none">{s.value}</p>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, cargo o área..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary/50"/>
        </div>
        <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-primary/50">
          <option value="ALL">Todos los departamentos</option>
          {departments.filter(d=>d!=='ALL').map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-primary/50">
          <option value="ALL">Todos</option>
          <option value="COMPLETE">Completos (100%)</option>
          <option value="PARTIAL">Parciales</option>
          <option value="EMPTY">Sin documentos</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading?(
          <div className="divide-y">{[1,2,3,4,5].map(i=>(
            <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
              <div className="h-9 w-9 bg-gray-100 rounded-xl shrink-0"/>
              <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/4"/><div className="h-2 bg-gray-100 rounded w-1/3"/></div>
              <div className="flex gap-2">{[1,2,3,4].map(j=><div key={j} className="h-6 w-12 bg-gray-100 rounded-lg"/>)}</div>
            </div>
          ))}</div>
        ):filtered.length===0?(
          <div className="text-center py-16">
            <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2"/>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sin resultados</p>
          </div>
        ):(
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-5 py-3 text-left">Colaborador</th>
                {SECTIONS.map(s=>(
                  <th key={s.key} className="px-3 py-3 text-center">{s.label.split(' ')[0]}</th>
                ))}
                <th className="px-4 py-3 text-left">Expediente</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(emp=>{
                const pct = overallProgress(emp);
                return (
                  <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors group cursor-pointer"
                    onClick={()=>setSelected(emp)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center text-white font-black text-[10px] shrink-0',avatarColor(emp.name))}>
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 leading-none">{emp.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 mt-0.5">{emp.department||'—'}</p>
                        </div>
                      </div>
                    </td>
                    {SECTIONS.map(s=>{
                      const {filled,total,pct:sp} = sectionProgress(emp,s);
                      return (
                        <td key={s.key} className="px-3 py-3.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={cn('text-[10px] font-black',
                              sp===100?'text-emerald-600':sp>0?'text-amber-500':'text-gray-300')}>
                              {filled}/{total}
                            </span>
                            <div className="h-1 w-10 bg-gray-100 rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full',
                                sp===100?'bg-emerald-500':sp>0?'bg-amber-400':'bg-gray-200')}
                                style={{width:`${sp}%`}}/>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full transition-all',
                            pct===100?'bg-emerald-500':pct>=50?'bg-amber-400':'bg-rose-400')}
                            style={{width:`${pct}%`}}/>
                        </div>
                        <span className={cn('text-[10px] font-black min-w-[28px]',
                          pct===100?'text-emerald-600':pct>=50?'text-amber-600':'text-rose-500')}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="h-7 px-3 rounded-lg bg-gray-100 hover:bg-primary hover:text-white text-gray-500 text-[10px] font-black uppercase tracking-widest transition-all opacity-0 group-hover:opacity-100">
                        Abrir
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {filtered.length>0&&(
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
            <p className="text-[10px] font-bold text-gray-400">{filtered.length} colaborador{filtered.length!==1?'es':''}</p>
          </div>
        )}
      </div>

      {/* Drawer de expediente */}
      {selected&&(
        <ExpedientDrawer emp={selected} onClose={()=>setSelected(null)} onUpdate={handleUpdate}/>
      )}
    </div>
  );
}
