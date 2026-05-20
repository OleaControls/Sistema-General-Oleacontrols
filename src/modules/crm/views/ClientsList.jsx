import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, Building2, User, Mail, Phone, MapPin, Hash,
  ShieldCheck, X, Save, Trash2, ChevronRight, FileText,
  Briefcase, Activity, CreditCard, Globe, CheckCircle2,
  TrendingUp, Users2, AlertCircle, Edit3, Map
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

const STATUS_COLORS = {
  ACTIVE:   { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Activo' },
  INACTIVE: { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',     dot: 'bg-red-500',     label: 'Inactivo' },
};

const QUOTE_STATUS = {
  PENDING:  { bg: 'bg-amber-50',   text: 'text-amber-700',   label: 'Pendiente' },
  ACCEPTED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Aprobada' },
  REJECTED: { bg: 'bg-red-50',     text: 'text-red-700',     label: 'Rechazada' },
  EXPIRED:  { bg: 'bg-gray-50',    text: 'text-gray-500',    label: 'Expirada' },
};

const DEAL_STAGE_LABEL = {
  QUALIFICATION: 'Lead / Prospecto', NEEDS_ANALYSIS: 'Acercamiento',
  VALUE_PROPOSITION: 'Contacto decisor', IDENTIFY_DECISION_MAKERS: 'Oportunidad detectada',
  PROPOSAL_PRICE_QUOTE: 'Levantamiento técnico', PROPOSAL_SENT: 'Cotización enviada',
  NEGOTIATION_1: 'Negociación 1', RECOTIZACION: 'Recotización',
  NEGOTIATION_2: 'Negociación 2', CLOSED_WON_PENDING: 'En espera',
  CLOSED_WON: 'Ganado', CLOSED_LOST: 'Perdido',
};

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const emptyClient = {
  companyName: '', contactName: '', email: '', phone: '',
  rfc: '', address: '', latitude: '', longitude: '', status: 'ACTIVE'
};

export default function ClientsList() {
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Panel lateral
  const [selectedClient, setSelectedClient] = useState(null);
  const [panelTab, setPanelTab] = useState('info');
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Modal agregar/editar (solo para crear)
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClient, setNewClient] = useState(emptyClient);
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, qRes, dRes] = await Promise.all([
        apiFetch('/api/crm/clients'),
        apiFetch('/api/quotes'),
        apiFetch('/api/crm/deals'),
      ]);
      const [c, q, d] = await Promise.all([cRes.json(), qRes.json(), dRes.json()]);
      setClients(Array.isArray(c) ? c : []);
      setQuotes(Array.isArray(q) ? q : []);
      setDeals(Array.isArray(d) ? d : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Seleccionar cliente ───────────────────────────────────────────────────
  const openClient = (client) => {
    setSelectedClient(client);
    setEditForm({
      companyName:  client.companyName  || '',
      contactName:  client.contactName  || '',
      email:        client.email        || '',
      phone:        client.phone        || '',
      rfc:          client.rfc          || '',
      address:      client.address      || '',
      latitude:     client.latitude     || '',
      longitude:    client.longitude    || '',
      status:       client.status       || 'ACTIVE',
    });
    setPanelTab('info');
  };

  const closePanel = () => setSelectedClient(null);

  // ── Guardar edición en panel ──────────────────────────────────────────────
  const saveClient = async () => {
    if (!selectedClient) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/crm/clients', {
        method: 'PUT',
        body: JSON.stringify({ id: selectedClient.id, ...editForm })
      });
      if (res.ok) {
        const updated = await res.json();
        setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
        setSelectedClient(updated);
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Crear cliente ─────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/crm/clients', {
        method: 'POST', body: JSON.stringify(newClient)
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewClient(emptyClient);
        fetchAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al crear');
      }
    } catch (err) { alert('Error de conexión'); }
    finally { setSubmitting(false); }
  };

  // ── Eliminar cliente ──────────────────────────────────────────────────────
  const deleteClient = async (client) => {
    if (!window.confirm(`¿Eliminar "${client.companyName}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await apiFetch('/api/crm/clients', {
        method: 'DELETE', body: JSON.stringify({ id: client.id })
      });
      if (res.ok) {
        setClients(prev => prev.filter(c => c.id !== client.id));
        if (selectedClient?.id === client.id) closePanel();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al eliminar');
      }
    } catch (err) { console.error(err); }
  };

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = clients.filter(c => {
    const matchSearch = !searchTerm ||
      [c.companyName, c.contactName, c.email, c.rfc].some(v => v?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = filterStatus === 'ALL' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Carga progresiva (compatible con motion.div y CSS grid) ───────────────
  const CLIENTS_BATCH = 30;
  const [visibleCount, setVisibleCount] = useState(CLIENTS_BATCH);
  const sentinelRef = useRef(null);

  // Resetear al cambiar filtros
  useEffect(() => { setVisibleCount(CLIENTS_BATCH); }, [searchTerm, filterStatus]);

  // IntersectionObserver: carga más tarjetas cuando el usuario llega al final
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(prev => prev + CLIENTS_BATCH); },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length]);

  const displayedClients = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Métricas
  const totalActive   = clients.filter(c => c.status === 'ACTIVE').length;
  const totalInactive = clients.filter(c => c.status === 'INACTIVE').length;
  const clientsWithQuotes = new Set(quotes.map(q => q.clientId)).size;
  const revenueTotal  = quotes.filter(q => q.status === 'ACCEPTED').reduce((s, q) => s + (q.total || 0), 0);

  // Panel data
  const clientQuotes = selectedClient ? quotes.filter(q => q.clientId === selectedClient.id) : [];
  const clientDeals  = selectedClient ? deals.filter(d => d.clientId === selectedClient.id) : [];

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center">
      <Activity className="h-10 w-10 text-primary animate-pulse" />
      <p className="font-black text-gray-400 text-[10px] uppercase tracking-widest mt-3">Cargando Cartera...</p>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* ── Lista principal ───────────────────────────────────────────────── */}
      <div className={cn("flex flex-col flex-1 overflow-hidden transition-all duration-300", selectedClient ? 'w-[calc(100%-420px)]' : 'w-full')}>

        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 bg-white border-b border-gray-100">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-3xl font-black text-primary tracking-tighter uppercase italic">Clientes</h2>
              <p className="text-gray-400 font-bold text-[10px] mt-0.5 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-3 w-3 text-emerald-500" /> Base de Datos CRM OleaControls
              </p>
            </div>
            <button
              onClick={() => { setNewClient(emptyClient); setShowAddModal(true); }}
              className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-lg"
            >
              <Plus className="h-4 w-4" /> Nuevo Cliente
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[
              { label: 'Total Clientes', value: clients.length, icon: Users2, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Activos', value: totalActive, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Inactivos', value: totalInactive, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
              { label: 'Facturado (Aprobado)', value: fmt(revenueTotal), icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
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

          {/* Búsqueda + filtros */}
          <div className="flex gap-3 mt-3">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 flex-1 max-w-xs">
              <Search className="h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por empresa, RFC, contacto..."
                className="bg-transparent border-none outline-none font-bold text-xs text-gray-900 w-full"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-1">
              {[{ id: 'ALL', label: 'Todos' }, { id: 'ACTIVE', label: 'Activos' }, { id: 'INACTIVE', label: 'Inactivos' }].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={cn(
                    "px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all",
                    filterStatus === f.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  )}
                >{f.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid de clientes */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3">
              <Users2 className="h-12 w-12 text-gray-200" />
              <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">
                {searchTerm ? 'Sin resultados para tu búsqueda' : 'Sin clientes registrados'}
              </p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayedClients.map(client => {
                const cQuotes  = quotes.filter(q => q.clientId === client.id);
                const cDeals   = deals.filter(d => d.clientId === client.id);
                const revenue  = cQuotes.filter(q => q.status === 'ACCEPTED').reduce((s, q) => s + (q.total || 0), 0);
                const s        = STATUS_COLORS[client.status] || STATUS_COLORS.ACTIVE;
                const isSelected = selectedClient?.id === client.id;

                return (
                  <motion.div
                    key={client.id}
                    whileHover={{ y: -3 }}
                    onClick={() => openClient(client)}
                    className={cn(
                      "bg-white rounded-3xl p-6 border cursor-pointer transition-all group relative overflow-hidden",
                      isSelected ? 'border-2 border-primary shadow-lg shadow-primary/10' : 'border-gray-100 hover:shadow-xl hover:border-gray-200'
                    )}
                  >
                    {/* Fondo decorativo */}
                    <div className="absolute top-0 right-0 w-24 h-24 opacity-5 rounded-full bg-primary translate-x-8 -translate-y-8" />

                    <div className="space-y-4 relative z-10">
                      {/* Top row */}
                      <div className="flex items-start justify-between">
                        <div className="h-12 w-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-lg shadow-lg flex-shrink-0">
                          {client.companyName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[7px] font-black px-2 py-0.5 rounded-full border uppercase flex items-center gap-1", s.bg, s.text, s.border)}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
                            {s.label}
                          </span>
                          <button
                            onClick={e => { e.stopPropagation(); deleteClient(client); }}
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 bg-red-50 text-red-400 hover:text-red-600 transition-all"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      {/* Info */}
                      <div>
                        <h3 className="text-base font-black text-gray-900 leading-tight group-hover:text-primary transition-colors">{client.companyName}</h3>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                          <Hash className="h-2.5 w-2.5" /> RFC: {client.rfc || 'XAXX010101000'}
                        </p>
                      </div>

                      {/* Contacto */}
                      <div className="space-y-1.5 pt-3 border-t border-gray-50">
                        <div className="flex items-center gap-2 text-gray-500">
                          <User className="h-3 w-3 text-primary/40 flex-shrink-0" />
                          <span className="text-[10px] font-bold truncate">{client.contactName || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <Mail className="h-3 w-3 text-primary/40 flex-shrink-0" />
                          <span className="text-[10px] font-bold lowercase truncate">{client.email}</span>
                        </div>
                        {client.phone && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Phone className="h-3 w-3 text-primary/40 flex-shrink-0" />
                            <span className="text-[10px] font-bold">{client.phone}</span>
                          </div>
                        )}
                      </div>

                      {/* Mini métricas */}
                      <div className="flex gap-2 pt-2">
                        <div className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
                          <p className="text-[8px] font-black text-gray-400 uppercase">Cotizaciones</p>
                          <p className="text-sm font-black text-gray-900">{cQuotes.length}</p>
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
                          <p className="text-[8px] font-black text-gray-400 uppercase">Tratos</p>
                          <p className="text-sm font-black text-gray-900">{cDeals.length}</p>
                        </div>
                        <div className="flex-1 bg-emerald-50 rounded-xl p-2 text-center">
                          <p className="text-[8px] font-black text-emerald-600 uppercase">Facturado</p>
                          <p className="text-xs font-black text-emerald-700">{fmt(revenue)}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Sentinel — IntersectionObserver carga más tarjetas al llegar aquí */}
              {hasMore && (
                <div ref={sentinelRef} className="col-span-full flex justify-center py-6">
                  <div className="flex items-center gap-2 text-gray-300">
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
                    <span className="text-[9px] font-bold uppercase tracking-widest">Cargando más...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Contador total */}
            <p className="mt-3 text-center text-[9px] font-mono text-gray-300">
              Mostrando {Math.min(visibleCount, filtered.length)} de {filtered.length} clientes
            </p>
            </>
          )}
        </div>
      </div>

      {/* ── Panel lateral ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedClient && (
          <motion.div
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="w-[420px] flex-shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Panel header */}
            <div className="p-5 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="h-12 w-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-xl shadow-lg flex-shrink-0">
                    {selectedClient.companyName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-black text-gray-900 truncate">{selectedClient.companyName}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={cn(
                        "text-[7px] font-black px-2 py-0.5 rounded-full border uppercase flex items-center gap-1",
                        STATUS_COLORS[selectedClient.status]?.bg,
                        STATUS_COLORS[selectedClient.status]?.text,
                        STATUS_COLORS[selectedClient.status]?.border
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_COLORS[selectedClient.status]?.dot)} />
                        {STATUS_COLORS[selectedClient.status]?.label}
                      </span>
                      <span className="text-[8px] font-bold text-gray-400">RFC: {selectedClient.rfc || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={saveClient} disabled={saving} className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all" title="Guardar">
                    <Save className="h-4 w-4" />
                  </button>
                  <button onClick={closePanel} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 flex-shrink-0">
              {[
                { id: 'info', label: 'Expediente' },
                { id: 'quotes', label: `Cotizaciones (${clientQuotes.length})` },
                { id: 'deals', label: `Tratos (${clientDeals.length})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setPanelTab(tab.id)}
                  className={cn(
                    "flex-1 py-3 text-[8px] font-black uppercase tracking-widest transition-colors px-2",
                    panelTab === tab.id ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-y-auto p-5">
              {panelTab === 'info' && (
                <ClientInfoTab
                  editForm={editForm}
                  setEditForm={setEditForm}
                  onSave={saveClient}
                  saving={saving}
                  client={selectedClient}
                  onDelete={() => deleteClient(selectedClient)}
                />
              )}
              {panelTab === 'quotes' && <ClientQuotesTab quotes={clientQuotes} />}
              {panelTab === 'deals'  && <ClientDealsTab deals={clientDeals} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Modal: Nuevo Cliente ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
            >
              <form onSubmit={handleCreate} className="p-7 space-y-6">
                <div className="flex justify-between items-center border-b pb-5">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">Nuevo Cliente</h3>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Sincronización con OTs y Ventas</p>
                  </div>
                  <button type="button" onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="h-5 w-5 text-gray-400" />
                  </button>
                </div>

                {/* Empresa */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Empresa / Marca *</label>
                    <input required className="w-full bg-gray-50 rounded-xl px-5 py-4 font-black text-sm outline-none focus:ring-2 ring-primary/20" placeholder="Razón social o nombre comercial" value={newClient.companyName} onChange={e => setNewClient(f => ({ ...f, companyName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">RFC</label>
                    <input className="w-full bg-gray-50 rounded-xl px-5 py-4 font-black text-sm outline-none uppercase" placeholder="XAXX010101000" value={newClient.rfc} onChange={e => setNewClient(f => ({ ...f, rfc: e.target.value.toUpperCase() }))} />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Estado</label>
                    <select className="w-full bg-gray-50 rounded-xl px-5 py-4 font-black text-sm outline-none cursor-pointer" value={newClient.status} onChange={e => setNewClient(f => ({ ...f, status: e.target.value }))}>
                      <option value="ACTIVE">Activo</option>
                      <option value="INACTIVE">Inactivo</option>
                    </select>
                  </div>
                </div>

                {/* Contacto */}
                <div className="p-4 bg-blue-50/60 rounded-2xl space-y-3">
                  <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Contacto Operativo</p>
                  <input required className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none" placeholder="Nombre del contacto *" value={newClient.contactName} onChange={e => setNewClient(f => ({ ...f, contactName: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-3">
                    <input required type="email" className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none" placeholder="Email *" value={newClient.email} onChange={e => setNewClient(f => ({ ...f, email: e.target.value }))} />
                    <input className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none" placeholder="Teléfono" value={newClient.phone} onChange={e => setNewClient(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                </div>

                {/* Ubicación */}
                <div className="space-y-3">
                  <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Dirección</label>
                  <input className="w-full bg-gray-50 rounded-xl px-5 py-4 font-bold text-sm outline-none" placeholder="Calle, número, colonia, ciudad" value={newClient.address} onChange={e => setNewClient(f => ({ ...f, address: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <input className="bg-transparent text-center font-black text-xs outline-none" placeholder="Latitud GPS" value={newClient.latitude} onChange={e => setNewClient(f => ({ ...f, latitude: e.target.value }))} />
                    <input className="bg-transparent text-center font-black text-xs outline-none border-l" placeholder="Longitud GPS" value={newClient.longitude} onChange={e => setNewClient(f => ({ ...f, longitude: e.target.value }))} />
                  </div>
                </div>

                <button type="submit" disabled={submitting} className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-primary transition-all disabled:opacity-60">
                  <Save className="h-4 w-4 inline mr-2" />
                  {submitting ? 'Guardando...' : 'Guardar y Vincular al CRM'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tab: Información del cliente ───────────────────────────────────────────────
function ClientInfoTab({ editForm, setEditForm, onSave, saving, client, onDelete }) {
  const f = (key) => ({
    value: editForm[key] ?? '',
    onChange: e => setEditForm(prev => ({ ...prev, [key]: e.target.value }))
  });

  return (
    <div className="space-y-5">
      {/* Empresa */}
      <div>
        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Empresa / Razón Social</label>
        <input className="w-full bg-gray-50 rounded-xl px-4 py-3 font-black text-sm outline-none focus:ring-2 ring-primary/20" {...f('companyName')} onBlur={onSave} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">RFC</label>
          <input className="w-full bg-gray-50 rounded-xl px-4 py-3 font-black text-xs outline-none uppercase" {...f('rfc')} onBlur={onSave} />
        </div>
        <div>
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Estado</label>
          <select className="w-full bg-gray-50 rounded-xl px-4 py-3 font-black text-xs outline-none cursor-pointer" {...f('status')} onBlur={onSave}>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
          </select>
        </div>
      </div>

      {/* Contacto */}
      <div className="p-4 bg-blue-50/40 rounded-2xl space-y-3">
        <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Contacto Operativo</p>
        <input className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none" placeholder="Nombre del contacto" {...f('contactName')} onBlur={onSave} />
        <div className="grid grid-cols-1 gap-2">
          <input type="email" className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none" placeholder="Email" {...f('email')} onBlur={onSave} />
          <input className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none" placeholder="Teléfono" {...f('phone')} onBlur={onSave} />
        </div>
      </div>

      {/* Dirección */}
      <div>
        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Dirección</label>
        <textarea rows={2} className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-xs outline-none resize-none" placeholder="Calle, número, colonia, ciudad" {...f('address')} onBlur={onSave} />
      </div>

      {/* GPS */}
      <div>
        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5 flex items-center gap-1">
          <Map className="h-3 w-3" /> Coordenadas GPS
        </label>
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <input className="bg-transparent text-center font-black text-xs outline-none" placeholder="Latitud" {...f('latitude')} onBlur={onSave} />
          <input className="bg-transparent text-center font-black text-xs outline-none border-l" placeholder="Longitud" {...f('longitude')} onBlur={onSave} />
        </div>
      </div>

      {/* Meta */}
      <div className="p-3 bg-gray-50 rounded-xl space-y-1">
        <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Información del Registro</p>
        <p className="text-[8px] text-gray-500 font-bold">Alta: {fmtDate(client.createdAt)}</p>
        <p className="text-[8px] text-gray-500 font-bold">Última actualización: {fmtDate(client.updatedAt)}</p>
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button onClick={onSave} disabled={saving} className="flex-1 bg-primary text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
          <Save className="h-3 w-3" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
        <button onClick={onDelete} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Tab: Cotizaciones del cliente ──────────────────────────────────────────────
function ClientQuotesTab({ quotes }) {
  if (quotes.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3">
      <FileText className="h-10 w-10 text-gray-200" />
      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Sin cotizaciones</p>
    </div>
  );

  const total = quotes.reduce((s, q) => s + (q.total || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {['PENDING', 'ACCEPTED', 'REJECTED'].map(s => {
          const count = quotes.filter(q => q.status === s).length;
          const qs = QUOTE_STATUS[s];
          return (
            <div key={s} className={cn("rounded-xl p-3 text-center", qs.bg)}>
              <p className={cn("text-[8px] font-black uppercase", qs.text)}>{qs.label}</p>
              <p className={cn("text-lg font-black", qs.text)}>{count}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        {quotes.map(q => {
          const qs = QUOTE_STATUS[q.status] || QUOTE_STATUS.PENDING;
          return (
            <div key={q.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
              <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0", qs.bg)}>
                <FileText className={cn("h-3.5 w-3.5", qs.text)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-gray-900 truncate">{q.quoteNumber}</p>
                <p className="text-[8px] font-bold text-gray-400 truncate">{q.projectName || 'Sin proyecto'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[10px] font-black text-gray-900">{fmt(q.total)}</p>
                <span className={cn("text-[7px] font-black uppercase px-1.5 py-0.5 rounded-lg", qs.bg, qs.text)}>{qs.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center p-3 bg-gray-900 rounded-2xl text-white">
        <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Total cotizado</span>
        <span className="text-sm font-black">{fmt(total)}</span>
      </div>
    </div>
  );
}

// ── Tab: Tratos del cliente ────────────────────────────────────────────────────
function ClientDealsTab({ deals }) {
  if (deals.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 space-y-3">
      <Briefcase className="h-10 w-10 text-gray-200" />
      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Sin tratos vinculados</p>
    </div>
  );

  const totalValue = deals.reduce((s, d) => s + (d.value || 0), 0);
  const wonValue   = deals.filter(d => d.stage === 'CLOSED_WON').reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-[8px] font-black text-blue-600 uppercase">Pipeline</p>
          <p className="text-sm font-black text-blue-700">{fmt(totalValue)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-[8px] font-black text-emerald-600 uppercase">Ganado</p>
          <p className="text-sm font-black text-emerald-700">{fmt(wonValue)}</p>
        </div>
      </div>

      <div className="space-y-2">
        {deals.map(d => (
          <div key={d.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
            <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0",
              d.stage === 'CLOSED_WON' ? 'bg-emerald-50' : d.stage === 'CLOSED_LOST' ? 'bg-red-50' : 'bg-purple-50'
            )}>
              <Briefcase className={cn("h-3.5 w-3.5",
                d.stage === 'CLOSED_WON' ? 'text-emerald-500' : d.stage === 'CLOSED_LOST' ? 'text-red-500' : 'text-purple-500'
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-gray-900 truncate">{d.title}</p>
              <p className="text-[8px] font-bold text-gray-400">{DEAL_STAGE_LABEL[d.stage] || d.stage} · {d.probability}%</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[10px] font-black text-gray-900">{fmt(d.value)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
