import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Users, UserPlus, FileSignature, Palmtree, AlertTriangle, FileText,
  TrendingDown, ArrowRight, PhoneCall, TrendingUp, DollarSign, Target,
  BarChart2, Building2, Mail, MessageSquare, Handshake, ClipboardList,
  Plus, Pencil, Trash2, X, Save, Database, Activity, Percent,
  CalendarDays, Star, Award, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import {
  getBitacora, saveBitacoraEntry, deleteBitacoraEntry,
  getReporte,  saveReporteEntry,  deleteReporteEntry,
  getCartera,  saveCarteraEntry,  deleteCarteraEntry,
  calcKPIs,
} from '@/api/ventasService';

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  blue:'#3b82f6', violet:'#8b5cf6', emerald:'#10b981',
  amber:'#f59e0b', rose:'#f43f5e', sky:'#0ea5e9', gray:'#6b7280', teal:'#14b8a6',
};
const PAL = Object.values(C);

// ── Tooltip ───────────────────────────────────────────────────────────────────
const CT = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xl p-3 text-xs min-w-[120px]">
      <p className="font-black text-gray-700 mb-2 border-b border-gray-50 pb-1">{label}</p>
      {payload.map((e,i)=>(
        <p key={i} style={{color:e.color}} className="font-bold leading-5">
          {e.name}: <span className="text-gray-900">
            {e.name?.includes('$') || e.name==='Venta' ? `$${Number(e.value).toLocaleString()}` :
             e.name?.includes('%') || e.name?.includes('Efic') || e.name?.includes('Tasa') ? `${e.value}%` :
             e.value}
          </span>
        </p>
      ))}
    </div>
  );
};

