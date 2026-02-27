import React, { useState, useEffect } from 'react';
import { Users2, Plus, Search, Mail, Phone, MapPin, Building2, MoreVertical, X } from 'lucide-react';
import { crmService } from '@/api/crmService';

export default function ClientsList() {
  const [clients, setClients] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    const data = await crmService.getClients();
    setClients(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Clientes y Cuentas</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Directorio maestro de clientes y datos de facturación.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <Plus className="h-4 w-4" /> Nuevo Cliente
        </button>
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar por nombre, RFC o contacto..." className="pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:border-primary w-64" />
          </div>
        </div>
        
        <table className="w-full text-left">
          <thead className="bg-white border-b">
            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-6 py-4">Cliente / RFC</th>
              <th className="px-6 py-4">Contacto Principal</th>
              <th className="px-6 py-4">Ubicación</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-black text-sm text-gray-900">{client.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">RFC: {client.rfc}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-gray-700">{client.contact}</p>
                  <div className="flex gap-3 mt-1">
                    <Mail className="h-3 w-3 text-gray-400" />
                    <Phone className="h-3 w-3 text-gray-400" />
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-bold text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {client.address}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-400 hover:text-primary transition-colors">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && <ClientFormModal onClose={() => setIsModalOpen(false)} onSave={loadClients} />}
    </div>
  );
}

function ClientFormModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({ name: '', rfc: '', contact: '', email: '', phone: '', address: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await crmService.saveClient(formData);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-xl font-black text-gray-900">Registrar Nuevo Cliente</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Datos maestros para ventas y facturación</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Razón Social</label>
              <input required className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold outline-none focus:border-primary" 
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">RFC</label>
              <input required className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold outline-none focus:border-primary" 
                value={formData.rfc} onChange={e => setFormData({...formData, rfc: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Contacto</label>
              <input required className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold outline-none focus:border-primary" 
                value={formData.contact} onChange={e => setFormData({...formData, contact: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</label>
              <input type="email" required className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold outline-none focus:border-primary" 
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Teléfono</label>
              <input required className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold outline-none focus:border-primary" 
                value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dirección Fiscal / Entrega</label>
              <textarea rows="2" className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold outline-none focus:border-primary" 
                value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all mt-4 uppercase tracking-widest text-sm">
            Guardar Cliente
          </button>
        </form>
      </div>
    </div>
  );
}
