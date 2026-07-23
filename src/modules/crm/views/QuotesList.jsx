import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Plus, FileText, Download, Search, Trash2, PlusCircle, Building2,


  User, Calendar, DollarSign, X, Save, CheckCircle2, AlertCircle,
  Clock, Hash, Send, Edit3, ExternalLink, ChevronRight, TrendingUp,
  BarChart2, Percent, Eye, RefreshCw, Package, Loader2, ImagePlus, Copy,
  BookOpen, ChevronDown, ChevronUp, ArrowUp, ArrowDown, ChevronsUpDown,
  FileSpreadsheet

} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/store/AuthContext';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import Pagination from '../components/Pagination';

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

// ── Encabezado de columna ordenable (estilo Excel) ────────────────────────────
function QSortTH({ label, col, sortConfig, onSort, align = 'left', className }) {
  const active = sortConfig.key === col;
  const alignCls = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
  return (
    <th className={cn("px-3 py-2.5 select-none whitespace-nowrap", className)}>
      <button
        onClick={() => onSort(col)}
        className={cn(
          "flex items-center gap-1 w-full text-[9px] font-black uppercase tracking-widest transition-colors hover:text-emerald-600",
          alignCls,
          active ? 'text-emerald-600' : 'text-slate-400'
        )}
      >
        {label}
        {active
          ? (sortConfig.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
          : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );
}

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

// ── Sección de Promociones ────────────────────────────────────────────────────
const PAYMENT_OPTS = [
  { hrs: 24, pct: 5,  label: 'Inmediato 24Hrs', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { hrs: 48, pct: 3,  label: 'Preferente',      color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { hrs: 72, pct: 1,  label: 'Programado',       color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
];

function PromoSection({ subtotal, discountPct, onChange }) {
  const base     = subtotal;                  // descuento sobre precio sin IVA
  const discount = discountPct > 0 ? base * discountPct / 100 : 0;

  return (
    <div style={{ border: '1.5px solid #e9d5ff', borderRadius: 20, background: 'linear-gradient(135deg,#faf5ff 0%,#f5f3ff 100%)', padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Percent size={14} style={{ color: '#fff' }} />
        </div>
        <p style={{ fontSize: 9, fontWeight: 900, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '.12em', margin: 0 }}>
          Promoción
        </p>
      </div>

      {/* Tarjetas de pago rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        {PAYMENT_OPTS.map(opt => {
          const active = discountPct === opt.pct;
          return (
            <button
              key={opt.hrs}
              type="button"
              onClick={() => onChange(active ? 0 : opt.pct)}
              style={{
                borderRadius: 14, padding: '12px 8px', textAlign: 'center', cursor: 'pointer',
                border: `2px solid ${active ? opt.color : opt.border}`,
                background: active ? opt.color : opt.bg,
                transition: 'all .15s', boxShadow: active ? `0 4px 14px ${opt.color}30` : 'none',
              }}
            >
              <p style={{ fontSize: 7.5, fontWeight: 900, color: active ? 'rgba(255,255,255,.8)' : '#6b7280', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 4px' }}>
                Pago {opt.label}
              </p>
              <p style={{ fontSize: 22, fontWeight: 900, color: active ? '#fff' : opt.color, margin: '0 0 2px', lineHeight: 1 }}>
                {opt.pct}%
              </p>
              <p style={{ fontSize: 7, fontWeight: 700, color: active ? 'rgba(255,255,255,.75)' : '#9ca3af', margin: 0 }}>
                de descuento
              </p>
              {active && subtotal > 0 && (
                <p style={{ fontSize: 8, fontWeight: 900, color: '#fff', marginTop: 6, background: 'rgba(0,0,0,.15)', borderRadius: 6, padding: '2px 6px', display: 'inline-block' }}>
                  −${(subtotal * opt.pct / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Input manual de porcentaje */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1.5px solid #ddd6fe', borderRadius: 12, padding: '8px 14px', flex: '0 0 auto' }}>
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={discountPct || ''}
            placeholder="0"
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            style={{ width: 44, fontWeight: 900, fontSize: 16, color: '#7c3aed', background: 'transparent', border: 'none', outline: 'none', textAlign: 'center' }}
          />
          <span style={{ fontWeight: 900, fontSize: 16, color: '#7c3aed' }}>%</span>
        </div>

        {discountPct > 0 && subtotal > 0 ? (
          <>
            <div style={{ flex: 1, background: '#fff', border: '1.5px solid #bbf7d0', borderRadius: 12, padding: '8px 14px' }}>
              <p style={{ fontSize: 7.5, fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.08em', margin: '0 0 1px' }}>Ahorro total</p>
              <p style={{ fontSize: 14, fontWeight: 900, color: '#16a34a', margin: 0 }}>
                −${discount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange(0)}
              style={{ width: 34, height: 34, borderRadius: 10, background: '#fef2f2', border: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <X size={13} style={{ color: '#ef4444' }} />
            </button>
          </>
        ) : (
          <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, margin: 0 }}>
            Ingresa un porcentaje o selecciona una opción de pago rápido
          </p>
        )}
      </div>

      {/* Descripción de condiciones de pago */}
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e9d5ff', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 7.5, fontWeight: 700, color: '#9ca3af', margin: 0, letterSpacing: '.04em' }}>
          Condiciones de pago anticipado:
        </p>
        {PAYMENT_OPTS.map((opt, i) => (
          <React.Fragment key={opt.hrs}>
            <span style={{ fontSize: 7.5, fontWeight: 900, color: opt.color, background: opt.bg, border: `1px solid ${opt.border}`, borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>
              {opt.label} → {opt.pct}% desc.
            </span>
            {i < PAYMENT_OPTS.length - 1 && (
              <span style={{ fontSize: 8, color: '#d1d5db', fontWeight: 900 }}>·</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ── Campo con frases guardadas (genérico) ─────────────────────────────────────
function RequirementsField({
  value, onChange, phrases, onSavePhrase, onDeletePhrase,
  label = 'Requerimientos del cliente',
  placeholder = 'Describe los requerimientos específicos del cliente...',
  textareaClass = 'w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-sm outline-none resize-none border border-gray-100 focus:border-blue-300 transition-colors',
  hideLabel = false,
}) {
  const [open,    setOpen]    = React.useState(false);
  const [saving,  setSaving]  = React.useState(false);

  const handleInsert = (text) => {
    onChange(value ? `${value}\n${text}` : text);
  };

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    await onSavePhrase(value.trim());
    setSaving(false);
  };

  return (
    <div className="space-y-2">
      {!hideLabel && <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">{label}</label>}
      <textarea
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={textareaClass}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: open ? '#1e40af' : '#f1f5f9', color: open ? '#fff' : '#475569', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 8, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', transition: 'all .15s' }}
        >
          <BookOpen size={11} />
          Frases guardadas ({phrases.length})
          {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
        {value.trim() && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#eff6ff', color: '#2563eb', borderRadius: 10, border: '1px solid #bfdbfe', cursor: 'pointer', fontSize: 8, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', transition: 'all .15s', opacity: saving ? .6 : 1 }}
          >
            <Save size={10} />
            {saving ? 'Guardando...' : '+ Guardar como frase'}
          </button>
        )}
      </div>

      {open && (
        <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,.07)' }}>
          {phrases.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
              No hay frases guardadas aún.<br />
              <span style={{ fontSize: 9, color: '#cbd5e1' }}>Escribe algo y haz clic en "Guardar como frase"</span>
            </div>
          ) : (
            <div style={{ maxHeight: 220, overflowY: 'auto' }}>
              {phrases.map(ph => (
                <div
                  key={ph.id}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderBottom: '1px solid #f8fafc', transition: 'background .1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <p style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#374151', margin: 0, lineHeight: 1.5 }}>{ph.text}</p>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => { handleInsert(ph.text); setOpen(false); }}
                      style={{ padding: '3px 9px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 7, fontSize: 8, fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '.06em' }}
                    >
                      Insertar
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePhrase(ph.id)}
                      style={{ padding: '3px 6px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [phrases,        setPhrases]        = useState([]);
  const [termsPhases,    setTermsPhases]    = useState([]);
  const [benefitsPhases, setBenefitsPhases] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterClient, setFilterClient] = useState('ALL');

  // Modal: detalle / edición
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [detailTab,     setDetailTab]     = useState('preview'); // 'preview' | 'edit'
  const [editQuote,     setEditQuote]     = useState({});
  const [savingQuote,   setSavingQuote]   = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [duplicating,   setDuplicating]   = useState(null);
  const [sendingPipeline, setSendingPipeline] = useState(null);

  // Modal: crear cotización
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [quoteStep,     setQuoteStep]     = useState(1); // wizard 1..4
  const [isGenerating,  setIsGenerating]  = useState(false);
  const [fromDealMeta,  setFromDealMeta]  = useState(null); // deal del que proviene la cotización
  const [prodSearch,    setProdSearch]    = useState(null); // { index, mode:'new'|'edit' }
  const [clientMode,      setClientMode]      = useState('existing'); // 'existing' | 'new'
  const [newClientSearch, setNewClientSearch] = useState('');
  const [newClientOpen,   setNewClientOpen]   = useState(false);
  // Reinicia el asistente al primer paso cada vez que se abre el modal
  useEffect(() => { if (showAddModal) setQuoteStep(1); }, [showAddModal]);
  const initialNewClientData = () => ({ companyName: '', contactName: '', email: '', phone: '', rfc: '', address: '' });
  const [newClientData, setNewClientData] = useState(initialNewClientData());

  const initialNewQuote = () => ({
    quoteNumber:  generateQuoteNumber(),
    clientId:     '', sellerId: '', projectName: '', projectPhase: 'INICIAL',
    linkedDealId: '',
    contactName:  '',
    templateType:  'PRESUPUESTO',
    requirements:  '',
    observations:  '',
    benefits:      '',
    validUntil:    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    terms:         'Pago 100% anticipado. Tiempo de entrega sujeto a existencias.',
    items:         [emptyItem()],
    discountPct: 0, adjustment: 0,
    subtotal: 0, tax: 0, total: 0
  });

  const [newQuote, setNewQuote] = useState(initialNewQuote());

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const [qRes, cRes, eRes, dRes, phRes, thRes, bhRes] = await Promise.all([
        apiFetch('/api/quotes'), apiFetch('/api/crm/clients'),
        apiFetch('/api/employees'), apiFetch('/api/crm/deals'),
        apiFetch('/api/quote-phrases?category=requirements'),
        apiFetch('/api/quote-phrases?category=terms'),
        apiFetch('/api/quote-phrases?category=benefits'),
      ]);
      const [q, c, e, d, ph, th, bh] = await Promise.all([qRes.json(), cRes.json(), eRes.json(), dRes.json(), phRes.json(), thRes.json(), bhRes.json()]);
      setQuotes(Array.isArray(q) ? q : []);
      setClients(Array.isArray(c) ? c : []);
      setEmployees(Array.isArray(e) ? e : []);
      setDeals(Array.isArray(d) ? d.filter(deal => !['CLOSED_WON','CLOSED_LOST'].includes(deal.stage)) : []);
      setPhrases(Array.isArray(ph) ? ph : []);
      setTermsPhases(Array.isArray(th) ? th : []);
      setBenefitsPhases(Array.isArray(bh) ? bh : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const savePhrase = async (text) => {
    try {
      const res = await apiFetch('/api/quote-phrases', { method: 'POST', body: JSON.stringify({ text, category: 'requirements' }) });
      if (res.ok) { const ph = await res.json(); setPhrases(prev => [...prev, ph]); }
    } catch (err) { console.error(err); }
  };

  const deletePhrase = async (id) => {
    try {
      const res = await apiFetch('/api/quote-phrases', { method: 'DELETE', body: JSON.stringify({ id }) });
      if (res.ok) setPhrases(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error(err); }
  };

  const saveTermsPhrase = async (text) => {
    try {
      const res = await apiFetch('/api/quote-phrases', { method: 'POST', body: JSON.stringify({ text, category: 'terms' }) });
      if (res.ok) { const ph = await res.json(); setTermsPhases(prev => [...prev, ph]); }
    } catch (err) { console.error(err); }
  };

  const deleteTermsPhrase = async (id) => {
    try {
      const res = await apiFetch('/api/quote-phrases', { method: 'DELETE', body: JSON.stringify({ id }) });
      if (res.ok) setTermsPhases(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error(err); }
  };

  const saveBenefitsPhrase = async (text) => {
    try {
      const res = await apiFetch('/api/quote-phrases', { method: 'POST', body: JSON.stringify({ text, category: 'benefits' }) });
      if (res.ok) { const ph = await res.json(); setBenefitsPhases(prev => [...prev, ph]); }
    } catch (err) { console.error(err); }
  };

  const deleteBenefitsPhrase = async (id) => {
    try {
      const res = await apiFetch('/api/quote-phrases', { method: 'DELETE', body: JSON.stringify({ id }) });
      if (res.ok) setBenefitsPhases(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error(err); }
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

  // Recalcular totales al cambiar ítems o descuento (nuevo modal)
  useEffect(() => {
    const sub = newQuote.items.reduce((acc, i) => acc + (Number(i.qty) * Number(i.price)), 0);
    const tax = sub * 0.16;
    const pct = newQuote.discountPct || 0;
    const adj = pct > 0 ? -(sub * pct / 100) : 0;
    setNewQuote(prev => ({ ...prev, subtotal: sub, tax, adjustment: adj, total: sub + tax + adj }));
  }, [newQuote.items, newQuote.discountPct]);

  // Recalcular al editar ítems o descuento en el modal de detalle
  useEffect(() => {
    if (!editQuote.items) return;
    const sub = editQuote.items.reduce((acc, i) => acc + (Number(i.qty) * Number(i.price)), 0);
    const tax = sub * 0.16;
    const pct = editQuote.discountPct || 0;
    const adj = pct > 0 ? -(sub * pct / 100) : 0;
    setEditQuote(prev => ({ ...prev, subtotal: sub, tax, adjustment: adj, total: sub + tax + adj }));
  }, [editQuote.items, editQuote.discountPct]);

  // ── Abrir detalle ─────────────────────────────────────────────────────────
  const openDetail = (quote) => {
    setSelectedQuote(quote);
    setDetailTab('preview');
    setEditQuote({
      clientId:     quote.clientId     || '',
      sellerId:     quote.sellerId     || '',
      projectName:  quote.projectName  || '',
      contactName:  quote.contactName  || '',
      validUntil:   quote.validUntil ? quote.validUntil.split('T')[0] : '',
      terms:        quote.terms        || '',
      templateType:  quote.templateType  || 'PRESUPUESTO',
      requirements:  quote.requirements  || '',
      observations:  quote.observations  || '',
      benefits:      quote.benefits      || '',
      items:         quote.items ? JSON.parse(JSON.stringify(quote.items)) : [],
      subtotal:     quote.subtotal  || 0,
      tax:          quote.tax       || 0,
      adjustment:   quote.adjustment || 0,
      total:        quote.total     || 0,
      discountPct:  (quote.adjustment < 0 && quote.subtotal > 0)
        ? Math.round(Math.abs(quote.adjustment) / quote.subtotal * 1000) / 10
        : 0,
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
        setEditQuote({
          clientId:    updated.clientId    || '',
          sellerId:    updated.sellerId    || '',
          projectName: updated.projectName || '',
          contactName: updated.contactName || '',
          validUntil:  updated.validUntil ? updated.validUntil.split('T')[0] : '',
          terms:       updated.terms       || '',
          templateType: updated.templateType || 'PRESUPUESTO',
          requirements: updated.requirements || '',
          observations: updated.observations || '',
          benefits:    updated.benefits    || '',
          items:       updated.items ? JSON.parse(JSON.stringify(updated.items)) : [],
          subtotal:    updated.subtotal    || 0,
          tax:         updated.tax         || 0,
          adjustment:  updated.adjustment  || 0,
          total:       updated.total       || 0,
          discountPct: (updated.adjustment < 0 && updated.subtotal > 0)
            ? Math.round(Math.abs(updated.adjustment) / updated.subtotal * 1000) / 10
            : 0,
        });
        setDetailTab('preview');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert('Error al guardar: ' + (errData.error || res.status));
      }
    } catch (err) { console.error(err); alert('Error de red al guardar la cotización.'); }
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

  // ── Mandar cotización al pipeline ─────────────────────────────────────────
  // Crea (o mueve) un trato a la etapa "Cotización enviada" del Pipeline CRM,
  // vincula la cotización al trato y registra la actividad para darle seguimiento.
  const sendToPipeline = async (q, e) => {
    e?.stopPropagation();
    if (sendingPipeline) return;
    if (q.dealId && !window.confirm(`Esta cotización ya está vinculada a un trato del embudo.\n\n¿Actualizar el trato a la etapa "Cotización enviada" y registrar el seguimiento?`)) return;
    setSendingPipeline(q.id);
    const fmtM = (n) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;
    try {
      const client = clients.find(c => c.id === q.clientId) || q.client || {};
      let dealId = q.dealId;

      if (dealId) {
        // Mover el trato existente a "Cotización enviada"
        const res = await apiFetch('/api/crm/deals', {
          method: 'PUT',
          body: JSON.stringify({ id: dealId, stage: 'PROPOSAL_SENT' })
        });
        if (!res.ok) throw new Error('No se pudo actualizar el trato en el embudo');
      } else {
        // Crear un nuevo trato en la etapa "Cotización enviada"
        const res = await apiFetch('/api/crm/deals', {
          method: 'POST',
          body: JSON.stringify({
            title:        q.projectName || client.companyName || q.quoteNumber,
            value:        q.total || 0,
            company:      client.companyName || null,
            contactName:  q.contactName || client.contactName || null,
            contactEmail: client.email || null,
            contactPhone: client.phone || null,
            clientId:     q.clientId || null,
            stage:        'PROPOSAL_SENT',
            source:       'Cotización',
            description:  `Trato generado desde la cotización ${q.quoteNumber}`,
          })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'No se pudo crear el trato en el embudo');
        }
        const deal = await res.json();
        dealId = deal.id;
        // Vincular la cotización al trato recién creado
        await apiFetch('/api/quotes', {
          method: 'PUT',
          body: JSON.stringify({ id: q.id, dealId })
        }).catch(() => {});
      }

      // Registrar la actividad de seguimiento en el trato
      await apiFetch('/api/crm/deal-activities', {
        method: 'POST',
        body: JSON.stringify({
          dealId,
          type:       'QUOTE',
          content:    `Cotización enviada al embudo — Folio: ${q.quoteNumber} | Total: ${fmtM(q.total)} | Proyecto: ${q.projectName || client.companyName || ''}`,
          authorName: user?.name || 'Sistema',
          status:     'COMPLETED',
        })
      }).catch(() => {});

      await fetchData();
      alert('✓ Cotización enviada al embudo. Ya puedes darle seguimiento en el Embudo CRM (etapa "Cotización enviada").');
    } catch (err) {
      alert('Error al enviar al embudo: ' + err.message);
    } finally {
      setSendingPipeline(null);
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
    const newWin = window.open('', '_blank'); // abrir antes del await para evitar bloqueo del popup blocker
    newWin.document.write('<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;font-family:sans-serif;"><p style="color:#64748b;font-size:15px;font-weight:600;">Generando PDF, espere...</p></body></html>');
    try {
      const res  = await apiFetch(`/api/quotes?id=${quoteId}`);
      const data = await res.json();
      if (data.pdfUrl) {
        newWin.location = `${data.pdfUrl}?t=${Date.now()}`;
      } else {
        newWin.close();
        alert('No se pudo generar el PDF. Intenta de nuevo.');
      }
    } catch (err) { console.error(err); newWin.close(); }
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

      const targetDealId = fromDealMeta?.id || newQuote.linkedDealId || null;
      const res = await apiFetch('/api/quotes', {
        method: 'POST', body: JSON.stringify({ ...newQuote, clientId, creatorId: user.id, dealId: targetDealId })
      });
      if (res.ok) {
        // ── Registrar actividad en el trato vinculado ────────────────────────
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

  // ── Orden de columnas (estilo Excel) ──────────────────────────────────────
  const [sortConfig, setSortConfig] = useState({ key: 'date', dir: -1 });
  const toggleSort = (key) =>
    setSortConfig(prev => prev.key === key ? { key, dir: -prev.dir } : { key, dir: key === 'date' || key === 'total' ? -1 : 1 });

  // ── Clientes con cotizaciones (para el filtro) ────────────────────────────
  const clientOptions = useMemo(() => {
    const map = new Map();
    quotes.forEach(q => {
      if (!q.clientId) return;
      const name = q.client?.companyName || clients.find(c => c.id === q.clientId)?.companyName || 'Sin nombre';
      const prev = map.get(q.clientId);
      map.set(q.clientId, { id: q.clientId, name, count: (prev?.count || 0) + 1 });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [quotes, clients]);

  // ── Filtrado + orden ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const list = quotes.filter(q => {
      const matchSearch = !searchTerm ||
        [q.quoteNumber, q.client?.companyName, q.projectName, q.seller?.name]
          .some(v => v?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = filterStatus === 'ALL' || q.status === filterStatus;
      const matchClient = filterClient === 'ALL' || q.clientId === filterClient;
      return matchSearch && matchStatus && matchClient;
    });

    const { key, dir } = sortConfig;
    const cmp = {
      folio:   (a, b) => (a.quoteNumber || '').localeCompare(b.quoteNumber || '', 'es'),
      client:  (a, b) => (a.client?.companyName || '').localeCompare(b.client?.companyName || '', 'es'),
      project: (a, b) => (a.projectName || '').localeCompare(b.projectName || '', 'es'),
      seller:  (a, b) => (a.seller?.name || '').localeCompare(b.seller?.name || '', 'es'),
      status:  (a, b) => (a.status || '').localeCompare(b.status || '', 'es'),
      items:   (a, b) => (a.items?.length || 0) - (b.items?.length || 0),
      total:   (a, b) => (a.total || 0) - (b.total || 0),
      date:    (a, b) => new Date(a.validUntil || a.createdAt || 0) - new Date(b.validUntil || b.createdAt || 0),
    }[key];
    if (cmp) list.sort((a, b) => dir * cmp(a, b));
    return list;
  }, [quotes, searchTerm, filterStatus, filterClient, sortConfig]);

  // ── Paginación (hojas) ─────────────────────────────────────────────────────
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Volver a la primera hoja cuando cambian filtros, búsqueda, orden o tamaño
  useEffect(() => { setPage(1); }, [searchTerm, filterStatus, filterClient, sortConfig, pageSize]);
  // Corregir la página si el total se reduce (ej. al eliminar)
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);
  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  // ── Exportar a CSV (abre en Excel) ────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Folio', 'Cliente', 'Proyecto', 'Vendedor', 'Ítems', 'Vigencia', 'Subtotal', 'IVA', 'Total', 'Estado'];
    const rows = filtered.map(q => [
      q.quoteNumber, q.client?.companyName, q.projectName, q.seller?.name,
      q.items?.length || 0, fmtDate(q.validUntil),
      q.subtotal || 0, q.tax || 0, q.total || 0,
      STATUS[q.status]?.label || q.status,
    ]);
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cotizaciones-oleacontrols-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        {/* Filtro por cliente */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, background: '#fff',
          border: filterClient !== 'ALL' ? '1.5px solid #6366f1' : '1.5px solid #f1f5f9',
          borderRadius: 14, padding: '9px 14px', flex: '0 1 260px',
          boxShadow: filterClient !== 'ALL' ? '0 4px 12px rgba(99,102,241,.18)' : '0 1px 6px rgba(0,0,0,.04)',
          transition: 'all .15s',
        }}>
          <Building2 size={14} style={{ color: filterClient !== 'ALL' ? '#6366f1' : '#94a3b8', flexShrink: 0 }} />
          <select
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
            style={{
              background: 'transparent', border: 'none', outline: 'none', flex: 1, cursor: 'pointer',
              fontSize: 12, fontWeight: 800, color: filterClient !== 'ALL' ? '#4338ca' : '#64748b',
              maxWidth: '100%', textOverflow: 'ellipsis',
            }}
          >
            <option value="ALL">Todos los clientes ({quotes.length})</option>
            {clientOptions.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.count})</option>
            ))}
          </select>
          {filterClient !== 'ALL' && (
            <button
              onClick={() => setFilterClient('ALL')}
              title="Quitar filtro de cliente"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 6, background: '#eef2ff', border: 'none', cursor: 'pointer', flexShrink: 0 }}
            >
              <X size={11} style={{ color: '#6366f1' }} />
            </button>
          )}
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
        <button
          onClick={exportCSV}
          title="Exportar a Excel (CSV)"
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, fontWeight: 800, fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', cursor: 'pointer', transition: 'all .15s', background: '#fff', color: '#059669', border: '1.5px solid #a7f3d0' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#ecfdf5'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
        >
          <FileSpreadsheet size={13} /> Exportar
        </button>
      </div>

      {/* ── Tabla de cotizaciones (estilo Excel) ─────────────────────────── */}
      {filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: '#f8fafc', border: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={28} style={{ color: '#e2e8f0' }} />
          </div>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '.2em', margin: 0 }}>Sin cotizaciones</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full border-collapse text-left min-w-[900px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50 border-b border-slate-200">
                  <QSortTH label="Folio"    col="folio"   sortConfig={sortConfig} onSort={toggleSort} className="pl-4" />
                  <QSortTH label="Cliente"  col="client"  sortConfig={sortConfig} onSort={toggleSort} />
                  <QSortTH label="Proyecto" col="project" sortConfig={sortConfig} onSort={toggleSort} />
                  <QSortTH label="Vendedor" col="seller"  sortConfig={sortConfig} onSort={toggleSort} />
                  <QSortTH label="Ítems"    col="items"   sortConfig={sortConfig} onSort={toggleSort} align="center" />
                  <QSortTH label="Vigencia" col="date"    sortConfig={sortConfig} onSort={toggleSort} />
                  <QSortTH label="Total"    col="total"   sortConfig={sortConfig} onSort={toggleSort} align="right" />
                  <QSortTH label="Estado"   col="status"  sortConfig={sortConfig} onSort={toggleSort} align="center" />
                  <th className="px-3 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((q, idx) => {
                  const ss = STATUS_STYLE[q.status] || STATUS_STYLE.PENDING;
                  const s  = STATUS[q.status]  || STATUS.PENDING;
                  const SIcon = s.icon;
                  const isSel = selectedQuote?.id === q.id;
                  return (
                    <tr
                      key={q.id}
                      onClick={() => openDetail(q)}
                      className={cn(
                        "group cursor-pointer border-b border-slate-100 transition-colors",
                        isSel ? 'bg-emerald-50/60' : idx % 2 ? 'bg-slate-50/40 hover:bg-emerald-50/40' : 'bg-white hover:bg-emerald-50/40'
                      )}
                    >
                      {/* Folio */}
                      <td className="pl-4 pr-3 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <span className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: ss.accent }} />
                          <span className="text-[11px] font-black font-mono text-slate-700 tracking-tight">{q.quoteNumber}</span>
                        </div>
                      </td>
                      {/* Cliente */}
                      <td className="px-3 py-2.5">
                        <span className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors block truncate max-w-[190px]">
                          {q.client?.companyName || '—'}
                        </span>
                      </td>
                      {/* Proyecto */}
                      <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 truncate max-w-[170px]">{q.projectName || '—'}</td>
                      {/* Vendedor */}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px] font-black flex-shrink-0">
                            {q.seller?.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-600 truncate max-w-[110px]">{q.seller?.name || 'Sin asignar'}</span>
                        </div>
                      </td>
                      {/* Ítems */}
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[11px] font-black text-slate-700 tabular-nums">{q.items?.length || 0}</span>
                      </td>
                      {/* Vigencia */}
                      <td className="px-3 py-2.5 text-[11px] font-bold text-slate-500 whitespace-nowrap">{fmtDate(q.validUntil)}</td>
                      {/* Total */}
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-xs font-black font-mono text-slate-900 tabular-nums whitespace-nowrap">{fmt(q.total)}</span>
                      </td>
                      {/* Estado */}
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className="inline-flex items-center gap-1 text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide whitespace-nowrap"
                          style={{ background: ss.bg, color: ss.text, border: `1.5px solid ${ss.border}` }}
                        >
                          <SIcon size={9} /> {s.label}
                        </span>
                      </td>
                      {/* Acciones */}
                      <td className="px-3 py-2.5 pr-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {q.status === 'PENDING' && (
                            <>
                              <button onClick={() => updateStatus(q.id, 'ACCEPTED')} title="Aprobar"
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all">
                                <CheckCircle2 size={14} />
                              </button>
                              <button onClick={() => updateStatus(q.id, 'REJECTED')} title="No concretada"
                                className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                                <X size={14} />
                              </button>
                            </>
                          )}
                          <button onClick={() => { openDetail(q); setDetailTab('edit'); }} title="Editar"
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white transition-all">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={e => duplicateQuote(q, e)} title="Duplicar" disabled={duplicating === q.id}
                            className="p-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white transition-all disabled:opacity-50">
                            {duplicating === q.id ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                          </button>
                          <button onClick={e => sendToPipeline(q, e)} disabled={sendingPipeline === q.id}
                            title={q.dealId ? 'Actualizar en embudo' : 'Mandar al embudo'}
                            className={cn("p-1.5 rounded-lg transition-all disabled:opacity-50",
                              q.dealId ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                                       : "bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white")}>
                            {sendingPipeline === q.id ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                          </button>
                          <button onClick={() => downloadPDF(q.id, q.quoteNumber)} title="Descargar PDF"
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-all">
                            <Download size={14} />
                          </button>
                          <button onClick={() => deleteQuote(q.id, q.quoteNumber)} title="Eliminar"
                            className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-600 transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Tarjetas (móvil) — sin scroll horizontal ── */}
          <div className="md:hidden divide-y divide-slate-100">
            {paged.map((q) => {
              const ss = STATUS_STYLE[q.status] || STATUS_STYLE.PENDING;
              const s  = STATUS[q.status]  || STATUS.PENDING;
              const SIcon = s.icon;
              const isSel = selectedQuote?.id === q.id;
              return (
                <div key={q.id} onClick={() => openDetail(q)}
                  className={cn("p-4 cursor-pointer", isSel ? 'bg-emerald-50/60' : 'bg-white')}>
                  <div className="flex items-start gap-3">
                    <span className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: ss.accent }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black font-mono text-slate-700">{q.quoteNumber}</span>
                        <span className="inline-flex items-center gap-1 text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide shrink-0"
                          style={{ background: ss.bg, color: ss.text, border: `1.5px solid ${ss.border}` }}>
                          <SIcon size={9} /> {s.label}
                        </span>
                      </div>
                      <p className="text-sm font-black text-slate-900 mt-1 truncate">{q.client?.companyName || '—'}</p>
                      {q.projectName && <p className="text-[11px] font-semibold text-slate-500 truncate">{q.projectName}</p>}
                      <div className="flex items-center gap-x-3 gap-y-1 mt-2 flex-wrap text-[10px] font-bold text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <span className="h-5 w-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[8px] font-black">
                            {q.seller?.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                          {q.seller?.name || 'Sin asignar'}
                        </span>
                        <span>{q.items?.length || 0} ítems</span>
                        <span>Vig. {fmtDate(q.validUntil)}</span>
                        <span className="ml-auto text-sm font-black font-mono text-slate-900">{fmt(q.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap" onClick={e => e.stopPropagation()}>
                    {q.status === 'PENDING' && (
                      <>
                        <button onClick={() => updateStatus(q.id, 'ACCEPTED')} title="Aprobar"
                          className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all"><CheckCircle2 size={15} /></button>
                        <button onClick={() => updateStatus(q.id, 'REJECTED')} title="No concretada"
                          className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"><X size={15} /></button>
                      </>
                    )}
                    <button onClick={() => { openDetail(q); setDetailTab('edit'); }} title="Editar"
                      className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white transition-all"><Edit3 size={15} /></button>
                    <button onClick={e => duplicateQuote(q, e)} title="Duplicar" disabled={duplicating === q.id}
                      className="p-2 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white transition-all disabled:opacity-50">
                      {duplicating === q.id ? <Loader2 size={15} className="animate-spin" /> : <Copy size={15} />}
                    </button>
                    <button onClick={e => sendToPipeline(q, e)} disabled={sendingPipeline === q.id}
                      title={q.dealId ? 'Actualizar en embudo' : 'Mandar al embudo'}
                      className={cn("p-2 rounded-lg transition-all disabled:opacity-50",
                        q.dealId ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white" : "bg-orange-50 text-orange-500 hover:bg-orange-500 hover:text-white")}>
                      {sendingPipeline === q.id ? <Loader2 size={15} className="animate-spin" /> : <TrendingUp size={15} />}
                    </button>
                    <button onClick={() => downloadPDF(q.id, q.quoteNumber)} title="Descargar PDF"
                      className="p-2 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"><Download size={15} /></button>
                    <button onClick={() => deleteQuote(q.id, q.quoteNumber)} title="Eliminar"
                      className="ml-auto p-2 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-600 transition-all"><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginación (hojas) */}
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            noun="cotización"
            nounPlural="cotizaciones"
          />
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
                      onClick={() => sendToPipeline(selectedQuote)}
                      disabled={sendingPipeline === selectedQuote.id}
                      title={selectedQuote.dealId ? 'Actualizar en el embudo (Cotización enviada)' : 'Mandar cotización al embudo'}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-60 border",
                        selectedQuote.dealId
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                          : "bg-orange-500 text-white border-orange-500 hover:bg-orange-600"
                      )}
                    >
                      {sendingPipeline === selectedQuote.id
                        ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        : <TrendingUp className="h-3.5 w-3.5" />}
                      {selectedQuote.dealId ? 'En embudo' : 'Al embudo'}
                    </button>
                    <button
                      onClick={async () => {
                        if (detailTab === 'edit') {
                          await saveQuoteEdit();
                        }
                        downloadPDF(selectedQuote.id, selectedQuote.quoteNumber);
                      }}
                      disabled={generatingPDF || savingQuote}
                      className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-60"
                    >
                      {(generatingPDF || savingQuote) ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      {detailTab === 'edit' ? 'Guardar y PDF' : 'PDF'}
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
                    phrases={phrases}
                    onSavePhrase={savePhrase}
                    onDeletePhrase={deletePhrase}
                    termsPhases={termsPhases}
                    onSaveTermsPhrase={saveTermsPhrase}
                    onDeleteTermsPhrase={deleteTermsPhrase}
                    benefitsPhases={benefitsPhases}
                    onSaveBenefitsPhrase={saveBenefitsPhrase}
                    onDeleteBenefitsPhrase={deleteBenefitsPhrase}
                    onOpenSearch={setProdSearch}
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Modal: Nueva cotización ───────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (() => {
          const tplColor  = newQuote.templateType === 'PREFACTURA' ? '#16823c' : '#005BBB';
          const tplBg     = newQuote.templateType === 'PREFACTURA' ? '#f0fdf4' : '#eff6ff';
          const tplBorder = newQuote.templateType === 'PREFACTURA' ? '#bbf7d0' : '#bfdbfe';
          const selClient = clients.find(c => c.id === newQuote.clientId);
          const filteredNC = clients.filter(c =>
            !newClientSearch ||
            c.companyName?.toLowerCase().includes(newClientSearch.toLowerCase()) ||
            c.contactName?.toLowerCase().includes(newClientSearch.toLowerCase())
          );
          const SectionHeader = ({ num, icon: Icon, label }) => (
            <div className="flex items-center gap-3 mb-5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0" style={{ background: tplColor }}>{num}</div>
              <div className="flex items-center gap-2">
                {Icon && <Icon size={14} style={{ color: tplColor }} />}
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: tplColor }}>{label}</span>
              </div>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
          );
          return (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={e => { if (e.target === e.currentTarget) { setShowAddModal(false); setFromDealMeta(null); } }}>
            <motion.div
              initial={{ opacity: 0, y: 60, scale: .97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: .97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden"
            >
              {/* Header sticky */}
              <div className="flex-shrink-0 flex items-center justify-between px-7 py-5 border-b border-gray-100" style={{ background: tplBg }}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: tplColor }}>
                    <FileText size={18} style={{ color: '#fff' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">
                      {fromDealMeta?.stage === 'RECOTIZACION' ? 'Recotización' : 'Nueva Cotización'}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full text-white" style={{ background: tplColor }}>
                        {newQuote.templateType === 'PREFACTURA' ? 'Prefactura' : 'Ref. Proyecto'}
                      </span>
                      <span className="text-[8px] font-bold text-gray-400">Folio {newQuote.quoteNumber}</span>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => { setShowAddModal(false); setFromDealMeta(null); }} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Stepper */}
              {(() => {
                const STEPS = ['Documento y Cliente', 'Proyecto', 'Conceptos', 'Términos y Cierre'];
                return (
                  <div className="flex-shrink-0 px-7 py-4 border-b border-gray-100 bg-white">
                    <div className="flex items-center">
                      {STEPS.map((label, i) => {
                        const n = i + 1;
                        const done = quoteStep > n;
                        const active = quoteStep === n;
                        return (
                          <React.Fragment key={n}>
                            <button type="button" onClick={() => setQuoteStep(n)} className="flex items-center gap-2 group">
                              <span className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 transition-all text-white"
                                style={{ background: done || active ? tplColor : '#e5e7eb', color: done || active ? '#fff' : '#9ca3af' }}>
                                {done ? <CheckCircle2 size={13} /> : n}
                              </span>
                              <span className="hidden sm:block text-[10px] font-black uppercase tracking-wider transition-colors"
                                style={{ color: active ? tplColor : done ? '#64748b' : '#cbd5e1' }}>{label}</span>
                            </button>
                            {n < STEPS.length && <div className="flex-1 h-0.5 mx-2 rounded-full transition-all" style={{ background: quoteStep > n ? tplColor : '#e5e7eb' }} />}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">
                <form id="new-quote-form" onSubmit={handleCreateQuote} className="p-7 space-y-9">

                  {quoteStep === 1 && (<>
                  {/* ① Tipo de documento */}
                  <div>
                    <SectionHeader num="1" icon={FileText} label="Tipo de documento" />
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'PRESUPUESTO', badge: 'REFERENCIAS DE PROYECTO', title: 'Ref. Proyecto', sub: 'Cliente · Asesor', color: '#005BBB', bg: '#eff6ff' },
                        { id: 'PREFACTURA',  badge: 'PREFACTURA', title: 'Prefactura', sub: 'Facturar a · Vendedor', color: '#16823c', bg: '#f0fdf4' },
                      ].map(opt => {
                        const active = newQuote.templateType === opt.id;
                        return (
                          <button key={opt.id} type="button" onClick={() => setNewQuote(f => ({ ...f, templateType: opt.id }))}
                            style={{ padding: '14px 16px', borderRadius: 16, textAlign: 'left', cursor: 'pointer', transition: 'all .18s',
                              border: `2px solid ${active ? opt.color : '#e5e7eb'}`,
                              background: active ? opt.bg : '#fafafa',
                              boxShadow: active ? `0 4px 18px ${opt.color}20` : 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <div style={{ background: opt.color, borderRadius: 6, padding: '3px 9px' }}>
                                <span style={{ color: '#fff', fontSize: 7, fontWeight: 900, letterSpacing: '.1em' }}>{opt.badge}</span>
                              </div>
                              {active && <CheckCircle2 size={15} style={{ color: opt.color }} />}
                            </div>
                            <p style={{ fontSize: 13, fontWeight: 900, color: active ? opt.color : '#374151', margin: 0 }}>{opt.title}</p>
                            <p style={{ fontSize: 9, color: '#6b7280', fontWeight: 600, margin: '3px 0 0' }}>{opt.sub}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Banner pipeline */}
                  {fromDealMeta && (
                    <div className="flex items-start gap-3 p-4 rounded-2xl border" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                      <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: '#16a34a' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: '#16a34a' }}>Generando desde Embudo CRM</p>
                        <p className="text-xs font-black text-gray-900 truncate">{fromDealMeta.title}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                          {fromDealMeta.company && <span className="text-[9px] font-bold text-gray-500">{fromDealMeta.company}</span>}
                          {fromDealMeta.email   && <span className="text-[9px] font-bold text-gray-400">{fromDealMeta.email}</span>}
                        </div>
                      </div>
                      {fromDealMeta.value > 0 && <span className="text-xs font-black flex-shrink-0" style={{ color: '#16a34a' }}>${Number(fromDealMeta.value).toLocaleString('es-MX', { maximumFractionDigits: 0 })}</span>}
                    </div>
                  )}

                  {/* ② Cliente & Contacto */}
                  <div>
                    <SectionHeader num="2" icon={Building2} label="Cliente y contacto" />
                    {/* Toggle existing / new */}
                    <div className="flex gap-1.5 p-1 rounded-2xl mb-4" style={{ background: '#f1f5f9' }}>
                      {[{ id: 'existing', icon: Building2, label: 'Cliente existente' }, { id: 'new', icon: Plus, label: 'Nuevo cliente' }].map(m => (
                        <button key={m.id} type="button" onClick={() => setClientMode(m.id)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                          style={{ background: clientMode === m.id ? '#fff' : 'transparent', color: clientMode === m.id ? '#0f172a' : '#94a3b8', boxShadow: clientMode === m.id ? '0 1px 4px rgba(0,0,0,.08)' : 'none' }}>
                          <m.icon size={12} /> {m.label}
                        </button>
                      ))}
                    </div>

                    {clientMode === 'existing' && (
                      <div className="space-y-3">
                        {/* Searchable client picker */}
                        <div style={{ position: 'relative' }}>
                          <button type="button" onClick={() => { setNewClientOpen(o => !o); setNewClientSearch(''); }}
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                              background: selClient ? tplBg : '#f9fafb',
                              border: `1.5px solid ${selClient ? tplBorder : '#e5e7eb'}`,
                              borderRadius: 14, padding: '12px 16px', cursor: 'pointer', transition: 'all .15s', textAlign: 'left' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 900,
                                background: selClient ? tplColor : '#e5e7eb', color: selClient ? '#fff' : '#9ca3af' }}>
                                {selClient ? selClient.companyName.charAt(0).toUpperCase() : <Building2 size={16} style={{ color: '#9ca3af' }} />}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: selClient ? '#0f172a' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {selClient?.companyName || 'Buscar y seleccionar cliente...'}
                                </p>
                                {selClient?.contactName && <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>{selClient.contactName}</p>}
                              </div>
                            </div>
                            <ChevronRight size={15} style={{ color: '#9ca3af', flexShrink: 0, transform: newClientOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
                          </button>
                          {newClientOpen && (
                            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 16, boxShadow: '0 16px 40px rgba(0,0,0,.14)', zIndex: 60, overflow: 'hidden' }}>
                              <div style={{ padding: '10px 12px', borderBottom: '1px solid #f3f4f6' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f9fafb', borderRadius: 10, padding: '8px 12px' }}>
                                  <Search size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                                  <input autoFocus type="text" placeholder="Buscar empresa o contacto..." value={newClientSearch}
                                    onChange={e => setNewClientSearch(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 13, fontWeight: 600, color: '#111827', flex: 1 }} />
                                </div>
                              </div>
                              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                                {filteredNC.length === 0
                                  ? <div style={{ padding: 20, textAlign: 'center', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>Sin resultados</div>
                                  : filteredNC.map(c => (
                                    <button key={c.id} type="button"
                                      onClick={() => { setNewQuote(f => ({ ...f, clientId: c.id })); setNewClientOpen(false); }}
                                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                                        background: newQuote.clientId === c.id ? tplBg : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background .1s' }}
                                      onMouseEnter={e => { if (newQuote.clientId !== c.id) e.currentTarget.style.background = '#f9fafb'; }}
                                      onMouseLeave={e => { if (newQuote.clientId !== c.id) e.currentTarget.style.background = 'transparent'; }}>
                                      <div style={{ width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 900,
                                        background: newQuote.clientId === c.id ? tplColor : '#f3f4f6', color: newQuote.clientId === c.id ? '#fff' : '#6b7280' }}>
                                        {c.companyName?.charAt(0)?.toUpperCase() || '?'}
                                      </div>
                                      <div style={{ minWidth: 0 }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.companyName}</p>
                                        {c.contactName && <p style={{ fontSize: 10, color: '#6b7280', margin: 0 }}>{c.contactName}</p>}
                                      </div>
                                      {newQuote.clientId === c.id && <CheckCircle2 size={14} style={{ color: tplColor, marginLeft: 'auto', flexShrink: 0 }} />}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Contacto para cliente existente */}
                        <div>
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Contacto</label>
                          <input className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-sm outline-none border border-transparent focus:border-gray-200 transition-colors"
                            placeholder="Nombre de la persona de contacto"
                            value={newQuote.contactName || ''}
                            onChange={e => setNewQuote(f => ({ ...f, contactName: e.target.value }))} />
                        </div>
                      </div>
                    )}

                    {clientMode === 'new' && (
                      <div className="p-5 rounded-2xl border space-y-4" style={{ background: tplBg, borderColor: tplBorder }}>
                        <p className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: tplColor }}>
                          <User size={11} /> Datos del nuevo cliente
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { label: 'Empresa / Nombre *', key: 'companyName', required: true, placeholder: 'Ej: ACME Industrias S.A.' },
                            { label: 'Correo electrónico *', key: 'email', required: true, placeholder: 'contacto@empresa.com' },
                            { label: 'Contacto', key: 'contactName', placeholder: 'Nombre del contacto' },
                            { label: 'Teléfono', key: 'phone', placeholder: '+52 55 0000 0000', type: 'tel' },
                            { label: 'RFC', key: 'rfc', placeholder: 'RFC del cliente', upper: true },
                            { label: 'Dirección', key: 'address', placeholder: 'Dirección fiscal o de envío' },
                          ].map(f => (
                            <div key={f.key}>
                              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">{f.label}</label>
                              <input
                                type={f.type || 'text'}
                                required={!!f.required && clientMode === 'new'}
                                className="w-full bg-white rounded-xl px-4 py-3 font-bold text-sm outline-none"
                                placeholder={f.placeholder}
                                value={newClientData[f.key]}
                                onChange={e => setNewClientData(p => ({ ...p, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  </>)}

                  {quoteStep === 2 && (<>
                  {/* ③ Proyecto */}
                  <div>
                    <SectionHeader num="3" icon={Package} label="Información del proyecto" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Nombre del Proyecto</label>
                        <input className="w-full bg-gray-50 rounded-xl px-4 py-3.5 font-bold text-sm outline-none border border-transparent focus:border-gray-200 transition-colors"
                          placeholder="Ej: Proyecto CCTV Planta Norte"
                          value={newQuote.projectName}
                          onChange={e => setNewQuote(f => ({ ...f, projectName: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Vendedor</label>
                        <select className="w-full rounded-xl px-4 py-3.5 font-black text-sm outline-none cursor-pointer border border-transparent"
                          style={{ background: tplBg, color: tplColor }}
                          value={newQuote.sellerId} onChange={e => setNewQuote(f => ({ ...f, sellerId: e.target.value }))}>
                          <option value="">¿Quién vendió?</option>
                          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Vigente hasta</label>
                        <input type="date" className="w-full bg-gray-50 rounded-xl px-4 py-3.5 font-bold text-sm outline-none border border-transparent focus:border-gray-200 transition-colors"
                          value={newQuote.validUntil} onChange={e => setNewQuote(f => ({ ...f, validUntil: e.target.value }))} />
                      </div>
                      {!fromDealMeta && (
                        <div>
                          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Vincular a trato del embudo</label>
                          <select className="w-full bg-emerald-50 rounded-xl px-4 py-3.5 font-bold text-sm outline-none text-emerald-800 cursor-pointer"
                            value={newQuote.linkedDealId}
                            onChange={e => {
                              const deal = deals.find(d => d.id === e.target.value);
                              setNewQuote(f => ({ ...f, linkedDealId: e.target.value, projectName: f.projectName || deal?.title || '', contactName: f.contactName || deal?.contactName || '', sellerId: f.sellerId || deal?.assignedToId || '' }));
                            }}>
                            <option value="">— Sin vincular —</option>
                            {deals.map(d => <option key={d.id} value={d.id}>{d.title}{d.company ? ` · ${d.company}` : ''}</option>)}
                          </select>
                          {newQuote.linkedDealId && <p className="text-[8px] font-bold text-emerald-600 mt-1">✓ Se registrará en el historial del trato</p>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ④ Requerimientos */}
                  <div>
                    <SectionHeader num="4" icon={FileText} label="Requerimientos del cliente" />
                    <RequirementsField
                      value={newQuote.requirements || ''}
                      onChange={v => setNewQuote(f => ({ ...f, requirements: v }))}
                      phrases={phrases}
                      onSavePhrase={savePhrase}
                      onDeletePhrase={deletePhrase}
                      hideLabel
                    />
                  </div>
                  </>)}

                  {quoteStep === 3 && (<>
                  {/* ⑤ Conceptos */}
                  <div>
                    <SectionHeader num="5" icon={Package} label="Conceptos / Productos" />
                    <div className="space-y-3">
                      {newQuote.items.map((item, index) => (
                        <div key={index} className="rounded-2xl border border-gray-100 overflow-hidden" style={{ background: '#fafafa' }}>
                          {/* Top bar */}
                          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
                            <button type="button" onClick={() => setProdSearch({ index, mode: 'new' })}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex-shrink-0"
                              style={{ background: tplBg, color: tplColor }}>
                              <Search size={11} /> Catálogo
                            </button>
                            <input className="flex-1 bg-gray-50 rounded-lg px-3 py-2 text-[10px] font-black uppercase outline-none" placeholder="Nº Serie / SKU" value={item.serial} onChange={e => updateItem(index, 'serial', e.target.value)} />
                            <button type="button" onClick={() => removeItem(index)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                              <X size={14} className="text-red-400" />
                            </button>
                          </div>
                          {/* Body */}
                          <div className="p-4 space-y-3">
                            <input className="w-full bg-white rounded-xl px-4 py-2.5 text-sm font-bold outline-none border border-gray-100 focus:border-gray-200" placeholder="Nombre del producto o servicio" value={item.name} onChange={e => updateItem(index, 'name', e.target.value)} />
                            <input className="w-full bg-white rounded-xl px-4 py-2 text-[11px] text-gray-400 font-semibold outline-none border border-gray-100" placeholder="Descripción adicional (opcional)" value={item.desc} onChange={e => updateItem(index, 'desc', e.target.value)} />
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-1">Cantidad</label>
                                <input className="w-full bg-white rounded-xl px-3 py-2.5 text-sm text-center font-black outline-none border border-gray-100" type="number" min="1" value={item.qty} onChange={e => updateItem(index, 'qty', parseInt(e.target.value) || 1)} onFocus={e => e.target.select()} />
                              </div>
                              <div>
                                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-1">Precio Unitario</label>
                                <input className="w-full bg-white rounded-xl px-3 py-2.5 text-sm font-black outline-none border border-gray-100" type="number" min="0" step="0.01" placeholder="0.00" value={item.price} onChange={e => updateItem(index, 'price', parseFloat(e.target.value) || 0)} onFocus={e => e.target.select()} />
                              </div>
                              <div>
                                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest block mb-1">Total</label>
                                <div className="w-full rounded-xl px-3 py-2.5 text-sm font-black text-right" style={{ background: tplBg, color: tplColor }}>{fmt(item.qty * item.price)}</div>
                              </div>
                            </div>
                            {/* Imagen */}
                            <div className="flex items-center gap-3">
                              <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-white border border-dashed border-gray-200 hover:border-gray-400 text-gray-400 hover:text-gray-600 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all">
                                <ImagePlus size={12} /> {item.imageBase64 ? 'Cambiar imagen' : 'Imagen'}
                                <input type="file" accept="image/*" className="hidden" onChange={e => handleItemImage(index, e.target.files[0])} />
                              </label>
                              {item.imageBase64 && (
                                <>
                                  <img src={item.imageBase64} alt={item.name} className="h-9 w-9 object-cover rounded-lg border border-gray-200" />
                                  <button type="button" onClick={() => updateItem(index, 'imageBase64', '')} className="p-1 hover:bg-red-50 rounded-lg transition-colors"><X size={12} className="text-red-400" /></button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      <button type="button" onClick={addItem}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed text-[9px] font-black uppercase tracking-widest transition-all hover:border-solid"
                        style={{ borderColor: tplColor, color: tplColor, background: tplBg }}>
                        <Plus size={13} /> Agregar concepto
                      </button>
                    </div>
                  </div>

                  {/* ⑥ Promoción */}
                  <div>
                    <SectionHeader num="6" icon={Package} label="Promoción / Descuento" />
                    <PromoSection
                      subtotal={newQuote.subtotal}
                      discountPct={newQuote.discountPct || 0}
                      onChange={pct => setNewQuote(f => ({ ...f, discountPct: pct }))}
                    />
                  </div>
                  </>)}

                  {quoteStep === 4 && (<>
                  {/* ⑦ Términos + Totales */}
                  <div>
                    <SectionHeader num="7" icon={FileText} label="Términos y totales" />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <RequirementsField
                        label="Términos y Condiciones"
                        placeholder="Escribe los términos y condiciones..."
                        textareaClass="w-full bg-amber-50 rounded-xl px-4 py-3 font-bold text-sm outline-none resize-none border border-amber-100 focus:border-amber-300 transition-colors"
                        value={newQuote.terms}
                        onChange={v => setNewQuote(f => ({ ...f, terms: v }))}
                        phrases={termsPhases}
                        onSavePhrase={saveTermsPhrase}
                        onDeletePhrase={deleteTermsPhrase}
                      />
                      <div className="rounded-2xl p-6 text-white space-y-3" style={{ background: '#0f172a' }}>
                        {[['Subtotal', fmt(newQuote.subtotal)], ['IVA (16%)', fmt(newQuote.tax)]].map(([l, v]) => (
                          <div key={l} className="flex justify-between text-[10px] font-black uppercase" style={{ opacity: .5 }}>
                            <span>{l}</span><span>{v}</span>
                          </div>
                        ))}
                        {newQuote.adjustment < 0 && (
                          <div className="flex justify-between text-[10px] font-black" style={{ color: '#86efac' }}>
                            <span>Promoción ({newQuote.discountPct}%)</span>
                            <span>{fmt(newQuote.adjustment)}</span>
                          </div>
                        )}
                        <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                          <span className="text-[11px] font-black uppercase" style={{ color: tplColor === '#16823c' ? '#6ee7b7' : '#93c5fd' }}>Inversión Total</span>
                          <span className="text-3xl font-black">{fmt(newQuote.total)}</span>
                        </div>
                        <div style={{ marginTop: 8, background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '8px 12px' }}>
                          <p style={{ fontSize: 6.5, fontWeight: 900, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 6px' }}>Descuentos por pago</p>
                          {[['Pago Inmediato 24Hrs', '5%'], ['Pago Preferente', '3%'], ['Pago Programado', '1%']].map(([l, p]) => (
                            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,.5)' }}>{l}</span>
                              <span style={{ fontSize: 8, fontWeight: 900, color: '#86efac' }}>{p} desc.</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ⑧ Motivos + Observaciones */}
                  <div>
                    <SectionHeader num="8" icon={FileText} label="Motivos y observaciones" />
                    <div className="space-y-4">
                      <RequirementsField
                        label="Motivos para elegir con confianza"
                        placeholder="Describe los motivos para elegir con confianza esta solución..."
                        value={newQuote.benefits || ''}
                        onChange={v => setNewQuote(f => ({ ...f, benefits: v }))}
                        phrases={benefitsPhases}
                        onSavePhrase={saveBenefitsPhrase}
                        onDeletePhrase={deleteBenefitsPhrase}
                      />
                      <div className="rounded-2xl border border-gray-100 p-4" style={{ background: '#fafafa' }}>
                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-2">Observaciones</label>
                        <textarea className="w-full bg-white rounded-xl px-4 py-3 text-sm font-semibold outline-none resize-none border border-gray-100 focus:border-gray-200 transition-colors" rows={3}
                          placeholder="Observaciones adicionales para el cliente..."
                          value={newQuote.observations || ''}
                          onChange={e => setNewQuote(f => ({ ...f, observations: e.target.value }))} />
                      </div>
                    </div>
                  </div>

                  </>)}
                </form>
              </div>

              {/* Footer de navegación (siempre visible) */}
              <div className="flex-shrink-0 flex items-center justify-between gap-3 px-7 py-4 border-t border-gray-100 bg-white">
                <button type="button"
                  onClick={() => { if (quoteStep > 1) setQuoteStep(s => s - 1); else { setShowAddModal(false); setFromDealMeta(null); } }}
                  className="flex items-center gap-1.5 px-5 py-3 rounded-2xl border border-gray-200 text-gray-600 text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">
                  <ChevronRight size={14} className="rotate-180" /> {quoteStep > 1 ? 'Anterior' : 'Cancelar'}
                </button>

                <div className="hidden sm:flex items-center gap-1.5">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="h-1.5 rounded-full transition-all" style={{ width: quoteStep === n ? 24 : 6, background: quoteStep >= n ? tplColor : '#e5e7eb' }} />
                  ))}
                </div>

                {quoteStep < 4 ? (
                  <button type="button" onClick={() => setQuoteStep(s => Math.min(4, s + 1))}
                    className="flex items-center gap-1.5 px-6 py-3 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest shadow-lg transition-all"
                    style={{ background: tplColor }}>
                    Siguiente <ChevronRight size={14} />
                  </button>
                ) : (
                  <button type="submit" form="new-quote-form"
                    disabled={isGenerating || (clientMode === 'existing' ? !newQuote.clientId : (!newClientData.companyName || !newClientData.email))}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-[11px] font-black uppercase tracking-widest shadow-lg transition-all disabled:opacity-50"
                    style={{ background: tplColor }}>
                    {isGenerating
                      ? <><RefreshCw size={14} className="animate-spin" /> Generando…</>
                      : <><FileText size={14} /> Generar Cotización</>}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
          );
        })()}
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
  const isPre   = (quote.templateType || 'PRESUPUESTO') === 'PRESUPUESTO';
  const accent  = isPre ? '#1d4ed8' : '#16823c';
  const accentBg   = isPre ? '#f0f6ff' : '#f0fdf4';
  const accentBorder = isPre ? '#bfdbfe' : '#bbf7d0';

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Encabezado cliente + proyecto */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-2xl space-y-2">
          <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest">
            {isPre ? 'Referencias de Proyecto' : 'Facturar a'}
          </p>
          <p className="font-black text-gray-900">{quote.client?.companyName}</p>
          {quote.contactName && (
            <p className="text-[9px] font-bold flex items-center gap-1" style={{ color: accent }}>
              <User className="h-3 w-3" /> {quote.contactName}
            </p>
          )}
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
            <User className="h-3 w-3" /> {isPre ? 'Asesor' : 'Vendedor'}: {quote.seller?.name || 'Sin asignar'}
          </p>
          <p className="text-[9px] font-bold text-gray-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Vigente hasta: {fmtDate(quote.validUntil)}
          </p>
        </div>
      </div>

      {/* Requerimientos del cliente */}
      {quote.requirements && quote.requirements.trim() && (
        <div style={{ background: accentBg, border: `1.5px solid ${accentBorder}`, borderRadius: 16, padding: '14px 18px' }}>
          <p style={{ fontSize: 8, fontWeight: 900, color: accent, textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 6 }}>
            Requerimientos del cliente
          </p>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>
            {quote.requirements}
          </p>
        </div>
      )}

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
              <span>Promoción</span><span>{fmt(quote.adjustment)}</span>
            </div>
          )}
          <div className="pt-3 border-t border-white/10 flex justify-between items-center">
            <span className="font-black uppercase" style={{ color: accent }}>Inversión Total</span>
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

      {/* Observaciones — recuadro completo debajo de términos e inversión total */}
      {quote.observations && quote.observations.trim() && (
        <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
          <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-2">Observaciones</p>
          <p className="text-[10px] font-bold text-gray-700 whitespace-pre-wrap">{quote.observations}</p>
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
function QuoteEditForm({ editQuote, setEditQuote, employees, clients, selectedQuote, onAddItem, onRemoveItem, onUpdateItem, onItemImage, onSave, saving, phrases, onSavePhrase, onDeletePhrase, termsPhases, onSaveTermsPhrase, onDeleteTermsPhrase, benefitsPhases, onSaveBenefitsPhrase, onDeleteBenefitsPhrase, onOpenSearch }) {
  const [clientSearch, setClientSearch] = React.useState('');
  const [clientOpen,   setClientOpen]   = React.useState(false);

  const currentClient = clients?.find(c => c.id === editQuote.clientId) || selectedQuote?.client;
  const filteredClients = (clients || []).filter(c =>
    !clientSearch || c.companyName?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.contactName?.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 space-y-6">

      {/* ── Selector de plantilla ── */}
      <div className="space-y-3">
        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Tipo de Documento</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'PRESUPUESTO', badge: 'REFERENCIAS DE PROYECTO', title: 'Ref. Proyecto', sub: 'Cliente · Asesor', color: '#005BBB', bg: '#eff6ff' },
            { id: 'PREFACTURA',  badge: 'PREFACTURA',         title: 'Prefactura',   sub: 'Facturar a · Vendedor', color: '#16823c', bg: '#f0fdf4' },
          ].map(opt => {
            const active = (editQuote.templateType || 'PRESUPUESTO') === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setEditQuote(f => ({ ...f, templateType: opt.id }))}
                style={{
                  padding: '12px 14px', borderRadius: 14, textAlign: 'left', cursor: 'pointer', transition: 'all .15s',
                  border: `2px solid ${active ? opt.color : '#e5e7eb'}`,
                  background: active ? opt.bg : '#f9fafb',
                  boxShadow: active ? `0 4px 14px ${opt.color}20` : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ background: opt.color, borderRadius: 5, padding: '2px 7px' }}>
                    <span style={{ color: '#fff', fontSize: 7, fontWeight: 900, letterSpacing: '.08em' }}>{opt.badge}</span>
                  </div>
                  {active && <CheckCircle2 size={13} style={{ color: opt.color }} />}
                </div>
                <p style={{ fontSize: 11, fontWeight: 900, color: active ? opt.color : '#374151', margin: 0 }}>{opt.title}</p>
                <p style={{ fontSize: 9, color: '#6b7280', fontWeight: 600, margin: '2px 0 0' }}>{opt.sub}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Contacto ── */}
      <div>
        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Contacto</label>
        <input
          className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-sm outline-none"
          placeholder="Nombre del contacto"
          value={editQuote.contactName || ''}
          onChange={e => setEditQuote(f => ({ ...f, contactName: e.target.value }))}
        />
      </div>

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

      {/* Requerimientos del cliente */}
      <RequirementsField
        value={editQuote.requirements || ''}
        onChange={v => setEditQuote(f => ({ ...f, requirements: v }))}
        phrases={phrases}
        onSavePhrase={onSavePhrase}
        onDeletePhrase={onDeletePhrase}
      />

      {/* Info básica */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Nombre del Proyecto</label>
          <input
            className="w-full bg-gray-50 rounded-xl px-4 py-3 font-bold text-sm outline-none"
            placeholder="Ej: Proyecto CCTV"
            value={editQuote.projectName || ''}
            onChange={e => setEditQuote(f => ({ ...f, projectName: e.target.value }))}
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
                onClick={() => onOpenSearch?.({ index: i, mode: 'edit' })}
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

      {/* Promoción */}
      <PromoSection
        subtotal={editQuote.subtotal}
        discountPct={editQuote.discountPct || 0}
        onChange={pct => setEditQuote(f => ({ ...f, discountPct: pct }))}
      />

      {/* Totales */}
      <div className="flex justify-end">
        <div className="bg-gray-900 rounded-2xl p-5 text-white space-y-2 w-72">
          <div className="flex justify-between text-[9px] font-black opacity-50"><span>Subtotal</span><span>{fmt(editQuote.subtotal)}</span></div>
          <div className="flex justify-between text-[9px] font-black opacity-50"><span>IVA (16%)</span><span>{fmt(editQuote.tax)}</span></div>
          {editQuote.adjustment < 0 && (
            <div className="flex justify-between text-[9px] font-black text-emerald-400">
              <span>Promoción ({editQuote.discountPct}%)</span>
              <span>{fmt(editQuote.adjustment)}</span>
            </div>
          )}
          <div className="pt-3 border-t border-white/10 flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-primary">Inversión Total</span>
            <span className="text-xl font-black">{fmt(editQuote.total)}</span>
          </div>
          <div style={{ marginTop: 10, background: 'rgba(255,255,255,.06)', borderRadius: 10, padding: '8px 10px' }}>
            <p style={{ fontSize: 6.5, fontWeight: 900, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 5px' }}>Descuentos por pago anticipado</p>
            {PAYMENT_OPTS.map(opt => (
              <div key={opt.hrs} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>Pago {opt.label}</span>
                <span style={{ fontSize: 8, fontWeight: 900, color: '#86efac', background: 'rgba(134,239,172,.12)', borderRadius: 5, padding: '1px 7px' }}>{opt.pct}% desc.</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Términos */}
      <RequirementsField
        label="Términos y Condiciones"
        placeholder="Escribe los términos y condiciones..."
        textareaClass="w-full bg-amber-50 rounded-xl px-4 py-3 font-bold text-xs outline-none resize-none border border-amber-100 focus:border-amber-300 transition-colors"
        value={editQuote.terms || ''}
        onChange={v => setEditQuote(f => ({ ...f, terms: v }))}
        phrases={termsPhases || []}
        onSavePhrase={onSaveTermsPhrase}
        onDeletePhrase={onDeleteTermsPhrase}
      />

      {/* Motivos para elegir con confianza */}
      <RequirementsField
        label="Motivos para elegir con confianza"
        placeholder="Describe los motivos para elegir con confianza esta solución para el cliente..."
        value={editQuote.benefits || ''}
        onChange={v => setEditQuote(f => ({ ...f, benefits: v }))}
        phrases={benefitsPhases || []}
        onSavePhrase={onSaveBenefitsPhrase}
        onDeletePhrase={onDeleteBenefitsPhrase}
      />

      {/* Observaciones — ancho completo debajo de términos e inversión */}
      <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2">Observaciones</p>
        <textarea
          rows={3}
          className="w-full bg-white rounded-xl px-4 py-3 font-bold text-xs outline-none resize-none border border-gray-100"
          placeholder="Observaciones adicionales..."
          value={editQuote.observations || ''}
          onChange={e => setEditQuote(f => ({ ...f, observations: e.target.value }))}
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
