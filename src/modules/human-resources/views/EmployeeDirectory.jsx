import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, UserPlus, Mail, Phone, MapPin, ChevronRight, Filter, X, Shield, Lock, Briefcase, Settings, Plus, Edit2, Eye, EyeOff, Calendar, Network, Check, 
  FileText, CreditCard, Landmark, Clock, Wallet, User as UserIcon, Upload, Trash2, File, FileSignature, Award
} from 'lucide-react';
import { hrService } from '@/api/hrService';
import { ROLES, useAuth } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.HR]: 'RH',
  [ROLES.OPS]: 'Super',
  [ROLES.TECH]: 'Tech',
  [ROLES.SALES]: 'Ventas',
  [ROLES.COLLABORATOR]: 'Colab'
};


const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

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
    // Básicos
    name: '', email: '', phone: '', birthDate: '', birthPlace: '', nationality: '', maritalStatus: 'SOLTERO/A', address: '', emergencyContactName: '', emergencyContactPhone: '',
    // 1. Datos Personales (Documentos)
    ine: '', curp: '', rfc: '', nss: '', birthCertificate: '', proofOfResidency: '', cv: '',
    // 2. Contratación
    contractSigned: '', privacyPolicySigned: '', internalRulesSigned: '', imssHigh: '',
    // 3. Seguimiento Laboral
    studyCertificate: '', degreeOrProfessionalId: '', diplomasOrCourses: '', laborCertifications: '', recommendationLetter: '',
    performanceEvaluations: '', receivedTraining: '', administrativeActs: '', disciplinaryReports: '', permitsOrLicenses: '',
    // 4. Baja del Empleado
    resignationLetter: '', settlementOrLiquidation: '', imssLow: '', laborConstancy: '',
    // Laborales Generales
    employeeId: '', position: '', department: '', joinDate: new Date().toISOString().split('T')[0], contractType: 'INDEFINIDO', workSchedule: '', salary: '', roles: [ROLES.COLLABORATOR], reportsTo: '',
    // Nómina
    bankName: '', bankAccount: '', paymentType: 'QUINCENAL',
    password: '',
    // Notificaciones
    telegramChatId: ''
  };

  const [formData, setFormData] = useState(initialForm);
  const [activeFormTab, setActiveFormTab] = useState('PERSONAL');
  const [editingId, setEditingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { updateUser, user: currentUser } = useAuth();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
        const [emp, cats] = await Promise.all([hrService.getEmployees(), hrService.getCategories()]);
        setEmployees(emp);
        setCategories(cats);
    } finally { setLoading(false); }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await hrService.saveEmployee(formData);
      await loadData();
      setSuccessMsg('Empleado dado de alta exitosamente.');
      setTimeout(() => setSuccessMsg(''), 3000);
      setIsModalOpen(false);
      setFormData(initialForm);
    } catch (error) { alert(error.message); } finally { setIsSaving(false); }
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        const updated = await hrService.updateEmployee(editingId, formData);
        updateUser(updated); // Actualizar sesión si es el usuario actual
        await loadData();
        setSuccessMsg('Expediente actualizado.');
        setTimeout(() => setSuccessMsg(''), 3000);
        setIsEditModalOpen(false);
        setFormData(initialForm);
    } catch (error) { alert(error.message); } finally { setIsSaving(false); }
  };

  const handleDeleteEmployee = async (e, id, name) => {
    e.stopPropagation();
    if (id === currentUser.id) {
        alert("No puedes eliminar tu propio perfil de administrador.");
        return;
    }
    if (confirm(`¿Estás seguro de eliminar permanentemente a ${name}? Esta acción borrará su expediente y sus credenciales de acceso.`)) {
        try {
            await hrService.deleteEmployee(id);
            await loadData();
            setSuccessMsg('Empleado eliminado.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            alert(error.message);
        }
    }
  };

  const toggleRole = (role) => {
    setFormData(prev => {
        const current = prev.roles || [];
        return current.includes(role) ? { ...prev, roles: current.filter(r => r !== role) } : { ...prev, roles: [...current, role] };
    });
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
        const updated = await hrService.saveCategory(newCategory);
        setCategories(updated);
        setNewCategory('');
    } catch (err) {
        alert("Error al guardar categoría");
    }
  };

  const openEdit = (e, emp) => {
    e.stopPropagation();
    setEditingId(emp.id);
    setFormData({
        ...initialForm,
        ...emp,
        roles: Array.isArray(emp.roles) ? emp.roles : [emp.role],
        birthDate: emp.birthDate ? new Date(emp.birthDate).toISOString().split('T')[0] : '',
        joinDate: emp.joinDate ? new Date(emp.joinDate).toISOString().split('T')[0] : '',
        password: ''
    });
    setIsEditModalOpen(true);
  };

  const filteredEmployees = employees.filter(emp => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(q) ||
      emp.position?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="fixed top-20 right-8 z-[60] bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5" /> {successMsg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tighter">Expedientes Digitales</h2>
          <p className="text-sm text-gray-500 font-medium">Gestión integral de Capital Humano y Nómina.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsCategoryModalOpen(true)} className="bg-white border p-2 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors shadow-sm" title="Gestionar Todos los Puestos">
            <Settings className="h-5 w-5" />
          </button>
          <button onClick={() => { setFormData(initialForm); setIsModalOpen(true); }} className="bg-primary text-white px-4 py-2 rounded-xl font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all">
            <UserPlus className="h-4 w-4" /> Nuevo Ingreso
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, puesto o departamento..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="h-9 w-9 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="h-2 bg-gray-100 rounded w-1/3" />
                </div>
                <div className="h-2 bg-gray-100 rounded w-24" />
                <div className="h-2 bg-gray-100 rounded w-32" />
              </div>
            ))}
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="text-center py-20">
            <Search className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="font-black text-gray-400 text-sm">Sin resultados</p>
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1">Intenta con otro término de búsqueda</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b bg-gray-50/60">
              <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-3">Colaborador</th>
                <th className="px-6 py-3">Puesto</th>
                <th className="px-6 py-3">Departamento</th>
                <th className="px-6 py-3">Contacto</th>
                <th className="px-6 py-3">Contrato</th>
                <th className="px-6 py-3">Ingreso</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredEmployees.map((emp) => (
                <tr
                  key={emp.id}
                  className="hover:bg-gray-50/60 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/hr/employee/${emp.id}`)}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {emp.avatar
                        ? <img src={emp.avatar} className="h-9 w-9 rounded-xl object-cover border border-gray-100 shrink-0" alt="" />
                        : <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center font-black text-xs text-primary shrink-0">
                            {emp.name?.[0] || '?'}
                          </div>
                      }
                      <div>
                        <p className="text-sm font-black text-gray-900 leading-none">{emp.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 mt-0.5">#{emp.employeeId || emp.id?.slice(0,8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs font-bold text-primary">{emp.position || 'Sin puesto'}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs font-bold text-gray-600">{emp.department || '—'}</span>
                  </td>
                  <td className="px-6 py-3 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                      <Mail className="h-3 w-3 shrink-0" /> {emp.email}
                    </div>
                    {emp.phone && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                        <Phone className="h-3 w-3 shrink-0" /> {emp.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span className={cn(
                      'text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-wider',
                      emp.contractType === 'INDEFINIDO' ? 'bg-emerald-50 text-emerald-700' :
                      emp.contractType === 'TEMPORAL'   ? 'bg-amber-50 text-amber-700' :
                      'bg-blue-50 text-blue-700'
                    )}>
                      {emp.contractType || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-[10px] font-bold text-gray-500">
                      {emp.joinDate ? new Date(emp.joinDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div
                      className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => openEdit(e, emp)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/8 transition-all"
                        title="Editar expediente"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      {emp.id !== currentUser.id && (
                        <button
                          onClick={(e) => handleDeleteEmployee(e, emp.id, emp.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          title="Eliminar empleado"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!loading && filteredEmployees.length > 0 && (
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">
          {filteredEmployees.length} de {employees.length} colaboradores
        </p>
      )}

      {/* Drawer: Alta / Actualización */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}
          />

          {/* Panel */}
          <div className="w-full max-w-4xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">

            {/* Header */}
            <div className="flex items-center justify-between px-7 py-4 border-b bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                  isEditModalOpen ? "bg-amber-50" : "bg-primary/10"
                )}>
                  <UserIcon className={cn("h-4.5 w-4.5", isEditModalOpen ? "text-amber-600 h-[18px] w-[18px]" : "text-primary h-[18px] w-[18px]")} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 leading-tight">
                    {isEditModalOpen ? 'Actualizar Expediente' : 'Alta de Colaborador'}
                  </h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Olea Controls · Capital Humano</p>
                </div>
              </div>
              <button
                onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}
                className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">

              {/* Left nav */}
              <div className="w-52 bg-gray-50/80 border-r flex flex-col py-4 px-3 shrink-0 gap-1">
                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest px-2 mb-2">Secciones</p>
                {[
                  { id: 'PERSONAL',  label: 'Datos Personales', desc: 'Info. básica y docs',    icon: UserIcon,      accent: 'text-blue-500',   bg: 'bg-blue-50'    },
                  { id: 'CONTRACT',  label: 'Contratación',     desc: 'Puesto, nómina, docs',   icon: Briefcase,     accent: 'text-emerald-600',bg: 'bg-emerald-50' },
                  { id: 'TRACKING',  label: 'Seguimiento',      desc: 'Formación y evaluac.',   icon: Award,         accent: 'text-violet-500', bg: 'bg-violet-50'  },
                  { id: 'EXIT',      label: 'Baja',             desc: 'Docs de desvinculación', icon: FileText,      accent: 'text-red-500',    bg: 'bg-red-50'     },
                ].map((s, i) => {
                  const active = activeFormTab === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveFormTab(s.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group",
                        active ? "bg-white shadow-sm" : "hover:bg-white/70"
                      )}
                    >
                      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors", active ? s.bg : "bg-gray-100")}>
                        <s.icon className={cn("h-3.5 w-3.5 transition-colors", active ? s.accent : "text-gray-400")} />
                      </div>
                      <div className="min-w-0">
                        <p className={cn("text-[11px] font-black leading-tight truncate", active ? "text-gray-900" : "text-gray-500")}>
                          {i + 1}. {s.label}
                        </p>
                        <p className="text-[9px] font-medium text-gray-400 leading-tight mt-0.5 truncate">{s.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Form */}
              <form
                onSubmit={isEditModalOpen ? handleUpdateEmployee : handleCreateEmployee}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

                  {/* ── PERSONAL ── */}
                  {activeFormTab === 'PERSONAL' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      <DrawerSection title="Información Básica" icon={UserIcon} color="blue">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <InputField label="Nombre Completo *" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                          </div>
                          <InputField label="Fecha Nacimiento" type="date" value={formData.birthDate} onChange={v => setFormData({...formData, birthDate: v})} />
                          <InputField label="Lugar Nacimiento" value={formData.birthPlace} onChange={v => setFormData({...formData, birthPlace: v})} />
                          <InputField label="Nacionalidad" value={formData.nationality} onChange={v => setFormData({...formData, nationality: v})} />
                          <SelectField label="Estado Civil" value={formData.maritalStatus} options={['SOLTERO/A','CASADO/A','DIVORCIADO/A','VIUDO/A','UNIÓN LIBRE']} onChange={v => setFormData({...formData, maritalStatus: v})} />
                          <div className="col-span-2">
                            <InputField label="Dirección Completa" value={formData.address} onChange={v => setFormData({...formData, address: v})} />
                          </div>
                          <InputField label="Teléfono Celular" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
                          <InputField label="Email Corporativo *" type="email" value={formData.email} onChange={v => setFormData({...formData, email: v})} required />
                          <div className="col-span-2">
                            <InputField label="ID de Telegram" placeholder="Ej: 123456789" value={formData.telegramChatId} onChange={v => setFormData({...formData, telegramChatId: v})} />
                          </div>
                        </div>
                      </DrawerSection>

                      <DrawerSection title="Documentos de Identidad" icon={FileText} color="amber">
                        <div className="grid grid-cols-2 gap-3">
                          <InputField label="INE / ID" value={formData.ine} onChange={v => setFormData({...formData, ine: v})} />
                          <InputField label="CURP" value={formData.curp} onChange={v => setFormData({...formData, curp: v})} />
                          <InputField label="RFC" value={formData.rfc} onChange={v => setFormData({...formData, rfc: v})} />
                          <InputField label="NSS (IMSS)" value={formData.nss} onChange={v => setFormData({...formData, nss: v})} />
                          <FileField label="Acta de Nacimiento" value={formData.birthCertificate} onChange={v => setFormData({...formData, birthCertificate: v})} />
                          <FileField label="Comprobante Domicilio" value={formData.proofOfResidency} onChange={v => setFormData({...formData, proofOfResidency: v})} />
                          <FileField label="Identificación Oficial" value={formData.ineDoc} onChange={v => setFormData({...formData, ineDoc: v})} />
                          <FileField label="Currículum Vitae" value={formData.cv} onChange={v => setFormData({...formData, cv: v})} />
                        </div>
                      </DrawerSection>

                      <DrawerSection title="Contacto de Emergencia" icon={Shield} color="emerald">
                        <div className="grid grid-cols-2 gap-3">
                          <InputField label="Nombre" placeholder="Nombre completo..." value={formData.emergencyContactName} onChange={v => setFormData({...formData, emergencyContactName: v})} />
                          <InputField label="Teléfono" placeholder="Número de contacto..." value={formData.emergencyContactPhone} onChange={v => setFormData({...formData, emergencyContactPhone: v})} />
                        </div>
                      </DrawerSection>

                      <DrawerSection title="Accesos y Seguridad" icon={Lock} color="purple">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Roles del sistema</p>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.keys(ROLES).map(r => (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => toggleRole(ROLES[r])}
                                  className={cn(
                                    "px-3 py-2 rounded-lg text-[10px] font-black uppercase border transition-all",
                                    formData.roles.includes(ROLES[r])
                                      ? "bg-primary text-white border-primary shadow-sm"
                                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                                  )}
                                >
                                  {ROLE_LABELS[ROLES[r]]}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Credenciales</p>
                            <InputField
                              label="Email de acceso"
                              type="email"
                              value={formData.email}
                              onChange={v => setFormData({...formData, email: v})}
                              required
                              placeholder="correo@oleacontrols.com"
                            />
                            <div className="relative">
                              <InputField
                                label={isEditModalOpen ? "Nueva contraseña (opcional)" : "Contraseña temporal"}
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={v => setFormData({...formData, password: v})}
                                placeholder="••••••••"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-7 text-gray-400 hover:text-primary transition-colors"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </DrawerSection>
                    </div>
                  )}

                  {/* ── CONTRACT ── */}
                  {activeFormTab === 'CONTRACT' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      <DrawerSection title="Datos Laborales" icon={Briefcase} color="emerald">
                        <div className="grid grid-cols-2 gap-3">
                          <InputField label="N° Empleado" value={formData.employeeId} onChange={v => setFormData({...formData, employeeId: v})} />
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Puesto</label>
                            <select
                              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-primary/50 transition-all"
                              value={formData.position}
                              onChange={e => setFormData({...formData, position: e.target.value})}
                            >
                              <option value="">Seleccionar...</option>
                              {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <InputField label="Departamento" value={formData.department} onChange={v => setFormData({...formData, department: v})} />
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reporta a</label>
                            <select
                              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm outline-none focus:bg-white focus:border-primary/50 transition-all"
                              value={formData.reportsTo || ''}
                              onChange={e => setFormData({...formData, reportsTo: e.target.value})}
                            >
                              <option value="">Ninguno (Raíz)</option>
                              {employees.filter(e => e.id !== editingId).map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                              ))}
                            </select>
                          </div>
                          <InputField label="Fecha de Ingreso" type="date" value={formData.joinDate} onChange={v => setFormData({...formData, joinDate: v})} />
                          <SelectField label="Tipo de Contrato" value={formData.contractType} options={['INDEFINIDO','TEMPORAL','PROYECTO']} onChange={v => setFormData({...formData, contractType: v})} />
                          <div className="col-span-2">
                            <InputField label="Sueldo Mensual ($)" type="number" value={formData.salary} onChange={v => setFormData({...formData, salary: v})} />
                          </div>
                        </div>
                      </DrawerSection>

                      <DrawerSection title="Documentos de Contratación" icon={FileSignature} color="purple">
                        <div className="grid grid-cols-2 gap-3">
                          <FileField label="Contrato Firmado" value={formData.contractSigned} onChange={v => setFormData({...formData, contractSigned: v})} />
                          <FileField label="Aviso de Privacidad" value={formData.privacyPolicySigned} onChange={v => setFormData({...formData, privacyPolicySigned: v})} />
                          <FileField label="Reglamento Interno" value={formData.internalRulesSigned} onChange={v => setFormData({...formData, internalRulesSigned: v})} />
                          <FileField label="Alta en el IMSS" value={formData.imssHigh} onChange={v => setFormData({...formData, imssHigh: v})} />
                        </div>
                      </DrawerSection>

                      <DrawerSection title="Datos Bancarios y Nómina" icon={Landmark} color="purple">
                        <div className="grid grid-cols-3 gap-3">
                          <InputField label="Institución Bancaria" value={formData.bankName} onChange={v => setFormData({...formData, bankName: v})} />
                          <InputField label="Cuenta / CLABE" value={formData.bankAccount} onChange={v => setFormData({...formData, bankAccount: v})} />
                          <SelectField label="Frecuencia de Pago" value={formData.paymentType} options={['SEMANAL','QUINCENAL','MENSUAL']} onChange={v => setFormData({...formData, paymentType: v})} />
                        </div>
                      </DrawerSection>
                    </div>
                  )}

                  {/* ── TRACKING ── */}
                  {activeFormTab === 'TRACKING' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      <DrawerSection title="Formación y Academia" icon={Award} color="blue">
                        <div className="grid grid-cols-2 gap-3">
                          <FileField label="Certificado de Estudios" value={formData.studyCertificate} onChange={v => setFormData({...formData, studyCertificate: v})} />
                          <FileField label="Título / Cédula Profesional" value={formData.degreeOrProfessionalId} onChange={v => setFormData({...formData, degreeOrProfessionalId: v})} />
                          <FileField label="Diplomas / Cursos" value={formData.diplomasOrCourses} onChange={v => setFormData({...formData, diplomasOrCourses: v})} />
                          <FileField label="Certificaciones Laborales" value={formData.laborCertifications} onChange={v => setFormData({...formData, laborCertifications: v})} />
                          <FileField label="Cartas de Recomendación" value={formData.recommendationLetter} onChange={v => setFormData({...formData, recommendationLetter: v})} />
                          <FileField label="Capacitaciones Recibidas" value={formData.receivedTraining} onChange={v => setFormData({...formData, receivedTraining: v})} />
                        </div>
                      </DrawerSection>

                      <DrawerSection title="Desempeño e Incidencias" icon={Shield} color="amber">
                        <div className="grid grid-cols-2 gap-3">
                          <FileField label="Evaluaciones de Desempeño" value={formData.performanceEvaluations} onChange={v => setFormData({...formData, performanceEvaluations: v})} />
                          <FileField label="Actas Administrativas" value={formData.administrativeActs} onChange={v => setFormData({...formData, administrativeActs: v})} />
                          <FileField label="Reportes Disciplinarios" value={formData.disciplinaryReports} onChange={v => setFormData({...formData, disciplinaryReports: v})} />
                          <FileField label="Permisos / Licencias" value={formData.permitsOrLicenses} onChange={v => setFormData({...formData, permitsOrLicenses: v})} />
                        </div>
                      </DrawerSection>
                    </div>
                  )}

                  {/* ── EXIT ── */}
                  {activeFormTab === 'EXIT' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                        <div className="h-8 w-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-red-700">Expediente de Desvinculación</p>
                          <p className="text-[10px] font-medium text-red-400">Documentación para el cierre de ciclo del colaborador.</p>
                        </div>
                      </div>
                      <DrawerSection title="Documentos de Baja" icon={FileText} color="red">
                        <div className="grid grid-cols-2 gap-3">
                          <FileField label="Carta de Renuncia / Rescisión" value={formData.resignationLetter} onChange={v => setFormData({...formData, resignationLetter: v})} />
                          <FileField label="Finiquito / Liquidación" value={formData.settlementOrLiquidation} onChange={v => setFormData({...formData, settlementOrLiquidation: v})} />
                          <FileField label="Baja del IMSS" value={formData.imssLow} onChange={v => setFormData({...formData, imssLow: v})} />
                          <FileField label="Constancia Laboral" value={formData.laborConstancy} onChange={v => setFormData({...formData, laborConstancy: v})} />
                        </div>
                      </DrawerSection>
                    </div>
                  )}

                </div>

                {/* Footer */}
                <div className="border-t bg-white px-8 py-4 flex items-center gap-3 shrink-0">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-primary text-white py-2.5 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : isEditModalOpen ? 'Guardar Cambios' : 'Registrar Colaborador'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }}
                    className="px-6 py-2.5 bg-gray-100 text-gray-500 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Categorías (Puestos) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
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
                        placeholder="Nombre del puesto..."
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

                <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
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

function DrawerSection({ title, icon: Icon, color = "blue", children }) {
    const colors = {
        blue:    { bg: "bg-blue-50",    text: "text-blue-600"    },
        amber:   { bg: "bg-amber-50",   text: "text-amber-600"   },
        emerald: { bg: "bg-emerald-50", text: "text-emerald-600" },
        purple:  { bg: "bg-purple-50",  text: "text-purple-600"  },
        red:     { bg: "bg-red-50",     text: "text-red-500"     },
    }[color] || { bg: "bg-gray-100", text: "text-gray-500" };

    return (
        <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", colors.bg)}>
                    <Icon className={cn("h-3.5 w-3.5", colors.text)} />
                </div>
                <h4 className="text-[11px] font-black text-gray-700 uppercase tracking-widest">{title}</h4>
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}

function InputField({ label, value, onChange, type = "text", required = false, placeholder = "" }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
            <input
                type={type} required={required} placeholder={placeholder}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-primary/50 font-medium text-sm transition-all placeholder:text-gray-300"
                value={value || ''} onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}

function SelectField({ label, value, options, onChange, required = false }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
            <select
                required={required}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-primary/50 font-medium text-sm transition-all appearance-none"
                value={value || ''} onChange={e => onChange(e.target.value)}
            >
                <option value="">Seleccionar...</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
}

function FileField({ label, value, onChange }) {
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type !== 'application/pdf') { alert('Solo se permiten archivos PDF'); return; }
        if (file.size > 5 * 1024 * 1024) { alert('El archivo es demasiado grande (máx 5MB)'); return; }
        const base64 = await fileToBase64(file);
        onChange(base64);
    };

    const uid = `file-${label.replace(/\s+/g, '-')}`;
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
            <div className="group">
                <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id={uid} />
                <label
                    htmlFor={uid}
                    className={cn(
                        "flex items-center justify-between w-full px-3 py-2.5 border rounded-xl cursor-pointer transition-all",
                        value
                            ? "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                            : "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                    )}
                >
                    <div className="flex items-center gap-2">
                        <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0", value ? "bg-emerald-500" : "bg-gray-200")}>
                            {value
                                ? <Check className="h-3.5 w-3.5 text-white" />
                                : <Upload className="h-3.5 w-3.5 text-gray-400" />
                            }
                        </div>
                        <span className={cn("text-[11px] font-bold truncate max-w-[120px]", value ? "text-emerald-700" : "text-gray-400")}>
                            {value ? "Cargado" : "Subir PDF"}
                        </span>
                    </div>
                    {value && (
                        <button
                            type="button"
                            onClick={e => { e.preventDefault(); onChange(''); }}
                            className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </label>
            </div>
        </div>
    );
}
