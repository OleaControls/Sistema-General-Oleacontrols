import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, Download, Send, CheckCircle, Clock, X } from 'lucide-react';
import { crmService } from '@/api/crmService';
import { cn } from '@/lib/utils';

export default function QuotesList() {
  const [quotes, setQuotes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    setLoading(true);
    const data = await crmService.getQuotes();
    setQuotes(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Presupuestos</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Genera y da seguimiento a cotizaciones comerciales.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
        >
          <Plus className="h-4 w-4" /> Nueva Cotización
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enviadas (Este Mes)</p>
          <p className="text-2xl font-black text-gray-900 mt-1">24</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm border-emerald-100">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Aceptadas (Conversión)</p>
          <p className="text-2xl font-black text-gray-900 mt-1">68%</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Monto en Propuestas</p>
          <p className="text-2xl font-black text-gray-900 mt-1">$1.4M <span className="text-xs text-gray-400">MXN</span></p>
        </div>
      </div>

      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar por cliente o folio..." className="pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:border-primary w-64" />
          </div>
          <button className="p-2 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4 text-gray-600" />
          </button>
        </div>
        
        <table className="w-full text-left">
          <thead className="bg-white border-b">
            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <th className="px-6 py-4">Folio / Fecha</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Total (MXN)</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {quotes.map((quote) => (
              <tr key={quote.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4">
                  <p className="font-black text-sm text-gray-900">{quote.id}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{quote.date}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-sm text-gray-700">{quote.clientName}</p>
                </td>
                <td className="px-6 py-4 font-black text-sm text-gray-900">
                  ${quote.total.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider border",
                    quote.status === 'ACCEPTED' ? "bg-green-50 text-green-700 border-green-100" :
                    quote.status === 'SENT' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-gray-100 text-gray-600 border-gray-200"
                  )}>
                    {quote.status === 'ACCEPTED' ? <CheckCircle className="h-3 w-3 inline mr-1" /> : <Clock className="h-3 w-3 inline mr-1" />}
                    {quote.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-2 text-gray-400 hover:text-primary transition-colors border rounded-lg hover:bg-white">
                      <Download className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors border rounded-lg hover:bg-white">
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && <QuoteFormModal onClose={() => setIsModalOpen(false)} onSave={loadQuotes} />}
    </div>
  );
}

function QuoteFormModal({ onClose, onSave }) {
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    clientId: '',
    items: [{ desc: '', qty: 1, price: 0 }]
  });

  useEffect(() => {
    crmService.getClients().then(setClients);
  }, []);

  const addItem = () => setFormData({...formData, items: [...formData.items, { desc: '', qty: 1, price: 0 }]});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const total = formData.items.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
    const client = clients.find(c => c.id === formData.clientId);
    await crmService.saveQuote({ 
      clientId: formData.clientId, 
      clientName: client?.name, 
      date: new Date().toISOString().split('T')[0], 
      total 
    });
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="text-xl font-black text-gray-900">Nueva Cotización</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Detalla los conceptos para el cliente</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Seleccionar Cliente</label>
            <select 
              required
              className="w-full bg-gray-50 border px-4 py-3 rounded-xl font-bold text-gray-900 outline-none focus:border-primary"
              value={formData.clientId}
              onChange={(e) => setFormData({...formData, clientId: e.target.value})}
            >
              <option value="">-- Elige un cliente --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Conceptos / Partidas</h4>
              <button type="button" onClick={addItem} className="text-primary text-[10px] font-black uppercase hover:underline">+ Agregar Partida</button>
            </div>
            
            {formData.items.map((item, idx) => (
              <div key={idx} className="flex gap-3 items-end">
                <div className="flex-[3] space-y-1">
                  <input 
                    placeholder="Descripción del servicio/producto"
                    className="w-full bg-gray-50 border px-4 py-2 rounded-xl text-sm font-medium outline-none"
                    value={item.desc}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[idx].desc = e.target.value;
                      setFormData({...formData, items: newItems});
                    }}
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <input 
                    type="number" 
                    placeholder="Cant"
                    className="w-full bg-gray-50 border px-4 py-2 rounded-xl text-sm font-bold outline-none"
                    value={item.qty}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[idx].qty = e.target.value;
                      setFormData({...formData, items: newItems});
                    }}
                  />
                </div>
                <div className="flex-[1.5] space-y-1">
                  <input 
                    type="number" 
                    placeholder="Precio"
                    className="w-full bg-gray-50 border px-4 py-2 rounded-xl text-sm font-bold outline-none"
                    value={item.price}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[idx].price = e.target.value;
                      setFormData({...formData, items: newItems});
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t flex justify-between items-center">
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Estimado</p>
              <p className="text-3xl font-black text-gray-900">
                ${formData.items.reduce((acc, curr) => acc + (curr.qty * curr.price), 0).toLocaleString()}
              </p>
            </div>
            <button type="submit" className="bg-primary text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all">
              Generar Cotización
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
