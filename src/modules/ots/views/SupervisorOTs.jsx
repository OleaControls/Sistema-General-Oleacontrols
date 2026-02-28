import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  UserPlus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Eye, 
  X, 
  Send, 
  Receipt, 
  BarChart3, 
  FileText, 
  MapPin, 
  Map as MapIcon, 
  Loader2, 
  LayoutGrid, 
  Users 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { otService } from '@/api/otService';
import { crmService } from '@/api/crmService';
import { cn } from '@/lib/utils';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapEvents({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, 15);
  return null;
}

export default function SupervisorOTs() {
  const [ots, setOts] = useState([]);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [mapCenter, setMapCenter] = useState([22.1444, -100.9167]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const initialNewOT = {
    title: '',
    storeNumber: '',
    storeName: '',
    client: '',
    address: '',
    lat: 22.1444,
    lng: -100.9167,
    clientEmail: '',
    clientPhone: '',
    leadTechId: 'user-123',
    leadTechName: 'Gabriel Técnico (Pruebas)',
    supportTechs: [],
    workDescription: '',
    arrivalTime: '',
    priority: 'MEDIUM',
    assignedFunds: 0
  };

  const [newOT, setNewOT] = useState(initialNewOT);

  const availableTechs = [
    { id: 'user-123', name: 'Gabriel Técnico (Pruebas)' },
    { id: 'user-tech-02', name: 'Juan Pérez' },
    { id: 'user-tech-03', name: 'Luis Gómez' },
    { id: 'user-tech-04', name: 'Ana Martínez' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [o, c, t] = await Promise.all([
      otService.getOTs(),
      crmService.getClients(),
      otService.getTemplates()
    ]);
    setOts(o);
    setClients(c);
    setTemplates(t);
    setLoading(false);
  };

  const handleClientSelect = (clientId) => {
    if (!clientId) return;
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setNewOT(prev => ({
        ...prev,
        client: client.name,
        address: client.address,
        clientEmail: client.email,
        clientPhone: client.phone
      }));
    }
  };

  const handleTemplateSelect = (templateId) => {
    if (!templateId) return;
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setNewOT(prev => ({
        ...prev,
        title: template.title,
        workDescription: template.workDescription,
        priority: template.priority,
        arrivalTime: template.arrivalTime
      }));
    }
  };

  const handleLocationSearch = async () => {
    if (!newOT.address) return;
    setSearchLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newOT.address)}`);
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setNewOT(prev => ({ ...prev, lat: parseFloat(lat), lng: parseFloat(lon), address: display_name }));
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
      }
    } catch (error) {
      console.error('Location search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleSupportTech = (tech) => {
    setNewOT(prev => {
      const isSelected = prev.supportTechs.find(t => t.id === tech.id);
      if (isSelected) {
        return { ...prev, supportTechs: prev.supportTechs.filter(t => t.id !== tech.id) };
      } else {
        return { ...prev, supportTechs: [...prev.supportTechs, tech] };
      }
    });
  };

  const openCreateModal = () => {
    setNewOT(initialNewOT);
    setIsEditMode(false);
    setEditingId(null);
    setMapCenter([22.1444, -100.9167]);
    setIsModalOpen(true);
  };

  const openEditModal = (ot) => {
    setNewOT({
      title: ot.title || '',
      storeNumber: ot.storeNumber || '',
      storeName: ot.storeName || '',
      client: ot.client || '',
      address: ot.address || '',
      lat: ot.lat || 22.1444,
      lng: ot.lng || -100.9167,
      clientEmail: ot.clientEmail || '',
      clientPhone: ot.clientPhone || '',
      leadTechId: ot.leadTechId || 'user-123',
      leadTechName: ot.leadTechName || 'Gabriel Técnico (Pruebas)',
      supportTechs: ot.supportTechs || [],
      workDescription: ot.workDescription || '',
      arrivalTime: ot.arrivalTime || '',
      priority: ot.priority || 'MEDIUM',
      assignedFunds: ot.assignedFunds || 0
    });
    setEditingId(ot.id);
    setIsEditMode(true);
    setMapCenter([ot.lat || 22.1444, ot.lng || -100.9167]);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isEditMode) {
      await otService.updateOT(editingId, newOT);
    } else {
      await otService.saveOT(newOT);
    }
    setIsModalOpen(false);
    loadData();
    setNewOT(initialNewOT);
    setIsEditMode(false);
    setEditingId(null);
  };

  const handleAssign = async (otId) => {
    await otService.assignOT(otId, 'user-123', 'Gabriel Técnico (Pruebas)');
    loadData();
  };

  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Control de Operaciones</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Monitorea y asigna órdenes de trabajo a la cuadrilla técnica.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => navigate('/ots/leaderboard')}
            className="bg-white border border-gray-200 text-gray-600 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Trophy className="h-4 w-4 text-amber-500" /> Ranking Cuadrilla
          </button>
          <button 
            onClick={() => navigate('/ops/ots/catalogs')}
            className="bg-white border border-gray-200 text-gray-600 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm"
          >
            <LayoutGrid className="h-4 w-4" /> Catálogos
          </button>
          <button 
            onClick={openCreateModal}
            className="bg-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <ClipboardList className="h-4 w-4" /> Nueva Orden (OT)
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900">
                  {isEditMode ? `Editar OT: ${editingId}` : 'Crear Nueva OT'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Form Fields */}
                  <div className="space-y-4">
                    {/* Quick Selectors */}
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-primary tracking-widest">Cargar Cliente</label>
                        <select className="w-full bg-white border rounded-xl py-2 px-3 text-xs font-bold" onChange={e => handleClientSelect(e.target.value)}>
                          <option value="">Seleccionar...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-purple-500 tracking-widest">Cargar Plantilla</label>
                        <select className="w-full bg-white border rounded-xl py-2 px-3 text-xs font-bold" onChange={e => handleTemplateSelect(e.target.value)}>
                          <option value="">Seleccionar...</option>
                          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Título de la Orden</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                          value={newOT.title}
                          onChange={(e) => setNewOT({...newOT, title: e.target.value})}
                          placeholder="Ej. Mantenimiento de Sensores"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Número de Tienda</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                          value={newOT.storeNumber}
                          onChange={(e) => setNewOT({...newOT, storeNumber: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Nombre de Tienda</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                          value={newOT.storeName}
                          onChange={(e) => setNewOT({...newOT, storeName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Nombre del Cliente</label>
                        <input 
                          required
                          type="text" 
                          className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                          value={newOT.client}
                          onChange={(e) => setNewOT({...newOT, client: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Dirección y Búsqueda en Mapa</label>
                        <div className="flex gap-2">
                          <input 
                            required
                            type="text" 
                            className="flex-1 px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                            value={newOT.address}
                            onChange={(e) => setNewOT({...newOT, address: e.target.value})}
                            placeholder="Calle, localidad, ciudad..."
                          />
                          <button 
                            type="button"
                            onClick={handleLocationSearch}
                            disabled={searchLoading}
                            className="bg-gray-900 text-white px-4 py-2 rounded-xl flex items-center justify-center disabled:opacity-50"
                          >
                            {searchLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Técnico Líder</label>
                        <select 
                          className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold bg-white"
                          value={newOT.leadTechId}
                          onChange={(e) => setNewOT({...newOT, leadTechId: e.target.value, leadTechName: e.target.options[e.target.selectedIndex].text})}
                        >
                          {availableTechs.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Prioridad</label>
                        <select 
                          className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold bg-white"
                          value={newOT.priority}
                          onChange={(e) => setNewOT({...newOT, priority: e.target.value})}
                        >
                          <option value="LOW">BAJA</option>
                          <option value="MEDIUM">MEDIA</option>
                          <option value="HIGH">ALTA</option>
                        </select>
                      </div>
                      <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Técnicos de Apoyo</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {availableTechs.filter(t => t.id !== newOT.leadTechId).map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleSupportTech(t)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                                newOT.supportTechs.find(st => st.id === t.id)
                                  ? "bg-primary text-white border-primary shadow-sm"
                                  : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
                              )}
                            >
                              {t.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Map Side */}
                  <div className="space-y-4">
                    <div className="bg-gray-100 rounded-[2.5rem] overflow-hidden border border-gray-200 h-[400px] relative">
                      <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[newOT.lat, newOT.lng]} />
                        <MapEvents onLocationSelect={(latlng) => {
                          setNewOT(prev => ({ ...prev, lat: latlng.lat, lng: latlng.lng }));
                        }} />
                        <ChangeView center={mapCenter} />
                      </MapContainer>
                      <div className="absolute bottom-4 left-4 z-[1000] bg-white p-3 rounded-2xl shadow-xl text-[9px] font-black text-gray-500 uppercase flex items-center gap-2 border border-gray-100">
                        <MapPin className="h-4 w-4 text-primary" />
                        COORD: {newOT.lat.toFixed(4)}, {newOT.lng.toFixed(4)}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Hora de Llegada</label>
                        <input 
                          required
                          type="time" 
                          className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                          value={newOT.arrivalTime}
                          onChange={(e) => setNewOT({...newOT, arrivalTime: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400">Fondo de Mantenimiento</label>
                        <input 
                          type="number" 
                          className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                          value={newOT.assignedFunds}
                          onChange={(e) => setNewOT({...newOT, assignedFunds: parseFloat(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400">Trabajos a Realizar</label>
                      <textarea 
                        required
                        rows="3"
                        className="w-full px-4 py-2 border rounded-xl outline-none focus:border-primary font-bold"
                        value={newOT.workDescription}
                        onChange={(e) => setNewOT({...newOT, workDescription: e.target.value})}
                        placeholder="Describa detalladamente las actividades..."
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button type="submit" className="bg-primary text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all w-full lg:w-auto">
                    <Send className="h-5 w-5" /> {isEditMode ? 'Guardar Cambios' : 'Crear y Asignar Equipo'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">En Ejecución / Asignadas</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{ots.filter(o => ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(o.status)).length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Sin Asignar</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{ots.filter(o => o.status === 'UNASSIGNED').length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm border-blue-100">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Terminadas / Por Validar</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{ots.filter(o => o.status === 'COMPLETED').length}</p>
        </div>
        <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Control de Gastos</p>
          <div className="flex gap-2 mt-2">
             <button 
               onClick={() => navigate('/ops/expenses/control')} 
               className="bg-emerald-600 p-2.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200 flex items-center gap-2"
             >
               <Receipt className="h-4 w-4" /> Ver Listado
             </button>
             <button 
               onClick={() => navigate('/expenses/dashboard')} 
               className="bg-white p-2.5 rounded-xl border border-emerald-100 text-emerald-600 hover:shadow-md transition-all shadow-sm"
               title="Dashboard de Gastos"
             >
               <BarChart3 className="h-4 w-4" />
             </button>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="p-4 md:p-6 border-b bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar por OT, cliente, técnico..." className="pl-12 pr-4 py-3 bg-white border rounded-2xl outline-none focus:border-primary font-bold text-sm w-full shadow-sm" />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
             <button className="flex-1 md:flex-none px-4 py-2 bg-white border rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 transition-all">
               <Filter className="h-3 w-3 inline mr-1" /> Filtros
             </button>
          </div>
        </div>
        
        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {ots.map((ot) => (
            <div key={ot.id} className="p-5 space-y-4 hover:bg-gray-50/50 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black text-gray-900">{ot.id}</span>
                    <span className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider",
                      ot.priority === 'HIGH' ? "bg-red-50 text-red-600 border-red-100" : "bg-blue-50 text-blue-600 border-blue-100"
                    )}>{ot.priority}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 leading-tight">{ot.title}</h4>
                  <p className="text-[10px] text-gray-400 font-black uppercase mt-1 tracking-wider">{ot.client}</p>
                </div>
                <span className={cn(
                  "text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border",
                  ot.status === 'VALIDATED' ? "bg-green-50 text-green-700 border-green-100" :
                  ot.status === 'COMPLETED' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-gray-100 text-gray-600 border-gray-200"
                )}>
                  {ot.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black">L</div>
                  <span className="text-gray-600">{ot.leadTechName?.split(' ')[0]}</span>
                  {ot.supportTechs?.length > 0 && (
                    <span className="bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">+{ot.supportTechs.length}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {ot.status === 'COMPLETED' && (
                    <button 
                      onClick={() => navigate(`/ops/ots/delivery-act/${ot.id}`)}
                      className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100"
                    >
                      <FileText className="h-4 w-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => openEditModal(ot)}
                    className="p-2 bg-white text-gray-400 border rounded-xl hover:text-primary transition-all"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto scrollbar-hide">
          <table className="w-full text-left min-w-[800px]">
            <thead className="bg-white border-b">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-5">ID / Prioridad</th>
                <th className="px-6 py-5">Servicio / Cliente</th>
                <th className="px-6 py-5">Técnico Asignado</th>
                <th className="px-6 py-5">Estado</th>
                <th className="px-6 py-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ots.map((ot) => (
                <tr key={ot.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-5">
                    <p className="font-black text-sm text-gray-900">{ot.id}</p>
                    <span className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded uppercase",
                      ot.priority === 'HIGH' ? "bg-red-50 text-red-600 border border-red-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                    )}>{ot.priority}</span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="font-bold text-sm text-gray-700 leading-tight group-hover:text-primary transition-colors">{ot.title}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{ot.client}</p>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold">
                    {ot.leadTechName ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black border border-primary/5 shadow-sm">L</div>
                          <span className="text-gray-900">{ot.leadTechName}</span>
                        </div>
                        {ot.supportTechs && ot.supportTechs.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-9">
                            {ot.supportTechs.map(st => (
                              <span key={st.id} className="text-[8px] bg-gray-50 text-gray-400 px-2 py-0.5 rounded-md border border-gray-100 uppercase font-black">
                                {st.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button 
                        onClick={() => handleAssign(ot.id)}
                        className="text-primary hover:underline text-xs flex items-center gap-1 font-black uppercase tracking-wider"
                      >
                        <UserPlus className="h-3 w-3" /> Asignar Equipo
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "text-[10px] font-black px-2.5 py-1.5 rounded-xl uppercase tracking-widest border",
                      ot.status === 'VALIDATED' ? "bg-green-50 text-green-700 border-green-100" :
                      ot.status === 'COMPLETED' ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-gray-100 text-gray-600 border-gray-200"
                    )}>
                      {ot.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      {ot.status === 'COMPLETED' && (
                        <>
                          <button 
                            onClick={() => navigate(`/ops/ots/delivery-act/${ot.id}`)}
                            className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 border border-emerald-100 shadow-sm transition-all"
                          >
                            <FileText className="h-3.5 w-3.5" /> Acta
                          </button>
                          <button 
                            onClick={() => navigate(`/ops/ots/validate/${ot.id}`)}
                            className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-100 border border-blue-100 shadow-sm transition-all"
                          >
                            <Eye className="h-3.5 w-3.5" /> Revisar
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => openEditModal(ot)}
                        className="text-gray-400 hover:text-gray-900 p-2 rounded-xl border bg-white shadow-sm hover:border-primary/30 transition-all"
                        title="Editar Orden"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
