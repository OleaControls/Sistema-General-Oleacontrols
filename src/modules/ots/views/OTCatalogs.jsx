import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Trash2,
  MapPin,
  Phone,
  Mail,
  X,
  Save,
  Building2,
  User,
  ClipboardList
} from 'lucide-react';
import { otService } from '@/api/otService';
import { cn } from '@/lib/utils';

export default function OTCatalogs() {
  const [activeTab, setActiveTab] = useState('OT_CLIENTS'); // 'OT_CLIENTS' | 'TEMPLATES'
  const [otClients, setOtClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const initialNewOTClient = { name: '', storeNumber: '', storeName: '', contact: '', phone: '', email: '', address: '', otAddress: '', otReference: '' };
  const [newOTClient, setNewOTClient] = useState(initialNewOTClient);
  const [newTemplate, setNewTemplate] = useState({ name: '', title: '', workDescription: '', priority: 'MEDIUM', arrivalTime: '09:00' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [oc, t] = await Promise.all([
      otService.getOTClients(),
      otService.getTemplates()
    ]);
    setOtClients(oc);
    setTemplates(t);
    setLoading(false);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (activeTab === 'OT_CLIENTS') {
      await otService.saveOTClient(newOTClient);
      setNewOTClient(initialNewOTClient);
    } else {
      await otService.saveTemplate(newTemplate);
      setNewTemplate({ name: '', title: '', workDescription: '', priority: 'MEDIUM', arrivalTime: '09:00' });
    }
    setIsModalOpen(false);
    loadData();
  };

  const handleDeleteOTClient = async (id) => {
    if (!confirm('¿Eliminar este cliente OT del catálogo?')) return;
    await otService.deleteOTClient(id);
    loadData();
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('¿Eliminar esta plantilla del catálogo?')) return;
    await otService.deleteTemplate(id);
    loadData();
  };

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

  const addLabel = activeTab === 'OT_CLIENTS' ? 'Nuevo Cliente OT' : 'Nueva Plantilla';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Catálogos de Operación</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Gestiona clientes OT, clientes CRM y plantillas para agilizar la creación de órdenes.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <Plus className="h-4 w-4" /> {addLabel}
        </button>
      </div>

      {/* Tab Selector */}
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
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder={`Buscar ${activeTab === 'OT_CLIENTS' ? 'clientes OT' : activeTab === 'CLIENTS' ? 'clientes CRM' : 'plantillas'}...`}
          className="w-full pl-12 pr-4 py-3 bg-white border rounded-2xl outline-none focus:border-primary font-bold text-sm shadow-sm"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 bg-white rounded-[2rem] border animate-pulse" />)
        ) : activeTab === 'OT_CLIENTS' ? (
          filteredOTClients.length === 0 ? (
            <div className="col-span-3 py-16 text-center text-gray-400 text-sm font-bold">Sin clientes OT registrados</div>
          ) : filteredOTClients.map(client => (
            <div key={client.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                  <Building2 className="h-6 w-6" />
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
                  {client.storeNumber && `#${client.storeNumber}`}{client.storeNumber && client.storeName && ' · '}{client.storeName}
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
            <div key={template.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-purple-100 p-3 rounded-2xl text-purple-600">
                  <FileText className="h-6 w-6" />
                </div>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="font-black text-gray-900 text-lg leading-tight mb-2">{template.name}</h3>
              <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-4">Plantilla: {template.title}</p>
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
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-4">
                {activeTab === 'OT_CLIENTS' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Razón Social / Empresa *</label>
                      <input required className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary" placeholder="Coppel S.A. de C.V." value={newOTClient.name} onChange={e => setNewOTClient({ ...newOTClient, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">No. Sucursal</label>
                        <input className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary font-mono" placeholder="152" value={newOTClient.storeNumber} onChange={e => setNewOTClient({ ...newOTClient, storeNumber: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Nombre Sucursal</label>
                        <input className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary" placeholder="Insurgentes Norte" value={newOTClient.storeName} onChange={e => setNewOTClient({ ...newOTClient, storeName: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Contacto en Sitio *</label>
                        <input required className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary" placeholder="Nombre del encargado" value={newOTClient.contact} onChange={e => setNewOTClient({ ...newOTClient, contact: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Teléfono *</label>
                        <input required className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary font-mono" placeholder="5512345678" value={newOTClient.phone} onChange={e => setNewOTClient({ ...newOTClient, phone: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Email de Contacto</label>
                      <input type="email" className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary" placeholder="contacto@empresa.com" value={newOTClient.email} onChange={e => setNewOTClient({ ...newOTClient, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Dirección de la Sucursal *</label>
                      <textarea required className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary resize-none" placeholder="Av. Insurgentes Norte 1234, Col. Lindavista, CDMX" value={newOTClient.address} onChange={e => setNewOTClient({ ...newOTClient, address: e.target.value })} rows="2" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Referencias de Acceso</label>
                      <input className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary" placeholder="Entrada por estacionamiento lateral" value={newOTClient.otReference} onChange={e => setNewOTClient({ ...newOTClient, otReference: e.target.value })} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Nombre de Plantilla (Ref. Interna)</label>
                      <input required className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary" value={newTemplate.name} onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="Ej. Mant. Preventivo Mensual" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Título de la OT</label>
                      <input required className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary" value={newTemplate.title} onChange={e => setNewTemplate({ ...newTemplate, title: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Prioridad</label>
                        <select className="w-full px-4 py-3 border rounded-2xl font-bold bg-white outline-none focus:border-primary" value={newTemplate.priority} onChange={e => setNewTemplate({ ...newTemplate, priority: e.target.value })}>
                          <option value="LOW">BAJA</option>
                          <option value="MEDIUM">MEDIA</option>
                          <option value="HIGH">ALTA</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Hora Sugerida</label>
                        <input type="time" className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary" value={newTemplate.arrivalTime} onChange={e => setNewTemplate({ ...newTemplate, arrivalTime: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Descripción del Trabajo</label>
                      <textarea required className="w-full px-4 py-3 border rounded-2xl font-bold outline-none focus:border-primary resize-none" value={newTemplate.workDescription} onChange={e => setNewTemplate({ ...newTemplate, workDescription: e.target.value })} rows="3" />
                    </div>
                  </>
                )}

                <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 mt-4 shadow-lg shadow-primary/20">
                  <Save className="h-5 w-5" /> Guardar en Catálogo
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
