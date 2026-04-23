import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, Edit3, Trash2, Package, Tag, DollarSign,
  Upload, X, Check, ChevronDown, Loader2, Filter, Download,
  BarChart2, FolderOpen, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
import { useAuth, ROLES } from '@/store/AuthContext';

const UNITS = ['PZA', 'KIT', 'MTS', 'JGO', 'SRV', 'HR', 'LT', 'M2', 'PAR'];
const CURRENCIES = ['MXN', 'USD'];

const fmtPrice = (n, cur = 'MXN') =>
  `${cur === 'USD' ? 'US$' : 'MX$'} ${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

const emptyForm = () => ({
  sku: '', name: '', brand: '', category: '', subcategory: '',
  description: '', unit: 'PZA', price: '', currency: 'MXN',
});

// ── Modal Crear/Editar ─────────────────────────────────────────────────────────
function ProductModal({ product, categories, brands, onSave, onClose }) {
  const [form, setForm] = useState(product ? { ...product, price: product.price?.toString() } : emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sku.trim() || !form.name.trim()) { setError('SKU y Nombre son requeridos'); return; }
    setSaving(true); setError('');
    try {
      const method = product ? 'PUT' : 'POST';
      const body   = { ...form, price: parseFloat(form.price) || 0 };
      if (product) body.id = product.id;
      const res = await apiFetch('/api/catalog', { method, body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Error al guardar'); return; }
      const saved = await res.json();
      onSave(saved, !!product);
    } catch { setError('Error de conexión'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                {product ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Catálogo OleaControls</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {error && <p className="text-xs font-bold text-red-500 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">SKU *</label>
                <input required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-primary"
                  placeholder="Ej: HIK-DS2CD2143G2" value={form.sku}
                  onChange={e => set('sku', e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Nombre *</label>
                <input required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-primary"
                  placeholder="Nombre del producto" value={form.name}
                  onChange={e => set('name', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Marca</label>
                <input list="brands-list" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-primary"
                  placeholder="Ej: Hikvision" value={form.brand} onChange={e => set('brand', e.target.value)} />
                <datalist id="brands-list">{brands.map(b => <option key={b} value={b} />)}</datalist>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Categoría</label>
                <input list="cats-list" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-primary"
                  placeholder="Ej: CCTV" value={form.category} onChange={e => set('category', e.target.value)} />
                <datalist id="cats-list">{categories.map(c => <option key={c.name ?? c} value={c.name ?? c} />)}</datalist>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Subcategoría</label>
              <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-primary"
                placeholder="Ej: Domo IP" value={form.subcategory} onChange={e => set('subcategory', e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Descripción técnica</label>
              <textarea rows={3} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-medium text-xs outline-none focus:border-primary resize-none"
                placeholder="Especificaciones, características relevantes..." value={form.description}
                onChange={e => set('description', e.target.value)} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Precio base</label>
                <input type="number" min="0" step="0.01"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-primary"
                  placeholder="0.00" value={form.price} onChange={e => set('price', e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Moneda</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-primary"
                  value={form.currency} onChange={e => set('currency', e.target.value)}>
                  {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Unidad</label>
                <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-xs outline-none focus:border-primary"
                  value={form.unit} onChange={e => set('unit', e.target.value)}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-black text-[9px] uppercase tracking-widest hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-black text-[9px] uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {saving ? 'Guardando...' : product ? 'Actualizar' : 'Crear Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal Importar CSV ─────────────────────────────────────────────────────────
function ImportModal({ onClose, onDone }) {
  const [csv, setCsv]         = useState('');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setCsv(ev.target.result);
    reader.readAsText(file, 'utf-8');
  };

  const parseCSV = (text) => {
    // Quitar BOM de Excel UTF-8
    const clean = text.replace(/^\uFEFF/, '');
    const lines = clean.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];

    // Auto-detectar separador: si la primera línea tiene más ";" que "," usamos ";"
    const sep = (lines[0].match(/;/g) || []).length >= (lines[0].match(/,/g) || []).length ? ';' : ',';

    const splitLine = (line) => {
      const result = [];
      let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQ = !inQ; continue; }
        if (c === sep && !inQ) { result.push(cur.trim()); cur = ''; continue; }
        cur += c;
      }
      result.push(cur.trim());
      return result;
    };

    const headers = splitLine(lines[0]).map(h => h.trim().toLowerCase().replace(/"/g, ''));
    return lines.slice(1).map(line => {
      const vals = splitLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim(); });
      return obj;
    });
  };

  const handleImport = async () => {
    if (!csv.trim()) return;
    setLoading(true);
    try {
      const products = parseCSV(csv);
      if (!products.length) { setResult({ error: 'No se encontraron filas válidas' }); return; }
      const res = await apiFetch('/api/catalog', {
        method: 'POST',
        body: JSON.stringify({ products }),
      });
      const data = await res.json();
      setResult(data);
      if (data.created > 0) onDone();
    } catch { setResult({ error: 'Error de conexión' }); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Importar CSV</h2>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Carga masiva de productos</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-1">
            <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Formato CSV requerido</p>
            <p className="text-[10px] font-mono text-blue-600">sku,name,brand,category,subcategory,description,unit,price,currency</p>
            <p className="text-[9px] text-blue-500 font-bold">· Primera fila = encabezados · Separador = coma · Codificación UTF-8</p>
          </div>

          <div
            className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
              {csv ? `✓ ${parseCSV(csv).length} filas detectadas` : 'Seleccionar archivo .CSV'}
            </p>
            {csv && parseCSV(csv).length > 0 && (
              <p className="text-[9px] text-gray-400 mt-1 font-mono">
                Columnas: {Object.keys(parseCSV(csv)[0]).join(' · ')}
              </p>
            )}
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </div>

          {result && (
            <div className={cn("p-4 rounded-2xl border text-xs font-bold space-y-1",
              result.error ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700")}>
              {result.error
                ? <p>{result.error}</p>
                : <>
                    <p>✓ {result.created} productos importados/actualizados</p>
                    {result.errors?.length > 0 && (
                      <div className="text-amber-700 bg-amber-50 rounded-xl p-2 mt-2 space-y-0.5">
                        <p className="font-black">{result.errors.length} filas con error:</p>
                        {result.errors.slice(0, 5).map((e, i) => <p key={i} className="text-[9px] font-mono">{e}</p>)}
                        {result.errors.length > 5 && <p className="text-[9px]">...y {result.errors.length - 5} más</p>}
                      </div>
                    )}
                  </>
              }
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-black text-[9px] uppercase tracking-widest">
            Cerrar
          </button>
          <button onClick={handleImport} disabled={!csv || loading}
            className="flex-1 py-3 rounded-xl bg-gray-900 text-white font-black text-[9px] uppercase tracking-widest hover:bg-primary disabled:opacity-40 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {loading ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Panel de gestión de categorías ────────────────────────────────────────────
function CategoriesPanel({ categories, onRename, onDelete }) {
  const [editing, setEditing] = useState(null); // { name, newName }
  const [saving, setSaving]   = useState(null);
  const [deleting, setDeleting] = useState(null);

  const startEdit = (cat) => setEditing({ name: cat.name, newName: cat.name });

  const handleRename = async () => {
    if (!editing || !editing.newName.trim() || editing.newName.trim() === editing.name) {
      setEditing(null); return;
    }
    setSaving(editing.name);
    await onRename(editing.name, editing.newName.trim());
    setSaving(null);
    setEditing(null);
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`¿Mover los ${cat.count} productos de "${cat.name}" a "General"?`)) return;
    setDeleting(cat.name);
    await onDelete(cat.name);
    setDeleting(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
        <FolderOpen className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-black text-gray-800 uppercase tracking-tight">Gestión de Categorías</h3>
        <span className="ml-auto text-[9px] font-bold text-gray-400">{categories.length} categorías</span>
      </div>
      <div className="divide-y divide-gray-50">
        {categories.length === 0 && (
          <p className="px-5 py-6 text-[9px] font-black text-gray-300 uppercase tracking-widest text-center">Sin categorías</p>
        )}
        {categories.filter(cat => cat.name).map(cat => (
          <div key={cat.name} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 transition-colors group">
            {editing !== null && editing.name === cat.name ? (
              <input
                autoFocus
                className="flex-1 bg-white border border-primary rounded-xl px-3 py-1.5 font-bold text-xs outline-none"
                value={editing.newName}
                onChange={e => setEditing(f => ({ ...f, newName: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(null); }}
              />
            ) : (
              <div className="flex-1 min-w-0">
                <span className="text-xs font-black text-gray-800">{cat.name}</span>
                <span className="ml-2 text-[8px] font-bold text-gray-400">{cat.count} producto{cat.count !== 1 ? 's' : ''}</span>
              </div>
            )}

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {editing?.name === cat.name ? (
                <button onClick={handleRename} disabled={saving === cat.name}
                  className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-colors">
                  {saving === cat.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                </button>
              ) : (
                <button onClick={() => startEdit(cat)}
                  className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              )}
              <button onClick={() => handleDelete(cat)} disabled={deleting === cat.name}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                {deleting === cat.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────────
export default function ProductCatalog({ onAddToQuote }) {
  const { user } = useAuth();
  // Cualquier usuario logueado puede agregar/editar; solo ADMIN puede borrar
  const isAdmin    = !!user;
  const canDelete  = user?.roles?.includes('ADMIN') || user?.role === ROLES.ADMIN;

  const [products, setProducts]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands]       = useState([]);
  const [loading, setLoading]     = useState(false);

  const [search, setSearch]       = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [page, setPage]           = useState(1);
  const LIMIT = 60;

  const [modal, setModal]         = useState(null); // null | 'new' | product-obj
  const [importModal, setImportModal] = useState(false);
  const [deleting, setDeleting]   = useState(null);
  const [showCats, setShowCats]   = useState(false);

  const fetchProducts = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search, category: filterCat, brand: filterBrand,
        status: 'ALL', page: p, limit: LIMIT, meta: p === 1 ? '1' : '0',
      });
      const res  = await apiFetch(`/api/catalog?${params}`);
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
      if (data.categories) setCategories(data.categories);
      if (data.brands)     setBrands(data.brands);
      setPage(p);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, filterCat, filterBrand]);

  useEffect(() => { fetchProducts(1); }, [fetchProducts]);

  const renameCategory = async (oldName, newName) => {
    await apiFetch('/api/catalog', { method: 'PUT', body: JSON.stringify({ action: 'renameCategory', oldName, newName }) });
    setCategories(prev => prev.map(c => c.name === oldName ? { ...c, name: newName } : c));
    if (filterCat === oldName) setFilterCat(newName);
    setProducts(prev => prev.map(p => p.category === oldName ? { ...p, category: newName } : p));
  };

  const deleteCategory = async (name) => {
    await apiFetch('/api/catalog', { method: 'DELETE', body: JSON.stringify({ action: 'deleteCategory', name }) });
    setCategories(prev => {
      const remaining = prev.filter(c => c.name !== name);
      const gen = remaining.find(c => c.name === 'General');
      const deleted = prev.find(c => c.name === name);
      if (gen && deleted) return remaining.map(c => c.name === 'General' ? { ...c, count: c.count + deleted.count } : c);
      if (deleted) return [...remaining, { name: 'General', count: deleted.count }];
      return remaining;
    });
    if (filterCat === name) setFilterCat('');
    setProducts(prev => prev.map(p => p.category === name ? { ...p, category: 'General' } : p));
  };

  const handleSave = (saved, isEdit) => {
    if (isEdit) setProducts(prev => prev.map(p => p.id === saved.id ? saved : p));
    else { setProducts(prev => [saved, ...prev]); setTotal(t => t + 1); }
    setModal(null);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`¿Eliminar "${product.name}"?`)) return;
    setDeleting(product.id);
    try {
      await apiFetch('/api/catalog', { method: 'DELETE', body: JSON.stringify({ id: product.id }) });
      setProducts(prev => prev.filter(p => p.id !== product.id));
      setTotal(t => t - 1);
    } catch { }
    finally { setDeleting(null); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Package className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Catálogo de Productos</h1>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            {total.toLocaleString()} productos · base para cotizaciones
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button onClick={() => setShowCats(v => !v)}
              className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest transition-all",
                showCats ? "border-primary bg-primary/10 text-primary" : "border-gray-200 text-gray-600 hover:border-gray-400")}>
              <FolderOpen className="h-3.5 w-3.5" /> Categorías
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setImportModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-black text-[9px] uppercase tracking-widest hover:border-gray-400 transition-all">
              <Upload className="h-3.5 w-3.5" /> Importar CSV
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setModal('new')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white font-black text-[9px] uppercase tracking-widest hover:bg-primary transition-all">
              <Plus className="h-3.5 w-3.5" /> Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {/* Panel de categorías */}
      {showCats && (
        <CategoriesPanel
          categories={categories}
          onRename={renameCategory}
          onDelete={deleteCategory}
        />
      )}

      {/* Barra de búsqueda + filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-primary"
            placeholder="Buscar por nombre, SKU, marca..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filtro categoría */}
        <select
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-bold text-xs outline-none focus:border-primary"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
        </select>

        {/* Filtro marca */}
        <select
          className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 font-bold text-xs outline-none focus:border-primary"
          value={filterBrand}
          onChange={e => setFilterBrand(e.target.value)}
        >
          <option value="">Todas las marcas</option>
          {brands.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        {(filterCat || filterBrand || search) && (
          <button onClick={() => { setSearch(''); setFilterCat(''); setFilterBrand(''); }}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 border-red-200 text-red-500 hover:bg-red-50">
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64 gap-2 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Cargando catálogo...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-300">
            <Package className="h-12 w-12" />
            <p className="text-[9px] font-black uppercase tracking-widest">Sin productos</p>
            {isAdmin && (
              <button onClick={() => setModal('new')}
                className="px-4 py-2 bg-gray-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest">
                Agregar primer producto
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  <th className="px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
                  <th className="px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">Nombre</th>
                  <th className="px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">Marca</th>
                  <th className="px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">Categoría</th>
                  <th className="px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">Unidad</th>
                  <th className="px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">Precio base</th>
                  <th className="px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                  <th className="px-4 py-3 text-[8px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
                    <td className="px-4 py-3">
                      <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-1 rounded-lg font-mono">{p.sku}</span>
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="text-xs font-black text-gray-800 leading-tight truncate">{p.name}</p>
                      {p.description && (
                        <p className="text-[9px] text-gray-400 font-medium truncate mt-0.5">{p.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.brand
                        ? <span className="text-[9px] font-black text-gray-600 bg-gray-100 px-2 py-1 rounded-lg">{p.brand}</span>
                        : <span className="text-[9px] text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        {p.category && <p className="text-[9px] font-black text-gray-600">{p.category}</p>}
                        {p.subcategory && <p className="text-[8px] text-gray-400 font-bold">{p.subcategory}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">{p.unit}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-black text-gray-800">{fmtPrice(p.price, p.currency)}</p>
                      {p.currency === 'USD' && <p className="text-[8px] text-gray-400 font-bold">USD</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                        p.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400")}>
                        {p.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {onAddToQuote && (
                          <button
                            onClick={() => onAddToQuote(p)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                            title="Agregar a cotización"
                          >
                            <Plus className="h-3 w-3" /> Cotizar
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button onClick={() => setModal(p)}
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Editar">
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            {canDelete && (
                              <button onClick={() => handleDelete(p)} disabled={deleting === p.id}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar">
                                {deleting === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              Página {page} de {totalPages} · {total} productos
            </p>
            <div className="flex gap-2">
              <button onClick={() => fetchProducts(page - 1)} disabled={page <= 1}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-black text-gray-500 hover:bg-gray-50 disabled:opacity-30">
                ← Anterior
              </button>
              <button onClick={() => fetchProducts(page + 1)} disabled={page >= totalPages}
                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-black text-gray-500 hover:bg-gray-50 disabled:opacity-30">
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {modal && (
        <ProductModal
          product={modal === 'new' ? null : modal}
          categories={categories}
          brands={brands}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {importModal && (
        <ImportModal onClose={() => setImportModal(false)} onDone={() => { setImportModal(false); fetchProducts(1); }} />
      )}
    </div>
  );
}
