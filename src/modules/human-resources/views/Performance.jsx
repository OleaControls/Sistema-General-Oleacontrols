import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Users, Target, Award, Star,
  Search, ChevronDown, ChevronUp, Clock, CheckCircle2,
  XCircle, Calendar, Briefcase, DollarSign, Shield,
  BarChart3, Activity, AlertCircle, Minus, Filter,
  ClipboardCheck, Phone, RefreshCw, Medal, Zap,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-sky-500','bg-teal-500','bg-indigo-500'];
const avatarColor = (name='') => { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; };
const initials = (name='') => name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

const scoreColor = (s) => s===null?'text-gray-300':s>=80?'text-emerald-600':s>=60?'text-amber-500':'text-rose-500';
const scoreBg    = (s) => s===null?'bg-gray-100 text-gray-400':s>=80?'bg-emerald-100 text-emerald-700':s>=60?'bg-amber-100 text-amber-700':'bg-rose-100 text-rose-700';
const scoreBar   = (s) => s===null?'bg-gray-200':s>=80?'bg-emerald-500':s>=60?'bg-amber-400':'bg-rose-500';

const fmt = (n, dec=1) => n===null||n===undefined?'—':typeof n==='number'?n.toLocaleString('es-MX',{maximumFractionDigits:dec}):n;
const fmtMX = (n) => n===null||n===undefined?'—':new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(n);
const fmtPct = (n) => n===null||n===undefined?'—':`${n}%`;

const MetaRow = ({ label, value, sub, color='text-gray-700' }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
    <div className="text-right">
      <span className={cn('text-sm font-black', color)}>{value}</span>
      {sub && <p className="text-[9px] font-bold text-gray-300 leading-tight">{sub}</p>}
    </div>
  </div>
);

const MiniCard = ({ label, value, icon:Icon, color='bg-gray-50 text-gray-600', sub }) => (
  <div className={cn('rounded-xl px-3 py-2.5 flex items-center gap-2.5', color)}>
    <Icon className="h-4 w-4 shrink-0 opacity-70"/>
    <div className="min-w-0">
      <p className="font-black text-base leading-none">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider opacity-70 mt-0.5 leading-tight">{label}</p>
      {sub&&<p className="text-[9px] font-bold opacity-50 leading-tight">{sub}</p>}
    </div>
  </div>
);

