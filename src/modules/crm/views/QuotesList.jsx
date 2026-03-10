import React, { useState, useEffect } from 'react';
import { 
  Plus, FileText, Download, Search, 
  Trash2, PlusCircle, Building2, User, 
  Calendar, DollarSign, X, Save, ExternalLink,
  ChevronRight, ArrowRight, Hash, Send,
  CheckCircle2, AlertCircle, Clock, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

export default function QuotesList() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const initialQuote = {
    quoteNumber: `COT-${new Date().getFullYear()}-${Math.floor(Math.random()*1000).toString().padStart(3, '0')}`,
    clientId: '', sellerId: '', projectName: '', projectPhase: 'INICIAL',
    contactName: '', validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    terms: 'Pago 100% anticipado. Tiempo de entrega sujeto a existencias.',
    items: [{ serial: '', name: '', desc: '', qty: 1, price: 0, total: 0 }],
    subtotal: 0, tax: 0, total: 0
  };

  const [newQuote, setNewQuote] = useState(initialQuote);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [qRes, cRes, eRes] = await Promise.all([
        fetch('/api/quotes'), fetch('/api/crm/clients'), fetch('/api/employees')
      ]);
      setQuotes(await qRes.json());
      setClients(await cRes.json());
      setEmployees(await eRes.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const sub = newQuote.items.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
    const tax = sub * 0.16;
    setNewQuote(prev => ({ ...prev, subtotal: sub, tax: tax, total: sub + tax }));
  }, [newQuote.items]);

  const addItem = () => setNewQuote({...newQuote, items: [...newQuote.items, { serial: '', name: '', desc: '', qty: 1, price: 0, total: 0 }]});
  
  const updateItem = (index, field, value) => {
    const ni = [...newQuote.items];
    ni[index][field] = value;
    if (field === 'qty' || field === 'price') ni[index].total = ni[index].qty * ni[index].price;
    setNewQuote({...newQuote, items: ni});
  };

  const handleCreateQuote = async (e) => {
    e.preventDefault(); setIsGenerating(true);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newQuote, creatorId: user.id })
      });
      if (res.ok) { setShowAddModal(false); setNewQuote(initialQuote); fetchData(); }
    } catch (err) { alert("Error"); }
    finally { setIsGenerating(false); }
  };

  const handleDownloadPDF = async (quoteId, quoteNumber) => {
    try {
      const res = await fetch(`/api/quotes?id=${quoteId}`);
      const data = await res.json();
      window.open(data.pdfUrl, '_blank');
    } catch (err) { console.error(err); }
  };

  const handleDeleteQuote = async (id, num) => {
    if (!window.confirm(`¿Eliminar ${num}?`)) return;
    try {
      const res = await fetch('/api/quotes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await fetch('/api/quotes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="p-10 text-center animate-pulse font-black text-gray-400 text-xs tracking-widest uppercase">Cargando Presupuestos...</div>;

  return (
    <div className="max-w-full mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-20 px-2 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase italic text-primary">Presupuestos</h2>
          <p className="text-gray-500 font-bold text-[10px] mt-1 uppercase tracking-widest flex items-center gap-2"><DollarSign className="h-3 w-3 text-emerald-500" /> Cotizador OleaControls</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto bg-gray-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
          <PlusCircle className="h-4 w-4" /> Crear Cotización
        </button>
      </div>

      {/* Grid de Cotizaciones Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {quotes.map((q) => (
          <motion.div key={q.id} whileHover={{ y: -5 }} className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="space-y-5 md:space-y-6">
              <div className="flex justify-between items-start">
                <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border", 
                  q.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                  q.status === 'REJECTED' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100')}>
                  {q.status === 'ACCEPTED' ? 'Aprobada' : q.status === 'REJECTED' ? 'No Concretada' : 'Pendiente'}
                </div>
                <div className="flex gap-1.5">
                    <button onClick={() => updateStatus(q.id, 'ACCEPTED')} className="p-1.5 rounded-lg bg-emerald-500 text-white"><CheckCircle2 className="h-3.5 w-3.5" /></button>
                    <button onClick={() => updateStatus(q.id, 'REJECTED')} className="p-1.5 rounded-lg bg-red-500 text-white"><X className="h-3.5 w-3.5" /></button>
                    <button onClick={() => handleDeleteQuote(q.id, q.quoteNumber)} className="p-1.5 rounded-lg bg-gray-100 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>

              <div>
                <p className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">{q.quoteNumber}</p>
                <h3 className="text-lg md:text-xl font-black text-gray-900 group-hover:text-primary transition-colors truncate">{q.client.companyName}</h3>
                <div className="flex items-center gap-2 mt-2">
                    <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-black">{q.seller?.name?.charAt(0) || '?'}</div>
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest truncate">Vendedor: {q.seller?.name || 'No asignado'}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 flex justify-between items-end">
                <div><p className="text-[8px] font-black text-gray-400 uppercase">Importe Total</p><p className="text-xl md:text-2xl font-black text-gray-900">${q.total.toLocaleString()}</p></div>
                <button onClick={() => handleDownloadPDF(q.id, q.quoteNumber)} className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg"><Download className="h-5 w-5" /></button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal Responsive Full-Screen */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="bg-white rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] overflow-y-auto">
              <form onSubmit={handleCreateQuote} className="p-6 md:p-10 space-y-8 md:space-y-10">
                <div className="flex justify-between items-center border-b pb-4">
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Nueva Cotización</h3>
                  <button type="button" onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-400" /></button>
                </div>

                {/* Info General Responsive */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  <select required className="w-full bg-gray-50 border-none rounded-xl px-5 py-4 font-bold text-sm outline-none" value={newQuote.clientId} onChange={(e) => setNewQuote({...newQuote, clientId: e.target.value})}>
                    <option value="">Seleccionar Cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                  <select className="w-full bg-blue-50 border-none rounded-xl px-5 py-4 font-black text-sm outline-none text-blue-700" value={newQuote.sellerId} onChange={(e) => setNewQuote({...newQuote, sellerId: e.target.value})}>
                    <option value="">¿Quién vendió?</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  <input type="text" className="w-full bg-gray-50 border-none rounded-xl px-5 py-4 font-bold text-sm outline-none" placeholder="Nombre del Proyecto" value={newQuote.projectName} onChange={(e) => setNewQuote({...newQuote, projectName: e.target.value})} />
                  <input type="date" className="w-full bg-gray-50 border-none rounded-xl px-5 py-4 font-bold text-sm outline-none" value={newQuote.validUntil} onChange={(e) => setNewQuote({...newQuote, validUntil: e.target.value})} />
                </div>

                {/* Conceptos Responsive (Table on desktop, Cards on mobile) */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center"><h4 className="text-xs font-black uppercase tracking-widest">Conceptos</h4><button type="button" onClick={addItem} className="text-[10px] font-black text-blue-600 underline uppercase">Añadir Concepto</button></div>
                    <div className="space-y-4">
                        {newQuote.items.map((item, index) => (
                            <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-5 bg-gray-50 rounded-[1.5rem] md:rounded-2xl items-center relative">
                                <input className="col-span-12 sm:col-span-2 bg-white rounded-lg p-2 text-[10px] font-black uppercase" placeholder="Nº Serie" value={item.serial} onChange={(e) => updateItem(index, 'serial', e.target.value)} />
                                <input className="col-span-12 sm:col-span-4 bg-white rounded-lg p-2 text-[10px] font-bold" placeholder="Servicio / Producto" value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} />
                                <div className="col-span-12 sm:col-span-6 grid grid-cols-3 gap-2 items-center">
                                    <input className="bg-white rounded-lg p-2 text-[10px] text-center font-bold" type="number" value={item.qty} onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value))} />
                                    <input className="bg-white rounded-lg p-2 text-[10px] font-bold" type="number" placeholder="Precio" value={item.price} onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))} />
                                    <div className="text-right font-black text-xs text-gray-900">${(item.qty * item.price).toLocaleString()}</div>
                                </div>
                                <button type="button" className="absolute top-2 right-2 sm:static sm:col-span-1 text-red-400 p-1" onClick={() => setNewQuote({...newQuote, items: newQuote.items.filter((_, i) => i !== index)}) }><X className="h-4 w-4" /></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Financiero Responsive */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 mt-6">
                    <textarea className="w-full bg-gray-50 border-none rounded-2xl p-5 text-[10px] outline-none" rows="3" placeholder="Términos y condiciones..." value={newQuote.terms} onChange={(e) => setNewQuote({...newQuote, terms: e.target.value})} />
                    <div className="bg-gray-900 rounded-[2rem] p-6 md:p-8 text-white space-y-3 md:space-y-4 shadow-xl">
                        <div className="flex justify-between text-[10px] font-black uppercase opacity-50"><span>Subtotal</span><span>${newQuote.subtotal.toLocaleString()}</span></div>
                        <div className="flex justify-between text-[10px] font-black uppercase opacity-50"><span>IVA (16%)</span><span>${newQuote.tax.toLocaleString()}</span></div>
                        <div className="pt-4 border-t border-white/10 flex justify-between items-center"><span className="text-sm font-black uppercase text-primary">Total General</span><span className="text-2xl md:text-3xl font-black">${newQuote.total.toLocaleString()}</span></div>
                    </div>
                </div>

                <button disabled={isGenerating || !newQuote.clientId} type="submit" className="w-full bg-blue-600 text-white py-5 md:py-6 rounded-2xl md:rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all">
                  {isGenerating ? 'Sincronizando...' : 'Generar y Acreditar Venta'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
