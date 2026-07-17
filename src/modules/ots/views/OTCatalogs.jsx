import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, Plus, Search, Trash2, MapPin, Phone, Mail,
  X, Save, Building2, User, ClipboardList, Loader2, RefreshCw,
  ExternalLink, Copy, Link2, Check, Pencil
} from 'lucide-react';
import { otService } from '@/api/otService';
import { cn } from '@/lib/utils';

// ── Cache en módulo (persiste entre navegaciones sin re-fetch) ────────────────
const cache = {
  otClients: null,
  templates: null,
  ts: { otClients: 0, templates: 0 },
};
const STALE_MS = 60_000; // 1 min antes de considerar los datos caducados

function isFresh(key) {
  return cache[key] !== null && Date.now() - cache.ts[key] < STALE_MS;
}

// ── Componente ─────────────────────────────────────────────────────────────────
export default function OTCatalogs() {
  const [activeTab, setActiveTab] = useState('OT_CLIENTS');
  const [otClients, setOtClients]     = useState(cache.otClients ?? []);
  const [templates, setTemplates]     = useState(cache.templates ?? []);
  // loading solo se muestra si no hay datos en cache
  const [loadingClients, setLoadingClients]   = useState(!cache.otClients);
  const [loadingTemplates, setLoadingTemplates] = useState(!cache.templates);
  const [refreshing, setRefreshing]   = useState(false);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingClient, setEditingClient] = useState(null); // null = crear, objeto = editar
  const [isSaving, setIsSaving]         = useState(false);
  const [searchTerm, setSearchTerm]   = useState('');
  const abortRef = useRef(null);

  const initialNewOTClient = { name: '', storeNumber: '', storeName: '', contact: '', phone: '', email: '', address: '', otAddress: '', otReference: '' };
  const [newOTClient, setNewOTClient] = useState(initialNewOTClient);
  const [newTemplate, setNewTemplate] = useState({ name: '', title: '', workDescription: '', priority: 'MEDIUM', arrivalTime: '09:00' });

  // ── Fetch individual con cache ──────────────────────────────────────────────
  const fetchClients = useCallback(async (force = false) => {
    if (!force && isFresh('otClients')) return;
    if (!cache.otClients) setLoadingClients(true);
    try {
      const data = await otService.getOTClients();
      cache.otClients = data;
      cache.ts.otClients = Date.now();
      setOtClients(data);
    } finally {
      setLoadingClients(false);
    }
  }, []);

  const fetchTemplates = useCallback(async (force = false) => {
    if (!force && isFresh('templates')) return;
    if (!cache.templates) setLoadingTemplates(true);
    try {
      const data = await otService.getTemplates();
      cache.templates = data;
      cache.ts.templates = Date.now();
      setTemplates(data);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // ── Al montar: muestra cache al instante y refresca en background ───────────
  useEffect(() => {
    fetchClients();
    fetchTemplates();
    return () => abortRef.current?.abort();
  }, [fetchClients, fetchTemplates]);

  // ── Refresh manual ──────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchClients(true), fetchTemplates(true)]);
    setRefreshing(false);
  };

  // ── Guardar — optimista: agrega/actualiza en estado local antes de esperar server
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (activeTab === 'OT_CLIENTS') {
        if (editingClient) {
          // EDITAR: actualiza optimistamente en lugar
          const optimistic = { ...editingClient, ...newOTClient, _saving: true };
          setOtClients(prev => prev.map(c => c.id === editingClient.id ? optimistic : c));
          setIsModalOpen(false);
          const updated = await otService.updateOTClient(editingClient.id, newOTClient);
          setOtClients(prev => prev.map(c => c.id === editingClient.id ? { ...updated, lat: updated.latitude, lng: updated.longitude } : c));
        } else {
          // CREAR: agrega placeholder al inicio
          const temp = { ...newOTClient, id: `__tmp__${Date.now()}`, _saving: true };
          setOtClients(prev => [temp, ...prev]);
          setIsModalOpen(false);
          const saved = await otService.saveOTClient(newOTClient);
          setOtClients(prev => prev.map(c => c.id === temp.id ? { ...saved, lat: saved.latitude, lng: saved.longitude } : c));
        }
        cache.otClients = null;
        setNewOTClient(initialNewOTClient);
        setEditingClient(null);
      } else {
        const temp = { ...newTemplate, id: `__tmp__${Date.now()}`, _saving: true };
        setTemplates(prev => [temp, ...prev]);
        setIsModalOpen(false);
        const saved = await otService.saveTemplate(newTemplate);
        setTemplates(prev => prev.map(t => t.id === temp.id ? saved : t));
        cache.templates = null;
        setNewTemplate({ name: '', title: '', workDescription: '', priority: 'MEDIUM', arrivalTime: '09:00' });
      }
    } catch (err) {
      alert('Error al guardar: ' + err.message);
      if (activeTab === 'OT_CLIENTS') {
        if (editingClient) fetchClients(true); // revierte edición
        else setOtClients(prev => prev.filter(c => !c._saving));
        setEditingClient(null);
      } else {
        setTemplates(prev => prev.filter(t => !t._saving));
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ── Abrir modal en modo edición ─────────────────────────────────────────────
  const handleEditClick = (client) => {
    setEditingClient(client);
    setNewOTClient({
      name:        client.name        || '',
      storeNumber: client.storeNumber || '',
      storeName:   client.storeName   || '',
      contact:     client.contact     || '',
      phone:       client.phone       || '',
      email:       client.email       || '',
      address:     client.address     || '',
      otAddress:   client.otAddress   || '',
      otReference: client.otReference || '',
    });
    setIsModalOpen(true);
  };

  // ── Eliminar — optimista: quita de estado antes de esperar server ───────────
  const handleDeleteOTClient = async (id) => {
    if (!confirm('¿Eliminar este cliente OT del catálogo?')) return;
    setOtClients(prev => prev.filter(c => c.id !== id));
    cache.otClients = null;
    try { await otService.deleteOTClient(id); }
    catch { fetchClients(true); } // revierte si falla
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('¿Eliminar esta plantilla del catálogo?')) return;
    setTemplates(prev => prev.filter(t => t.id !== id));
    cache.templates = null;
    try { await otService.deleteTemplate(id); }
    catch { fetchTemplates(true); }
  };

  const [copiedId, setCopiedId] = useState(null);
  const handleGeneratePortal = async (client) => {
    try {
      const updated = await otService.generatePortalToken(client.id);
      setOtClients(prev => prev.map(c => c.id === client.id ? updated : c));
      cache.otClients = null;
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleCopyLink = (token) => {
    const link = `${window.location.protocol}//${window.location.host}/portal?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const filteredOTClients = otClients.filter(c => {
    const q = searchTerm.toLowerCase();
    return !q || [c.name, c.storeName, c.storeNumber, c.contact, c.address].some(v => v?.toLowerCase().includes(q));
  });

  const filteredTemplates = templates.filter(t => {
    const q = searchTerm.toLowerCase();
    return !q || [t.name, t.title].some(v => v?.toLowerCase().includes(q));
  });

  const TABS = [
    { id: 'OT_CLIENTS', label: 'Clientes OT',  icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'TEMPLATES',  label: 'Plantillas OT', icon: <FileText className="h-4 w-4" /> },
  ];

  const addLabel    = activeTab === 'OT_CLIENTS' ? 'Nuevo Cliente OT' : 'Nueva Plantilla';
  const isLoading   = activeTab === 'OT_CLIENTS' ? loadingClients : loadingTemplates;

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Catálogos de Operación</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Gestiona clientes OT y plantillas para agilizar la creación de órdenes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-11 w-11 flex items-center justify-center rounded-2xl border bg-white text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all shadow-sm"
            title="Actualizar"
          >
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </button>
          <button
            onClick={() => { setEditingClient(null); setNewOTClient(initialNewOTClient); setIsModalOpen(true); }}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <Plus className="h-4 w-4" /> {addLabel}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white p-1.5 rounded-[1.5rem] border w-fit shadow-sm gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              activeTab === tab.id ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"
            )}
          >
            {tab.icon} {tab.label}
            {/* Badge de conteo */}
            <span className={cn(
              "text-[9px] font-mono px-1.5 py-0.5 rounded-md",
              activeTab === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-400"
            )}>
              {tab.id === 'OT_CLIENTS' ? otClients.length : templates.length}
            </span>
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder={`Buscar ${activeTab === 'OT_CLIENTS' ? 'clientes OT' : 'plantillas'}...`}
          className="w-full pl-12 pr-4 py-3 bg-white border rounded-2xl outline-none focus:border-primary font-bold text-sm shadow-sm transition-colors"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto hidden md:block">
          {activeTab === 'OT_CLIENTS' ? (
            /* ── Tabla Clientes OT ── */
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  {['Cliente · Sucursal', 'Contacto', 'Email', 'Dirección', 'Portal de Cliente', 'Acciones'].map((h, i) => (
                    <th key={h} className={cn("px-5 py-3.5", i === 5 ? "text-right" : "text-left")}>
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400">{h}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="border-b border-gray-50">
                      <td colSpan={6} className="px-5 py-4"><div className="h-6 bg-gray-100 rounded-lg animate-pulse" /></td>
                    </tr>
                  ))
                ) : filteredOTClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <Building2 className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-300 text-[11px] font-black uppercase tracking-widest">
                        {searchTerm ? 'Sin resultados' : 'Sin clientes OT registrados'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOTClients.map(client => (
                    <tr key={client.id} className={cn("border-b border-gray-50 hover:bg-gray-50/60 transition-colors group", client._saving && "opacity-60 pointer-events-none")}>
                      {/* Cliente + sucursal */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            {client._saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-gray-900 text-sm leading-tight truncate">{client.name}</p>
                            {(client.storeNumber || client.storeName) && (
                              <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-0.5 truncate">
                                {client.storeNumber && `#${client.storeNumber}`}
                                {client.storeNumber && client.storeName && ' · '}
                                {client.storeName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Contacto */}
                      <td className="px-5 py-4">
                        {client.contact && <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><User className="h-3 w-3 text-gray-300 shrink-0" />{client.contact}</p>}
                        {client.phone && <p className="text-[11px] font-mono font-bold text-gray-400 flex items-center gap-1.5 mt-1"><Phone className="h-3 w-3 text-gray-300 shrink-0" />{client.phone}</p>}
                        {!client.contact && !client.phone && <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      {/* Email */}
                      <td className="px-5 py-4 max-w-[180px]">
                        {client.email
                          ? <span className="text-xs font-bold text-gray-500 truncate flex items-center gap-1.5"><Mail className="h-3 w-3 text-gray-300 shrink-0" /><span className="truncate">{client.email}</span></span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      {/* Dirección */}
                      <td className="px-5 py-4 max-w-[220px]">
                        {client.address
                          ? <span className="text-xs font-medium text-gray-500 line-clamp-2 flex items-start gap-1.5"><MapPin className="h-3 w-3 text-gray-300 shrink-0 mt-0.5" /><span className="line-clamp-2">{client.address}</span></span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      {/* Portal */}
                      <td className="px-5 py-4">
                        {client.portalToken ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleCopyLink(client.portalToken)}
                              className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                                copiedId === client.portalToken ? "bg-emerald-500 text-white" : "bg-gray-900 text-white hover:bg-gray-800"
                              )}
                            >
                              {copiedId === client.portalToken ? <><Check className="h-3 w-3" /> Copiado</> : <><Copy className="h-3 w-3" /> Copiar</>}
                            </button>
                            <a href={`/portal?token=${client.portalToken}`} target="_blank" rel="noreferrer" className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors" title="Abrir Portal">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleGeneratePortal(client)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-blue-100 transition-all border border-blue-100 border-dashed"
                          >
                            <Link2 className="h-3 w-3" /> Activar
                          </button>
                        )}
                      </td>
                      {/* Acciones */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEditClick(client)} className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar cliente">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDeleteOTClient(client.id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar cliente">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            /* ── Tabla Plantillas OT ── */
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  {['Plantilla', 'Título de OT', 'Descripción', 'Prioridad', 'Llegada', 'Acciones'].map((h, i) => (
                    <th key={h} className={cn("px-5 py-3.5", i === 5 ? "text-right" : "text-left")}>
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-400">{h}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [1, 2, 3, 4].map(i => (
                    <tr key={i} className="border-b border-gray-50">
                      <td colSpan={6} className="px-5 py-4"><div className="h-6 bg-gray-100 rounded-lg animate-pulse" /></td>
                    </tr>
                  ))
                ) : filteredTemplates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <FileText className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-300 text-[11px] font-black uppercase tracking-widest">
                        {searchTerm ? 'Sin resultados' : 'Sin plantillas registradas'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTemplates.map(template => {
                    const prio = { LOW: 'bg-slate-100 text-slate-500', MEDIUM: 'bg-blue-50 text-blue-600', HIGH: 'bg-orange-50 text-orange-700', URGENT: 'bg-red-50 text-red-700' }[template.priority] || 'bg-slate-100 text-slate-500';
                    const prioLabel = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente' }[template.priority] || template.priority;
                    return (
                      <tr key={template.id} className={cn("border-b border-gray-50 hover:bg-gray-50/60 transition-colors", template._saving && "opacity-60 pointer-events-none")}>
                        {/* Plantilla */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                              {template._saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                            </div>
                            <p className="font-black text-gray-900 text-sm leading-tight">{template.name}</p>
                          </div>
                        </td>
                        {/* Título */}
                        <td className="px-5 py-4">
                          <span className="text-xs font-bold text-gray-600">{template.title}</span>
                        </td>
                        {/* Descripción */}
                        <td className="px-5 py-4 max-w-[280px]">
                          <span className="text-xs text-gray-500 italic line-clamp-2">"{template.workDescription}"</span>
                        </td>
                        {/* Prioridad */}
                        <td className="px-5 py-4">
                          <span className={cn("text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg", prio)}>{prioLabel}</span>
                        </td>
                        {/* Llegada */}
                        <td className="px-5 py-4">
                          <span className="text-[11px] font-mono font-bold text-gray-500">{template.arrivalTime}</span>
                        </td>
                        {/* Acciones */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end">
                            <button onClick={() => handleDeleteTemplate(template.id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar plantilla">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Tarjetas (móvil) — sin scroll horizontal ── */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : activeTab === 'OT_CLIENTS' ? (
            filteredOTClients.length === 0 ? (
              <div className="py-16 text-center">
                <Building2 className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-300 text-[11px] font-black uppercase tracking-widest">
                  {searchTerm ? 'Sin resultados' : 'Sin clientes OT registrados'}
                </p>
              </div>
            ) : (
              filteredOTClients.map(client => (
                <div key={client.id} className={cn("p-4", client._saving && "opacity-60 pointer-events-none")}>
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      {client._saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-gray-900 text-sm leading-tight">{client.name}</p>
                      {(client.storeNumber || client.storeName) && (
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mt-0.5">
                          {client.storeNumber && `#${client.storeNumber}`}
                          {client.storeNumber && client.storeName && ' · '}
                          {client.storeName}
                        </p>
                      )}
                      <div className="mt-2 space-y-1">
                        {client.contact && <p className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5"><User className="h-3 w-3 text-gray-300 shrink-0" />{client.contact}</p>}
                        {client.phone && <p className="text-[11px] font-mono font-bold text-gray-400 flex items-center gap-1.5"><Phone className="h-3 w-3 text-gray-300 shrink-0" />{client.phone}</p>}
                        {client.email && <p className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5 min-w-0"><Mail className="h-3 w-3 text-gray-300 shrink-0" /><span className="truncate">{client.email}</span></p>}
                        {client.address && <p className="text-[11px] font-medium text-gray-500 flex items-start gap-1.5"><MapPin className="h-3 w-3 text-gray-300 shrink-0 mt-0.5" /><span className="line-clamp-2">{client.address}</span></p>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => handleEditClick(client)} className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => handleDeleteOTClient(client.id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {/* Portal */}
                  <div className="mt-3 pl-12">
                    {client.portalToken ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleCopyLink(client.portalToken)}
                          className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                            copiedId === client.portalToken ? "bg-emerald-500 text-white" : "bg-gray-900 text-white")}>
                          {copiedId === client.portalToken ? <><Check className="h-3 w-3" /> Copiado</> : <><Copy className="h-3 w-3" /> Copiar Portal</>}
                        </button>
                        <a href={`/portal?token=${client.portalToken}`} target="_blank" rel="noreferrer" className="p-1.5 bg-gray-100 text-gray-500 rounded-lg" title="Abrir Portal"><ExternalLink className="h-3.5 w-3.5" /></a>
                      </div>
                    ) : (
                      <button onClick={() => handleGeneratePortal(client)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-blue-100 border-dashed">
                        <Link2 className="h-3 w-3" /> Activar Portal
                      </button>
                    )}
                  </div>
                </div>
              ))
            )
          ) : (
            filteredTemplates.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-300 text-[11px] font-black uppercase tracking-widest">
                  {searchTerm ? 'Sin resultados' : 'Sin plantillas registradas'}
                </p>
              </div>
            ) : (
              filteredTemplates.map(template => {
                const prio = { LOW: 'bg-slate-100 text-slate-500', MEDIUM: 'bg-blue-50 text-blue-600', HIGH: 'bg-orange-50 text-orange-700', URGENT: 'bg-red-50 text-red-700' }[template.priority] || 'bg-slate-100 text-slate-500';
                const prioLabel = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente' }[template.priority] || template.priority;
                return (
                  <div key={template.id} className={cn("p-4", template._saving && "opacity-60 pointer-events-none")}>
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        {template._saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-black text-gray-900 text-sm leading-tight">{template.name}</p>
                          <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg", prio)}>{prioLabel}</span>
                        </div>
                        <p className="text-xs font-bold text-gray-600 mt-1">{template.title}</p>
                        <p className="text-[11px] text-gray-500 italic line-clamp-2 mt-1">"{template.workDescription}"</p>
                        <p className="text-[10px] font-mono font-bold text-gray-400 mt-1">Llegada: {template.arrivalTime}</p>
                      </div>
                      <button onClick={() => handleDeleteTemplate(template.id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-8 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900">
                  {activeTab === 'OT_CLIENTS'
                    ? (editingClient ? 'Editar Cliente OT' : 'Registrar Cliente OT')
                    : 'Crear Plantilla'}
                </h3>
                <button onClick={() => { setIsModalOpen(false); setEditingClient(null); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-4">
                {activeTab === 'OT_CLIENTS' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Razón Social / Empresa *</label>
                      <input required className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary transition-colors" placeholder="Coppel S.A. de C.V." value={newOTClient.name} onChange={e => setNewOTClient({ ...newOTClient, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">No. Sucursal</label>
                        <input className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary font-mono transition-colors" placeholder="152" value={newOTClient.storeNumber} onChange={e => setNewOTClient({ ...newOTClient, storeNumber: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Nombre Sucursal</label>
                        <input className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary transition-colors" placeholder="Insurgentes Norte" value={newOTClient.storeName} onChange={e => setNewOTClient({ ...newOTClient, storeName: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Contacto en Sitio *</label>
                        <input required className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary transition-colors" placeholder="Nombre del encargado" value={newOTClient.contact} onChange={e => setNewOTClient({ ...newOTClient, contact: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Teléfono *</label>
                        <input required className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary font-mono transition-colors" placeholder="5512345678" value={newOTClient.phone} onChange={e => setNewOTClient({ ...newOTClient, phone: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Email de Contacto</label>
                      <input type="email" className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary transition-colors" placeholder="contacto@empresa.com" value={newOTClient.email} onChange={e => setNewOTClient({ ...newOTClient, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Dirección de la Sucursal *</label>
                      <textarea required className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary resize-none transition-colors" placeholder="Av. Insurgentes Norte 1234, Col. Lindavista, CDMX" value={newOTClient.address} onChange={e => setNewOTClient({ ...newOTClient, address: e.target.value })} rows="2" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Referencias de Acceso</label>
                      <input className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary transition-colors" placeholder="Entrada por estacionamiento lateral" value={newOTClient.otReference} onChange={e => setNewOTClient({ ...newOTClient, otReference: e.target.value })} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Nombre de Plantilla (Ref. Interna)</label>
                      <input required className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary transition-colors" value={newTemplate.name} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="Ej. Mant. Preventivo Mensual" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Título de la OT</label>
                      <input required className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary transition-colors" value={newTemplate.title} onChange={e => setNewTemplate({ ...newTemplate, title: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Prioridad</label>
                        <select className="w-full px-4 py-3 border rounded-2xl font-bold bg-white outline-none focus:border-primary transition-colors" value={newTemplate.priority} onChange={e => setNewTemplate({ ...newTemplate, priority: e.target.value })}>
                          <option value="LOW">BAJA</option>
                          <option value="MEDIUM">MEDIA</option>
                          <option value="HIGH">ALTA</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Hora Sugerida</label>
                        <input type="time" className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary transition-colors" value={newTemplate.arrivalTime} onChange={e => setNewTemplate({ ...newTemplate, arrivalTime: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Descripción del Trabajo</label>
                      <textarea required className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary resize-none transition-colors" value={newTemplate.workDescription} onChange={e => setNewTemplate({ ...newTemplate, workDescription: e.target.value })} rows="3" />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 mt-4 shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                >
                  {isSaving
                    ? <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</>
                    : <><Save className="h-5 w-5" /> Guardar en Catálogo</>}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
