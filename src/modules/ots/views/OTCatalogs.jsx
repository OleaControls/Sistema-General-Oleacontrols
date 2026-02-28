import React, { useState, useEffect } from 'react';
import { 
  Users, 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  ChevronRight,
  Store,
  MapPin,
  Phone,
  Mail,
  X,
  Save,
  LayoutGrid
} from 'lucide-react';
import { crmService } from '@/api/crmService';
import { otService } from '@/api/otService';
import { cn } from '@/lib/utils';

export default function OTCatalogs() {
  const [activeTab, setActiveTab] = useState('CLIENTS'); // 'CLIENTS' | 'TEMPLATES'
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // States for new item
  const [newClient, setNewClient] = useState({ name: '', contact: '', email: '', phone: '', address: '' });
  const [newTemplate, setNewTemplate] = useState({ name: '', title: '', workDescription: '', priority: 'MEDIUM', arrivalTime: '09:00' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [c, t] = await Promise.all([
      crmService.getClients(),
      otService.getTemplates()
    ]);
    setClients(c);
    setTemplates(t);
    setLoading(false);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (activeTab === 'CLIENTS') {
      await crmService.saveClient(newClient);
      setNewClient({ name: '', contact: '', email: '', phone: '', address: '' });
    } else {
      await otService.saveTemplate(newTemplate);
      setNewTemplate({ name: '', title: '', workDescription: '', priority: 'MEDIUM', arrivalTime: '09:00' });
    }
    setIsModalOpen(false);
    loadData();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Catálogos de Operación</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Gestiona clientes y plantillas para agilizar la creación de OTs.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <Plus className="h-4 w-4" /> {activeTab === 'CLIENTS' ? 'Nuevo Cliente' : 'Nueva Plantilla'}
        </button>
      </div>

      {/* Tab Selector */}
      <div className="flex bg-white p-1.5 rounded-[1.5rem] border w-fit shadow-sm">
        <button 
          onClick={() => setActiveTab('CLIENTS')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'CLIENTS' ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <Users className="h-4 w-4" /> Clientes
        </button>
        <button 
          onClick={() => setActiveTab('TEMPLATES')}
          className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
            activeTab === 'TEMPLATES' ? "bg-gray-900 text-white shadow-lg" : "text-gray-400 hover:text-gray-600"
          )}
        >
          <FileText className="h-4 w-4" /> Plantillas OT
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input 
          type="text" 
          placeholder={`Buscar ${activeTab === 'CLIENTS' ? 'clientes' : 'plantillas'}...`}
          className="w-full pl-12 pr-4 py-3 bg-white border rounded-2xl outline-none focus:border-primary font-bold text-sm shadow-sm"
        />
      </div>

      {/* Grid of Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-48 bg-white rounded-[2rem] border animate-pulse" />)
        ) : activeTab === 'CLIENTS' ? (
          clients.map(client => (
            <div key={client.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                  <Store className="h-6 w-6" />
                </div>
                <button className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="font-black text-gray-900 text-lg leading-tight mb-4">{client.name}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                  <Users className="h-3.5 w-3.5" /> {client.contact}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                  <Mail className="h-3.5 w-3.5" /> {client.email}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{client.address}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          templates.map(template => (
            <div key={template.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-purple-100 p-3 rounded-2xl text-purple-600">
                  <FileText className="h-6 w-6" />
                </div>
                <button className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
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

      {/* Modal for New Item */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900">
                  {activeTab === 'CLIENTS' ? 'Registrar Cliente' : 'Crear Plantilla'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-4">
                {activeTab === 'CLIENTS' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Nombre de la Empresa</label>
                      <input required className="w-full px-4 py-3 border rounded-2xl font-bold" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Contacto</label>
                        <input required className="w-full px-4 py-3 border rounded-2xl font-bold" value={newClient.contact} onChange={e => setNewClient({...newClient, contact: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Teléfono</label>
                        <input required className="w-full px-4 py-3 border rounded-2xl font-bold" value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Email</label>
                      <input required type="email" className="w-full px-4 py-3 border rounded-2xl font-bold" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Dirección Fiscal/Tienda</label>
                      <textarea required className="w-full px-4 py-3 border rounded-2xl font-bold" value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} rows="2" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Nombre de Plantilla (Ref. Interna)</label>
                      <input required className="w-full px-4 py-3 border rounded-2xl font-bold" value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} placeholder="Ej. Mant. Preventivo Mensual" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Título de la OT</label>
                      <input required className="w-full px-4 py-3 border rounded-2xl font-bold" value={newTemplate.title} onChange={e => setNewTemplate({...newTemplate, title: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Prioridad</label>
                        <select className="w-full px-4 py-3 border rounded-2xl font-bold bg-white" value={newTemplate.priority} onChange={e => setNewTemplate({...newTemplate, priority: e.target.value})}>
                          <option value="LOW">BAJA</option>
                          <option value="MEDIUM">MEDIA</option>
                          <option value="HIGH">ALTA</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Hora Sugerida</label>
                        <input type="time" className="w-full px-4 py-3 border rounded-2xl font-bold" value={newTemplate.arrivalTime} onChange={e => setNewTemplate({...newTemplate, arrivalTime: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Descripción del Trabajo</label>
                      <textarea required className="w-full px-4 py-3 border rounded-2xl font-bold" value={newTemplate.workDescription} onChange={e => setNewTemplate({...newTemplate, workDescription: e.target.value})} rows="3" />
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
