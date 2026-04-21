import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, Plus, Search, Trash2, MapPin, Phone, Mail,
  X, Save, Building2, User, ClipboardList, Loader2, RefreshCw
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving]       = useState(false);
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

  // ── Guardar — optimista: agrega a estado local antes de esperar server ──────
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (activeTab === 'OT_CLIENTS') {
        // Optimista: agrega placeholder al inicio
        const temp = { ...newOTClient, id: `__tmp__${Date.now()}`, _saving: true };
        setOtClients(prev => [temp, ...prev]);
        setIsModalOpen(false);
        const saved = await otService.saveOTClient(newOTClient);
        // Reemplaza placeholder con el registro real
        setOtClients(prev => prev.map(c => c.id === temp.id ? { ...saved, lat: saved.latitude, lng: saved.longitude } : c));
        cache.otClients = null; // invalida cache para próxima visita
        setNewOTClient(initialNewOTClient);
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
      // Revierte optimista en caso de error
      if (activeTab === 'OT_CLIENTS') setOtClients(prev => prev.filter(c => !c._saving));
      else setTemplates(prev => prev.filter(t => !t._saving));
    } finally {
      setIsSaving(false);
    }
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
  const currentList = activeTab === 'OT_CLIENTS' ? filteredOTClients : filteredTemplates;

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
            onClick={() => setIsModalOpen(true)}
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

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Skeletons — solo si no hay datos en cache
          [1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-white rounded-[2rem] border animate-pulse" />
          ))
        ) : currentList.length === 0 ? (
          <div className="col-span-3 py-16 text-center">
            <p className="text-gray-300 text-sm font-bold uppercase tracking-widest">
              {searchTerm ? 'Sin resultados' : activeTab === 'OT_CLIENTS' ? 'Sin clientes OT registrados' : 'Sin plantillas registradas'}
            </p>
          </div>
        ) : activeTab === 'OT_CLIENTS' ? (
          filteredOTClients.map(client => (
            <div
              key={client.id}
              className={cn(
                "bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group",
                client._saving && "opacity-60 pointer-events-none"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                  {client._saving
                    ? <Loader2 className="h-6 w-6 animate-spin" />
                    : <Building2 className="h-6 w-6" />}
                </div>
                <button
                  onClick={() => handleDeleteOTClient(client.id)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="font-black text-gray-900 text-lg leading-tight">{client.name}</h3>
              {(client.storeNumber || client.storeName) && (
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 mb-3">
                  {client.storeNumber && `#${client.storeNumber}`}
                  {client.storeNumber && client.storeName && ' · '}
                  {client.storeName}
                </p>
              )}
              <div className="space-y-2 mt-3">
                {client.contact && (
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <User className="h-3.5 w-3.5 shrink-0" /> {client.contact}
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <Phone className="h-3.5 w-3.5 shrink-0" /> {client.phone}
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{client.email}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{client.address}</span>
                  </div>
                )}
                {client.otReference && (
                  <div className="mt-3 pt-3 border-t border-dashed text-[10px] text-gray-400 italic">
                    Ref: {client.otReference}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          filteredTemplates.map(template => (
            <div
              key={template.id}
              className={cn(
                "bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group",
                template._saving && "opacity-60 pointer-events-none"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="bg-purple-100 p-3 rounded-2xl text-purple-600">
                  {template._saving
                    ? <Loader2 className="h-6 w-6 animate-spin" />
                    : <FileText className="h-6 w-6" />}
                </div>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="font-black text-gray-900 text-lg leading-tight mb-2">{template.name}</h3>
              <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-4">
                Plantilla: {template.title}
              </p>
              <p className="text-xs text-gray-500 line-clamp-2 italic">"{template.workDescription}"</p>
              <div className="mt-4 pt-4 border-t border-dashed flex justify-between items-center text-[10px] font-black uppercase text-gray-400">
                <span>Prioridad: {template.priority}</span>
                <span>Llegada: {template.arrivalTime}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-8 overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900">
                  {activeTab === 'OT_CLIENTS' ? 'Registrar Cliente OT' : 'Crear Plantilla'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
