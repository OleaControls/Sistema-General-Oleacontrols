import React, { useState, useEffect } from 'react';
import { 
  Plus, MoreVertical, Mail, Phone, Building2, 
  DollarSign, ArrowRight, Target, X, CheckCircle2,
  TrendingUp, Activity, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';

const STAGES = [
  { id: 'PROSPECT', label: 'Prospección', color: 'bg-blue-500', bg: 'bg-blue-50/30' },
  { id: 'QUOTED', label: 'Cotizado', color: 'bg-amber-500', bg: 'bg-amber-50/30' },
  { id: 'NEGOTIATION', label: 'Negociación', color: 'bg-purple-500', bg: 'bg-purple-50/30' },
  { id: 'WON', label: 'Ganado', color: 'bg-emerald-500', bg: 'bg-emerald-50/30' },
  { id: 'LOST', label: 'Perdido', color: 'bg-red-500', bg: 'bg-red-50/30' }
];

export default function SalesPipeline() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '', company: '', email: '', phone: '', estimatedValue: '', source: 'Web'
  });
  const [draggedLead, setDraggedLead] = useState(null);

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    try {
      const res = await apiFetch('/api/crm/leads');
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setLeads([]); }
    finally { setLoading(false); }
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/crm/leads', {
        method: 'POST',
        body: JSON.stringify({ ...newLead, estimatedValue: parseFloat(newLead.estimatedValue) || 0 })
      });
      if (res.ok) { setShowAddModal(false); setNewLead({ name: '', company: '', email: '', phone: '', estimatedValue: '', source: 'Web' }); fetchLeads(); }
    } catch (err) { alert("Error de red"); }
  };

  const updateLeadStage = async (leadId, newStage) => {
    const originalLeads = [...leads];
    setLeads(leads.map(l => l.id === leadId ? { ...l, stage: newStage } : l));
    try {
      const res = await apiFetch('/api/crm/leads', {
        method: 'PUT',
        body: JSON.stringify({ id: leadId, stage: newStage })
      });
      if (!res.ok) throw new Error();
    } catch (err) { setLeads(originalLeads); alert("Error al mover"); }
  };

  const handleDeleteLead = async (id, name) => {
    if (!window.confirm(`¿Eliminar "${name}"?`)) return;
    try {
      const res = await apiFetch('/api/crm/leads', {
        method: 'DELETE',
        body: JSON.stringify({ id })
      });
      if (res.ok) fetchLeads();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4"><Activity className="h-10 w-10 text-primary animate-pulse" /><p className="font-black text-gray-400 text-[10px] uppercase">Cargando Pipeline...</p></div>;

  return (
    <div className="max-w-full mx-auto space-y-6 animate-in fade-in duration-700 pb-20 overflow-hidden">
      {/* Header Compacto en Mobile */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Ventas</h2>
          <p className="text-gray-500 font-bold text-[10px] mt-1 uppercase tracking-widest flex items-center gap-2"><Target className="h-3 w-3 text-primary" /> CRM OleaControls</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="w-full sm:w-auto bg-gray-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-xl flex items-center justify-center gap-3">
          <Plus className="h-4 w-4" /> Nuevo Prospecto
        </button>
      </div>

      {/* Kanban Board con Scroll Táctil */}
      <div className="flex gap-4 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide px-2">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter(l => l.stage === stage.id);
          const stageValue = stageLeads.reduce((acc, curr) => acc + (curr.estimatedValue || 0), 0);

          return (
            <div key={stage.id} className={cn("flex-shrink-0 w-[85vw] sm:w-80 snap-center space-y-4 rounded-[2rem] p-4 transition-colors", stage.bg)} onDragOver={(e) => e.preventDefault()} onDrop={() => draggedLead && updateLeadStage(draggedLead.id, stage.id)}>
              <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", stage.color)} />
                  <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{stage.label}</span>
                </div>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg text-[9px] font-black">{stageLeads.length}</span>
              </div>

              <div className="px-2 text-[9px] font-black text-gray-400 uppercase flex justify-between items-center">
                <span>Valor Est.</span>
                <span className="text-gray-900 font-bold">${stageValue.toLocaleString()}</span>
              </div>

              <div className="space-y-3 min-h-[100px]">
                <AnimatePresence>
                  {stageLeads.map((lead) => (
                    <motion.div key={lead.id} layoutId={lead.id} draggable onDragStart={() => setDraggedLead(lead)} className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group relative">
                      <div className="space-y-3 pointer-events-none">
                        <div className="flex justify-between items-start">
                          <p className="text-xs font-black text-gray-900 leading-tight">{lead.name}</p>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteLead(lead.id, lead.name); }} className="p-1.5 rounded-lg bg-red-50 text-red-500 pointer-events-auto"><Trash2 className="h-3 w-3" /></button>
                        </div>
                        <p className="text-[9px] font-bold text-gray-400 flex items-center gap-1"><Building2 className="h-3 w-3" /> {lead.company || 'Sin Empresa'}</p>
                        <div className="flex items-center gap-1 text-gray-900 pt-2 border-t border-gray-50">
                           <DollarSign className="h-3 w-3 text-emerald-500" />
                           <span className="text-[11px] font-black">{lead.estimatedValue.toLocaleString()}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Responsivo Full-Screen en Mobile */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="bg-white rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleAddLead} className="p-8 sm:p-10 space-y-6 sm:space-y-8">
                <div className="flex justify-between items-center border-b pb-4 sm:pb-6">
                  <h3 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Nuevo Prospecto</h3>
                  <button type="button" onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-400" /></button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                  <input required className="w-full bg-gray-50 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-4 font-bold text-sm outline-none" placeholder="Nombre de Contacto" value={newLead.name} onChange={(e) => setNewLead({...newLead, name: e.target.value})} />
                  <input className="w-full bg-gray-50 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-4 font-bold text-sm outline-none" placeholder="Empresa" value={newLead.company} onChange={(e) => setNewLead({...newLead, company: e.target.value})} />
                  <input required type="email" className="w-full bg-gray-50 rounded-xl sm:rounded-2xl px-5 sm:px-6 py-4 font-bold text-sm outline-none" placeholder="Email" value={newLead.email} onChange={(e) => setNewLead({...newLead, email: e.target.value})} />
                  <div className="relative"><DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="number" className="w-full bg-gray-50 rounded-xl sm:rounded-2xl pl-12 pr-6 py-4 font-black text-sm outline-none" placeholder="Valor Estimado" value={newLead.estimatedValue} onChange={(e) => setNewLead({...newLead, estimatedValue: e.target.value})} /></div>
                </div>
                <button type="submit" className="w-full bg-gray-900 text-white py-5 sm:py-6 rounded-2xl sm:rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-primary transition-all mt-4">Confirmar Oportunidad</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
