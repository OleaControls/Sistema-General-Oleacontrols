import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList, CheckCircle2, Clock, AlertCircle, Wallet,
  TrendingUp, Users, BarChart3, Loader2, RefreshCw,
  ArrowUpRight, ArrowDownRight, Calendar, MapPin, 
  ChevronRight, Filter, Download, Zap, Shield, Camera, 
  Settings, Monitor, Smartphone
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line
} from 'recharts';
import { otService } from '@/api/otService';
import { expenseService } from '@/api/expenseService';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  PENDING:     { label: 'Pendiente',    color: '#f59e0b', bg: 'bg-amber-50',  text: 'text-amber-700', border: 'border-amber-100' },
  IN_PROGRESS: { label: 'En Proceso',   color: '#3b82f6', bg: 'bg-blue-50',   text: 'text-blue-700',  border: 'border-blue-100' },
  COMPLETED:   { label: 'Completada',   color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100' },
  VALIDATED:   { label: 'Validada',     color: '#6366f1', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100' },
  CANCELLED:   { label: 'Cancelada',    color: '#ef4444', bg: 'bg-rose-50',    text: 'text-rose-700',   border: 'border-rose-100' },
};

const SYSTEM_ICONS = {
  SDI:  { icon: Shield,   color: 'text-blue-500',   label: 'Detección Incendio' },
  SCA:  { icon: Zap,      color: 'text-amber-500',  label: 'Control Acceso' },
  CCTV: { icon: Camera,   color: 'text-indigo-500', label: 'Videovigilancia' },
  SSA:  { icon: Shield,   color: 'text-emerald-500',label: 'Seguridad' },
  RMC:  { icon: Monitor,  color: 'text-rose-500',   label: 'Monitoreo' },
  MDE:  { icon: Settings, color: 'text-gray-500',   label: 'Mantenimiento' },
};

function MetricCard({ icon: Icon, label, value, trend, trendValue, sub, colorClass, bgClass }) {
  return (
    <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className={cn('p-3.5 rounded-2xl transition-transform group-hover:scale-110 duration-300', bgClass)}>
          <Icon className={cn('h-6 w-6', colorClass)} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase",
            trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {trendValue}%
          </div>
        )}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{label}</p>
        <h4 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h4>
        {sub && <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-wider">{sub}</p>}
      </div>
    </div>
  );
}