// ── Componente de fila expandible ─────────────────────────────────────────────
function EmpRow({ emp, rank, expanded, onToggle }) {
  const radar = [
    { label:'Asistencia',   value: emp.scoreComponents?.asistencia  ?? 0 },
    { label:'OTs',          value: emp.scoreComponents?.ots         ?? 0 },
    { label:'Evaluaciones', value: emp.scoreComponents?.evaluaciones ?? 0 },
    { label:'Checklists',   value: emp.scoreComponents?.checklists  ?? 0 },
    { label:'Gastos',       value: emp.scoreComponents?.gastos      ?? 0 },
  ];

  const hasSales = emp.sales?.calls > 0 || emp.sales?.revenue > 0;
  const hasOTs   = emp.ots?.total > 0;
  const hasEval  = emp.evaluations?.total > 0;

  return (
    <>
      <tr
        onClick={onToggle}
        className={cn('transition-colors cursor-pointer group', expanded ? 'bg-primary/5' : 'hover:bg-gray-50/60')}
      >
        {/* Rank */}
        <td className="px-5 py-4 text-center">
          {rank <= 3 ? (
            <span className={cn('text-base font-black', rank===1?'text-amber-500':rank===2?'text-gray-400':'text-amber-700')}>
              {rank===1?'🥇':rank===2?'🥈':'🥉'}
            </span>
          ) : (
            <span className="text-[11px] font-black text-gray-300">#{rank}</span>
          )}
        </td>

        {/* Avatar + nombre */}
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0', avatarColor(emp.name))}>
              {initials(emp.name)}
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm leading-tight">{emp.name}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase truncate max-w-[160px]">{emp.position||'Sin cargo'}</p>
            </div>
          </div>
        </td>

        {/* Departamento */}
        <td className="px-4 py-4 text-[11px] font-bold text-gray-500">{emp.department||'—'}</td>

        {/* Asistencia */}
        <td className="px-4 py-4">
          {emp.attendance.total > 0 ? (
            <div className="flex items-center gap-2">
              <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className={cn('h-1.5 rounded-full', scoreBar(emp.attendance.attRate))} style={{width:`${emp.attendance.attRate}%`}}/>
              </div>
              <span className={cn('text-[11px] font-black tabular-nums', scoreColor(emp.attendance.attRate))}>{fmtPct(emp.attendance.attRate)}</span>
            </div>
          ) : <span className="text-[10px] text-gray-300 font-bold">Sin datos</span>}
        </td>

        {/* OTs */}
        <td className="px-4 py-4">
          {emp.ots.total > 0 ? (
            <div>
              <span className="text-sm font-black text-gray-900">{emp.ots.completed}</span>
              <span className="text-[10px] font-bold text-gray-400"> / {emp.ots.total}</span>
            </div>
          ) : <span className="text-[10px] text-gray-300 font-bold">—</span>}
        </td>

        {/* Evaluación promedio */}
        <td className="px-4 py-4">
          {emp.evaluations.avg !== null ? (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400"/>
              <span className="text-sm font-black text-gray-900">{emp.evaluations.avg}</span>
              <span className="text-[9px] text-gray-400 font-bold">/5</span>
            </div>
          ) : <span className="text-[10px] text-gray-300 font-bold">Sin evals</span>}
        </td>

        {/* Score */}
        <td className="px-4 py-4">
          <span className={cn('text-xs font-black px-2.5 py-1 rounded-lg', scoreBg(emp.score))}>
            {emp.score !== null ? `${emp.score}%` : 'N/D'}
          </span>
        </td>

        {/* Expandir */}
        <td className="px-5 py-4 text-right">
          <button className="h-6 w-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center ml-auto transition-colors">
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-500"/> : <ChevronDown className="h-3.5 w-3.5 text-gray-500"/>}
          </button>
        </td>
      </tr>

      {/* Panel expandido */}
      {expanded && (
        <tr>
          <td colSpan={8} className="px-6 py-0 bg-primary/5 border-b border-primary/10">
            <div className="py-5 grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* Columna 1: Radar + mini cards */}
              <div className="space-y-4">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Score por Dimensión</p>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radar}>
                    <PolarGrid stroke="#e5e7eb"/>
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: '#6b7280' }}/>
                    <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2}/>
                  </RadarChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-2 gap-2">
                  <MiniCard label="Asistencia" value={fmtPct(emp.attendance.attRate)} icon={Calendar}
                    color={emp.attendance.attRate>=90?'bg-emerald-50 text-emerald-700':emp.attendance.attRate>=70?'bg-amber-50 text-amber-700':'bg-rose-50 text-rose-700'}/>
                  <MiniCard label="Faltas" value={emp.attendance.absent} icon={XCircle} color="bg-rose-50 text-rose-600"
                    sub={`${emp.attendance.late} tardanzas`}/>
                  <MiniCard label="OTs Campo" value={emp.ots.total} icon={Briefcase} color="bg-blue-50 text-blue-700"
                    sub={`${fmtPct(emp.ots.compRate)} completadas`}/>
                  <MiniCard label="Evaluación" value={emp.evaluations.avg??'—'} icon={Star} color="bg-amber-50 text-amber-700"
                    sub={`${emp.evaluations.total} evaluaciones`}/>
                </div>
              </div>

              {/* Columna 2: Detalle operativo */}
              <div className="space-y-4">
                {hasOTs && (
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Órdenes de Trabajo</p>
                    <MetaRow label="Total OTs" value={emp.ots.total}/>
                    <MetaRow label="Completadas" value={emp.ots.completed} color={emp.ots.compRate>=80?'text-emerald-600':'text-amber-500'}/>
                    <MetaRow label="Tasa Completitud" value={fmtPct(emp.ots.compRate)} color={scoreColor(emp.ots.compRate)}/>
                    <MetaRow label="Con firma cliente" value={`${emp.ots.otsWithSig??'—'} (${fmtPct(emp.ots.signRate)})`}/>
                    <MetaRow label="Con pendientes" value={emp.ots.otsWithPending}/>
                    <MetaRow label="Horas prom/OT" value={emp.ots.avgHours!==null?`${emp.ots.avgHours}h`:'—'}/>
                    <MetaRow label="Fondos manejados" value={fmtMX(emp.ots.fundsManaged)} color="text-primary"/>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Asistencia & Tiempo</p>
                  <MetaRow label="Días registrados" value={emp.attendance.total}/>
                  <MetaRow label="Presentes" value={emp.attendance.present} color="text-emerald-600"/>
                  <MetaRow label="Ausentes" value={emp.attendance.absent} color={emp.attendance.absent>3?'text-rose-600':'text-gray-700'}/>
                  <MetaRow label="Tardanzas" value={emp.attendance.late} color={emp.attendance.late>2?'text-amber-500':'text-gray-700'}/>
                  <MetaRow label="Incapacidades" value={emp.attendance.medical}/>
                  <MetaRow label="Permisos" value={emp.attendance.permission}/>
                  <MetaRow label="Minutos tarde prom" value={emp.attendance.avgLate?`${emp.attendance.avgLate} min`:'—'} color={emp.attendance.avgLate>15?'text-rose-500':'text-gray-700'}/>
                </div>

                {emp.checklists.total > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Checklists Técnicos</p>
                    <MetaRow label="Días registrados" value={emp.checklists.total}/>
                    <MetaRow label="Completos" value={emp.checklists.complete} color="text-emerald-600"/>
                    <MetaRow label="Tasa completitud" value={fmtPct(emp.checklists.rate)} color={scoreColor(emp.checklists.rate)}/>
                    <MetaRow label="Tasa check-in" value={fmtPct(emp.checklists.checkinRate)}/>
                  </div>
                )}
              </div>

              {/* Columna 3: Evaluaciones + gastos + ventas */}
              <div className="space-y-4">
                {hasEval && (
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Evaluaciones Recibidas</p>
                    <MetaRow label="Total" value={emp.evaluations.total}/>
                    <MetaRow label="Promedio global" value={emp.evaluations.avg!==null?`${emp.evaluations.avg}/5`:'—'} color={scoreColor(emp.evaluations.avg!==null?Math.round((emp.evaluations.avg/5)*100):null)}/>
                    {Object.entries(emp.evaluations.byType).map(([t,v])=>(
                      <MetaRow key={t} label={t.replace('_',' ')} value={`${v}/5`} color={v>=4?'text-emerald-600':v>=3?'text-amber-500':'text-rose-500'}/>
                    ))}
                    {emp.evaluations.recentComments.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Comentarios recientes</p>
                        {emp.evaluations.recentComments.map((c,i)=>(
                          <p key={i} className="text-[10px] text-gray-500 font-medium leading-snug bg-gray-50 rounded-lg px-2.5 py-1.5 italic">
                            "{c.comment}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {emp.expenses.total > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Gastos Generados</p>
                    <MetaRow label="Total solicitado" value={fmtMX(emp.expenses.total)}/>
                    <MetaRow label="Aprobados" value={fmtMX(emp.expenses.approved)} color="text-emerald-600"/>
                    <MetaRow label="Rechazados" value={fmtMX(emp.expenses.rejected)} color="text-rose-500"/>
                    <MetaRow label="Tasa aprobación" value={fmtPct(emp.expenses.approvalRate)} color={scoreColor(emp.expenses.approvalRate)}/>
                    {Object.keys(emp.expenses.byCategory).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-50 space-y-1">
                        {Object.entries(emp.expenses.byCategory).slice(0,4).map(([cat,amt])=>(
                          <div key={cat} className="flex justify-between text-[10px]">
                            <span className="text-gray-400 font-bold truncate">{cat}</span>
                            <span className="font-black text-gray-700">{fmtMX(amt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {hasSales && (
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Actividad Comercial</p>
                    <MetaRow label="Llamadas" value={emp.sales.calls}/>
                    <MetaRow label="Visitas" value={emp.sales.visits}/>
                    <MetaRow label="Cotizaciones" value={emp.sales.quotes}/>
                    <MetaRow label="Cierres" value={emp.sales.closings} color="text-emerald-600"/>
                    <MetaRow label="Tasa conversión" value={emp.sales.convRate!==null?`${emp.sales.convRate}%`:'—'} color={emp.sales.convRate>=10?'text-emerald-600':'text-amber-500'}/>
                    <MetaRow label="Venta generada" value={fmtMX(emp.sales.revenue)} color="text-primary"/>
                    <MetaRow label="Prospectos potenciales" value={emp.sales.potentials}/>
                    <MetaRow label="Decisores contactados" value={emp.sales.decisors}/>
                  </div>
                )}

                {emp.assets.count > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Activos Asignados</p>
                    <MetaRow label="Número de activos" value={emp.assets.count}/>
                    <MetaRow label="Condición promedio" value={fmtPct(emp.assets.avgCondition)} color={scoreColor(emp.assets.avgCondition)}/>
                  </div>
                )}

                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Info. General</p>
                  <MetaRow label="Ingreso" value={emp.joinDate?new Date(emp.joinDate).toLocaleDateString('es-MX',{month:'short',year:'numeric'}):'—'}/>
                  <MetaRow label="Contrato" value={emp.contractType||'—'}/>
                  <MetaRow label="Saldo vacaciones" value={`${emp.vacationBalance??0} días`}/>
                  <MetaRow label="Auditorías" value={emp.audits.count} sub={`${emp.audits.leaderCount} como líder`}/>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Vista principal ───────────────────────────────────────────────────────────
export default function Performance() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [sortKey, setSortKey]   = useState('score');

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/api/performance');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      // Aseguramos la forma esperada; si el backend responde otra cosa, no rompemos el render
      setData(json && Array.isArray(json.employees) ? json : { employees: [] });
    } catch(e) { console.error(e); setData({ employees: [] }); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); },[]);

  const departments = useMemo(()=>
    [...new Set((data?.employees||[]).flatMap(e=>e.department?[e.department]:[]))], [data]);

  const filtered = useMemo(()=>{
    if(!data) return [];
    const q = search.toLowerCase();
    return data.employees
      .filter(e=>{
        const mQ = !q || e.name.toLowerCase().includes(q) || (e.position||'').toLowerCase().includes(q);
        const mD = !filterDept || e.department===filterDept;
        return mQ && mD;
      })
      .sort((a,b)=>{
        if(sortKey==='score')   return (b.score??-1)-(a.score??-1);
        if(sortKey==='ots')     return (b.ots.total??0)-(a.ots.total??0);
        if(sortKey==='eval')    return (b.evaluations.avg??-1)-(a.evaluations.avg??-1);
        if(sortKey==='att')     return (b.attendance.attRate??-1)-(a.attendance.attRate??-1);
        if(sortKey==='name')    return a.name.localeCompare(b.name);
        return 0;
      });
  },[data,search,filterDept,sortKey]);

  // KPIs globales
  const kpis = useMemo(()=>{
    if(!data?.employees?.length) return null;
    const emps = data.employees;
    const withScore = emps.filter(e=>e.score!==null);
    return {
      total: emps.length,
      avgScore: withScore.length ? Math.round(withScore.reduce((s,e)=>s+(e.score||0),0)/withScore.length) : null,
      topRated: emps.find(e=>e.score!==null)?.name || '—',
      totalOTs: emps.reduce((s,e)=>s+(e.ots?.total||0),0),
      completedOTs: emps.reduce((s,e)=>s+(e.ots?.completed||0),0),
      avgEval: (()=>{
        const withE = emps.filter(e=>e.evaluations?.avg!==null);
        return withE.length ? +(withE.reduce((s,e)=>s+(e.evaluations.avg||0),0)/withE.length).toFixed(2) : null;
      })(),
      totalRevenue: emps.reduce((s,e)=>s+(e.sales?.revenue||0),0),
      avgAttRate: (()=>{
        const withA = emps.filter(e=>e.attendance?.attRate!==null);
        return withA.length ? Math.round(withA.reduce((s,e)=>s+(e.attendance.attRate||0),0)/withA.length) : null;
      })(),
    };
  },[data]);

  // Distribución de scores (para mini bar chart)
  const scoreDistribution = useMemo(()=>{
    if(!data?.employees) return [];
    const buckets = [{range:'0-59',n:0},{range:'60-79',n:0},{range:'80-89',n:0},{range:'90-100',n:0}];
    data.employees.forEach(e=>{
      if(e.score===null) return;
      if(e.score<60) buckets[0].n++;
      else if(e.score<80) buckets[1].n++;
      else if(e.score<90) buckets[2].n++;
      else buckets[3].n++;
    });
    return buckets;
  },[data]);

  const SortBtn = ({k, children}) => (
    <button onClick={()=>setSortKey(k)} className={cn('flex items-center gap-1 hover:text-primary transition-colors font-black', sortKey===k?'text-primary':'text-gray-400')}>
      {children}
    </button>
  );

  if(loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-3">
        <div className="h-7 w-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"/>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Calculando KPIs...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-900 leading-tight">Desempeño y KPIs</h2>
          <p className="text-sm text-gray-500 font-medium mt-0.5">Monitoreo integral de talento — todos los colaboradores</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-[10px] font-black text-gray-500 uppercase tracking-widest">
          <RefreshCw className="h-4 w-4"/> Actualizar
        </button>
      </div>

      {/* KPI strip */}
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label:'Colaboradores', value:kpis.total,                    top:'bg-gray-400',     icon:Users        },
            { label:'Score Promedio',value:kpis.avgScore!==null?`${kpis.avgScore}%`:'N/D', top: kpis.avgScore>=80?'bg-emerald-500':kpis.avgScore>=60?'bg-amber-400':'bg-rose-500', icon:Target },
            { label:'Mejor desempeño',value:kpis.topRated,               top:'bg-amber-500',    icon:Medal        },
            { label:'OTs del periodo',value:kpis.totalOTs,               top:'bg-blue-500',     icon:Briefcase    },
            { label:'OTs completadas',value:kpis.completedOTs,           top:'bg-emerald-500',  icon:CheckCircle2 },
            { label:'Eval promedio', value:kpis.avgEval!==null?`${kpis.avgEval}/5`:'N/D', top:'bg-violet-500', icon:Star },
            { label:'Asistencia prom',value:fmtPct(kpis.avgAttRate),     top:'bg-sky-500',      icon:Calendar     },
          ].map(s=>(
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div className={cn('h-1',s.top)}/>
              <div className="px-3 py-2.5 flex items-start gap-2">
                <s.icon className="h-4 w-4 text-gray-300 shrink-0 mt-0.5"/>
                <div className="min-w-0">
                  <p className="text-base font-black text-gray-900 leading-none truncate">{s.value}</p>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mt-1 leading-tight">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Distribución de scores */}
      {scoreDistribution.some(b=>b.n>0) && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Distribución de Desempeño</p>
            <BarChart3 className="h-4 w-4 text-gray-300"/>
          </div>
          <div className="flex items-end gap-3 h-24">
            {scoreDistribution.map((b,i)=>{
              const max = Math.max(...scoreDistribution.map(x=>x.n),1);
              const colors = ['bg-rose-400','bg-amber-400','bg-blue-400','bg-emerald-500'];
              const height = Math.round((b.n/max)*100);
              return (
                <div key={b.range} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-black text-gray-700">{b.n}</span>
                  <div className="w-full flex items-end justify-center">
                    <div className={cn('w-full rounded-t-md transition-all', colors[i])} style={{height:`${height}%`,minHeight:b.n>0?8:2}}/>
                  </div>
                  <span className="text-[9px] font-bold text-gray-400">{b.range}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar colaborador o puesto..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary/50 transition-all"/>
        </div>
        {departments.length > 0 && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"/>
            <select value={filterDept} onChange={e=>setFilterDept(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary/50 transition-all appearance-none">
              <option value="">Todos los depts</option>
              {departments.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Tabla ranking */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-5 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest w-12">Pos.</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <SortBtn k="name">Colaborador</SortBtn>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Departamento</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <SortBtn k="att">Asistencia</SortBtn>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <SortBtn k="ots">OTs</SortBtn>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <SortBtn k="eval">Evaluación</SortBtn>
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <SortBtn k="score">Score</SortBtn>
                </th>
                <th className="px-5 py-3 w-10"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-16">
                  <Users className="h-8 w-8 mx-auto mb-2 text-gray-200"/>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sin colaboradores</p>
                </td></tr>
              )}
              {filtered.map((emp, i) => (
                <EmpRow
                  key={emp.id}
                  emp={emp}
                  rank={i + 1}
                  expanded={expanded === emp.id}
                  onToggle={() => setExpanded(prev => prev === emp.id ? null : emp.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
            <p className="text-[10px] font-bold text-gray-400">
              {filtered.length} de {data?.employees?.length} colaboradores · Datos históricos completos · Generado {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) : '—'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
