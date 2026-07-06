import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus, X, Save, Trash2, ChevronRight, DollarSign, Calendar,
  User, Building2, Mail, Phone, Target, TrendingUp, Activity,
  MessageSquare, PhoneCall, Send, Coffee, CheckSquare, Clock,
  Edit3, Link2, ChevronDown, Award, AlertCircle, Search, Filter,
  BarChart2, Percent, SlidersHorizontal, ArrowRight, FileText,
  ClipboardList, Hash, Loader2, MessageCircle, MapPin, ClipboardCheck,
  LayoutGrid, List, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/store/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

// ── Etapas del pipeline (fallback; se reemplazan con lo guardado en config) ────
const DEAL_STAGES_DEFAULT = [
  { id: 'QUALIFICATION',             label: 'Lead / Prospecto',           prob: 10,  color: 'bg-slate-400',   ring: 'ring-slate-200',   text: 'text-slate-600',  bg: 'bg-slate-50' },
  { id: 'NEEDS_ANALYSIS',            label: 'Acercamiento',               prob: 20,  color: 'bg-blue-400',    ring: 'ring-blue-200',    text: 'text-blue-600',   bg: 'bg-blue-50' },
  { id: 'VALUE_PROPOSITION',         label: 'Contacto decisor',           prob: 30,  color: 'bg-indigo-500',  ring: 'ring-indigo-200',  text: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'IDENTIFY_DECISION_MAKERS',  label: 'Oportunidad detectada',      prob: 40,  color: 'bg-violet-500',  ring: 'ring-violet-200',  text: 'text-violet-600', bg: 'bg-violet-50' },
  { id: 'PROPOSAL_PRICE_QUOTE',      label: 'Levantamiento técnico',      prob: 50,  color: 'bg-amber-500',   ring: 'ring-amber-200',   text: 'text-amber-700',  bg: 'bg-amber-50' },
  { id: 'PROPOSAL_SENT',             label: 'Cotización enviada',         prob: 65,  color: 'bg-orange-500',  ring: 'ring-orange-200',  text: 'text-orange-700', bg: 'bg-orange-50' },
  { id: 'NEGOTIATION_1',             label: 'Negociación 1',              prob: 75,  color: 'bg-purple-500',  ring: 'ring-purple-200',  text: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'RECOTIZACION',              label: 'Recotización',               prob: 80,  color: 'bg-pink-500',    ring: 'ring-pink-200',    text: 'text-pink-600',   bg: 'bg-pink-50' },
  { id: 'NEGOTIATION_2',             label: 'Negociación 2',              prob: 90,  color: 'bg-rose-500',    ring: 'ring-rose-200',    text: 'text-rose-600',   bg: 'bg-rose-50' },
  { id: 'CLOSED_WON_PENDING',        label: 'En espera de autorización',  prob: 95,  color: 'bg-yellow-500',  ring: 'ring-yellow-200',  text: 'text-yellow-700', bg: 'bg-yellow-50' },
  { id: 'CLOSED_WON',                label: 'Ganado',                     prob: 100, color: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700',bg: 'bg-emerald-50' },
  { id: 'CLOSED_LOST',               label: 'Perdido',                    prob: 0,   color: 'bg-red-500',     ring: 'ring-red-200',     text: 'text-red-600',    bg: 'bg-red-50' },
];

// Normaliza etapas guardadas desde PipelineSettings (que usa `probability`) al
// formato interno de DealsKanban (que usa `prob` + ring/text derivados)
function normalizeStages(raw) {
  return raw.map(s => {
    const base = DEAL_STAGES_DEFAULT.find(d => d.id === s.id) || {};
    return {
      ...base,
      ...s,
      prob: s.prob ?? s.probability ?? base.prob ?? 0,
      ring: s.ring ?? base.ring ?? 'ring-gray-200',
      text: s.text ?? base.text ?? 'text-gray-600',
      bg:   (s.bg ?? base.bg ?? 'bg-gray-50').replace('/30', ''),
    };
  });
}

const ACTIVITY_TYPES = [
  { id: 'NOTE',        label: 'Nota',         icon: MessageSquare,  color: 'text-gray-500' },
  { id: 'CALL',        label: 'Llamada',       icon: PhoneCall,      color: 'text-blue-500' },
  { id: 'MESSAGE',     label: 'Mensaje',       icon: MessageCircle,  color: 'text-teal-500' },
  { id: 'EMAIL',       label: 'Correo',        icon: Send,           color: 'text-purple-500' },
  { id: 'VISIT',       label: 'Visita',        icon: MapPin,         color: 'text-green-500' },
  { id: 'MEETING',     label: 'Reunión',       icon: Coffee,         color: 'text-amber-500' },
  { id: 'SEGUIMIENTO', label: 'Seguimiento',   icon: ClipboardCheck, color: 'text-primary' },
  { id: 'TASK',        label: 'Tarea',         icon: CheckSquare,    color: 'text-emerald-500' },
  { id: 'QUOTE',       label: 'Cotización',    icon: FileText,       color: 'text-orange-500' },
];

const SOURCES = ['Web', 'Referido', 'LinkedIn', 'Facebook', 'Llamada en frío', 'Evento', 'Otro'];

const QUOTE_STAGES = ['PROPOSAL_PRICE_QUOTE', 'PROPOSAL_SENT', 'RECOTIZACION'];

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
};

// ── Componente Principal ───────────────────────────────────────────────────────
const emptyDeal = () => ({
  title: '', value: '', company: '', contactName: '', contactEmail: '',
  contactPhone: '', clientId: '', stage: 'QUALIFICATION',
  source: 'Web', expectedClose: '', description: ''
});

