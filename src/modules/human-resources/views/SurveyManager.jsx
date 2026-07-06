import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardCheck, Plus, X, Trash2, BarChart3,
  CheckCircle2, Search, Star, MessageSquare, ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { hrService } from '@/api/hrService';
import { useAuth } from '@/store/AuthContext';

// ── Config ─────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  ACTIVE: { label:'Activa',   cls:'bg-emerald-100 text-emerald-700 border-emerald-200' },
  DRAFT:  { label:'Borrador', cls:'bg-gray-100 text-gray-500 border-gray-200'          },
  CLOSED: { label:'Cerrada',  cls:'bg-rose-100 text-rose-600 border-rose-200'          },
};

const Q_TYPES = [
  { value:'RATING',    label:'Calificación (1-5)' },
  { value:'TEXT',      label:'Respuesta libre'     },
  { value:'YESNO',     label:'Sí / No'             },
  { value:'MULTIPLE',  label:'Opción múltiple'     },
];

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-sky-500','bg-teal-500'];
const avatarColor = (name='') => { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; };
const initials = (name='') => name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const fmtDate  = d => d ? new Date(d).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : '—';

// ── Rating bar ─────────────────────────────────────────────────────────────────
function RatingBar({ value, max=5 }) {
  const pct = Math.round((value/max)*100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {Array.from({length:max}).map((_,i)=>(
          <Star key={i} className={cn('h-3.5 w-3.5',i<Math.round(value)?'text-amber-400 fill-amber-400':'text-gray-200 fill-gray-100')}/>
        ))}
      </div>
      <span className="text-xs font-black text-gray-700">{value.toFixed(1)}</span>
    </div>
  );
}

