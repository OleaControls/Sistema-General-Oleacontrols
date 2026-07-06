import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus, Briefcase, Search, Mail, Phone, Plus, X, User,
  FileText, Trash2, Upload, Check, FileSignature, Award,
  Lock, Landmark, Eye, EyeOff, ArrowRight, Users, Filter,
  Calendar, MessageSquare, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hrService } from '@/api/hrService';
import { ROLES } from '@/store/AuthContext';

// ── Config ────────────────────────────────────────────────────────────────────
const PIPELINE = [
  { id: 'APPLIED',   label: 'Postulados',     sub: 'Sin revisar',         topBar: 'bg-gray-400',    bg: 'bg-gray-50/60',      border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400'     },
  { id: 'SCREENING', label: 'Entrevista RH',  sub: 'En evaluación',       topBar: 'bg-blue-500',    bg: 'bg-blue-50/40',      border: 'border-blue-100',   badge: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500'     },
  { id: 'TECHNICAL', label: 'Prueba Técnica', sub: 'Evaluación técnica',  topBar: 'bg-violet-500',  bg: 'bg-violet-50/30',    border: 'border-violet-100', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500'   },
  { id: 'OFFER',     label: 'Oferta / Alta',  sub: 'Listo para contratar',topBar: 'bg-emerald-500', bg: 'bg-emerald-50/30',   border: 'border-emerald-100',badge: 'bg-emerald-100 text-emerald-700',dot: 'bg-emerald-500' },
];

const NEXT_STAGE  = { APPLIED: 'SCREENING', SCREENING: 'TECHNICAL', TECHNICAL: 'OFFER' };
const NEXT_LABEL  = { APPLIED: 'Entrevista RH', SCREENING: 'Prueba Técnica', TECHNICAL: 'Oferta' };
const SOURCES     = ['Web', 'LinkedIn', 'Referido', 'Bolsa Trabajo', 'Headhunter', 'Instagram', 'Otro'];
const ROLE_LABELS = { [ROLES.ADMIN]:'Admin',[ROLES.HR]:'RH',[ROLES.OPS]:'Super',[ROLES.TECH]:'Tech',[ROLES.SALES]:'Ventas',[ROLES.COLLABORATOR]:'Colab' };

const AVATAR_COLORS = [
  'bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500',
  'bg-rose-500','bg-sky-500','bg-teal-500','bg-indigo-500',
];

const avatarColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

const daysAgo = (dateStr) => {
  if (!dateStr) return null;
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  return d === 0 ? 'Hoy' : d === 1 ? '1 día' : `${d} días`;
};

const fileToBase64 = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.readAsDataURL(file);
    r.onload = () => res(r.result);
    r.onerror = rej;
  });

const EMPTY_CAND = { name: '', email: '', phone: '', position: '', source: 'Web', notes: '' };
const EMPTY_EMP  = {
  name:'',email:'',phone:'',birthDate:'',birthPlace:'',nationality:'',maritalStatus:'SOLTERO/A',
  address:'',emergencyContactName:'',emergencyContactPhone:'',ine:'',curp:'',rfc:'',nss:'',
  birthCertificate:'',proofOfResidency:'',cv:'',contractSigned:'',privacyPolicySigned:'',
  internalRulesSigned:'',imssHigh:'',studyCertificate:'',degreeOrProfessionalId:'',
  diplomasOrCourses:'',laborCertifications:'',recommendationLetter:'',receivedTraining:'',
  administrativeActs:'',disciplinaryReports:'',permitsOrLicenses:'',resignationLetter:'',
  settlementOrLiquidation:'',imssLow:'',laborConstancy:'',employeeId:'',position:'',
  department:'',joinDate:new Date().toISOString().split('T')[0],contractType:'INDEFINIDO',
  salary:'',roles:[ROLES.COLLABORATOR],reportsTo:'',bankName:'',bankAccount:'',
  paymentType:'QUINCENAL',password:'',
};

// ── Mini-helpers ──────────────────────────────────────────────────────────────
const Inp = ({ label, value, onChange, type='text', required=false, placeholder='' }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
    <input type={type} required={required} placeholder={placeholder}
      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-primary/50 transition-all placeholder:text-gray-300"
      value={value||''} onChange={e=>onChange(e.target.value)} />
  </div>
);

const Sel = ({ label, value, options, onChange }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
    <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-primary/50 transition-all appearance-none"
      value={value||''} onChange={e=>onChange(e.target.value)}>
      <option value="">Seleccionar...</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Sec = ({ title, icon:Icon, color='blue', children }) => {
  const c = { blue:['bg-blue-50','text-blue-600'], amber:['bg-amber-50','text-amber-600'], emerald:['bg-emerald-50','text-emerald-600'], purple:['bg-purple-50','text-purple-600'] }[color]||['bg-gray-100','text-gray-500'];
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className={cn('h-6 w-6 rounded-md flex items-center justify-center',c[0])}><Icon className={cn('h-3.5 w-3.5',c[1])}/></div>
        <h4 className="text-[11px] font-black text-gray-700 uppercase tracking-widest">{title}</h4>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
};

const FileFld = ({ label, value, onChange }) => {
  const uid = `rf-${label.replace(/\s+/g,'-')}`;
  const handle = async (e) => {
    const f = e.target.files[0]; if(!f) return;
    if(f.type!=='application/pdf'){alert('Solo PDF');return;}
    if(f.size>5*1024*1024){alert('Máx 5MB');return;}
    onChange(await fileToBase64(f));
  };
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      <input type="file" accept=".pdf" onChange={handle} className="hidden" id={uid}/>
      <label htmlFor={uid} className={cn('flex items-center justify-between w-full px-3 py-2.5 border rounded-xl cursor-pointer transition-all', value?'bg-emerald-50 border-emerald-200 hover:bg-emerald-100':'bg-gray-50 border-gray-200 hover:bg-gray-100')}>
        <div className="flex items-center gap-2">
          <div className={cn('h-6 w-6 rounded-md flex items-center justify-center shrink-0',value?'bg-emerald-500':'bg-gray-200')}>
            {value?<Check className="h-3.5 w-3.5 text-white"/>:<Upload className="h-3.5 w-3.5 text-gray-400"/>}
          </div>
          <span className={cn('text-[11px] font-bold',value?'text-emerald-700':'text-gray-400')}>{value?'Cargado':'Subir PDF'}</span>
        </div>
        {value&&<button type="button" onClick={e=>{e.preventDefault();onChange('');}} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5"/></button>}
      </label>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Recruitment() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [dragged, setDragged]       = useState(null);
  const [dragOver, setDragOver]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');
  const [filterPos, setFilterPos]   = useState('');

  const [showAdd, setShowAdd]       = useState(false);
  const [newCand, setNewCand]       = useState(EMPTY_CAND);

  const [detail, setDetail]         = useState(null); // candidato seleccionado

  const [showConvert, setShowConvert]   = useState(false);
  const [convertId, setConvertId]       = useState(null);
  const [convertName, setConvertName]   = useState('');
  const [empForm, setEmpForm]           = useState(EMPTY_EMP);
  const [empTab, setEmpTab]             = useState('PERSONAL');
  const [showPwd, setShowPwd]           = useState(false);
  const [categories, setCategories]     = useState([]);
  const [employees, setEmployees]       = useState([]);

  useEffect(()=>{ load(); },[]);

  const load = async () => {
    setLoading(true);
    try {
      const [c,cat,emp] = await Promise.all([hrService.getCandidates(),hrService.getCategories(),hrService.getEmployees()]);
      setCandidates(c); setCategories(cat); setEmployees(emp);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  };

  const positions = useMemo(()=>[...new Set(candidates.flatMap(c=>c.position?[c.position]:[]))],[candidates]);

  const visible = useMemo(()=>candidates.filter(c=>{
    const q = search.toLowerCase();
    const matchQ = !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.position?.toLowerCase().includes(q);
    const matchP = !filterPos || c.position === filterPos;
    return matchQ && matchP;
  }),[candidates,search,filterPos]);

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await hrService.saveCandidate(newCand); setShowAdd(false); setNewCand(EMPTY_CAND); load(); }
    catch(e){ alert(e.message); } finally { setSaving(false); }
  };

  const moveStage = async (id, stage) => {
    try { await hrService.updateCandidate(id,{stage}); load(); } catch { alert('Error al mover'); }
  };

  const deleteCand = async (id, name) => {
    if(!confirm(`¿Eliminar a ${name}?`)) return;
    try { await hrService.deleteCandidate(id); if(detail?.id===id) setDetail(null); load(); } catch { alert('Error'); }
  };

  const startConvert = (c) => {
    setConvertId(c.id); setConvertName(c.name);
    setEmpForm({...EMPTY_EMP, name:c.name, email:c.email, phone:c.phone||'', position:c.position||''});
    setEmpTab('PERSONAL'); setShowConvert(true); setDetail(null);
  };

  const handleConvert = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await hrService.saveEmployee(empForm);
      await hrService.deleteCandidate(convertId);
      setShowConvert(false); alert('Colaborador dado de alta exitosamente.'); load();
    } catch(e){ alert(e.message); } finally { setSaving(false); }
  };

  const toggleRole = (role) => {
    const curr = empForm.roles||[];
    setEmpForm({...empForm, roles: curr.includes(role)?curr.filter(r=>r!==role):[...curr,role]});
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-3">
        <div className="h-7 w-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"/>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargando ATS...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Reclutamiento ATS</h2>
          <p className="text-sm text-gray-500 font-medium mt-0.5">{candidates.length} candidatos en pipeline</p>
        </div>
        <button onClick={()=>setShowAdd(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all shrink-0">
          <Plus className="h-4 w-4"/> Nuevo Candidato
        </button>
      </div>

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {PIPELINE.map(p=>{
          const n = candidates.filter(c=>c.stage===p.id).length;
          const pct = candidates.length ? Math.round((n/candidates.length)*100) : 0;
          return (
            <div key={p.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div className={cn('h-1 w-full',p.topBar)}/>
              <div className="px-4 py-3">
                <p className="text-2xl font-black text-gray-900 leading-none">{n}</p>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mt-1 truncate">{p.label}</p>
                <p className="text-[9px] font-bold text-gray-300 mt-0.5">{pct}% del total</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Search & filter ───────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar candidato..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary/50 transition-all"/>
        </div>
        {positions.length>0 && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"/>
            <select value={filterPos} onChange={e=>setFilterPos(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary/50 transition-all appearance-none">
              <option value="">Todos los puestos</option>
              {positions.map(p=><option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Kanban ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PIPELINE.map(stage=>{
          const cols = visible.filter(c=>c.stage===stage.id);
          const isDragTarget = dragOver===stage.id;

          return (
            <div key={stage.id} className="flex flex-col"
              onDragOver={e=>{e.preventDefault();setDragOver(stage.id);}}
              onDragLeave={()=>setDragOver(null)}
              onDrop={()=>{ if(dragged) moveStage(dragged.id,stage.id); setDragged(null); setDragOver(null); }}>

              {/* Column header */}
              <div className="mb-3">
                <div className={cn('h-0.5 w-full rounded-full mb-3',stage.topBar)}/>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-gray-800 uppercase tracking-wider">{stage.label}</p>
                    <p className="text-[9px] font-bold text-gray-400 mt-0.5">{stage.sub}</p>
                  </div>
                  <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full',stage.badge)}>{cols.length}</span>
                </div>
              </div>

              {/* Drop zone */}
              <div className={cn(
                'flex-1 min-h-[420px] rounded-2xl border-2 border-dashed p-2.5 space-y-2.5 overflow-y-auto transition-all duration-150',
                stage.bg, stage.border,
                isDragTarget && 'border-primary/50 bg-primary/5 scale-[1.01]'
              )}>
                {cols.length===0 && (
                  <div className="flex flex-col items-center justify-center h-32 opacity-40 select-none">
                    <Users className="h-7 w-7 text-gray-300 mb-2"/>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sin candidatos</p>
                  </div>
                )}

                {cols.map(cand=>(
                  <div key={cand.id} draggable
                    onDragStart={()=>setDragged(cand)}
                    onDragEnd={()=>setDragged(null)}
                    className={cn(
                      'bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group',
                      dragged?.id===cand.id && 'opacity-40 scale-95'
                    )}>

                    {/* Card body — clickable */}
                    <div className="p-3.5 space-y-3" onClick={()=>setDetail(cand)}>
                      {/* Top row */}
                      <div className="flex items-start gap-2.5">
                        <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0 select-none', avatarColor(cand.name))}>
                          {initials(cand.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-gray-900 leading-tight truncate group-hover:text-primary transition-colors">{cand.name}</p>
                          {cand.position && (
                            <span className="inline-block mt-0.5 text-[9px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md uppercase tracking-wide">
                              {cand.position}
                            </span>
                          )}
                        </div>
                        <button onClick={e=>{e.stopPropagation();deleteCand(cand.id,cand.name);}}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all shrink-0">
                          <Trash2 className="h-3.5 w-3.5"/>
                        </button>
                      </div>

                      {/* Contact */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                          <Mail className="h-3 w-3 shrink-0"/> <span className="truncate">{cand.email}</span>
                        </div>
                        {cand.phone && (
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                            <Mail className="h-3 w-3 shrink-0 opacity-0"/>{/* spacer */}
                            <span className="truncate">{cand.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Notes preview */}
                      {cand.notes && (
                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed line-clamp-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                          {cand.notes}
                        </p>
                      )}

                      {/* Footer meta */}
                      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-wider">{cand.source||'Web'}</span>
                        {cand.createdAt && (
                          <span className="text-[9px] font-bold text-gray-300">{daysAgo(cand.createdAt)}</span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    <div className="px-3.5 pb-3">
                      {stage.id==='OFFER' ? (
                        <button onClick={e=>{e.stopPropagation();startConvert(cand);}}
                          className="w-full bg-emerald-600 text-white py-2 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                          <UserPlus className="h-3.5 w-3.5"/> Dar de Alta
                        </button>
                      ) : (
                        <button onClick={e=>{e.stopPropagation();moveStage(cand.id,NEXT_STAGE[stage.id]);}}
                          className="w-full border border-gray-200 text-gray-400 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5">
                          Avanzar a {NEXT_LABEL[stage.id]} <ArrowRight className="h-3 w-3"/>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Panel detalle candidato ────────────────────────────────────────── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={()=>setDetail(null)}/>
          <div className="w-full max-w-sm bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0',avatarColor(detail.name))}>
                    {initials(detail.name)}
                  </div>
                  <div>
                    <p className="font-black text-gray-900 leading-tight">{detail.name}</p>
                    {detail.position && <p className="text-[10px] font-black text-primary uppercase tracking-wider mt-0.5">{detail.position}</p>}
                  </div>
                </div>
                <button onClick={()=>setDetail(null)} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors shrink-0">
                  <X className="h-4 w-4 text-gray-500"/>
                </button>
              </div>

              {/* Stage badge */}
              {(() => {
                const s = PIPELINE.find(p=>p.id===detail.stage);
                return s ? (
                  <div className="mt-4 flex items-center gap-2">
                    <div className={cn('h-2 w-2 rounded-full',s.dot)}/>
                    <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full',s.badge)}>{s.label}</span>
                    {detail.createdAt && <span className="text-[9px] font-bold text-gray-400 ml-auto">{daysAgo(detail.createdAt)}</span>}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Info */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div className="space-y-3">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Contacto</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl">
                    <Mail className="h-4 w-4 text-gray-400 shrink-0"/>
                    <span className="text-sm font-medium text-gray-700 truncate">{detail.email}</span>
                  </div>
                  {detail.phone && (
                    <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl">
                      <span className="h-4 w-4 text-gray-400 shrink-0 text-sm">📞</span>
                      <span className="text-sm font-medium text-gray-700">{detail.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {detail.source && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Fuente</p>
                  <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg inline-block">{detail.source}</span>
                </div>
              )}

              {detail.notes && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Notas</p>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed bg-gray-50 rounded-xl p-3">{detail.notes}</p>
                </div>
              )}

              {/* Move stage */}
              <div className="space-y-2">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Mover etapa</p>
                <div className="space-y-2">
                  {PIPELINE.filter(p=>p.id!==detail.stage).map(p=>(
                    <button key={p.id} onClick={()=>{ moveStage(detail.id,p.id); setDetail({...detail,stage:p.id}); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-left hover:border-primary hover:bg-primary/5 transition-all group">
                      <div className={cn('h-2 w-2 rounded-full shrink-0',p.dot)}/>
                      <span className="text-xs font-bold text-gray-600 group-hover:text-primary transition-colors">{p.label}</span>
                      <ArrowRight className="h-3 w-3 text-gray-300 ml-auto group-hover:text-primary transition-colors"/>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t px-6 py-4 space-y-2 shrink-0">
              {detail.stage==='OFFER' && (
                <button onClick={()=>startConvert(detail)}
                  className="w-full bg-emerald-600 text-white py-2.5 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-md">
                  <UserPlus className="h-4 w-4"/> Dar de Alta como Empleado
                </button>
              )}
              <button onClick={()=>deleteCand(detail.id,detail.name)}
                className="w-full border border-red-200 text-red-500 py-2.5 rounded-xl font-bold text-sm hover:bg-red-50 transition-all">
                Eliminar candidato
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Drawer: Nuevo candidato ────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={()=>setShowAdd(false)}/>
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-primary"/>
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">Nuevo Candidato</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Pipeline ATS</p>
                </div>
              </div>
              <button onClick={()=>setShowAdd(false)} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-gray-500"/>
              </button>
            </div>
            <form onSubmit={handleAdd} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <Inp label="Nombre Completo *" value={newCand.name} onChange={v=>setNewCand({...newCand,name:v})} required/>
                <Inp label="Email *" type="email" value={newCand.email} onChange={v=>setNewCand({...newCand,email:v})} required/>
                <Inp label="Teléfono" value={newCand.phone} onChange={v=>setNewCand({...newCand,phone:v})}/>
                <Inp label="Puesto / Vacante" value={newCand.position} onChange={v=>setNewCand({...newCand,position:v})}/>
                <Sel label="Fuente de Contacto" value={newCand.source} options={SOURCES} onChange={v=>setNewCand({...newCand,source:v})}/>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notas</label>
                  <textarea rows={3} placeholder="Observaciones iniciales..."
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-primary/50 transition-all resize-none placeholder:text-gray-300"
                    value={newCand.notes} onChange={e=>setNewCand({...newCand,notes:e.target.value})}/>
                </div>
              </div>
              <div className="border-t px-6 py-4 flex gap-3 shrink-0">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50">
                  {saving?'Guardando...':'Registrar Candidato'}
                </button>
                <button type="button" onClick={()=>setShowAdd(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-500 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-gray-200 transition-all">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Drawer: Convertir a empleado ──────────────────────────────────── */}
      {showConvert && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={()=>setShowConvert(false)}/>
          <div className="w-full max-w-4xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-7 py-4 border-b bg-emerald-50/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <UserPlus className="h-[18px] w-[18px] text-emerald-700"/>
                </div>
                <div>
                  <p className="text-base font-black text-gray-900 leading-tight">Alta de Colaborador</p>
                  <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-widest">Convirtiendo: {convertName}</p>
                </div>
              </div>
              <button onClick={()=>setShowConvert(false)} className="h-8 w-8 rounded-lg bg-white border hover:bg-gray-50 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-gray-400"/>
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-52 bg-gray-50/80 border-r flex flex-col py-4 px-3 shrink-0 gap-1">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest px-2 mb-2">Secciones</p>
                {[
                  {id:'PERSONAL',label:'Datos Personales',desc:'Info. básica y docs',   icon:User,     col:['bg-blue-50','text-blue-500']    },
                  {id:'CONTRACT',label:'Contratación',    desc:'Puesto, nómina, docs',  icon:Briefcase,col:['bg-emerald-50','text-emerald-600']},
                  {id:'TRACKING',label:'Seguimiento',     desc:'Formación y académica', icon:Award,    col:['bg-violet-50','text-violet-500'] },
                ].map((s,i)=>{
                  const active = empTab===s.id;
                  return (
                    <button key={s.id} type="button" onClick={()=>setEmpTab(s.id)}
                      className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',active?'bg-white shadow-sm':'hover:bg-white/70')}>
                      <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors',active?s.col[0]:'bg-gray-100')}>
                        <s.icon className={cn('h-3.5 w-3.5 transition-colors',active?s.col[1]:'text-gray-400')}/>
                      </div>
                      <div className="min-w-0">
                        <p className={cn('text-[11px] font-black leading-tight truncate',active?'text-gray-900':'text-gray-500')}>{i+1}. {s.label}</p>
                        <p className="text-[9px] font-medium text-gray-400 leading-tight mt-0.5 truncate">{s.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleConvert} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
                  {empTab==='PERSONAL'&&(
                    <div className="space-y-5 animate-in fade-in duration-200">
                      <Sec title="Información Básica" icon={User} color="blue">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2"><Inp label="Nombre Completo *" value={empForm.name} onChange={v=>setEmpForm({...empForm,name:v})} required/></div>
                          <Inp label="Fecha Nacimiento" type="date" value={empForm.birthDate} onChange={v=>setEmpForm({...empForm,birthDate:v})}/>
                          <Inp label="Lugar Nacimiento" value={empForm.birthPlace} onChange={v=>setEmpForm({...empForm,birthPlace:v})}/>
                          <Inp label="Nacionalidad" value={empForm.nationality} onChange={v=>setEmpForm({...empForm,nationality:v})}/>
                          <Sel label="Estado Civil" value={empForm.maritalStatus} options={['SOLTERO/A','CASADO/A','DIVORCIADO/A','VIUDO/A','UNIÓN LIBRE']} onChange={v=>setEmpForm({...empForm,maritalStatus:v})}/>
                          <div className="col-span-2"><Inp label="Dirección" value={empForm.address} onChange={v=>setEmpForm({...empForm,address:v})}/></div>
                          <Inp label="Teléfono" value={empForm.phone} onChange={v=>setEmpForm({...empForm,phone:v})}/>
                          <Inp label="Email Corporativo *" type="email" value={empForm.email} onChange={v=>setEmpForm({...empForm,email:v})} required/>
                        </div>
                      </Sec>
                      <Sec title="Documentos de Identidad" icon={FileText} color="amber">
                        <div className="grid grid-cols-2 gap-3">
                          <Inp label="INE / ID" value={empForm.ine} onChange={v=>setEmpForm({...empForm,ine:v})}/>
                          <Inp label="CURP" value={empForm.curp} onChange={v=>setEmpForm({...empForm,curp:v})}/>
                          <Inp label="RFC" value={empForm.rfc} onChange={v=>setEmpForm({...empForm,rfc:v})}/>
                          <Inp label="NSS (IMSS)" value={empForm.nss} onChange={v=>setEmpForm({...empForm,nss:v})}/>
                          <FileFld label="Acta de Nacimiento" value={empForm.birthCertificate} onChange={v=>setEmpForm({...empForm,birthCertificate:v})}/>
                          <FileFld label="Comprobante Domicilio" value={empForm.proofOfResidency} onChange={v=>setEmpForm({...empForm,proofOfResidency:v})}/>
                          <FileFld label="ID Oficial" value={empForm.ineDoc} onChange={v=>setEmpForm({...empForm,ineDoc:v})}/>
                          <FileFld label="Currículum Vitae" value={empForm.cv} onChange={v=>setEmpForm({...empForm,cv:v})}/>
                        </div>
                      </Sec>
                      <Sec title="Accesos y Seguridad" icon={Lock} color="purple">
                        <div className="grid grid-cols-2 gap-5">
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Roles del sistema</p>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.keys(ROLES).map(r=>(
                                <button key={r} type="button" onClick={()=>toggleRole(ROLES[r])}
                                  className={cn('px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-all',
                                    empForm.roles.includes(ROLES[r])?'bg-emerald-600 text-white border-emerald-600 shadow-sm':'bg-white text-gray-400 border-gray-200 hover:border-gray-300')}>
                                  {ROLE_LABELS[ROLES[r]]}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="relative">
                            <Inp label="Contraseña de Acceso *" type={showPwd?'text':'password'} value={empForm.password} onChange={v=>setEmpForm({...empForm,password:v})} required placeholder="••••••••"/>
                            <button type="button" onClick={()=>setShowPwd(!showPwd)} className="absolute right-3 top-7 text-gray-400 hover:text-primary transition-colors">
                              {showPwd?<EyeOff className="h-4 w-4"/>:<Eye className="h-4 w-4"/>}
                            </button>
                          </div>
                        </div>
                      </Sec>
                    </div>
                  )}
                  {empTab==='CONTRACT'&&(
                    <div className="space-y-5 animate-in fade-in duration-200">
                      <Sec title="Datos Laborales" icon={Briefcase} color="emerald">
                        <div className="grid grid-cols-2 gap-3">
                          <Inp label="N° Empleado" value={empForm.employeeId} onChange={v=>setEmpForm({...empForm,employeeId:v})}/>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Puesto</label>
                            <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-primary/50 transition-all"
                              value={empForm.position} onChange={e=>setEmpForm({...empForm,position:e.target.value})}>
                              <option value="">Seleccionar...</option>
                              {categories.map(c=><option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <Inp label="Departamento" value={empForm.department} onChange={v=>setEmpForm({...empForm,department:v})}/>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reporta a</label>
                            <select className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-primary/50 transition-all"
                              value={empForm.reportsTo||''} onChange={e=>setEmpForm({...empForm,reportsTo:e.target.value})}>
                              <option value="">Ninguno (Raíz)</option>
                              {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                          </div>
                          <Inp label="Fecha de Ingreso" type="date" value={empForm.joinDate} onChange={v=>setEmpForm({...empForm,joinDate:v})}/>
                          <Sel label="Tipo de Contrato" value={empForm.contractType} options={['INDEFINIDO','TEMPORAL','PROYECTO']} onChange={v=>setEmpForm({...empForm,contractType:v})}/>
                          <div className="col-span-2"><Inp label="Sueldo Mensual ($)" type="number" value={empForm.salary} onChange={v=>setEmpForm({...empForm,salary:v})}/></div>
                        </div>
                      </Sec>
                      <Sec title="Documentos de Contratación" icon={FileSignature} color="purple">
                        <div className="grid grid-cols-2 gap-3">
                          <FileFld label="Contrato Firmado" value={empForm.contractSigned} onChange={v=>setEmpForm({...empForm,contractSigned:v})}/>
                          <FileFld label="Aviso de Privacidad" value={empForm.privacyPolicySigned} onChange={v=>setEmpForm({...empForm,privacyPolicySigned:v})}/>
                          <FileFld label="Reglamento Interno" value={empForm.internalRulesSigned} onChange={v=>setEmpForm({...empForm,internalRulesSigned:v})}/>
                          <FileFld label="Alta en el IMSS" value={empForm.imssHigh} onChange={v=>setEmpForm({...empForm,imssHigh:v})}/>
                        </div>
                      </Sec>
                      <Sec title="Datos Bancarios" icon={Landmark} color="purple">
                        <div className="grid grid-cols-3 gap-3">
                          <Inp label="Banco" value={empForm.bankName} onChange={v=>setEmpForm({...empForm,bankName:v})}/>
                          <Inp label="Cuenta / CLABE" value={empForm.bankAccount} onChange={v=>setEmpForm({...empForm,bankAccount:v})}/>
                          <Sel label="Frecuencia de Pago" value={empForm.paymentType} options={['SEMANAL','QUINCENAL','MENSUAL']} onChange={v=>setEmpForm({...empForm,paymentType:v})}/>
                        </div>
                      </Sec>
                    </div>
                  )}
                  {empTab==='TRACKING'&&(
                    <div className="space-y-5 animate-in fade-in duration-200">
                      <Sec title="Formación y Academia" icon={Award} color="blue">
                        <div className="grid grid-cols-2 gap-3">
                          <FileFld label="Certificado de Estudios" value={empForm.studyCertificate} onChange={v=>setEmpForm({...empForm,studyCertificate:v})}/>
                          <FileFld label="Título / Cédula Profesional" value={empForm.degreeOrProfessionalId} onChange={v=>setEmpForm({...empForm,degreeOrProfessionalId:v})}/>
                          <FileFld label="Diplomas / Cursos" value={empForm.diplomasOrCourses} onChange={v=>setEmpForm({...empForm,diplomasOrCourses:v})}/>
                          <FileFld label="Certificaciones" value={empForm.laborCertifications} onChange={v=>setEmpForm({...empForm,laborCertifications:v})}/>
                          <FileFld label="Cartas de Recomendación" value={empForm.recommendationLetter} onChange={v=>setEmpForm({...empForm,recommendationLetter:v})}/>
                          <FileFld label="Capacitaciones Recibidas" value={empForm.receivedTraining} onChange={v=>setEmpForm({...empForm,receivedTraining:v})}/>
                        </div>
                      </Sec>
                    </div>
                  )}
                </div>
                <div className="border-t bg-white px-8 py-4 flex gap-3 shrink-0">
                  <button type="submit" disabled={saving}
                    className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all disabled:opacity-50">
                    {saving?'Procesando...':'Finalizar Alta y Contratación'}
                  </button>
                  <button type="button" onClick={()=>setShowConvert(false)}
                    className="px-6 py-2.5 bg-gray-100 text-gray-500 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-gray-200 transition-all">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
