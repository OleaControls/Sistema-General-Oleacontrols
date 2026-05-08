import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, FileText, Download, Search, Trash2, PlusCircle, Building2,
  User, Calendar, DollarSign, X, Save, CheckCircle2, AlertCircle,
  Clock, Hash, Send, Edit3, ExternalLink, ChevronRight, TrendingUp,
  BarChart2, Percent, Eye, RefreshCw, Package, Loader2, ImagePlus, Copy
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

const STATUS_STYLE = {
  PENDING:  { accent: '#f59e0b', bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  ACCEPTED: { accent: '#10b981', bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
  REJECTED: { accent: '#ef4444', bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  EXPIRED:  { accent: '#94a3b8', bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
};

const fmt    = (n)  => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const generateQuoteNumber = () =>
  `COT-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

const emptyItem = () => ({ serial: '', name: '', desc: '', qty: 1, price: 0, total: 0, imageBase64: '' });

// Redimensiona imagen a máx 350px y la convierte a PNG (jsPDF en Node.js solo soporta PNG sin dependencias extra)
const compressImage = (file) => new Promise((resolve) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 350;
      const scale = Math.min(maxW / img.width, 1);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

// ── Buscador de productos del catálogo ────────────────────────────────────────
function ProductSearchModal({ onSelect, onClose }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const search = useCallback(async (q) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search: q, status: 'ALL', limit: '40', page: '1' });
      const res  = await apiFetch(`/api/catalog?${params}`);
      const data = await res.json();
      setResults(data.products || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 280);
    return () => clearTimeout(t);
  }, [query, search]);

  const fmtP = (n, cur) =>
    `${cur === 'USD' ? 'US$' : 'MX$'} ${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '80vh' }}>
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-gray-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
            <input
              ref={inputRef}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-primary"
              placeholder="Buscar por nombre, SKU, marca, categoría..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 gap-2 text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest">Buscando...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 text-gray-300">
              <Package className="h-8 w-8" />
              <p className="text-[9px] font-black uppercase tracking-widest">
                {query ? 'Sin resultados' : 'Escribe para buscar productos'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {results.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { onSelect(p); onClose(); }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-primary/5 transition-colors text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[8px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg font-mono">{p.sku}</span>
                      {p.brand && <span className="text-[8px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">{p.brand}</span>}
                      {p.category && <span className="text-[8px] font-bold text-gray-400">{p.category}</span>}
                    </div>
                    <p className="text-xs font-black text-gray-800 mt-1 leading-tight truncate">{p.name}</p>
                    {p.description && <p className="text-[9px] text-gray-400 font-medium truncate mt-0.5">{p.description}</p>}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-black text-gray-900">
                      {fmtP(p.price, p.currency)}
                    </p>
                    <p className="text-[8px] font-bold text-gray-400">/{p.unit}</p>
                  </div>
                  <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest text-center">
            {results.length > 0 ? `${results.length} resultado${results.length !== 1 ? 's' : ''} · haz clic para agregar al concepto` : 'Catálogo OleaControls'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function QuotesList() {
  const { user } = useAuth();
  const location = useLocation();
  const [quotes,    setQuotes]    = useState([]);
  const [clients,   setClients]   = useState([]);
  const [employees, setEmployees] = useState([]);
  const [deals,     setDeals]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal: detalle / edición
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [detailTab,     setDetailTab]     = useState('preview'); // 'preview' | 'edit'
  const [editQuote,     setEditQuote]     = useState({});
  const [savingQuote,   setSavingQuote]   = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [duplicating,   setDuplicating]   = useState(null);

  // Modal: crear cotización
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [fromDealMeta,  setFromDealMeta]  = useState(null); // deal del que proviene la cotización
  const [prodSearch,    setProdSearch]    = useState(null); // { index, mode:'new'|'edit' }
  const [clientMode,    setClientMode]    = useState('existing'); // 'existing' | 'new'
  const initialNewClientData = () => ({ companyName: '', contactName: '', email: '', phone: '', rfc: '', address: '' });
  const [newClientData, setNewClientData] = useState(initialNewClientData());

  const initialNewQuote = () => ({
    quoteNumber:  generateQuoteNumber(),
    clientId:     '', sellerId: '', projectName: '', projectPhase: 'INICIAL',
    linkedDealId: '',
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
      const [qRes, cRes, eRes, dRes] = await Promise.all([
        apiFetch('/api/quotes'), apiFetch('/api/crm/clients'),
        apiFetch('/api/employees'), apiFetch('/api/crm/deals'),
      ]);
      const [q, c, e, d] = await Promise.all([qRes.json(), cRes.json(), eRes.json(), dRes.json()]);
      setQuotes(Array.isArray(q) ? q : []);
      setClients(Array.isArray(c) ? c : []);
      setEmployees(Array.isArray(e) ? e : []);
      setDeals(Array.isArray(d) ? d.filter(deal => !['CLOSED_WON','CLOSED_LOST'].includes(deal.stage)) : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // Auto-filtrar por folio si viene del perfil de prospecto
  useEffect(() => {
    const folio = location.state?.openQuote;
    if (!folio) return;
    setSearchTerm(folio);
    window.history.replaceState({}, '');
  }, [location.state?.openQuote]);

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
      clientId:    quote.clientId    || '',
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

  // ── Duplicar cotización ───────────────────────────────────────────────────
  const duplicateQuote = async (q, e) => {
    e.stopPropagation();
    if (duplicating) return;
    setDuplicating(q.id);
    try {
      const res = await apiFetch('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({ duplicateFromId: q.id })
      });
      if (!res.ok) throw new Error('Error al duplicar');
      const copy = await res.json();
      setQuotes(prev => [copy, ...prev]);
      openDetail(copy);
      setDetailTab('edit');
    } catch (err) {
      alert('Error al duplicar la cotización: ' + err.message);
    } finally {
      setDuplicating(null);
    }
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
      let clientId = newQuote.clientId;

      if (clientMode === 'new') {
        const clientRes = await apiFetch('/api/crm/clients', {
          method: 'POST', body: JSON.stringify(newClientData)
        });
        if (!clientRes.ok) {
          const err = await clientRes.json().catch(() => ({}));
          alert(`Error al crear cliente: ${err.error || clientRes.status}`);
          return;
        }
        const createdClient = await clientRes.json();
        clientId = createdClient.id;
      }

      const res = await apiFetch('/api/quotes', {
        method: 'POST', body: JSON.stringify({ ...newQuote, clientId, creatorId: user.id })
      });
      if (res.ok) {
        // ── Registrar actividad en el trato vinculado ────────────────────────
        const targetDealId = fromDealMeta?.id || newQuote.linkedDealId || null;
        if (targetDealId) {
          const linkedDeal = fromDealMeta || deals.find(d => d.id === targetDealId);
          const isRecot = fromDealMeta?.stage === 'RECOTIZACION' || newQuote.projectPhase === 'RECOTIZACION';
          const fmtM = (n) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
          const content = isRecot
            ? `Recotización generada — Folio: ${newQuote.quoteNumber} | Total: ${fmtM(newQuote.total)} | Proyecto: ${newQuote.projectName || linkedDeal?.title || ''}`
            : `Cotización generada — Folio: ${newQuote.quoteNumber} | Total: ${fmtM(newQuote.total)} | Proyecto: ${newQuote.projectName || linkedDeal?.title || ''}`;
          apiFetch('/api/crm/deal-activities', {
            method: 'POST',
            body: JSON.stringify({
              dealId:     targetDealId,
              type:       'QUOTE',
              content,
              authorName: user?.name || 'Sistema',
              status:     'COMPLETED',
            })
          }).catch(() => {});
        }
        setShowAddModal(false);
        setNewQuote(initialNewQuote());
        setNewClientData(initialNewClientData());
        setClientMode('existing');
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

  // Llenar concepto desde catálogo
  const fillFromProduct = (product) => {
    if (!prodSearch) return;
    const { index, mode } = prodSearch;
    const patch = {
      serial: product.sku,
      name:   product.name,
      desc:   product.description || '',
      price:  product.price || 0,
    };
    if (mode === 'new') {
      const ni = [...newQuote.items];
      ni[index] = { ...ni[index], ...patch, total: Number(ni[index].qty) * Number(product.price || 0) };
      setNewQuote(f => ({ ...f, items: ni }));
    } else {
      const ni = [...(editQuote.items || [])];
      ni[index] = { ...ni[index], ...patch, total: Number(ni[index].qty) * Number(product.price || 0) };
      setEditQuote(f => ({ ...f, items: ni }));
    }
  };

  // Subir imagen por ítem (nueva cotización)
  const handleItemImage = async (index, file) => {
    if (!file) return;
    const base64 = await compressImage(file);
    const ni = [...newQuote.items];
    ni[index] = { ...ni[index], imageBase64: base64 };
    setNewQuote(f => ({ ...f, items: ni }));
  };

  // Subir imagen por ítem (edición)
  const handleEditItemImage = async (index, file) => {
    if (!file) return;
    const base64 = await compressImage(file);
    const ni = [...editQuote.items];
    ni[index] = { ...ni[index], imageBase64: base64 };
    setEditQuote(f => ({ ...f, items: ni }));
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
    <div className="space-y-6 pb-20">

      {/* ── Header Premium ───────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f2027 100%)', borderRadius: 28, padding: '36px 40px' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div style={{ position: 'absolute', right: -80, top: -80, width: 360, height: 360, background: 'radial-gradient(circle, rgba(16,185,129,.07) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', left: '40%', bottom: -40, width: 200, height: 200, background: 'radial-gradient(circle, rgba(99,102,241,.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: '.25em', textTransform: 'uppercase', fontFamily: 'monospace' }}>OleaControls · Sistema Comercial</span>
              </div>
              <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, color: '#f1f5f9', margin: 0, letterSpacing: '-.03em', lineHeight: 1 }}>
                Cotizaciones
              </h1>
              <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, margin: '6px 0 0', letterSpacing: '.06em' }}>
                {quotes.length} documento{quotes.length !== 1 ? 's' : ''} en el sistema
              </p>
            </div>
            <button
              onClick={() => { setNewQuote(initialNewQuote()); setNewClientData(initialNewClientData()); setClientMode('existing'); setShowAddModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#10b981', color: '#fff', padding: '14px 24px', borderRadius: 14, fontWeight: 900, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.1em', border: 'none', cursor: 'pointer', transition: 'all .2s', flexShrink: 0, boxShadow: '0 8px 24px rgba(16,185,129,.35)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.transform = 'none'; }}
            >
              <PlusCircle size={16} /> Nueva Cotización
            </button>
          </div>

          {/* KPIs inline en header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            {[
              { label: 'Cartera Total',    value: fmt(totalValue),    color: '#a5b4fc', accent: 'rgba(165,180,252,.15)' },
              { label: 'Valor Aprobado',   value: fmt(acceptedValue), color: '#6ee7b7', accent: 'rgba(110,231,183,.15)' },
              { label: 'Pendientes',       value: totalPending,       color: '#fcd34d', accent: 'rgba(252,211,77,.12)'  },
              { label: 'Aprobadas',        value: totalAccepted,      color: '#6ee7b7', accent: 'rgba(110,231,183,.12)' },
              { label: 'No Concretadas',   value: totalRejected,      color: '#fca5a5', accent: 'rgba(252,165,165,.12)' },
            ].map(({ label, value, color, accent }) => (
              <div key={label} style={{ background: accent, borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,.06)', backdropFilter: 'blur(4px)' }}>
                <p style={{ fontSize: 8, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.14em', margin: '0 0 6px' }}>{label}</p>
                <p style={{ fontSize: typeof value === 'string' ? 15 : 24, fontWeight: 900, color, margin: 0, fontFamily: 'monospace', lineHeight: 1 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: 14, padding: '11px 18px', flex: '1 1 200px', boxShadow: '0 1px 6px rgba(0,0,0,.04)' }}>
          <Search size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Buscar cliente, proyecto, número..."
            style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: '#0f172a', flex: 1 }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {[
            { id: 'ALL',      label: 'Todas',           ac: '#0f172a' },
            { id: 'PENDING',  label: 'Pendientes',       ac: '#d97706' },
            { id: 'ACCEPTED', label: 'Aprobadas',        ac: '#059669' },
            { id: 'REJECTED', label: 'No Concretadas',   ac: '#dc2626' },
            { id: 'EXPIRED',  label: 'Expiradas',        ac: '#64748b' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              style={{
                padding: '9px 16px', borderRadius: 10, fontWeight: 800, fontSize: 9, textTransform: 'uppercase',
                letterSpacing: '.1em', cursor: 'pointer', transition: 'all .15s',
                background: filterStatus === f.id ? f.ac : '#f1f5f9',
                color: filterStatus === f.id ? '#fff' : '#64748b',
                border: filterStatus === f.id ? `1.5px solid ${f.ac}` : '1.5px solid transparent',
                boxShadow: filterStatus === f.id ? `0 4px 12px ${f.ac}30` : 'none',
              }}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* ── Grid de cotizaciones ──────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: '#f8fafc', border: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={28} style={{ color: '#e2e8f0' }} />
          </div>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '.2em', margin: 0 }}>Sin cotizaciones</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 16 }}>
          {filtered.map((q, idx) => {
            const ss = STATUS_STYLE[q.status] || STATUS_STYLE.PENDING;
            const s  = STATUS[q.status]  || STATUS.PENDING;
            const SIcon = s.icon;
            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.045, type: 'spring', stiffness: 380, damping: 32 }}
                whileHover={{ y: -5 }}
                onClick={() => openDetail(q)}
                className="group"
                style={{
                  background: '#fff',
                  borderRadius: 20,
                  border: '1.5px solid #f1f5f9',
                  boxShadow: '0 2px 16px rgba(15,23,42,.06)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  transition: 'box-shadow .25s',
                  borderTop: `4px solid ${ss.accent}`,
                }}
              >
                {/* Cabecera card */}
                <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid #f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: '#94a3b8', letterSpacing: '.18em', textTransform: 'uppercase' }}>
                      {q.quoteNumber}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 8, fontWeight: 800, color: ss.text, background: ss.bg, border: `1.5px solid ${ss.border}`, borderRadius: 8, padding: '3px 9px', textTransform: 'uppercase', letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        <SIcon size={9} /> {s.label}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteQuote(q.id, q.quoteNumber); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '5px', cursor: 'pointer', color: '#ef4444', display: 'flex' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', margin: '0 0 4px', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {q.client?.companyName || '—'}
                  </h3>
                  {q.projectName && (
                    <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q.projectName}
                    </p>
                  )}
                </div>

                {/* Cuerpo card */}
                <div style={{ padding: '14px 20px 18px' }}>
                  {/* Vendedor + items */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, flexShrink: 0, letterSpacing: 0 }}>
                        {q.seller?.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130 }}>
                        {q.seller?.name || 'Sin asignar'}
                      </span>
                    </div>
                    {q.items?.length > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', background: '#f8fafc', border: '1px solid #f1f5f9', borderRadius: 8, padding: '3px 10px', flexShrink: 0 }}>
                        {q.items.length} ítem{q.items.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Precio + acciones */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.14em', margin: '0 0 2px' }}>Total</p>
                      <p style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', margin: 0, lineHeight: 1, letterSpacing: '-.02em' }}>{fmt(q.total)}</p>
                      <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={9} /> {fmtDate(q.validUntil)}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {q.status === 'PENDING' && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); updateStatus(q.id, 'ACCEPTED'); }}
                            title="Aprobar"
                            style={{ width: 34, height: 34, borderRadius: 10, background: '#ecfdf5', color: '#059669', border: '1.5px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(5,150,105,.35)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#ecfdf5'; e.currentTarget.style.color = '#059669'; e.currentTarget.style.borderColor = '#a7f3d0'; e.currentTarget.style.boxShadow = 'none'; }}
                          >
                            <CheckCircle2 size={15} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); updateStatus(q.id, 'REJECTED'); }}
                            title="Rechazar"
                            style={{ width: 34, height: 34, borderRadius: 10, background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(239,68,68,.35)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fecaca'; e.currentTarget.style.boxShadow = 'none'; }}
                          >
                            <X size={15} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); openDetail(q); setDetailTab('edit'); }}
                        title="Editar cotización"
                        style={{ width: 34, height: 34, borderRadius: 10, background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#0f172a'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={e => duplicateQuote(q, e)}
                        title="Duplicar cotización"
                        disabled={duplicating === q.id}
                        style={{ width: 34, height: 34, borderRadius: 10, background: '#f5f3ff', color: '#7c3aed', border: '1.5px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: duplicating === q.id ? 'wait' : 'pointer', transition: 'all .15s', flexShrink: 0, opacity: duplicating && duplicating !== q.id ? .5 : 1 }}
                        onMouseEnter={e => { if (!duplicating) { e.currentTarget.style.background = '#7c3aed'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(124,58,237,.35)'; } }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.color = '#7c3aed'; e.currentTarget.style.borderColor = '#ddd6fe'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        {duplicating === q.id
                          ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          : <Copy size={13} />
                        }
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); downloadPDF(q.id, q.quoteNumber); }}
                        title="Descargar PDF"
                        style={{ width: 34, height: 34, borderRadius: 10, background: '#eff6ff', color: '#3b82f6', border: '1.5px solid #dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(59,130,246,.35)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#3b82f6'; e.currentTarget.style.borderColor = '#dbeafe'; e.currentTarget.style.boxShadow = 'none'; }}
                      >
                        <Download size={14} />
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
                    clients={clients}
                    selectedQuote={selectedQuote}
                    onAddItem={addEditItem}
                    onRemoveItem={removeEditItem}
                    onUpdateItem={updateEditItem}
                    onItemImage={handleEditItemImage}
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

                {/* Selector de modo cliente */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Cliente *</p>
                  </div>
                  <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setClientMode('existing')}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                        clientMode === 'existing' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      <Building2 className="h-3 w-3" /> Cliente existente
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientMode('new')}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                        clientMode === 'new' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                      )}
                    >
                      <Plus className="h-3 w-3" /> Nuevo cliente
                    </button>
                  </div>

                  {/* Cliente existente */}
                  {clientMode === 'existing' && (
                    <div>
                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Seleccionar cliente *</label>
                      <select
                        required={clientMode === 'existing'}
                        className="w-full bg-gray-50 rounded-xl px-4 py-4 font-bold text-sm outline-none cursor-pointer"
                        value={newQuote.clientId}
                        onChange={e => setNewQuote(f => ({ ...f, clientId: e.target.value }))}
                      >
                        <option value="">Seleccionar cliente...</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Nuevo cliente */}
                  {clientMode === 'new' && (
                    <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 space-y-4">
                      <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5">
                        <User className="h-3 w-3" /> Datos del nuevo cliente
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Empresa / Nombre *</label>
                          <input
                            type="text" required={clientMode === 'new'}
                            className="w-full bg-white rounded-xl px-4 py-3 font-bold text-sm outline-none"
                            placeholder="Ej: ACME Industrias S.A."
                            value={newClientData.companyName}
                            onChange={e => setNewClientData(f => ({ ...f, companyName: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Correo electrónico *</label>
                          <input
                            type="text" required={clientMode === 'new'}
                            className="w-full bg-white rounded-xl px-4 py-3 font-bold text-sm outline-none"
                            placeholder="contacto@empresa.com"
                            value={newClientData.email}
                            onChange={e => setNewClientData(f => ({ ...f, email: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Nombre de contacto</label>
                          <input
                            type="text"
                            className="w-full bg-white rounded-xl px-4 py-3 font-bold text-sm outline-none"
                            placeholder="Nombre del contacto"
                            value={newClientData.contactName}
                            onChange={e => setNewClientData(f => ({ ...f, contactName: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Teléfono</label>
                          <input
                            type="tel"
                            className="w-full bg-white rounded-xl px-4 py-3 font-bold text-sm outline-none"
                            placeholder="+52 55 0000 0000"
                            value={newClientData.phone}
                            onChange={e => setNewClientData(f => ({ ...f, phone: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">RFC</label>
                          <input
                            type="text"
                            className="w-full bg-white rounded-xl px-4 py-3 font-bold text-sm outline-none uppercase"
                            placeholder="RFC del cliente"
                            value={newClientData.rfc}
                            onChange={e => setNewClientData(f => ({ ...f, rfc: e.target.value.toUpperCase() }))}
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Dirección</label>
                          <input
                            type="text"
                            className="w-full bg-white rounded-xl px-4 py-3 font-bold text-sm outline-none"
                            placeholder="Dirección fiscal o de envío"
                            value={newClientData.address}
                            onChange={e => setNewClientData(f => ({ ...f, address: e.target.value }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info general */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  {/* Vincular trato — solo si NO viene del pipeline (fromDealMeta ya lo trae) */}
                  {!fromDealMeta && (
                  <div>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">
                      Vincular a trato del pipeline
                    </label>
                    <select
                      className="w-full bg-emerald-50 rounded-xl px-4 py-4 font-bold text-sm outline-none text-emerald-800 cursor-pointer"
                      value={newQuote.linkedDealId}
                      onChange={e => {
                        const deal = deals.find(d => d.id === e.target.value);
                        setNewQuote(f => ({
                          ...f,
                          linkedDealId: e.target.value,
                          projectName: f.projectName || deal?.title || '',
                          contactName: f.contactName || deal?.contactName || '',
                          sellerId:    f.sellerId    || deal?.assignedToId || '',
                        }));
                      }}
                    >
                      <option value="">— Sin vincular —</option>
                      {deals.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.title}{d.company ? ` · ${d.company}` : ''}
                        </option>
                      ))}
                    </select>
                    {newQuote.linkedDealId && (
                      <p className="text-[8px] font-bold text-emerald-600 mt-1">
                        ✓ La cotización quedará registrada en el historial del trato
                      </p>
                    )}
                  </div>
                  )}
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
                    <div key={index} className="p-4 bg-gray-50 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setProdSearch({ index, mode: 'new' })}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex-shrink-0"
                        >
                          <Search className="h-3 w-3" /> Catálogo
                        </button>
                        <input className="flex-1 bg-white rounded-lg p-2.5 text-[10px] font-black uppercase outline-none" placeholder="Nº Serie / SKU" value={item.serial} onChange={e => updateItem(index, 'serial', e.target.value)} />
                        <button type="button" onClick={() => removeItem(index)}>
                          <X className="h-4 w-4 text-red-400 hover:text-red-600" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="col-span-12 sm:col-span-5 space-y-1.5">
                          <input className="w-full bg-white rounded-lg p-2.5 text-[10px] font-bold outline-none" placeholder="Nombre del producto / servicio" value={item.name} onChange={e => updateItem(index, 'name', e.target.value)} />
                          <input className="w-full bg-white/60 rounded-lg p-2 text-[9px] text-gray-500 outline-none" placeholder="Descripción adicional" value={item.desc} onChange={e => updateItem(index, 'desc', e.target.value)} />
                        </div>
                        <input className="col-span-12 sm:col-span-2 bg-white rounded-lg p-2.5 text-[10px] text-center font-bold outline-none" type="number" min="1" value={item.qty} onChange={e => updateItem(index, 'qty', parseInt(e.target.value) || 1)} onFocus={e => e.target.select()} />
                        <input className="col-span-12 sm:col-span-3 bg-white rounded-lg p-2.5 text-[10px] font-bold outline-none" type="number" min="0" step="0.01" placeholder="0.00" value={item.price} onChange={e => updateItem(index, 'price', parseFloat(e.target.value) || 0)} onFocus={e => e.target.select()} />
                        <div className="col-span-12 sm:col-span-2 text-right font-black text-xs text-gray-900">{fmt(item.qty * item.price)}</div>
                      </div>
                      {/* Imagen del producto */}
                      <div className="flex items-center gap-3 pt-1">
                        <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-white border border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 text-gray-400 hover:text-primary rounded-xl text-[8px] font-black uppercase tracking-widest transition-all">
                          <ImagePlus className="h-3 w-3" />
                          {item.imageBase64 ? 'Cambiar imagen' : 'Imagen del producto'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleItemImage(index, e.target.files[0])}
                          />
                        </label>
                        {item.imageBase64 && (
                          <>
                            <img src={item.imageBase64} alt={item.name} className="h-10 w-10 object-cover rounded-lg border border-gray-200 shadow-sm" />
                            <button
                              type="button"
                              onClick={() => updateItem(index, 'imageBase64', '')}
                              className="text-red-400 hover:text-red-600 transition-colors"
                              title="Quitar imagen"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
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
                  disabled={isGenerating || (clientMode === 'existing' ? !newQuote.clientId : (!newClientData.companyName || !newClientData.email))}
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

      {/* ── Buscador de catálogo ─────────────────────────────────────────── */}
      {prodSearch && (
        <ProductSearchModal
          onSelect={fillFromProduct}
          onClose={() => setProdSearch(null)}
        />
      )}
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

      {/* Imágenes de productos */}
      {(quote.items || []).some(i => i.imageBase64) && (
        <div>
          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <ImagePlus className="h-3 w-3" /> Imágenes de Productos
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {(quote.items || []).filter(i => i.imageBase64).map((item, i) => (
              <div key={i} className="space-y-2 text-center">
                <img
                  src={item.imageBase64}
                  alt={item.name}
                  className="w-full rounded-2xl object-cover border border-gray-100 shadow-sm"
                  style={{ maxHeight: 180 }}
                />
                <p className="text-[9px] font-black text-gray-800 uppercase leading-tight">{item.name || '—'}</p>
                {item.serial && <p className="text-[8px] font-bold text-gray-400">{item.serial}</p>}
              </div>
            ))}
          </div>
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
function QuoteEditForm({ editQuote, setEditQuote, employees, clients, selectedQuote, onAddItem, onRemoveItem, onUpdateItem, onItemImage, onSave, saving }) {
  const [clientSearch, setClientSearch] = React.useState('');
  const [clientOpen,   setClientOpen]   = React.useState(false);

  const currentClient = clients?.find(c => c.id === editQuote.clientId) || selectedQuote?.client;
  const filteredClients = (clients || []).filter(c =>
    !clientSearch || c.companyName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.contactName?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 space-y-6">

      {/* ── Selector de Cliente ── */}
      <div>
        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Cliente</label>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => { setClientOpen(o => !o); setClientSearch(''); }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: currentClient ? '#f0fdf4' : '#f9fafb', border: `1.5px solid ${currentClient ? '#a7f3d0' : '#e5e7eb'}`, borderRadius: 12, padding: '10px 14px', cursor: 'pointer', transition: 'all .15s', textAlign: 'left' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: currentClient ? '#059669' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Building2 size={14} style={{ color: currentClient ? '#fff' : '#9ca3af' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: currentClient ? '#065f46' : '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {currentClient?.companyName || 'Seleccionar cliente...'}
                </p>
                {currentClient?.contactName && (
                  <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>{currentClient.contactName}</p>
                )}
              </div>
            </div>
            <ChevronRight size={14} style={{ color: '#9ca3af', flexShrink: 0, transform: clientOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
          </button>

          {clientOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 14, boxShadow: '0 12px 32px rgba(0,0,0,.12)', zIndex: 50, overflow: 'hidden' }}>
              <div style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', borderRadius: 10, padding: '7px 12px' }}>
                  <Search size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar empresa o contacto..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, fontWeight: 600, color: '#111827', flex: 1 }}
                  />
                </div>
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {filteredClients.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Sin resultados</div>
                ) : filteredClients.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setEditQuote(f => ({ ...f, clientId: c.id })); setClientOpen(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: editQuote.clientId === c.id ? '#f0fdf4' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background .1s' }}
                    onMouseEnter={e => { if (editQuote.clientId !== c.id) e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={e => { if (editQuote.clientId !== c.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: editQuote.clientId === c.id ? '#059669' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 900, color: editQuote.clientId === c.id ? '#fff' : '#6b7280' }}>
                      {c.companyName?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.companyName}</p>
                      {c.contactName && <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>{c.contactName}</p>}
                    </div>
                    {editQuote.clientId === c.id && <CheckCircle2 size={14} style={{ color: '#059669', marginLeft: 'auto', flexShrink: 0 }} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

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
          <div key={i} className="p-3 bg-gray-50 rounded-2xl space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProdSearch({ index: i, mode: 'edit' })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all flex-shrink-0"
              >
                <Search className="h-3 w-3" /> Catálogo
              </button>
              <input className="flex-1 bg-white rounded-lg p-2 text-[9px] font-black uppercase outline-none" placeholder="Nº Serie / SKU" value={item.serial || ''} onChange={e => onUpdateItem(i, 'serial', e.target.value)} />
              <button type="button" onClick={() => onRemoveItem(i)}>
                <X className="h-3.5 w-3.5 text-red-400" />
              </button>
            </div>
            <div className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-5 space-y-1">
                <input className="w-full bg-white rounded-lg p-2 text-[9px] font-bold outline-none" placeholder="Producto / Servicio" value={item.name || ''} onChange={e => onUpdateItem(i, 'name', e.target.value)} />
                <input className="w-full bg-white/60 rounded-lg p-1.5 text-[8px] text-gray-500 outline-none" placeholder="Descripción" value={item.desc || ''} onChange={e => onUpdateItem(i, 'desc', e.target.value)} />
              </div>
              <input className="col-span-2 bg-white rounded-lg p-2 text-[9px] text-center font-bold outline-none" type="number" min="1" value={item.qty} onChange={e => onUpdateItem(i, 'qty', parseInt(e.target.value) || 1)} onFocus={e => e.target.select()} />
              <input className="col-span-3 bg-white rounded-lg p-2 text-[9px] font-bold outline-none" type="number" min="0" step="0.01" placeholder="Precio" value={item.price} onChange={e => onUpdateItem(i, 'price', parseFloat(e.target.value) || 0)} onFocus={e => e.target.select()} />
              <div className="col-span-2 text-right font-black text-xs text-gray-900">{fmt(Number(item.qty) * Number(item.price))}</div>
            </div>
            {/* Imagen del producto */}
            <div className="flex items-center gap-3 pt-1">
              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-white border border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 text-gray-400 hover:text-primary rounded-xl text-[8px] font-black uppercase tracking-widest transition-all">
                <ImagePlus className="h-3 w-3" />
                {item.imageBase64 ? 'Cambiar imagen' : 'Imagen del producto'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => onItemImage && onItemImage(i, e.target.files[0])}
                />
              </label>
              {item.imageBase64 && (
                <>
                  <img src={item.imageBase64} alt={item.name} className="h-10 w-10 object-cover rounded-lg border border-gray-200 shadow-sm" />
                  <button
                    type="button"
                    onClick={() => onUpdateItem(i, 'imageBase64', '')}
                    className="text-red-400 hover:text-red-600 transition-colors"
                    title="Quitar imagen"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
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
