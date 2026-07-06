import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar, Clock, CheckCircle2, XCircle, Stethoscope, Umbrella,
  Palmtree, Plus, Trash2, Pencil, ChevronLeft, ChevronRight,
  Search, Filter, Edit2, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { hrService } from '@/api/hrService';
import { useAuth, ROLES } from '@/store/AuthContext';

// ── Constantes ─────────────────────────────────────────────────────────────────
const TYPES = {
  PRESENT:    { label: 'Asistencia',  cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2, top: 'bg-emerald-500' },
  ABSENT:     { label: 'Falta',       cls: 'bg-red-100 text-red-700 border-red-200',             icon: XCircle,      top: 'bg-red-500'     },
  LATE:       { label: 'Retardo',     cls: 'bg-amber-100 text-amber-700 border-amber-200',       icon: Clock,        top: 'bg-amber-400'   },
  PERMISSION: { label: 'Permiso',     cls: 'bg-blue-100 text-blue-700 border-blue-200',          icon: Umbrella,     top: 'bg-blue-500'    },
  MEDICAL:    { label: 'Incap. Méd.', cls: 'bg-purple-100 text-purple-700 border-purple-200',    icon: Stethoscope,  top: 'bg-purple-500'  },
  HOLIDAY:    { label: 'Vacaciones',  cls: 'bg-teal-100 text-teal-700 border-teal-200',          icon: Palmtree,     top: 'bg-teal-500'    },
};

const VAC_TYPES = {
  ANNUAL:   { label: 'Vacaciones Anuales', cls: 'bg-emerald-100 text-emerald-700' },
  PERSONAL: { label: 'Permiso Personal',   cls: 'bg-amber-100 text-amber-700'    },
  SICK:     { label: 'Incapacidad',        cls: 'bg-rose-100 text-rose-700'       },
};

const EMPTY_FORM = {
  employeeId: '', date: new Date().toISOString().slice(0,10),
  type: 'ABSENT', checkIn: '', checkOut: '', minutesLate: '', notes: '',
};

const EMPTY_VAC = { employeeId: '', startDate: '', endDate: '', days: '', reason: '', type: 'ANNUAL' };

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-sky-500','bg-teal-500'];
const avatarColor = (name='') => { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; };

const calcYears = (joinDate) => {
  if(!joinDate) return 0;
  const j = new Date(joinDate), n = new Date();
  let y = n.getFullYear()-j.getFullYear();
  const m = n.getMonth()-j.getMonth();
  if(m<0||(m===0&&n.getDate()<j.getDate())) y--;
  return y;
};
const lawDays = (y) => y<1?0:12+(y-1)*2;

