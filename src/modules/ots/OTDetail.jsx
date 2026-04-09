import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ClipboardList, MapPin, Clock, User, CheckCircle2, Receipt, FileText, ChevronLeft,
  X, Send, ArrowRight, Store, Map as MapIcon, AlertTriangle, Wallet, Plus, Coins,
  Phone, Mail, Info, Users, Hash, Calendar, Zap, Activity, Timer, ArrowUpCircle, ArrowDownCircle,
  MessageCircle, Pause, Play, Flag, Check, BarChart2, Coffee
} from 'lucide-react';
import { otService } from '@/api/otService';
import { expenseService } from '@/api/expenseService';
import { useAuth, ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';
import NewExpenseForm from '../expenses/components/NewExpenseForm';

// ── Jornada helpers ──────────────────────────────────────────────────────────
const parseJornadas = (raw) => {
  if (!raw) return [];
  try { return Array.isArray(raw) ? raw : JSON.parse(raw); }
  catch { return []; }
};

const computeTotalMs = (jornadas) =>
  jornadas.reduce((total, j) => {
    if (j.startedAt && j.endedAt) return total + (new Date(j.endedAt) - new Date(j.startedAt));
    if (j.startedAt && j.status === 'ACTIVE') return total + (Date.now() - new Date(j.startedAt));
    return total;
  }, 0);

const fmtDur = (ms) => {
  if (!ms || ms < 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-MX', { day:'numeric', month:'short' });

// ── Jornadas historial sub-component ─────────────────────────────────────────
const JornadasHistorial = ({ jornadas }) => (
  <div className="bg-white border border-gray-100 rounded-[1.75rem] overflow-hidden shadow-sm">
    <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/40 flex items-center justify-between">
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Historial de Jornadas</p>
      <p className="text-[9px] font-mono text-gray-400">{jornadas.length} sesión{jornadas.length !== 1 ? 'es' : ''}</p>
    </div>
    <div className="divide-y divide-gray-50">
      {jornadas.map((j, i) => {
        const dur = j.startedAt && j.endedAt ? new Date(j.endedAt) - new Date(j.startedAt) : null;
        const isActive = j.status === 'ACTIVE';
        return (
          <div key={j.id || i} className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-black font-mono shrink-0",
                isActive ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-500"
              )}>
                {i + 1}
              </div>
              <div>
                <p className="text-xs font-black text-gray-700">
                  {fmtDate(j.startedAt)} · {fmtTime(j.startedAt)}
                  {j.endedAt && <span className="text-gray-400"> → {fmtTime(j.endedAt)}</span>}
                </p>
                {j.pauseReason === 'AUTO_MIDNIGHT' && (
                  <p className="text-[9px] text-amber-500 font-bold mt-0.5">⏱ Pausa automática a medianoche</p>
                )}
              </div>
            </div>
            <div className="text-right">
              {isActive
                ? <span className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse inline-block" /> En Curso</span>
                : dur
                  ? <p className="text-sm font-black font-mono text-gray-900">{fmtDur(dur)}</p>
                  : null
              }
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const TABS = [
  { id: 'INFO', label: 'Hoja de Servicio', icon: FileText },
  { id: 'ACTIONS', label: 'Ejecución', icon: Activity },
  { id: 'EXPENSES', label: 'Viáticos', icon: Receipt },
];

export default function OTDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ot, setOt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('INFO');
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isFundsModalOpen, setIsFundsModalOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [additionalFunds, setAdditionalFunds] = useState(0);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [jornadas, setJornadas] = useState([]);
  
  const techName = ot?.leadTechName || ot?.technician?.name || ot?.technicianName || null;
  const isLead = ot?.technicianId === user?.id || ot?.leadTechId === user?.id;
  const isSupport = (ot?.supportTechs && ot.supportTechs.some(st => st.id === user?.id)) ||
                    (ot?.assistantTechs && ot.assistantTechs.some(at => at.id === user?.id));
  const isInvolved = isLead || isSupport;
  const userRoles = user?.roles || [user?.role];
  const isSupervisor = userRoles.includes(ROLES.OPS) || userRoles.includes(ROLES.ADMIN);
  const isCompleted = ot?.status === 'COMPLETED';

  const [finishData, setFinishData] = useState({
    report: '',
    signature: null
  });

  useEffect(() => { loadOT(); }, [id]);

  // Init jornadas from OT (with legacy fallback)
  useEffect(() => {
    if (!ot) return;
    const parsed = parseJornadas(ot.jornadas);
    if (parsed.length === 0 && ot.status === 'IN_PROGRESS' && ot.startedAt) {
      setJornadas([{ id: 'legacy', startedAt: ot.startedAt, endedAt: null, techId: ot.technicianId, status: 'ACTIVE' }]);
    } else {
      setJornadas(parsed);
    }
  }, [ot]);

  // Live timer for active jornada
  useEffect(() => {
    const activeJ = jornadas.find(j => j.status === 'ACTIVE');
    if (!activeJ) return;
    const interval = setInterval(() => {
      const diff = Date.now() - new Date(activeJ.startedAt).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsedTime(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [jornadas]);

  // Auto-pause at midnight
  useEffect(() => {
    const activeJ = jornadas.find(j => j.status === 'ACTIVE');
    if (!activeJ) return;
    const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
    const msTo = midnight.getTime() - Date.now();
    const timer = setTimeout(async () => {
      const pauseAt = new Date(midnight.getTime() - 1).toISOString();
      const updated = jornadas.map(j =>
        j.status === 'ACTIVE' ? { ...j, endedAt: pauseAt, status: 'PAUSED', pauseReason: 'AUTO_MIDNIGHT' } : j
      );
      setJornadas(updated);
      try { await otService.updateOT(id, { jornadas: updated }); } catch (e) { console.error('Auto-pause midnight:', e); }
    }, msTo);
    return () => clearTimeout(timer);
  }, [jornadas, id]);

  const loadOT = async () => {
    setLoading(true);
    try {
        const data = await otService.getOTDetail(id);
        setOt(data);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  // Cálculos Financieros
  const financialSummary = () => {
      if (!ot || !ot.expenses) return { totalAuthorized: 0, spent: 0, balance: 0 };
      
      const totalAuthorized = ot.assignedFunds || 0;
      // Solo descontamos los aprobados y los que están pendientes (bloquean fondo)
      // Los RECHAZADOS no se cuentan, lo que efectivamente "devuelve" el dinero al balance
      const spent = ot.expenses
        .filter(e => e.status === 'APPROVED' || e.status === 'PENDING')
        .reduce((sum, e) => sum + e.amount, 0);
        
      return {
          totalAuthorized,
          spent,
          balance: totalAuthorized - spent
      };
  };

  const { totalAuthorized, spent, balance } = financialSummary();

  const generateFeedbackLink = (type) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/feedback/${type}/${id}`;
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copiado`);
  };

  const shareByWhatsApp = (link, message) => {
    const url = `https://wa.me/?text=${encodeURIComponent(message + ": " + link)}`;
    window.open(url, '_blank');
  };

  const handleStatusUpdate = async (newStatus) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
        const update = { status: newStatus };
        if (newStatus === 'IN_PROGRESS') update.startedAt = new Date().toISOString();
        if (newStatus === 'COMPLETED') {
            update.finishedAt = new Date().toISOString();
            update.report = finishData.report;
            update.signature = finishData.signature;
        }
        await otService.updateOT(id, update);
        
        if (newStatus === 'COMPLETED') {
            setIsFinishModalOpen(false);
            // Redirigir al listado después de cerrar para evitar duplicados/confusión
            navigate('/ots');
        } else {
            await loadOT();
        }
    } catch (err) {
        alert("Error al actualizar estado: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  // ── Jornada handlers ──────────────────────────────────────────────────────
  const handleAcceptOT = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await otService.updateOT(id, { status: 'ACCEPTED' });
      await loadOT();
    } catch (err) { alert('Error al aceptar: ' + err.message); }
    finally { setIsSaving(false); }
  };

  const handleStartJornada = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const newJ = {
        id: Date.now().toString(),
        startedAt: new Date().toISOString(),
        endedAt: null,
        techId: user.id,
        status: 'ACTIVE',
      };
      const updated = [...jornadas, newJ];
      setJornadas(updated);
      await otService.updateOT(id, {
        status: 'IN_PROGRESS',
        startedAt: ot.startedAt || new Date().toISOString(),
        jornadas: updated,
      });
      await loadOT();
    } catch (err) { alert('Error al iniciar jornada: ' + err.message); }
    finally { setIsSaving(false); }
  };

  const handlePauseJornada = async (reason = null) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const updated = jornadas.map(j =>
        j.status === 'ACTIVE' ? { ...j, endedAt: now, status: 'PAUSED', pauseReason: reason } : j
      );
      setJornadas(updated);
      await otService.updateOT(id, { jornadas: updated });
      await loadOT();
    } catch (err) { alert('Error al pausar: ' + err.message); }
    finally { setIsSaving(false); }
  };

  const handleAddFunds = async () => {
      if (isSaving) return;
      setIsSaving(true);
      try {
          await otService.addSupplementalFunds(id, parseFloat(additionalFunds));
          setIsFundsModalOpen(false);
          setAdditionalFunds(0);
          await loadOT();
      } catch (err) {
          alert("Error al añadir fondos: " + err.message);
      } finally {
          setIsSaving(false);
      }
  };

  const handleSaveExpense = async (formData) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
        await expenseService.save({
            ...formData,
            userId: user.id,
            otId: ot.otNumber 
        });
        await loadOT();
    } catch (error) {
        alert("Error al guardar gasto: " + error.message);
    } finally {
        setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto space-y-4 pb-24 animate-pulse pt-4">
      <div className="bg-white border border-gray-100 rounded-[2rem] h-48" />
      <div className="bg-gray-950 rounded-2xl h-16" />
      <div className="bg-white border border-gray-100 rounded-xl h-12" />
      <div className="bg-white border border-gray-100 rounded-[2rem] h-64" />
    </div>
  );
  if (!ot) return <div className="p-10 text-center font-bold text-red-400 italic">Orden no encontrada.</div>;

  // ── Meta helpers ─────────────────────────────────────────────────────────
  const STATUS_MAP = {
    PENDING:     { label: 'Sin Asignar',  color: 'text-gray-500',   bg: 'bg-gray-100 border-gray-200',    dot: 'bg-gray-400' },
    UNASSIGNED:  { label: 'Sin Asignar',  color: 'text-gray-500',   bg: 'bg-gray-100 border-gray-200',    dot: 'bg-gray-400' },
    ASSIGNED:    { label: 'Asignada',        color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100', dot: 'bg-indigo-500' },
    ACCEPTED:    { label: 'Orden Aceptada', color: 'text-sky-700',    bg: 'bg-sky-50 border-sky-100',       dot: 'bg-sky-500' },
    IN_PROGRESS: { label: 'En Proceso',     color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-100',   dot: 'bg-amber-500' },
    COMPLETED:   { label: 'Completada',   color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-100',dot: 'bg-emerald-500' },
    VALIDATED:   { label: 'Validada',     color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100',     dot: 'bg-blue-500' },
  };
  const PRIORITY_MAP = {
    URGENT: { label: 'Urgente', bar: 'bg-red-500',    text: 'text-red-600',    badge: 'bg-red-50 border-red-100 text-red-600' },
    HIGH:   { label: 'Alta',    bar: 'bg-orange-400', text: 'text-orange-600', badge: 'bg-orange-50 border-orange-100 text-orange-600' },
    MEDIUM: { label: 'Media',   bar: 'bg-blue-400',   text: 'text-blue-600',   badge: 'bg-blue-50 border-blue-100 text-blue-600' },
    LOW:    { label: 'Baja',    bar: 'bg-gray-300',   text: 'text-gray-500',   badge: 'bg-gray-50 border-gray-200 text-gray-500' },
  };
  const sm = STATUS_MAP[ot.status] || STATUS_MAP.PENDING;
  const pm = PRIORITY_MAP[ot.priority] || PRIORITY_MAP.MEDIUM;
  const activeJornada = jornadas.find(j => j.status === 'ACTIVE');

  return (
    <div className="max-w-5xl mx-auto pb-28 animate-in fade-in duration-500">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 md:px-0">
          {/* Priority top bar */}
          <div className={cn("h-0.5 w-full", pm.bar)} />

          <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left */}
            <div className="flex items-start gap-4 min-w-0">
              <button
                onClick={() => navigate(-1)}
                className="cursor-pointer shrink-0 h-9 w-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors mt-0.5"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className="font-mono font-black text-[11px] bg-gray-950 text-white px-2.5 py-1 rounded-lg tracking-wider">{ot.otNumber}</span>
                  <span className={cn("text-[9px] font-black px-2 py-1 rounded-md border uppercase tracking-widest", sm.bg, sm.color)}>
                    <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1.5", sm.dot, ot.status === 'IN_PROGRESS' ? 'animate-pulse' : '')} />
                    {sm.label}
                  </span>
                  <span className={cn("text-[9px] font-black px-2 py-1 rounded-md border uppercase tracking-widest", pm.badge)}>{pm.label}</span>
                  <span className={cn(
                    "text-[9px] font-black px-2 py-1 rounded-md border uppercase tracking-widest",
                    isLead ? "bg-amber-50 text-amber-700 border-amber-100" :
                    isSupport ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                    isSupervisor ? "bg-violet-50 text-violet-700 border-violet-100" : "bg-gray-50 text-gray-400 border-gray-100"
                  )}>
                    {isLead ? 'Técnico Líder' : isSupport ? 'Apoyo' : isSupervisor ? 'Supervisor' : 'Consulta'}
                  </span>
                </div>
                <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-tight truncate">{ot.title}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="h-5 w-5 rounded-full bg-gray-100 flex items-center justify-center">
                      <User className="h-3 w-3 text-gray-500" />
                    </div>
                    <span className="text-xs font-bold text-gray-500">{techName || 'Sin asignar'}</span>
                  </div>
                  <span className="text-gray-200">·</span>
                  <span className="text-[10px] font-mono text-gray-400">{new Date(ot.updatedAt).toLocaleDateString('es-MX')}</span>
                  {activeJornada && (
                    <>
                      <span className="text-gray-200">·</span>
                      <span className="text-[10px] font-mono text-amber-500 font-black">{elapsedTime}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: tabs inline on desktop */}
            <div className="shrink-0 flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100">
              {TABS.filter(tab => tab.id === 'INFO' || isInvolved || isSupervisor).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "cursor-pointer flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === tab.id
                      ? "bg-gray-950 text-white shadow-sm"
                      : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── FINANCIAL BAR ───────────────────────────────────────────────────── */}
      <div className="mt-4 px-4 md:px-0">
        <div className="bg-gray-950 rounded-2xl overflow-hidden">
          <div className={cn("grid divide-x divide-white/5", isSupervisor ? "grid-cols-4" : "grid-cols-3")}>
            <div className="px-5 py-4 space-y-0.5">
              <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Balance</p>
              <p className={cn("text-xl font-black font-mono", balance < 0 ? "text-red-400" : "text-white")}>${balance.toLocaleString()}</p>
            </div>
            <div className="px-5 py-4 space-y-0.5">
              <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Autorizado</p>
              <p className="text-xl font-black font-mono text-gray-300">${totalAuthorized.toLocaleString()}</p>
            </div>
            <div className="px-5 py-4 space-y-0.5">
              <p className="text-[8px] font-mono text-gray-500 uppercase tracking-widest">Gastado</p>
              <p className={cn("text-xl font-black font-mono", spent > 0 ? "text-red-400" : "text-gray-600")}>${spent.toLocaleString()}</p>
            </div>
            {isSupervisor && (
              <button
                onClick={() => setIsFundsModalOpen(true)}
                className="cursor-pointer flex flex-col items-center justify-center gap-1 px-5 py-4 hover:bg-white/5 transition-colors group border-l border-white/5"
              >
                <Plus className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
                <span className="text-[8px] font-mono text-gray-500 group-hover:text-white uppercase tracking-widest transition-colors">Fondos</span>
              </button>
            )}
          </div>
          {/* Balance bar */}
          {totalAuthorized > 0 && (
            <div className="h-0.5 bg-white/5">
              <div
                className={cn("h-full transition-all duration-700", spent > totalAuthorized ? "bg-red-500" : "bg-emerald-500")}
                style={{ width: `${Math.min((spent / totalAuthorized) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────────── */}
      <div className="mt-4 px-4 md:px-0">
        {activeTab === 'INFO' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in duration-300">

            {/* ── LEFT COLUMN ── */}
            <div className="lg:col-span-2 space-y-4">

              {/* Cliente y Sitio */}
              <div className="bg-white border border-gray-100 rounded-[1.75rem] overflow-hidden shadow-sm">
                <div className="px-7 py-5 border-b border-gray-50 flex items-center gap-3">
                  <Store className="h-4 w-4 text-gray-400" />
                  <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Cliente y Sitio</h3>
                </div>
                <div className="p-7 grid grid-cols-2 gap-x-8 gap-y-6">
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Empresa</p>
                    <p className="text-lg font-black text-gray-900 leading-tight">{ot.clientName}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Sucursal</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-black bg-gray-100 text-gray-600 px-2 py-1 rounded-md">#{ot.storeNumber || 'N/A'}</span>
                      <span className="font-bold text-gray-700 text-sm truncate">{ot.storeName || 'Central'}</span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Dirección</p>
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-gray-800 leading-relaxed">{ot.address}</p>
                        {ot.secondaryAddress && <p className="text-xs text-gray-400 font-medium mt-1">{ot.secondaryAddress}</p>}
                        {(ot.otAddress || ot.otReference) && (
                          <p className="text-xs text-gray-400 font-medium mt-1 italic">Ref: {ot.otAddress} {ot.otReference}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contacto en Sitio */}
              <div className="bg-white border border-gray-100 rounded-[1.75rem] overflow-hidden shadow-sm">
                <div className="px-7 py-5 border-b border-gray-50 flex items-center gap-3">
                  <Users className="h-4 w-4 text-gray-400" />
                  <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Contacto en Sitio</h3>
                </div>
                <div className="p-7 flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-black text-base shrink-0">
                      {ot.contactName?.charAt(0)?.toUpperCase() || 'C'}
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Encargado</p>
                      <p className="text-sm font-black text-gray-900">{ot.contactName || 'Sin asignar'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:ml-auto">
                    {ot.contactPhone
                      ? <a href={`tel:${ot.contactPhone}`} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer">
                          <Phone className="h-4 w-4 text-gray-300" /> {ot.contactPhone}
                        </a>
                      : <span className="text-xs text-gray-300 italic">Sin teléfono</span>
                    }
                    {ot.contactEmail
                      ? <a href={`mailto:${ot.contactEmail}`} className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer">
                          <Mail className="h-4 w-4 text-gray-300" /> {ot.contactEmail}
                        </a>
                      : <span className="text-xs text-gray-300 italic">Sin correo</span>
                    }
                  </div>
                </div>
              </div>

              {/* Instrucciones Técnicas */}
              <div className="bg-gray-950 rounded-[1.75rem] overflow-hidden">
                <div className="px-7 py-5 border-b border-white/5 flex items-center gap-3">
                  <ClipboardList className="h-4 w-4 text-gray-500" />
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Instrucciones Técnicas</h3>
                </div>
                <div className="px-7 py-6">
                  <p className="text-base md:text-lg font-medium leading-relaxed text-gray-300 italic">
                    "{ot.description || 'Sin instrucciones específicas del supervisor.'}"
                  </p>
                </div>
              </div>

              {/* Reporte de Cierre */}
              {ot.status === 'COMPLETED' && (ot.deliveryDetails || ot.report || ot.deliveryActUrl) && (
                <div className="bg-emerald-600 rounded-[1.75rem] overflow-hidden">
                  <div className="px-7 py-5 border-b border-white/10 flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                    <h3 className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Reporte de Finalización</h3>
                  </div>
                  <div className="px-7 py-6 space-y-5">
                    {(ot.deliveryDetails || ot.report) && (
                      <p className="text-base font-medium leading-relaxed text-emerald-50 italic">
                        "{ot.deliveryDetails || ot.report}"
                      </p>
                    )}
                    {ot.deliveryActUrl && (
                      <button
                        onClick={() => window.open(ot.deliveryActUrl, '_blank')}
                        className="cursor-pointer w-full bg-white text-emerald-600 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-50 transition-colors shadow-lg"
                      >
                        <FileText className="h-4 w-4" /> Descargar Acta Firmada (A.E.R.)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT SIDEBAR ── */}
            <div className="space-y-4">

              {/* Logística */}
              <div className="bg-white border border-gray-100 rounded-[1.75rem] overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-gray-50">
                  <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Logística</h3>
                </div>
                <div className="divide-y divide-gray-50">
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-300" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</p>
                    </div>
                    <p className="text-sm font-black text-gray-900 font-mono">
                      {ot.scheduledDate ? new Date(ot.scheduledDate).toLocaleDateString('es-MX') : '—'}
                    </p>
                  </div>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-gray-300" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Llegada</p>
                    </div>
                    <p className="text-sm font-black text-gray-900 font-mono">{ot.arrivalTime || '—'}</p>
                  </div>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-gray-300" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Apoyo</p>
                    </div>
                    <div className="text-right">
                      {(ot.assistantTechs?.length || 0) > 0
                        ? <div className="flex flex-wrap justify-end gap-1">
                            {ot.assistantTechs.map((st, i) => (
                              <span key={i} className="text-[8px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md uppercase">{st.name}</span>
                            ))}
                          </div>
                        : <span className="text-xs text-gray-300 italic">Sin apoyo</span>
                      }
                    </div>
                  </div>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Hash className="h-4 w-4 text-gray-300" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Folio</p>
                    </div>
                    <p className="text-[10px] font-mono text-gray-500">{ot.id?.substring(0, 12)}…</p>
                  </div>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Send className="h-4 w-4 text-gray-300" />
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Creado</p>
                    </div>
                    <p className="text-[10px] font-mono text-gray-500">{new Date(ot.createdAt).toLocaleDateString('es-MX')}</p>
                  </div>
                </div>
              </div>

              {/* Evaluaciones (solo supervisor) */}
              {isSupervisor && (
                <div className="bg-white border border-gray-100 rounded-[1.75rem] overflow-hidden shadow-sm">
                  <div className="px-6 py-5 border-b border-gray-50">
                    <h3 className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Evaluaciones</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Satisfacción · Técnico</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => copyToClipboard(generateFeedbackLink('CUSTOMER_TECH'), 'Link')}
                          className="cursor-pointer flex-1 bg-gray-50 border border-gray-100 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-gray-100 flex items-center justify-center gap-1.5 transition-colors">
                          <Hash className="h-3 w-3" /> Copiar
                        </button>
                        <button onClick={() => shareByWhatsApp(generateFeedbackLink('CUSTOMER_TECH'), `Evaluar servicio OT ${ot.otNumber}`)}
                          className="cursor-pointer flex-1 bg-emerald-500 text-white py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-emerald-600 flex items-center justify-center gap-1.5 transition-colors">
                          <MessageCircle className="h-3 w-3" /> WA
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Eficiencia · Operativa</p>
                      <button onClick={() => window.open(generateFeedbackLink('OPS_TECH'), '_blank')}
                        className="cursor-pointer w-full bg-gray-950 text-white py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-gray-800 flex items-center justify-center gap-1.5 transition-colors">
                        <Activity className="h-3 w-3" /> Evaluar Ahora
                      </button>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Experiencia · Ejecutivo</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => copyToClipboard(generateFeedbackLink('CUSTOMER_EXEC'), 'Link')}
                          className="cursor-pointer flex-1 bg-gray-50 border border-gray-100 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-gray-100 flex items-center justify-center gap-1.5 transition-colors">
                          <Hash className="h-3 w-3" /> Copiar
                        </button>
                        <button onClick={() => shareByWhatsApp(generateFeedbackLink('CUSTOMER_EXEC'), `Evaluar ejecutivo OT ${ot.otNumber}`)}
                          className="cursor-pointer flex-1 bg-emerald-500 text-white py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-emerald-600 flex items-center justify-center gap-1.5 transition-colors">
                          <MessageCircle className="h-3 w-3" /> WA
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Help note */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-start gap-3">
                <Info className="h-4 w-4 text-gray-300 mt-0.5 shrink-0" />
                <p className="text-xs font-medium text-gray-400 leading-relaxed">Comunícate con tu supervisor asignado para aclaraciones técnicas.</p>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'ACTIONS' && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">

            {/* ── ESTADO: ASSIGNED / PENDING — Necesita aceptar ── */}
            {(ot.status === 'ASSIGNED' || ot.status === 'PENDING' || ot.status === 'UNASSIGNED') && (
              <div className="bg-gray-950 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="p-8 md:p-10 space-y-7">
                  {/* Header */}
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <Zap className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-mono font-black text-amber-400 uppercase tracking-[0.25em]">Nueva Asignación</p>
                      <h3 className="text-xl md:text-2xl font-black text-white mt-1 tracking-tight leading-tight">{ot.title}</h3>
                      <p className="text-sm text-gray-500 font-bold mt-1">{ot.storeName} {ot.storeNumber ? `· #${ot.storeNumber}` : ''}</p>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-gray-500 shrink-0" />
                      <p className="text-xs font-bold text-gray-300 truncate">{ot.address}</p>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-500 shrink-0" />
                      <p className="text-xs font-bold text-gray-300">
                        {ot.scheduledDate ? new Date(ot.scheduledDate).toLocaleDateString() : 'Sin fecha'} · {ot.arrivalTime || '--:--'}
                      </p>
                    </div>
                    {ot.contactName && (
                      <div className="sm:col-span-2 bg-white/5 rounded-2xl p-4 flex items-center gap-3">
                        <User className="h-4 w-4 text-gray-500 shrink-0" />
                        <p className="text-xs font-bold text-gray-300">{ot.contactName} {ot.contactPhone ? `· ${ot.contactPhone}` : ''}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAcceptOT}
                    disabled={isSaving}
                    className="cursor-pointer w-full bg-white text-gray-950 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-gray-100 transition-all active:scale-[0.98] disabled:opacity-40 shadow-xl"
                  >
                    <Check className="h-5 w-5" /> Aceptar Orden de Trabajo
                  </button>
                </div>
              </div>
            )}

            {/* ── ESTADO: ACCEPTED — Lista para iniciar jornada ── */}
            {ot.status === 'ACCEPTED' && (
              <div className="space-y-4">
                {/* Status banner */}
                <div className="bg-gray-950 rounded-[2.5rem] p-7 flex items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Check className="h-7 w-7 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-[0.25em]">Orden Aceptada</p>
                    <p className="text-lg font-black text-white">Lista para iniciar jornada</p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">
                      {jornadas.length > 0 ? `${jornadas.length} sesión${jornadas.length !== 1 ? 'es' : ''} previas registradas` : 'Sin jornadas activas aún'}
                    </p>
                  </div>
                </div>

                {/* Historial de sesiones previas */}
                {jornadas.length > 0 && <JornadasHistorial jornadas={jornadas} />}

                {/* Total acumulado */}
                {jornadas.length > 0 && (() => {
                  const totalMs = computeTotalMs(jornadas);
                  const days = new Set(jornadas.map(j => new Date(j.startedAt).toDateString())).size;
                  return (
                    <div className="bg-white border border-gray-100 rounded-2xl p-5 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Tiempo Total</p>
                        <p className="text-2xl font-black font-mono text-gray-900 mt-1">{fmtDur(totalMs)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Días Trabajados</p>
                        <p className="text-2xl font-black font-mono text-gray-900 mt-1">{days}</p>
                      </div>
                    </div>
                  );
                })()}

                <button
                  onClick={handleStartJornada}
                  disabled={isSaving}
                  className="cursor-pointer w-full bg-gray-950 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-40 shadow-xl"
                >
                  <Play className="h-5 w-5 text-emerald-400" />
                  {jornadas.length > 0 ? 'Iniciar Nueva Jornada' : 'Iniciar Jornada de Trabajo'}
                </button>
              </div>
            )}

            {/* ── ESTADO: IN_PROGRESS — con jornada ACTIVA ── */}
            {ot.status === 'IN_PROGRESS' && activeJornada && (
              <div className="space-y-4">
                <div className="bg-gray-950 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                  {/* Live indicator */}
                  <div className="absolute top-6 right-6 flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                    <p className="text-[9px] font-mono text-red-400 uppercase tracking-widest">En Curso</p>
                  </div>

                  <div className="px-8 md:px-10 pt-10 pb-6 text-center space-y-2">
                    <p className="text-[9px] font-mono text-gray-500 uppercase tracking-[0.3em]">
                      Jornada #{jornadas.length} · Sesión activa
                    </p>
                    <p className="text-5xl md:text-7xl font-black font-mono text-white tracking-tight tabular-nums">
                      {elapsedTime}
                    </p>
                    {(() => {
                      const prevMs = computeTotalMs(jornadas.filter(j => j.status !== 'ACTIVE'));
                      return prevMs > 0 ? (
                        <p className="text-xs font-mono text-gray-500 pt-1">
                          Total acumulado: <span className="text-gray-300">{fmtDur(computeTotalMs(jornadas))}</span>
                        </p>
                      ) : null;
                    })()}
                  </div>

                  {/* CTAs */}
                  <div className="px-6 pb-7 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handlePauseJornada(null)}
                      disabled={isSaving}
                      className="cursor-pointer flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-40"
                    >
                      <Pause className="h-4 w-4 text-amber-400" /> Pausar
                    </button>
                    <button
                      onClick={() => navigate(`/ops/ots/delivery-act/${ot.id}`)}
                      className="cursor-pointer flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.97] shadow-lg shadow-emerald-900/20"
                    >
                      <Flag className="h-4 w-4" /> Cerrar Jornada
                    </button>
                  </div>

                  {/* Info nota */}
                  <div className="mx-6 mb-7 bg-white/5 rounded-2xl p-4 flex items-start gap-3">
                    <Coffee className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-gray-500 font-medium leading-relaxed">
                      Si terminas por hoy pero el trabajo continúa mañana, usa <strong className="text-gray-400">Pausar</strong>. La jornada se cerrará automáticamente a las 12:00 AM si no lo haces.
                    </p>
                  </div>
                </div>

                {jornadas.filter(j => j.status !== 'ACTIVE').length > 0 && (
                  <JornadasHistorial jornadas={jornadas.filter(j => j.status !== 'ACTIVE')} />
                )}
              </div>
            )}

            {/* ── ESTADO: IN_PROGRESS — jornada PAUSADA (sin sesión activa) ── */}
            {ot.status === 'IN_PROGRESS' && !activeJornada && (
              <div className="space-y-4">
                {/* Banner de pausa */}
                <div className="bg-gray-950 rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <div className="px-8 md:px-10 pt-10 pb-2 text-center space-y-3">
                    <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                      <Pause className="h-7 w-7 text-amber-400" />
                    </div>
                    <p className="text-[9px] font-mono text-amber-400 uppercase tracking-[0.25em]">Jornada Pausada</p>
                    <h3 className="text-xl font-black text-white">Trabajo en espera</h3>
                    {jornadas.length > 0 && (
                      <p className="text-xs font-mono text-gray-500">
                        Tiempo acumulado: <span className="text-gray-300">{fmtDur(computeTotalMs(jornadas))}</span>
                        {' · '}{jornadas.length} sesión{jornadas.length !== 1 ? 'es' : ''}
                      </p>
                    )}
                  </div>

                  <div className="px-6 pb-7 pt-6 space-y-3">
                    <button
                      onClick={handleStartJornada}
                      disabled={isSaving}
                      className="cursor-pointer w-full flex items-center justify-center gap-2 bg-white text-gray-950 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-[0.97] disabled:opacity-40 shadow-lg"
                    >
                      <Play className="h-4 w-4 text-emerald-600" /> Reanudar Jornada
                    </button>
                    <button
                      onClick={() => navigate(`/ops/ots/delivery-act/${ot.id}`)}
                      className="cursor-pointer w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.97]"
                    >
                      <Flag className="h-4 w-4 text-emerald-400" /> Trabajo terminado · Generar Acta
                    </button>
                  </div>
                </div>

                {jornadas.length > 0 && <JornadasHistorial jornadas={jornadas} />}
              </div>
            )}

            {/* ── ESTADO: COMPLETED ── */}
            {ot.status === 'COMPLETED' && (
              <div className="space-y-4">
                {/* Summary card */}
                <div className="bg-emerald-600 rounded-[2.5rem] p-8 text-white">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center">
                      <CheckCircle2 className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <p className="text-[9px] font-mono font-black text-emerald-200 uppercase tracking-[0.25em]">Orden Completada</p>
                      <p className="text-xl font-black leading-tight">{ot.title}</p>
                    </div>
                  </div>

                  {jornadas.length > 0 && (() => {
                    const totalMs = computeTotalMs(jornadas);
                    const days = new Set(jornadas.map(j => new Date(j.startedAt).toDateString())).size;
                    const avgMs = totalMs / jornadas.length;
                    return (
                      <div className="grid grid-cols-3 gap-3 pt-5 border-t border-emerald-500/40">
                        <div className="text-center">
                          <p className="text-xl md:text-2xl font-black font-mono">{fmtDur(totalMs)}</p>
                          <p className="text-[8px] font-black text-emerald-200 uppercase tracking-widest mt-1">Tiempo Total</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl md:text-2xl font-black font-mono">{jornadas.length}</p>
                          <p className="text-[8px] font-black text-emerald-200 uppercase tracking-widest mt-1">Sesiones</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl md:text-2xl font-black font-mono">{days}</p>
                          <p className="text-[8px] font-black text-emerald-200 uppercase tracking-widest mt-1">Días</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {jornadas.length > 0 && <JornadasHistorial jornadas={jornadas} />}

                {ot.deliveryActUrl && (
                  <button
                    onClick={() => window.open(ot.deliveryActUrl, '_blank')}
                    className="cursor-pointer w-full bg-white border-2 border-emerald-500 text-emerald-600 py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-emerald-50 transition-all"
                  >
                    <FileText className="h-5 w-5" /> Ver Acta de Entrega (PDF)
                  </button>
                )}

                <div className="bg-gray-50 rounded-2xl p-5 text-center space-y-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Folio registrado</p>
                  <p className="text-sm font-bold text-gray-500">{new Date(ot.finishedAt || ot.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'EXPENSES' && (
          <div className="space-y-4 animate-in fade-in duration-300">

            {/* Actions row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setIsExpenseFormOpen(true)}
                className="cursor-pointer flex-1 bg-gray-950 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus className="h-4 w-4" /> Registrar Gasto
              </button>
              <button
                onClick={() => navigate('/expenses')}
                className="cursor-pointer flex-1 bg-white border border-gray-200 text-gray-500 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Receipt className="h-4 w-4" /> Ver Historial
              </button>
            </div>

            {/* Expense list */}
            <div className="bg-white border border-gray-100 rounded-[1.75rem] overflow-hidden shadow-sm">
              <div className="px-7 py-5 border-b border-gray-50 flex items-center justify-between">
                <h4 className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Movimientos</h4>
                <span className="text-[9px] font-mono text-gray-400">{ot.expenses?.length || 0} registro{(ot.expenses?.length || 0) !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {(ot.expenses?.length || 0) > 0 ? ot.expenses.map((exp) => (
                  <div key={exp.id} className="px-7 py-4 flex items-center justify-between hover:bg-gray-50/40 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                        exp.status === 'APPROVED' ? "bg-emerald-50 text-emerald-600" :
                        exp.status === 'REJECTED' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                      )}>
                        <Receipt className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900 uppercase">{exp.category}</p>
                        <p className="text-[9px] font-mono text-gray-400">{new Date(exp.createdAt).toLocaleDateString('es-MX')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black font-mono text-gray-900">${exp.amount.toLocaleString()}</p>
                      <span className={cn(
                        "text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border",
                        exp.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        exp.status === 'REJECTED' ? "bg-red-50 text-red-600 border-red-100" : "bg-blue-50 text-blue-600 border-blue-100"
                      )}>
                        {exp.status}
                      </span>
                    </div>
                          </div>
                  )) : (
                    <div className="py-14 text-center">
                      <Coins className="h-10 w-10 text-gray-100 mx-auto mb-3" />
                      <p className="text-xs font-bold text-gray-300 uppercase tracking-widest italic">Sin gastos registrados</p>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>

      <NewExpenseForm
        isOpen={isExpenseFormOpen}
        onClose={() => setIsExpenseFormOpen(false)}
        onSave={handleSaveExpense}
        prefilledOtId={ot.otNumber}
      />

      {/* ── Funds Modal ── */}
      {isFundsModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="bg-gray-950 px-7 py-6 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Autorizar</p>
                <h3 className="text-lg font-black text-white tracking-tight">Inyectar Fondos</h3>
              </div>
              <button onClick={() => setIsFundsModalOpen(false)} className="cursor-pointer h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="p-7 space-y-6">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 flex items-center justify-between">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Autorizado Actual</p>
                <p className="text-xl font-black font-mono text-gray-900">${totalAuthorized.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Monto a Añadir (MXN)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-gray-300">$</span>
                  <input
                    type="number"
                    className="w-full pl-9 pr-5 py-4 bg-white border-2 border-gray-100 rounded-2xl outline-none focus:border-gray-950 font-black text-xl transition-all"
                    placeholder="0"
                    value={additionalFunds}
                    onChange={(e) => setAdditionalFunds(e.target.value)}
                  />
                </div>
              </div>
              <button
                onClick={handleAddFunds}
                disabled={!additionalFunds || additionalFunds <= 0}
                className="cursor-pointer w-full bg-gray-950 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-colors disabled:opacity-40 active:scale-[0.98]"
              >
                Confirmar Depósito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Finish Modal ── */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
            <div className="bg-gray-950 px-7 py-6 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Cierre</p>
                <h3 className="text-lg font-black text-white tracking-tight">Finalizar Trabajo</h3>
              </div>
              <button onClick={() => setIsFinishModalOpen(false)} className="cursor-pointer h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <div className="p-7 space-y-5">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Reporte de Actividades</label>
                <textarea
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-gray-950 font-medium text-sm transition-all resize-none"
                  rows="5"
                  placeholder="Describe los trabajos realizados, fallas corregidas y observaciones..."
                  value={finishData.report}
                  onChange={(e) => setFinishData({...finishData, report: e.target.value})}
                />
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                <Info className="h-4 w-4 text-emerald-500 shrink-0" />
                <p className="text-[10px] font-bold text-emerald-700">Esta orden pasará a validación del supervisor. El reporte debe ser completo.</p>
              </div>
              <button
                onClick={() => handleStatusUpdate('COMPLETED')}
                disabled={!finishData.report}
                className="cursor-pointer w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-colors disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                Enviar Reporte y Cerrar <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