export default function DealsKanban() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dealStages, setDealStages] = useState(DEAL_STAGES_DEFAULT);
  const stageMap = useMemo(() => Object.fromEntries(dealStages.map(s => [s.id, s])), [dealStages]);

  const [deals, setDeals] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [filterStage, setFilterStage] = useState('ALL');


  // Modal nuevo deal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeal, setNewDeal] = useState(emptyDeal());
  const [selectedLeadId, setSelectedLeadId] = useState(''); // lead a importar

  // Drag & Drop
  const [draggedDeal, setDraggedDeal] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  // Modal razón de cierre (ganado/perdido — solo para drag & drop)
  const [closeModal, setCloseModal] = useState({ show: false, stage: '', reason: '', saving: false, pendingDrop: null });

  // Seguimientos (para lista view)
  const [seguimientos, setSeguimientos] = useState([]);

  // ── Fetches ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsRes, clientsRes, empRes, leadsRes] = await Promise.all([
        apiFetch('/api/crm/deals'),
        apiFetch('/api/crm/clients'),
        apiFetch('/api/employees'),
        apiFetch('/api/crm/leads'),
      ]);
      const [d, c, e, l] = await Promise.all([dealsRes.json(), clientsRes.json(), empRes.json(), leadsRes.json()]);
      setDeals(Array.isArray(d) ? d : []);
      setClients(Array.isArray(c) ? c : []);
      setEmployees(Array.isArray(e) ? e : []);
      setLeads(Array.isArray(l) ? l : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const fetchSeguimientos = useCallback(async () => {
    try {
      const res = await apiFetch('/api/crm/activity-feed?limit=1000');
      const data = await res.json();
      setSeguimientos(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchSeguimientos();
    apiFetch('/api/config?key=CRM_PIPELINE_STAGES')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data) && data.length > 0) setDealStages(normalizeStages(data)); })
      .catch(() => {});
  }, [fetchAll]);

  // ── Si viene de SalesPipeline con "Convertir a Deal", pre-cargar el modal ────
  useEffect(() => {
    const fromLead = location.state?.fromLead;
    if (fromLead) {
      importLead(fromLead);
      // Limpiar el state para que al navegar de vuelta no re-abra el modal
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Rellena el formulario del modal con datos de un lead
  const importLead = (lead) => {
    setNewDeal({
      title:        lead.name || '',
      value:        lead.estimatedValue || '',
      company:      lead.company || '',
      contactName:  lead.name || '',
      contactEmail: lead.email || '',
      contactPhone: lead.phone || '',
      clientId:     '',
      stage:        'QUALIFICATION',
      source:       lead.source || 'Web',
      expectedClose: '',
      description:  lead.notes || '',
    });
    setSelectedLeadId(lead.id);
    setShowAddModal(true);
  };

  // ── Navegar al detalle del deal ──────────────────────────────────────────────
  const openDeal = (deal) => navigate(`/crm/deals/${deal.id}`);

  // ── Guardar etapa (drag & drop) ──────────────────────────────────────────────
  const [savingStage, setSavingStage] = useState(false);
  const applyStageChange = async (dealId, newStage, closeReason = null) => {
    const prob = stageMap[newStage]?.prob ?? 0;
    setSavingStage(true);
    try {
      const body = { id: dealId, stage: newStage, probability: prob };
      if (closeReason) body.closeReason = closeReason;
      const res = await apiFetch('/api/crm/deals', { method: 'PUT', body: JSON.stringify(body) });
      if (res.ok) {
        const deal = await res.json();
        setDeals(prev => prev.map(d => d.id === deal.id ? deal : d));
      }
    } catch (err) { console.error(err); }
    finally { setSavingStage(false); }
  };

  // ── Submit modal razón de cierre ─────────────────────────────────────────────
  const handleCloseReasonSubmit = async (e) => {
    e.preventDefault();
    setCloseModal(prev => ({ ...prev, saving: true }));
    await applyStageChange(closeModal.pendingDrop.id, closeModal.stage, closeModal.reason);
    setCloseModal({ show: false, stage: '', reason: '', saving: false, pendingDrop: null });
  };

  // ── Crear nuevo deal ─────────────────────────────────────────────────────────
  const handleAddDeal = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/crm/deals', {
        method: 'POST',
        body: JSON.stringify({ ...newDeal, value: parseFloat(newDeal.value) || 0 })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewDeal(emptyDeal());
        setSelectedLeadId('');
        fetchAll();
      }
    } catch (err) { alert('Error de red'); }
  };

  // ── Eliminar deal ────────────────────────────────────────────────────────────
  const deleteDeal = async (deal) => {
    if (!window.confirm(`¿Eliminar "${deal.title}"?`)) return;
    try {
      const res = await apiFetch('/api/crm/deals', { method: 'DELETE', body: JSON.stringify({ id: deal.id }) });
      if (res.ok) {
        setDeals(prev => prev.filter(d => d.id !== deal.id));
      }
    } catch (err) { console.error(err); }
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────────
  const handleDrop = (stageId) => {
    if (!draggedDeal || draggedDeal.stage === stageId) { setDraggedDeal(null); setDragOverStage(null); return; }
    const pending = { ...draggedDeal };
    setDraggedDeal(null); setDragOverStage(null);

    if (stageId === 'CLOSED_WON' || stageId === 'CLOSED_LOST') {
      setCloseModal({ show: true, stage: stageId, reason: '', saving: false, pendingDrop: pending });
    } else {
      applyStageChange(pending.id, stageId);
    }
  };


  // ── Filtrado y métricas ──────────────────────────────────────────────────────
  const filteredDeals = deals.filter(d => {
    const matchSearch = !searchTerm || [d.title, d.company, d.contactName].some(v => v?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStage = filterStage === 'ALL' || d.stage === filterStage;
    return matchSearch && matchStage;
  });

  const totalPipeline = deals.filter(d => d.stage !== 'CLOSED_LOST').reduce((s, d) => s + (d.value || 0), 0);
  const totalWon = deals.filter(d => d.stage === 'CLOSED_WON').reduce((s, d) => s + (d.value || 0), 0);
  const totalActive = deals.filter(d => !['CLOSED_WON', 'CLOSED_LOST'].includes(d.stage)).length;
  const weightedForecast = deals.filter(d => !['CLOSED_LOST'].includes(d.stage)).reduce((s, d) => s + (d.value || 0) * (d.probability / 100), 0);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <Activity className="h-10 w-10 text-primary animate-pulse" />
      <p className="font-black text-gray-400 text-[10px] uppercase tracking-widest">Cargando Pipeline CRM...</p>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* ── Área principal ────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden w-full">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-white border-b border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Pipeline</h2>
              <p className="text-gray-400 font-bold text-[10px] mt-0.5 uppercase tracking-widest flex items-center gap-2">
                <Target className="h-3 w-3 text-primary" /> Tratos / Oportunidades — OleaControls CRM
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Toggle vista */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                    viewMode === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  )}
                  title="Vista Kanban"
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Kanban
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                    viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  )}
                  title="Vista Lista"
                >
                  <List className="h-3.5 w-3.5" /> Lista
                </button>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-lg"
              >
                <Plus className="h-4 w-4" /> Nuevo Trato
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Pipeline Total', value: fmt(totalPipeline), icon: BarChart2, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Ganado', value: fmt(totalWon), icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Tratos Activos', value: totalActive, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Pronóstico Pond.', value: fmt(weightedForecast), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={cn("flex items-center gap-3 p-3 rounded-2xl border border-gray-100", bg)}>
                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center bg-white shadow-sm", color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                  <p className={cn("text-sm font-black", color)}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex gap-3 mt-3">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 flex-1 max-w-xs">
              <Search className="h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar trato..."
                className="bg-transparent border-none outline-none font-bold text-xs text-gray-900 w-full"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="bg-gray-50 rounded-xl px-3 py-2 font-black text-[10px] uppercase text-gray-600 outline-none border-none cursor-pointer"
              value={filterStage}
              onChange={e => setFilterStage(e.target.value)}
            >
              <option value="ALL">Todas las etapas</option>
              {dealStages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* ── Board / Lista ───────────────────────────────────────────────── */}
        {viewMode === 'kanban' ? (
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-x-auto overflow-y-hidden">
              <div className="flex gap-3 h-full p-4 pb-4 min-w-max">
              {dealStages.map((stage) => {
                const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
                const stageValue = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
                const isOver = dragOverStage === stage.id;

                return (
                  <div
                    key={stage.id}
                    className={cn(
                      "w-64 h-full flex flex-col flex-shrink-0 rounded-3xl transition-all duration-200",
                      stage.bg,
                      isOver ? `ring-2 ${stage.ring} scale-[1.01]` : ''
                    )}
                    onDragOver={e => { e.preventDefault(); setDragOverStage(stage.id); }}
                    onDragLeave={() => setDragOverStage(null)}
                    onDrop={() => handleDrop(stage.id)}
                  >
                    {/* Cabecera columna */}
                    <div className="p-3 space-y-1 sticky top-0 bg-white/80 backdrop-blur-sm rounded-t-3xl border-b border-black/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2.5 h-2.5 rounded-full", stage.color)} />
                          <span className="text-[9px] font-black text-gray-800 uppercase tracking-wider leading-tight">{stage.label}</span>
                        </div>
                        <span className="text-[8px] font-black bg-white rounded-lg px-2 py-0.5 text-gray-500 shadow-sm">{stageDeals.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={cn("text-[8px] font-bold", stage.text)}>{stage.prob}% prob.</span>
                        <span className="text-[8px] font-black text-gray-700">{fmt(stageValue)}</span>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2">
                      <AnimatePresence>
                        {stageDeals.map(deal => (
                          <DealCard
                            key={deal.id}
                            deal={deal}
                            stage={stage}

                            onClick={() => openDeal(deal)}
                            onDelete={() => deleteDeal(deal)}
                            onDragStart={() => setDraggedDeal(deal)}
                            onDragEnd={() => setDraggedDeal(null)}
                          />
                        ))}
                      </AnimatePresence>
                      {stageDeals.length === 0 && (
                        <div className="h-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-black/10">
                          <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Arrastra aquí</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        ) : (
          <PipelineListView
            filteredDeals={filteredDeals}
            dealStages={dealStages}
            seguimientos={seguimientos}
            onDeal={openDeal}
          />
        )}
      </div>

      {/* ── Modal: Nuevo Trato ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
            >
              <form onSubmit={handleAddDeal} className="p-7 space-y-6">
                <div className="flex justify-between items-center border-b pb-5">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Nuevo Trato</h3>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Pipeline OleaControls CRM</p>
                  </div>
                  <button type="button" onClick={() => { setShowAddModal(false); setSelectedLeadId(''); setNewDeal(emptyDeal()); }} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                {/* Importar desde Lead */}
                {leads.length > 0 && (
                  <div className="p-4 bg-amber-50/70 rounded-2xl space-y-2 border border-amber-100">
                    <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
                      <ArrowRight className="h-3 w-3" /> Importar desde Lead existente
                    </p>
                    <select
                      className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none cursor-pointer border border-amber-200 text-gray-700"
                      value={selectedLeadId}
                      onChange={e => {
                        const lead = leads.find(l => l.id === e.target.value);
                        if (lead) importLead(lead);
                        else { setSelectedLeadId(''); setNewDeal(emptyDeal()); }
                      }}
                    >
                      <option value="">— Seleccionar lead para importar datos —</option>
                      {leads.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name}{l.company ? ` · ${l.company}` : ''}
                        </option>
                      ))}
                    </select>
                    {selectedLeadId && (
                      <p className="text-[8px] font-bold text-amber-600">Datos importados del lead. Puedes editarlos antes de crear el trato.</p>
                    )}
                  </div>
                )}

                {/* Título + Valor */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Nombre del Trato *</label>
                    <input required className="w-full bg-gray-50 rounded-xl px-5 py-4 font-black text-sm outline-none focus:ring-2 ring-primary/20" placeholder="Ej: Proyecto CCTV Plaza Norte" value={newDeal.title} onChange={e => setNewDeal(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Valor Estimado</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="number" className="w-full bg-gray-50 rounded-xl pl-10 pr-4 py-4 font-black text-sm outline-none focus:ring-2 ring-primary/20" placeholder="0" value={newDeal.value} onChange={e => setNewDeal(f => ({ ...f, value: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Cierre Esperado</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input type="date" className="w-full bg-gray-50 rounded-xl pl-10 pr-4 py-4 font-black text-sm outline-none focus:ring-2 ring-primary/20" value={newDeal.expectedClose} onChange={e => setNewDeal(f => ({ ...f, expectedClose: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Etapa + Fuente */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Etapa Inicial</label>
                    <select className="w-full bg-gray-50 rounded-xl px-4 py-4 font-black text-xs outline-none cursor-pointer" value={newDeal.stage} onChange={e => setNewDeal(f => ({ ...f, stage: e.target.value }))}>
                      {dealStages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Fuente</label>
                    <input
                      list="deal-sources-new"
                      className="w-full bg-gray-50 rounded-xl px-4 py-4 font-black text-xs outline-none focus:ring-2 ring-primary/20"
                      placeholder="Ej. Web, Referido…"
                      value={newDeal.source}
                      onChange={e => setNewDeal(f => ({ ...f, source: e.target.value }))}
                    />
                    <datalist id="deal-sources-new">
                      {SOURCES.map(s => <option key={s} value={s} />)}
                    </datalist>
                  </div>
                </div>

                {/* Contacto */}
                <div className="p-4 bg-blue-50/60 rounded-2xl space-y-3">
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Contacto</p>
                  <div className="grid grid-cols-1 gap-3">
                    <input className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none" placeholder="Nombre del contacto" value={newDeal.contactName} onChange={e => setNewDeal(f => ({ ...f, contactName: e.target.value }))} />
                    <input className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none" placeholder="Empresa / Organización" value={newDeal.company} onChange={e => setNewDeal(f => ({ ...f, company: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="email" className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none" placeholder="Email" value={newDeal.contactEmail} onChange={e => setNewDeal(f => ({ ...f, contactEmail: e.target.value }))} />
                      <input className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none" placeholder="Teléfono" value={newDeal.contactPhone} onChange={e => setNewDeal(f => ({ ...f, contactPhone: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* Asignación */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Cliente Vinculado</label>
                    <select className="w-full bg-gray-50 rounded-xl px-4 py-4 font-bold text-xs outline-none cursor-pointer" value={newDeal.clientId} onChange={e => setNewDeal(f => ({ ...f, clientId: e.target.value }))}>
                      <option value="">— Sin cliente —</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1">Asignado a</label>
                    <select className="w-full bg-gray-50 rounded-xl px-4 py-4 font-bold text-xs outline-none cursor-pointer" value={newDeal.assignedToId} onChange={e => setNewDeal(f => ({ ...f, assignedToId: e.target.value }))}>
                      <option value="">— Sin asignar —</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all shadow-lg">
                  <Plus className="h-4 w-4 inline mr-2" /> Crear Trato en Pipeline
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Razón de cierre (Ganado / Perdido) ──────────────────────── */}
      <AnimatePresence>
        {closeModal.show && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md"
            >
              <form onSubmit={handleCloseReasonSubmit} className="p-7 space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className={cn(
                      "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest mb-3",
                      closeModal.stage === 'CLOSED_WON'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                    )}>
                      {closeModal.stage === 'CLOSED_WON' ? '🏆 Venta Ganada' : '❌ Venta Perdida'}
                    </div>
                    <h3 className="text-lg font-black text-gray-900 uppercase italic tracking-tighter">
                      {closeModal.stage === 'CLOSED_WON' ? '¿Por qué se ganó?' : '¿Por qué se perdió?'}
                    </h3>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
                      {closeModal.pendingDrop?.title}
                    </p>
                  </div>
                  <button type="button" onClick={() => setCloseModal(prev => ({ ...prev, show: false }))} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>

                <div className={cn(
                  "space-y-3 p-4 rounded-2xl border",
                  closeModal.stage === 'CLOSED_WON' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'
                )}>
                  <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block">
                    {closeModal.stage === 'CLOSED_WON' ? 'Motivo del cierre exitoso *' : 'Motivo de pérdida *'}
                  </label>
                  <textarea
                    required
                    rows={4}
                    className="w-full bg-white rounded-xl px-4 py-3 font-bold text-sm outline-none border border-gray-200 focus:ring-2 resize-none"
                    style={{ '--tw-ring-color': closeModal.stage === 'CLOSED_WON' ? '#10b981' : '#ef4444' }}
                    placeholder={closeModal.stage === 'CLOSED_WON'
                      ? 'Ej: Precio competitivo, relación a largo plazo, solución técnica superior...'
                      : 'Ej: Precio fuera de presupuesto, eligieron a otro proveedor, proyecto cancelado...'}
                    value={closeModal.reason}
                    onChange={e => setCloseModal(prev => ({ ...prev, reason: e.target.value }))}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setCloseModal(prev => ({ ...prev, show: false }))}
                    className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={closeModal.saving}
                    className={cn(
                      "flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50",
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

    </div>
  );
}

// ── Deal Card ──────────────────────────────────────────────────────────────────
function DealCard({ deal, stage, onClick, onDelete, onDragStart, onDragEnd }) {
  // Días hasta el cierre
  const daysUntilClose = deal.expectedClose
    ? Math.ceil((new Date(deal.expectedClose) - Date.now()) / 86400000)
    : null;
  const closeColor = daysUntilClose === null ? null
    : daysUntilClose < 0   ? 'text-red-500'
    : daysUntilClose <= 7  ? 'text-amber-500'
    : 'text-emerald-600';
  const closeLabel = daysUntilClose === null ? null
    : daysUntilClose < 0   ? `Vencido ${Math.abs(daysUntilClose)}d`
    : daysUntilClose === 0 ? 'Hoy'
    : `${daysUntilClose}d restantes`;

  const prob = deal.probability ?? stage.prob ?? 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl border cursor-pointer transition-all group select-none overflow-hidden",
        'border-gray-100 hover:shadow-lg hover:border-gray-200'
      )}
    >
      {/* Barra de color de etapa */}
      <div className={cn("h-1 w-full", stage.color)} />

      <div className="p-3 space-y-2.5">

        {/* Título + eliminar */}
        <div className="flex items-start justify-between gap-1.5">
          <p className="text-[11px] font-black text-gray-900 leading-tight flex-1 line-clamp-2">{deal.title}</p>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-red-50 text-red-400 hover:text-red-600 transition-all flex-shrink-0 mt-0.5"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>

        {/* Empresa + Contacto */}
        <div className="space-y-1">
          {deal.company && (
            <p className="text-[8px] font-bold text-gray-500 flex items-center gap-1 truncate">
              <Building2 className="h-2.5 w-2.5 flex-shrink-0 text-gray-400" />
              {deal.company}
            </p>
          )}
          {deal.contactName && (
            <p className="text-[8px] font-bold text-gray-400 flex items-center gap-1 truncate">
              <User className="h-2.5 w-2.5 flex-shrink-0" />
              {deal.contactName}
            </p>
          )}
          {deal.contactPhone && (
            <p className="text-[8px] font-bold text-gray-400 flex items-center gap-1 truncate">
              <Phone className="h-2.5 w-2.5 flex-shrink-0" />
              {deal.contactPhone}
            </p>
          )}
        </div>

        {/* Valor + Probabilidad */}
        <div className="pt-2 border-t border-gray-50 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className={cn("text-sm font-black", stage.text)}>{fmt(deal.value)}</span>
            <span className="text-[9px] font-black text-gray-500">{prob}%</span>
          </div>
          {/* Barra de probabilidad */}
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", stage.color)}
              style={{ width: `${prob}%` }}
            />
          </div>
        </div>

        {/* Fecha cierre + fuente */}
        {(deal.expectedClose || deal.source) && (
          <div className="flex items-center justify-between gap-1">
            {deal.expectedClose && (
              <div className="flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5 text-gray-300 flex-shrink-0" />
                <span className={cn("text-[8px] font-black", closeColor || 'text-gray-400')}>
                  {fmtDate(deal.expectedClose)}
                </span>
                {closeLabel && (
                  <span className={cn("text-[7px] font-bold", closeColor)}>({closeLabel})</span>
                )}
              </div>
            )}
            {deal.source && (
              <span className="text-[7px] font-black text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded-lg truncate max-w-[60px]">
                {deal.source}
              </span>
            )}
          </div>
        )}

        {/* Footer: Vendedor + actividades + email */}
        <div className="flex items-center justify-between pt-1.5 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            {deal.assignedTo && (
              <div
                className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[7px] font-black text-white flex-shrink-0", stage.color)}
                title={deal.assignedTo.name}
              >
                {deal.assignedTo.name.charAt(0)}
              </div>
            )}
            {deal.assignedTo && (
              <span className="text-[8px] font-bold text-gray-400 truncate max-w-[80px]">
                {deal.assignedTo.name.split(' ')[0]}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {deal.contactEmail && (
              <Mail className="h-2.5 w-2.5 text-gray-300" title={deal.contactEmail} />
            )}
            {deal._count?.activities > 0 && (
              <span className="text-[7px] font-black text-gray-400 flex items-center gap-0.5 bg-gray-50 px-1.5 py-0.5 rounded-lg">
                <MessageSquare className="h-2 w-2" />
                {deal._count.activities}
              </span>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}

// ── Panel de Información del Deal ─────────────────────────────────────────────
function DealInfoPanel({ editForm, setEditForm, clients, employees, onSave, saving, deal, onDelete, onGenerateQuote }) {
  const f = (key) => ({
    value: editForm[key] ?? '',
    onChange: e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))
  });

  return (
    <div className="space-y-6">
      {/* Valor + Cierre */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Valor del Trato</label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500" />
            <input type="number" className="w-full bg-gray-50 rounded-xl pl-8 pr-3 py-3 font-black text-sm outline-none focus:ring-2 ring-primary/20" {...f('value')} onBlur={onSave} />
          </div>
        </div>
        <div>
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Cierre Esperado</label>
          <input type="date" className="w-full bg-gray-50 rounded-xl px-3 py-3 font-bold text-xs outline-none focus:ring-2 ring-primary/20" {...f('expectedClose')} onBlur={onSave} />
        </div>
      </div>

      {/* Fuente + Probabilidad manual */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Fuente</label>
          <input
            list="deal-sources-edit"
            className="w-full bg-gray-50 rounded-xl px-3 py-3 font-bold text-xs outline-none focus:ring-2 ring-primary/20"
            placeholder="Ej. Web, Referido…"
            {...f('source')}
            onBlur={onSave}
          />
          <datalist id="deal-sources-edit">
            {SOURCES.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Prob. Manual (%)</label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input type="number" min="0" max="100" className="w-full bg-gray-50 rounded-xl pl-8 pr-3 py-3 font-black text-sm outline-none focus:ring-2 ring-primary/20" {...f('probability')} onBlur={onSave} />
          </div>
        </div>
      </div>

      {/* Contacto */}
      <div className="p-4 bg-blue-50/50 rounded-2xl space-y-3">
        <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Contacto</p>
        <input className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none" placeholder="Nombre del contacto" {...f('contactName')} onBlur={onSave} />
        <input className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none" placeholder="Empresa" {...f('company')} onBlur={onSave} />
        <div className="grid grid-cols-2 gap-2">
          <input type="email" className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none" placeholder="Email" {...f('contactEmail')} onBlur={onSave} />
          <input className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none" placeholder="Teléfono" {...f('contactPhone')} onBlur={onSave} />
        </div>
      </div>

      {/* Vinculación */}
      <div className="space-y-3">
        <div>
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Cliente Registrado</label>
          <select className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-xs outline-none cursor-pointer" {...f('clientId')} onBlur={onSave}>
            <option value="">— Sin cliente —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Vendedor Asignado</label>
          <select className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-xs outline-none cursor-pointer" {...f('assignedToId')} onBlur={onSave}>
            <option value="">— Sin asignar —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Descripción</label>
        <textarea rows={3} className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-xs outline-none resize-none focus:ring-2 ring-primary/20" placeholder="Detalles del proyecto, necesidades del cliente..." {...f('description')} onBlur={onSave} />
      </div>

      {/* Notas internas */}
      <div>
        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Notas Internas</label>
        <textarea rows={3} className="w-full bg-amber-50 rounded-xl px-4 py-3 font-bold text-xs outline-none resize-none focus:ring-2 ring-amber-200" placeholder="Notas privadas del equipo..." {...f('notes')} onBlur={onSave} />
      </div>

      {/* Meta */}
      <div className="p-3 bg-gray-50 rounded-xl space-y-1">
        <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Información del Registro</p>
        <p className="text-[8px] text-gray-500 font-bold">Creado: {fmtDate(deal.createdAt)}</p>
        <p className="text-[8px] text-gray-500 font-bold">Actualizado: {fmtDate(deal.updatedAt)}</p>
      </div>

      {/* Cotización — solo en etapas de cotización */}
      {QUOTE_STAGES.includes(editForm.stage) && (
        <button
          type="button"
          onClick={onGenerateQuote}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
        >
          <FileText className="h-3.5 w-3.5" /> Generar Cotización
        </button>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 bg-primary text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="h-3 w-3" /> {saving ? 'Guardando...' : 'Guardar Todo'}
        </button>
        <button
          onClick={onDelete}
          className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
          title="Eliminar trato"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Panel de Actividades ───────────────────────────────────────────────────────
// Semáforo de estado
const STATUS_META = {
  PENDING:   { label: 'Pendiente',  color: '#94a3b8', bg: '#f1f5f9', next: 'COMPLETED' },
  COMPLETED: { label: 'Completado', color: '#22c55e', bg: '#f0fdf4', next: 'FAILED'    },
  FAILED:    { label: 'No completado', color: '#ef4444', bg: '#fef2f2', next: 'PENDING' },
};

function Semaphore({ status, onToggle }) {
  const meta = STATUS_META[status] || STATUS_META.PENDING;
  return (
    <button
      onClick={onToggle}
      title={`Estado: ${meta.label} — clic para cambiar`}
      style={{
        width: 14, height: 14, borderRadius: '50%',
        background: meta.color, flexShrink: 0,
        border: '2px solid white',
        boxShadow: `0 0 0 1px ${meta.color}40`,
        cursor: 'pointer', transition: 'transform 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.3)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    />
  );
}

function ActivitiesPanel({ activities, loading, newActivity, setNewActivity, onAdd, adding, onUpdateStatus }) {
  const typeMap = Object.fromEntries(ACTIVITY_TYPES.map(t => [t.id, t]));

  const fmtDateTime = (d) => d
    ? new Date(d).toLocaleString('es-MX', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
    : null;

  return (
    <div className="space-y-5">
      {/* Registrar actividad */}
      <form onSubmit={onAdd} className="space-y-3 p-4 bg-gray-50 rounded-2xl">
        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Registrar Actividad</p>

        {/* Tipo */}
        <div className="flex gap-2 flex-wrap">
          {ACTIVITY_TYPES.map(t => (
            <button
              key={t.id} type="button"
              onClick={() => setNewActivity(f => ({ ...f, type: t.id }))}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all",
                newActivity.type === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-400 hover:border-gray-300'
              )}
            >
              <t.icon className="h-2.5 w-2.5" /> {t.label}
            </button>
          ))}
        </div>

        {/* Detalle */}
        <textarea
          rows={3}
          className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none resize-none border border-gray-200 focus:border-primary transition-colors"
          placeholder="Escribe el detalle de la actividad..."
          value={newActivity.content}
          onChange={e => setNewActivity(f => ({ ...f, content: e.target.value }))}
          required
        />

        {/* Fecha/hora */}
        <div>
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Fecha y hora</label>
          <input
            type="datetime-local"
            className="w-full bg-white rounded-xl px-4 py-2.5 font-bold text-xs outline-none border border-gray-200 focus:border-primary transition-colors"
            value={newActivity.dueDate}
            onChange={e => setNewActivity(f => ({ ...f, dueDate: e.target.value }))}
          />
        </div>

        <button
          type="submit" disabled={adding}
          className="w-full bg-gray-900 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-50"
        >
          {adding ? 'Registrando...' : 'Agregar al Timeline'}
        </button>
      </form>

      {/* Timeline */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 text-[10px] font-black uppercase animate-pulse">Cargando...</div>
      ) : activities.length === 0 ? (
        <div className="text-center py-10 space-y-2">
          <Activity className="h-8 w-8 text-gray-200 mx-auto" />
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Sin actividades registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((act, i) => {
            const T    = typeMap[act.type] || typeMap.NOTE;
            const sMeta = STATUS_META[act.status] || STATUS_META.PENDING;
            const due  = fmtDateTime(act.dueDate);
            const created = fmtDateTime(act.createdAt);

            return (
              <div key={act.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={cn("h-8 w-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0", T.color)}>
                    <T.icon className="h-3.5 w-3.5" />
                  </div>
                  {i < activities.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                </div>

                <div className="flex-1 pb-4">
                  {/* Cabecera */}
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[8px] font-black uppercase tracking-widest", T.color)}>{T.label}</span>
                      {/* Semáforo */}
                      <Semaphore
                        status={act.status || 'PENDING'}
                        onToggle={() => onUpdateStatus(act.id, STATUS_META[act.status || 'PENDING'].next)}
                      />
                      <span style={{ fontSize:8, fontWeight:700, color: sMeta.color }}>{sMeta.label}</span>
                    </div>
                    <span className="text-[7px] text-gray-400 font-bold flex-shrink-0">{created}</span>
                  </div>

                  {/* Contenido */}
                  <p
                    className="text-xs text-gray-700 font-medium leading-relaxed p-3 rounded-xl"
                    style={{ background: sMeta.bg }}
                  >
                    {act.content}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {act.authorName && (
                      <p className="text-[7px] text-gray-400 font-bold flex items-center gap-1">
                        <User className="h-2 w-2" /> {act.authorName}
                      </p>
                    )}
                    {due && (
                      <p className="text-[7px] font-bold flex items-center gap-1" style={{ color: sMeta.color }}>
                        <Clock className="h-2 w-2" /> {due}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sección de Seguimientos ────────────────────────────────────────────────────
const TIPO_META = {
  NOTE:        { label: 'Nota',        color: 'bg-gray-100 text-gray-600' },
  CALL:        { label: 'Llamada',     color: 'bg-blue-100 text-blue-700' },
  MESSAGE:     { label: 'Mensaje',     color: 'bg-teal-100 text-teal-700' },
  EMAIL:       { label: 'Correo',      color: 'bg-purple-100 text-purple-700' },
  VISIT:       { label: 'Visita',      color: 'bg-green-100 text-green-700' },
  MEETING:     { label: 'Reunión',     color: 'bg-amber-100 text-amber-700' },
  SEGUIMIENTO: { label: 'Seguimiento', color: 'bg-primary/10 text-primary' },
  TASK:        { label: 'Tarea',       color: 'bg-emerald-100 text-emerald-700' },
  QUOTE:       { label: 'Cotización',  color: 'bg-orange-100 text-orange-700' },
  STAGE_CHANGE:{ label: 'Cambio etapa',color: 'bg-violet-100 text-violet-700' },
};

// ── Pipeline List View ────────────────────────────────────────────────────────
function PipelineListView({ filteredDeals, dealStages, seguimientos, onDeal }) {
  const [openStages, setOpenStages] = React.useState(() => new Set(dealStages.map(s => s.id)));

  const toggleStage = (id) => setOpenStages(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const actCountByDeal = React.useMemo(() => {
    const counts = {};
    seguimientos.forEach(a => { if (a.dealId) counts[a.dealId] = (counts[a.dealId] || 0) + 1; });
    return counts;
  }, [seguimientos]);

  const lastActByDeal = React.useMemo(() => {
    const last = {};
    seguimientos.forEach(a => {
      if (!a.dealId) return;
      if (!last[a.dealId] || new Date(a.createdAt) > new Date(last[a.dealId].createdAt)) last[a.dealId] = a;
    });
    return last;
  }, [seguimientos]);

  const totalDeals = filteredDeals.length;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {/* Summary bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-2xl mb-3">
        <BarChart2 className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
          {totalDeals} tratos · {fmt(filteredDeals.reduce((s, d) => s + (d.value || 0), 0))} en pipeline
        </span>
        <span className="ml-auto text-[8px] font-bold text-gray-400">Clic en un trato para ver detalles</span>
      </div>

      {dealStages.map(stage => {
        const stageDeals = filteredDeals.filter(d => d.stage === stage.id);
        if (stageDeals.length === 0) return null;
        const isOpen = openStages.has(stage.id);
        const stageValue = stageDeals.reduce((s, d) => s + (d.value || 0), 0);

        return (
          <div key={stage.id} className="rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm">
            {/* Stage header */}
            <button
              onClick={() => toggleStage(stage.id)}
              className={cn('w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:brightness-[0.97]', stage.bg)}
            >
              <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', stage.color)} />
              <span className={cn('text-[9px] font-black uppercase tracking-widest flex-1', stage.text)}>{stage.label}</span>
              <span className="text-[8px] font-black bg-white/70 backdrop-blur-sm rounded-lg px-2 py-0.5 text-gray-600">
                {stageDeals.length} {stageDeals.length === 1 ? 'trato' : 'tratos'}
              </span>
              <span className={cn('text-[10px] font-black', stage.text)}>{fmt(stageValue)}</span>
              <span className="text-[8px] font-bold text-gray-400 bg-white/60 rounded-lg px-2 py-0.5">{stage.prob}%</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform flex-shrink-0 text-gray-400', !isOpen && '-rotate-90')} />
            </button>

            {/* Deal rows */}
            {isOpen && (
              <div className="divide-y divide-gray-50">
                {stageDeals.map(deal => {
                  const actCount = actCountByDeal[deal.id] || 0;
                  const lastAct = lastActByDeal[deal.id];
                  const daysUntil = deal.expectedClose
                    ? Math.ceil((new Date(deal.expectedClose) - Date.now()) / 86400000)
                    : null;
                  const closeColor = daysUntil === null ? 'text-gray-400'
                    : daysUntil < 0 ? 'text-red-500' : daysUntil <= 7 ? 'text-amber-500' : 'text-gray-400';

                  return (
                    <button
                      key={deal.id}
                      onClick={() => onDeal(deal)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50/80 transition-colors group flex items-center gap-3"
                    >
                      {/* Color strip */}
                      <div className={cn('w-1 self-stretch rounded-full flex-shrink-0', stage.color)} />

                      {/* Main block */}
                      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] gap-3 items-center">
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-gray-900 leading-tight truncate group-hover:text-primary transition-colors">
                            {deal.title}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {deal.company && (
                              <span className="text-[8px] font-bold text-gray-500 flex items-center gap-1 truncate max-w-[140px]">
                                <Building2 className="h-2 w-2 flex-shrink-0 text-gray-400" />{deal.company}
                              </span>
                            )}
                            {deal.contactName && (
                              <span className="text-[8px] font-bold text-gray-400 flex items-center gap-1 truncate max-w-[120px]">
                                <User className="h-2 w-2 flex-shrink-0" />{deal.contactName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {deal.expectedClose && (
                              <span className={cn('text-[7px] font-black flex items-center gap-0.5', closeColor)}>
                                <Calendar className="h-2 w-2" />
                                {fmtDate(deal.expectedClose)}
                                {daysUntil !== null && (
                                  <span className="ml-0.5">
                                    {daysUntil < 0 ? `(vencido ${Math.abs(daysUntil)}d)` : daysUntil === 0 ? '(hoy)' : `(${daysUntil}d)`}
                                  </span>
                                )}
                              </span>
                            )}
                            {deal.source && (
                              <span className="text-[7px] font-black text-gray-300 bg-gray-50 px-1.5 py-0.5 rounded-lg">{deal.source}</span>
                            )}
                            {lastAct && (
                              <span className="text-[7px] text-gray-400 font-bold flex items-center gap-0.5">
                                <Clock className="h-2 w-2" /> {timeAgo(lastAct.createdAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right: value + badges */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <span className={cn('text-sm font-black', stage.text)}>{fmt(deal.value)}</span>
                          <div className="flex items-center gap-1.5">
                            {deal.assignedTo && (
                              <span
                                className={cn('h-5 w-5 rounded-full flex items-center justify-center text-[7px] font-black text-white flex-shrink-0', stage.color)}
                                title={deal.assignedTo.name}
                              >
                                {deal.assignedTo.name.charAt(0)}
                              </span>
                            )}
                            {actCount > 0 && (
                              <span className="text-[7px] font-black text-gray-500 flex items-center gap-0.5 bg-gray-100 px-1.5 py-0.5 rounded-lg">
                                <Activity className="h-2 w-2" />{actCount}
                              </span>
                            )}
                            <span className="text-[7px] font-black text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-lg">
                              {deal.probability ?? stage.prob}%
                            </span>
                          </div>
                          {/* Probability mini-bar */}
                          <div className="h-1 w-16 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', stage.color)}
                              style={{ width: `${deal.probability ?? stage.prob}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Chevron */}
                      <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {filteredDeals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Target className="h-10 w-10 text-gray-200" />
          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">No hay tratos que coincidan</p>
        </div>
      )}
    </div>
  );
}

function ActividadesSection({ actividades, loading, newAct, setNewAct, deals, onAdd, adding, onUpdateStatus }) {
  const typeMap = Object.fromEntries(ACTIVITY_TYPES.map(t => [t.id, t]));
  const [filterCompany, setFilterCompany] = React.useState('');

  const fmtDateTime = (d) => d
    ? new Date(d).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  // Clientes únicos con actividades registradas
  const companies = React.useMemo(() => {
    const seen = new Set();
    return actividades
      .map(a => a.deal?.company || a.deal?.client?.companyName || null)
      .filter(c => c && !seen.has(c) && seen.add(c));
  }, [actividades]);

  const filtered = filterCompany
    ? actividades.filter(a => (a.deal?.company || a.deal?.client?.companyName) === filterCompany)
    : actividades;

  return (
    <div className="m-4 mb-8 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-gray-50">
        <div className="h-9 w-9 rounded-2xl bg-gray-900/10 flex items-center justify-center">
          <Activity className="h-4 w-4 text-gray-700" />
        </div>
        <div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Actividades</h3>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Timeline global de actividades por trato</p>
        </div>
        <span className="ml-auto text-[10px] font-black text-gray-400 bg-white border rounded-xl px-3 py-1">
          {filtered.length} registros
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
        {/* Formulario */}
        <form onSubmit={onAdd} className="p-6 space-y-4">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Registrar nueva actividad</p>

          {/* Trato */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Trato *</label>
            <select
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-primary transition-colors"
              value={newAct.dealId}
              onChange={e => setNewAct(f => ({ ...f, dealId: e.target.value }))}
            >
              <option value="">— Seleccionar trato —</option>
              {deals.map(d => (
                <option key={d.id} value={d.id}>{d.title}{d.company ? ` · ${d.company}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Tipo</label>
            <div className="flex gap-2 flex-wrap">
              {ACTIVITY_TYPES.map(t => (
                <button
                  key={t.id} type="button"
                  onClick={() => setNewAct(f => ({ ...f, type: t.id }))}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all",
                    newAct.type === t.id ? 'border-gray-900 bg-gray-900/10 text-gray-900' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  )}
                >
                  <t.icon className="h-2.5 w-2.5" /> {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Detalle */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Detalle *</label>
            <textarea
              required
              rows={4}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-xs outline-none focus:border-primary transition-colors resize-none"
              placeholder="Escribe el detalle de la actividad..."
              value={newAct.content}
              onChange={e => setNewAct(f => ({ ...f, content: e.target.value }))}
            />
          </div>

          {/* Fecha/hora */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
              Fecha y hora límite <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="datetime-local"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-primary transition-colors"
              value={newAct.dueDate}
              onChange={e => setNewAct(f => ({ ...f, dueDate: e.target.value }))}
            />
            <p className="text-[7px] text-gray-400 font-bold">Si vence sin completarse aparecerá en rojo para el administrador</p>
          </div>

          <button
            type="submit"
            disabled={adding || !newAct.dealId || !newAct.content.trim() || !newAct.dueDate}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {adding ? 'Registrando...' : 'Agregar al Timeline'}
          </button>
        </form>

        {/* Timeline */}
        <div className="lg:col-span-2 flex flex-col max-h-[600px]">
          {/* Filtro por cliente */}
          {companies.length > 0 && (
            <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setFilterCompany('')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all",
                  !filterCompany ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                )}
              >
                Todos ({actividades.length})
              </button>
              {companies.map(company => {
                const count = actividades.filter(a => (a.deal?.company || a.deal?.client?.companyName) === company).length;
                return (
                  <button
                    key={company}
                    type="button"
                    onClick={() => setFilterCompany(company)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all max-w-[180px] truncate",
                      filterCompany === company ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    )}
                    title={company}
                  >
                    {company} <span className="opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Cargando...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-300">
              <Activity className="h-8 w-8" />
              <p className="text-[9px] font-black uppercase tracking-widest">
                {filterCompany ? 'Sin actividades para este cliente' : 'Sin actividades registradas'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((act, i) => {
                const T = typeMap[act.type] || { label: act.type, icon: Activity, color: 'text-gray-500' };
                const sMeta = STATUS_META[act.status] || STATUS_META.PENDING;
                const due = fmtDateTime(act.dueDate);
                const created = fmtDateTime(act.createdAt);
                const isOverdue = act.dueDate && new Date(act.dueDate) < new Date() && act.status !== 'COMPLETED';
                return (
                  <div key={act.id} className={cn("flex gap-3 rounded-2xl transition-colors", isOverdue && "bg-red-50/60 p-2 -mx-2 border border-red-200")}>
                    <div className="flex flex-col items-center">
                      <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0", isOverdue ? "bg-red-100 text-red-500" : cn("bg-gray-100", T.color))}>
                        {isOverdue ? <AlertCircle className="h-3.5 w-3.5" /> : <T.icon className="h-3.5 w-3.5" />}
                      </div>
                      {i < actividades.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("text-[8px] font-black uppercase tracking-widest", isOverdue ? "text-red-500" : T.color)}>{T.label}</span>
                          {isOverdue && (
                            <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-red-500 text-white animate-pulse">
                              VENCIDA
                            </span>
                          )}
                          {onUpdateStatus && (
                            <Semaphore
                              status={act.status || 'PENDING'}
                              onToggle={() => onUpdateStatus(act.id, STATUS_META[act.status || 'PENDING'].next)}
                            />
                          )}
                          <span style={{ fontSize: 8, fontWeight: 700, color: isOverdue ? '#ef4444' : sMeta.color }}>
                            {isOverdue ? 'No completada' : sMeta.label}
                          </span>
                          {act.deal?.title && (
                            <span className="text-[8px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg truncate max-w-[120px]">
                              {act.deal.title}
                            </span>
                          )}
                        </div>
                        <span className="text-[7px] text-gray-400 font-bold flex-shrink-0">{created}</span>
                      </div>
                      <p
                        className="text-xs text-gray-700 font-medium leading-relaxed p-3 rounded-xl"
                        style={{ background: isOverdue ? '#fee2e2' : sMeta.bg, color: isOverdue ? '#b91c1c' : undefined }}
                      >
                        {act.content}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {act.authorName && (
                          <p className="text-[7px] text-gray-400 font-bold flex items-center gap-1">
                            <User className="h-2 w-2" /> {act.authorName}
                          </p>
                        )}
                        {due && (
                          <p className="text-[7px] font-bold flex items-center gap-1" style={{ color: isOverdue ? '#ef4444' : sMeta.color }}>
                            <Clock className="h-2 w-2" />
                            {isOverdue ? `Venció: ${due}` : due}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SeguimientosSection({ seguimientos, loading, newSeg, setNewSeg, deals, onAdd, adding }) {
  const [filterDealId, setFilterDealId] = React.useState('');
  const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  // Tratos que tienen al menos un seguimiento
  const dealsWithSeg = React.useMemo(() => {
    const ids = new Set(seguimientos.flatMap(s => s.deal?.id ? [s.deal.id] : []));
    return deals.filter(d => ids.has(d.id));
  }, [seguimientos, deals]);

  const filtered = filterDealId
    ? seguimientos.filter(s => s.deal?.id === filterDealId)
    : seguimientos;

  return (
    <div className="m-4 mb-8 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 bg-gray-50">
        <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Seguimientos</h3>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Historial completo de actividades del vendedor</p>
        </div>
        <span className="ml-auto text-[10px] font-black text-gray-400 bg-white border rounded-xl px-3 py-1">
          {filtered.length} registros
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
        {/* Formulario */}
        <form onSubmit={onAdd} className="p-6 space-y-4">
          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Registrar nuevo seguimiento</p>

          <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Trato *</label>
            <select
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-primary transition-colors"
              value={newSeg.dealId}
              onChange={e => setNewSeg(f => ({ ...f, dealId: e.target.value }))}
            >
              <option value="">— Seleccionar trato —</option>
              {deals.map(d => (
                <option key={d.id} value={d.id}>{d.title}{d.company ? ` · ${d.company}` : ''}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Fecha</label>
            <input
              type="date"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-primary transition-colors"
              value={newSeg.date}
              onChange={e => setNewSeg(f => ({ ...f, date: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Observaciones *</label>
            <textarea
              required
              rows={4}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-xs outline-none focus:border-primary transition-colors resize-none"
              placeholder="Describe las acciones realizadas, acuerdos, próximos pasos..."
              value={newSeg.observations}
              onChange={e => setNewSeg(f => ({ ...f, observations: e.target.value }))}
            />
          </div>

          <button
            type="submit"
            disabled={adding || !newSeg.dealId || !newSeg.observations.trim()}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {adding ? 'Guardando...' : 'Registrar Seguimiento'}
          </button>
        </form>

        {/* Tabla */}
        <div className="lg:col-span-2 flex flex-col">
          {/* Filtro por pipeline */}
          <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterDealId('')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all",
                !filterDealId ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-400 hover:border-gray-300'
              )}
            >
              Todos ({seguimientos.length})
            </button>
            {dealsWithSeg.map(d => {
              const count = seguimientos.filter(s => s.deal?.id === d.id).length;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setFilterDealId(d.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all max-w-[180px] truncate",
                    filterDealId === d.id ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  )}
                  title={d.title}
                >
                  {d.title} <span className="opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest">Cargando...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-300">
                <ClipboardList className="h-8 w-8" />
                <p className="text-[9px] font-black uppercase tracking-widest">
                  {filterDealId ? 'Sin seguimientos para este trato' : 'Sin seguimientos registrados'}
                </p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-widest w-12">
                      <Hash className="h-3 w-3" />
                    </th>
                    <th className="px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                    <th className="px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">Tipo</th>
                    {!filterDealId && <th className="px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">Trato</th>}
                    <th className="px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">Observaciones</th>
                    <th className="px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">Vendedor</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((seg, i) => (
                    <tr key={seg.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <span className="h-6 w-6 rounded-lg bg-primary/10 text-primary font-black text-[9px] flex items-center justify-center">
                          {filtered.length - i}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[10px] font-bold text-gray-500 whitespace-nowrap">
                        {fmtFecha(seg.dueDate || seg.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {(() => { const m = TIPO_META[seg.type] || { label: seg.type, color: 'bg-gray-100 text-gray-500' }; return (
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${m.color}`}>{m.label}</span>
                        ); })()}
                      </td>
                      {!filterDealId && (
                        <td className="px-4 py-3">
                          <p className="text-[10px] font-black text-gray-800 leading-tight">{seg.deal?.title || '—'}</p>
                          {seg.deal?.company && (
                            <p className="text-[8px] font-bold text-gray-400">{seg.deal.company}</p>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-[10px] font-medium text-gray-700 leading-relaxed line-clamp-2">{seg.content}</p>
                      </td>
                      <td className="px-4 py-3 text-[9px] font-bold text-gray-500 whitespace-nowrap">
                        {seg.authorName || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