// ── Drawer: resultados de encuesta ─────────────────────────────────────────────
function SurveyResultsDrawer({ surveyId, employees, onClose, currentUserId }) {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [answering,  setAnswering]  = useState(false);
  const [myAnswers,  setMyAnswers]  = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  useEffect(()=>{
    apiFetch(`/api/surveys?id=${surveyId}`)
      .then(r=>r.json())
      .then(d=>{ setData(d); setLoading(false); })
      .catch(()=>setLoading(false));
  },[surveyId]);

  if(loading||!data) return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
      <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-2xl flex items-center justify-center animate-in slide-in-from-right duration-300">
        <div className="animate-pulse text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargando…</div>
      </div>
    </div>
  );

  const questions = Array.isArray(data.questions)?data.questions:[];
  const responses = data.responses||[];
  const respIds   = new Set(responses.flatMap(r=>r.employeeId?[r.employeeId]:[]));
  const answered  = employees.filter(e=>respIds.has(e.id));
  const pending   = employees.filter(e=>!respIds.has(e.id));
  const myResp    = responses.find(r=>r.employeeId===currentUserId);
  const isClosed  = data.status==='CLOSED';

  // Agregar resultados por pregunta
  const aggregated = useMemo(()=>questions.map(q=>{
    const answers = responses.map(r=>{
      const a = r.answers;
      return (typeof a==='object'&&a!==null) ? a[q.id] : null;
    }).filter(a=>a!==null&&a!==undefined);

    if(q.type==='RATING'){
      const nums = answers.map(Number).filter(n=>!isNaN(n));
      const avg  = nums.length ? nums.reduce((s,n)=>s+n,0)/nums.length : 0;
      const dist = [1,2,3,4,5].map(v=>({ val:v, count:nums.filter(n=>Math.round(n)===v).length }));
      return { ...q, avg, dist, count:nums.length };
    }
    if(q.type==='YESNO'){
      const yes = answers.filter(a=>a==='yes'||a===true||a==='Sí').length;
      const no  = answers.length - yes;
      return { ...q, yes, no, count:answers.length };
    }
    if(q.type==='TEXT'){
      return { ...q, texts:answers.filter(t=>t&&t.trim()), count:answers.length };
    }
    if(q.type==='MULTIPLE'){
      const counts = {};
      answers.forEach(a=>{ counts[a]=(counts[a]||0)+1; });
      return { ...q, opts:Object.entries(counts).sort((a,b)=>b[1]-a[1]), count:answers.length };
    }
    return { ...q, count:answers.length };
  }),[questions,responses]);

  const handleSubmit = async()=>{
    setSubmitting(true);
    try {
      const r = await apiFetch('/api/surveys?action=respond',{
        method:'POST',
        body: JSON.stringify({ surveyId:data.id, employeeId:currentUserId, answers:myAnswers }),
      });
      if(!r.ok) throw new Error((await r.json()).error||'Error');
      setSubmitted(true); setAnswering(false);
      // Recargar
      const fresh = await apiFetch(`/api/surveys?id=${surveyId}`).then(x=>x.json());
      setData(fresh);
    } catch(e){ alert(e.message); } finally{ setSubmitting(false); }
  };

  const statusCfg = STATUS_CFG[data.status]||STATUS_CFG.ACTIVE;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
      <div className="relative ml-auto h-full w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 border-b bg-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest',statusCfg.cls)}>
                  {statusCfg.label}
                </span>
                {data.anonymous&&<span className="text-[9px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md uppercase">Anónima</span>}
              </div>
              <h3 className="font-black text-gray-900 text-sm leading-snug">{data.title}</h3>
              {data.description&&<p className="text-[10px] font-bold text-gray-400 mt-1">{data.description}</p>}
              {data.endDate&&<p className="text-[10px] font-bold text-gray-400 mt-0.5">Cierra: {fmtDate(data.endDate)}</p>}
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 hover:bg-gray-100 transition-colors">
              <X className="h-4 w-4 text-gray-500"/>
            </button>
          </div>

          {/* Participación */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Participación</p>
              <span className="text-[10px] font-black text-gray-700">{answered.length}/{employees.length}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all"
                style={{width:`${employees.length?Math.round((answered.length/employees.length)*100):0}%`}}/>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Mi acción */}
          {currentUserId&&!isClosed&&(
            <div className="px-6 py-4 border-b">
              {myResp||submitted ? (
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-xl">
                  <CheckCircle2 className="h-4 w-4 shrink-0"/>
                  <p className="text-[11px] font-black">Ya respondiste esta encuesta</p>
                </div>
              ):(
                <button onClick={()=>setAnswering(a=>!a)}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all">
                  <ClipboardCheck className="h-4 w-4"/>
                  {answering?'Cancelar Respuesta':'Responder Encuesta'}
                </button>
              )}
            </div>
          )}

          {/* Formulario de respuesta */}
          {answering&&(
            <div className="px-6 py-4 border-b space-y-4 bg-blue-50/30">
              <p className="text-[9px] font-black text-primary uppercase tracking-widest">Tu Respuesta</p>
              {questions.map((q,i)=>(
                <div key={q.id||i} className="space-y-2">
                  <p className="text-xs font-black text-gray-800">{i+1}. {q.text}</p>
                  {q.type==='RATING'&&(
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(v=>(
                        <button key={v} type="button"
                          onClick={()=>setMyAnswers(a=>({...a,[q.id||i]:v}))}
                          className={cn('h-9 w-9 rounded-xl font-black text-sm border-2 transition-all',
                            myAnswers[q.id||i]===v?'bg-amber-400 border-amber-400 text-white':'bg-white border-gray-200 text-gray-400 hover:border-amber-300')}>
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                  {q.type==='TEXT'&&(
                    <textarea rows={2} value={myAnswers[q.id||i]||''}
                      onChange={e=>setMyAnswers(a=>({...a,[q.id||i]:e.target.value}))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium bg-white outline-none focus:border-primary/50 resize-none"/>
                  )}
                  {q.type==='YESNO'&&(
                    <div className="flex gap-3">
                      {['Sí','No'].map(v=>(
                        <button key={v} type="button"
                          onClick={()=>setMyAnswers(a=>({...a,[q.id||i]:v}))}
                          className={cn('flex-1 py-2 rounded-xl font-black text-sm border-2 transition-all',
                            myAnswers[q.id||i]===v?'bg-primary border-primary text-white':'bg-white border-gray-200 text-gray-500 hover:border-primary/40')}>
                          {v}
                        </button>
                      ))}
                    </div>
                  )}
                  {q.type==='MULTIPLE'&&(q.options||[]).map(opt=>(
                    <button key={opt} type="button"
                      onClick={()=>setMyAnswers(a=>({...a,[q.id||i]:opt}))}
                      className={cn('w-full text-left px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all',
                        myAnswers[q.id||i]===opt?'bg-primary/10 border-primary text-primary':'bg-white border-gray-200 hover:border-gray-300')}>
                      {opt}
                    </button>
                  ))}
                </div>
              ))}
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50">
                {submitting?'Enviando...':'Enviar Respuestas'}
              </button>
            </div>
          )}

          {/* Resultados agregados */}
          {aggregated.length>0&&(
            <div className="px-6 py-4 space-y-5">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Resultados</p>
              {aggregated.map((q,i)=>(
                <div key={q.id||i} className="space-y-2">
                  <p className="text-[11px] font-black text-gray-800">{i+1}. {q.text}
                    <span className="ml-2 text-[9px] font-bold text-gray-400">({q.count} resp.)</span>
                  </p>
                  {q.type==='RATING'&&q.count>0&&(
                    <div className="space-y-1.5">
                      <RatingBar value={q.avg}/>
                      <div className="space-y-1">
                        {q.dist.map(d=>(
                          <div key={d.val} className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-gray-400 w-3">{d.val}</span>
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400 rounded-full" style={{width:`${q.count?Math.round((d.count/q.count)*100):0}%`}}/>
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 w-4">{d.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {q.type==='YESNO'&&q.count>0&&(
                    <div className="flex gap-3">
                      <div className="flex-1 bg-emerald-50 rounded-lg px-3 py-2 text-center">
                        <p className="text-lg font-black text-emerald-700">{q.yes}</p>
                        <p className="text-[9px] font-black text-emerald-600 uppercase">Sí</p>
                      </div>
                      <div className="flex-1 bg-rose-50 rounded-lg px-3 py-2 text-center">
                        <p className="text-lg font-black text-rose-600">{q.no}</p>
                        <p className="text-[9px] font-black text-rose-600 uppercase">No</p>
                      </div>
                    </div>
                  )}
                  {q.type==='TEXT'&&(q.texts||[]).length>0&&(
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {q.texts.map((t,j)=>(
                        <div key={j} className="bg-gray-50 rounded-lg px-3 py-2">
                          <p className="text-[11px] font-medium text-gray-700 italic">"{t}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type==='MULTIPLE'&&(q.opts||[]).length>0&&(
                    <div className="space-y-1.5">
                      {q.opts.map(([opt,count])=>(
                        <div key={opt} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-600 flex-1 truncate">{opt}</span>
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{width:`${q.count?Math.round((count/q.count)*100):0}%`}}/>
                          </div>
                          <span className="text-[9px] font-black text-gray-500 w-4">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Participantes */}
          {!data.anonymous&&(
            <div className="px-6 py-4 border-t space-y-3">
              {answered.length>0&&(
                <div>
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-2">Respondieron ({answered.length})</p>
                  <div className="space-y-1">
                    {answered.map(e=>(
                      <div key={e.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-50">
                        <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0',avatarColor(e.name))}>
                          {initials(e.name)}
                        </div>
                        <p className="text-[11px] font-black text-gray-900 flex-1 truncate">{e.name}</p>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0"/>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pending.length>0&&(
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Pendientes ({pending.length})</p>
                  <div className="space-y-1">
                    {pending.map(e=>(
                      <div key={e.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50">
                        <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0',avatarColor(e.name))}>
                          {initials(e.name)}
                        </div>
                        <p className="text-[11px] font-black text-gray-900 flex-1 truncate">{e.name}</p>
                        <div className="h-4 w-4 rounded-full border-2 border-gray-200 shrink-0"/>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────────
export default function SurveyManager() {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [surveys,    setSurveys]    = useState([]);
  const [employees,  setEmployees]  = useState([]);
  const [totalEmps,  setTotalEmps]  = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState('');

  // Formulario
  const [form, setForm] = useState({
    title:'', description:'', status:'ACTIVE', anonymous:true, endDate:'', questions:[]
  });

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const [sRes, emps] = await Promise.all([
        apiFetch('/api/surveys').then(r=>r.json()),
        hrService.getEmployees().catch(()=>[]),
      ]);
      setSurveys(sRes.surveys||[]);
      setTotalEmps(sRes.totalEmployees||0);
      setEmployees(Array.isArray(emps)?emps:emps?.employees||[]);
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  const filtered = useMemo(()=>{
    const q = search.toLowerCase();
    return !q ? surveys : surveys.filter(s=>s.title.toLowerCase().includes(q)||s.description?.toLowerCase().includes(q));
  },[surveys,search]);

  const stats = useMemo(()=>({
    total:   surveys.length,
    active:  surveys.filter(s=>s.status==='ACTIVE').length,
    resps:   surveys.reduce((s,x)=>s+(x.responsesCount||0),0),
    avgRate: surveys.length ? Math.round(surveys.reduce((s,x)=>s+(x.responseRate||0),0)/surveys.length) : 0,
  }),[surveys]);

  const addQuestion = ()=>setForm(f=>({...f,questions:[...f.questions,{id:Date.now(),text:'',type:'RATING',options:[]}]}));
  const removeQuestion = id=>setForm(f=>({...f,questions:f.questions.filter(q=>q.id!==id)}));
  const updateQuestion = (id,data)=>setForm(f=>({...f,questions:f.questions.map(q=>q.id===id?{...q,...data}:q)}));

  const handleCreate = async e=>{
    e.preventDefault(); setSaving(true);
    try {
      const r = await apiFetch('/api/surveys',{ method:'POST', body:JSON.stringify(form) });
      if(!r.ok) throw new Error((await r.json()).error||'Error');
      setShowForm(false);
      setForm({title:'',description:'',status:'ACTIVE',anonymous:true,endDate:'',questions:[]});
      load();
    } catch(e){ alert(e.message); } finally{ setSaving(false); }
  };

  const toggleStatus = async(s)=>{
    const next = s.status==='ACTIVE'?'CLOSED':s.status==='CLOSED'?'ACTIVE':'ACTIVE';
    await apiFetch('/api/surveys',{method:'PUT',body:JSON.stringify({id:s.id,status:next})});
    load();
  };

  const handleDelete = async id=>{
    if(!confirm('¿Eliminar esta encuesta y todas sus respuestas?')) return;
    await apiFetch('/api/surveys',{method:'DELETE',body:JSON.stringify({id})});
    load();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Clima Laboral</h2>
          <p className="text-sm text-gray-500 font-medium mt-0.5">Encuestas anónimas conectadas a los perfiles del equipo</p>
        </div>
        <button onClick={()=>setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          <Plus className="h-4 w-4"/> Nueva Encuesta
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Total Encuestas',    value:stats.total,   top:'bg-primary'     },
          { label:'Activas',            value:stats.active,  top:'bg-emerald-500' },
          { label:'Total Respuestas',   value:stats.resps,   top:'bg-blue-500'    },
          { label:'Participación Prom.',value:`${stats.avgRate}%`, top:'bg-amber-400'  },
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

      {/* Filtro */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar encuesta..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary/50"/>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading?(
          <div className="divide-y">{[1,2,3].map(i=>(
            <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
              <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/3"/><div className="h-2 bg-gray-100 rounded w-1/4"/></div>
              <div className="h-3 bg-gray-100 rounded w-16"/>
            </div>
          ))}</div>
        ):filtered.length===0?(
          <div className="text-center py-16">
            <ClipboardCheck className="h-8 w-8 text-gray-200 mx-auto mb-2"/>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sin encuestas</p>
          </div>
        ):(
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-5 py-3 text-left">Encuesta</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Preguntas</th>
                <th className="px-4 py-3 text-left">Cierre</th>
                <th className="px-4 py-3 text-left">Participación</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(s=>{
                const scfg = STATUS_CFG[s.status]||STATUS_CFG.ACTIVE;
                const rate = s.responseRate||0;
                return (
                  <tr key={s.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-5 py-3.5 cursor-pointer" onClick={()=>setSelected(s.id)}>
                      <p className="text-xs font-black text-gray-900 leading-tight">{s.title}</p>
                      {s.description&&<p className="text-[9px] font-bold text-gray-400 mt-0.5 line-clamp-1">{s.description}</p>}
                      {s.anonymous&&<span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Anónima</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={()=>toggleStatus(s)}
                        className={cn('text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest hover:opacity-80 transition-all',scfg.cls)}>
                        {scfg.label}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-1 text-[11px] font-black text-gray-600">
                        <MessageSquare className="h-3 w-3 text-gray-300"/>
                        {Array.isArray(s.questions)?s.questions.length:0}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] font-bold text-gray-500 whitespace-nowrap">{fmtDate(s.endDate)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full',rate>=80?'bg-emerald-500':rate>=50?'bg-amber-400':'bg-rose-400')}
                            style={{width:`${rate}%`}}/>
                        </div>
                        <span className="text-[10px] font-black text-gray-600">{s.responsesCount||0}/{totalEmps}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={()=>setSelected(s.id)}
                          className="h-7 px-3 rounded-lg bg-gray-100 hover:bg-primary hover:text-white text-gray-500 text-[10px] font-black uppercase tracking-widest transition-all">
                          <BarChart3 className="h-3.5 w-3.5"/>
                        </button>
                        <button onClick={()=>handleDelete(s.id)}
                          className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-rose-500 hover:text-white text-gray-500 flex items-center justify-center transition-all">
                          <Trash2 className="h-3.5 w-3.5"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Drawer resultados */}
      {selected&&(
        <SurveyResultsDrawer surveyId={selected} employees={employees}
          onClose={()=>setSelected(null)} currentUserId={currentUserId}/>
      )}

      {/* Modal crear encuesta */}
      {showForm&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setShowForm(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><ClipboardCheck className="h-4 w-4 text-primary"/></div>
                <p className="font-black text-gray-900 text-sm">Nueva Encuesta de Clima</p>
              </div>
              <button onClick={()=>setShowForm(false)} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><X className="h-4 w-4 text-gray-500"/></button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <MF label="Título"><input required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                placeholder="Ej. Clima Laboral Q2 2026"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/></MF>
              <MF label="Descripción (opcional)"><textarea rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                placeholder="Instrucciones para el colaborador..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50 resize-none"/></MF>
              <div className="grid grid-cols-2 gap-3">
                <MF label="Estado">
                  <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50">
                    <option value="ACTIVE">Activa</option>
                    <option value="DRAFT">Borrador</option>
                  </select>
                </MF>
                <MF label="Fecha Cierre">
                  <input type="date" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/>
                </MF>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.anonymous} onChange={e=>setForm(f=>({...f,anonymous:e.target.checked}))} className="h-4 w-4 rounded accent-primary"/>
                <span className="text-[11px] font-bold text-gray-600">Encuesta anónima (no asociar respuestas a perfiles)</span>
              </label>

              {/* Constructor de preguntas */}
              <div className="border-t pt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Preguntas ({form.questions.length})</p>
                  <button type="button" onClick={addQuestion}
                    className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">+ Agregar</button>
                </div>
                {form.questions.map((q,i)=>(
                  <div key={q.id} className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-[9px] font-black shrink-0">{i+1}</span>
                      <input value={q.text} onChange={e=>updateQuestion(q.id,{text:e.target.value})}
                        placeholder="Escribe tu pregunta..."
                        className="flex-1 bg-transparent text-xs font-bold text-gray-700 outline-none border-b border-gray-200 pb-1 focus:border-primary/50"/>
                      <button type="button" onClick={()=>removeQuestion(q.id)} className="text-gray-300 hover:text-rose-500 transition-colors"><X className="h-3.5 w-3.5"/></button>
                    </div>
                    <select value={q.type} onChange={e=>updateQuestion(q.id,{type:e.target.value})}
                      className="text-[9px] font-black bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none uppercase tracking-widest text-gray-500">
                      {Q_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    {q.type==='MULTIPLE'&&(
                      <input value={(q.options||[]).join(',')} onChange={e=>updateQuestion(q.id,{options:e.target.value.split(',').map(s=>s.trim())})}
                        placeholder="Opciones separadas por coma: Bueno, Regular, Malo"
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] font-medium outline-none focus:border-primary/50"/>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={()=>setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50">{saving?'Publicando...':'Publicar'}</button>
              </div>
            </form>
          </div>
        </div>
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