// ── Chart Section wrapper ─────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, icon: Icon, iconColor, children, className='' }) => (
  <div className={cn('bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4', className)}>
    <div>
      <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
        <Icon className={cn('h-4 w-4', iconColor)} /> {title}
      </h3>
      {subtitle && <p className="text-[10px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// ── KPI Card ──────────────────────────────────────────────────────────────────
const KCard = ({ label, value, sub, icon: Icon, color, sm }) => {
  const cm = {
    blue:    {i:'bg-blue-50 text-blue-600',    t:'text-blue-700',    b:'bg-blue-50 text-blue-600'},
    violet:  {i:'bg-violet-50 text-violet-600',t:'text-violet-700',  b:'bg-violet-50 text-violet-600'},
    emerald: {i:'bg-emerald-50 text-emerald-600',t:'text-emerald-700',b:'bg-emerald-50 text-emerald-600'},
    amber:   {i:'bg-amber-50 text-amber-600',  t:'text-amber-700',   b:'bg-amber-50 text-amber-600'},
    rose:    {i:'bg-rose-50 text-rose-600',    t:'text-rose-700',    b:'bg-rose-50 text-rose-600'},
    sky:     {i:'bg-sky-50 text-sky-600',      t:'text-sky-700',     b:'bg-sky-50 text-sky-600'},
    teal:    {i:'bg-teal-50 text-teal-600',    t:'text-teal-700',    b:'bg-teal-50 text-teal-600'},
    gray:    {i:'bg-gray-100 text-gray-600',   t:'text-gray-700',    b:'bg-gray-100 text-gray-600'},
  }[color] || {i:'bg-gray-100 text-gray-600', t:'text-gray-700', b:'bg-gray-100 text-gray-600'};
  return (
    <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-3">
      <div className={cn('rounded-xl flex items-center justify-center', cm.i, sm ? 'h-8 w-8' : 'h-9 w-9')}>
        <Icon className={sm ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </div>
      <div>
        <p className={cn('font-black', cm.t, sm ? 'text-xl' : 'text-2xl')}>{value}</p>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 leading-tight">{label}</p>
      </div>
      {sub && <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tight block w-fit', cm.b)}>{sub}</span>}
    </div>
  );
};

// ── Modal ─────────────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children }) => (
  <AnimatePresence>
    {open && (
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
        <motion.div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          initial={{scale:.95,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:.95,opacity:0,y:20}}>
          <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl z-10">
            <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">{title}</h3>
            <button onClick={onClose} className="h-8 w-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <X className="h-4 w-4 text-gray-600"/>
            </button>
          </div>
          <div className="p-6 space-y-4">{children}</div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const Field = ({label,children}) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);
const Inp = (p) => <input {...p} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"/>;
const Sel = ({children,...p}) => <select {...p} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">{children}</select>;
const Tog = ({label,checked,onChange}) => (
  <label className="flex items-center gap-3 cursor-pointer">
    <div onClick={onChange} className={cn('w-10 h-6 rounded-full flex items-center px-1 transition-colors', checked?'bg-primary':'bg-gray-200')}>
      <div className={cn('w-4 h-4 rounded-full bg-white shadow transition-transform', checked?'translate-x-4':'translate-x-0')}/>
    </div>
    <span className="text-sm font-bold text-gray-700">{label}</span>
  </label>
);
const NInp = ({label,value,onChange}) => (
  <Field label={label}><Inp type="number" min="0" value={value} onChange={e=>onChange(Number(e.target.value))}/></Field>
);

const DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const emptyBit = () => ({ejecutivo:'',dia:'',empresaVisitada:'',nombre:'',potencial:false,decisor:false,resultado:''});
const emptyRep = () => ({ejecutivo:'',semana:'',dia:'Lunes',llamadas:0,efec:0,visitas:0,correos:0,mensajes:0,decisorR:0,decisorFinal:0,cotizaciones:0,cierres:0,venta:0});
const emptyCar = () => ({empresa:'',mes:'',tipo:'Prospecto',fechaUltContacto:'',decisor:false,resultado:'',proxContacto:'',motivo:''});

// ═══════════════════════════════════════════════════════════════════════════════
export default function HRDashboard({ defaultTab = 'rh', onlyTabs = null }) {
  const [tab, setTab] = useState(defaultTab);
  const ALL_TABS = [['rh','Recursos Humanos'],['ventas','Ventas & CRM'],['datos','Gestionar Datos']];
  const visibleTabs = onlyTabs ? ALL_TABS.filter(([k]) => onlyTabs.includes(k)) : ALL_TABS;

  const [bitacora, setBitacora] = useState([]);
  const [reporte,  setReporte]  = useState([]);
  const [cartera,  setCartera]  = useState([]);
  const [K, setK] = useState({});

  const loadAll = useCallback(() => {
    const b = getBitacora(), r = getReporte(), c = getCartera();
    setBitacora(b); setReporte(r); setCartera(c);
    setK(calcKPIs(b, r, c));
  }, []);
  useEffect(()=>{ loadAll(); },[loadAll]);

  // Modales
  const [mBit, setMBit] = useState(false); const [fBit, setFBit] = useState(emptyBit());
  const [mRep, setMRep] = useState(false); const [fRep, setFRep] = useState(emptyRep());
  const [mCar, setMCar] = useState(false); const [fCar, setFCar] = useState(emptyCar());

  const openBit = (e=null) => { setFBit(e?{...e}:emptyBit()); setMBit(true); };
  const saveBit = () => { saveBitacoraEntry(fBit); loadAll(); setMBit(false); };
  const delBit  = (e) => { if(window.confirm(`¿Eliminar "${e.empresaVisitada}"?`)) { deleteBitacoraEntry(e.id); loadAll(); } };

  const openRep = (e=null) => { setFRep(e?{...e}:emptyRep()); setMRep(true); };
  const saveRep = () => { saveReporteEntry(fRep); loadAll(); setMRep(false); };
  const delRep  = (e) => { if(window.confirm(`¿Eliminar "${e.dia} ${e.semana}"?`)) { deleteReporteEntry(e.id); loadAll(); } };

  const openCar = (e=null) => { setFCar(e?{...e}:emptyCar()); setMCar(true); };
  const saveCar = () => { saveCarteraEntry(fCar); loadAll(); setMCar(false); };
  const delCar  = (e) => { if(window.confirm(`¿Eliminar "${e.empresa}"?`)) { deleteCarteraEntry(e.id); loadAll(); } };

  // ── Datos para gráficas ────────────────────────────────────────────────────
  const funnelAbs = [
    {etapa:'Llamadas',  valor:K.totalLlamadas||0},
    {etapa:'Efectivas', valor:K.totalEfec||0},
    {etapa:'Visitas',   valor:K.totalVisitas||0},
    {etapa:'Decisor R', valor:K.totalDecisorR||0},
    {etapa:'Decisor F', valor:K.totalDecisorF||0},
    {etapa:'Cotizac.',  valor:K.totalCotizaciones||0},
    {etapa:'Cierres',   valor:K.totalCierres||0},
  ];
  const funnelPct = [
    {etapa:'Llam→Efec', pct:K.convLlamadaEfec||0},
    {etapa:'Efec→Visit',pct:K.convEfecVisita||0},
    {etapa:'Visit→Dec', pct:K.convVisitaDecisor||0},
    {etapa:'Dec→Cot',   pct:K.convDecisorCot||0},
    {etapa:'Cot→Cierre',pct:K.convCotCierre||0},
  ];
  const canalData = [
    {canal:'Correos',    total:K.totalCorreos||0},
    {canal:'Mensajes',   total:K.totalMensajes||0},
    {canal:'Decisor R',  total:K.totalDecisorR||0},
    {canal:'Decisor F',  total:K.totalDecisorF||0},
  ];
  const bitData = [
    {tipo:'Con Potencial', val:K.conPotencial||0},
    {tipo:'Sin Potencial', val:K.sinPotencial||0},
    {tipo:'Decisor ✓',    val:K.conDecisor||0},
    {tipo:'Sin Decisor',  val:K.sinDecisor||0},
  ];
  const carteraChart = [
    {tipo:'Prospectos', val:K.prospectos||0},
    {tipo:'Clientes',   val:K.clientes||0},
    {tipo:'Con Decisor',val:K.carteraConDecisor||0},
  ];
  const ejData = (K.porEjecutivo||[]);
  const semData = (K.porSemana||[]);
  const diaData = (K.porDia||[]);

  // ── KPI Cards row 1 (ventas) ───────────────────────────────────────────────
  const kRow1 = [
    {label:'Venta Total',       value:`$${(K.totalVenta||0).toLocaleString()}`, sub:'Suma acumulada',      color:'emerald', icon:DollarSign},
    {label:'Cierres',           value:K.totalCierres||0,                        sub:`${K.tasaCierre||0}% tasa cierre`, color:'blue', icon:Handshake},
    {label:'Ticket Promedio',   value:`$${(K.ticketPromedio||0).toLocaleString()}`, sub:'Venta / cierre',  color:'violet', icon:Star},
    {label:'Cotizaciones',      value:K.totalCotizaciones||0,                   sub:'Enviadas',            color:'amber',  icon:ClipboardList},
    {label:'Total Llamadas',    value:K.totalLlamadas||0,                       sub:`${K.eficiencia||0}% efectivas`, color:'sky', icon:PhoneCall},
    {label:'Visitas en Campo',  value:K.totalVisitas||0,                        sub:'Registradas',         color:'teal',   icon:Building2},
  ];
  const kRow2 = [
    {label:'Llamadas Efectivas',value:K.totalEfec||0,                           sub:`${K.eficiencia||0}% del total`,  color:'violet', icon:Zap},
    {label:'Decisores R',       value:K.totalDecisorR||0,                       sub:'En revisión',          color:'amber',  icon:Target},
    {label:'Decisores Finales', value:K.totalDecisorF||0,                       sub:`${K.tasaContacto||0}% de llamadas`, color:'blue', icon:Award},
    {label:'Actividad Total',   value:K.actividadTotal||0,                      sub:'Todos los contactos',  color:'rose',   icon:Activity},
    {label:'Días Activos',      value:K.diasActivos||0,                         sub:`~${K.promLlamadasDia||0} llam/día`, color:'sky', icon:CalendarDays},
    {label:'Prospectos Activos',value:K.prospectos||0,                          sub:`${K.totalCartera||0} en cartera`, color:'teal', icon:Users},
  ];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">
            {onlyTabs?.includes('ventas') && !onlyTabs?.includes('rh') ? 'Métricas Ventas'
              : onlyTabs?.includes('datos') && !onlyTabs?.includes('rh') ? 'Gestión de Datos'
              : 'Métricas RH'}
          </h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            {onlyTabs?.includes('ventas') && !onlyTabs?.includes('rh') ? 'KPIs · Actividad comercial · Análisis visual'
              : onlyTabs?.includes('datos') && !onlyTabs?.includes('rh') ? 'Bitácora · Reporte diario · Cartera de clientes'
              : 'Fuerza laboral · Ventas · CRM · Gestión de datos'}
          </p>
        </div>
        {visibleTabs.length > 1 && (
          <div className="flex bg-white p-1 rounded-xl border shadow-sm">
            {visibleTabs.map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)}
                className={cn('px-4 py-2 text-xs font-black rounded-lg transition-all whitespace-nowrap',
                  tab===k?'bg-primary text-white shadow-sm':'text-gray-500 hover:text-gray-700')}>
                {k==='datos'&&<Database className="h-3 w-3 inline mr-1"/>}{l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions (solo en contexto RH) */}
      {(!onlyTabs || onlyTabs.includes('rh')) && <div className="flex flex-wrap gap-3">
        <button className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          <UserPlus className="h-4 w-4"/> Alta de Empleado
        </button>
        <button className="flex items-center gap-2 bg-white text-gray-700 border px-5 py-2.5 rounded-2xl font-bold text-sm hover:shadow-sm transition-all">
          <FileSignature className="h-4 w-4 text-primary"/> Subir Contrato
        </button>
        <button className="flex items-center gap-2 bg-white text-gray-700 border px-5 py-2.5 rounded-2xl font-bold text-sm hover:shadow-sm transition-all">
          <Palmtree className="h-4 w-4 text-emerald-500"/> Registrar Solicitud
        </button>
      </div>}

      {/* ══ TAB RH ══════════════════════════════════════════════════════════════ */}
      {tab==='rh'&&(
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {icon:Users,      bg:'bg-blue-50 text-blue-600',   badge:'bg-blue-100 text-blue-700',   bText:'+3 Este mes',  val:'142',  label:'Empleados Activos'},
              {icon:TrendingDown,bg:'bg-red-50 text-red-600',    badge:'bg-red-100 text-red-700',     bText:'Alto',         val:'4.2%', label:'Tasa de Ausentismo'},
              {icon:AlertTriangle,bg:'bg-amber-50 text-amber-600',badge:'bg-amber-100 text-amber-700',bText:'Acción Req.',  val:'12',   label:'Contratos por Vencer'},
              {icon:Palmtree,   bg:'bg-emerald-50 text-emerald-600',badge:'bg-gray-100 text-gray-600',bText:'Pendientes',  val:'5',    label:'Solicitudes Vacaciones'},
            ].map((k,i)=>(
              <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center',k.bg)}><k.icon className="h-5 w-5"/></div>
                  <span className={cn('text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider',k.badge)}>{k.bText}</span>
                </div>
                <div>
                  <p className="text-3xl font-black text-gray-900">{k.val}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{k.label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary"/> Alertas Documentales
                </h3>
                <Link to="/hr/documents" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider flex items-center gap-1">Ver Todos<ArrowRight className="h-3 w-3"/></Link>
              </div>
              <div className="space-y-3">
                {[
                  {emp:'Jorge Sánchez',       doc:'Examen Médico Anual',      expires:'En 3 días',  urgency:'high'},
                  {emp:'Ana Cruz (Ventas)',    doc:'Contrato Temporal',        expires:'En 1 semana',urgency:'medium'},
                  {emp:'Gabriel Tech',        doc:'Certificación DC-3 Alturas',expires:'Vencido',   urgency:'critical'},
                ].map((a,i)=>(
                  <div key={i} className="flex justify-between items-center p-3 rounded-2xl border bg-gray-50/50 hover:bg-white transition-colors">
                    <div><p className="text-sm font-bold text-gray-900">{a.doc}</p><p className="text-[10px] font-bold text-gray-500 uppercase">{a.emp}</p></div>
                    <span className={cn('text-[10px] font-black px-2 py-1 rounded-full uppercase',
                      a.urgency==='critical'?'bg-red-100 text-red-700':a.urgency==='high'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700')}>{a.expires}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
              <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
                <Palmtree className="h-4 w-4 text-emerald-500"/> Solicitudes Pendientes
              </h3>
              <div className="space-y-3">
                {[
                  {emp:'Luis Martínez',type:'Vacaciones (5 días)',   dates:'12 al 16 May',avatar:'L'},
                  {emp:'Sofía Reyes',  type:'Permiso Personal (1 día)',dates:'26 Feb',   avatar:'S'},
                ].map((r,i)=>(
                  <div key={i} className="flex justify-between items-center p-3 rounded-2xl border bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs">{r.avatar}</div>
                      <div><p className="text-sm font-bold text-gray-900">{r.emp}</p><p className="text-[10px] font-bold text-gray-500 uppercase">{r.type} · {r.dates}</p></div>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-[10px] font-black bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 uppercase">Rechazar</button>
                      <button className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 uppercase">Aprobar</button>
                    </div>
                  </div>
                ))}
                <div className="text-center pt-2">
                  <Link to="/hr/time-off" className="text-xs font-black text-gray-400 hover:text-primary uppercase tracking-wider">Ir a Bandeja Completa</Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ══ TAB VENTAS & CRM ════════════════════════════════════════════════════ */}
      {tab==='ventas'&&(
        <div className="space-y-10">

          {/* Fuente + acceso rápido */}
          <div className="flex flex-wrap gap-2 items-center">
            {[['Archivo 01 – Bitácora','blue'],['Archivo 02 – Reporte Diario','violet'],['Archivo 03 – Cartera','emerald']].map(([t,c])=>(
              <span key={t} className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider border bg-${c}-50 text-${c}-600 border-${c}-100`}>{t}</span>
            ))}
            <button onClick={()=>setTab('datos')} className="ml-auto flex items-center gap-1.5 text-[10px] font-black bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full uppercase hover:bg-gray-200 transition-colors">
              <Pencil className="h-3 w-3"/> Editar datos
            </button>
          </div>

          {/* ── KPI Cards – Fila 1: Resultados ── */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><DollarSign className="h-3 w-3"/> Resultados Comerciales</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {kRow1.map((k,i)=><KCard key={i} {...k} sm/>)}
            </div>
          </div>

          {/* ── KPI Cards – Fila 2: Actividad ── */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Activity className="h-3 w-3"/> Actividad & Productividad</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {kRow2.map((k,i)=><KCard key={i} {...k} sm/>)}
            </div>
          </div>

          {/* ── KPI Cards – Fila 3: Bitácora ── */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Building2 className="h-3 w-3"/> Visitas & Potencial (Bitácora)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {label:'Total Visitas',      value:K.totalBitacora||0,    sub:'Registradas en bitácora',  color:'sky',    icon:Building2},
                {label:'Con Potencial',       value:K.conPotencial||0,     sub:`${K.tasaPotencial||0}% del total`,  color:'emerald',icon:Target},
                {label:'Decisor Contactado',  value:K.conDecisor||0,       sub:`${K.tasaDecisorBit||0}% del total`, color:'blue',  icon:Handshake},
                {label:'Sin Potencial',       value:K.sinPotencial||0,     sub:'Descartar seguimiento',   color:'rose',   icon:X},
              ].map((k,i)=><KCard key={i} {...k} sm/>)}
            </div>
          </div>

          {/* ── KPI Cards – Fila 4: Cartera ── */}
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><Mail className="h-3 w-3"/> Cartera de Clientes</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {label:'Total Cartera',      value:K.totalCartera||0,        sub:'Empresas activas',        color:'blue',   icon:Building2},
                {label:'Prospectos',         value:K.prospectos||0,           sub:'Por convertir',           color:'violet', icon:Target},
                {label:'Clientes',           value:K.clientes||0,             sub:'Convertidos',             color:'emerald',icon:Star},
                {label:'Con Decisor',        value:K.carteraConDecisor||0,    sub:`${K.tasaDecCartera||0}% de cartera`, color:'amber', icon:Award},
              ].map((k,i)=><KCard key={i} {...k} sm/>)}
            </div>
          </div>

          {/* ── Separador ── */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-100"/>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Análisis Visual</span>
            <div className="h-px flex-1 bg-gray-100"/>
          </div>

          {/* ── Gráficas Row 1: Funnel ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Funnel de Ventas – Volumen" subtitle="Total acumulado por etapa" icon={TrendingUp} iconColor="text-emerald-500">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={funnelAbs} margin={{top:4,right:8,left:-16,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                  <XAxis dataKey="etapa" tick={{fontSize:9,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CT/>}/>
                  <Bar dataKey="valor" name="Total" radius={[6,6,0,0]} maxBarSize={38}>
                    {funnelAbs.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                    <LabelList dataKey="valor" position="top" style={{fontSize:9,fontWeight:700,fill:'#6b7280'}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Tasa de Conversión por Etapa" subtitle="% de conversión entre etapas del funnel" icon={Percent} iconColor="text-violet-500">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={funnelPct} margin={{top:4,right:8,left:-16,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                  <XAxis dataKey="etapa" tick={{fontSize:9,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CT/>}/>
                  <Bar dataKey="pct" name="Conversión %" radius={[6,6,0,0]} maxBarSize={38}>
                    {funnelPct.map((_,i)=><Cell key={i} fill={[C.emerald,C.blue,C.violet,C.amber,C.rose][i]}/>)}
                    <LabelList dataKey="pct" position="top" formatter={v=>`${v}%`} style={{fontSize:9,fontWeight:700,fill:'#6b7280'}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Gráficas Row 2: Actividad diaria y por día de semana ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Actividad por Registro" subtitle="Llamadas · Efectivas · Visitas por entrada" icon={BarChart2} iconColor="text-blue-500">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={reporte.map(r=>({
                  label:`${r.dia?.slice(0,3)||''} ${r.semana?.slice(5,10)||''}`.trim(),
                  'Llamadas':r.llamadas,'Efectivas':r.efec,'Visitas':r.visitas
                }))} margin={{top:4,right:8,left:-16,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                  <XAxis dataKey="label" tick={{fontSize:9,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CT/>}/><Legend wrapperStyle={{fontSize:10,fontWeight:700}}/>
                  <Bar dataKey="Llamadas"  fill={C.blue}    radius={[5,5,0,0]} maxBarSize={22}/>
                  <Bar dataKey="Efectivas" fill={C.violet}  radius={[5,5,0,0]} maxBarSize={22}/>
                  <Bar dataKey="Visitas"   fill={C.emerald} radius={[5,5,0,0]} maxBarSize={22}/>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Actividad por Día de Semana" subtitle="Patrón acumulado por día" icon={CalendarDays} iconColor="text-sky-500">
              {diaData.length===0
                ? <div className="h-48 flex items-center justify-center text-gray-300 font-bold text-sm">Sin datos suficientes</div>
                : <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={diaData} margin={{top:4,right:8,left:-16,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                      <XAxis dataKey="dia" tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<CT/>}/><Legend wrapperStyle={{fontSize:10,fontWeight:700}}/>
                      <Bar dataKey="llamadas"  name="Llamadas"  fill={C.blue}    radius={[5,5,0,0]} maxBarSize={22}/>
                      <Bar dataKey="efectivas" name="Efectivas" fill={C.violet}  radius={[5,5,0,0]} maxBarSize={22}/>
                      <Bar dataKey="visitas"   name="Visitas"   fill={C.emerald} radius={[5,5,0,0]} maxBarSize={22}/>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </ChartCard>
          </div>

          {/* ── Gráficas Row 3: Por ejecutivo ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Llamadas por Ejecutivo" subtitle="Total · Efectivas · Visitas" icon={PhoneCall} iconColor="text-violet-500">
              {ejData.length===0
                ? <div className="h-48 flex items-center justify-center text-gray-300 font-bold text-sm">Sin ejecutivos registrados</div>
                : <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={ejData} margin={{top:4,right:8,left:-16,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                      <XAxis dataKey="ejecutivo" tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<CT/>}/><Legend wrapperStyle={{fontSize:10,fontWeight:700}}/>
                      <Bar dataKey="llamadas"  name="Llamadas"  fill={C.blue}    radius={[5,5,0,0]} maxBarSize={28}/>
                      <Bar dataKey="efectivas" name="Efectivas" fill={C.violet}  radius={[5,5,0,0]} maxBarSize={28}/>
                      <Bar dataKey="visitas"   name="Visitas"   fill={C.emerald} radius={[5,5,0,0]} maxBarSize={28}/>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </ChartCard>

            <ChartCard title="Venta & Cierres por Ejecutivo" subtitle="Resultados económicos por vendedor" icon={DollarSign} iconColor="text-emerald-500">
              {ejData.length===0
                ? <div className="h-48 flex items-center justify-center text-gray-300 font-bold text-sm">Sin ejecutivos registrados</div>
                : <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={ejData} margin={{top:4,right:8,left:0,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                      <XAxis dataKey="ejecutivo" tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <YAxis yAxisId="v" tickFormatter={v=>v>=1000?`$${v/1000}k`:v} tick={{fontSize:9,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <YAxis yAxisId="c" orientation="right" allowDecimals={false} tick={{fontSize:9,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<CT/>}/><Legend wrapperStyle={{fontSize:10,fontWeight:700}}/>
                      <Bar yAxisId="v" dataKey="venta"   name="Venta"   fill={C.emerald} radius={[5,5,0,0]} maxBarSize={36}/>
                      <Bar yAxisId="c" dataKey="cierres" name="Cierres" fill={C.blue}    radius={[5,5,0,0]} maxBarSize={36}/>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </ChartCard>
          </div>

          {/* ── Gráficas Row 4: Eficiencia por ejecutivo + Canales ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartCard title="Eficiencia por Ejecutivo" subtitle="% Llamadas efectivas" icon={Zap} iconColor="text-amber-500">
              {ejData.length===0
                ? <div className="h-40 flex items-center justify-center text-gray-300 font-bold text-sm">Sin datos</div>
                : <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={ejData} margin={{top:4,right:8,left:-16,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                      <XAxis dataKey="ejecutivo" tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fontSize:9,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<CT/>}/>
                      <Bar dataKey="eficiencia" name="Eficiencia %" radius={[6,6,0,0]} maxBarSize={50}>
                        {ejData.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                        <LabelList dataKey="eficiencia" position="top" formatter={v=>`${v}%`} style={{fontSize:9,fontWeight:700,fill:'#6b7280'}}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </ChartCard>

            <ChartCard title="Canales de Contacto" subtitle="Distribución semanal" icon={MessageSquare} iconColor="text-sky-500">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={canalData} margin={{top:4,right:8,left:-16,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                  <XAxis dataKey="canal" tick={{fontSize:9,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CT/>}/>
                  <Bar dataKey="total" name="Total" radius={[6,6,0,0]} maxBarSize={40}>
                    {canalData.map((_,i)=><Cell key={i} fill={[C.sky,C.violet,C.amber,C.emerald][i]}/>)}
                    <LabelList dataKey="total" position="top" style={{fontSize:9,fontWeight:700,fill:'#6b7280'}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Potencial de Visitados" subtitle="Bitácora de salidas" icon={Target} iconColor="text-rose-500">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={bitData} margin={{top:4,right:8,left:-16,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                  <XAxis dataKey="tipo" tick={{fontSize:9,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <YAxis allowDecimals={false} tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CT/>}/>
                  <Bar dataKey="val" name="Empresas" radius={[6,6,0,0]} maxBarSize={40}>
                    {bitData.map((_,i)=><Cell key={i} fill={[C.emerald,C.rose,C.blue,C.gray][i]}/>)}
                    <LabelList dataKey="val" position="top" style={{fontSize:9,fontWeight:700,fill:'#6b7280'}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Gráficas Row 5: Tendencia semanal + Cartera ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Tendencia por Semana" subtitle="Evolución semanal de actividad" icon={TrendingUp} iconColor="text-teal-500">
              {semData.length===0
                ? <div className="h-48 flex items-center justify-center text-gray-300 font-bold text-sm">Agrega datos de múltiples semanas para ver tendencia</div>
                : <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={semData} margin={{top:4,right:8,left:-16,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                      <XAxis dataKey="semana" tick={{fontSize:9,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<CT/>}/><Legend wrapperStyle={{fontSize:10,fontWeight:700}}/>
                      <Bar dataKey="llamadas"  name="Llamadas"  fill={C.blue}    radius={[4,4,0,0]} maxBarSize={20}/>
                      <Bar dataKey="visitas"   name="Visitas"   fill={C.emerald} radius={[4,4,0,0]} maxBarSize={20}/>
                      <Bar dataKey="cierres"   name="Cierres"   fill={C.rose}    radius={[4,4,0,0]} maxBarSize={20}/>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </ChartCard>

            <ChartCard title="Cartera de Clientes" subtitle="Distribución prospecto / cliente / decisor" icon={Mail} iconColor="text-emerald-500">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={carteraChart} margin={{top:4,right:8,left:-16,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
                  <XAxis dataKey="tipo" tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <YAxis allowDecimals={false} tick={{fontSize:10,fontWeight:700,fill:'#9ca3af'}} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CT/>}/>
                  <Bar dataKey="val" name="Empresas" radius={[6,6,0,0]} maxBarSize={60}>
                    {carteraChart.map((_,i)=><Cell key={i} fill={[C.violet,C.blue,C.emerald][i]}/>)}
                    <LabelList dataKey="val" position="top" style={{fontSize:10,fontWeight:700,fill:'#6b7280'}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* ── Estadísticas rápidas textuales ── */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest mb-5 flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-gray-400"/> Resumen Ejecutivo de Indicadores
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {label:'Prom. Llamadas / Día',  val:`${K.promLlamadasDia||0}`,    unit:'llamadas',     color:'text-blue-700'},
                {label:'Prom. Visitas / Día',    val:`${K.promVisitasDia||0}`,     unit:'visitas',      color:'text-emerald-700'},
                {label:'Venta por Efectiva',     val:`$${(K.ventaEfec||0).toLocaleString()}`,unit:'/ llamada ef.',color:'text-violet-700'},
                {label:'Correos + Mensajes',     val:`${(K.totalCorreos||0)+(K.totalMensajes||0)}`,unit:'contactos digitales',color:'text-amber-700'},
                {label:'Decisores en Revisión',  val:`${K.totalDecisorR||0}`,      unit:'prospectos',   color:'text-sky-700'},
                {label:'Tasa Contacto Decisor',  val:`${K.tasaContacto||0}%`,      unit:'de llamadas',  color:'text-teal-700'},
                {label:'Tasa Potencial',          val:`${K.tasaPotencial||0}%`,    unit:'de visitados', color:'text-emerald-700'},
                {label:'Tasa Decisor Cartera',   val:`${K.tasaDecCartera||0}%`,    unit:'de cartera',   color:'text-rose-700'},
              ].map((s,i)=>(
                <div key={i} className="p-4 rounded-2xl bg-gray-50 space-y-1">
                  <p className={cn('text-xl font-black', s.color)}>{s.val}</p>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{s.label}</p>
                  <p className="text-[9px] font-bold text-gray-300 uppercase">{s.unit}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ══ TAB GESTIONAR DATOS ══════════════════════════════════════════════════ */}
      {tab==='datos'&&(
        <div className="space-y-10">

          {/* Bitácora */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-900 text-base flex items-center gap-2"><Building2 className="h-5 w-5 text-sky-500"/> Bitácora de Visitas</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Archivo 01 · {bitacora.length} registros</p>
              </div>
              <button onClick={()=>openBit()} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-primary/90 transition-all">
                <Plus className="h-3.5 w-3.5"/> Nueva Visita
              </button>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {bitacora.length===0
                ? <div className="p-12 text-center text-gray-300 font-bold text-sm">Sin registros. Agrega la primera visita.</div>
                : <div className="overflow-x-auto"><table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>{['Ejecutivo','Día','Empresa','Contacto','Potencial','Decisor','Resultado',''].map(h=>(
                        <th key={h} className="text-left py-3 px-4 font-black text-gray-400 uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {bitacora.map(e=>(
                        <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-black text-gray-800">{e.ejecutivo}</td>
                          <td className="py-3 px-4 font-bold text-gray-500 whitespace-nowrap">{e.dia}</td>
                          <td className="py-3 px-4 font-bold text-gray-800">{e.empresaVisitada}</td>
                          <td className="py-3 px-4 font-bold text-gray-600">{e.nombre}</td>
                          <td className="py-3 px-4">
                            <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full uppercase',e.potencial?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-700')}>
                              {e.potencial?'Sí':'No'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full uppercase',e.decisor?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-500')}>
                              {e.decisor?'Sí':'No'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-600 max-w-xs truncate">{e.resultado}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              <button onClick={()=>openBit(e)} className="h-7 w-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"><Pencil className="h-3 w-3 text-blue-600"/></button>
                              <button onClick={()=>delBit(e)}  className="h-7 w-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"><Trash2 className="h-3 w-3 text-red-600"/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
              }
            </div>
          </section>

          {/* Reporte Diario */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-900 text-base flex items-center gap-2"><ClipboardList className="h-5 w-5 text-violet-500"/> Reporte Diario del Vendedor</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Archivo 02 · {reporte.length} registros</p>
              </div>
              <button onClick={()=>openRep()} className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-violet-700 transition-all">
                <Plus className="h-3.5 w-3.5"/> Nuevo Registro
              </button>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {reporte.length===0
                ? <div className="p-12 text-center text-gray-300 font-bold text-sm">Sin registros.</div>
                : <div className="overflow-x-auto"><table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>{['Ejecutivo','Semana','Día','Llam.','Efec.','Visit.','Correos','Msg','Dec.R','Dec.F','Cotizac.','Cierres','Venta',''].map(h=>(
                        <th key={h} className="text-left py-3 px-3 font-black text-gray-400 uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {reporte.map(r=>(
                        <tr key={r.id} className={cn('border-t border-gray-50 hover:bg-gray-50/50 transition-colors',r.venta>0&&'bg-emerald-50/20')}>
                          <td className="py-2.5 px-3 font-black text-gray-800">{r.ejecutivo}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-400 whitespace-nowrap">{r.semana}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-800 whitespace-nowrap">{r.dia}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-700">{r.llamadas}</td>
                          <td className="py-2.5 px-3 font-bold text-violet-600">{r.efec}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-700">{r.visitas}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-700">{r.correos}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-700">{r.mensajes}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-700">{r.decisorR}</td>
                          <td className="py-2.5 px-3 font-bold text-gray-700">{r.decisorFinal}</td>
                          <td className="py-2.5 px-3 font-bold text-amber-600">{r.cotizaciones}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600">{r.cierres}</td>
                          <td className="py-2.5 px-3 font-black text-emerald-700">{r.venta?`$${r.venta.toLocaleString()}`:'—'}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex gap-1">
                              <button onClick={()=>openRep(r)} className="h-7 w-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center"><Pencil className="h-3 w-3 text-blue-600"/></button>
                              <button onClick={()=>delRep(r)}  className="h-7 w-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center"><Trash2 className="h-3 w-3 text-red-600"/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
              }
            </div>
          </section>

          {/* Cartera */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-900 text-base flex items-center gap-2"><Mail className="h-5 w-5 text-emerald-500"/> Seguimiento Cartera de Clientes</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Archivo 03 · {cartera.length} registros</p>
              </div>
              <button onClick={()=>openCar()} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all">
                <Plus className="h-3.5 w-3.5"/> Nuevo Registro
              </button>
            </div>
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              {cartera.length===0
                ? <div className="p-12 text-center text-gray-300 font-bold text-sm">Sin registros de cartera.</div>
                : <div className="overflow-x-auto"><table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>{['Empresa','Mes','Tipo','Últ. Contacto','Decisor','Resultado','Próx. Contacto','Motivo',''].map(h=>(
                        <th key={h} className="text-left py-3 px-4 font-black text-gray-400 uppercase tracking-wider text-[9px] whitespace-nowrap">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {cartera.map(c=>(
                        <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 font-black text-gray-800">{c.empresa}</td>
                          <td className="py-3 px-4 font-bold text-gray-500">{c.mes}</td>
                          <td className="py-3 px-4">
                            <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full uppercase',c.tipo==='Prospecto'?'bg-violet-100 text-violet-700':'bg-blue-100 text-blue-700')}>{c.tipo}</span>
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-600 whitespace-nowrap">{c.fechaUltContacto}</td>
                          <td className="py-3 px-4">
                            <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full uppercase',c.decisor?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-500')}>{c.decisor?'Sí':'No'}</span>
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-600 max-w-[160px] truncate">{c.resultado}</td>
                          <td className="py-3 px-4 font-bold text-gray-600 whitespace-nowrap">{c.proxContacto}</td>
                          <td className="py-3 px-4 font-medium text-gray-500 max-w-[140px] truncate">{c.motivo}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              <button onClick={()=>openCar(c)} className="h-7 w-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center"><Pencil className="h-3 w-3 text-blue-600"/></button>
                              <button onClick={()=>delCar(c)}  className="h-7 w-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center"><Trash2 className="h-3 w-3 text-red-600"/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
              }
            </div>
          </section>

        </div>
      )}

      {/* ══ MODAL: Bitácora ══════════════════════════════════════════════════════ */}
      <Modal open={mBit} onClose={()=>setMBit(false)} title={fBit.id?'Editar Visita':'Nueva Visita'}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ejecutivo"><Inp value={fBit.ejecutivo} onChange={e=>setFBit(p=>({...p,ejecutivo:e.target.value}))} placeholder="Nombre"/></Field>
          <Field label="Fecha"><Inp type="date" value={fBit.dia} onChange={e=>setFBit(p=>({...p,dia:e.target.value}))}/></Field>
        </div>
        <Field label="Empresa Visitada"><Inp value={fBit.empresaVisitada} onChange={e=>setFBit(p=>({...p,empresaVisitada:e.target.value}))} placeholder="Nombre de la empresa"/></Field>
        <Field label="Nombre del Contacto"><Inp value={fBit.nombre} onChange={e=>setFBit(p=>({...p,nombre:e.target.value}))} placeholder="Nombre completo"/></Field>
        <div className="grid grid-cols-2 gap-4 py-2">
          <Tog label="Con Potencial"      checked={fBit.potencial} onChange={()=>setFBit(p=>({...p,potencial:!p.potencial}))}/>
          <Tog label="Decisor Contactado" checked={fBit.decisor}   onChange={()=>setFBit(p=>({...p,decisor:!p.decisor}))}/>
        </div>
        <Field label="Resultado de la visita">
          <textarea value={fBit.resultado} onChange={e=>setFBit(p=>({...p,resultado:e.target.value}))} rows={3} placeholder="Describe el resultado..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"/>
        </Field>
        <button onClick={saveBit} className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-xl font-black text-sm hover:bg-primary/90 transition-all">
          <Save className="h-4 w-4"/> {fBit.id?'Guardar Cambios':'Agregar Visita'}
        </button>
      </Modal>

      {/* ══ MODAL: Reporte Diario ══════════════════════════════════════════════ */}
      <Modal open={mRep} onClose={()=>setMRep(false)} title={fRep.id?'Editar Registro':'Nuevo Registro Diario'}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ejecutivo"><Inp value={fRep.ejecutivo} onChange={e=>setFRep(p=>({...p,ejecutivo:e.target.value}))} placeholder="Nombre"/></Field>
          <Field label="Semana (lunes)"><Inp type="date" value={fRep.semana} onChange={e=>setFRep(p=>({...p,semana:e.target.value}))}/></Field>
        </div>
        <Field label="Día">
          <Sel value={fRep.dia} onChange={e=>setFRep(p=>({...p,dia:e.target.value}))}>
            {DIAS.map(d=><option key={d}>{d}</option>)}
          </Sel>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <NInp label="Llamadas"    value={fRep.llamadas}     onChange={v=>setFRep(p=>({...p,llamadas:v}))}/>
          <NInp label="Efectivas"   value={fRep.efec}         onChange={v=>setFRep(p=>({...p,efec:v}))}/>
          <NInp label="Visitas"     value={fRep.visitas}      onChange={v=>setFRep(p=>({...p,visitas:v}))}/>
          <NInp label="Correos"     value={fRep.correos}      onChange={v=>setFRep(p=>({...p,correos:v}))}/>
          <NInp label="Mensajes"    value={fRep.mensajes}     onChange={v=>setFRep(p=>({...p,mensajes:v}))}/>
          <NInp label="Decisor R"   value={fRep.decisorR}     onChange={v=>setFRep(p=>({...p,decisorR:v}))}/>
          <NInp label="Decisor F"   value={fRep.decisorFinal} onChange={v=>setFRep(p=>({...p,decisorFinal:v}))}/>
          <NInp label="Cotizaciones" value={fRep.cotizaciones} onChange={v=>setFRep(p=>({...p,cotizaciones:v}))}/>
          <NInp label="Cierres"     value={fRep.cierres}      onChange={v=>setFRep(p=>({...p,cierres:v}))}/>
        </div>
        <Field label="Venta ($)"><Inp type="number" min="0" value={fRep.venta} onChange={e=>setFRep(p=>({...p,venta:Number(e.target.value)}))} placeholder="0"/></Field>
        <div className="bg-emerald-50 rounded-2xl p-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm font-black text-emerald-700">{fRep.llamadas?Math.round((fRep.efec/fRep.llamadas)*100):0}%</p>
            <p className="text-[9px] font-bold text-emerald-500 uppercase">Eficiencia</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-emerald-700">{fRep.cierres}</p>
            <p className="text-[9px] font-bold text-emerald-500 uppercase">Cierres</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-emerald-700">${(fRep.venta||0).toLocaleString()}</p>
            <p className="text-[9px] font-bold text-emerald-500 uppercase">Venta</p>
          </div>
        </div>
        <button onClick={saveRep} className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white px-4 py-3 rounded-xl font-black text-sm hover:bg-violet-700 transition-all">
          <Save className="h-4 w-4"/> {fRep.id?'Guardar Cambios':'Agregar Registro'}
        </button>
      </Modal>

      {/* ══ MODAL: Cartera ════════════════════════════════════════════════════ */}
      <Modal open={mCar} onClose={()=>setMCar(false)} title={fCar.id?'Editar Registro':'Nuevo Cliente / Prospecto'}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Empresa"><Inp value={fCar.empresa} onChange={e=>setFCar(p=>({...p,empresa:e.target.value}))} placeholder="Nombre empresa"/></Field>
          <Field label="Mes"><Inp type="month" value={fCar.mes} onChange={e=>setFCar(p=>({...p,mes:e.target.value}))}/></Field>
        </div>
        <Field label="Tipo">
          <Sel value={fCar.tipo} onChange={e=>setFCar(p=>({...p,tipo:e.target.value}))}>
            <option>Prospecto</option><option>Cliente</option>
          </Sel>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Último Contacto"><Inp type="date" value={fCar.fechaUltContacto} onChange={e=>setFCar(p=>({...p,fechaUltContacto:e.target.value}))}/></Field>
          <Field label="Próximo Contacto"><Inp type="date" value={fCar.proxContacto} onChange={e=>setFCar(p=>({...p,proxContacto:e.target.value}))}/></Field>
        </div>
        <div className="py-1"><Tog label="Decisor Contactado" checked={fCar.decisor} onChange={()=>setFCar(p=>({...p,decisor:!p.decisor}))}/></div>
        <Field label="Resultado del Contacto"><Inp value={fCar.resultado} onChange={e=>setFCar(p=>({...p,resultado:e.target.value}))} placeholder="¿Qué pasó?"/></Field>
        <Field label="Motivo del Próximo Contacto"><Inp value={fCar.motivo} onChange={e=>setFCar(p=>({...p,motivo:e.target.value}))} placeholder="¿Para qué se contactará?"/></Field>
        <button onClick={saveCar} className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl font-black text-sm hover:bg-emerald-700 transition-all">
          <Save className="h-4 w-4"/> {fCar.id?'Guardar Cambios':'Agregar Registro'}
        </button>
      </Modal>

    </div>
  );
}
