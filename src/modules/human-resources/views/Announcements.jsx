import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Megaphone, Plus, CheckCircle2, X, Trash2, Eye,
  Users, AlertTriangle, Info, FileText, Search, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { hrService } from '@/api/hrService';
import { useAuth } from '@/store/AuthContext';

// ── Config ─────────────────────────────────────────────────────────────────────
const TYPES = {
  INFO:    { label:'Informativo',       cls:'bg-blue-100 text-blue-700 border-blue-200',   bar:'bg-blue-500',   Icon:Info          },
  URGENT:  { label:'Firma Obligatoria', cls:'bg-rose-100 text-rose-700 border-rose-200',   bar:'bg-rose-500',   Icon:AlertTriangle },
  POLICY:  { label:'Política',          cls:'bg-violet-100 text-violet-700 border-violet-200', bar:'bg-violet-500', Icon:FileText  },
};

const CATEGORIES = ['GENERAL','TÉCNICO','VENTAS','ADMIN','RRHH'];

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-sky-500','bg-teal-500'];
const avatarColor = (name='') => { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; };
const initials = (name='') => name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
const fmtDate  = d => d ? new Date(d).toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'}) : '—';

const EMPTY_FORM = { title:'', content:'', type:'INFO', category:'GENERAL', requiresConfirmation:false, targetDepts:[], targetRoles:[] };

