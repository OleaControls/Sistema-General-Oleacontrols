import React, { useState, useEffect } from 'react';
import {
  Plus, FileText, Download, Search, Trash2, PlusCircle, Building2,
  User, Calendar, DollarSign, X, Save, CheckCircle2, AlertCircle,
  Clock, Hash, Send, Edit3, ExternalLink, ChevronRight, TrendingUp,
  BarChart2, Percent, Eye, RefreshCw, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/store/AuthContext';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

const STATUS = {
  PENDING:  { label: 'Pendiente',     bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  icon: Clock },
  ACCEPTED: { label: 'Aprobada',      bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',icon: CheckCircle2 },
  REJECTED: { label: 'No concretada', bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200',    icon: X },
  EXPIRED:  { label: 'Expirada',      bg: 'bg-gray-50',    text: 'text-gray-500',    border: 'border-gray-200',   icon: AlertCircle },
};

const fmt    = (n)  => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const generateQuoteNumber = () =>
  `COT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

const emptyItem = () => ({ serial: '', name: '', desc: '', qty: 1, price: 0, total: 0 });

export default function QuotesList() {
  const { user } = useAuth();
  const location = useLocation();
  const [quotes,    setQuotes]    = useState([]);
  const [clients,   setClients]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal: detalle / edición
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [detailTab,     setDetailTab]     = useState('preview'); // 'preview' | 'edit'
  const [editQuote,     setEditQuote]     = useState({});
  const [savingQuote,   setSavingQuote]   = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Modal: crear cotización
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [fromDealMeta,  setFromDealMeta]  = useState(null); // deal del que proviene la cotización

  const initialNewQuote = () => ({
    quoteNumber:  generateQuoteNumber(),
    clientId:     '', sellerId: '', projectName: '', projectPhase: 'INICIAL',
    contactName:  '',
    validUntil:   new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    terms:        'Pago 100% anticipado. Tiempo de entrega sujeto a existencias.',
    items:        [emptyItem()],
    subtotal: 0, tax: 0, total: 0
  });

  const [newQuote, setNewQuote] = useState(initialNewQuote());

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const [qRes, cRes, eRes] = await Promise.all([
        apiFetch('/api/quotes'), apiFetch('/api/crm/clients'), apiFetch('/api/employees')
      ]);
      const [q, c, e] = await Promise.all([qRes.json(), cRes.json(), eRes.json()]);
      setQuotes(Array.isArray(q) ? q : []);
      setClients(Array.isArray(c) ? c : []);
      setEmployees(Array.isArray(e) ? e : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Auto-abrir modal de nueva cotización si viene de un deal del pipeline
  useEffect(() => {
    const fromDeal = location.state?.fromDeal;
    const fromClientId = location.state?.clientId;
    if (!fromDeal) return;
    const isRecotizacion = fromDeal.stage === 'RECOTIZACION';
    setFromDealMeta(fromDeal);
    setNewQuote(prev => ({
      ...prev,
      clientId:     fromClientId || '',
      projectName:  fromDeal.title        || '',
      contactName:  fromDeal.contactName  || '',
      sellerId:     fromDeal.assignedToId || '',
      projectPhase: isRecotizacion ? 'RECOTIZACION' : 'INICIAL',
    }));
    setShowAddModal(true);
    window.history.replaceState({}, '');
  }, [location.state]);

  // Recalcular totales al cambiar ítems (nuevo modal)
  useEffect(() => {
    const sub = newQuote.items.reduce((acc, i) => acc + (Number(i.qty) * Number(i.price)), 0);
    const tax = sub * 0.16;
    setNewQuote(prev => ({ ...prev, subtotal: sub, tax, total: sub + tax }));
  }, [newQuote.items]);

  // Recalcular al editar ítems en el modal de detalle
  useEffect(() => {
    if (!editQuote.items) return;
    const sub = editQuote.items.reduce((acc, i) => acc + (Number(i.qty) * Number(i.price)), 0);
    const tax = sub * 0.16;
    setEditQuote(prev => ({ ...prev, subtotal: sub, tax, total: sub + tax }));
  }, [editQuote.items]);

  // ── Abrir detalle ─────────────────────────────────────────────────────────
  const openDetail = (quote) => {
    setSelectedQuote(quote);
    setDetailTab('preview');
    setEditQuote({
      sellerId:    quote.sellerId    || '',
      projectName: quote.projectName || '',
      contactName: quote.contactName || '',
      validUntil:  quote.validUntil ? quote.validUntil.split('T')[0] : '',
      terms:       quote.terms       || '',
      items:       quote.items ? JSON.parse(JSON.stringify(quote.items)) : [],
      subtotal:    quote.subtotal || 0,
      tax:         quote.tax      || 0,
      total:       quote.total    || 0,
    });
  };

  // ── Guardar edición ───────────────────────────────────────────────────────
  const saveQuoteEdit = async () => {
    if (!selectedQuote) return;
    setSavingQuote(true);
    try {
      const res = await apiFetch('/api/quotes', {
        method: 'PUT',
        body: JSON.stringify({ id: selectedQuote.id, ...editQuote })
      });
      if (res.ok) {
        const updated = await res.json();
        setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q));
        setSelectedQuote(updated);
        setDetailTab('preview');
      }
    } catch (err) { console.error(err); }
    finally { setSavingQuote(false); }
  };

  // ── Cambiar status ────────────────────────────────────────────────────────
  const updateStatus = async (id, status) => {
    try {
      const res = await apiFetch('/api/quotes', { method: 'PUT', body: JSON.stringify({ id, status }) });
      if (res.ok) {
        const updated = await res.json();
        setQuotes(prev => prev.map(q => q.id === updated.id ? updated : q));
        if (selectedQuote?.id === updated.id) setSelectedQuote(updated);
      }
    } catch (err) { console.error(err); }
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const deleteQuote = async (id, num) => {
    if (!window.confirm(`¿Eliminar ${num}?`)) return;
    try {
      const res = await apiFetch('/api/quotes', { method: 'DELETE', body: JSON.stringify({ id }) });
      if (res.ok) {
        setQuotes(prev => prev.filter(q => q.id !== id));
        if (selectedQuote?.id === id) setSelectedQuote(null);
      }
    } catch (err) { console.error(err); }
  };

  // ── Descargar / Regenerar PDF ─────────────────────────────────────────────
  const downloadPDF = async (quoteId, quoteNumber) => {
    setGeneratingPDF(true);
    try {
      const res  = await apiFetch(`/api/quotes?id=${quoteId}`);
      const data = await res.json();
      if (data.pdfUrl) window.open(data.pdfUrl, '_blank');
    } catch (err) { console.error(err); }
    finally { setGeneratingPDF(false); }
  };

  // ── Crear cotización ──────────────────────────────────────────────────────
  const handleCreateQuote = async (e) => {
    e.preventDefault(); setIsGenerating(true);
    try {
      const res = await apiFetch('/api/quotes', {
        method: 'POST', body: JSON.stringify({ ...newQuote, creatorId: user.id })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewQuote(initialNewQuote());
        setFromDealMeta(null);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error al crear cotización: ${err.error || res.status}`);
      }
    } catch (err) { alert(`Error al crear cotización: ${err.message}`); }
    finally { setIsGenerating(false); }
  };

  // ── Items helpers ─────────────────────────────────────────────────────────
  const addItem = () => setNewQuote(f => ({ ...f, items: [...f.items, emptyItem()] }));
  const removeItem = (i) => setNewQuote(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (index, field, value) => {
    const ni = [...newQuote.items];
    ni[index] = { ...ni[index], [field]: value };
    if (field === 'qty' || field === 'price') ni[index].total = Number(ni[index].qty) * Number(ni[index].price);
    setNewQuote(f => ({ ...f, items: ni }));
  };

  const addEditItem = () => setEditQuote(f => ({ ...f, items: [...(f.items || []), emptyItem()] }));
  const removeEditItem = (i) => setEditQuote(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateEditItem = (index, field, value) => {
    const ni = [...editQuote.items];
    ni[index] = { ...ni[index], [field]: value };
    if (field === 'qty' || field === 'price') ni[index].total = Number(ni[index].qty) * Number(ni[index].price);
    setEditQuote(f => ({ ...f, items: ni }));
  };

  // ── Filtrado y métricas ───────────────────────────────────────────────────
  const filtered = quotes.filter(q => {
    const matchSearch = !searchTerm ||
      [q.quoteNumber, q.client?.companyName, q.projectName, q.seller?.name]
        .some(v => v?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = filterStatus === 'ALL' || q.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalPending  = quotes.filter(q => q.status === 'PENDING').length;
  const totalAccepted = quotes.filter(q => q.status === 'ACCEPTED').length;
  const totalRejected = quotes.filter(q => q.status === 'REJECTED').length;
  const totalValue    = quotes.reduce((s, q) => s + (q.total || 0), 0);
  const acceptedValue = quotes.filter(q => q.status === 'ACCEPTED').reduce((s, q) => s + (q.total || 0), 0);

  if (loading) return (
    <div className="p-10 text-center animate-pulse font-black text-gray-400 text-xs tracking-widest uppercase">
      Cargando Presupuestos...
    </div>
  );

  return (
    <div className="max-w-full mx-auto space-y-6 animate-in fade-in duration-700 pb-20 px-2 md:px-0">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-primary tracking-tighter uppercase italic">Cotizaciones</h2>
          <p className="text-gray-400 font-bold text-[10px] mt-1 uppercase tracking-widest flex items-center gap-2">
            <FileText className="h-3 w-3 text-blue-500" /> Cotizador OleaControls
          </p>
        </div>
        <button
          onClick={() => { setNewQuote(initialNewQuote()); setShowAddModal(true); }}
          className="w-full sm:w-auto bg-gray-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-primary transition-all"
        >
          <PlusCircle className="h-4 w-4" /> Crear Cotización
        </button>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: quotes.length, color: 'text-blue-600', bg: 'bg-blue-50', icon: FileText },
          { label: 'Pendientes', value: totalPending, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
          { label: 'Aprobadas', value: totalAccepted, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
          { label: 'No Concretadas', value: totalRejected, color: 'text-red-500', bg: 'bg-red-50', icon: X },
          { label: 'Aprobado $', value: fmt(acceptedValue), color: 'text-emerald-700', bg: 'bg-emerald-50', icon: TrendingUp },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className={cn("flex items-center gap-3 p-3 rounded-2xl border border-gray-100", bg)}>
            <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center bg-white shadow-sm", color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
              <p className={cn("text-sm font-black", color)}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-5 py-3 flex-1">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número, cliente, proyecto, vendedor..."
            className="bg-transparent outline-none font-bold text-sm text-gray-900 flex-1"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'PENDING', label: 'Pendientes' },
            { id: 'ACCEPTED', label: 'Aprobadas' },
            { id: 'REJECTED', label: 'No Concretadas' },
            { id: 'EXPIRED', label: 'Expiradas' },
          ].map(f => (
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

      {/* ── Grid de cotizaciones ──────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <FileText className="h-14 w-14 text-gray-200" />
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sin cotizaciones</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(q => {
            const s = STATUS[q.status] || STATUS.PENDING;
            const Icon = s.icon;
            return (
              <motion.div
                key={q.id}
                whileHover={{ y: -3 }}
                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden cursor-pointer"
                onClick={() => openDetail(q)}
              >
                {/* Fondo decorativo */}
                <div className="absolute top-0 right-0 w-28 h-28 opacity-[0.03] rounded-full bg-blue-600 translate-x-10 -translate-y-10" />

                <div className="space-y-5 relative z-10">
                  {/* Status + acciones */}
                  <div className="flex justify-between items-start">
                    <span className={cn("flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border", s.bg, s.text, s.border)}>
                      <Icon className="h-2.5 w-2.5" />
                      {s.label}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); deleteQuote(q.id, q.quoteNumber); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-50 text-red-400 hover:text-red-600 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Info */}
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      <Hash className="h-2.5 w-2.5 inline mr-1" />{q.quoteNumber}
                    </p>
                    <h3 className="text-base font-black text-gray-900 group-hover:text-primary transition-colors truncate">
                      {q.client?.companyName}
                    </h3>
                    {q.projectName && (
                      <p className="text-[9px] font-bold text-gray-400 mt-0.5 truncate">{q.projectName}</p>
                    )}
                  </div>

                  {/* Vendedor */}
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-[8px] font-black">
                      {q.seller?.name?.charAt(0) || '?'}
                    </div>
                    <p className="text-[9px] font-bold text-gray-400 truncate">
                      {q.seller?.name || 'Sin vendedor asignado'}
                    </p>
                  </div>

                  {/* Total + acciones rápidas */}
                  <div className="pt-4 border-t border-gray-50 flex justify-between items-end">
                    <div>
                      <p className="text-[7px] font-black text-gray-400 uppercase">Total</p>
                      <p className="text-2xl font-black text-gray-900">{fmt(q.total)}</p>
                      <p className="text-[7px] font-bold text-gray-400 mt-0.5">Vigente hasta: {fmtDate(q.validUntil)}</p>
                    </div>
                    <div className="flex gap-2">
                      {/* Botones rápidos de status */}
                      {q.status === 'PENDING' && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); updateStatus(q.id, 'ACCEPTED'); }}
                            className="p-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
                            title="Aprobar"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); updateStatus(q.id, 'REJECTED'); }}
                            className="p-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
                            title="Rechazar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); downloadPDF(q.id, q.quoteNumber); }}
                        className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg"
                        title="Descargar PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Detalle / Edición de cotización ─────────────────────────── */}
      <AnimatePresence>
        {selectedQuote && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 80 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"
            >
              {/* Modal header */}
              <div className="p-6 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">
                        {selectedQuote.quoteNumber}
                      </h3>
                      {(() => {
                        const s = STATUS[selectedQuote.status] || STATUS.PENDING;
                        const Icon = s.icon;
                        return (
                          <span className={cn("flex items-center gap-1 text-[8px] font-black uppercase px-2.5 py-1 rounded-full border", s.bg, s.text, s.border)}>
                            <Icon className="h-2.5 w-2.5" />{s.label}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-[9px] font-bold text-gray-400 mt-1">
                      {selectedQuote.client?.companyName} · Creada {fmtDate(selectedQuote.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => downloadPDF(selectedQuote.id, selectedQuote.quoteNumber)}
                      disabled={generatingPDF}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-60"
                    >
                      {generatingPDF ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      PDF
                    </button>
                    <button onClick={() => setSelectedQuote(null)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-4">
                  {[{ id: 'preview', label: 'Vista previa' }, { id: 'edit', label: 'Editar' }].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id)}
                      className={cn(
                        "px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all",
                        detailTab === tab.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal content */}
              <div className="flex-1 overflow-y-auto">
                {detailTab === 'preview' ? (
                  <QuotePreview
                    quote={selectedQuote}
                    employees={employees}
                    onStatusChange={updateStatus}
                    onDelete={() => deleteQuote(selectedQuote.id, selectedQuote.quoteNumber)}
                  />
                ) : (
                  <QuoteEditForm
                    editQuote={editQuote}
                    setEditQuote={setEditQuote}
                    employees={employees}
                    onAddItem={addEditItem}
                    onRemoveItem={removeEditItem}
                    onUpdateItem={updateEditItem}
                    onSave={saveQuoteEdit}
                    saving={savingQuote}
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Nueva cotización ───────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto"
            >
              <form onSubmit={handleCreateQuote} className="p-6 md:p-10 space-y-8">
                <div className="flex justify-between items-center border-b pb-5">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">
                      {fromDealMeta?.stage === 'RECOTIZACION' ? 'Recotización' : 'Nueva Cotización'}
                    </h3>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">
                      Folio: {newQuote.quoteNumber}
                    </p>
                  </div>
                  <button type="button" onClick={() => { setShowAddModal(false); setFromDealMeta(null); }} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="h-6 w-6 text-gray-400" />
                  </button>
                </div>

                {/* Banner: vinculado a deal del pipeline */}
                {fromDealMeta && (
                  <div className="flex items-start gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <FileText className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[8px] font-black text-emerald-700 uppercase tracking-widest mb-1">
                        Generando desde Pipeline CRM
                      </p>
                      <p className="text-xs font-black text-gray-900 truncate">{fromDealMeta.title}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        {fromDealMeta.company && <span className="text-[9px] font-bold text-gray-500">{fromDealMeta.company}</span>}
                        {fromDealMeta.email   && <span className="text-[9px] font-bold text-gray-400">{fromDealMeta.email}</span>}
                        {fromDealMeta.phone   && <span className="text-[9px] font-bold text-gray-400">{fromDealMeta.phone}</span>}
                      </div>
                    </div>
                    {fromDealMeta.value > 0 && (
                      <span className="text-xs font-black text-emerald-700 flex-shrink-0">
                        ${Number(fromDealMeta.value).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                )}

                {/* Info general */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Cliente *</label>
                    <select required className="w-full bg-gray-50 rounded-xl px-4 py-4 font-bold text-sm outline-none cursor-pointer" value={newQuote.clientId} onChange={e => setNewQuote(f => ({ ...f, clientId: e.target.value }))}>
                      <option value="">Seleccionar...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Vendedor</label>
                    <select className="w-full bg-blue-50 rounded-xl px-4 py-4 font-black text-sm outline-none text-blue-700 cursor-pointer" value={newQuote.sellerId} onChange={e => setNewQuote(f => ({ ...f, sellerId: e.target.value }))}>
                      <option value="">¿Quién vendió?</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Nombre del Proyecto</label>
                    <input type="text" className="w-full bg-gray-50 rounded-xl px-4 py-4 font-bold text-sm outline-none" placeholder="Ej: Proyecto CCTV Planta Norte" value={newQuote.projectName} onChange={e => setNewQuote(f => ({ ...f, projectName: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Vigente hasta</label>
                    <input type="date" className="w-full bg-gray-50 rounded-xl px-4 py-4 font-bold text-sm outline-none" value={newQuote.validUntil} onChange={e => setNewQuote(f => ({ ...f, validUntil: e.target.value }))} />
                  </div>
                </div>

                {/* Conceptos */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" /> Conceptos
                    </h4>
                    <button type="button" onClick={addItem} className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Agregar concepto
                    </button>
                  </div>

                  {/* Cabecera de tabla */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 px-3 text-[7px] font-black text-gray-400 uppercase tracking-widest">
                    <span className="col-span-2">Nº Serie</span>
                    <span className="col-span-4">Descripción</span>
                    <span className="col-span-2 text-center">Cant.</span>
                    <span className="col-span-2">P. Unitario</span>
                    <span className="col-span-1 text-right">Total</span>
                    <span className="col-span-1" />
                  </div>

                  {newQuote.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-4 bg-gray-50 rounded-2xl items-center">
                      <input className="col-span-12 sm:col-span-2 bg-white rounded-lg p-2.5 text-[10px] font-black uppercase outline-none" placeholder="Nº Serie" value={item.serial} onChange={e => updateItem(index, 'serial', e.target.value)} />
                      <div className="col-span-12 sm:col-span-4 space-y-1.5">
                        <input className="w-full bg-white rounded-lg p-2.5 text-[10px] font-bold outline-none" placeholder="Nombre del producto / servicio" value={item.name} onChange={e => updateItem(index, 'name', e.target.value)} />
                        <input className="w-full bg-white/60 rounded-lg p-2 text-[9px] text-gray-500 outline-none" placeholder="Descripción adicional" value={item.desc} onChange={e => updateItem(index, 'desc', e.target.value)} />
                      </div>
                      <input className="col-span-12 sm:col-span-2 bg-white rounded-lg p-2.5 text-[10px] text-center font-bold outline-none" type="number" min="1" value={item.qty} onChange={e => updateItem(index, 'qty', parseInt(e.target.value) || 1)} />
                      <input className="col-span-12 sm:col-span-2 bg-white rounded-lg p-2.5 text-[10px] font-bold outline-none" type="number" min="0" step="0.01" placeholder="0.00" value={item.price} onChange={e => updateItem(index, 'price', parseFloat(e.target.value) || 0)} />
                      <div className="col-span-12 sm:col-span-1 text-right font-black text-xs text-gray-900">{fmt(item.qty * item.price)}</div>
                      <button type="button" className="col-span-12 sm:col-span-1 flex justify-end" onClick={() => removeItem(index)}>
                        <X className="h-4 w-4 text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Footer financiero */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <textarea
                    className="w-full bg-gray-50 rounded-2xl p-5 text-[10px] font-bold outline-none resize-none border border-gray-100"
                    rows={4}
                    placeholder="Términos y condiciones..."
                    value={newQuote.terms}
                    onChange={e => setNewQuote(f => ({ ...f, terms: e.target.value }))}
                  />
                  <div className="bg-gray-900 rounded-2xl p-6 text-white space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase opacity-50">
                      <span>Subtotal</span><span>{fmt(newQuote.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase opacity-50">
                      <span>IVA (16%)</span><span>{fmt(newQuote.tax)}</span>
                    </div>
                    <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                      <span className="text-sm font-black uppercase text-primary">Total General</span>
                      <span className="text-3xl font-black">{fmt(newQuote.total)}</span>
                    </div>
                  </div>
                </div>

                <button
                  disabled={isGenerating || !newQuote.clientId}
                  type="submit"
                  className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all disabled:opacity-60"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Generando PDF...</span>
                  ) : (
                    <span className="flex items-center justify-center gap-2"><FileText className="h-4 w-4" /> Generar Cotización y PDF</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Componente: Vista previa de cotización ─────────────────────────────────────
function QuotePreview({ quote, employees, onStatusChange, onDelete }) {
  const s = STATUS[quote.status] || STATUS.PENDING;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Encabezado cliente + proyecto */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
          <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Facturar a</p>
          <p className="font-black text-gray-900">{quote.client?.companyName}</p>
          <p className="text-[9px] font-bold text-gray-500">{quote.client?.address || '—'}</p>
          <p className="text-[9px] font-bold text-gray-500">{quote.client?.email}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
          <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Detalle del Proyecto</p>
          <p className="font-bold text-gray-900 text-sm">{quote.projectName || '—'}</p>
          <p className="text-[9px] font-bold text-gray-500 flex items-center gap-1">
            <User className="h-3 w-3" /> Creado por: {quote.creator?.name || '—'}
          </p>
          <p className="text-[9px] font-bold text-gray-500 flex items-center gap-1">
            <User className="h-3 w-3" /> Vendedor: {quote.seller?.name || 'Sin asignar'}
          </p>
          <p className="text-[9px] font-bold text-gray-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Vigente hasta: {fmtDate(quote.validUntil)}
          </p>
        </div>
      </div>

      {/* Tabla de conceptos */}
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
          {(quote.items || []).map((item, i) => (
            <div key={i} className={cn("grid grid-cols-12 gap-2 p-3 text-xs items-start border-t border-gray-50", i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
              <span className="col-span-1 font-black text-gray-400">{String(i+1).padStart(2,'0')}</span>
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
            <span>Subtotal</span><span>{fmt(quote.subtotal)}</span>
          </div>
          <div className="flex justify-between text-[10px] font-black opacity-50">
            <span>IVA (16%)</span><span>{fmt(quote.tax)}</span>
          </div>
          {quote.adjustment !== 0 && (
            <div className="flex justify-between text-[10px] font-black opacity-50">
              <span>Ajuste</span><span>{fmt(quote.adjustment)}</span>
            </div>
          )}
          <div className="pt-3 border-t border-white/10 flex justify-between items-center">
            <span className="font-black uppercase text-primary">Total General</span>
            <span className="text-2xl font-black">{fmt(quote.total)}</span>
          </div>
        </div>
      </div>

      {/* Términos */}
      {quote.terms && (
        <div className="p-4 bg-amber-50 rounded-2xl">
          <p className="text-[7px] font-black text-amber-600 uppercase tracking-widest mb-1">Términos y Condiciones</p>
          <p className="text-[10px] font-bold text-gray-600">{quote.terms}</p>
        </div>
      )}

      {/* Acciones de status */}
      <div className="border-t border-gray-100 pt-5">
        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3">Cambiar estado</p>
        <div className="flex gap-3 flex-wrap">
          {quote.status !== 'ACCEPTED' && (
            <button
              onClick={() => onStatusChange(quote.id, 'ACCEPTED')}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 transition-all"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Marcar Aprobada
            </button>
          )}
          {quote.status !== 'REJECTED' && (
            <button
              onClick={() => onStatusChange(quote.id, 'REJECTED')}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-600 transition-all"
            >
              <X className="h-3.5 w-3.5" /> No Concretada
            </button>
          )}
          {quote.status !== 'PENDING' && (
            <button
              onClick={() => onStatusChange(quote.id, 'PENDING')}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-amber-600 transition-all"
            >
              <Clock className="h-3.5 w-3.5" /> Regresar a Pendiente
            </button>
          )}
          <button
            onClick={() => onStatusChange(quote.id, 'EXPIRED')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 text-gray-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-300 transition-all"
          >
            <AlertCircle className="h-3.5 w-3.5" /> Expirada
          </button>
          <button
            onClick={onDelete}
            className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-red-100 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente: Formulario de edición de cotización ────────────────────────────
function QuoteEditForm({ editQuote, setEditQuote, employees, onAddItem, onRemoveItem, onUpdateItem, onSave, saving }) {
  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Info básica */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="col-span-1">
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Nombre del Proyecto</label>
          <input
            className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-sm outline-none"
            placeholder="Ej: Proyecto CCTV"
            value={editQuote.projectName || ''}
            onChange={e => setEditQuote(f => ({ ...f, projectName: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Contacto</label>
          <input
            className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-sm outline-none"
            placeholder="Nombre del contacto"
            value={editQuote.contactName || ''}
            onChange={e => setEditQuote(f => ({ ...f, contactName: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Vigente hasta</label>
          <input
            type="date"
            className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-sm outline-none"
            value={editQuote.validUntil || ''}
            onChange={e => setEditQuote(f => ({ ...f, validUntil: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Vendedor</label>
        <select
          className="w-full bg-blue-50 rounded-xl px-4 py-3 font-bold text-sm outline-none cursor-pointer text-blue-700"
          value={editQuote.sellerId || ''}
          onChange={e => setEditQuote(f => ({ ...f, sellerId: e.target.value }))}
        >
          <option value="">— Sin vendedor —</option>
          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* Conceptos editables */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Package className="h-3 w-3" /> Conceptos
          </p>
          <button type="button" onClick={onAddItem} className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-1">
            <Plus className="h-3 w-3" /> Agregar
          </button>
        </div>

        {(editQuote.items || []).map((item, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-2xl items-center">
            <input className="col-span-2 bg-white rounded-lg p-2 text-[9px] font-black uppercase outline-none" placeholder="Nº Serie" value={item.serial || ''} onChange={e => onUpdateItem(i, 'serial', e.target.value)} />
            <div className="col-span-4 space-y-1">
              <input className="w-full bg-white rounded-lg p-2 text-[9px] font-bold outline-none" placeholder="Producto / Servicio" value={item.name || ''} onChange={e => onUpdateItem(i, 'name', e.target.value)} />
              <input className="w-full bg-white/60 rounded-lg p-1.5 text-[8px] text-gray-500 outline-none" placeholder="Descripción" value={item.desc || ''} onChange={e => onUpdateItem(i, 'desc', e.target.value)} />
            </div>
            <input className="col-span-1 bg-white rounded-lg p-2 text-[9px] text-center font-bold outline-none" type="number" min="1" value={item.qty} onChange={e => onUpdateItem(i, 'qty', parseInt(e.target.value) || 1)} />
            <input className="col-span-2 bg-white rounded-lg p-2 text-[9px] font-bold outline-none" type="number" min="0" step="0.01" placeholder="Precio" value={item.price} onChange={e => onUpdateItem(i, 'price', parseFloat(e.target.value) || 0)} />
            <div className="col-span-2 text-right font-black text-xs text-gray-900">{fmt(Number(item.qty) * Number(item.price))}</div>
            <button type="button" onClick={() => onRemoveItem(i)} className="col-span-1 flex justify-center">
              <X className="h-3.5 w-3.5 text-red-400" />
            </button>
          </div>
        ))}
      </div>

      {/* Totales */}
      <div className="flex justify-end">
        <div className="bg-gray-900 rounded-2xl p-5 text-white space-y-2 w-72">
          <div className="flex justify-between text-[9px] font-black opacity-50"><span>Subtotal</span><span>{fmt(editQuote.subtotal)}</span></div>
          <div className="flex justify-between text-[9px] font-black opacity-50"><span>IVA (16%)</span><span>{fmt(editQuote.tax)}</span></div>
          <div className="pt-3 border-t border-white/10 flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-primary">Total</span>
            <span className="text-xl font-black">{fmt(editQuote.total)}</span>
          </div>
        </div>
      </div>

      {/* Términos */}
      <div>
        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Términos y Condiciones</label>
        <textarea
          rows={3}
          className="w-full bg-amber-50 rounded-xl px-4 py-3 font-bold text-xs outline-none resize-none"
          value={editQuote.terms || ''}
          onChange={e => setEditQuote(f => ({ ...f, terms: e.target.value }))}
        />
      </div>

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-primary text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Guardando...' : 'Guardar Cambios y Actualizar'}
      </button>
    </div>
  );
}
