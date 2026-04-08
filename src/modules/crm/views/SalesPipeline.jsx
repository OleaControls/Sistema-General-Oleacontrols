import React, { useState, useEffect } from 'react';
import {
  Plus, Mail, Phone, Building2,
  DollarSign, Target, X, Activity, Trash2, ArrowRight,
  MapPin, FileText, UserCheck, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';

const SOURCES = ['Web', 'Referido', 'LinkedIn', 'Facebook', 'Llamada en frío', 'Evento', 'Otro'];

export const DEFAULT_STAGES = [
  { id: 'QUALIFICATION',            label: 'Lead / Prospecto',          prob: 10,  color: 'bg-slate-400',   ring: 'ring-slate-200',   text: 'text-slate-600',  bg: 'bg-slate-50' },
  { id: 'NEEDS_ANALYSIS',           label: 'Acercamiento',              prob: 20,  color: 'bg-blue-400',    ring: 'ring-blue-200',    text: 'text-blue-600',   bg: 'bg-blue-50' },
  { id: 'VALUE_PROPOSITION',        label: 'Contacto decisor',          prob: 30,  color: 'bg-indigo-500',  ring: 'ring-indigo-200',  text: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'IDENTIFY_DECISION_MAKERS', label: 'Oportunidad detectada',     prob: 40,  color: 'bg-violet-500',  ring: 'ring-violet-200',  text: 'text-violet-600', bg: 'bg-violet-50' },
  { id: 'PROPOSAL_PRICE_QUOTE',     label: 'Levantamiento técnico',     prob: 50,  color: 'bg-amber-500',   ring: 'ring-amber-200',   text: 'text-amber-700',  bg: 'bg-amber-50' },
  { id: 'PROPOSAL_SENT',            label: 'Cotización enviada',        prob: 65,  color: 'bg-orange-500',  ring: 'ring-orange-200',  text: 'text-orange-700', bg: 'bg-orange-50' },
  { id: 'NEGOTIATION_1',            label: 'Negociación 1',             prob: 75,  color: 'bg-purple-500',  ring: 'ring-purple-200',  text: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'RECOTIZACION',             label: 'Recotización',              prob: 80,  color: 'bg-pink-500',    ring: 'ring-pink-200',    text: 'text-pink-600',   bg: 'bg-pink-50' },
  { id: 'NEGOTIATION_2',            label: 'Negociación 2',             prob: 90,  color: 'bg-rose-500',    ring: 'ring-rose-200',    text: 'text-rose-600',   bg: 'bg-rose-50' },
  { id: 'CLOSED_WON_PENDING',       label: 'En espera de autorización', prob: 95,  color: 'bg-yellow-500',  ring: 'ring-yellow-200',  text: 'text-yellow-700', bg: 'bg-yellow-50' },
  { id: 'CLOSED_WON',              label: 'Ganado',                    prob: 100, color: 'bg-emerald-500', ring: 'ring-emerald-200', text: 'text-emerald-700',bg: 'bg-emerald-50' },
  { id: 'CLOSED_LOST',             label: 'Perdido',                   prob: 0,   color: 'bg-red-500',     ring: 'ring-red-200',     text: 'text-red-600',    bg: 'bg-red-50' },
];

const emptyLead = () => ({
  name: '', company: '', email: '', phone: '',
  rfc: '', address: '', estimatedValue: '', source: 'Web'
});

export default function SalesPipeline() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLead, setNewLead] = useState(emptyLead());
  const [convertingId, setConvertingId] = useState(null); // id del lead en proceso
  const [convertedIds, setConvertedIds] = useState(new Set()); // leads ya convertidos esta sesión

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
        body: JSON.stringify({
          ...newLead,
          estimatedValue: parseFloat(newLead.estimatedValue) || 0
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewLead(emptyLead());
        fetchLeads();
      }
    } catch { alert('Error de red'); }
  };

  const handleDeleteLead = async (id, name) => {
    if (!window.confirm(`¿Eliminar "${name}"?`)) return;
    try {
      const res = await apiFetch('/api/crm/leads', { method: 'DELETE', body: JSON.stringify({ id }) });
      if (res.ok) fetchLeads();
    } catch (err) { console.error(err); }
  };

  // Convertir lead a cliente (crea el cliente si no existe por email)
  const handleConvertToClient = async (lead) => {
    setConvertingId(lead.id);
    try {
      // Buscar si ya existe un cliente con ese email
      const searchRes = await apiFetch('/api/crm/clients');
      const allClients = await searchRes.json();
      const exists = (Array.isArray(allClients) ? allClients : []).find(
        c => c.email?.toLowerCase() === lead.email?.toLowerCase()
      );

      if (exists) {
        setConvertedIds(prev => new Set(prev).add(lead.id));
        return;
      }

      const res = await apiFetch('/api/crm/clients', {
        method: 'POST',
        body: JSON.stringify({
          companyName:  lead.company || lead.name,
          contactName:  lead.name,
          email:        lead.email,
          phone:        lead.phone  || '',
          rfc:          lead.rfc    || '',
          address:      lead.address || '',
        })
      });
      if (res.ok) {
        setConvertedIds(prev => new Set(prev).add(lead.id));
      }
    } catch (err) { console.error(err); }
    finally { setConvertingId(null); }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <Activity className="h-10 w-10 text-primary animate-pulse" />
      <p className="font-black text-gray-400 text-[10px] uppercase">Cargando Leads...</p>
    </div>
  );

  return (
    <div className="max-w-full space-y-6 animate-in fade-in duration-700 pb-20 px-2">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase italic">Prospectos</h2>
          <p className="text-gray-500 font-bold text-[10px] mt-1 uppercase tracking-widest flex items-center gap-2">
            <Target className="h-3 w-3 text-primary" /> CRM OleaControls — {leads.length} leads
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gray-900 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-xl flex items-center gap-3"
        >
          <Plus className="h-4 w-4" /> Nuevo Lead
        </button>
      </div>

      {/* Grid de tarjetas */}
      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Target className="h-12 w-12 text-gray-200" />
          <p className="font-black text-gray-300 text-[10px] uppercase tracking-widest">No hay leads aún</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all"
          >
            <Plus className="h-4 w-4 inline mr-2" /> Crear primer lead
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {leads.map((lead) => {
              const isConverted = convertedIds.has(lead.id);
              const isConverting = convertingId === lead.id;
              return (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group p-5 space-y-3"
                >
                  {/* Nombre + eliminar */}
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-black text-gray-900 text-sm leading-tight">{lead.name}</p>
                    <button
                      onClick={() => handleDeleteLead(lead.id, lead.name)}
                      className="p-1.5 rounded-xl bg-red-50 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Datos */}
                  <div className="space-y-1.5">
                    {lead.company && (
                      <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" /> {lead.company}
                      </p>
                    )}
                    {lead.email && (
                      <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5 truncate">
                        <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" /> {lead.email}
                      </p>
                    )}
                    {lead.phone && (
                      <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" /> {lead.phone}
                      </p>
                    )}
                    {lead.rfc && (
                      <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-gray-400 flex-shrink-0" /> {lead.rfc}
                      </p>
                    )}
                    {lead.address && (
                      <p className="text-[10px] font-bold text-gray-500 flex items-center gap-1.5 line-clamp-1">
                        <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" /> {lead.address}
                      </p>
                    )}
                  </div>

                  {/* Valor estimado */}
                  <div className="flex items-center gap-1 pt-1">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-sm font-black text-gray-900">
                      {(lead.estimatedValue || 0).toLocaleString('es-MX')}
                    </span>
                  </div>

                  {/* Botones */}
                  <div className="flex gap-2 pt-2 border-t border-gray-50">
                    {/* Convertir a Cliente */}
                    <button
                      onClick={() => handleConvertToClient(lead)}
                      disabled={isConverting || isConverted}
                      title="Convertir a cliente"
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all disabled:cursor-not-allowed ${
                        isConverted
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-gray-100 text-gray-600 hover:bg-emerald-600 hover:text-white'
                      }`}
                    >
                      {isConverted
                        ? <><CheckCircle2 className="h-3 w-3" /> Cliente</>
                        : isConverting
                          ? <><Activity className="h-3 w-3 animate-spin" /> ...</>
                          : <><UserCheck className="h-3 w-3" /> Cliente</>
                      }
                    </button>

                    {/* Enviar a Pipeline */}
                    <button
                      onClick={() => navigate('/crm/deals', { state: { fromLead: lead } })}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white font-black text-[9px] uppercase tracking-wider hover:bg-blue-700 transition-all"
                    >
                      <ArrowRight className="h-3 w-3" /> Pipeline
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modal Nuevo Lead */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <form onSubmit={handleAddLead} className="p-8 sm:p-10 space-y-5">
                <div className="flex justify-between items-center border-b pb-5">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Nuevo Lead</h3>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Agregar prospecto</p>
                  </div>
                  <button type="button" onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                    <X className="h-6 w-6 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Nombre + Empresa */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Nombre *</label>
                      <input required className="w-full bg-gray-50 rounded-xl px-4 py-3.5 font-bold text-sm outline-none" placeholder="Nombre del contacto" value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Empresa</label>
                      <input className="w-full bg-gray-50 rounded-xl px-4 py-3.5 font-bold text-sm outline-none" placeholder="Razón social" value={newLead.company} onChange={e => setNewLead({ ...newLead, company: e.target.value })} />
                    </div>
                  </div>

                  {/* Email + Teléfono */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Email *</label>
                      <input required type="email" className="w-full bg-gray-50 rounded-xl px-4 py-3.5 font-bold text-sm outline-none" placeholder="correo@empresa.com" value={newLead.email} onChange={e => setNewLead({ ...newLead, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Teléfono</label>
                      <input className="w-full bg-gray-50 rounded-xl px-4 py-3.5 font-bold text-sm outline-none" placeholder="+52 55 0000 0000" value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} />
                    </div>
                  </div>

                  {/* RFC */}
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">
                      RFC <span className="normal-case font-bold text-gray-400">(para facturación)</span>
                    </label>
                    <input
                      className="w-full bg-gray-50 rounded-xl px-4 py-3.5 font-bold text-sm outline-none uppercase"
                      placeholder="XXXX000000XXX"
                      maxLength={13}
                      value={newLead.rfc}
                      onChange={e => setNewLead({ ...newLead, rfc: e.target.value.toUpperCase() })}
                    />
                  </div>

                  {/* Dirección */}
                  <div>
                    <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">
                      Dirección <span className="normal-case font-bold text-gray-400">(para cotización)</span>
                    </label>
                    <input
                      className="w-full bg-gray-50 rounded-xl px-4 py-3.5 font-bold text-sm outline-none"
                      placeholder="Calle, Colonia, Ciudad, CP"
                      value={newLead.address}
                      onChange={e => setNewLead({ ...newLead, address: e.target.value })}
                    />
                  </div>

                  {/* Valor + Fuente */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Valor Estimado</label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input type="number" className="w-full bg-gray-50 rounded-xl pl-10 pr-4 py-3.5 font-black text-sm outline-none" placeholder="0" value={newLead.estimatedValue} onChange={e => setNewLead({ ...newLead, estimatedValue: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Fuente</label>
                      <select className="w-full bg-gray-50 rounded-xl px-4 py-3.5 font-bold text-xs outline-none cursor-pointer" value={newLead.source} onChange={e => setNewLead({ ...newLead, source: e.target.value })}>
                        {SOURCES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <button type="submit" className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-primary transition-all">
                  <Plus className="h-4 w-4 inline mr-2" /> Crear Lead
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