// ── Drawer: detalle de anuncio ─────────────────────────────────────────────────
function AnnDrawer({ ann, employees, onClose, onDelete, currentUserId }) {
  const [data,     setData]     = useState(ann);
  const [marking,  setMarking]  = useState(false);

  const readIds  = useMemo(()=>new Set((data.reads||[]).map(r=>r.employeeId)),[data.reads]);
  const readList = employees.filter(e=>readIds.has(e.id));
  const pendList = employees.filter(e=>!readIds.has(e.id));

  const cfg = TYPES[data.type] || TYPES.INFO;

  const markRead = async()=>{
    if(!currentUserId) return;
    setMarking(true);
    try {
      await apiFetch('/api/announcements?action=read',{ method:'POST', body:JSON.stringify({ announcementId:data.id, employeeId:currentUserId }) });
      setData(d=>({ ...d, reads:[...(d.reads||[]),{ employeeId:currentUserId, confirmedAt:new Date().toISOString() }] }));
    } catch(e){ alert(e.message); } finally{ setMarking(false); }
  };

  const myRead = currentUserId && readIds.has(currentUserId);

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
      <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className={cn('px-6 py-5 border-b', data.type==='URGENT'?'bg-rose-50':'bg-gray-50')}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest',cfg.cls)}>
                  {cfg.label}
                </span>
                <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md uppercase tracking-widest">
                  {data.category}
                </span>
              </div>
              <h3 className="font-black text-gray-900 text-sm leading-snug">{data.title}</h3>
              <p className="text-[10px] font-bold text-gray-400 mt-1">{fmtDate(data.createdAt)}</p>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 hover:bg-gray-100 transition-colors">
              <X className="h-4 w-4 text-gray-500"/>
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">{data.content}</p>

          {/* Mi acción */}
          {currentUserId&&(
            <div className={cn('rounded-xl px-4 py-3 flex items-center justify-between gap-3',
              myRead?'bg-emerald-50 border border-emerald-100':'bg-gray-50 border border-gray-100')}>
              <div className="flex items-center gap-2">
                <CheckCircle2 className={cn('h-4 w-4 shrink-0', myRead?'text-emerald-600':'text-gray-300')}/>
                <p className="text-[11px] font-black text-gray-700">{myRead?'Marcado como leído':'Sin confirmar lectura'}</p>
              </div>
              {!myRead&&(
                <button onClick={markRead} disabled={marking}
                  className="text-[9px] font-black px-3 py-1.5 rounded-lg bg-primary text-white uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50">
                  {marking?'Confirmando...':'Confirmar Lectura'}
                </button>
              )}
            </div>
          )}

          {/* Progreso de lectura */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cumplimiento</p>
              <span className={cn('text-[10px] font-black', data.readRate>=80?'text-emerald-600':data.readRate>=50?'text-amber-600':'text-rose-500')}>
                {readList.length}/{employees.length} ({data.readRate||0}%)
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all',
                (data.readRate||0)>=80?'bg-emerald-500':(data.readRate||0)>=50?'bg-amber-400':'bg-rose-400')}
                style={{width:`${data.readRate||0}%`}}/>
            </div>
          </div>

          {/* Quién leyó */}
          {readList.length>0&&(
            <div className="space-y-2">
              <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Confirmaron ({readList.length})</p>
              <div className="space-y-1.5">
                {readList.map(e=>(
                  <div key={e.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-50">
                    <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0',avatarColor(e.name))}>
                      {initials(e.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-gray-900 truncate">{e.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 truncate">{e.department||e.position||''}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0"/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pendientes */}
          {pendList.length>0&&(
            <div className="space-y-2">
              <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Pendientes ({pendList.length})</p>
              <div className="space-y-1.5">
                {pendList.map(e=>(
                  <div key={e.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50">
                    <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center text-white text-[9px] font-black shrink-0',avatarColor(e.name))}>
                      {initials(e.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-gray-900 truncate">{e.name}</p>
                      <p className="text-[9px] font-bold text-gray-400 truncate">{e.department||e.position||''}</p>
                    </div>
                    <div className="h-4 w-4 rounded-full border-2 border-gray-200 shrink-0"/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50/50 flex justify-between">
          <button onClick={()=>{ if(confirm('¿Eliminar este anuncio?')) onDelete(data.id); }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black uppercase hover:bg-rose-100 transition-all">
            <Trash2 className="h-3.5 w-3.5"/> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────────
export default function Announcements() {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [announcements, setAnnouncements] = useState([]);
  const [employees,     setEmployees]     = useState([]);
  const [totalEmps,     setTotalEmps]     = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [showForm,      setShowForm]      = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [search,        setSearch]        = useState('');
  const [typeFilter,    setTypeFilter]    = useState('ALL');

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const [annRes, emps] = await Promise.all([
        apiFetch('/api/announcements').then(r=>r.json()),
        hrService.getEmployees().catch(()=>[]),
      ]);
      setAnnouncements(annRes.announcements||[]);
      setTotalEmps(annRes.totalEmployees||0);
      const empArr = Array.isArray(emps)?emps:emps?.employees||[];
      setEmployees(empArr);
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  },[]);

  useEffect(()=>{ load(); },[load]);

  const filtered = useMemo(()=>announcements.filter(a=>{
    const q = search.toLowerCase();
    const matchQ = !q||a.title.toLowerCase().includes(q)||a.category.toLowerCase().includes(q);
    const matchT = typeFilter==='ALL'||a.type===typeFilter;
    return matchQ&&matchT;
  }),[announcements,search,typeFilter]);

  const stats = useMemo(()=>({
    total:    announcements.length,
    urgent:   announcements.filter(a=>a.type==='URGENT').length,
    avgRead:  announcements.length ? Math.round(announcements.reduce((s,a)=>s+(a.readRate||0),0)/announcements.length) : 0,
    pending:  announcements.reduce((s,a)=>s+(totalEmps-(a.readCount||0)),0),
  }),[announcements,totalEmps]);

  const handleCreate = async e=>{
    e.preventDefault(); setSaving(true);
    try {
      const r = await apiFetch('/api/announcements',{ method:'POST', body:JSON.stringify(form) });
      if(!r.ok) throw new Error((await r.json()).error||'Error');
      setShowForm(false); setForm(EMPTY_FORM); load();
    } catch(e){ alert(e.message); } finally{ setSaving(false); }
  };

  const handleDelete = async id=>{
    await apiFetch('/api/announcements',{ method:'DELETE', body:JSON.stringify({ id }) });
    setSelected(null); load();
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Comunicados y Políticas</h2>
          <p className="text-sm text-gray-500 font-medium mt-0.5">Canal oficial de comunicación con seguimiento de lectura por colaborador</p>
        </div>
        <button onClick={()=>setShowForm(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          <Plus className="h-4 w-4"/> Nuevo Comunicado
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Total Comunicados', value:stats.total,   top:'bg-primary'    },
          { label:'Con Firma Oblig.',  value:stats.urgent,  top:'bg-rose-500'   },
          { label:'Tasa Promedio',     value:`${stats.avgRead}%`, top:'bg-emerald-500'},
          { label:'Lecturas Pendientes',value:stats.pending,top:'bg-amber-400'  },
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
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar comunicado..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary/50"/>
        </div>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-primary/50">
          <option value="ALL">Todos los tipos</option>
          <option value="INFO">Informativos</option>
          <option value="URGENT">Firma Obligatoria</option>
          <option value="POLICY">Políticas</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {loading?(
          <div className="divide-y">{[1,2,3].map(i=>(
            <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
              <div className="h-9 w-9 bg-gray-100 rounded-xl shrink-0"/>
              <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/3"/><div className="h-2 bg-gray-100 rounded w-1/4"/></div>
              <div className="h-3 bg-gray-100 rounded w-16"/>
            </div>
          ))}</div>
        ):filtered.length===0?(
          <div className="text-center py-16">
            <Megaphone className="h-8 w-8 text-gray-200 mx-auto mb-2"/>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sin comunicados{search?' que coincidan':''}</p>
          </div>
        ):(
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-5 py-3 text-left">Comunicado</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-left">Fecha</th>
                <th className="px-4 py-3 text-left">Lectura</th>
                <th className="px-5 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(a=>{
                const cfg = TYPES[a.type]||TYPES.INFO;
                const rate = a.readRate||0;
                return (
                  <tr key={a.id} className="hover:bg-gray-50/60 transition-colors group cursor-pointer"
                    onClick={()=>setSelected(a)}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center shrink-0',
                          a.type==='URGENT'?'bg-rose-100':a.type==='POLICY'?'bg-violet-100':'bg-blue-100')}>
                          <cfg.Icon className={cn('h-4 w-4', a.type==='URGENT'?'text-rose-600':a.type==='POLICY'?'text-violet-600':'text-blue-600')}/>
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 leading-tight">{a.title}</p>
                          <p className="text-[9px] font-bold text-gray-400 mt-0.5 line-clamp-1">{a.content?.slice(0,60)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-widest',cfg.cls)}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[9px] font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md uppercase tracking-widest">
                        {a.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] font-bold text-gray-500 whitespace-nowrap">{fmtDate(a.createdAt)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                          <div className={cn('h-full rounded-full',rate>=80?'bg-emerald-500':rate>=50?'bg-amber-400':'bg-rose-400')}
                            style={{width:`${rate}%`}}/>
                        </div>
                        <span className={cn('text-[10px] font-black min-w-[28px]',rate>=80?'text-emerald-600':rate>=50?'text-amber-600':'text-rose-500')}>
                          {rate}%
                        </span>
                        <span className="text-[9px] text-gray-400 font-bold">{a.readCount||0}/{totalEmps}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
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
        <AnnDrawer ann={selected} employees={employees} onClose={()=>setSelected(null)}
          onDelete={handleDelete} currentUserId={currentUserId}/>
      )}

      {/* Modal crear */}
      {showForm&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setShowForm(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Megaphone className="h-4 w-4 text-primary"/></div>
                <p className="font-black text-gray-900 text-sm">Nuevo Comunicado</p>
              </div>
              <button onClick={()=>setShowForm(false)} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><X className="h-4 w-4 text-gray-500"/></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <MF label="Título del Comunicado">
                <input required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                  placeholder="Ej. Actualización de Política de Viáticos 2026"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/>
              </MF>
              <MF label="Contenido">
                <textarea required rows={5} value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))}
                  placeholder="Escribe el contenido completo del comunicado..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50 resize-none"/>
              </MF>
              <div className="grid grid-cols-2 gap-3">
                <MF label="Tipo">
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50">
                    <option value="INFO">Informativo</option>
                    <option value="URGENT">Firma Obligatoria</option>
                    <option value="POLICY">Política</option>
                  </select>
                </MF>
                <MF label="Categoría">
                  <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50">
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </MF>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.requiresConfirmation} onChange={e=>setForm(f=>({...f,requiresConfirmation:e.target.checked}))}
                  className="h-4 w-4 rounded accent-primary"/>
                <span className="text-[11px] font-bold text-gray-600">Requiere confirmación de lectura</span>
              </label>
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
