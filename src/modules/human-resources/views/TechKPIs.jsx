import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, Wrench, ClipboardCheck, FileSignature, Star, Timer,
  HardHat, Search, ChevronDown, ChevronUp, RefreshCw, Medal,
  CheckCircle2, XCircle, AlertCircle, Gauge, MessageSquare, MapPin,
  ChevronLeft, ChevronRight, CalendarDays,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-sky-500','bg-teal-500','bg-indigo-500'];
const avatarColor = (name='') => { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; };
const initials = (name='') => name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

const scoreColor = (s) => s==null?'text-gray-300':s>=80?'text-emerald-600':s>=60?'text-amber-500':'text-rose-500';
const scoreBg    = (s) => s==null?'bg-gray-100 text-gray-400':s>=80?'bg-emerald-100 text-emerald-700':s>=60?'bg-amber-100 text-amber-700':'bg-rose-100 text-rose-700';
const scoreBar   = (s) => s==null?'bg-gray-200':s>=80?'bg-emerald-500':s>=60?'bg-amber-400':'bg-rose-500';

const fmtPct   = (n) => n==null?'—':`${n}%`;
const fmtStars = (n) => n==null?'—':`${n}/5`;

// ── Sub-componentes ────────────────────────────────────────────────────────────
const Bar = ({ value }) => (
  <div className="flex items-center gap-2">
    <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className={cn('h-1.5 rounded-full', scoreBar(value))} style={{width:`${value ?? 0}%`}}/>
    </div>
    <span className={cn('text-[11px] font-black tabular-nums', scoreColor(value))}>{fmtPct(value)}</span>
  </div>
);

const MetaRow = ({ label, value, color='text-gray-700', sub }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
    <div className="text-right">
      <span className={cn('text-sm font-black', color)}>{value}</span>
      {sub && <p className="text-[9px] font-bold text-gray-300 leading-tight">{sub}</p>}
    </div>
  </div>
);

const KpiTile = ({ icon:Icon, label, value, top, sub }) => (
  <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
    <div className={cn('h-1', top)}/>
    <div className="px-3 py-2.5 flex items-start gap-2">
      <Icon className="h-4 w-4 text-gray-300 shrink-0 mt-0.5"/>
      <div className="min-w-0">
        <p className="text-base font-black text-gray-900 leading-none truncate">{value}</p>
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mt-1 leading-tight">{label}</p>
        {sub && <p className="text-[9px] font-bold text-gray-300 leading-tight mt-0.5">{sub}</p>}
      </div>
    </div>
  </div>
);

