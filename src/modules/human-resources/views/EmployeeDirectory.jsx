import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  MapPin, 
  ChevronRight, 
  Filter, 
  X, 
  Shield, 
  Lock,
  Briefcase,
  Settings,
  Plus,
  Edit2,
  Eye,
  EyeOff,
  Calendar,
  Network
} from 'lucide-react';
import { hrService } from '@/api/hrService';
import { ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

export default function EmployeeDirectory() {
  const [employees, setEmployees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const initialForm = {
    name: '',
    email: '',
    phone: '',
    role: 'COLLABORATOR',
    position: '',
    department: '',
    location: '',
    joinDate: new Date().toISOString().split('T')[0],
    reportsTo: '',
    password: ''
  };

  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [emp, cats] = await Promise.all([
        hrService.getEmployees(),
        hrService.getCategories()
    ]);
    setEmployees(emp);
    setCategories(cats);
    setLoading(false);
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await hrService.saveEmployee(formData);
      await loadData();
      setIsModalOpen(false);
      setFormData(initialForm);
    } catch (error) {
      console.error('Error saving employee:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        await hrService.updateEmployee(editingId, formData);
        await loadData();
        setIsEditModalOpen(false);
        setEditingId(null);
        setFormData(initialForm);
    } catch (error) {
        console.error('Error updating employee:', error);
    } finally {
        setIsSaving(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    const updated = await hrService.saveCategory(newCategory);
    setCategories(updated);
    setNewCategory('');
  };

  const openEdit = (e, emp) => {
    e.stopPropagation();
    setEditingId(emp.id);
    setFormData({
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        role: emp.role,
        position: emp.position || '',
        department: emp.department,
        location: emp.location,
        joinDate: emp.joinDate || new Date().toISOString().split('T')[0],
        reportsTo: emp.reportsTo || '',
        password: '' // No editamos password aquí por seguridad en este paso
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Capital Humano</h2>
          <p className="text-sm text-gray-500 font-medium">Gestiona el talento y expedientes de Olea Controls.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCategoryModalOpen(true)}
            className="bg-white border border-gray-100 p-2 rounded-xl hover:bg-gray-50 transition-all text-gray-500 shadow-sm"
            title="Gestionar Categorías"
          >
            <Settings className="h-5 w-5" />
          </button>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o ID..." 
              className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:border-primary outline-none w-full md:w-64 transition-all"
            />
          </div>
          <button 
            onClick={() => { setFormData(initialForm); setIsModalOpen(true); }}
            className="bg-primary text-white p-2 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <UserPlus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 animate-pulse rounded-3xl" />)
        ) : employees.map((emp) => (
          <div 
            key={emp.id}
            onClick={() => navigate(`/hr/employee/${emp.id}`)}
            className="group bg-white rounded-3xl border border-gray-100 p-6 hover:border-primary/30 hover:shadow-2xl hover:shadow-gray-200/50 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <img src={emp.avatar} alt={emp.name} className="h-16 w-16 rounded-2xl object-cover border-2 border-gray-50 group-hover:scale-105 transition-transform" />
              <div className="flex gap-2">
                <button 
                    onClick={(e) => openEdit(e, emp)}
                    className="p-2 bg-gray-50 hover:bg-primary/10 hover:text-primary text-gray-400 rounded-xl transition-all"
                >
                    <Edit2 className="h-4 w-4" />
                </button>
                <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-full uppercase self-start">Activo</span>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-gray-900 text-lg group-hover:text-primary transition-colors">{emp.name}</h3>
              <div className="flex flex-col">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest">{emp.position || 'Sin Categoría'}</p>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{emp.role}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                <div className="h-7 w-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                  <Mail className="h-4 w-4" />
                </div>
                {emp.email}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                <div className="h-7 w-7 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                  <MapPin className="h-4 w-4" />
                </div>
                {emp.location}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase">
              <span>Ingreso: {emp.joinDate}</span>
              <div className="flex items-center gap-1 text-primary">
                Ver Expediente <ChevronRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* New/Edit Employee Modal */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">{isEditModalOpen ? 'Editar Perfil' : 'Alta en Capital Humano'}</h3>
                  <p className="text-sm text-gray-500 font-medium">Gestiona la posición y accesos del empleado.</p>
                </div>
                <button onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={isEditModalOpen ? handleUpdateEmployee : handleCreateEmployee} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Nombre Completo</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary font-bold text-sm transition-all"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Correo Electrónico</label>
                    <input 
                      required
                      type="email" 
                      disabled={isEditModalOpen}
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary font-bold text-sm transition-all disabled:opacity-50"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Puesto / Categoría</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Briefcase className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                        <select 
                          required
                          className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary font-bold text-sm transition-all appearance-none"
                          value={formData.position}
                          onChange={e => setFormData({...formData, position: e.target.value})}
                        >
                          <option value="">Seleccionar Puesto...</option>
                          {categories.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="bg-gray-100 text-gray-500 px-3 rounded-2xl hover:bg-primary hover:text-white transition-all border border-transparent hover:border-primary"
                        title="Agregar nueva categoría"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Departamento</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary font-bold text-sm transition-all"
                      value={formData.department}
                      onChange={e => setFormData({...formData, department: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Ubicación</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary font-bold text-sm transition-all"
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Fecha de Ingreso</label>
                    <div className="relative">
                      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                      <input 
                        required
                        type="date" 
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary font-bold text-sm transition-all appearance-none"
                        value={formData.joinDate}
                        onChange={e => setFormData({...formData, joinDate: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Rol en la Plataforma</label>
                    <div className="relative">
                      <Shield className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                      <select 
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary font-bold text-sm transition-all appearance-none"
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value})}
                      >
                        <option value={ROLES.COLLABORATOR}>COLABORADOR (Solo Perfil RH)</option>
                        <option value={ROLES.TECH}>TÉCNICO (Operativo + RH)</option>
                        <option value={ROLES.OPS}>SUPERVISOR (Control + RH)</option>
                        <option value={ROLES.SALES}>VENTAS (CRM + RH)</option>
                        <option value={ROLES.HR}>RECURSOS HUMANOS</option>
                        <option value={ROLES.ADMIN}>ADMINISTRADOR GENERAL</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Reporta a (Superior)</label>
                    <div className="relative">
                      <Network className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 pointer-events-none" />
                      <select 
                        className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary font-bold text-sm transition-all appearance-none"
                        value={formData.reportsTo}
                        onChange={e => setFormData({...formData, reportsTo: e.target.value})}
                      >
                        <option value="">Ninguno (Nivel Superior)</option>
                        {employees.filter(e => e.id !== editingId).map(emp => (
                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.position})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {!isEditModalOpen && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Contraseña de Acceso</label>
                        <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                        <input 
                            required
                            type={showPassword ? "text" : "password"} 
                            className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-primary font-bold text-sm transition-all"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                            placeholder="••••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-primary transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 flex flex-col md:flex-row gap-3">
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className="flex-1 bg-primary text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : (isEditModalOpen ? 'Guardar Cambios' : 'Confirmar Alta y Accesos')}
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}
                    className="px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Categories Management Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-gray-900">Gestionar Puestos</h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        className="flex-1 px-4 py-2 bg-gray-50 border border-transparent rounded-xl outline-none focus:bg-white focus:border-primary font-bold text-sm transition-all"
                        placeholder="Nueva categoría..."
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                    />
                    <button 
                        onClick={handleAddCategory}
                        className="bg-gray-900 text-white p-2 rounded-xl hover:bg-primary transition-all"
                    >
                        <Plus className="h-5 w-5" />
                    </button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                    {categories.map(cat => (
                        <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                            <span className="text-sm font-bold text-gray-700">{cat}</span>
                            <button className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
