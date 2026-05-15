import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList, CheckCircle2, Clock, Wallet, TrendingUp, RefreshCw,
  Calendar, Shield, Camera, Settings, Monitor, Award, Activity,
  AlertTriangle, XCircle, Target, CheckCheck, BarChart3, Users, Zap,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { otService } from '@/api/otService';
import { expenseService } from '@/api/expenseService';

// ── Design tokens ─────────────────────────────────────────────────────────────
const D = {
  bg:      '#f8fafc',
  surface: '#ffffff',
  surf2:   '#f1f5f9',
  border:  'rgba(0,0,0,0.07)',
  bdAcc:   'rgba(59,130,246,0.2)',
  text:    '#0f172a',
  sub:     '#64748b',
  muted:   '#94a3b8',
  blue:    '#3b82f6',
  emerald: '#10b981',
  amber:   '#f59e0b',
  red:     '#ef4444',
  purple:  '#8b5cf6',
  violet:  '#6366f1',
};

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  PENDING:     { label:'Pendiente',   color:D.amber,   bg:'rgba(245,158,11,0.1)',   bd:'rgba(245,158,11,0.2)'  },
  UNASSIGNED:  { label:'Sin Asignar', color:D.sub,     bg:'rgba(100,116,139,0.1)',  bd:'rgba(100,116,139,0.2)' },
  ASSIGNED:    { label:'Asignado',    color:D.violet,  bg:'rgba(99,102,241,0.1)',   bd:'rgba(99,102,241,0.2)'  },
  ACCEPTED:    { label:'Aceptado',    color:D.purple,  bg:'rgba(139,92,246,0.1)',   bd:'rgba(139,92,246,0.2)'  },
  IN_PROGRESS: { label:'En Proceso',  color:D.blue,    bg:'rgba(59,130,246,0.1)',   bd:'rgba(59,130,246,0.2)'  },
  COMPLETED:   { label:'Completada',  color:D.emerald, bg:'rgba(16,185,129,0.1)',   bd:'rgba(16,185,129,0.2)'  },
  VALIDATED:   { label:'Validada',    color:'#34d399', bg:'rgba(52,211,153,0.1)',   bd:'rgba(52,211,153,0.2)'  },
  CANCELLED:   { label:'Cancelada',   color:D.red,     bg:'rgba(239,68,68,0.1)',    bd:'rgba(239,68,68,0.2)'   },
};

const PRIORITY = {
  URGENT: { label:'Urgente', color:'#f43f5e', pulse:true  },
  HIGH:   { label:'Alta',    color:'#f97316', pulse:false },
  MEDIUM: { label:'Media',   color:D.amber,   pulse:false },
  LOW:    { label:'Baja',    color:D.sub,     pulse:false },
};

const SYSTEM_MAP = {
  SDI:  { label:'Det. Incendio',  icon:Shield,   color:D.blue    },
  SCA:  { label:'Ctrl. Acceso',   icon:Zap,      color:D.amber   },
  CCTV: { label:'CCTV',           icon:Camera,   color:D.violet  },
  SSA:  { label:'Seguridad',      icon:Shield,   color:D.emerald },
  RMC:  { label:'Monitoreo',      icon:Monitor,  color:'#ec4899' },
  MDE:  { label:'Mantenimiento',  icon:Settings, color:D.sub     },
};

const PIE_COLORS = [D.violet, D.emerald, D.amber, D.blue, '#ec4899', D.sub];
const PERIODS = [
  { key:'week',  label:'7 días',   days:7   },
  { key:'month', label:'30 días',  days:30  },
  { key:'year',  label:'12 meses', days:365 },
];