// ── Fila de técnico ────────────────────────────────────────────────────────────
function TechRow({ tech, expanded, onToggle }) {
  const radar = [
    { label:'Puntualidad', value: tech.subscores?.puntualidad ?? 0 },
    { label:'OT',          value: tech.subscores?.ot          ?? 0 },
    { label:'Encuestas',   value: tech.subscores?.encuestas   ?? 0 },
    { label:'Resolución',  value: tech.subscores?.resolucion  ?? 0 },
  ];

  return (
    <>
      <tr onClick={onToggle} className={cn('transition-colors cursor-pointer', expanded ? 'bg-primary/5' : 'hover:bg-gray-50/60')}>
        <td className="px-4 py-4 pl-5">
          <div className="flex items-center gap-3">
            <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0', avatarColor(tech.name))}>
              {initials(tech.name)}
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm leading-tight">{tech.name}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase truncate max-w-[160px]">{tech.position||'Técnico'}</p>
            </div>
          </div>
        </td>
        {/* Puntualidad */}
        <td className="px-4 py-4">{tech.puntualidad.daysRegistered>0 ? <Bar value={tech.puntualidad.rate}/> : <span className="text-[10px] text-gray-300 font-bold">Sin datos</span>}</td>
        {/* Herramientas + checklist */}
        <td className="px-4 py-4">{tech.ot.totalLogs>0 ? <Bar value={tech.ot.toolsRate}/> : <span className="text-[10px] text-gray-300 font-bold">—</span>}</td>
        {/* Firmas */}
        <td className="px-4 py-4">{tech.ot.totalOTs>0 ? <Bar value={tech.ot.clientSignRate}/> : <span className="text-[10px] text-gray-300 font-bold">—</span>}</td>
        {/* Encuestas */}
        <td className="px-4 py-4">
          {tech.encuestas.total>0 ? (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400"/>
              <span className="text-sm font-black text-gray-900">{tech.encuestas.avg}</span>
              <span className="text-[9px] text-gray-400 font-bold">/5 · {tech.encuestas.total}</span>
            </div>
          ) : <span className="text-[10px] text-gray-300 font-bold">Sin encuestas</span>}
        </td>
        {/* Tiempo resolución */}
        <td className="px-4 py-4">
          {tech.resolucion.avgExecHours!=null
            ? <span className="text-sm font-black text-gray-900">{tech.resolucion.avgExecHours}<span className="text-[10px] font-bold text-gray-400">h</span></span>
            : <span className="text-[10px] text-gray-300 font-bold">—</span>}
        </td>
        {/* Score */}
        <td className="px-4 py-4">
          <span className={cn('text-xs font-black px-2.5 py-1 rounded-lg', scoreBg(tech.score))}>
            {tech.score!=null ? `${tech.score}%` : 'N/D'}
          </span>
        </td>
        <td className="px-5 py-4 text-right">
          <button className="h-6 w-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center ml-auto transition-colors">
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-500"/> : <ChevronDown className="h-3.5 w-3.5 text-gray-500"/>}
          </button>
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={8} className="px-6 py-0 bg-primary/5 border-b border-primary/10">
            <div className="py-5 grid grid-cols-1 lg:grid-cols-4 gap-5">

              {/* Radar */}
              <div className="space-y-3">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Perfil de Desempeño</p>
                <ResponsiveContainer width="100%" height={190}>
                  <RadarChart data={radar}>
                    <PolarGrid stroke="#e5e7eb"/>
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: '#6b7280' }}/>
                    <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2}/>
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Puntualidad */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Clock className="h-3 w-3"/> Puntualidad</p>
                <MetaRow label="Días laborados" value={tech.puntualidad.daysRegistered}/>
                <MetaRow label="A tiempo" value={tech.puntualidad.present} color="text-emerald-600"/>
                <MetaRow label="Con retardo" value={tech.puntualidad.late} color={tech.puntualidad.late>2?'text-amber-500':'text-gray-700'}/>
                <MetaRow label="Faltas" value={tech.puntualidad.absent} color={tech.puntualidad.absent>0?'text-rose-600':'text-gray-700'}/>
                <MetaRow label="% Puntualidad" value={fmtPct(tech.puntualidad.rate)} color={scoreColor(tech.puntualidad.rate)}/>
                <MetaRow label="Min. tarde prom" value={tech.puntualidad.avgLateMin?`${tech.puntualidad.avgLateMin} min`:'—'} color={tech.puntualidad.avgLateMin>15?'text-rose-500':'text-gray-700'}/>
                <MetaRow label="Check-in registrado" value={fmtPct(tech.puntualidad.checkinRate)} sub={`${tech.puntualidad.checkins}/${tech.puntualidad.logDays} días`}/>
                <MetaRow label="Puntual (cliente)" value={fmtStars(tech.encuestas.puntualidad)} color="text-amber-600"/>
              </div>

              {/* OT: herramientas, checklist, firmas */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><ClipboardCheck className="h-3 w-3"/> Cumplimiento OT</p>
                <MetaRow label="Herramientas OK" value={fmtPct(tech.ot.toolsRate)} color={scoreColor(tech.ot.toolsRate)}/>
                <MetaRow label="EPP / Uniforme" value={fmtPct(tech.ot.eppRate)} color={scoreColor(tech.ot.eppRate)}/>
                <MetaRow label="Checklist diario" value={fmtPct(tech.ot.checklistRate)} sub={`${tech.ot.checklistDone}/${tech.ot.totalLogs} completos`} color={scoreColor(tech.ot.checklistRate)}/>
                <MetaRow label="Firma técnico" value={fmtPct(tech.ot.techSignRate)}/>
                <MetaRow label="Firma cliente" value={fmtPct(tech.ot.clientSignRate)} color={scoreColor(tech.ot.clientSignRate)}/>
                <MetaRow label="Ambas firmas" value={fmtPct(tech.ot.bothSignRate)}/>
                <MetaRow label="Panoramizaciones" value={tech.ot.panoramas}/>
                <MetaRow label="OTs cerradas" value={`${tech.ot.closedOTs} / ${tech.ot.totalOTs}`} color="text-primary"/>
              </div>

              {/* Encuestas + resolución */}
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Star className="h-3 w-3"/> Encuestas de Cliente</p>
                  <MetaRow label="Respondidas" value={tech.encuestas.total}/>
                  <MetaRow label="Promedio" value={fmtStars(tech.encuestas.avg)} color={scoreColor(tech.encuestas.avg!=null?Math.round(tech.encuestas.avg/5*100):null)}/>
                  <MetaRow label="Satisfacción" value={fmtStars(tech.encuestas.satisfaction)} color="text-amber-600"/>
                  <MetaRow label="Nivel técnico" value={fmtStars(tech.encuestas.tecnico)}/>
                  <MetaRow label="Cobertura" value={fmtPct(tech.encuestas.coverage)} sub="OTs cerradas c/ encuesta"/>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5"><Timer className="h-3 w-3"/> Tiempo de Resolución</p>
                  <MetaRow label="Ejecución prom" value={tech.resolucion.avgExecHours!=null?`${tech.resolucion.avgExecHours} h`:'—'} sub={`${tech.resolucion.samplesExec} OTs`} color="text-primary"/>
                  <MetaRow label="Asignación→cierre" value={tech.resolucion.avgResolveDays!=null?`${tech.resolucion.avgResolveDays} días`:'—'} sub={`${tech.resolucion.samplesResolve} OTs`}/>
                  <MetaRow label="OTs completadas" value={tech.resolucion.completed} color="text-emerald-600"/>
                </div>
                {tech.encuestas.recentComments.length>0 && (
                  <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><MessageSquare className="h-3 w-3"/> Comentarios recientes</p>
                    <div className="space-y-1.5">
                      {tech.encuestas.recentComments.map((c,i)=>(
                        <p key={i} className="text-[10px] text-gray-500 font-medium leading-snug bg-gray-50 rounded-lg px-2.5 py-1.5 italic">"{c.text}"</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const PERIODS = [
  { key:'day',      label:'Día' },
  { key:'quincena', label:'Quincena' },
  { key:'month',    label:'Mes' },
  { key:'year',     label:'Año' },
  { key:'all',      label:'Todo' },
];

const todayISO = () => new Date().toISOString().slice(0,10);

// ── Vista principal ─────────────────────────────────────────────────────────────
export default function TechKPIs() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [expanded, setExpanded] = useState(null);
  const [sortKey, setSortKey] = useState('score');
  const [period, setPeriod]   = useState('month');
  const [refDate, setRefDate] = useState(todayISO());

  const load = async (p = period, date = refDate) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (p !== 'all') { params.set('period', p); params.set('date', date); }
      const r = await apiFetch(`/api/tech-kpis?${params.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json = await r.json();
      setData(json && Array.isArray(json.technicians) ? json : { technicians: [], team: null });
    } catch(e) { console.error(e); setData({ technicians: [], team: null }); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(period, refDate); /* eslint-disable-next-line */ },[period, refDate]);

  // Desplaza la fecha de referencia una unidad del periodo activo
  const shift = (dir) => {
    const [Y,M,D] = refDate.split('-').map(Number);
    const dt = new Date(Date.UTC(Y, M-1, D, 12));
    if (period === 'day')        dt.setUTCDate(dt.getUTCDate() + dir);
    else if (period === 'year')  dt.setUTCFullYear(dt.getUTCFullYear() + dir);
    else if (period === 'month') dt.setUTCMonth(dt.getUTCMonth() + dir);
    else if (period === 'quincena') {
      const day = dt.getUTCDate();
      if (dir > 0) {
        if (day <= 15) dt.setUTCDate(16);
        else { dt.setUTCMonth(dt.getUTCMonth()+1); dt.setUTCDate(1); }
      } else {
        if (day <= 15) { dt.setUTCMonth(dt.getUTCMonth()-1); dt.setUTCDate(16); }
        else dt.setUTCDate(1);
      }
    }
    setRefDate(dt.toISOString().slice(0,10));
  };

  const filtered = useMemo(()=>{
    if(!data) return [];
    const q = search.toLowerCase();
    return [...data.technicians]
      .filter(t => !q || t.name.toLowerCase().includes(q) || (t.position||'').toLowerCase().includes(q))
      .sort((a,b)=>{
        if(sortKey==='score')  return (b.score??-1)-(a.score??-1);
        if(sortKey==='punct')  return (b.puntualidad.rate??-1)-(a.puntualidad.rate??-1);
        if(sortKey==='tools')  return (b.ot.toolsRate??-1)-(a.ot.toolsRate??-1);
        if(sortKey==='survey') return (b.encuestas.avg??-1)-(a.encuestas.avg??-1);
        if(sortKey==='time')   return (a.resolucion.avgExecHours??1e9)-(b.resolucion.avgExecHours??1e9);
        if(sortKey==='name')   return a.name.localeCompare(b.name);
        return 0;
      });
  },[data,search,sortKey]);

  const team = data?.team;

  const SortBtn = ({k, children}) => (
    <button onClick={()=>setSortKey(k)} className={cn('flex items-center gap-1 hover:text-primary transition-colors font-black', sortKey===k?'text-primary':'text-gray-400')}>
      {children}
    </button>
  );

  if(loading && !data) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-3">
        <div className="h-7 w-7 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"/>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Calculando KPIs de técnicos...</p>
      </div>
    </div>
  );

  return (
    <div className={cn('space-y-5 animate-in fade-in duration-300 transition-opacity', loading && 'opacity-60 pointer-events-none')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><HardHat className="h-5 w-5 text-primary"/></div>
            <h2 className="text-2xl font-black text-gray-900 leading-tight">KPIs de Técnicos</h2>
          </div>
          <p className="text-sm text-gray-500 font-medium mt-0.5">Puntualidad · Cumplimiento de OT · Encuestas de cliente · Tiempo de resolución</p>
        </div>
        <button onClick={()=>load()} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-[10px] font-black text-gray-500 uppercase tracking-widest">
          <RefreshCw className="h-4 w-4"/> Actualizar
        </button>
      </div>

      {/* Selector de periodo + navegación de fechas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-gray-100 rounded-2xl shadow-sm p-3">
        {/* Segmentado día/quincena/mes/año/todo */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {PERIODS.map(p => (
            <button key={p.key} onClick={()=>setPeriod(p.key)}
              className={cn('px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all',
                period===p.key ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Navegación de fecha (oculta cuando es "Todo") */}
        {period !== 'all' ? (
          <div className="flex items-center gap-2">
            <button onClick={()=>shift(-1)} className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <ChevronLeft className="h-4 w-4 text-gray-500"/>
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/10 min-w-[140px] justify-center">
              <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0"/>
              <span className="text-xs font-black text-gray-700 capitalize">{data?.range?.label || '—'}</span>
            </div>
            <button onClick={()=>shift(1)} className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <ChevronRight className="h-4 w-4 text-gray-500"/>
            </button>
            <input type="date" value={refDate} onChange={e=>e.target.value && setRefDate(e.target.value)}
              className="ml-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 outline-none focus:border-primary/50 transition-all"/>
            <button onClick={()=>{ setRefDate(todayISO()); }}
              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider transition-colors">
              Hoy
            </button>
          </div>
        ) : (
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-2">Historial completo</span>
        )}
      </div>

      {/* KPI strip de equipo */}
      {team && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <KpiTile icon={HardHat}       label="Técnicos"          value={team.techCount}                            top="bg-gray-400"/>
          <KpiTile icon={Clock}         label="Puntualidad Prom"  value={fmtPct(team.avgPunctuality)}               top={team.avgPunctuality>=80?'bg-emerald-500':team.avgPunctuality>=60?'bg-amber-400':'bg-rose-500'}/>
          <KpiTile icon={Wrench}        label="Herramientas OK"   value={fmtPct(team.avgToolsRate)}                 top="bg-blue-500"/>
          <KpiTile icon={FileSignature} label="Firma Cliente"     value={fmtPct(team.avgSignatureRate)}             top="bg-sky-500"/>
          <KpiTile icon={Star}          label="Encuestas"         value={team.avgSurveyScore!=null?`${team.avgSurveyScore}/5`:'N/D'} sub={`${team.totalSurveys} respuestas`} top="bg-amber-500"/>
          <KpiTile icon={Timer}         label="Resolución Prom"   value={team.avgExecHours!=null?`${team.avgExecHours}h`:'—'} sub={`${team.totalClosedOTs} OTs`} top="bg-violet-500"/>
          <KpiTile icon={Medal}         label="Mejor Técnico"     value={team.topPerformer||'—'}                    top="bg-emerald-500"/>
        </div>
      )}

      {/* Toolbar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar técnico..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium outline-none focus:border-primary/50 transition-all"/>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-4 py-3 pl-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"><SortBtn k="name">Técnico</SortBtn></th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"><SortBtn k="punct">Puntualidad</SortBtn></th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"><SortBtn k="tools">Herramientas</SortBtn></th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Firmas</th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"><SortBtn k="survey">Encuestas</SortBtn></th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"><SortBtn k="time">Resolución</SortBtn></th>
                <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest"><SortBtn k="score">Score</SortBtn></th>
                <th className="px-5 py-3 w-10"/>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-16">
                  <HardHat className="h-8 w-8 mx-auto mb-2 text-gray-200"/>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sin técnicos registrados</p>
                </td></tr>
              )}
              {filtered.map((tech) => (
                <TechRow
                  key={tech.id}
                  tech={tech}
                  expanded={expanded === tech.id}
                  onToggle={() => setExpanded(prev => prev === tech.id ? null : tech.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50/50">
            <p className="text-[10px] font-bold text-gray-400">
              {filtered.length} técnico{filtered.length!==1?'s':''} · Datos históricos completos · Generado {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}) : '—'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
