import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Trash2, X, DollarSign, Calendar, User, Building2,
  Mail, Phone, Target, TrendingUp, Activity, MessageSquare, PhoneCall,
  Send, Coffee, CheckSquare, Clock, FileText, MapPin, ClipboardCheck,
  MessageCircle, Percent, Plus, Loader2, AlertCircle, Award,
  ExternalLink, BarChart2, ChevronDown, ChevronRight, Hash,
  SlidersHorizontal, Edit3, Package, CheckCircle2, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';

// ── Constantes ────────────────────────────────────────────────────────────────
const DEAL_STAGES = [
  { id: 'QUALIFICATION',            label: 'Lead / Prospecto',          prob: 10,  color: 'bg-slate-400',   ring: 'ring-slate-200',   text: 'text-slate-600',   bg: 'bg-slate-50'   },
  { id: 'NEEDS_ANALYSIS',           label: 'Acercamiento',              prob: 20,  color: 'bg-blue-400',    ring: 'ring-blue-200',    text: 'text-blue-600',    bg: 'bg-blue-50'    },
  { id: 'VALUE_PROPOSITION',        label: 'Contacto decisor',          prob: 30,  color: 'bg-indigo-500',  ring: 'ring-indigo-200',  text: 'text-indigo-600',  bg: 'bg-indigo-50'  },
  { id: 'IDENTIFY_DECISION_MAKERS', label: 'Oportunidad detectada',     prob: 40,  color: 'bg-violet-500',  ring: 'ring-violet-200',  text: 'text-violet-600',  bg: 'bg-violet-50'  },
  { id: 'PROPOSAL_PRICE_QUOTE',     label: 'Levantamiento técnico',     prob: 50,  color: 'bg-amber-500',   ring: 'ring-amber-200',   text: 'text-amber-700',   bg: 'bg-amber-50'   },
  { id: 'PROPOSAL_SENT',            label: 'Cotización enviada',        prob: 65,  color: 'bg-orange-500',  ring: 'ring-orange-200',  text: 'text-orange-700',  bg: 'bg-orange-50'  },
  { id: 'NEGOTIATION_1',            label: 'Negociación 1',             prob: 75,  color: 'bg-purple-500',  ring: 'ring-purple-200',  text: 'text-purple-600',  bg: 'bg-purple-50'  },
  { id: 'RECOTIZACION',             label: 'Recotización',              prob: 80,  color: 'bg-pink-500',    ring: 'ring-pink-200',    text: 'text-pink-600',    bg: 'bg-pink-50'    },
  { id: 'NEGOTIATION_2',            label: 'Negociación 2',             prob: 90,  color: 'bg-rose-500',    ring: 'ring-rose-200',    text: 'text-rose-600',    bg: 'bg-rose-50'    },
  { id: 'CLOSED_WON_PENDING',       label: 'En espera de autorización', prob: 95,  color: 'bg-yellow-500',  ring: 'ring-yellow-200',  text: 'text-yellow-700',  bg: 'bg-yellow-50'  },
  { id: 'CLOSED_WON',               label: 'Ganado',                    prob: 100, color: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700', bg: 'bg-emerald-50' },
  { id: 'CLOSED_LOST',              label: 'Perdido',                   prob: 0,   color: 'bg-red-500',     ring: 'ring-red-200',     text: 'text-red-600',     bg: 'bg-red-50'     },
];
const stageMap = Object.fromEntries(DEAL_STAGES.map(s => [s.id, s]));

const ACTIVITY_TYPES = [
  { id: 'NOTE',        label: 'Nota',        icon: MessageSquare,  color: 'text-gray-500',   bg: 'bg-gray-100',    pill: 'bg-gray-100 text-gray-600' },
  { id: 'CALL',        label: 'Llamada',     icon: PhoneCall,      color: 'text-blue-500',   bg: 'bg-blue-50',     pill: 'bg-blue-50 text-blue-700' },
  { id: 'MESSAGE',     label: 'Mensaje',     icon: MessageCircle,  color: 'text-teal-500',   bg: 'bg-teal-50',     pill: 'bg-teal-50 text-teal-700' },
  { id: 'EMAIL',       label: 'Correo',      icon: Send,           color: 'text-purple-500', bg: 'bg-purple-50',   pill: 'bg-purple-50 text-purple-700' },
  { id: 'VISIT',       label: 'Visita',      icon: MapPin,         color: 'text-green-500',  bg: 'bg-green-50',    pill: 'bg-green-50 text-green-700' },
  { id: 'MEETING',     label: 'Reunión',     icon: Coffee,         color: 'text-amber-500',  bg: 'bg-amber-50',    pill: 'bg-amber-50 text-amber-700' },
  { id: 'SEGUIMIENTO', label: 'Seguimiento', icon: ClipboardCheck, color: 'text-indigo-500', bg: 'bg-indigo-50',   pill: 'bg-indigo-50 text-indigo-700' },
  { id: 'TASK',        label: 'Tarea',       icon: CheckSquare,    color: 'text-emerald-500',bg: 'bg-emerald-50',  pill: 'bg-emerald-50 text-emerald-700' },
  { id: 'QUOTE',       label: 'Cotización',  icon: FileText,       color: 'text-orange-500', bg: 'bg-orange-50',   pill: 'bg-orange-50 text-orange-700' },
  { id: 'STAGE_CHANGE',label: 'Cambio etapa',icon: ChevronRight,   color: 'text-violet-500', bg: 'bg-violet-50',   pill: 'bg-violet-50 text-violet-700' },
];
const typeMap = Object.fromEntries(ACTIVITY_TYPES.map(t => [t.id, t]));

const STATUS_META = {
  PENDING:   { label: 'Pendiente',     color: '#94a3b8', bg: '#f1f5f9', next: 'COMPLETED' },
  COMPLETED: { label: 'Completado',    color: '#22c55e', bg: '#f0fdf4', next: 'FAILED'    },
  FAILED:    { label: 'No completado', color: '#ef4444', bg: '#fef2f2', next: 'PENDING'   },
};

const QUOTE_STATUS = {
  PENDING:  { label: 'Pendiente',  color: 'bg-amber-100 text-amber-700',    bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',   icon: Clock        },
  ACCEPTED: { label: 'Aceptada',   color: 'bg-emerald-100 text-emerald-700', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2  },
  REJECTED: { label: 'Rechazada',  color: 'bg-red-100 text-red-600',         bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',     icon: X             },
  EXPIRED:  { label: 'Expirada',   color: 'bg-gray-100 text-gray-500',       bg: 'bg-gray-50',    text: 'text-gray-500',    border: 'border-gray-200',    icon: AlertCircle   },
};

const SOURCES = ['Web', 'Referido', 'LinkedIn', 'Facebook', 'Llamada en frío', 'Evento', 'Otro'];
const QUOTE_STAGES = ['PROPOSAL_PRICE_QUOTE', 'PROPOSAL_SENT', 'RECOTIZACION'];

const fmt     = (n) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDT   = (d) => d ? new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora mismo';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
};

// ── Semáforo ──────────────────────────────────────────────────────────────────
function Semaphore({ status, onToggle }) {
  const meta = STATUS_META[status] || STATUS_META.PENDING;
  return (
    <button
      onClick={onToggle}
      title={`${meta.label} — clic para cambiar`}
      style={{
        width: 14, height: 14, borderRadius: '50%',
        background: meta.color, border: '2px solid white',
        boxShadow: `0 0 0 1px ${meta.color}40`,
        cursor: 'pointer', transition: 'transform 0.15s', flexShrink: 0,
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    />
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [deal, setDeal]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [tab, setTab]           = useState('info'); // 'info' | 'activities' | 'quotes' | 'summary'

  const [editForm, setEditForm] = useState({});
  const [clients, setClients]   = useState([]);
  const [employees, setEmployees] = useState([]);

  // Actividades
  const [activities, setActivities]       = useState([]);
  const [actsLoading, setActsLoading]     = useState(false);
  const [newAct, setNewAct]               = useState({ type: 'NOTE', content: '', dueDate: '' });
  const [addingAct, setAddingAct]         = useState(false);

  // Cotizaciones
  const [quotes, setQuotes]               = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Modal cotización (crear)
  const [quoteModal, setQuoteModal] = useState({ show: false, company: '', contactName: '', email: '', phone: '', rfc: '', address: '', saving: false });

  // Modal ver cotización
  const [viewQuote, setViewQuote] = useState(null);

  // Resumen de actividades
  const [sumPeriod,      setSumPeriod]      = useState('month'); // 'day'|'week'|'month'|'year'
  const [sumRefDate,     setSumRefDate]     = useState(() => new Date());
  const [sumActiveType,  setSumActiveType]  = useState(null); // tipo seleccionado para drill-down

  // Modal razón de cierre
  const [closeModal, setCloseModal] = useState({ show: false, stage: '', reason: '', saving: false });

  // ── Fetch deal + soporte ──────────────────────────────────────────────────
  const fetchDeal = useCallback(async () => {
    setLoading(true);
    try {
      const [dealRes, clientsRes, empRes] = await Promise.all([
        apiFetch(`/api/crm/deals?id=${id}`),
        apiFetch('/api/crm/clients'),
        apiFetch('/api/employees'),
      ]);
      const [d, c, e] = await Promise.all([dealRes.json(), clientsRes.json(), empRes.json()]);
      if (!d || d.error) { navigate('/crm/deals'); return; }
      setDeal(d);
      setEditForm({
        title:        d.title || '',
        value:        d.value || 0,
        company:      d.company || '',
        contactName:  d.contactName || '',
        contactEmail: d.contactEmail || '',
        contactPhone: d.contactPhone || '',
        clientId:     d.clientId || '',
        assignedToId: d.assignedToId || '',
        stage:        d.stage || 'QUALIFICATION',
        probability:  d.probability ?? stageMap[d.stage]?.prob ?? 10,
        expectedClose: d.expectedClose ? d.expectedClose.split('T')[0] : '',
        source:       d.source || 'Web',
        description:  d.description || '',
        notes:        d.notes || '',
        closeReason:  d.closeReason || '',
      });
      setClients(Array.isArray(c) ? c : []);
      setEmployees(Array.isArray(e) ? e : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [id, navigate]);

  const fetchActivities = useCallback(async () => {
    setActsLoading(true);
    try {
      const res = await apiFetch(`/api/crm/deal-activities?dealId=${id}`);
      const data = await res.json();
      setActivities(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setActsLoading(false); }
  }, [id]);

  const fetchQuotes = useCallback(async () => {
    setQuotesLoading(true);
    try {
      const res = await apiFetch(`/api/quotes?dealId=${id}`);
      const data = await res.json();
      setQuotes(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setQuotesLoading(false); }
  }, [id]);

  useEffect(() => { fetchDeal(); }, [fetchDeal]);

  useEffect(() => {
    if (tab === 'activities' || tab === 'summary') fetchActivities();
    if (tab === 'quotes') fetchQuotes();
  }, [tab, fetchActivities, fetchQuotes]);

  // ── Guardar edición ───────────────────────────────────────────────────────
  const logActivity = (type, content, status = 'COMPLETED') => {
    apiFetch('/api/crm/deal-activities', {
      method: 'POST',
      body: JSON.stringify({ dealId: id, type, content, authorName: user?.name || 'Sistema', status }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(act => { if (act) setActivities(prev => [act, ...prev]); })
      .catch(() => {});
  };

  const saveDeal = async (extra = {}) => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/crm/deals', {
        method: 'PUT',
        body: JSON.stringify({ id, ...editForm, ...extra }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDeal(updated);
        setEditForm(f => ({
          ...f,
          stage:       updated.stage,
          probability: updated.probability,
          closeReason: updated.closeReason || '',
        }));
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleStageChange = (newStage) => {
    if (newStage === 'CLOSED_WON' || newStage === 'CLOSED_LOST') {
      setCloseModal({ show: true, stage: newStage, reason: '', saving: false });
    } else {
      const prob = stageMap[newStage]?.prob ?? editForm.probability;
      const prevLabel = stageMap[editForm.stage]?.label || editForm.stage;
      const newLabel  = stageMap[newStage]?.label  || newStage;
      setEditForm(f => ({ ...f, stage: newStage, probability: prob }));
      saveDeal({ stage: newStage, probability: prob });
      logActivity('STAGE_CHANGE', `Etapa: ${prevLabel} → ${newLabel}`);
    }
  };

  const handleCloseReason = async (e) => {
    e.preventDefault();
    setCloseModal(p => ({ ...p, saving: true }));
    const prob = stageMap[closeModal.stage]?.prob ?? 0;
    const prevLabel  = stageMap[editForm.stage]?.label  || editForm.stage;
    const closeLabel = stageMap[closeModal.stage]?.label || closeModal.stage;
    await saveDeal({ stage: closeModal.stage, probability: prob, closeReason: closeModal.reason });
    setEditForm(f => ({ ...f, stage: closeModal.stage, probability: prob }));
    logActivity('STAGE_CHANGE', `Etapa: ${prevLabel} → ${closeLabel}${closeModal.reason ? ` | Motivo: ${closeModal.reason}` : ''}`);
    setCloseModal({ show: false, stage: '', reason: '', saving: false });
  };

  // ── Eliminar deal ─────────────────────────────────────────────────────────
  const deleteDeal = async () => {
    if (!window.confirm(`¿Eliminar "${deal?.title}"?`)) return;
    try {
      const res = await apiFetch('/api/crm/deals', { method: 'DELETE', body: JSON.stringify({ id }) });
      if (res.ok) navigate('/crm/deals');
    } catch (err) { console.error(err); }
  };

  // ── Agregar actividad ─────────────────────────────────────────────────────
  const addActivity = async (e) => {
    e.preventDefault();
    if (!newAct.content.trim()) return;
    setAddingAct(true);
    try {
      const res = await apiFetch('/api/crm/deal-activities', {
        method: 'POST',
        body: JSON.stringify({
          dealId: id, ...newAct,
          authorName: user?.name || 'Usuario',
          status: 'PENDING',
        }),
      });
      if (res.ok) {
        setNewAct({ type: 'NOTE', content: '', dueDate: '' });
        fetchActivities();
      }
    } catch (err) { console.error(err); }
    finally { setAddingAct(false); }
  };

  const updateActStatus = async (actId, newStatus) => {
    setActivities(prev => prev.map(a => a.id === actId ? { ...a, status: newStatus } : a));
    try {
      await apiFetch('/api/crm/deal-activities', { method: 'PUT', body: JSON.stringify({ id: actId, status: newStatus }) });
    } catch (err) { console.error(err); }
  };

  // ── Modal cotización ──────────────────────────────────────────────────────
  const openQuoteModal = () => {
    const linked = clients.find(c => c.id === editForm.clientId);
    setQuoteModal({
      show: true,
      company:     editForm.company      || '',
      contactName: editForm.contactName  || '',
      email:       editForm.contactEmail || '',
      phone:       editForm.contactPhone || '',
      rfc:         linked?.rfc     || '',
      address:     linked?.address || '',
      saving: false,
    });
  };

  const handleConfirmQuote = async (e) => {
    e.preventDefault();
    setQuoteModal(p => ({ ...p, saving: true }));
    try {
      let clientId = editForm.clientId || null;
      if (!clientId && quoteModal.email) {
        const all = await apiFetch('/api/crm/clients').then(r => r.json());
        const found = (Array.isArray(all) ? all : []).find(c => c.email?.toLowerCase() === quoteModal.email.toLowerCase());
        if (found) {
          clientId = found.id;
        } else {
          const cr = await apiFetch('/api/crm/clients', {
            method: 'POST',
            body: JSON.stringify({ companyName: quoteModal.company || quoteModal.contactName || 'Sin nombre', contactName: quoteModal.contactName, email: quoteModal.email, phone: quoteModal.phone, rfc: quoteModal.rfc || '', address: quoteModal.address || '' }),
          });
          if (cr.ok) { const nc = await cr.json(); clientId = nc.id; }
        }
      }
      setQuoteModal(p => ({ ...p, show: false, saving: false }));
      navigate('/crm/quotes', {
        state: {
          fromDeal: { id, title: deal?.title, contactName: quoteModal.contactName, company: quoteModal.company, email: quoteModal.email, phone: quoteModal.phone, rfc: quoteModal.rfc, address: quoteModal.address, value: deal?.value, assignedToId: deal?.assignedToId || null, stage: editForm.stage },
          clientId,
        },
      });
    } catch (err) {
      console.error(err);
      setQuoteModal(p => ({ ...p, saving: false }));
    }
  };

  // ── Acciones sobre cotización ──────────────────────────────────────────────
  const updateQuoteStatus = async (quoteId, newStatus) => {
    try {
      const res = await apiFetch('/api/quotes', { method: 'PUT', body: JSON.stringify({ id: quoteId, status: newStatus }) });
      if (res.ok) {
        const updated = await res.json();
        setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q));
        setViewQuote(updated);
        const statusLabel = QUOTE_STATUS[newStatus]?.label || newStatus;
        logActivity('QUOTE', `Cotización ${updated.quoteNumber} → ${statusLabel}`);
      }
    } catch (err) { console.error(err); }
  };

  const deleteQuote = async (quoteId) => {
    if (!confirm('¿Eliminar esta cotización?')) return;
    const target = quotes.find(q => q.id === quoteId);
    try {
      await apiFetch(`/api/quotes?id=${quoteId}`, { method: 'DELETE' });
      setQuotes(prev => prev.filter(q => q.id !== quoteId));
      setViewQuote(null);
      if (target) logActivity('QUOTE', `Cotización ${target.quoteNumber} eliminada`);
    } catch (err) { console.error(err); }
  };

  const downloadQuotePDF = async (quoteId, quoteNumber) => {
    try {
      const res = await apiFetch(`/api/quotes?id=${quoteId}`);
      const data = await res.json();
      if (data.pdfUrl) {
        const a = document.createElement('a');
        a.href = data.pdfUrl;
        a.download = `${quoteNumber}.pdf`;
        a.target = '_blank';
        a.click();
      }
    } catch (err) { console.error(err); }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!deal) return null;

  const stage = stageMap[editForm.stage] || DEAL_STAGES[0];
  const daysUntil = editForm.expectedClose
    ? Math.ceil((new Date(editForm.expectedClose) - Date.now()) / 86400000)
    : null;

  // Contadores de tipos de actividad
  const actCounts = {};
  activities.forEach(a => { actCounts[a.type] = (actCounts[a.type] || 0) + 1; });

  return (
    <div className="min-h-full bg-gray-50">
      {/* ── Hero header ───────────────────────────────────────────────────── */}
      <div className={cn('border-b', stage.bg)}>
        <div className="max-w-6xl mx-auto px-6 py-5">
          {/* Back nav */}
          <button
            onClick={() => navigate('/crm/deals')}
            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors mb-4 group"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Pipeline
          </button>

          <div className="flex flex-col lg:flex-row lg:items-start gap-4 justify-between">
            {/* Left: title + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <div className={cn('w-3 h-3 rounded-full flex-shrink-0 mt-2', stage.color)} />
                <div className="flex-1 min-w-0">
                  <input
                    className={cn(
                      'w-full text-2xl font-black text-gray-900 bg-transparent outline-none border-b-2 border-transparent focus:border-primary pb-1 transition-colors',
                    )}
                    value={editForm.title}
                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    onBlur={() => saveDeal()}
                  />
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {editForm.company && (
                      <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {editForm.company}
                      </span>
                    )}
                    {editForm.contactName && (
                      <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                        <User className="h-3 w-3" /> {editForm.contactName}
                      </span>
                    )}
                    {editForm.contactEmail && (
                      <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {editForm.contactEmail}
                      </span>
                    )}
                    {editForm.contactPhone && (
                      <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {editForm.contactPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: KPIs */}
            <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
              <div className="text-center">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Valor</p>
                <p className={cn('text-xl font-black', stage.text)}>{fmt(editForm.value)}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Prob.</p>
                <p className="text-xl font-black text-gray-700">{editForm.probability}%</p>
              </div>
              {daysUntil !== null && (
                <div className="text-center">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Cierre</p>
                  <p className={cn('text-sm font-black', daysUntil < 0 ? 'text-red-500' : daysUntil <= 7 ? 'text-amber-500' : 'text-gray-700')}>
                    {daysUntil < 0 ? `Vencido ${Math.abs(daysUntil)}d` : daysUntil === 0 ? 'Hoy' : `${daysUntil}d`}
                  </p>
                </div>
              )}
              {/* Stage badge */}
              <div className={cn('px-3 py-2 rounded-2xl text-center', stage.bg)}>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Etapa</p>
                <p className={cn('text-[10px] font-black uppercase tracking-wide', stage.text)}>{stage.label}</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="h-2 bg-white/60 rounded-full overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', stage.color)}
                animate={{ width: `${editForm.probability}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-0">
            {[
              { id: 'info',       label: 'Información',           icon: Edit3 },
              { id: 'activities', label: 'Actividades',           icon: Activity },
              { id: 'quotes',     label: 'Cotizaciones',          icon: FileText },
              { id: 'summary',    label: 'Resumen de actividades', icon: BarChart2 },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all',
                  tab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                )}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 py-2">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
              <button
                onClick={() => saveDeal()}
                disabled={saving}
                className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
              >
                <Save className="h-3 w-3" /> Guardar
              </button>
              <button
                onClick={deleteDeal}
                className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-100 hover:text-red-600 transition-all"
                title="Eliminar trato"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          {/* ── INFORMACIÓN ── */}
          {tab === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Columna 1 */}
              <div className="space-y-5">
                {/* Financiero */}
                <div className="bg-white rounded-3xl p-5 border border-gray-100 space-y-4">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Financiero</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Valor del Trato</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
                        <input
                          type="number"
                          className="w-full bg-gray-50 rounded-xl pl-8 pr-3 py-3 font-black text-sm outline-none focus:ring-2 ring-primary/20"
                          value={editForm.value}
                          onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))}
                          onBlur={() => saveDeal()}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Prob. Manual (%)</label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="number" min="0" max="100"
                          className="w-full bg-gray-50 rounded-xl pl-8 pr-3 py-3 font-black text-sm outline-none focus:ring-2 ring-primary/20"
                          value={editForm.probability}
                          onChange={e => setEditForm(f => ({ ...f, probability: e.target.value }))}
                          onBlur={() => saveDeal()}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Cierre Esperado</label>
                      <input
                        type="date"
                        className="w-full bg-gray-50 rounded-xl px-3 py-3 font-bold text-xs outline-none focus:ring-2 ring-primary/20"
                        value={editForm.expectedClose}
                        onChange={e => setEditForm(f => ({ ...f, expectedClose: e.target.value }))}
                        onBlur={() => saveDeal()}
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Fuente</label>
                      <input
                        list="deal-sources"
                        className="w-full bg-gray-50 rounded-xl px-3 py-3 font-bold text-xs outline-none focus:ring-2 ring-primary/20"
                        placeholder="Web, Referido…"
                        value={editForm.source}
                        onChange={e => setEditForm(f => ({ ...f, source: e.target.value }))}
                        onBlur={() => saveDeal()}
                      />
                      <datalist id="deal-sources">
                        {SOURCES.map(s => <option key={s} value={s} />)}
                      </datalist>
                    </div>
                  </div>
                </div>

                {/* Pipeline */}
                <div className="bg-white rounded-3xl p-5 border border-gray-100 space-y-3">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Etapa del Pipeline</p>
                  <select
                    className={cn(
                      'w-full text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-3 border-2 outline-none cursor-pointer transition-all',
                      stage.ring, stage.text, stage.bg
                    )}
                    value={editForm.stage}
                    onChange={e => handleStageChange(e.target.value)}
                  >
                    {DEAL_STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label} ({s.prob}%)</option>
                    ))}
                  </select>
                  {editForm.closeReason && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Razón de cierre</p>
                      <p className="text-xs text-gray-600 font-medium">{editForm.closeReason}</p>
                    </div>
                  )}
                  {/* Cotización */}
                  {QUOTE_STAGES.includes(editForm.stage) && (
                    <button
                      onClick={openQuoteModal}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
                    >
                      <FileText className="h-3.5 w-3.5" /> Generar Cotización
                    </button>
                  )}
                </div>

                {/* Vinculación */}
                <div className="bg-white rounded-3xl p-5 border border-gray-100 space-y-3">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Vinculación</p>
                  <div>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Cliente Registrado</label>
                    <select
                      className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-xs outline-none cursor-pointer"
                      value={editForm.clientId}
                      onChange={e => setEditForm(f => ({ ...f, clientId: e.target.value }))}
                      onBlur={() => saveDeal()}
                    >
                      <option value="">— Sin cliente —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Vendedor Asignado</label>
                    <select
                      className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-xs outline-none cursor-pointer"
                      value={editForm.assignedToId}
                      onChange={e => setEditForm(f => ({ ...f, assignedToId: e.target.value }))}
                      onBlur={() => saveDeal()}
                    >
                      <option value="">— Sin asignar —</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Metadatos */}
                <div className="bg-white rounded-3xl p-5 border border-gray-100">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3">Registro</p>
                  <div className="space-y-1.5">
                    <p className="text-[9px] text-gray-500 font-bold">Creado: {fmtDate(deal.createdAt)}</p>
                    <p className="text-[9px] text-gray-500 font-bold">Actualizado: {fmtDate(deal.updatedAt)}</p>
                    <p className="text-[9px] text-gray-400 font-mono">ID: {deal.id}</p>
                  </div>
                </div>
              </div>

              {/* Columna 2 */}
              <div className="space-y-5">
                {/* Contacto */}
                <div className="bg-white rounded-3xl p-5 border border-gray-100 space-y-3">
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Contacto</p>
                  <input
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:ring-2 ring-primary/20"
                    placeholder="Nombre del contacto"
                    value={editForm.contactName}
                    onChange={e => setEditForm(f => ({ ...f, contactName: e.target.value }))}
                    onBlur={() => saveDeal()}
                  />
                  <input
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:ring-2 ring-primary/20"
                    placeholder="Empresa / Organización"
                    value={editForm.company}
                    onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))}
                    onBlur={() => saveDeal()}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="email"
                      className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:ring-2 ring-primary/20"
                      placeholder="Email"
                      value={editForm.contactEmail}
                      onChange={e => setEditForm(f => ({ ...f, contactEmail: e.target.value }))}
                      onBlur={() => saveDeal()}
                    />
                    <input
                      className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:ring-2 ring-primary/20"
                      placeholder="Teléfono"
                      value={editForm.contactPhone}
                      onChange={e => setEditForm(f => ({ ...f, contactPhone: e.target.value }))}
                      onBlur={() => saveDeal()}
                    />
                  </div>
                </div>

                {/* Descripción */}
                <div className="bg-white rounded-3xl p-5 border border-gray-100 space-y-3">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Descripción del Proyecto</p>
                  <textarea
                    rows={4}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-xs outline-none resize-none focus:ring-2 ring-primary/20"
                    placeholder="Detalles del proyecto, necesidades del cliente..."
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    onBlur={() => saveDeal()}
                  />
                </div>

                {/* Notas internas */}
                <div className="bg-white rounded-3xl p-5 border border-gray-100 space-y-3">
                  <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Notas Internas</p>
                  <textarea
                    rows={4}
                    className="w-full bg-amber-50 rounded-xl px-4 py-3 font-bold text-xs outline-none resize-none focus:ring-2 ring-amber-200"
                    placeholder="Notas privadas del equipo..."
                    value={editForm.notes}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    onBlur={() => saveDeal()}
                  />
                </div>

                {/* Vendedor info */}
                {deal.assignedTo && (
                  <div className="bg-white rounded-3xl p-5 border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3">Vendedor</p>
                    <div className="flex items-center gap-3">
                      <div className={cn('h-10 w-10 rounded-2xl flex items-center justify-center text-sm font-black text-white flex-shrink-0', stage.color)}>
                        {deal.assignedTo.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-sm">{deal.assignedTo.name}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Vendedor asignado</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── ACTIVIDADES ── */}
          {tab === 'activities' && (
            <motion.div
              key="activities"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6"
            >
              {/* Form */}
              <div className="space-y-4">
                <form onSubmit={addActivity} className="bg-white rounded-3xl p-5 border border-gray-100 space-y-4">
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Registrar Actividad</p>

                  {/* Tipo */}
                  <div className="flex flex-wrap gap-1.5">
                    {ACTIVITY_TYPES.filter(t => t.id !== 'STAGE_CHANGE').map(t => (
                      <button
                        key={t.id} type="button"
                        onClick={() => setNewAct(f => ({ ...f, type: t.id }))}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all',
                          newAct.type === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                        )}
                      >
                        <t.icon className="h-2.5 w-2.5" /> {t.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    required rows={4}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-xs outline-none resize-none border border-gray-200 focus:border-primary transition-colors"
                    placeholder="Describe el detalle de la actividad..."
                    value={newAct.content}
                    onChange={e => setNewAct(f => ({ ...f, content: e.target.value }))}
                  />

                  <div>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fecha y hora</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-gray-50 rounded-xl px-4 py-2.5 font-bold text-xs outline-none border border-gray-200 focus:border-primary"
                      value={newAct.dueDate}
                      onChange={e => setNewAct(f => ({ ...f, dueDate: e.target.value }))}
                    />
                  </div>

                  <button
                    type="submit" disabled={addingAct}
                    className="w-full bg-gray-900 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {addingAct ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {addingAct ? 'Registrando...' : 'Agregar al Historial'}
                  </button>
                </form>

                {/* Stats */}
                {activities.length > 0 && (
                  <div className="bg-white rounded-3xl p-5 border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3">Resumen de Actividades</p>
                    <div className="space-y-2">
                      {ACTIVITY_TYPES.filter(t => actCounts[t.id]).map(t => (
                        <div key={t.id} className="flex items-center justify-between">
                          <span className={cn('text-[8px] font-black flex items-center gap-1.5 px-2 py-1 rounded-lg', t.pill)}>
                            <t.icon className="h-2.5 w-2.5" /> {t.label}
                          </span>
                          <span className="text-[9px] font-black text-gray-600">{actCounts[t.id]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-3xl p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Historial Completo</p>
                  <span className="text-[8px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">{activities.length} registros</span>
                </div>

                {actsLoading ? (
                  <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-[10px] font-black uppercase">Cargando...</span>
                  </div>
                ) : activities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Activity className="h-10 w-10 text-gray-200" />
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Sin actividades registradas</p>
                    <p className="text-[8px] text-gray-400">Usa el formulario de la izquierda para comenzar</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((act, i) => {
                      const T = typeMap[act.type] || typeMap.NOTE;
                      const sMeta = STATUS_META[act.status] || STATUS_META.PENDING;
                      const due = fmtDT(act.dueDate);
                      const isOverdue = act.dueDate && new Date(act.dueDate) < new Date() && act.status !== 'COMPLETED';

                      return (
                        <div key={act.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={cn(
                              'h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0',
                              isOverdue ? 'bg-red-100 text-red-500' : cn(T.bg, T.color)
                            )}>
                              {isOverdue ? <AlertCircle className="h-3.5 w-3.5" /> : <T.icon className="h-3.5 w-3.5" />}
                            </div>
                            {i < activities.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1 min-h-[16px]" />}
                          </div>
                          <div className={cn('flex-1 pb-4', i === activities.length - 1 && 'pb-0')}>
                            <div className="flex items-center justify-between mb-1.5 gap-2">
                              <div className="flex items-center gap-2">
                                <span className={cn('text-[8px] font-black uppercase tracking-widest', T.color)}>{T.label}</span>
                                <Semaphore status={act.status || 'PENDING'} onToggle={() => updateActStatus(act.id, sMeta.next)} />
                                <span style={{ fontSize: 8, fontWeight: 700, color: sMeta.color }}>{sMeta.label}</span>
                              </div>
                              <span className="text-[7px] text-gray-400 font-bold flex-shrink-0">{timeAgo(act.createdAt)}</span>
                            </div>
                            <p
                              className={cn('text-xs text-gray-700 font-medium leading-relaxed p-3 rounded-xl', isOverdue && 'border border-red-200')}
                              style={{ background: isOverdue ? '#fef2f2' : sMeta.bg }}
                            >
                              {act.content}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {act.authorName && (
                                <span className="text-[7px] text-gray-400 font-bold flex items-center gap-1">
                                  <User className="h-2 w-2" /> {act.authorName}
                                </span>
                              )}
                              {due && (
                                <span className="text-[7px] font-bold flex items-center gap-1" style={{ color: sMeta.color }}>
                                  <Clock className="h-2 w-2" /> {due}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── COTIZACIONES ── */}
          {tab === 'quotes' && (
            <motion.div
              key="quotes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Header + new quote button */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Cotizaciones vinculadas a este trato</p>
                </div>
                <button
                  onClick={openQuoteModal}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" /> Nueva Cotización
                </button>
              </div>

              {quotesLoading ? (
                <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : quotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-3xl border border-gray-100">
                  <FileText className="h-10 w-10 text-gray-200" />
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Sin cotizaciones en este trato</p>
                  <button
                    onClick={openQuoteModal}
                    className="mt-2 flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" /> Generar primera cotización
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {quotes.map(q => {
                    const qs = QUOTE_STATUS[q.status] || QUOTE_STATUS.PENDING;
                    return (
                      <div
                        key={q.id}
                        className="bg-white rounded-3xl border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => setViewQuote(q)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="h-9 w-9 bg-emerald-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                            <FileText className="h-4 w-4 text-emerald-600" />
                          </div>
                          <span className={cn('text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest', qs.color)}>
                            {qs.label}
                          </span>
                        </div>
                        <p className="font-black text-gray-900 text-sm leading-tight mb-1">
                          {q.quoteNumber || `COT-${q.id.slice(-6).toUpperCase()}`}
                        </p>
                        <p className="text-[9px] font-bold text-gray-500 mb-3">
                          {q.clientName || q.client?.companyName || '—'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-emerald-600">{fmt(q.total || q.subtotal)}</span>
                          <span className="text-[7px] font-bold text-gray-400">{fmtDate(q.createdAt)}</span>
                        </div>
                        {q.templateType && (
                          <span className="mt-2 inline-block text-[7px] font-black uppercase px-2 py-0.5 rounded-lg bg-gray-50 text-gray-400">
                            {q.templateType}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
          {/* ── Tab: Resumen de actividades ──────────────────────────────────── */}
          {tab === 'summary' && (() => {
            const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
            const DAYS_SHORT   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

            // ── Helpers de período ──────────────────────────────────────────
            const toKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

            const getWeekStart = (d) => {
              const r = new Date(d); const day = r.getDay();
              r.setDate(r.getDate() - (day === 0 ? 6 : day - 1)); r.setHours(0,0,0,0); return r;
            };

            const periodLabel = () => {
              const y = sumRefDate.getFullYear(), mo = sumRefDate.getMonth(), day = sumRefDate.getDate();
              if (sumPeriod === 'day')   return sumRefDate.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
              if (sumPeriod === 'week')  { const ws = getWeekStart(sumRefDate); const we = new Date(ws); we.setDate(we.getDate()+6); return `${ws.getDate()} ${MONTHS_SHORT[ws.getMonth()]} – ${we.getDate()} ${MONTHS_SHORT[we.getMonth()]} ${y}`; }
              if (sumPeriod === 'month') return `${MONTHS_SHORT[mo]} ${y}`;
              return String(y);
            };

            const navPrev = () => setSumRefDate(d => {
              const n = new Date(d);
              if (sumPeriod === 'day')   { n.setDate(n.getDate() - 1); return n; }
              if (sumPeriod === 'week')  { n.setDate(n.getDate() - 7); return n; }
              if (sumPeriod === 'month') { n.setMonth(n.getMonth() - 1); return n; }
              n.setFullYear(n.getFullYear() - 1); return n;
            });
            const navNext = () => setSumRefDate(d => {
              const n = new Date(d);
              if (sumPeriod === 'day')   { n.setDate(n.getDate() + 1); return n; }
              if (sumPeriod === 'week')  { n.setDate(n.getDate() + 7); return n; }
              if (sumPeriod === 'month') { n.setMonth(n.getMonth() + 1); return n; }
              n.setFullYear(n.getFullYear() + 1); return n;
            });

            // ── Filtrar actividades al período ──────────────────────────────
            const periodActs = activities.filter(a => {
              const d = new Date(a.createdAt || '');
              if (isNaN(d)) return false;
              const y = sumRefDate.getFullYear(), mo = sumRefDate.getMonth();
              if (sumPeriod === 'day') {
                return toKey(d) === toKey(sumRefDate);
              }
              if (sumPeriod === 'week') {
                const ws = getWeekStart(sumRefDate);
                const we = new Date(ws); we.setDate(we.getDate() + 6);
                return d >= ws && d <= we;
              }
              if (sumPeriod === 'month') {
                return d.getFullYear() === y && d.getMonth() === mo;
              }
              return d.getFullYear() === y;
            });

            // ── Stats del período seleccionado ─────────────────────────────
            const byType     = periodActs.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {});
            const typeRanked = Object.entries(byType).sort((a, b) => b[1] - a[1]);
            const total      = periodActs.length;

            const BAR_COLORS = {
              NOTE:'#94a3b8', CALL:'#3b82f6', MESSAGE:'#14b8a6', EMAIL:'#a855f7',
              VISIT:'#22c55e', MEETING:'#f59e0b', SEGUIMIENTO:'#6366f1',
              TASK:'#10b981', QUOTE:'#f97316', STAGE_CHANGE:'#8b5cf6',
            };
            const SOLID_BG = {
              NOTE:'bg-gray-400', CALL:'bg-blue-500', MESSAGE:'bg-teal-500', EMAIL:'bg-purple-500',
              VISIT:'bg-green-500', MEETING:'bg-amber-500', SEGUIMIENTO:'bg-indigo-500',
              TASK:'bg-emerald-500', QUOTE:'bg-orange-500', STAGE_CHANGE:'bg-violet-500',
            };

            // ── Barras según período ────────────────────────────────────────
            const buildBars = () => {
              if (sumPeriod === 'day') {
                return Array.from({ length: 24 }, (_, h) => {
                  const count = periodActs.filter(a => new Date(a.createdAt).getHours() === h).length;
                  return { label: `${String(h).padStart(2,'0')}h`, count };
                });
              }
              if (sumPeriod === 'week') {
                const ws = getWeekStart(sumRefDate);
                return Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(ws); d.setDate(d.getDate() + i);
                  const key = toKey(d);
                  const count = periodActs.filter(a => (a.createdAt||'').startsWith(key)).length;
                  return { label: DAYS_SHORT[d.getDay()], sublabel: `${d.getDate()}/${MONTHS_SHORT[d.getMonth()]}`, count, isToday: key === toKey(new Date()) };
                });
              }
              if (sumPeriod === 'month') {
                const y = sumRefDate.getFullYear(), mo = sumRefDate.getMonth();
                const daysInMonth = new Date(y, mo + 1, 0).getDate();
                return Array.from({ length: daysInMonth }, (_, i) => {
                  const d = new Date(y, mo, i + 1);
                  const key = toKey(d);
                  const count = periodActs.filter(a => (a.createdAt||'').startsWith(key)).length;
                  return { label: String(i+1), count, isToday: key === toKey(new Date()) };
                });
              }
              // year
              return Array.from({ length: 12 }, (_, mo) => {
                const y = sumRefDate.getFullYear();
                const count = periodActs.filter(a => {
                  const d = new Date(a.createdAt); return d.getMonth() === mo;
                }).length;
                const isCurrentMonth = new Date().getFullYear() === y && new Date().getMonth() === mo;
                return { label: MONTHS_SHORT[mo], count, isToday: isCurrentMonth };
              });
            };
            const bars    = buildBars();
            const maxBar  = Math.max(1, ...bars.map(b => b.count));
            const showEvery = sumPeriod === 'month' ? 5 : 1;

            return (
              <motion.div key="summary" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">

                {/* ── Selector de período + navegación ─────────────────────── */}
                <div className="bg-white rounded-3xl border border-gray-100 p-4 flex flex-col sm:flex-row items-center gap-4">
                  {/* Toggle */}
                  <div className="flex rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0">
                    {[{ id:'day', label:'Día' }, { id:'week', label:'Semana' }, { id:'month', label:'Mes' }, { id:'year', label:'Año' }].map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setSumPeriod(p.id); setSumRefDate(new Date()); }}
                        className={cn(
                          'px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all',
                          sumPeriod === p.id ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
                        )}
                      >{p.label}</button>
                    ))}
                  </div>

                  {/* Navegación */}
                  <div className="flex items-center gap-3 flex-1 justify-center">
                    <button onClick={navPrev} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                      <ChevronDown className="h-4 w-4 text-gray-500 -rotate-90" />
                    </button>
                    <span className="text-sm font-black text-gray-900 capitalize min-w-[200px] text-center">{periodLabel()}</span>
                    <button onClick={navNext} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                      <ChevronDown className="h-4 w-4 text-gray-500 rotate-90" />
                    </button>
                  </div>

                  {/* Ir a hoy */}
                  <button onClick={() => setSumRefDate(new Date())} className="px-4 py-2 text-[10px] font-black bg-gray-100 hover:bg-gray-200 rounded-xl uppercase tracking-widest transition-colors flex-shrink-0">
                    Hoy
                  </button>
                </div>

                {/* ── KPI del período ───────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-900 text-white rounded-3xl p-5 col-span-2 sm:col-span-1">
                    <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-2">Total período</p>
                    <p className="text-5xl font-black leading-none">{total}</p>
                    <p className="text-[9px] font-bold opacity-40 mt-2">actividades</p>
                  </div>
                  {typeRanked.slice(0, 3).map(([type, count]) => {
                    const meta = ACTIVITY_TYPES.find(t => t.id === type);
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                      <div key={type} className={cn('rounded-3xl p-5', meta.bg)}>
                        <div className="flex items-center justify-between mb-2">
                          <p className={cn('text-[8px] font-black uppercase tracking-widest', meta.color)}>{meta.label}</p>
                          <div className={cn('h-6 w-6 rounded-lg flex items-center justify-center', SOLID_BG[type] || 'bg-gray-400')}>
                            <Icon className="h-3.5 w-3.5 text-white" />
                          </div>
                        </div>
                        <p className="text-4xl font-black text-gray-900 leading-none">{count}</p>
                        <p className="text-[8px] font-bold text-gray-400 mt-1">{Math.round(count/total*100)}% del total</p>
                      </div>
                    );
                  })}
                  {typeRanked.length < 3 && Array.from({ length: 3 - typeRanked.length }).map((_, i) => (
                    <div key={i} className="rounded-3xl p-5 bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
                      <p className="text-[9px] font-bold text-gray-300">—</p>
                    </div>
                  ))}
                </div>

                {/* ── Gráfica de barras ─────────────────────────────────────── */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Distribución</p>
                      <p className="text-base font-black text-gray-900">
                        { sumPeriod === 'day' ? 'Por hora' : sumPeriod === 'week' ? 'Por día' : sumPeriod === 'month' ? 'Por día del mes' : 'Por mes' }
                      </p>
                    </div>
                    <span className="text-[8px] font-black text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl">Máx: {maxBar}</span>
                  </div>
                  {total === 0 ? (
                    <div className="flex items-center justify-center h-28 text-gray-200">
                      <BarChart2 className="h-12 w-12" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-end gap-1 h-28">
                        {bars.map((bar, i) => {
                          const h = bar.count > 0 ? Math.max(6, Math.round((bar.count / maxBar) * 104)) : 3;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center group relative">
                              {bar.count > 0 && (
                                <div className="absolute bottom-full mb-1 bg-gray-900 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                  {bar.sublabel ? `${bar.label} ${bar.sublabel}` : bar.label}: {bar.count}
                                </div>
                              )}
                              <div
                                className={cn('w-full transition-all rounded-t-md', bar.isToday ? 'bg-primary' : bar.count > 0 ? 'bg-primary/40 group-hover:bg-primary/70' : 'bg-gray-100')}
                                style={{ height: h }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex mt-2">
                        {bars.map((bar, i) => (
                          <div key={i} className="flex-1 text-center">
                            {(i % showEvery === 0) && (
                              <span className="text-[7px] font-bold text-gray-300">{bar.label}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* ── Distribución por tipo (barras horizontales) ───────────── */}
                {total > 0 && (
                  <div className="bg-white rounded-3xl border border-gray-100 p-6">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Desglose</p>
                    <p className="text-base font-black text-gray-900 mb-5">Por tipo de actividad</p>
                    <div className="space-y-3">
                      {ACTIVITY_TYPES.map(meta => {
                        const count = byType[meta.id] || 0;
                        const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                        const Icon  = meta.icon;
                        return (
                          <div key={meta.id} className="flex items-center gap-3">
                            <div className={cn('h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0', count > 0 ? (SOLID_BG[meta.id] || 'bg-gray-400') : 'bg-gray-100')}>
                              <Icon className={cn('h-3.5 w-3.5', count > 0 ? 'text-white' : 'text-gray-300')} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className={cn('text-[10px] font-black', count > 0 ? 'text-gray-800' : 'text-gray-300')}>{meta.label}</span>
                                <div className="flex items-center gap-2">
                                  <span className={cn('text-[10px] font-black', count > 0 ? 'text-gray-900' : 'text-gray-300')}>{count}</span>
                                  <span className="text-[8px] font-bold text-gray-400 w-8 text-right">{pct}%</span>
                                </div>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, backgroundColor: BAR_COLORS[meta.id] || '#94a3b8' }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Chips de conteo (clicables) ──────────────────────────── */}
                <div className="bg-white rounded-3xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Conteo rápido — presiona para ver detalle</p>
                    {sumActiveType && (
                      <button onClick={() => setSumActiveType(null)} className="text-[9px] font-black text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors">
                        <X className="h-3 w-3" /> Limpiar filtro
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {ACTIVITY_TYPES.map(meta => {
                      const count    = byType[meta.id] || 0;
                      const Icon     = meta.icon;
                      const isActive = sumActiveType === meta.id;
                      return (
                        <button
                          key={meta.id}
                          onClick={() => setSumActiveType(isActive ? null : meta.id)}
                          disabled={count === 0}
                          className={cn(
                            'rounded-2xl p-4 flex flex-col gap-3 transition-all text-left group',
                            count > 0 ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'cursor-default opacity-60',
                            isActive ? cn(meta.bg, 'ring-2 ring-offset-2 shadow-md -translate-y-0.5', `ring-[${BAR_COLORS[meta.id]}]`) : count > 0 ? meta.bg : 'bg-gray-50',
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center transition-all', count > 0 ? (SOLID_BG[meta.id] || 'bg-gray-400') : 'bg-gray-200', isActive && 'scale-110')}>
                              <Icon className={cn('h-4 w-4', count > 0 ? 'text-white' : 'text-gray-300')} />
                            </div>
                            {count > 0 && (
                              <span className={cn('text-[8px] font-black px-2 py-0.5 rounded-lg bg-white/60', meta.color)}>
                                {Math.round(count/total*100)}%
                              </span>
                            )}
                          </div>
                          <div>
                            <p className={cn('text-[8px] font-black uppercase tracking-widest leading-tight', count > 0 ? meta.color : 'text-gray-400')}>{meta.label}</p>
                            <p className={cn('text-3xl font-black leading-tight', count > 0 ? 'text-gray-900' : 'text-gray-200')}>{count}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Panel de detalle al seleccionar tipo ─────────────────── */}
                <AnimatePresence>
                  {sumActiveType && (() => {
                    const meta     = ACTIVITY_TYPES.find(t => t.id === sumActiveType);
                    const Icon     = meta.icon;
                    const filtered = periodActs.filter(a => a.type === sumActiveType)
                      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    return (
                      <motion.div
                        key={sumActiveType}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className="bg-white rounded-3xl border border-gray-100 overflow-hidden"
                      >
                        {/* Header panel */}
                        <div className={cn('px-6 py-4 flex items-center justify-between', meta.bg)}>
                          <div className="flex items-center gap-3">
                            <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center', SOLID_BG[sumActiveType] || 'bg-gray-400')}>
                              <Icon className="h-4.5 w-4.5 text-white" />
                            </div>
                            <div>
                              <p className={cn('text-base font-black uppercase tracking-tight', meta.color)}>{meta.label}</p>
                              <p className="text-[9px] font-bold text-gray-500">{filtered.length} {filtered.length === 1 ? 'registro' : 'registros'} en el período</p>
                            </div>
                          </div>
                          <button onClick={() => setSumActiveType(null)} className="p-2 hover:bg-black/5 rounded-xl transition-colors">
                            <X className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>

                        {/* Lista */}
                        <div className="divide-y divide-gray-50">
                          {filtered.length === 0 ? (
                            <div className="py-12 flex flex-col items-center gap-2">
                              <Icon className="h-8 w-8 text-gray-200" />
                              <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Sin registros en este período</p>
                            </div>
                          ) : filtered.map((act, i) => {
                            const d = new Date(act.createdAt);
                            const isToday = toKey(d) === toKey(new Date());
                            return (
                              <div key={act.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50/50 transition-colors">
                                {/* Número */}
                                <div className={cn('h-7 w-7 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-black text-white mt-0.5', SOLID_BG[sumActiveType] || 'bg-gray-400')}>
                                  {i + 1}
                                </div>

                                {/* Contenido */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-gray-800 leading-snug">{act.content}</p>
                                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                    {act.authorName && (
                                      <span className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                                        <User className="h-2.5 w-2.5" /> {act.authorName}
                                      </span>
                                    )}
                                    {act.status && (
                                      <span className={cn(
                                        'text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest',
                                        act.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700'
                                          : act.status === 'FAILED' ? 'bg-red-100 text-red-600'
                                          : 'bg-amber-100 text-amber-700'
                                      )}>
                                        {act.status === 'COMPLETED' ? 'Completado' : act.status === 'FAILED' ? 'No completado' : 'Pendiente'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Fechas */}
                                <div className="text-right flex-shrink-0 space-y-1.5">
                                  {/* Creación */}
                                  <div>
                                    <p className="text-[7px] font-black text-gray-300 uppercase tracking-widest">Registrado</p>
                                    <p className={cn('text-[10px] font-black', isToday ? 'text-primary' : 'text-gray-600')}>
                                      {isToday ? 'Hoy' : d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                                    </p>
                                    <p className="text-[9px] font-bold text-gray-400">
                                      {d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                  {/* Programado */}
                                  {act.dueDate && (() => {
                                    const due      = new Date(act.dueDate);
                                    const dueKey   = due.toISOString().split('T')[0];
                                    const todayKey2 = toKey(new Date());
                                    const isPast   = dueKey < todayKey2 && act.status !== 'COMPLETED';
                                    const isDueToday = dueKey === todayKey2;
                                    return (
                                      <div className={cn(
                                        'px-2 py-1 rounded-xl',
                                        isPast    ? 'bg-red-50'     : isDueToday ? 'bg-amber-50' : 'bg-blue-50'
                                      )}>
                                        <p className={cn('text-[7px] font-black uppercase tracking-widest',
                                          isPast ? 'text-red-400' : isDueToday ? 'text-amber-500' : 'text-blue-400'
                                        )}>Programado</p>
                                        <p className={cn('text-[10px] font-black',
                                          isPast ? 'text-red-600' : isDueToday ? 'text-amber-600' : 'text-blue-600'
                                        )}>
                                          {isDueToday ? 'Hoy' : due.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </p>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>

              </motion.div>
            );
          })()}

        </AnimatePresence>
      </div>

      {/* ── Modal: Razón de cierre ────────────────────────────────────────────── */}
      <AnimatePresence>
        {closeModal.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md"
            >
              <form onSubmit={handleCloseReason} className="p-7 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest mb-3',
                      closeModal.stage === 'CLOSED_WON' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                    )}>
                      {closeModal.stage === 'CLOSED_WON' ? '🏆 Venta Ganada' : '❌ Venta Perdida'}
                    </div>
                    <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tighter">
                      {closeModal.stage === 'CLOSED_WON' ? '¿Por qué se ganó?' : '¿Por qué se perdió?'}
                    </h3>
                  </div>
                  <button type="button" onClick={() => setCloseModal(p => ({ ...p, show: false }))} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
                <textarea
                  required rows={4}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-sm outline-none border border-gray-200 focus:ring-2 resize-none"
                  placeholder={closeModal.stage === 'CLOSED_WON' ? 'Ej: Precio competitivo, relación a largo plazo...' : 'Ej: Precio fuera de presupuesto, eligieron a otro proveedor...'}
                  value={closeModal.reason}
                  onChange={e => setCloseModal(p => ({ ...p, reason: e.target.value }))}
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setCloseModal(p => ({ ...p, show: false }))} className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-gray-200 text-gray-500 hover:bg-gray-50">Cancelar</button>
                  <button
                    type="submit" disabled={closeModal.saving}
                    className={cn('flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-white disabled:opacity-50',
                      closeModal.stage === 'CLOSED_WON' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
                    )}
                  >
                    {closeModal.saving ? 'Guardando...' : 'Confirmar Cierre'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Datos de cliente para cotización ──────────────────────────── */}
      <AnimatePresence>
        {quoteModal.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md"
            >
              <form onSubmit={handleConfirmQuote} className="p-7 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tighter flex items-center gap-2">
                      <FileText className="h-5 w-5 text-emerald-600" /> Generar Cotización
                    </h3>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Confirma los datos del cliente</p>
                  </div>
                  <button type="button" onClick={() => setQuoteModal(p => ({ ...p, show: false }))} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
                <div className="space-y-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Datos del Cliente</p>
                  <input required className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none border border-gray-200" placeholder="Empresa *" value={quoteModal.company} onChange={e => setQuoteModal(p => ({ ...p, company: e.target.value }))} />
                  <input className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none border border-gray-200" placeholder="Nombre del contacto" value={quoteModal.contactName} onChange={e => setQuoteModal(p => ({ ...p, contactName: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <input required type="email" className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none border border-gray-200" placeholder="Email *" value={quoteModal.email} onChange={e => setQuoteModal(p => ({ ...p, email: e.target.value }))} />
                    <input className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none border border-gray-200" placeholder="Teléfono" value={quoteModal.phone} onChange={e => setQuoteModal(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                  <input className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none border border-gray-200 uppercase" placeholder="RFC" maxLength={13} value={quoteModal.rfc} onChange={e => setQuoteModal(p => ({ ...p, rfc: e.target.value.toUpperCase() }))} />
                  <input className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none border border-gray-200" placeholder="Dirección" value={quoteModal.address} onChange={e => setQuoteModal(p => ({ ...p, address: e.target.value }))} />
                </div>
                <button type="submit" disabled={quoteModal.saving} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  <FileText className="h-4 w-4" /> {quoteModal.saving ? 'Procesando...' : 'Continuar a Cotización'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Ver cotización ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewQuote && (() => {
          const qs = QUOTE_STATUS[viewQuote.status] || QUOTE_STATUS.PENDING;
          const QIcon = qs.icon;
          const isPre = (viewQuote.templateType || 'PRESUPUESTO') === 'PRESUPUESTO';
          const accent = isPre ? '#1d4ed8' : '#16823c';
          const accentBg = isPre ? '#f0f6ff' : '#f0fdf4';
          const accentBorder = isPre ? '#bfdbfe' : '#bbf7d0';
          return (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
              onClick={e => { if (e.target === e.currentTarget) setViewQuote(null); }}
            >
              <motion.div
                initial={{ opacity: 0, y: 80 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 80 }}
                className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"
              >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">
                          {viewQuote.quoteNumber}
                        </h3>
                        <span className={cn('flex items-center gap-1 text-[8px] font-black uppercase px-2.5 py-1 rounded-full border', qs.bg, qs.text, qs.border)}>
                          <QIcon className="h-2.5 w-2.5" />{qs.label}
                        </span>
                      </div>
                      <p className="text-[9px] font-bold text-gray-400 mt-1">
                        {viewQuote.client?.companyName} · Creada {fmtDate(viewQuote.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => downloadQuotePDF(viewQuote.id, viewQuote.quoteNumber)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all"
                      >
                        <Download className="h-3.5 w-3.5" /> PDF
                      </button>
                      <button onClick={() => setViewQuote(null)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Contenido */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                  {/* Cliente + Proyecto */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                      <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">
                        {isPre ? 'Referencias de Proyecto' : 'Facturar a'}
                      </p>
                      <p className="font-black text-gray-900">{viewQuote.client?.companyName}</p>
                      {viewQuote.contactName && (
                        <p className="text-[9px] font-bold flex items-center gap-1" style={{ color: accent }}>
                          <User className="h-3 w-3" /> {viewQuote.contactName}
                        </p>
                      )}
                      <p className="text-[9px] font-bold text-gray-500">{viewQuote.client?.address || '—'}</p>
                      <p className="text-[9px] font-bold text-gray-500">{viewQuote.client?.email}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
                      <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Detalle del Proyecto</p>
                      <p className="font-bold text-gray-900 text-sm">{viewQuote.projectName || '—'}</p>
                      <p className="text-[9px] font-bold text-gray-500 flex items-center gap-1">
                        <User className="h-3 w-3" /> Creado por: {viewQuote.creator?.name || '—'}
                      </p>
                      <p className="text-[9px] font-bold text-gray-500 flex items-center gap-1">
                        <User className="h-3 w-3" /> {isPre ? 'Asesor' : 'Vendedor'}: {viewQuote.seller?.name || 'Sin asignar'}
                      </p>
                      <p className="text-[9px] font-bold text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Vigente hasta: {fmtDate(viewQuote.validUntil)}
                      </p>
                    </div>
                  </div>

                  {/* Requerimientos */}
                  {viewQuote.requirements?.trim() && (
                    <div style={{ background: accentBg, border: `1.5px solid ${accentBorder}`, borderRadius: 16, padding: '14px 18px' }}>
                      <p style={{ fontSize: 8, fontWeight: 900, color: accent, textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 6 }}>
                        Requerimientos del cliente
                      </p>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>
                        {viewQuote.requirements}
                      </p>
                    </div>
                  )}

                  {/* Tabla conceptos */}
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Package className="h-3 w-3" /> Conceptos
                    </p>
                    <div className="border border-gray-100 rounded-2xl overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 p-3 bg-gray-900 text-white text-[7px] font-black uppercase tracking-widest">
                        <span className="col-span-1">#</span>
                        <span className="col-span-2">Nº Serie</span>
                        <span className="col-span-4">Descripción</span>
                        <span className="col-span-1 text-center">Cant.</span>
                        <span className="col-span-2 text-right">P. Unit.</span>
                        <span className="col-span-2 text-right">Importe</span>
                      </div>
                      {(viewQuote.items || []).map((item, i) => (
                        <div key={i} className={cn('grid grid-cols-12 gap-2 p-3 text-xs items-start border-t border-gray-50', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                          <span className="col-span-1 font-black text-gray-400">{String(i + 1).padStart(2, '0')}</span>
                          <span className="col-span-2 font-black text-gray-600 uppercase text-[9px]">{item.serial || '—'}</span>
                          <div className="col-span-4">
                            <p className="font-bold text-gray-900 text-[10px] leading-tight">{item.name}</p>
                            {item.desc && <p className="text-[8px] text-gray-400 mt-0.5">{item.desc}</p>}
                          </div>
                          <span className="col-span-1 text-center font-bold text-gray-600">{item.qty}</span>
                          <span className="col-span-2 text-right font-bold text-gray-600">{fmt(item.price)}</span>
                          <span className="col-span-2 text-right font-black text-gray-900">{fmt(Number(item.qty) * Number(item.price))}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totales */}
                  <div className="flex justify-end">
                    <div className="bg-gray-900 rounded-2xl p-6 text-white space-y-2 w-full max-w-sm">
                      <div className="flex justify-between text-[10px] font-black opacity-50">
                        <span>Subtotal</span><span>{fmt(viewQuote.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black opacity-50">
                        <span>IVA (16%)</span><span>{fmt(viewQuote.tax)}</span>
                      </div>
                      {viewQuote.adjustment !== 0 && (
                        <div className="flex justify-between text-[10px] font-black opacity-50">
                          <span>Promoción</span><span>{fmt(viewQuote.adjustment)}</span>
                        </div>
                      )}
                      <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                        <span className="font-black uppercase" style={{ color: accent }}>Inversión Total</span>
                        <span className="text-2xl font-black">{fmt(viewQuote.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Términos */}
                  {viewQuote.terms && (
                    <div className="p-4 bg-amber-50 rounded-2xl">
                      <p className="text-[7px] font-black text-amber-600 uppercase tracking-widest mb-1">Términos y Condiciones</p>
                      <p className="text-[10px] font-bold text-gray-600">{viewQuote.terms}</p>
                    </div>
                  )}

                  {/* Observaciones */}
                  {viewQuote.observations?.trim() && (
                    <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                      <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-2">Observaciones</p>
                      <p className="text-[10px] font-bold text-gray-700 whitespace-pre-wrap">{viewQuote.observations}</p>
                    </div>
                  )}

                  {/* Acciones de estado */}
                  <div className="border-t border-gray-100 pt-5">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3">Cambiar estado</p>
                    <div className="flex gap-3 flex-wrap">
                      {viewQuote.status !== 'ACCEPTED' && (
                        <button onClick={() => updateQuoteStatus(viewQuote.id, 'ACCEPTED')}
                          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 transition-all">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Aprobada
                        </button>
                      )}
                      {viewQuote.status !== 'REJECTED' && (
                        <button onClick={() => updateQuoteStatus(viewQuote.id, 'REJECTED')}
                          className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-600 transition-all">
                          <X className="h-3.5 w-3.5" /> No concretada
                        </button>
                      )}
                      {viewQuote.status !== 'PENDING' && (
                        <button onClick={() => updateQuoteStatus(viewQuote.id, 'PENDING')}
                          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-amber-600 transition-all">
                          <Clock className="h-3.5 w-3.5" /> Pendiente
                        </button>
                      )}
                      <button onClick={() => updateQuoteStatus(viewQuote.id, 'EXPIRED')}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 text-gray-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-300 transition-all">
                        <AlertCircle className="h-3.5 w-3.5" /> Expirada
                      </button>
                      <button onClick={() => deleteQuote(viewQuote.id)}
                        className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-100 transition-all">
                        <Trash2 className="h-3.5 w-3.5" /> Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
