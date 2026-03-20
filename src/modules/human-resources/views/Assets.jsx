import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Wrench, HardHat, Car, Laptop, 
  Smartphone, Trash2, Edit2, UserPlus, CheckCircle2, 
  AlertCircle, Clock, ChevronRight, X, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hrService } from '@/api/hrService';

const CATEGORIES = ['Herramienta', 'EPP', 'Vehículo', 'Cómputo', 'Móvil', 'Otros'];
const CONDITIONS = [
  { id: 'NEW', label: 'Nuevo', color: 'text-emerald-600 bg-emerald-50' },
  { id: 'GOOD', label: 'Bueno', color: 'text-blue-600 bg-blue-50' },
  { id: 'FAIR', label: 'Regular', color: 'text-amber-600 bg-amber-50' },
  { id: 'POOR', label: 'Mal Estado', color: 'text-rose-600 bg-rose-50' }
];

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const [formData, setFormData] = useState({
    name: '', category: 'Herramienta', serialNumber: '', condition: 'NEW', notes: ''
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assetData, empData] = await Promise.all([
        hrService.getAssets(),
        hrService.getEmployees()
      ]);
      setAssets(assetData);
      setEmployees(empData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAsset = async (e) => {
    e.preventDefault();
    try {
      await hrService.saveAsset(formData);
      setShowAddModal(false);
      setFormData({ name: '', category: 'Herramienta', serialNumber: '', condition: 'NEW', notes: '' });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleAssign = async (employeeId) => {
    try {
      await hrService.updateAsset(selectedAsset.id, { assignedToId: employeeId });
      setShowAssignModal(false);
      setSelectedAsset(null);
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleUnassign = async (id) => {
    if (!confirm('¿Desvincular este activo del colaborador?')) return;
    try {
      await hrService.updateAsset(id, { assignedToId: null });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este activo del inventario permanentemente?')) return;
    try {
      await hrService.deleteAsset(id);
      loadData();
    } catch (err) { alert(err.message); }
  };

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
                          (a.serialNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchesCat = filterCategory === 'ALL' || a.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const stats = {
    total: assets.length,
    assigned: assets.filter(a => a.status === 'ASSIGNED').length,
    available: assets.filter(a => a.status === 'AVAILABLE').length,
    epp: assets.filter(a => a.category === 'EPP').length
  };

  if (loading) return <div className="p-20 text-center font-black text-gray-300 animate-pulse">SINCRONIZANDO INVENTARIO...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight italic uppercase tracking-tighter">Activos y EPP</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Control de herramientas, equipo de protección y tecnología asignada.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-gray-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary transition-all shadow-xl">
          <Plus className="h-4 w-4" /> Registrar Activo
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Activos', value: stats.total, color: 'bg-white', icon: PackageIcon },
          { label: 'En Uso', value: stats.assigned, color: 'bg-emerald-50 text-emerald-600', icon: CheckCircle2 },
          { label: 'Disponibles', value: stats.available, color: 'bg-blue-50 text-blue-600', icon: Clock },
          { label: 'Stock EPP', value: stats.epp, color: 'bg-amber-50 text-amber-600', icon: HardHat }
        ].map((s, i) => (
          <div key={i} className={cn("p-6 rounded-[2rem] border border-gray-100 shadow-sm", s.color)}>
            <div className="flex justify-between items-start mb-2">
              <s.icon className="h-5 w-5 opacity-50" />
              <span className="text-2xl font-black italic">{s.value}</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 border rounded-3xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o serie..." 
            className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl outline-none focus:bg-white focus:ring-2 ring-primary/10 font-bold text-sm transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-hide">
          {['ALL', ...CATEGORIES].map(cat => (
            <button 
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border",
                filterCategory === cat ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 hover:border-gray-300"
              )}
            >
              {cat === 'ALL' ? 'Todos' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Activos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAssets.map(asset => (
          <div key={asset.id} className="bg-white border rounded-[2.5rem] p-6 hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="flex justify-between items-start mb-6">
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center border shadow-inner transition-transform group-hover:rotate-3",
                asset.category === 'EPP' ? "bg-amber-50 text-amber-600 border-amber-100" :
                asset.category === 'Cómputo' ? "bg-blue-50 text-blue-600 border-blue-100" :
                "bg-emerald-50 text-emerald-600 border-emerald-100"
              )}>
                {getIconForCategory(asset.category)}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDelete(asset.id)} className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter",
                  CONDITIONS.find(c => c.id === asset.condition)?.color
                )}>
                  {CONDITIONS.find(c => c.id === asset.condition)?.label}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{asset.category}</span>
              </div>
              <h4 className="text-lg font-black text-gray-900 leading-tight">{asset.name}</h4>
              <p className="text-[10px] font-mono text-gray-400">S/N: {asset.serialNumber || 'SIN SERIE'}</p>
            </div>

            <div className="mt-6 pt-6 border-t border-dashed flex flex-col gap-4">
              {asset.status === 'ASSIGNED' ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-[10px]">
                      {asset.assignedTo?.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-900 leading-none">{asset.assignedTo?.name}</p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Asignado el {new Date(asset.assignedDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleUnassign(asset.id)}
                    className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                    title="Desvincular"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => { setSelectedAsset(asset); setShowAssignModal(true); }}
                  className="w-full bg-gray-50 text-gray-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2 border border-transparent hover:border-emerald-500"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Asignar a Personal
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Registrar Activo */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden">
            <form onSubmit={handleAddAsset} className="p-10 space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-black text-gray-900 italic tracking-tighter uppercase">Nuevo Activo</h3>
                <button type="button" onClick={() => setShowAddModal(false)}><X className="h-6 w-6 text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <InputField label="Nombre del Activo" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Categoría</label>
                    <select className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm outline-none focus:bg-white focus:border-primary/30 appearance-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Estado Físico</label>
                    <select className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm outline-none focus:bg-white focus:border-primary/30 appearance-none" value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})}>
                      {CONDITIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
                <InputField label="Número de Serie / Folio" value={formData.serialNumber} onChange={v => setFormData({...formData, serialNumber: v})} />
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Notas / Observaciones</label>
                  <textarea className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl font-bold text-sm outline-none focus:bg-white focus:border-primary/30 h-24 resize-none" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-emerald-600 transition-all">Registrar en Inventario</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asignar */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-8 border-b bg-gray-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-gray-900 italic uppercase">Asignar Equipo</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Activo: {selectedAsset?.name}</p>
              </div>
              <button onClick={() => setShowAssignModal(false)}><X className="h-6 w-6 text-gray-400" /></button>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                {employees.map(emp => (
                  <button 
                    key={emp.id}
                    onClick={() => handleAssign(emp.id)}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-emerald-50 border border-gray-100 rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-400 group-hover:bg-white">
                        {emp.name.charAt(0)}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-gray-900">{emp.name}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">{emp.position || 'Sin cargo'}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getIconForCategory(cat) {
  switch (cat) {
    case 'Herramienta': return <Wrench className="h-6 w-6" />;
    case 'EPP': return <HardHat className="h-6 w-6" />;
    case 'Vehículo': return <Car className="h-6 w-6" />;
    case 'Cómputo': return <Laptop className="h-6 w-6" />;
    case 'Móvil': return <Smartphone className="h-6 w-6" />;
    default: return <Smartphone className="h-6 w-6" />;
  }
}

function PackageIcon(props) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function InputField({ label, value, onChange, type = "text", required = false, placeholder = "" }) {
  return (
      <div className="space-y-1.5">
          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{label} {required && '*'}</label>
          <input 
              type={type} required={required} placeholder={placeholder}
              className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary/30 font-bold text-sm transition-all"
              value={value || ''} onChange={e => onChange(e.target.value)}
          />
      </div>
  );
}