// ── Calendario de ausencias ────────────────────────────────────────────────────
function AbsenceCalendar({ employees }) {
  const [cur, setCur] = useState(new Date());
  const y = cur.getFullYear(), m = cur.getMonth();

  const requests = useMemo(()=>employees.flatMap(e=>(e.vacationRequests||[]).map(r=>({
    ...r, empName: e.name,
  }))).filter(r=>r.status==='APPROVED'||r.status==='PENDING'), [employees]);

  const days = useMemo(()=>{
    const first = new Date(y,m,1).getDay();
    const total = new Date(y,m+1,0).getDate();
    const arr = Array(first).fill({day:null});
    for(let i=1;i<=total;i++){
      const d = new Date(y,m,i);
      arr.push({ day:i, date:d,
        reqs: requests.filter(r=>{
          const s=new Date(r.startDate); const e=new Date(r.endDate);
          s.setHours(0,0,0,0); e.setHours(0,0,0,0); d.setHours(0,0,0,0);
          return d>=s&&d<=e;
        }),
      });
    }
    return arr;
  },[y,m,requests]);

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <p className="font-black text-gray-900 text-base">{MONTHS[m]} {y}</p>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Calendario de Ausencias</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setCur(new Date(y,m-1,1))} className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <ChevronLeft className="h-4 w-4 text-gray-500"/>
          </button>
          <button onClick={()=>setCur(new Date())} className="px-3 py-1.5 rounded-lg bg-gray-100 text-[10px] font-black text-gray-600 hover:bg-gray-200 transition-colors uppercase tracking-widest">
            Hoy
          </button>
          <button onClick={()=>setCur(new Date(y,m+1,1))} className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <ChevronRight className="h-4 w-4 text-gray-500"/>
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b bg-gray-50/80">
        {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d=>(
          <div key={d} className="py-3 text-center text-[9px] font-black text-gray-400 uppercase tracking-widest border-r last:border-0">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 auto-rows-[100px]">
        {days.map((d,i)=>(
          <div key={i} className={cn('border-r border-b p-1.5 overflow-y-auto flex flex-col gap-1', !d.day?'bg-gray-50/30':'hover:bg-gray-50/50')}>
            {d.day && (
              <>
                <span className={cn('self-start text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-lg',
                  d.date?.toDateString()===new Date().toDateString()?'bg-primary text-white':'text-gray-400')}>
                  {d.day}
                </span>
                {d.reqs.map((r,j)=>(
                  <div key={j} title={`${r.empName}: ${VAC_TYPES[r.type]?.label||r.type} (${r.status==='PENDING'?'Pendiente':'Aprobado'})`}
                    className={cn('text-[8px] font-black px-1.5 py-0.5 rounded-md truncate',
                      r.type==='ANNUAL'?'bg-emerald-500 text-white':r.type==='SICK'?'bg-rose-500 text-white':'bg-amber-500 text-white',
                      r.status==='PENDING'&&'opacity-50 border border-dashed border-white/60')}>
                    {r.empName.split(' ')[0]}
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-t bg-gray-50/50 flex flex-wrap gap-4 justify-center">
        {[['bg-emerald-500','Vacaciones'],['bg-amber-500','Permiso'],['bg-rose-500','Incapacidad']].map(([c,l])=>(
          <div key={l} className="flex items-center gap-1.5">
            <div className={cn('h-2 w-2 rounded-full',c)}/>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{l}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-gray-300 border border-dashed border-gray-400"/>
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Pendiente</span>
        </div>
      </div>
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────────
export default function Attendance() {
  const { user } = useAuth();
  const userRoles = user?.roles || [user?.role];
  const canEdit = userRoles.some(r=>[ROLES.ADMIN,ROLES.HR,ROLES.OPS].includes(r));

  const now = new Date();
  const [tab,         setTab]         = useState('ATTENDANCE');
  const [viewYear,    setViewYear]    = useState(now.getFullYear());
  const [viewMonth,   setViewMonth]   = useState(now.getMonth()+1);
  const [records,     setRecords]     = useState([]);
  const [employees,   setEmployees]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('ALL');
  const [empFilter,   setEmpFilter]   = useState('ALL');

  // Attendance modal
  const [showAttModal,  setShowAttModal] = useState(false);
  const [editing,       setEditing]      = useState(null);
  const [saving,        setSaving]       = useState(false);
  const [form,          setForm]         = useState(EMPTY_FORM);

  // Vacation
  const [showVacModal,  setShowVacModal] = useState(false);
  const [vacForm,       setVacForm]      = useState(EMPTY_VAC);
  const [vacSaving,     setVacSaving]    = useState(false);

  // Adjust balance
  const [adjustEmp,    setAdjustEmp]   = useState(null);
  const [adjustDays,   setAdjustDays]  = useState('');

  useEffect(()=>{
    hrService.getEmployees().then(d=>{
      setEmployees(Array.isArray(d)?d:d?.employees||[]);
    }).catch(()=>{});
  },[]);

  const loadRecords = useCallback(async()=>{
    if(!employees.length){ setLoading(false); return; }
    setLoading(true);
    try {
      const all = await Promise.all(employees.map(e=>
        apiFetch(`/api/attendance?employeeId=${e.id}&month=${viewMonth}&year=${viewYear}`)
          .then(r=>r.ok?r.json():{records:[]})
          .then(d=>d.records||[])
          .catch(()=>[])
      ));
      setRecords(all.flat());
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  },[employees,viewMonth,viewYear]);

  useEffect(()=>{ if(employees.length) loadRecords(); },[loadRecords,employees]);

  // Auto-calc vacation days
  useEffect(()=>{
    if(vacForm.startDate&&vacForm.endDate){
      const d = Math.ceil((new Date(vacForm.endDate)-new Date(vacForm.startDate))/(86400000))+1;
      if(!isNaN(d)&&d>0) setVacForm(p=>({...p,days:String(d)}));
    }
  },[vacForm.startDate,vacForm.endDate]);

  const prevMonth = ()=>{ if(viewMonth===1){setViewMonth(12);setViewYear(y=>y-1);}else setViewMonth(m=>m-1); };
  const nextMonth = ()=>{ if(viewMonth===12){setViewMonth(1);setViewYear(y=>y+1);}else setViewMonth(m=>m+1); };

  const empMap = useMemo(()=>Object.fromEntries(employees.map(e=>[e.id,e])),[employees]);

  const filtered = useMemo(()=>records.filter(r=>{
    const emp=empMap[r.employeeId];
    return (!search||(emp?.name||'').toLowerCase().includes(search.toLowerCase()))
      &&(typeFilter==='ALL'||r.type===typeFilter)
      &&(empFilter==='ALL'||r.employeeId===empFilter);
  }).sort((a,b)=>new Date(b.date)-new Date(a.date)),[records,search,typeFilter,empFilter,empMap]);

  const summary = useMemo(()=>records.reduce((acc,r)=>{ acc[r.type]=(acc[r.type]||0)+1; return acc; },{}),[records]);

  // All vacation requests
  const allVacReqs = useMemo(()=>employees.flatMap(e=>
    (e.vacationRequests||[]).map(r=>({...r,employee:e}))
  ).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)),[employees]);

  const pendingVac = allVacReqs.filter(r=>r.status==='PENDING');
  const histVac    = allVacReqs.filter(r=>r.status!=='PENDING');

  // Handlers
  const openNew  = ()=>{ setEditing(null); setForm(EMPTY_FORM); setShowAttModal(true); };
  const openEdit = r=>{ setEditing(r.id); setForm({employeeId:r.employeeId,date:r.date.slice(0,10),type:r.type,checkIn:r.checkIn||'',checkOut:r.checkOut||'',minutesLate:r.minutesLate??'',notes:r.notes||''}); setShowAttModal(true); };
  const handleDelete = async id=>{ if(!confirm('¿Eliminar este registro?')) return; await apiFetch('/api/attendance',{method:'DELETE',body:JSON.stringify({id})}); loadRecords(); };
  const handleSave = async()=>{
    if(!form.employeeId||!form.date||!form.type){ alert('Empleado, fecha y tipo son requeridos'); return; }
    setSaving(true);
    try {
      const body={...form,minutesLate:form.minutesLate?Number(form.minutesLate):null};
      if(editing) body.id=editing;
      const r=await apiFetch('/api/attendance',{method:editing?'PUT':'POST',body:JSON.stringify(body)});
      if(!r.ok) throw new Error((await r.json()).error||'Error');
      setShowAttModal(false); loadRecords();
    } catch(e){ alert(e.message); } finally{ setSaving(false); }
  };

  const handleVacStatus = async(id,status)=>{
    if(!confirm(`¿${status==='APPROVED'?'Aprobar':'Rechazar'} esta solicitud?`)) return;
    try { await hrService.updateVacationRequest(id,status); const emps=await hrService.getEmployees(); setEmployees(emps); }
    catch(e){ alert(e.message); }
  };

  const handleVacSave = async(e)=>{
    e.preventDefault(); setVacSaving(true);
    try { await hrService.requestVacation(vacForm); setShowVacModal(false); setVacForm(EMPTY_VAC); const emps=await hrService.getEmployees(); setEmployees(emps); }
    catch(e){ alert(e.message); } finally{ setVacSaving(false); }
  };

  const handleAdjust = async()=>{
    if(adjustDays===''||isNaN(parseFloat(adjustDays))) return;
    try { await hrService.updateVacationBalanceManual(adjustEmp.id,parseFloat(adjustDays)); setAdjustEmp(null); const emps=await hrService.getEmployees(); setEmployees(emps); }
    catch(e){ alert(e.message); }
  };

  const monthName = new Date(viewYear,viewMonth-1,1).toLocaleDateString('es-MX',{month:'long',year:'numeric'});

  const TABS = [
    { id:'ATTENDANCE', label:'Asistencia Mensual'      },
    { id:'VACATIONS',  label:`Vacaciones y Permisos${pendingVac.length?` (${pendingVac.length})`:''}`},
    { id:'BALANCES',   label:'Bolsas de Días'          },
    { id:'CALENDAR',   label:'Calendario'              },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Asistencia & Tiempo</h2>
          <p className="text-sm text-gray-500 font-medium mt-0.5">Registro de incidencias, vacaciones y permisos del equipo</p>
        </div>
        <div className="flex gap-2">
          <button onClick={()=>setShowVacModal(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all">
            <Palmtree className="h-4 w-4 text-emerald-500"/> Nueva Solicitud
          </button>
          {canEdit && (
            <button onClick={openNew}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
              <Plus className="h-4 w-4"/> Registrar Incidencia
            </button>
          )}
        </div>
      </div>

      {/* Stats globales (siempre visibles) */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          {key:'PRESENT', label:'Asistencias'}, {key:'ABSENT',    label:'Faltas'},
          {key:'LATE',    label:'Retardos'},    {key:'PERMISSION', label:'Permisos'},
          {key:'MEDICAL', label:'Incap. Méd.'},{key:'HOLIDAY',   label:'Vacaciones'},
        ].map(s=>{
          const cfg=TYPES[s.key];
          return (
            <div key={s.key} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div className={cn('h-1',cfg.top)}/>
              <div className="px-3 py-3 text-center">
                <p className="text-xl font-black text-gray-900 leading-none">{summary[s.key]||0}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 gap-1">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={cn('px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap',
              tab===t.id?'border-primary text-primary':'border-transparent text-gray-400 hover:text-gray-600')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Asistencia ─────────────────────────────────────────────────── */}
      {tab==='ATTENDANCE'&&(
        <div className="space-y-4">
          {/* Mes nav + filtros */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
              <button onClick={prevMonth} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                <ChevronLeft className="h-4 w-4 text-gray-500"/>
              </button>
              <span className="text-xs font-black text-gray-700 min-w-[140px] text-center capitalize">{monthName}</span>
              <button onClick={nextMonth} className="h-7 w-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors">
                <ChevronRight className="h-4 w-4 text-gray-500"/>
              </button>
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empleado..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary/50"/>
            </div>
            <select value={empFilter} onChange={e=>setEmpFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-primary/50">
              <option value="ALL">Todos</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-primary/50">
              <option value="ALL">Todos los tipos</option>
              {Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {loading?(
              <div className="divide-y">{[1,2,3,4,5].map(i=>(
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="h-8 w-8 bg-gray-100 rounded-xl shrink-0"/>
                  <div className="flex-1 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/4"/><div className="h-2 bg-gray-100 rounded w-1/3"/></div>
                </div>
              ))}</div>
            ):filtered.length===0?(
              <div className="text-center py-16">
                <Calendar className="h-8 w-8 text-gray-200 mx-auto mb-2"/>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sin registros{search?' que coincidan':' este mes'}</p>
              </div>
            ):(
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-5 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Colaborador</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Horario</th>
                    <th className="px-4 py-3 text-left">Notas</th>
                    {canEdit&&<th className="px-5 py-3 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(r=>{
                    const cfg=TYPES[r.type]||TYPES.ABSENT;
                    const emp=empMap[r.employeeId];
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/60 transition-colors group">
                        <td className="px-5 py-3 text-[11px] font-bold text-gray-600 whitespace-nowrap">
                          {new Date(r.date).toLocaleDateString('es-MX',{weekday:'short',day:'2-digit',month:'short'})}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center text-white font-black text-[10px] shrink-0', avatarColor(emp?.name||''))}>
                              {(emp?.name||'?').charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900 leading-none">{emp?.name||r.employeeId}</p>
                              <p className="text-[9px] font-bold text-gray-400 mt-0.5">{emp?.position||emp?.department||''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('inline-flex items-center gap-1.5 text-[9px] font-black px-2 py-1 rounded-full border',cfg.cls)}>
                            <cfg.icon className="h-3 w-3"/>
                            {cfg.label}
                            {r.minutesLate>0&&<span className="ml-1">· {r.minutesLate} min</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] font-bold text-gray-500">
                          {r.checkIn?`${r.checkIn}${r.checkOut?` – ${r.checkOut}`:''}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-gray-400 max-w-[180px] truncate">{r.notes||'—'}</td>
                        {canEdit&&(
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={()=>openEdit(r)} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-primary hover:text-white text-gray-500 flex items-center justify-center transition-all">
                                <Pencil className="h-3.5 w-3.5"/>
                              </button>
                              <button onClick={()=>handleDelete(r.id)} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-rose-500 hover:text-white text-gray-500 flex items-center justify-center transition-all">
                                <Trash2 className="h-3.5 w-3.5"/>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {filtered.length>0&&(
              <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
                <p className="text-[10px] font-bold text-gray-400">{filtered.length} registro{filtered.length!==1?'s':''} · {monthName}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Vacaciones y Permisos ──────────────────────────────────────── */}
      {tab==='VACATIONS'&&(
        <div className="space-y-4">
          {/* Pendientes */}
          {pendingVac.length===0?(
            <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-12 text-center">
              <CheckCircle2 className="h-8 w-8 text-gray-200 mx-auto mb-2"/>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sin solicitudes pendientes</p>
            </div>
          ):(
            <div className="space-y-3">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Pendientes de Aprobación ({pendingVac.length})</p>
              {pendingVac.map(req=>(
                <div key={req.id} className="bg-white border border-amber-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0', avatarColor(req.employee.name))}>
                      {req.employee.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-gray-900 text-sm">{req.employee.name}</p>
                        <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-md uppercase',VAC_TYPES[req.type]?.cls||'bg-gray-100 text-gray-600')}>
                          {VAC_TYPES[req.type]?.label||req.type}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">{req.employee.position} · {req.employee.department}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 bg-gray-50 px-2.5 py-1 rounded-lg">
                          <Calendar className="h-3 w-3 text-gray-400"/>
                          {new Date(req.startDate).toLocaleDateString('es-MX',{day:'2-digit',month:'short'})} — {new Date(req.endDate).toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}
                        </span>
                        <span className="text-[10px] font-black text-primary">{req.days} días</span>
                        {req.reason&&<span className="text-[10px] text-gray-400 italic">"{req.reason}"</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={()=>handleVacStatus(req.id,'REJECTED')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 font-black text-[10px] uppercase hover:bg-rose-100 transition-all">
                      <XCircle className="h-3.5 w-3.5"/> Rechazar
                    </button>
                    <button onClick={()=>handleVacStatus(req.id,'APPROVED')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase hover:bg-emerald-700 transition-all shadow-sm">
                      <CheckCircle2 className="h-3.5 w-3.5"/> Aprobar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Histórico */}
          {histVac.length>0&&(
            <div className="space-y-2">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1 mt-4">Historial Reciente</p>
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-5 py-3 text-left">Colaborador</th>
                      <th className="px-4 py-3 text-left">Tipo</th>
                      <th className="px-4 py-3 text-left">Período</th>
                      <th className="px-4 py-3 text-left">Días</th>
                      <th className="px-4 py-3 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {histVac.slice(0,20).map(req=>(
                      <tr key={req.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className={cn('h-6 w-6 rounded-lg flex items-center justify-center text-white font-black text-[9px] shrink-0',avatarColor(req.employee.name))}>
                              {req.employee.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900">{req.employee.name}</p>
                              <p className="text-[9px] font-bold text-gray-400">{req.employee.department}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-md uppercase',VAC_TYPES[req.type]?.cls||'bg-gray-100 text-gray-600')}>
                            {VAC_TYPES[req.type]?.label||req.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] font-bold text-gray-600">
                          {new Date(req.startDate).toLocaleDateString('es-MX',{day:'2-digit',month:'short'})} – {new Date(req.endDate).toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}
                        </td>
                        <td className="px-4 py-3 text-[11px] font-black text-gray-700">{req.days}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-md uppercase',
                            req.status==='APPROVED'?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-700')}>
                            {req.status==='APPROVED'?'Aprobado':'Rechazado'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Bolsas de Días ─────────────────────────────────────────────── */}
      {tab==='BALANCES'&&(
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-5 py-3 text-left">Colaborador</th>
                <th className="px-4 py-3 text-left">Departamento</th>
                <th className="px-4 py-3 text-left">Antigüedad</th>
                <th className="px-4 py-3 text-left">Días por Ley</th>
                <th className="px-4 py-3 text-left">Saldo Disponible</th>
                <th className="px-4 py-3 text-left">Vacaciones Usadas</th>
                {canEdit&&<th className="px-5 py-3 text-right">Ajuste</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employees.map(emp=>{
                const years = calcYears(emp.joinDate);
                const ld    = lawDays(years);
                const used  = (emp.vacationRequests||[]).filter(r=>r.status==='APPROVED').reduce((s,r)=>s+(r.days||0),0);
                return (
                  <tr key={emp.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0',avatarColor(emp.name))}>
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 leading-tight">{emp.name}</p>
                          <p className="text-[10px] font-bold text-gray-400">{emp.position||'Sin cargo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[11px] font-bold text-gray-500">{emp.department||'—'}</td>
                    <td className="px-4 py-4 text-[11px] font-bold text-gray-600">{years} {years===1?'año':'años'}</td>
                    <td className="px-4 py-4 text-[11px] font-bold text-gray-600">{ld} días</td>
                    <td className="px-4 py-4">
                      <span className={cn('text-sm font-black px-3 py-1 rounded-lg',
                        (emp.vacationBalance||0)>0?'bg-emerald-100 text-emerald-700':'bg-rose-100 text-rose-600')}>
                        {emp.vacationBalance||0} días
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[11px] font-bold text-gray-500">{used} días</td>
                    {canEdit&&(
                      <td className="px-5 py-4 text-right">
                        <button onClick={()=>{ setAdjustEmp(emp); setAdjustDays(String(emp.vacationBalance||0)); }}
                          className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-primary hover:text-white text-gray-500 flex items-center justify-center transition-all ml-auto opacity-0 group-hover:opacity-100">
                          <Edit2 className="h-3.5 w-3.5"/>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab: Calendario ─────────────────────────────────────────────────── */}
      {tab==='CALENDAR'&&<AbsenceCalendar employees={employees}/>}

      {/* ── Modal: Registrar Incidencia ─────────────────────────────────────── */}
      {showAttModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setShowAttModal(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-black text-gray-900 text-sm uppercase tracking-widest">{editing?'Editar Registro':'Registrar Incidencia'}</p>
              <button onClick={()=>setShowAttModal(false)} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><X className="h-4 w-4 text-gray-500"/></button>
            </div>
            <div className="space-y-3">
              <ModalField label="Colaborador">
                <select value={form.employeeId} onChange={e=>setForm(f=>({...f,employeeId:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50">
                  <option value="">Seleccionar...</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </ModalField>
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Fecha">
                  <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/>
                </ModalField>
                <ModalField label="Tipo">
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50">
                    {Object.entries(TYPES).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                  </select>
                </ModalField>
              </div>
              {(form.type==='PRESENT'||form.type==='LATE')&&(
                <div className="grid grid-cols-2 gap-3">
                  <ModalField label="Entrada"><input type="time" value={form.checkIn} onChange={e=>setForm(f=>({...f,checkIn:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/></ModalField>
                  <ModalField label="Salida"><input type="time" value={form.checkOut} onChange={e=>setForm(f=>({...f,checkOut:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/></ModalField>
                </div>
              )}
              {form.type==='LATE'&&(
                <ModalField label="Minutos de Retardo">
                  <input type="number" min="1" max="480" value={form.minutesLate} onChange={e=>setForm(f=>({...f,minutesLate:e.target.value}))} placeholder="ej. 20" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/>
                </ModalField>
              )}
              <ModalField label="Notas (opcional)">
                <textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder="Motivo, observación..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50 resize-none"/>
              </ModalField>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={()=>setShowAttModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50">{saving?'Guardando...':(editing?'Actualizar':'Guardar')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Nueva Solicitud Vacaciones ──────────────────────────────── */}
      {showVacModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setShowVacModal(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in zoom-in-95 duration-200" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center"><Palmtree className="h-4 w-4 text-emerald-600"/></div>
                <p className="font-black text-gray-900 text-sm">Nueva Solicitud</p>
              </div>
              <button onClick={()=>setShowVacModal(false)} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><X className="h-4 w-4 text-gray-500"/></button>
            </div>
            <form onSubmit={handleVacSave} className="space-y-3">
              <ModalField label="Colaborador">
                <select required value={vacForm.employeeId} onChange={e=>setVacForm(p=>({...p,employeeId:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50">
                  <option value="">Seleccionar...</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </ModalField>
              <ModalField label="Tipo">
                <select value={vacForm.type} onChange={e=>setVacForm(p=>({...p,type:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50">
                  <option value="ANNUAL">Vacaciones Anuales</option>
                  <option value="PERSONAL">Permiso Personal</option>
                  <option value="SICK">Incapacidad</option>
                </select>
              </ModalField>
              <div className="grid grid-cols-2 gap-3">
                <ModalField label="Fecha Inicio"><input required type="date" value={vacForm.startDate} onChange={e=>setVacForm(p=>({...p,startDate:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/></ModalField>
                <ModalField label="Fecha Fin"><input required type="date" value={vacForm.endDate} onChange={e=>setVacForm(p=>({...p,endDate:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/></ModalField>
              </div>
              <ModalField label={`Días a descontar${vacForm.days?' (calculado automático)':''}`}>
                <input required type="number" value={vacForm.days} onChange={e=>setVacForm(p=>({...p,days:e.target.value}))} placeholder="ej. 5" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/>
              </ModalField>
              <ModalField label="Motivo (opcional)">
                <textarea rows={2} value={vacForm.reason} onChange={e=>setVacForm(p=>({...p,reason:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50 resize-none"/>
              </ModalField>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={()=>setShowVacModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit" disabled={vacSaving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-50">{vacSaving?'Registrando...':'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Ajuste Manual Balance ────────────────────────────────────── */}
      {adjustEmp&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={()=>setAdjustEmp(null)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-200" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-gray-900 text-sm">Ajuste de Saldo</p>
                <p className="text-[10px] font-bold text-gray-400 mt-0.5">{adjustEmp.name}</p>
              </div>
              <button onClick={()=>setAdjustEmp(null)} className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"><X className="h-4 w-4 text-gray-500"/></button>
            </div>
            <ModalField label="Días disponibles">
              <input type="number" value={adjustDays} onChange={e=>setAdjustDays(e.target.value)} placeholder="ej. 12" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-gray-50 outline-none focus:bg-white focus:border-primary/50"/>
            </ModalField>
            <div className="flex gap-3">
              <button onClick={()=>setAdjustEmp(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all">Cancelar</button>
              <button onClick={handleAdjust} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalField({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}
