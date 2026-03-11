import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Building2, User, Mail, 
  Phone, MapPin, MoreVertical, ChevronRight, 
  Hash, ShieldCheck, X, Save, Map, Globe, CreditCard, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function ClientsList() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentClientId, setCurrentClientId] = useState(null);
  
  const initialClientState = {
    companyName: '', contactName: '', email: '', phone: '',
    rfc: '', address: '', latitude: '', longitude: '', status: 'ACTIVE'
  };

  const [newClient, setNewClient] = useState(initialClientState);

  useEffect(() => { fetchClients(); }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/crm/clients');
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setClients([]); }
    finally { setLoading(false); }
  };

  const handleDeleteClient = async (id, name) => {
    if (!window.confirm(`¿Eliminar "${name}"?`)) return;
    try {
      const res = await fetch('/api/crm/clients', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        fetchClients();
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Error al eliminar");
      }
    } catch (err) { console.error(err); alert("Error de conexión"); }
  };

  const handleOpenEdit = (client) => {
    setNewClient({
      companyName: client.companyName || '', contactName: client.contactName || '',
      email: client.email || '', phone: client.phone || '',
      rfc: client.rfc || '', address: client.address || '',
      latitude: client.latitude || '', longitude: client.longitude || '',
      status: client.status || 'ACTIVE'
    });
    setCurrentClientId(client.id); setIsEditing(true); setShowAddModal(true);
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    const method = isEditing ? 'PUT' : 'POST';
    const payload = isEditing ? { ...newClient, id: currentClientId } : newClient;
    try {
      const res = await fetch('/api/crm/clients', {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) { setShowAddModal(false); setNewClient(initialClientState); fetchClients(); }
    } catch (err) { alert("Error"); }
  };

  const filteredClients = clients.filter(c => 
    c.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contactName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-10 text-center animate-pulse font-black text-gray-400 text-xs tracking-widest uppercase">Cargando Cartera...</div>;

  return (
    <div className="max-w-full mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-20 px-2 md:px-0">
      {/* Header Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase italic text-primary">Clientes</h2>
          <p className="text-gray-500 font-bold text-[10px] mt-1 uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="h-3 w-3 text-emerald-500" /> Base de Datos Olea</p>
        </div>
        <button onClick={() => { setIsEditing(false); setNewClient(initialClientState); setShowAddModal(true); }} className="w-full sm:w-auto bg-gray-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
          <Plus className="h-4 w-4" /> Nuevo Cliente
        </button>
      </div>

      {/* Search Bar Responsive */}
      <div className="bg-white p-3 md:p-4 rounded-2xl md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-3 px-5 md:px-8">
        <Search className="h-4 w-4 text-gray-400" />
        <input type="text" placeholder="Buscar por empresa o contacto..." className="flex-1 bg-transparent border-none outline-none font-bold text-xs md:text-sm text-gray-900" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      {/* Grid de Clientes Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {filteredClients.map((client) => (
          <motion.div key={client.id} whileHover={{ y: -5 }} className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="space-y-5 md:space-y-6 relative z-10">
              <div className="flex justify-between items-start">
                <div className="h-12 w-12 rounded-xl bg-gray-900 text-white flex items-center justify-center font-black text-lg shadow-lg">{client.companyName.charAt(0)}</div>
                <div className="flex gap-2">
                    <button onClick={() => handleDeleteClient(client.id, client.companyName)} className="p-2 rounded-lg bg-red-50 text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    <span className={cn("text-[8px] font-black px-2 py-1 rounded-full border uppercase", client.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100')}>{client.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-gray-900 group-hover:text-primary transition-colors">{client.companyName}</h3>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-1"><Hash className="h-3 w-3" /> RFC: {client.rfc || 'XAXX010101000'}</p>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-50">
                <div className="flex items-center gap-3 text-gray-600"><User className="h-4 w-4 text-primary/40" /><span className="text-xs font-bold">{client.contactName}</span></div>
                <div className="flex items-center gap-3 text-gray-600"><Mail className="h-4 w-4 text-primary/40" /><span className="text-xs font-bold lowercase truncate">{client.email}</span></div>
                <div className="flex items-center gap-3 text-gray-600"><MapPin className="h-4 w-4 text-primary/40" /><span className="text-[10px] font-bold truncate">{client.address || 'Sin dirección'}</span></div>
              </div>

              <button onClick={() => handleOpenEdit(client)} className="w-full mt-4 bg-gray-50 group-hover:bg-primary group-hover:text-white py-4 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">Expediente Operativo <ChevronRight className="h-3 w-3" /></button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal Responsive Full-Screen en Mobile */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="bg-white rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
              <form onSubmit={handleAddClient} className="p-6 md:p-10 space-y-6 md:space-y-8">
                <div className="flex justify-between items-center border-b pb-4">
                  <div><h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tighter uppercase">{isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}</h3><p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Sincronización con OTs y Ventas</p></div>
                  <button type="button" onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-400" /></button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input required className="w-full bg-gray-50 rounded-xl px-5 py-4 font-bold text-sm outline-none" placeholder="Empresa / Marca" value={newClient.companyName} onChange={(e) => setNewClient({...newClient, companyName: e.target.value})} />
                    <input className="w-full bg-gray-50 rounded-xl px-5 py-4 font-black text-sm outline-none uppercase" placeholder="RFC" value={newClient.rfc} onChange={(e) => setNewClient({...newClient, rfc: e.target.value})} />
                  </div>

                  <div className="p-5 bg-blue-50/50 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-3 flex justify-between items-center"><p className="text-[9px] font-black text-blue-600 uppercase">Contacto Operativo</p>
                    {isEditing && <select className="bg-white rounded-lg text-[8px] font-black px-2 py-1 outline-none" value={newClient.status} onChange={(e) => setNewClient({...newClient, status: e.target.value})}><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option></select>}</div>
                    <input required className="w-full bg-white rounded-lg px-4 py-3 font-bold text-xs outline-none" placeholder="Nombre Contacto" value={newClient.contactName} onChange={(e) => setNewClient({...newClient, contactName: e.target.value})} />
                    <input required type="email" className="w-full bg-white rounded-lg px-4 py-3 font-bold text-xs outline-none" placeholder="Email" value={newClient.email} onChange={(e) => setNewClient({...newClient, email: e.target.value})} />
                    <input className="w-full bg-white rounded-lg px-4 py-3 font-bold text-xs outline-none" placeholder="Teléfono" value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: e.target.value})} />
                  </div>

                  <div className="space-y-4">
                    <input required className="w-full bg-gray-50 rounded-xl px-5 py-4 font-bold text-sm outline-none" placeholder="Dirección Principal para OTs" value={newClient.address} onChange={(e) => setNewClient({...newClient, address: e.target.value})} />
                    <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <input className="bg-transparent border-none w-full text-center font-black text-xs outline-none" placeholder="Latitud GPS" value={newClient.latitude} onChange={(e) => setNewClient({...newClient, latitude: e.target.value})} />
                        <input className="bg-transparent border-none w-full text-center font-black text-xs outline-none border-l" placeholder="Longitud GPS" value={newClient.longitude} onChange={(e) => setNewClient({...newClient, longitude: e.target.value})} />
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-primary transition-all shadow-gray-200">
                  <Save className="h-4 w-4 inline mr-2" /> {isEditing ? 'Actualizar Expediente' : 'Guardar y Vincular'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
