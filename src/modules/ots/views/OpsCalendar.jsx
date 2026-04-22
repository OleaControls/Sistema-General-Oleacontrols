import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
  Info,
  X,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Wrench,
  Stethoscope,
  MoreVertical,
  ShieldCheck,
  Camera,
  FileText,
  Loader2,
  ClipboardList,
  ArrowRight,
  Building2,
  Search,
  Check,
  DollarSign,
  Pencil,
  Trash2,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { otService } from '@/api/otService';
import { hrService } from '@/api/hrService';
import { apiFetch } from '@/lib/api';
import { useAuth, ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

const EVENT_TYPES = {
  OT:          { label: 'Orden de Trabajo', icon: Briefcase,   pill: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', dot: '#3b82f6' } },
  VISIT:       { label: 'Visita Técnica',   icon: MapPin,      pill: { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', dot: '#f59e0b' } },
  MAINTENANCE: { label: 'Mantenimiento',    icon: Wrench,      pill: { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46', dot: '#10b981' } },
  OTHER:       { label: 'Otro',             icon: Info,        pill: { bg: '#ede9fe', border: '#c4b5fd', text: '#4c1d95', dot: '#7c3aed' } },
};

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapEvents({ onLocationSelect }) {
  useMapEvents({ click(e) { onLocationSelect(e.latlng); } });
  return null;
}
function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, 15);
  return null;
}

const BLANK_OT = {
  title: '', storeNumber: '', storeName: '', client: '', address: '', secondaryAddress: '',
  otAddress: '', otReference: '', lat: 19.4326, lng: -99.1332, clientEmail: '', clientPhone: '',
  contactName: '', contactEmail: '', contactPhone: '', leadTechId: '', leadTechName: '',
  assistantTechs: [], workDescription: '', arrivalTime: '09:00',
  scheduledDate: new Date().toISOString().split('T')[0],
  priority: 'MEDIUM', assignedFunds: 0,
};

export default function OpsCalendar() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [ots, setOts] = useState([]);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [availableTechs, setAvailableTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [convertedOT, setConvertedOT] = useState(null);

  // ── Edit / Delete states ──────────────────────────────────────────────────
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // ── Convert Modal states ──────────────────────────────────────────────────
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertStep, setConvertStep] = useState(1);
  const [convertOT, setConvertOT] = useState(BLANK_OT);
  const [convertSaving, setConvertSaving] = useState(false);
  const [convertSearchLoading, setConvertSearchLoading] = useState(false);
  const [convertMapCenter, setConvertMapCenter] = useState([19.4326, -99.1332]);
  const [convertOtClientSearch, setConvertOtClientSearch] = useState('');
  const [showConvertDropdown, setShowConvertDropdown] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: '', description: '', type: 'VISIT', startDate: '', startTime: '09:00',
    color: '#3b82f6', otClientId: ''
  });

  useEffect(() => { fetchData(); }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [otsData, calendarRes, clientsRes, templatesData, allEmployees] = await Promise.all([
        otService.getOTs(),
        apiFetch('/api/calendar'),
        apiFetch('/api/ot-clients'),
        otService.getTemplates(),
        hrService.getEmployees(),
      ]);
      const eventsData = calendarRes.ok ? await calendarRes.json() : [];
      const clientsData = clientsRes.ok ? await clientsRes.json() : [];
      setOts(Array.isArray(otsData) ? otsData : []);
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setClients(Array.isArray(clientsData) ? clientsData : []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      const techs = (Array.isArray(allEmployees) ? allEmployees : [])
        .filter(emp => emp.roles?.includes(ROLES.TECH) || emp.roles?.includes('Tech'));
      setAvailableTechs(techs);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      setOts([]); setEvents([]); setClients([]); setTemplates([]); setAvailableTechs([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Calendar helpers ──────────────────────────────────────────────────────
  const getDaysInMonth = (date) => {
    const year = date.getFullYear(), month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push({ day: null, date: null });
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, date: new Date(year, month, i) });
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    const dayOts = ots.filter(ot => ot.scheduledDate?.startsWith(dateStr)).map(ot => ({
      ...ot, type: 'OT', id: `ot-${ot.id}`, title: ot.title, time: ot.arrivalTime || '—'
    }));
    const dayEvents = events.filter(e => e.startDate.startsWith(dateStr)).map(e => ({
      ...e, id: `ev-${e.id}`,
      time: new Date(e.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    }));
    return [...dayOts, ...dayEvents].sort((a, b) => a.time.localeCompare(b.time));
  };

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  const handleToday = () => setCurrentDate(new Date());

  const copyPortalLink = (client) => {
    const url = `${window.location.origin}/portal?token=${client.portalToken}`;
    navigator.clipboard.writeText(url);
    alert(`Enlace de portal para ${client.name} copiado.`);
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedEvent || selectedEvent.id.startsWith('ot-')) return;
    setUploading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await apiFetch('/api/calendar', {
        method: 'PUT',
        body: JSON.stringify({
          id: selectedEvent.id.replace('ev-', ''),
          evidence: { name: file.name, type: file.type.includes('pdf') ? 'PDF' : 'IMAGE', base64 }
        })
      });
      const updatedEvent = await res.json();
      setSelectedEvent({ ...updatedEvent, id: `ev-${updatedEvent.id}`, time: selectedEvent.time });
      setEvents(prev => prev.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev));
    } catch (err) {
      alert('Error al subir: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Save new calendar event ───────────────────────────────────────────────
  const handleSaveEvent = async (e) => {
    e.preventDefault();
    try {
      const start = new Date(`${newEvent.startDate}T${newEvent.startTime}`);
      await apiFetch('/api/calendar', {
        method: 'POST',
        body: JSON.stringify({ ...newEvent, startDate: start.toISOString(), color: EVENT_TYPES[newEvent.type].color })
      });
      setIsModalOpen(false);
      setNewEvent({ title: '', description: '', type: 'VISIT', startDate: '', startTime: '09:00', color: '#3b82f6', otClientId: '' });
      fetchData();
    } catch (error) {
      alert('Error al guardar: ' + error.message);
    }
  };

  // ── Edit calendar event ───────────────────────────────────────────────────
  const openEditModal = () => {
    if (!selectedEvent || selectedEvent.id?.startsWith('ot-')) return;
    const raw = events.find(e => e.id === selectedEvent.id.replace('ev-', ''));
    if (!raw) return;
    const d = new Date(raw.startDate);
    setEditEvent({
      id: raw.id,
      title: raw.title || '',
      description: raw.description || '',
      type: raw.type || 'VISIT',
      startDate: d.toISOString().split('T')[0],
      startTime: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      otClientId: raw.otClientId || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEditEvent = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const start = new Date(`${editEvent.startDate}T${editEvent.startTime}`);
      await apiFetch('/api/calendar', {
        method: 'PUT',
        body: JSON.stringify({
          id: editEvent.id,
          title: editEvent.title,
          description: editEvent.description,
          type: editEvent.type,
          startDate: start.toISOString(),
          otClientId: editEvent.otClientId || null,
        })
      });
      setIsEditModalOpen(false);
      setSelectedEvent(null);
      fetchData();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || selectedEvent.id?.startsWith('ot-')) return;
    setDeleting(true);
    try {
      const id = selectedEvent.id.replace('ev-', '');
      await apiFetch(`/api/calendar?id=${id}`, { method: 'DELETE' });
      setIsDeleteModalOpen(false);
      setSelectedEvent(null);
      fetchData();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Open Convert Modal pre-filled ─────────────────────────────────────────
  const openConvertModal = () => {
    if (!selectedEvent || selectedEvent.id.startsWith('ot-')) return;
    const client = clients.find(c => c.id === selectedEvent.otClientId);
    const prefilled = {
      ...BLANK_OT,
      title: selectedEvent.title,
      workDescription: selectedEvent.description || '',
      client: client?.name || '',
      storeNumber: client?.storeNumber || '',
      storeName: client?.storeName || '',
      address: client?.address || '',
      otReference: client?.otReference || '',
      contactName: client?.contact || '',
      contactEmail: client?.email || '',
      contactPhone: client?.phone || '',
      lat: client?.lat || 19.4326,
      lng: client?.lng || -99.1332,
      scheduledDate: selectedEvent.startDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      arrivalTime: selectedEvent.time || '09:00',
    };
    setConvertOT(prefilled);
    setConvertMapCenter([prefilled.lat, prefilled.lng]);
    setConvertOtClientSearch(client ? (client.storeName ? `${client.name} — ${client.storeName}` : client.name) : '');
    setConvertStep(1);
    setConvertedOT(null);
    setIsConvertModalOpen(true);
  };

  // ── Convert modal helpers ─────────────────────────────────────────────────
  const filteredConvertSuggestions = convertOtClientSearch.length > 0
    ? clients.filter(c => {
        const q = convertOtClientSearch.toLowerCase();
        return [c.name, c.storeName, c.storeNumber, c.contact].some(v => v?.toLowerCase().includes(q));
      }).slice(0, 8)
    : clients.slice(0, 8);

  const handleConvertOTClientSelect = (c) => {
    setConvertOT(prev => ({
      ...prev,
      client: c.name,
      storeNumber: c.storeNumber || prev.storeNumber,
      storeName: c.storeName || prev.storeName,
      address: c.address || prev.address,
      otReference: c.otReference || prev.otReference,
      clientEmail: c.email || prev.clientEmail,
      clientPhone: c.phone || prev.clientPhone,
      contactName: c.contact || prev.contactName,
      contactPhone: c.phone || prev.contactPhone,
      lat: c.lat || prev.lat,
      lng: c.lng || prev.lng,
    }));
    if (c.lat && c.lng) setConvertMapCenter([c.lat, c.lng]);
    setConvertOtClientSearch(c.storeName ? `${c.name} — ${c.storeName}` : c.name);
    setShowConvertDropdown(false);
  };

  const handleConvertTemplateSelect = (templateId) => {
    if (!templateId) return;
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      setConvertOT(prev => ({
        ...prev,
        title: tmpl.title || prev.title,
        workDescription: tmpl.workDescription || tmpl.description || prev.workDescription,
        priority: tmpl.priority || prev.priority,
        arrivalTime: tmpl.arrivalTime || prev.arrivalTime,
      }));
    }
  };

  const handleConvertLocationSearch = async () => {
    if (!convertOT.address) return;
    setConvertSearchLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(convertOT.address)}&countrycodes=mx&limit=1`);
      const data = await res.json();
      if (data?.length > 0) {
        const { lat, lon, display_name } = data[0];
        setConvertOT(prev => ({ ...prev, lat: parseFloat(lat), lng: parseFloat(lon), address: display_name }));
        setConvertMapCenter([parseFloat(lat), parseFloat(lon)]);
      }
    } catch (err) { console.error(err); }
    finally { setConvertSearchLoading(false); }
  };

  const toggleConvertAssistantTech = (tech) => {
    setConvertOT(prev => {
      const exists = prev.assistantTechs?.find(t => t.id === tech.id);
      if (exists) return { ...prev, assistantTechs: prev.assistantTechs.filter(t => t.id !== tech.id) };
      return { ...prev, assistantTechs: [...(prev.assistantTechs || []), tech] };
    });
  };

  const handleSubmitConvert = async (e) => {
    e.preventDefault();
    setConvertSaving(true);
    try {
      const res = await apiFetch('/api/ots', {
        method: 'POST',
        body: JSON.stringify({ ...convertOT, supervisorId: user.id })
      });
      if (!res.ok) throw new Error('Error al crear OT');
      const ot = await res.json();
      setConvertedOT({ otNumber: ot.otNumber });
      setIsConvertModalOpen(false);
    } catch (err) {
      alert('Error al crear OT: ' + err.message);
    } finally {
      setConvertSaving(false);
    }
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-[0.2em] mb-1">Operaciones · Agenda</p>
          <h1 className="text-3xl font-black text-gray-950 capitalize">{monthName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPortalModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100"
          >
            <ShieldCheck className="h-4 w-4" /> Portales Clientes
          </button>
          <div className="flex items-center bg-gray-50 rounded-2xl p-1 border border-gray-100">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-600"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={handleToday} className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors">Hoy</button>
            <button onClick={handleNextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-600"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <button
            onClick={() => {
              setSelectedDate(new Date());
              setNewEvent({ ...newEvent, startDate: new Date().toISOString().split('T')[0] });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 bg-gray-950 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
          >
            <Plus className="h-4 w-4" /> Nuevo Evento
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
            <div key={d} className="py-4 text-center">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{d}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-[140px]">
          {days.map((d, i) => {
            const dayEvents = d.date ? getEventsForDate(d.date) : [];
            const isToday = d.date && d.date.toDateString() === new Date().toDateString();
            return (
              <div
                key={i}
                className={cn('border-r border-b border-gray-50 p-3 transition-colors group relative', !d.day && 'bg-gray-50/30', d.day && 'hover:bg-gray-50/50 cursor-pointer')}
                onClick={() => { if (d.date) { setSelectedDate(d.date); setNewEvent({ ...newEvent, startDate: d.date.toISOString().split('T')[0] }); setIsModalOpen(true); } }}
              >
                {d.day && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn('h-7 w-7 flex items-center justify-center rounded-full text-xs font-black transition-all', isToday ? 'bg-gray-950 text-white shadow-md scale-110' : 'text-gray-400 group-hover:text-gray-900')}>
                        {d.day}
                      </span>
                    </div>
                    <div className="space-y-1 overflow-y-auto pr-1 custom-scrollbar flex-1">
                      {dayEvents.map(ev => {
                        const meta = EVENT_TYPES[ev.type] || EVENT_TYPES.OTHER;
                        const p = meta.pill;
                        const EvIcon = meta.icon;
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); setConvertedOT(null); }}
                            style={{ background: p.bg, border: `1px solid ${p.border}`, borderRadius: 8, padding: '5px 7px', cursor: 'pointer', transition: 'all .12s', display: 'flex', flexDirection: 'column', gap: 2 }}
                            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(.94)'; e.currentTarget.style.transform = 'translateX(1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
                              <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, color: p.text, opacity: .8 }}>{ev.time}</span>
                              {ev.otClientId && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); const c = clients.find(c => c.id === ev.otClientId); if (c) copyPortalLink(c); }}
                                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#10b981', display: 'flex' }}
                                >
                                  <ShieldCheck style={{ width: 10, height: 10 }} />
                                </button>
                              )}
                            </div>
                            <p style={{ fontSize: 10, fontWeight: 700, color: p.text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{ev.title}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ MODAL DETALLE EVENTO ══ */}
      {selectedEvent && !isModalOpen && !isPortalModalOpen && !isConvertModalOpen && (() => {
        const evMeta = EVENT_TYPES[selectedEvent.type] || EVENT_TYPES.OTHER;
        const EvIcon = evMeta.icon;
        const p = evMeta.pill;
        const isCalendarEvent = !selectedEvent.id?.startsWith('ot-');
        // Accent: more saturated version for the sidebar stripe
        const accentBg = { OT: '#1e40af', VISIT: '#b45309', MAINTENANCE: '#065f46', OTHER: '#4c1d95' };
        const ac = { bg: accentBg[selectedEvent.type] || accentBg.OTHER, light: p.bg, border: p.border, text: p.text };

        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }}
            onClick={() => { setSelectedEvent(null); setConvertedOT(null); }}
          >
            <div
              className="bg-white w-full overflow-hidden flex"
              style={{ maxWidth: 780, maxHeight: '90vh', borderRadius: 24, boxShadow: '0 32px 80px rgba(0,0,0,.22)' }}
              onClick={e => e.stopPropagation()}
            >
              {/* ── Franja lateral de color ── */}
              <div style={{ width: 6, flexShrink: 0, background: ac.bg, borderRadius: '24px 0 0 24px' }} />

              {/* ── Contenido ── */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '28px 28px 22px', borderBottom: '1px solid #f3f4f6', background: '#fff', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flex: 1, minWidth: 0 }}>
                      {/* Ícono tipo */}
                      <div style={{ width: 52, height: 52, borderRadius: 16, background: ac.light, border: `1.5px solid ${ac.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <EvIcon size={22} style={{ color: ac.bg }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: ac.text, background: ac.light, border: `1px solid ${ac.border}`, borderRadius: 6, padding: '2px 8px' }}>
                            {evMeta.label}
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} /> {selectedEvent.time} hrs
                          </span>
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1.2, margin: 0 }}>{selectedEvent.title}</h2>
                      </div>
                    </div>
                    {/* Botón X */}
                    <button
                      type="button"
                      onClick={() => { setSelectedEvent(null); setConvertedOT(null); }}
                      style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#6b7280', transition: 'all .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* Body scrollable */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

                  {/* Descripción */}
                  {selectedEvent.description ? (
                    <div style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 14, padding: '16px 18px' }}>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 8 }}>Descripción</p>
                      <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, margin: 0 }}>{selectedEvent.description}</p>
                    </div>
                  ) : (
                    <div style={{ background: '#f9fafb', border: '1px dashed #e5e7eb', borderRadius: 14, padding: '16px 18px', textAlign: 'center' }}>
                      <p style={{ fontSize: 12, color: '#d1d5db', fontWeight: 600 }}>Sin descripción registrada</p>
                    </div>
                  )}

                  {/* Convertir a OT */}
                  {isCalendarEvent && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 }}>Orden de Trabajo</p>
                      {convertedOT ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '14px 18px' }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <CheckCircle2 size={20} style={{ color: '#fff' }} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#15803d', margin: 0, marginBottom: 2 }}>OT creada exitosamente</p>
                            <p style={{ fontSize: 11, color: '#16a34a', fontFamily: 'monospace', margin: 0 }}>{convertedOT.otNumber}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setSelectedEvent(null); setConvertedOT(null); }}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 10px', borderRadius: 8 }}
                          >
                            Ver en OTs <ArrowRight size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={openConvertModal}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 20px', background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 14, fontSize: 12, fontWeight: 700, color: '#1d4ed8', cursor: 'pointer', transition: 'all .15s', letterSpacing: '.04em' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                        >
                          <ClipboardList size={16} /> Convertir Evento a Orden de Trabajo
                        </button>
                      )}
                    </div>
                  )}

                  {/* Evidencias */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9ca3af', margin: 0 }}>Evidencias · Reportes</p>
                      {isCalendarEvent && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', background: uploading ? '#f3f4f6' : '#111827', color: uploading ? '#9ca3af' : '#fff', transition: 'all .15s', pointerEvents: uploading ? 'none' : 'auto' }}>
                          {uploading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={13} />}
                          {uploading ? 'Subiendo...' : 'Subir archivo'}
                          <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileUpload} disabled={uploading} />
                        </label>
                      )}
                    </div>

                    {uploading && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
                        <Loader2 size={16} style={{ color: '#16a34a', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#15803d', margin: 0 }}>Subiendo archivo…</p>
                          <p style={{ fontSize: 11, color: '#16a34a', margin: 0 }}>Por favor espera</p>
                        </div>
                      </div>
                    )}

                    {selectedEvent.evidences?.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                        {selectedEvent.evidences.map((evi, idx) => (
                          <a key={idx} href={evi.url} target="_blank" rel="noreferrer"
                            style={{ borderRadius: 14, overflow: 'hidden', aspectRatio: '1', border: '1px solid #e5e7eb', display: 'block', position: 'relative', transition: 'transform .15s, box-shadow .15s' }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                          >
                            {evi.type === 'IMAGE'
                              ? <img src={evi.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                              : <div style={{ minHeight: 90, background: '#fef2f2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, height: '100%' }}>
                                  <FileText size={24} style={{ color: '#f87171' }} />
                                  <span style={{ fontSize: 9, color: '#fca5a5', fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700 }}>PDF</span>
                                </div>
                            }
                          </a>
                        ))}
                      </div>
                    ) : !uploading && (
                      <div style={{ textAlign: 'center', padding: '28px 20px', background: '#f9fafb', border: '1px dashed #e5e7eb', borderRadius: 14 }}>
                        <Camera size={28} style={{ color: '#e5e7eb', margin: '0 auto 8px' }} />
                        <p style={{ fontSize: 11, color: '#d1d5db', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', margin: 0 }}>Sin evidencias cargadas</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div style={{ flexShrink: 0, padding: '14px 28px', borderTop: '1px solid #f3f4f6', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  {/* Acciones izquierda — solo para eventos de calendario, no OTs */}
                  {isCalendarEvent ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={openEditModal}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 700, color: '#374151', cursor: 'pointer', transition: 'all .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                      >
                        <Pencil size={13} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDeleteModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid #fecaca', background: '#fff5f5', fontSize: 12, fontWeight: 700, color: '#dc2626', cursor: 'pointer', transition: 'all .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; }}
                      >
                        <Trash2 size={13} /> Eliminar
                      </button>
                    </div>
                  ) : <div />}

                  <button
                    type="button"
                    onClick={() => { setSelectedEvent(null); setConvertedOT(null); }}
                    style={{ padding: '8px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 700, color: '#6b7280', cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ MODAL EDITAR EVENTO ══ */}
      {isEditModalOpen && editEvent && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }} onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-white w-full overflow-hidden" style={{ maxWidth: 520, borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,.22)' }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={18} style={{ color: '#374151' }} />
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9ca3af', margin: 0 }}>Agenda operativa</p>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>Editar Evento</h3>
                </div>
              </div>
              <button type="button" onClick={() => setIsEditModalOpen(false)}
                style={{ width: 34, height: 34, borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6b7280' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={e => e.currentTarget.style.background = '#f9fafb'}
              >
                <X size={15} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditEvent} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Título */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6b7280', display: 'block', marginBottom: 6 }}>Título *</label>
                <input required type="text"
                  value={editEvent.title}
                  onChange={e => setEditEvent({ ...editEvent, title: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, fontWeight: 600, color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#f9fafb'; }}
                />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6b7280', display: 'block', marginBottom: 6 }}>Descripción</label>
                <textarea rows={3}
                  value={editEvent.description}
                  onChange={e => setEditEvent({ ...editEvent, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, color: '#374151', outline: 'none', resize: 'none', lineHeight: 1.6, boxSizing: 'border-box', background: '#f9fafb', fontFamily: 'inherit' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.background = '#fff'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#f9fafb'; }}
                />
              </div>

              {/* Tipo */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6b7280', display: 'block', marginBottom: 8 }}>Tipo</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {Object.entries(EVENT_TYPES).filter(([k]) => k !== 'OT').map(([key, meta]) => {
                    const isActive = editEvent.type === key;
                    const Icon = meta.icon;
                    return (
                      <button key={key} type="button" onClick={() => setEditEvent({ ...editEvent, type: key })}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 8px', borderRadius: 10, border: `2px solid ${isActive ? meta.pill.dot : '#e5e7eb'}`, background: isActive ? meta.pill.bg : '#fff', cursor: 'pointer', transition: 'all .15s' }}
                      >
                        <Icon size={16} style={{ color: isActive ? meta.pill.text : '#9ca3af' }} />
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: isActive ? meta.pill.text : '#9ca3af' }}>{meta.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cliente */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6b7280', display: 'block', marginBottom: 6 }}>Cliente vinculado</label>
                <select
                  value={editEvent.otClientId}
                  onChange={e => setEditEvent({ ...editEvent, otClientId: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, color: '#374151', outline: 'none', background: '#f9fafb', boxSizing: 'border-box', fontFamily: 'inherit' }}
                >
                  <option value="">Sin cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.storeName ? ` (${c.storeName})` : ''}</option>)}
                </select>
              </div>

              {/* Fecha + Hora */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6b7280', display: 'block', marginBottom: 6 }}>Fecha *</label>
                  <input required type="date"
                    value={editEvent.startDate}
                    onChange={e => setEditEvent({ ...editEvent, startDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, fontWeight: 600, color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#6b7280', display: 'block', marginBottom: 6 }}>Hora *</label>
                  <input required type="time"
                    value={editEvent.startTime}
                    onChange={e => setEditEvent({ ...editEvent, startTime: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, fontWeight: 600, color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#f9fafb' }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button type="button" onClick={() => setIsEditModalOpen(false)}
                  style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 700, color: '#6b7280', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={editSaving}
                  style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: '#111827', fontSize: 13, fontWeight: 700, color: '#fff', cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? .6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {editSaving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL CONFIRMAR BORRADO ══ */}
      {isDeleteModalOpen && selectedEvent && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(8px)' }} onClick={() => !deleting && setIsDeleteModalOpen(false)}>
          <div className="bg-white w-full" style={{ maxWidth: 400, borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,.22)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '32px 28px 24px', textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: '#fef2f2', border: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Trash2 size={26} style={{ color: '#dc2626' }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 8px' }}>¿Eliminar evento?</h3>
              <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, margin: '0 0 6px' }}>
                Se eliminará <strong style={{ color: '#374151' }}>{selectedEvent.title}</strong> de forma permanente.
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Esta acción no se puede deshacer.</p>
            </div>
            <div style={{ padding: '0 28px 28px', display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setIsDeleteModalOpen(false)} disabled={deleting}
                style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 13, fontWeight: 700, color: '#6b7280', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button type="button" onClick={handleDeleteEvent} disabled={deleting}
                style={{ flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: '#dc2626', fontSize: 13, fontWeight: 700, color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {deleting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Eliminando...</> : <><Trash2 size={14} /> Eliminar evento</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL PORTALES ══ */}
      {isPortalModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-emerald-600 p-8 text-white relative">
              <button onClick={() => setIsPortalModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors"><X className="h-5 w-5" /></button>
              <div className="flex items-center gap-4 mb-2">
                <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center"><ShieldCheck className="h-6 w-6 text-white" /></div>
                <div>
                  <p className="text-[10px] font-mono font-bold text-emerald-200 uppercase tracking-[0.2em]">Configuración Segura</p>
                  <h2 className="text-2xl font-black uppercase tracking-tight">Portales de Clientes</h2>
                </div>
              </div>
            </div>
            <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid gap-3">
                {clients.map(client => (
                  <div key={client.id} className="flex items-center justify-between p-5 bg-gray-50 rounded-[1.8rem] border border-gray-100 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-emerald-100 rounded-2xl flex items-center justify-center font-black text-emerald-700 text-xs">{client.name.substring(0, 2).toUpperCase()}</div>
                      <div>
                        <p className="font-black text-gray-900 text-sm">{client.name}</p>
                        <p className="text-[10px] font-bold text-gray-400">{client.storeName || 'Sucursal Principal'}</p>
                      </div>
                    </div>
                    <button onClick={() => copyPortalLink(client)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors flex items-center gap-2">Copiar Enlace</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <p className="text-[9px] font-bold text-gray-400 max-w-[60%] leading-relaxed uppercase tracking-widest">Los enlaces son únicos. El cliente podrá ver sus actividades y las evidencias que subas.</p>
              <button onClick={() => setIsPortalModalOpen(false)} className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL NUEVO EVENTO ══ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-gray-950 p-8 text-white relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-colors"><X className="h-5 w-5" /></button>
              <div className="flex items-center gap-4 mb-2">
                <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center"><CalendarIcon className="h-6 w-6 text-emerald-400" /></div>
                <div>
                  <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-[0.2em]">Agenda Operativa</p>
                  <h2 className="text-2xl font-black uppercase tracking-tight">Agendar Actividad</h2>
                </div>
              </div>
            </div>
            <form onSubmit={handleSaveEvent} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">Título</label>
                  <input required type="text" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-gray-900 transition-all font-bold text-sm" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">Vincular a Cliente (Opcional)</label>
                  <select className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-gray-900 transition-all font-bold text-sm" value={newEvent.otClientId} onChange={e => setNewEvent({ ...newEvent, otClientId: e.target.value })}>
                    <option value="">No vincular</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.storeName ? `(${c.storeName})` : ''}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">Tipo</label>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(EVENT_TYPES).filter(([k]) => k !== 'OT').map(([key, meta]) => (
                      <button key={key} type="button" onClick={() => setNewEvent({ ...newEvent, type: key })} className={cn('flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all', newEvent.type === key ? 'bg-gray-950 border-gray-950 text-white' : 'bg-white border-gray-100 text-gray-400')}>
                        <meta.icon className="h-5 w-5" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{meta.label.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">Fecha</label>
                  <input required type="date" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-gray-900 transition-all font-bold text-sm" value={newEvent.startDate} onChange={e => setNewEvent({ ...newEvent, startDate: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-2 block">Hora</label>
                  <input required type="time" className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:border-gray-900 transition-all font-bold text-sm" value={newEvent.startTime} onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="w-full bg-gray-950 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em]">Guardar Actividad</button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL CONVERTIR A OT — 3 PASOS (igual que SupervisorOTs)
      ══════════════════════════════════════════════════════════════════════ */}
      {isConvertModalOpen && convertOT && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full flex overflow-hidden" style={{ maxWidth: 960, maxHeight: '92vh' }}>

            {/* ── Sidebar izquierdo ── */}
            <div className="w-64 shrink-0 bg-gray-950 flex-col overflow-hidden hidden md:flex">
              <div className="p-7 border-b border-white/5">
                <p className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-gray-600 mb-3">Olea Controls · Ops</p>
                <h2 className="text-lg font-black text-white leading-tight">Nueva<br />Orden de<br />Trabajo</h2>
              </div>

              {/* Stepper */}
              <div className="p-6 flex-1">
                <p className="text-[8px] font-mono font-bold uppercase tracking-[0.2em] text-gray-300 mb-5">Progreso</p>
                <div className="space-y-1">
                  {[
                    { n: 1, label: 'Identificación', sub: 'Cliente, sucursal, prioridad' },
                    { n: 2, label: 'Ubicación', sub: 'Dirección y contacto' },
                    { n: 3, label: 'Equipo', sub: 'Técnicos y programación' },
                  ].map(({ n, label, sub }) => (
                    <button key={n} type="button" onClick={() => setConvertStep(n)}
                      className="cursor-pointer w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors hover:bg-white/5"
                    >
                      <div className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-mono font-black',
                        convertStep > n ? 'bg-emerald-500 text-white' : convertStep === n ? 'bg-white text-gray-950' : 'bg-white/5 text-gray-600'
                      )}>
                        {convertStep > n ? <Check className="h-3.5 w-3.5" /> : n}
                      </div>
                      <div>
                        <p className={cn('text-[11px] font-bold leading-none', convertStep === n ? 'text-white' : convertStep > n ? 'text-emerald-400' : 'text-gray-500')}>{label}</p>
                        <p className="text-[9px] text-gray-400 mt-1 font-mono leading-tight">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-8">
                  <div className="flex justify-between mb-2">
                    <p className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">Completado</p>
                    <p className="text-[8px] font-mono text-gray-300">{Math.round(((convertStep - 1) / 3) * 100)}%</p>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.round(((convertStep - 1) / 3) * 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* Preview live */}
              {(convertOT.title || convertOT.client) && (
                <div className="p-4 mx-4 mb-4 bg-white/5 border border-white/10 rounded-xl">
                  <p className="text-[8px] font-mono text-gray-600 uppercase tracking-widest mb-2">Vista previa</p>
                  {convertOT.title && <p className="text-[10px] font-bold text-white leading-tight line-clamp-2">{convertOT.title}</p>}
                  {convertOT.client && <p className="text-[9px] text-gray-500 mt-1 font-mono truncate">{convertOT.client}</p>}
                  <span className={cn('inline-block mt-2 text-[8px] font-mono font-bold px-2 py-0.5 rounded uppercase',
                    convertOT.priority === 'URGENT' ? 'bg-red-900/50 text-red-400'
                    : convertOT.priority === 'HIGH' ? 'bg-orange-900/50 text-orange-400'
                    : convertOT.priority === 'MEDIUM' ? 'bg-blue-900/50 text-blue-400'
                    : 'bg-gray-800 text-gray-500'
                  )}>
                    {convertOT.priority === 'URGENT' ? 'Urgente' : convertOT.priority === 'HIGH' ? 'Alta' : convertOT.priority === 'MEDIUM' ? 'Media' : 'Baja'}
                  </span>
                </div>
              )}

              <div className="p-4 border-t border-white/5">
                <button onClick={() => setIsConvertModalOpen(false)}
                  className="cursor-pointer w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-colors text-[10px] font-mono font-bold uppercase tracking-widest"
                >
                  <X className="h-3.5 w-3.5" /> Cancelar
                </button>
              </div>
            </div>

            {/* ── Panel derecho ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Header */}
              <div className="shrink-0 px-8 pt-8 pb-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-gray-400 mb-1">Paso {convertStep} de 3</p>
                    <h3 className="text-xl font-black text-gray-950 leading-none">
                      {convertStep === 1 && 'Identificación del Servicio'}
                      {convertStep === 2 && 'Ubicación y Contacto en Sitio'}
                      {convertStep === 3 && 'Equipo, Programación y Fondos'}
                    </h3>
                  </div>
                  <button onClick={() => setIsConvertModalOpen(false)} className="cursor-pointer md:hidden h-9 w-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Form content */}
              <div className="flex-1 overflow-y-auto">
                <form id="convert-ot-form" onSubmit={handleSubmitConvert}>

                  {/* ── PASO 1 ── */}
                  {convertStep === 1 && (
                    <div className="px-8 py-7 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Autocompletar cliente */}
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-400 block mb-2">Autocompletar Cliente OT</label>
                          <div className="relative">
                            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none z-10" />
                            <input
                              type="text"
                              className="cursor-text w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-gray-400 focus:bg-white transition-colors"
                              placeholder="Buscar empresa o sucursal..."
                              value={convertOtClientSearch}
                              onChange={e => { setConvertOtClientSearch(e.target.value); setShowConvertDropdown(true); }}
                              onFocus={() => setShowConvertDropdown(true)}
                              onBlur={() => setTimeout(() => setShowConvertDropdown(false), 150)}
                            />
                            {showConvertDropdown && filteredConvertSuggestions.length > 0 && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden max-h-52 overflow-y-auto">
                                {filteredConvertSuggestions.map(c => (
                                  <button key={c.id} type="button" onMouseDown={() => handleConvertOTClientSelect(c)}
                                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                                  >
                                    <p className="text-xs font-bold text-gray-800 leading-none">{c.name}</p>
                                    {(c.storeNumber || c.storeName) && <p className="text-[9px] font-mono text-gray-400 mt-0.5">{c.storeNumber && `#${c.storeNumber}`}{c.storeNumber && c.storeName && ' · '}{c.storeName}</p>}
                                    {c.address && <p className="text-[9px] text-gray-300 truncate mt-0.5">{c.address}</p>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Plantilla */}
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-400 block mb-2">Plantilla de Servicio</label>
                          <div className="relative">
                            <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                            <select className="cursor-pointer w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-gray-400 focus:bg-white transition-colors" onChange={e => handleConvertTemplateSelect(e.target.value)}>
                              <option value="">Seleccionar tipo...</option>
                              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-[9px] font-mono text-gray-300 uppercase tracking-widest">datos de la orden</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>

                      {/* Título */}
                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Título de la Orden *</label>
                        <input required className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/5 transition-all placeholder:text-gray-300"
                          value={convertOT.title} onChange={e => setConvertOT({ ...convertOT, title: e.target.value })} placeholder="Ej. Mantenimiento preventivo sistema eléctrico..." />
                      </div>

                      {/* Sucursal + Cliente */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">No. Sucursal</label>
                          <input className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 outline-none focus:border-gray-900 transition-all placeholder:text-gray-300"
                            value={convertOT.storeNumber} onChange={e => setConvertOT({ ...convertOT, storeNumber: e.target.value })} placeholder="152" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Nombre Sucursal</label>
                          <input className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 transition-all placeholder:text-gray-300"
                            value={convertOT.storeName} onChange={e => setConvertOT({ ...convertOT, storeName: e.target.value })} placeholder="Coppel Insurgentes Norte" />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Razón Social / Empresa</label>
                        <div className="relative">
                          <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                          <input className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 transition-all placeholder:text-gray-300"
                            value={convertOT.client} onChange={e => setConvertOT({ ...convertOT, client: e.target.value })} placeholder="Coppel S.A. de C.V." />
                        </div>
                      </div>

                      {/* Prioridad */}
                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-3">Prioridad</label>
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { value: 'LOW', label: 'Baja', active: 'bg-gray-950 border-gray-950 text-white', idle: 'bg-white border-gray-200 text-gray-500 hover:border-gray-400', bar: 'bg-gray-400' },
                            { value: 'MEDIUM', label: 'Media', active: 'bg-blue-600 border-blue-600 text-white', idle: 'bg-white border-gray-200 text-gray-600 hover:border-blue-300', bar: 'bg-blue-500' },
                            { value: 'HIGH', label: 'Alta', active: 'bg-orange-500 border-orange-500 text-white', idle: 'bg-white border-gray-200 text-gray-600 hover:border-orange-300', bar: 'bg-orange-500' },
                            { value: 'URGENT', label: 'Urgente', active: 'bg-red-600 border-red-600 text-white', idle: 'bg-white border-gray-200 text-gray-600 hover:border-red-300', bar: 'bg-red-500' },
                          ].map(p => {
                            const isActive = convertOT.priority === p.value;
                            return (
                              <button key={p.value} type="button" onClick={() => setConvertOT({ ...convertOT, priority: p.value })}
                                className={cn('cursor-pointer relative flex flex-col items-center justify-center py-4 rounded-xl border-2 text-xs font-bold transition-all', isActive ? p.active : p.idle)}
                              >
                                <div className={cn('h-2 w-6 rounded-full mb-2.5', isActive ? 'bg-white/40' : p.bar)} />
                                {p.label}
                                {isActive && <div className="absolute top-1.5 right-1.5"><Check className="h-3 w-3 text-white/70" /></div>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── PASO 2 ── */}
                  {convertStep === 2 && (
                    <div className="px-8 py-7 space-y-6">
                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Dirección Principal *</label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                            <input required className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 transition-all placeholder:text-gray-300"
                              value={convertOT.address} onChange={e => setConvertOT({ ...convertOT, address: e.target.value })} placeholder="Buscar o clic en el mapa..." />
                          </div>
                          <button type="button" onClick={handleConvertLocationSearch} className="cursor-pointer shrink-0 h-11 px-4 bg-gray-950 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2 text-xs font-bold">
                            {convertSearchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Buscar
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Interior / Piso</label>
                          <input className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 transition-all placeholder:text-gray-300"
                            value={convertOT.secondaryAddress} onChange={e => setConvertOT({ ...convertOT, secondaryAddress: e.target.value })} placeholder="Int. B, Piso 3..." />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Zona / Referencia</label>
                          <input className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 transition-all placeholder:text-gray-300"
                            value={convertOT.otAddress} onChange={e => setConvertOT({ ...convertOT, otAddress: e.target.value })} placeholder="Frente al banco..." />
                        </div>
                      </div>

                      {/* Mapa */}
                      <div>
                        <div className="rounded-xl overflow-hidden border border-gray-200 relative z-0" style={{ height: 220 }}>
                          <MapContainer center={convertMapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[convertOT.lat, convertOT.lng]} />
                            <MapEvents onLocationSelect={async (latlng) => {
                              setConvertOT(prev => ({ ...prev, lat: latlng.lat, lng: latlng.lng }));
                              try {
                                const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`);
                                const d = await r.json();
                                if (d?.display_name) setConvertOT(prev => ({ ...prev, address: d.display_name }));
                              } catch (err) { console.error(err); }
                            }} />
                            <ChangeView center={convertMapCenter} />
                          </MapContainer>
                        </div>
                        <p className="text-[9px] font-mono text-gray-400 mt-2 text-center">Haz clic en el mapa para ajustar la ubicación</p>
                      </div>

                      <div className="flex items-center gap-4 pt-1">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-[9px] font-mono text-gray-300 uppercase tracking-widest">contacto en sitio</span>
                        <div className="flex-1 h-px bg-gray-100" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Persona Responsable</label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                            <input className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 transition-all placeholder:text-gray-300"
                              value={convertOT.contactName} onChange={e => setConvertOT({ ...convertOT, contactName: e.target.value })} placeholder="Nombre del encargado..." />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Email</label>
                          <input type="email" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 transition-all placeholder:text-gray-300"
                            value={convertOT.contactEmail} onChange={e => setConvertOT({ ...convertOT, contactEmail: e.target.value })} placeholder="email@empresa.com" />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Teléfono</label>
                          <input className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 transition-all placeholder:text-gray-300"
                            value={convertOT.contactPhone} onChange={e => setConvertOT({ ...convertOT, contactPhone: e.target.value })} placeholder="55 0000 0000" />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Referencia de Acceso</label>
                          <input className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 transition-all placeholder:text-gray-300"
                            value={convertOT.otReference} onChange={e => setConvertOT({ ...convertOT, otReference: e.target.value })} placeholder="Acceso por puerta lateral, preguntar por Juan..." />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── PASO 3 ── */}
                  {convertStep === 3 && (
                    <div className="px-8 py-7 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Fecha Programada</label>
                          <input type="date" className="cursor-pointer w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 outline-none focus:border-gray-900 transition-all"
                            value={convertOT.scheduledDate} onChange={e => setConvertOT({ ...convertOT, scheduledDate: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Hora de Llegada</label>
                          <input type="time" className="cursor-pointer w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-mono font-bold text-gray-900 outline-none focus:border-gray-900 transition-all"
                            value={convertOT.arrivalTime} onChange={e => setConvertOT({ ...convertOT, arrivalTime: e.target.value })} />
                        </div>
                      </div>

                      {/* Técnico líder */}
                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Técnico Líder *</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-300 pointer-events-none" />
                          <select required className="cursor-pointer w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 transition-all"
                            value={convertOT.leadTechId}
                            onChange={e => setConvertOT({ ...convertOT, leadTechId: e.target.value, leadTechName: e.target.options[e.target.selectedIndex].text })}
                          >
                            <option value="">Seleccionar técnico responsable...</option>
                            {availableTechs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Equipo apoyo */}
                      {availableTechs.filter(t => t.id !== convertOT.leadTechId).length > 0 && (
                        <div>
                          <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-3">Equipo de Apoyo <span className="normal-case text-gray-300">(opcional)</span></label>
                          <div className="flex flex-wrap gap-2">
                            {availableTechs.filter(t => t.id !== convertOT.leadTechId).map(tech => {
                              const isSelected = convertOT.assistantTechs?.some(t => t.id === tech.id);
                              return (
                                <button key={tech.id} type="button" onClick={() => toggleConvertAssistantTech(tech)}
                                  className={cn('cursor-pointer flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all',
                                    isSelected ? 'bg-gray-950 border-gray-950 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                                  )}
                                >
                                  <div className={cn('h-5 w-5 rounded-md flex items-center justify-center text-[9px] font-mono font-black shrink-0', isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500')}>
                                    {tech.name.charAt(0).toUpperCase()}
                                  </div>
                                  {tech.name}
                                  {isSelected && <Check className="h-3 w-3 text-white/70" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Presupuesto */}
                      <div className="bg-gray-950 rounded-2xl p-6">
                        <div className="flex items-end justify-between gap-6">
                          <div>
                            <p className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 mb-2">Presupuesto Inicial</p>
                            <p className="text-4xl font-black font-mono text-white tabular-nums">
                              ${parseFloat(convertOT.assignedFunds || 0).toLocaleString('es-MX')}
                            </p>
                            <p className="text-[9px] font-mono text-gray-600 mt-1">MXN</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-gray-600 block mb-2">Monto</label>
                            <div className="flex items-center gap-1.5">
                              <span className="text-gray-500 font-mono font-bold text-sm">$</span>
                              <input type="number" className="w-32 px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-mono font-bold text-sm outline-none focus:border-white/30 text-right"
                                value={convertOT.assignedFunds} onChange={e => setConvertOT({ ...convertOT, assignedFunds: parseFloat(e.target.value) || 0 })} placeholder="0" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Instrucciones */}
                      <div>
                        <label className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-gray-500 block mb-2">Instrucciones Técnicas</label>
                        <textarea rows={4} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 outline-none focus:border-gray-900 transition-all resize-none placeholder:text-gray-300 leading-relaxed"
                          value={convertOT.workDescription} onChange={e => setConvertOT({ ...convertOT, workDescription: e.target.value })}
                          placeholder="Describe el trabajo técnico a realizar, materiales necesarios, condiciones especiales..." />
                      </div>
                    </div>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className="shrink-0 px-8 py-5 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between gap-4">
                <button type="button"
                  onClick={convertStep > 1 ? () => setConvertStep(s => s - 1) : () => setIsConvertModalOpen(false)}
                  className="cursor-pointer flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {convertStep > 1 ? 'Anterior' : 'Cancelar'}
                </button>

                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map(n => (
                    <div key={n} className={cn('h-1.5 rounded-full transition-all duration-300', convertStep === n ? 'w-6 bg-gray-950' : convertStep > n ? 'w-1.5 bg-emerald-500' : 'w-1.5 bg-gray-200')} />
                  ))}
                </div>

                {convertStep < 3 ? (
                  <button type="button" onClick={() => setConvertStep(s => s + 1)}
                    className="cursor-pointer flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gray-950 text-white text-xs font-bold hover:bg-gray-800 transition-colors shadow-sm"
                  >
                    Siguiente <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button type="submit" form="convert-ot-form" disabled={convertSaving}
                    className="cursor-pointer flex items-center gap-2 px-7 py-2.5 rounded-xl bg-gray-950 text-white text-xs font-bold hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-40"
                  >
                    {convertSaving ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Creando OT...</> : 'Publicar Orden'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