const fmt$ = n => `$${Number(n||0).toLocaleString('es-MX',{maximumFractionDigits:0})}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('es-MX',{day:'2-digit',month:'short'}) : '—';

// ── Custom tooltip ────────────────────────────────────────────────────────────
function DarkTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#0f172a', border:`1px solid rgba(59,130,246,0.3)`, borderRadius:12, padding:'10px 14px', minWidth:120 }}>
      <p style={{ fontSize:9, fontWeight:800, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>{label}</p>
      {payload.map((p,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:p.color, boxShadow:`0 0 6px ${p.color}80` }} />
          <span style={{ fontSize:11, fontWeight:700, color:'#e2e8f0' }}>{p.value}</span>
          <span style={{ fontSize:9, fontWeight:600, color:'#64748b' }}>{p.name}</span>
        </div>
      ))}
    </div>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KPICard({ icon:Icon, label, value, sub, color, dim }) {
  return (
    <div style={{ background:D.surface, borderRadius:16, border:`1px solid ${D.border}`, padding:'18px 20px', position:'relative', overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.35)', opacity:dim?0.45:1, transition:'opacity 0.3s' }}>
      <div style={{ position:'absolute', top:-24, right:-24, width:80, height:80, borderRadius:'50%', background:`${color}07`, pointerEvents:'none' }} />
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <div style={{ width:30, height:30, borderRadius:9, background:`${color}15`, border:`1px solid ${color}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon style={{ width:14, height:14, color }} />
        </div>
        <p style={{ fontSize:8, fontWeight:800, color:D.sub, textTransform:'uppercase', letterSpacing:'0.12em', lineHeight:1.2 }}>{label}</p>
      </div>
      <p style={{ fontSize:30, fontWeight:900, color:color===D.sub?D.text:color, letterSpacing:'-0.04em', lineHeight:1 }}>{value}</p>
      {sub && <p style={{ fontSize:8, fontWeight:700, color:D.sub, marginTop:6, textTransform:'uppercase', letterSpacing:'0.08em' }}>{sub}</p>}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function Hdr({ icon:Icon, title, sub, color=D.blue, right }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:30, height:30, borderRadius:9, background:`${color}15`, border:`1px solid ${color}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Icon style={{ width:13, height:13, color }} />
        </div>
        <div>
          <p style={{ fontSize:11, fontWeight:900, color:D.text, letterSpacing:'-0.01em' }}>{title}</p>
          {sub && <p style={{ fontSize:8, fontWeight:700, color:D.sub, textTransform:'uppercase', letterSpacing:'0.07em', marginTop:2 }}>{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OpsMetrics() {
  const [ots,        setOts]        = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [period,     setPeriod]     = useState('month');
  const [spinning,   setSpinning]   = useState(false);
  const [updated,    setUpdated]    = useState(new Date());

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setSpinning(true);
    try {
      const [otsData, expData] = await Promise.all([
        otService.getOTs(),
        expenseService.getAll(),
      ]);
      setOts(Array.isArray(otsData) ? otsData : []);
      setExpenses(Array.isArray(expData) ? expData : []);
      setUpdated(new Date());
    } catch (e) {
      console.error('OpsMetrics:', e);
    } finally {
      setLoading(false);
      setSpinning(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const m = useMemo(() => {
    const days   = PERIODS.find(p => p.key === period)?.days ?? 30;
    const cutoff = new Date(Date.now() - days * 86400000);

    const filtered = ots.filter(o => {
      const d = o.scheduledDate ? new Date(o.scheduledDate) : new Date(o.createdAt);
      return d >= cutoff;
    });

    // Status
    const sc = {};
    filtered.forEach(o => { sc[o.status] = (sc[o.status] || 0) + 1; });
    const completed = (sc.COMPLETED||0) + (sc.VALIDATED||0);
    const active    = sc.IN_PROGRESS || 0;
    const pending   = (sc.PENDING||0) + (sc.UNASSIGNED||0);
    const cancelled = sc.CANCELLED || 0;
    const total     = filtered.length;
    const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Priority
    const pc = { URGENT:0, HIGH:0, MEDIUM:0, LOW:0 };
    filtered.forEach(o => { pc[o.priority] = (pc[o.priority]||0) + 1; });

    // Systems (all OTs for stability)
    const sys = {};
    ots.forEach(o => { const k = o.systemType || 'Otros'; sys[k] = (sys[k]||0)+1; });
    const pieData = Object.entries(sys).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}));
    const totalOTs = ots.length;

    // Monthly trend (last 6 months, all OTs)
    const mm = {};
    ots.forEach(o => {
      const d = o.scheduledDate ? new Date(o.scheduledDate) : new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!mm[key]) mm[key] = { name: d.toLocaleDateString('es-MX',{month:'short'}), Asignadas:0, Completadas:0 };
      mm[key].Asignadas++;
      if (['COMPLETED','VALIDATED'].includes(o.status)) mm[key].Completadas++;
    });
    const chartData = Object.entries(mm).sort((a,b)=>a[0].localeCompare(b[0])).slice(-6).map(e=>e[1]);

    // Tech ranking
    const tm = {};
    filtered.forEach(o => {
      const id = o.technician?.id || o.technicianId;
      if (!id) return;
      if (!tm[id]) tm[id] = { name: o.technician?.name || 'Técnico', total:0, done:0, systems:new Set(), avatar:o.technician?.avatar };
      tm[id].total++;
      if (['COMPLETED','VALIDATED'].includes(o.status)) tm[id].done++;
      if (o.systemType) tm[id].systems.add(o.systemType);
    });
    const ranking = Object.values(tm)
      .sort((a,b) => b.done - a.done)
      .slice(0, 7)
      .map(t => ({ ...t, systems:[...t.systems], eff: t.total>0 ? Math.round((t.done/t.total)*100) : 0 }));

    // Expenses
    const totalExp    = expenses.reduce((s,e) => s+(e.amount||0), 0);
    const approvedExp = expenses.filter(e=>e.status==='APPROVED').reduce((s,e) => s+(e.amount||0), 0);
    const pendingExp  = expenses.filter(e=>e.status==='PENDING').reduce((s,e)  => s+(e.amount||0), 0);
    const rejectedExp = expenses.filter(e=>e.status==='REJECTED').reduce((s,e) => s+(e.amount||0), 0);

    // Upcoming
    const upcoming = ots
      .filter(o => ['PENDING','UNASSIGNED','ASSIGNED','ACCEPTED'].includes(o.status))
      .sort((a,b) => {
        const ord = {URGENT:0,HIGH:1,MEDIUM:2,LOW:3};
        const diff = (ord[a.priority]??2) - (ord[b.priority]??2);
        return diff !== 0 ? diff : new Date(a.scheduledDate||0) - new Date(b.scheduledDate||0);
      })
      .slice(0, 10);

    return { total, completed, active, pending, cancelled, efficiency, sc, pc, pieData, totalOTs, chartData, ranking, upcoming, totalExp, approvedExp, pendingExp, rejectedExp };
  }, [ots, expenses, period]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight:'60vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ position:'relative', width:48, height:48 }}>
        <div style={{ position:'absolute', inset:0, border:`3px solid ${D.blue}15`, borderRadius:'50%' }} />
        <div style={{ position:'absolute', inset:0, border:`3px solid ${D.blue}`, borderTop:'3px solid transparent', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      </div>
      <p style={{ fontSize:9, fontWeight:800, color:D.sub, textTransform:'uppercase', letterSpacing:'0.3em' }}>Cargando Dashboard</p>
    </div>
  );

  const urgentCount = m.upcoming.filter(o => o.priority === 'URGENT').length;

  return (
    <div style={{ background:D.bg, minHeight:'100%', borderRadius:20 }}>
      <style>{`
        @keyframes spin    { to { transform:rotate(360deg) } }
        @keyframes pdot    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.75)} }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0.25} }
        .ops-tr { transition:background 0.12s; }
        .ops-tr:hover { background:rgba(255,255,255,0.025) !important; }
      `}</style>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <div style={{ padding:'28px 28px 22px', borderBottom:`1px solid ${D.border}` }}>
        <div style={{ display:'flex', flexWrap:'wrap', gap:16, alignItems:'flex-end', justifyContent:'space-between' }}>
          {/* Left */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:D.emerald, boxShadow:`0 0 10px ${D.emerald}`, display:'inline-block', animation:'pdot 2s infinite' }} />
              <span style={{ fontSize:9, fontWeight:800, color:D.emerald, textTransform:'uppercase', letterSpacing:'0.15em' }}>
                En Vivo &middot; {updated.toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}
              </span>
              <span style={{ fontSize:9, fontWeight:600, color:D.muted }}>&middot; {ots.length} OTs registradas</span>
            </div>
            <h1 style={{ fontSize:36, fontWeight:900, color:'#f1f5f9', letterSpacing:'-0.05em', textTransform:'uppercase', fontStyle:'italic', lineHeight:0.88, marginBottom:10 }}>
              Métricas<br/>
              <span style={{ color:D.blue }}>Operativas</span>
            </h1>
            <p style={{ fontSize:9, fontWeight:700, color:D.sub, textTransform:'uppercase', letterSpacing:'0.12em' }}>
              OleaControls &middot; Administración General
            </p>
          </div>

          {/* Right controls */}
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {/* Quick stats pill */}
            <div style={{ display:'flex', gap:14, background:D.surface, border:`1px solid ${D.border}`, borderRadius:14, padding:'10px 16px' }}>
              {[
                [D.blue,    'Activas',    m.active],
                [D.emerald, 'Completadas',m.completed],
                [m.efficiency>=80?D.emerald:m.efficiency>=50?D.amber:D.red, 'Eficiencia', `${m.efficiency}%`],
              ].map(([c,l,v],i) => (
                <React.Fragment key={l}>
                  {i>0 && <div style={{ width:1, background:D.border }} />}
                  <div>
                    <p style={{ fontSize:8, fontWeight:800, color:D.sub, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:2 }}>{l}</p>
                    <p style={{ fontSize:16, fontWeight:900, color:c }}>{v}</p>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Period + refresh */}
            <div style={{ display:'flex', background:D.surface, border:`1px solid ${D.border}`, borderRadius:14, overflow:'hidden', alignItems:'stretch' }}>
              {PERIODS.map((p,i) => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  style={{ padding:'9px 13px', border:'none', borderRight:`1px solid ${D.border}`, cursor:'pointer', fontSize:9, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', background:period===p.key?D.blue:'transparent', color:period===p.key?'#fff':D.sub, transition:'all 0.15s' }}>
                  {p.label}
                </button>
              ))}
              <button onClick={() => fetchData(true)}
                style={{ padding:'9px 12px', border:'none', cursor:'pointer', background:'transparent', color:spinning?D.blue:D.sub, display:'flex', alignItems:'center', transition:'color 0.2s' }}>
                <RefreshCw style={{ width:13, height:13, animation:spinning?'spin 0.8s linear infinite':undefined }} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:'22px 28px', display:'flex', flexDirection:'column', gap:18 }}>

        {/* ── KPI GRID ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KPICard icon={ClipboardList} label="OTs Totales"    value={m.total}       color={D.blue}    sub="en periodo" />
          <KPICard icon={CheckCheck}    label="Completadas"    value={m.completed}   color={D.emerald} sub={`${m.efficiency}% efectividad`} />
          <KPICard icon={Activity}      label="En Proceso"     value={m.active}      color={D.blue}    sub="cuadrillas" />
          <KPICard icon={Clock}         label="Por Atender"    value={m.pending}     color={D.amber}   sub="en cola" />
          <KPICard icon={XCircle}       label="Canceladas"     value={m.cancelled}   color={D.red}     sub="en periodo" dim={m.cancelled===0} />
          <KPICard icon={Target}        label="Eficiencia"     value={`${m.efficiency}%`} color={m.efficiency>=80?D.emerald:m.efficiency>=50?D.amber:D.red} sub="tasa de cierre" />
        </div>

        {/* ── STATUS PIPELINE ───────────────────────────────────────────── */}
        <div style={{ background:D.surface, borderRadius:16, border:`1px solid ${D.border}`, padding:'20px 22px' }}>
          <Hdr icon={BarChart3} title="Flujo de Pipeline" sub="Distribución de estados en el periodo actual" color={D.blue} />
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {['PENDING','ASSIGNED','ACCEPTED','IN_PROGRESS','COMPLETED','VALIDATED','CANCELLED'].map(s => {
              const cfg   = STATUS[s];
              const count = m.sc[s] || 0;
              const pct   = m.total > 0 ? Math.round((count/m.total)*100) : 0;
              return (
                <div key={s} style={{ borderRadius:12, background:cfg.bg, border:`1px solid ${cfg.bd}`, padding:'12px 14px' }}>
                  <p style={{ fontSize:22, fontWeight:900, color:cfg.color, lineHeight:1, letterSpacing:'-0.03em' }}>{count}</p>
                  <p style={{ fontSize:7, fontWeight:800, color:cfg.color, textTransform:'uppercase', letterSpacing:'0.06em', marginTop:5, opacity:0.85, lineHeight:1.4 }}>{cfg.label}</p>
                  <div style={{ marginTop:8, height:2, background:`${cfg.color}20`, borderRadius:999 }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:cfg.color, borderRadius:999 }} />
                  </div>
                  <p style={{ fontSize:8, fontWeight:700, color:cfg.color, opacity:0.6, marginTop:3 }}>{pct}%</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CHARTS ROW ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Trend chart */}
          <div className="lg:col-span-2" style={{ background:D.surface, borderRadius:16, border:`1px solid ${D.border}`, padding:'20px 22px' }}>
            <Hdr icon={TrendingUp} title="Tendencia Mensual" sub="OTs asignadas vs completadas — últimos 6 meses" color={D.emerald}
              right={
                <div style={{ display:'flex', gap:14 }}>
                  {[[D.violet,'Asignadas'],[D.emerald,'Completadas']].map(([c,l]) => (
                    <div key={l} style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <div style={{ width:20, height:3, borderRadius:999, background:c }} />
                      <span style={{ fontSize:8, fontWeight:700, color:D.sub, textTransform:'uppercase', letterSpacing:'0.06em' }}>{l}</span>
                    </div>
                  ))}
                </div>
              }
            />
            <div style={{ height:220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={m.chartData} margin={{ top:4, right:4, bottom:0, left:0 }}>
                  <defs>
                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={D.violet}  stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={D.violet}  stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={D.emerald} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={D.emerald} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize:9, fontWeight:700, fill:D.sub }} />
                  <YAxis hide />
                  <Tooltip content={<DarkTip />} />
                  <Area type="monotone" dataKey="Asignadas"   stroke={D.violet}  strokeWidth={2.5} fillOpacity={1} fill="url(#gA)" dot={false} activeDot={{ r:4, fill:D.violet,  strokeWidth:0 }} />
                  <Area type="monotone" dataKey="Completadas" stroke={D.emerald} strokeWidth={2.5} fillOpacity={1} fill="url(#gC)" dot={false} activeDot={{ r:4, fill:D.emerald, strokeWidth:0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Systems donut */}
          <div style={{ background:D.surface, borderRadius:16, border:`1px solid ${D.border}`, padding:'20px 22px' }}>
            <Hdr icon={Shield} title="Por Sistema" sub="Distribución histórica" color={D.violet} />
            {m.pieData.length > 0 ? (
              <>
                <div style={{ height:155 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={m.pieData} innerRadius={46} outerRadius={66} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                        {m.pieData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} stroke="transparent" />)}
                      </Pie>
                      <Tooltip contentStyle={{ background:D.surface, border:`1px solid ${D.bdAcc}`, borderRadius:10, fontSize:10, color:D.text }} itemStyle={{ color:D.text }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:7, marginTop:10 }}>
                  {m.pieData.slice(0,5).map((d,i) => {
                    const c = PIE_COLORS[i%PIE_COLORS.length];
                    const pct = m.totalOTs > 0 ? Math.round((d.value/m.totalOTs)*100) : 0;
                    return (
                      <div key={d.name} style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'space-between' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
                          <div style={{ width:6, height:6, borderRadius:2, background:c, flexShrink:0 }} />
                          <span style={{ fontSize:10, fontWeight:700, color:D.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {SYSTEM_MAP[d.name]?.label || d.name}
                          </span>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                          <span style={{ fontSize:9, fontWeight:700, color:D.sub }}>{pct}%</span>
                          <span style={{ fontSize:11, fontWeight:900, color:c }}>{d.value}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ height:155, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <p style={{ fontSize:10, color:D.sub }}>Sin datos de sistemas</p>
              </div>
            )}
          </div>
        </div>

        {/* ── TECH + RIGHT ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Tech leaderboard */}
          <div style={{ background:D.surface, borderRadius:16, border:`1px solid ${D.border}`, padding:'20px 22px' }}>
            <Hdr icon={Award} title="Rendimiento de Técnicos" sub={`${m.ranking.length} técnicos activos en periodo`} color={D.amber} />
            {m.ranking.length === 0 ? (
              <div style={{ padding:'40px', textAlign:'center' }}>
                <Users style={{ width:28, height:28, color:D.muted, margin:'0 auto 8px' }} />
                <p style={{ fontSize:10, fontWeight:800, color:D.sub, textTransform:'uppercase' }}>Sin datos de técnicos</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
                {m.ranking.map((t, i) => {
                  const medal   = [D.amber, '#94a3b8', '#b45309'][i] ?? D.muted;
                  const effColor = t.eff >= 80 ? D.emerald : t.eff >= 50 ? D.amber : D.red;
                  return (
                    <div key={t.name} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:12, background:i===0?`rgba(245,158,11,0.04)`:'transparent', border:`1px solid ${i===0?'rgba(245,158,11,0.1)':D.border}` }}>
                      <div style={{ width:28, height:28, borderRadius:8, background:`${medal}15`, border:`1px solid ${medal}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        {t.avatar
                          ? <img src={t.avatar} style={{ width:24, height:24, borderRadius:6, objectFit:'cover' }} alt="" />
                          : <span style={{ fontSize:10, fontWeight:900, color:medal }}>{t.name.charAt(0)}</span>
                        }
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                          <span style={{ fontSize:11, fontWeight:800, color:D.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</span>
                          <span style={{ fontSize:11, fontWeight:900, color:effColor, flexShrink:0, marginLeft:8 }}>{t.eff}%</span>
                        </div>
                        <div style={{ height:3, background:'#f1f5f9', borderRadius:999, overflow:'hidden', marginBottom:5 }}>
                          <div style={{ height:'100%', width:`${t.eff}%`, background:effColor, borderRadius:999, boxShadow:`0 0 8px ${effColor}50`, transition:'width 1s ease' }} />
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:8, fontWeight:700, color:D.sub }}>{t.done}/{t.total} cierres</span>
                          {t.systems.length > 0 && (
                            <div style={{ display:'flex', gap:3 }}>
                              {t.systems.slice(0,3).map(s => (
                                <span key={s} style={{ fontSize:7, fontWeight:800, padding:'1px 5px', borderRadius:4, background:`${SYSTEM_MAP[s]?.color||D.sub}12`, color:SYSTEM_MAP[s]?.color||D.sub, textTransform:'uppercase' }}>{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Priority + Expenses */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Priority breakdown */}
            <div style={{ background:D.surface, borderRadius:16, border:`1px solid ${D.border}`, padding:'20px 22px' }}>
              <Hdr icon={AlertTriangle} title="Distribución por Prioridad" sub="OTs en el periodo" color="#f97316" />
              <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
                {['URGENT','HIGH','MEDIUM','LOW'].map(p => {
                  const cfg   = PRIORITY[p];
                  const count = m.pc[p] || 0;
                  const pct   = m.total > 0 ? (count / m.total) * 100 : 0;
                  return (
                    <div key={p} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{
                        width:6, height:6, borderRadius:'50%', background:cfg.color, flexShrink:0,
                        boxShadow: cfg.pulse && count>0 ? `0 0 8px ${cfg.color}` : 'none',
                        animation:  cfg.pulse && count>0 ? 'pdot 1.8s infinite' : undefined,
                      }} />
                      <span style={{ fontSize:9, fontWeight:800, color:cfg.color, textTransform:'uppercase', letterSpacing:'0.06em', width:46, flexShrink:0 }}>{cfg.label}</span>
                      <div style={{ flex:1, height:5, background:'#f1f5f9', borderRadius:999, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:cfg.color, borderRadius:999, boxShadow:pct>0?`0 0 6px ${cfg.color}50`:'none', transition:'width 0.9s ease' }} />
                      </div>
                      <span style={{ fontSize:12, fontWeight:900, color:D.text, width:22, textAlign:'right', flexShrink:0 }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expenses card */}
            <div style={{ background:'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius:16, border:`1px solid ${D.bdAcc}`, padding:'20px 22px', flex:1, position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', right:-30, bottom:-30, width:130, height:130, borderRadius:'50%', background:`${D.violet}06`, pointerEvents:'none' }} />
              <div style={{ position:'absolute', right:30, top:-40, width:80, height:80, borderRadius:'50%', background:`${D.emerald}04`, pointerEvents:'none' }} />
              <div style={{ position:'relative' }}>
                <Hdr icon={Wallet} title="Gastos Operativos" sub="Total acumulado" color={D.violet} />
                <p style={{ fontSize:28, fontWeight:900, color:'#f1f5f9', letterSpacing:'-0.04em', lineHeight:1 }}>{fmt$(m.totalExp)}</p>
                <p style={{ fontSize:8, fontWeight:700, color:D.sub, textTransform:'uppercase', letterSpacing:'0.1em', marginTop:4, marginBottom:14 }}>MXN · Todos los periodos</p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    [D.emerald, 'Aprobado',  m.approvedExp],
                    [D.amber,   'Revisión',  m.pendingExp],
                  ].map(([c,l,v]) => (
                    <div key={l} style={{ borderRadius:12, background:`${c}10`, border:`1px solid ${c}20`, padding:'10px 12px' }}>
                      <p style={{ fontSize:8, fontWeight:800, color:c, textTransform:'uppercase', letterSpacing:'0.08em' }}>{l}</p>
                      <p style={{ fontSize:14, fontWeight:900, color:`${c}cc`, marginTop:4, letterSpacing:'-0.02em' }}>{fmt$(v)}</p>
                    </div>
                  ))}
                </div>
                {m.rejectedExp > 0 && (
                  <div style={{ marginTop:8, borderRadius:10, background:`${D.red}08`, border:`1px solid ${D.red}15`, padding:'8px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:8, fontWeight:800, color:D.red, textTransform:'uppercase', letterSpacing:'0.08em' }}>Rechazado</span>
                    <span style={{ fontSize:12, fontWeight:900, color:`${D.red}cc` }}>{fmt$(m.rejectedExp)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── PENDING OTs TABLE ─────────────────────────────────────────── */}
        <div style={{ background:D.surface, borderRadius:16, border:`1px solid ${D.border}`, padding:'20px 22px' }}>
          <Hdr
            icon={Calendar}
            title="OTs Pendientes por Atender"
            sub={`${m.upcoming.length} órdenes en cola · ordenadas por prioridad`}
            color={D.red}
            right={urgentCount > 0 && (
              <span style={{ fontSize:9, fontWeight:800, padding:'4px 10px', borderRadius:999, background:`${D.red}15`, color:D.red, border:`1px solid ${D.red}25`, letterSpacing:'0.06em', textTransform:'uppercase', animation:'blink 2s infinite' }}>
                ⚡ {urgentCount} URGENTE{urgentCount>1?'S':''}
              </span>
            )}
          />

          {m.upcoming.length === 0 ? (
            <div style={{ padding:'48px', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
              <CheckCircle2 style={{ width:32, height:32, color:D.emerald, opacity:0.3 }} />
              <p style={{ fontSize:10, fontWeight:800, color:D.sub, textTransform:'uppercase', letterSpacing:'0.1em' }}>Sin pendientes críticos</p>
            </div>
          ) : (
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${D.border}` }}>
                    {['OT','Título','Cliente / Tienda','Técnico','Sistema','Prioridad','Estado','Fecha'].map(h => (
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:8, fontWeight:800, color:D.sub, textTransform:'uppercase', letterSpacing:'0.1em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {m.upcoming.map(ot => {
                    const pCfg    = PRIORITY[ot.priority] || PRIORITY.MEDIUM;
                    const sCfg    = STATUS[ot.status]     || STATUS.PENDING;
                    const sys     = SYSTEM_MAP[ot.systemType];
                    const isUrg   = ot.priority === 'URGENT';
                    return (
                      <tr key={ot.id} className="ops-tr" style={{ borderBottom:`1px solid ${D.border}`, background:isUrg?`${D.red}05`:'transparent' }}>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ fontSize:9, fontWeight:900, color:D.blue, background:`${D.blue}12`, padding:'2px 7px', borderRadius:5, whiteSpace:'nowrap' }}>
                            {ot.otNumber}
                          </span>
                        </td>
                        <td style={{ padding:'10px 12px', maxWidth:180 }}>
                          <span style={{ fontSize:11, fontWeight:800, color:D.text, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ot.title}</span>
                        </td>
                        <td style={{ padding:'10px 12px', maxWidth:140 }}>
                          <span style={{ fontSize:10, fontWeight:700, color:D.sub, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {ot.storeName || ot.clientName || '—'}
                          </span>
                        </td>
                        <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                          {ot.technician?.name
                            ? <span style={{ fontSize:10, fontWeight:700, color:D.text }}>{ot.technician.name}</span>
                            : <span style={{ fontSize:10, fontWeight:600, color:D.muted, fontStyle:'italic' }}>Sin asignar</span>
                          }
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          {sys ? (
                            <span style={{ fontSize:8, fontWeight:800, padding:'2px 7px', borderRadius:5, background:`${sys.color}12`, color:sys.color, textTransform:'uppercase', whiteSpace:'nowrap' }}>
                              {ot.systemType}
                            </span>
                          ) : <span style={{ color:D.muted, fontSize:10 }}>—</span>}
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ fontSize:8, fontWeight:800, padding:'2px 8px', borderRadius:5, background:`${pCfg.color}15`, color:pCfg.color, textTransform:'uppercase', display:'inline-flex', alignItems:'center', gap:3 }}>
                            {isUrg && <span style={{ animation:'blink 1s infinite' }}>⚡</span>}
                            {pCfg.label}
                          </span>
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ fontSize:8, fontWeight:800, padding:'2px 7px', borderRadius:5, background:sCfg.bg, color:sCfg.color, border:`1px solid ${sCfg.bd}`, textTransform:'uppercase', whiteSpace:'nowrap' }}>
                            {sCfg.label}
                          </span>
                        </td>
                        <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                          <span style={{ fontSize:10, fontWeight:700, color:D.sub }}>{fmtDate(ot.scheduledDate)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