export default function OpsMetrics() {
  const [ots, setOts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month'); // week, month, year

  const fetchData = async () => {
    setLoading(true);
    try {
      const [otsData, expData] = await Promise.all([
        otService.getOTs(),
        expenseService.getAll(),
      ]);
      setOts(Array.isArray(otsData) ? otsData : []);
      setExpenses(Array.isArray(expData) ? expData : []);
    } catch (e) {
      console.error("Error loading metrics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Cálculos Dinámicos ───────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = ots.length;
    const completed = ots.filter(o => ['COMPLETED', 'VALIDATED'].includes(o.status)).length;
    const pending = ots.filter(o => o.status === 'PENDING').length;
    const active = ots.filter(o => o.status === 'IN_PROGRESS').length;
    const efficiency = total ? Math.round((completed / total) * 100) : 0;

    const totalExp = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const approvedExp = expenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + (e.amount || 0), 0);
    const pendingExp = expenses.filter(e => e.status === 'PENDING').reduce((s, e) => s + (e.amount || 0), 0);

    // Distribución por Sistema
    const systemDist = {};
    ots.forEach(o => {
      const type = o.systemType || 'Otros';
      systemDist[type] = (systemDist[type] || 0) + 1;
    });
    const pieData = Object.entries(systemDist).map(([name, value]) => ({ name, value }));

    // Tendencia Mensual
    const monthMap = {};
    ots.forEach(o => {
      const date = new Date(o.createdAt || o.scheduledDate || Date.now());
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) {
        monthMap[key] = { 
          name: date.toLocaleDateString('es-MX', { month: 'short' }), 
          total: 0, 
          done: 0 
        };
      }
      monthMap[key].total++;
      if (['COMPLETED', 'VALIDATED'].includes(o.status)) monthMap[key].done++;
    });
    const chartData = Object.entries(monthMap)
      .sort((a,b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(entry => entry[1]);

    // Ranking de Técnicos (Productividad)
    const techMap = {};
    ots.forEach(o => {
      const tech = o.technician?.name || o.technicianName || 'Sin Asignar';
      if (!techMap[tech]) techMap[tech] = { name: tech, count: 0, completed: 0, systems: new Set() };
      techMap[tech].count++;
      if (['COMPLETED', 'VALIDATED'].includes(o.status)) techMap[tech].completed++;
      if (o.systemType) techMap[tech].systems.add(o.systemType);
    });
    const ranking = Object.values(techMap)
      .sort((a,b) => b.completed - a.completed)
      .slice(0, 5);

    // Próximas OTs (Urgentes)
    const upcoming = ots
      .filter(o => o.status === 'PENDING' || o.status === 'ASSIGNED')
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
      .slice(0, 4);

    return { total, efficiency, pending, active, totalExp, approvedExp, pendingExp, pieData, chartData, ranking, upcoming };
  }, [ots, expenses]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/10 rounded-full animate-spin" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin-slow" />
        </div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">Analizando Operaciones</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER DINÁMICO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Dashboard Operativo</span>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <h1 className="text-4xl font-black text-gray-950 tracking-tight">Desempeño General</h1>
          <p className="text-gray-400 font-medium mt-1">Monitoreo en tiempo real de cuadrillas y servicios</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
          <button 
            onClick={fetchData}
            className="p-3 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-primary"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="w-px h-6 bg-gray-100 mx-1" />
          {['week', 'month', 'year'].map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                timeframe === t ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {t === 'week' ? 'Semana' : t === 'month' ? 'Mes' : 'Año'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          icon={ClipboardList} 
          label="Servicios Totales" 
          value={metrics.total} 
          trend="up" trendValue={12}
          sub="acumulados periodo"
          colorClass="text-primary"
          bgClass="bg-primary/5"
        />
        <MetricCard 
          icon={TrendingUp} 
          label="Eficiencia Cierre" 
          value={`${metrics.efficiency}%`} 
          trend="up" trendValue={5}
          sub="tasa de éxito"
          colorClass="text-emerald-500"
          bgClass="bg-emerald-50"
        />
        <MetricCard 
          icon={Clock} 
          label="En Operación" 
          value={metrics.active} 
          sub="cuadrillas activas"
          colorClass="text-blue-500"
          bgClass="bg-blue-50"
        />
        <MetricCard 
          icon={AlertCircle} 
          label="Por Atender" 
          value={metrics.pending} 
          sub="servicios en cola"
          colorClass="text-rose-500"
          bgClass="bg-rose-50"
        />
      </div>

      {/* FINANCE ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gray-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between group shadow-2xl shadow-gray-950/20">
          <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Wallet className="w-48 h-48" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mb-4">Control de Gastos Operativos</p>
              <h3 className="text-5xl font-black tracking-tighter">
                ${metrics.totalExp.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </h3>
              <div className="flex items-center gap-4 mt-6">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">Aprobado</span>
                  <span className="text-lg font-bold text-emerald-400">${metrics.approvedExp.toLocaleString('es-MX')}</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">En Revisión</span>
                  <span className="text-lg font-bold text-amber-400">${metrics.pendingExp.toLocaleString('es-MX')}</span>
                </div>
              </div>
            </div>
            
            <button className="bg-white text-gray-950 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">
              Ver Detalle Financiero
            </button>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-gray-950 uppercase tracking-widest">Sistemas Atendidos</h3>
            <Shield className="h-4 w-4 text-gray-400" />
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={metrics.pieData} 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={8} 
                  dataKey="value"
                >
                  {metrics.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'][index % 5]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {metrics.pieData.slice(0, 4).map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444'][i] }} />
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter truncate">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* VOLUME CHART */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest">Volumen Operativo</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Carga de trabajo vs Cierre</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Asignado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cerrado</span>
              </div>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontSize: '10px', fontWeight: '900', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="done"  stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorDone)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RANKING TÉCNICOS */}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm">
          <h3 className="text-xs font-black text-gray-950 uppercase tracking-[0.2em] mb-8">Top Performance</h3>
          <div className="space-y-6">
            {metrics.ranking.map((tech, idx) => {
              const pct = Math.round((tech.completed / tech.count) * 100);
              return (
                <div key={tech.name} className="flex items-center gap-4 group">
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 transition-colors",
                    idx === 0 ? "bg-amber-100 text-amber-600" : "bg-gray-50 text-gray-400"
                  )}>
                    #{idx + 1}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-black text-gray-800 truncate uppercase tracking-tight">{tech.name}</p>
                      <p className="text-[10px] font-black text-gray-400">{pct}%</p>
                    </div>
                    <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          pct > 80 ? "bg-emerald-500" : "bg-primary"
                        )} 
                        style={{ width: `${pct}%` }} 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <button className="w-full mt-8 py-4 border-2 border-gray-50 rounded-2xl text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 hover:text-gray-600 transition-all">
            Ver Listado Completo
          </button>
        </div>
      </div>

      {/* UPCOMING OTs */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm overflow-hidden relative">
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h3 className="text-xs font-black text-gray-950 uppercase tracking-widest">Próximos Vencimientos</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Órdenes críticas por atender</p>
          </div>
          <Calendar className="h-4 w-4 text-gray-300" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {metrics.upcoming.map(ot => (
            <div key={ot.id} className="p-5 rounded-3xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:border-gray-100 transition-all group cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-white px-2 py-1 rounded-lg border border-gray-100 shadow-sm">
                  {ot.otNumber}
                </span>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  ot.priority === 'HIGH' ? "bg-rose-500 animate-pulse" : "bg-amber-400"
                )} />
              </div>
              <h5 className="text-[11px] font-black text-gray-900 line-clamp-2 uppercase leading-snug mb-3">
                {ot.title}
              </h5>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-600">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="text-[9px] font-bold truncate uppercase tracking-tighter">{ot.storeName || ot.clientName}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-600">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">
                    {new Date(ot.scheduledDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} • {ot.arrivalTime || '09:00'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {metrics.upcoming.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center opacity-40">
              <CheckCircle2 className="h-12 w-12 text-gray-300 mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">Sin pendientes críticos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
