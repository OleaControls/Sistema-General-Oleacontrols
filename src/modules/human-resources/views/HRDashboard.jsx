import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, FileText, Palmtree, DollarSign,
  TrendingDown, TrendingUp, ArrowRight, CheckCircle2,
  XCircle, Clock, Briefcase, Building2, CalendarDays,
  Zap, RefreshCw, Award, Star,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { hrService } from '@/api/hrService';
import { apiFetch } from '@/lib/api';

const PAL = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#f43f5e','#0ea5e9','#14b8a6','#6366f1'];
const AVATAR_COLS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-sky-500','bg-teal-500'];

const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-black text-gray-700 mb-1">{label}</p>
      {payload.map((e,i) => (
        <p key={i} style={{color:e.color}} className="font-bold">{e.name}: <span className="text-gray-900">{e.value}</span></p>
      ))}
    </div>
  );
};

export default function HRDashboard() {
  const [loading,        setLoading]        = useState(true);
  const [employees,      setEmployees]      = useState([]);
  const [monthAttendance,setMonthAttendance]= useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const emps = await hrService.getEmployees();
      setEmployees(emps);
      const now   = new Date();
      const month = now.getMonth() + 1;
      const year  = now.getFullYear();
      const batch = await Promise.all(
        emps.slice(0, 30).map(e =>
          apiFetch(`/api/attendance?employeeId=${e.id}&month=${month}&year=${year}`)
            .then(r => r.ok ? r.json() : { records: [] })
            .then(d => d.records || [])
            .catch(() => [])
        )
      );
      setMonthAttendance(batch.flat());
    } catch (err) {
      console.error('[HRDashboard]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── KPIs derivados ───────────────────────────────────────────────────────────
  const total          = employees.length;
  const activos        = employees.filter(e => e.status === 'ACTIVE').length;
  const pendVac        = employees.reduce((acc, e) => acc + ((e.vacationRequests||[]).filter(r=>r.status==='PENDING').length), 0);
  const attTotal       = monthAttendance.length;
  const attPresent     = monthAttendance.filter(r => r.type === 'PRESENT').length;
  const attAbsent      = monthAttendance.filter(r => r.type === 'ABSENT').length;
  const attLate        = monthAttendance.filter(r => r.type === 'LATE').length;
  const absenceRate    = attTotal > 0 ? Math.round((attAbsent / attTotal) * 100 * 10) / 10 : 0;
  const punctuality    = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

  // Departamentos
  const deptMap = {};
  employees.forEach(e => { const d = e.department||'Sin área'; deptMap[d]=(deptMap[d]||0)+1; });
  const deptData = Object.entries(deptMap).map(([dept,count])=>({dept,count})).sort((a,b)=>b.count-a.count);

  // Contratos
  const contractMap = {};
  employees.forEach(e => { const c = e.contractType||'N/A'; contractMap[c]=(contractMap[c]||0)+1; });

  if (loading) return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-gray-100 rounded-lg animate-pulse"/>
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse"/>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i=>(
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-pulse space-y-3">
            <div className="h-9 w-9 bg-gray-100 rounded-xl"/>
            <div className="h-7 w-16 bg-gray-100 rounded"/>
            <div className="h-3 w-24 bg-gray-100 rounded"/>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Recursos Humanos</h2>
          <p className="text-sm text-gray-400 font-medium mt-0.5">Resumen general del equipo</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 h-9 px-4 rounded-xl bg-white border border-gray-200 text-gray-500 text-xs font-bold hover:bg-gray-50 transition-all">
          <RefreshCw className="h-3.5 w-3.5"/> Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon:Users,        bg:'bg-blue-50',    ic:'text-blue-600',    badge:'bg-blue-100 text-blue-700',    bText:'Activos',                           val:activos,        label:'Empleados Activos'   },
          { icon:TrendingDown, bg:'bg-rose-50',    ic:'text-rose-600',    badge:absenceRate>5?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700', bText:absenceRate>5?'Alto':'Normal', val:`${absenceRate}%`, label:'Ausentismo Mensual' },
          { icon:CheckCircle2, bg:'bg-emerald-50', ic:'text-emerald-600', badge:'bg-emerald-100 text-emerald-700', bText:'Este mes',                       val:`${punctuality}%`,label:'Puntualidad'        },
          { icon:Palmtree,     bg:'bg-amber-50',   ic:'text-amber-600',   badge:pendVac>0?'bg-amber-100 text-amber-700':'bg-gray-100 text-gray-500', bText:pendVac>0?'Pendientes':'Al día', val:pendVac, label:'Solicitudes Vacaciones' },
        ].map((k,i)=>(
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center',k.bg)}>
                <k.icon className={cn('h-4.5 w-4.5',k.ic)} style={{width:18,height:18}}/>
              </div>
              <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide',k.badge)}>{k.bText}</span>
            </div>
            <div>
              <p className="text-3xl font-black text-gray-900 leading-none">{k.val}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Asistencia del mes */}
      {attTotal > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label:'Presentes', val:attPresent, bg:'bg-emerald-50 border-emerald-100', iBg:'bg-emerald-100', ic:'text-emerald-600', vc:'text-emerald-700', sc:'text-emerald-400', icon:CheckCircle2 },
            { label:'Ausentes',  val:attAbsent,  bg:'bg-rose-50 border-rose-100',       iBg:'bg-rose-100',    ic:'text-rose-600',    vc:'text-rose-700',    sc:'text-rose-400',    icon:XCircle      },
            { label:'Retardos',  val:attLate,    bg:'bg-amber-50 border-amber-100',      iBg:'bg-amber-100',   ic:'text-amber-600',   vc:'text-amber-700',   sc:'text-amber-400',   icon:Clock        },
          ].map((s,i)=>(
            <div key={i} className={cn('rounded-2xl border p-4 flex items-center gap-4',s.bg)}>
              <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0',s.iBg)}>
                <s.icon className={cn('h-5 w-5',s.ic)}/>
              </div>
              <div>
                <p className={cn('text-2xl font-black leading-none',s.vc)}>{s.val}</p>
                <p className={cn('text-[9px] font-bold uppercase tracking-widest mt-1',s.sc)}>{s.label} este mes</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Por departamento */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500"/> Por Área
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{total} colaboradores · {deptData.length} áreas</p>
          </div>
          {deptData.length === 0
            ? <div className="h-40 flex items-center justify-center text-gray-300 text-sm font-bold">Sin datos</div>
            : <ResponsiveContainer width="100%" height={Math.max(160, deptData.length * 36)}>
                <BarChart data={deptData} layout="vertical" margin={{top:0,right:36,left:4,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false}/>
                  <XAxis type="number" allowDecimals={false} tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="dept" tick={{fontSize:10,fontWeight:700,fill:'#374151'}} axisLine={false} tickLine={false} width={110}/>
                  <Tooltip content={<CT/>}/>
                  <Bar dataKey="count" name="Empleados" radius={[0,6,6,0]} maxBarSize={22}>
                    {deptData.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                    <LabelList dataKey="count" position="right" style={{fontSize:10,fontWeight:900,fill:'#374151'}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Tipos de contrato */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="mb-5">
            <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-violet-500"/> Tipos de Contrato
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Distribución de la plantilla</p>
          </div>
          {Object.keys(contractMap).length === 0
            ? <div className="h-40 flex items-center justify-center text-gray-300 text-sm font-bold">Sin datos</div>
            : <div className="space-y-4">
                {Object.entries(contractMap).map(([type,count],i)=>{
                  const pct = total > 0 ? Math.round((count/total)*100) : 0;
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-gray-700">{type}</span>
                        <span className="text-sm font-black text-gray-900">{count} <span className="text-[10px] text-gray-400">({pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:PAL[i%PAL.length]}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      </div>

      {/* Empleados + Acceso rápido */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Lista empleados */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900 text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary"/> Colaboradores
            </h3>
            <Link to="/hr/employees"
              className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider flex items-center gap-1">
              Ver todos <ArrowRight className="h-3 w-3"/>
            </Link>
          </div>
          <div className="space-y-1">
            {employees.length === 0 && (
              <div className="py-10 text-center text-gray-300 text-sm font-bold">Sin empleados registrados</div>
            )}
            {employees.slice(0,8).map((emp,i)=>{
              const ini = (emp.name||'').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
              return (
                <div key={emp.id||i} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center text-white text-[10px] font-black shrink-0', AVATAR_COLS[i%AVATAR_COLS.length])}>
                    {ini||'?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-900 truncate">{emp.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 truncate">{emp.position||emp.department||'—'}</p>
                  </div>
                  <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full uppercase shrink-0',
                    emp.status==='ACTIVE'?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-500')}>
                    {emp.status==='ACTIVE'?'Activo':'Inactivo'}
                  </span>
                </div>
              );
            })}
            {employees.length > 8 && (
              <p className="text-center text-[10px] font-bold text-gray-400 pt-2">+{employees.length-8} más colaboradores</p>
            )}
          </div>
        </div>

        {/* Acceso rápido */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-black text-gray-900 text-sm flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-amber-500"/> Acceso Rápido
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:'Nómina',        sub:'Generar y aprobar',  icon:DollarSign,   to:'/hr/payroll',      bg:'bg-emerald-50 border-emerald-100 text-emerald-700' },
              { label:'Reclutamiento', sub:'Pipeline vacantes',  icon:UserPlus,     to:'/hr/recruitment',  bg:'bg-blue-50 border-blue-100 text-blue-700'          },
              { label:'Documentos',    sub:'Expedientes',        icon:FileText,     to:'/hr/documents',    bg:'bg-violet-50 border-violet-100 text-violet-700'    },
              { label:'Asistencia',    sub:'Control mensual',    icon:CalendarDays, to:'/hr/attendance',   bg:'bg-sky-50 border-sky-100 text-sky-700'             },
              { label:'Desempeño',     sub:'Evaluaciones',       icon:TrendingUp,   to:'/hr/performance',  bg:'bg-amber-50 border-amber-100 text-amber-700'       },
              { label:'Vacaciones',    sub:'Solicitudes',        icon:Palmtree,     to:'/hr/time-off',     bg:'bg-teal-50 border-teal-100 text-teal-700'          },
            ].map((item,i)=>(
              <Link key={i} to={item.to}
                className={cn('flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:shadow-sm',item.bg)}>
                <item.icon className="h-4 w-4 shrink-0"/>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide">{item.label}</p>
                  <p className="text-[9px] font-bold opacity-60 mt-0.5">{item.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
