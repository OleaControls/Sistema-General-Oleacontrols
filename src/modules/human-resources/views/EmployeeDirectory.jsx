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
    password: ''
  };

  const [formData, setFormData] = useState(initialForm);
  const [activeFormTab, setActiveFormTab] = useState('PERSONAL');
  const [editingId, setEditingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

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

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
            [1,2,3].map(i => <div key={i} className="h-48 bg-white rounded-[2rem] border animate-pulse" />)
        ) : employees.map((emp) => (
          <div key={emp.id} className="bg-white rounded-[2rem] border p-6 hover:shadow-xl transition-all cursor-pointer relative group" onClick={() => navigate(`/hr/employee/${emp.id}`)}>
            <div className="flex justify-between items-start mb-4">
                <img src={emp.avatar} className="h-14 w-14 rounded-2xl border-2 border-gray-50" />
                <div className="flex gap-2">
                    <button onClick={(e) => openEdit(e, emp)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:text-primary transition-colors"><Edit2 className="h-4 w-4" /></button>
                    {emp.id !== currentUser.id && (
                        <button onClick={(e) => handleDeleteEmployee(e, emp.id, emp.name)} className="p-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 className="h-4 w-4" /></button>
                    )}
                </div>
            </div>
            <h3 className="font-black text-gray-900">{emp.name}</h3>
            <p className="text-[10px] font-black text-primary uppercase mb-4 tracking-widest">{emp.position || 'Sin Puesto Asignado'}</p>
            <div className="space-y-2 border-t pt-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 font-bold"><Mail className="h-3.5 w-3.5" /> {emp.email}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500 font-bold"><Phone className="h-3.5 w-3.5" /> {emp.phone || 'N/A'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Full Record Modal */}
      {(isModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="p-8 border-b flex justify-between items-center bg-gray-50/50">
                <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">{isEditModalOpen ? 'Actualizar Expediente' : 'Alta de Nuevo Colaborador'}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Olea Controls - Capital Humano</p>
                </div>
                <button onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }} className="p-3 bg-white border rounded-2xl shadow-sm hover:bg-gray-100 transition-colors"><X className="h-6 w-6 text-gray-400" /></button>
            </div>

            <div className="flex border-b bg-gray-50/50 px-8">
                {[
                    { id: 'PERSONAL', label: '1. Datos Personales', icon: UserIcon },
                    { id: 'CONTRACT', label: '2. Contratación', icon: FileSignature },
                    { id: 'TRACKING', label: '3. Seguimiento', icon: Clock },
                    { id: 'EXIT', label: '4. Baja', icon: X }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveFormTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                            activeFormTab === tab.id ? "border-primary text-primary bg-white" : "border-transparent text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <tab.icon className="h-4 w-4" /> {tab.label}
                    </button>
                ))}
            </div>

            <form onSubmit={isEditModalOpen ? handleUpdateEmployee : handleCreateEmployee} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeFormTab === 'PERSONAL' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <SectionHeader title="Información Básica" icon={UserIcon} color="blue" />
                                <div className="grid grid-cols-1 gap-4">
                                    <InputField label="Nombre Completo" value={formData.name} onChange={v => setFormData({...formData, name: v})} required />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="Fecha Nacimiento" type="date" value={formData.birthDate} onChange={v => setFormData({...formData, birthDate: v})} />
                                        <InputField label="Lugar Nacimiento" value={formData.birthPlace} onChange={v => setFormData({...formData, birthPlace: v})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="Nacionalidad" value={formData.nationality} onChange={v => setFormData({...formData, nationality: v})} />
                                        <SelectField label="Estado Civil" value={formData.maritalStatus} options={['SOLTERO/A', 'CASADO/A', 'DIVORCIADO/A', 'VIUDO/A', 'UNIÓN LIBRE']} onChange={v => setFormData({...formData, maritalStatus: v})} />
                                    </div>
                                    <InputField label="Dirección Completa" value={formData.address} onChange={v => setFormData({...formData, address: v})} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="Teléfono Celular" value={formData.phone} onChange={v => setFormData({...formData, phone: v})} />
                                        <InputField label="Email Corporativo" type="email" value={formData.email} onChange={v => setFormData({...formData, email: v})} required />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <SectionHeader title="Documentos de Identidad" icon={FileText} color="amber" />
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="INE / ID (Número)" value={formData.ine} onChange={v => setFormData({...formData, ine: v})} />
                                    <InputField label="CURP (Clave)" value={formData.curp} onChange={v => setFormData({...formData, curp: v})} />
                                    <InputField label="RFC (SAT)" value={formData.rfc} onChange={v => setFormData({...formData, rfc: v})} />
                                    <InputField label="NSS (IMSS)" value={formData.nss} onChange={v => setFormData({...formData, nss: v})} />
                                    <FileField label="Acta de Nacimiento" value={formData.birthCertificate} onChange={v => setFormData({...formData, birthCertificate: v})} />
                                    <FileField label="Comprobante Domicilio" value={formData.proofOfResidency} onChange={v => setFormData({...formData, proofOfResidency: v})} />
                                    <FileField label="Identificación Oficial" value={formData.ineDoc} onChange={v => setFormData({...formData, ineDoc: v})} />
                                    <FileField label="Currículum Vitae (CV)" value={formData.cv} onChange={v => setFormData({...formData, cv: v})} />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 rounded-[2.5rem] border border-gray-100">
                             <SectionHeader title="Contacto de Emergencia" icon={Shield} color="emerald" />
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                <InputField label="Nombre del Contacto" placeholder="Nombre completo..." value={formData.emergencyContactName} onChange={v => setFormData({...formData, emergencyContactName: v})} />
                                <InputField label="Teléfono del Contacto" placeholder="Número de contacto..." value={formData.emergencyContactPhone} onChange={v => setFormData({...formData, emergencyContactPhone: v})} />
                             </div>
                        </div>

                        <div className="p-8 bg-indigo-50/30 rounded-[2.5rem] border border-indigo-100 space-y-6">
                             <SectionHeader title="Accesos y Seguridad" icon={Lock} color="purple" />
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Asignación de Roles</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.keys(ROLES).map(r => (
                                            <button 
                                                key={r} 
                                                type="button" 
                                                onClick={() => toggleRole(ROLES[r])} 
                                                className={cn(
                                                    "px-3 py-2 rounded-xl text-[9px] font-black uppercase border transition-all", 
                                                    formData.roles.includes(ROLES[r]) 
                                                        ? "bg-primary text-white border-primary shadow-md" 
                                                        : "bg-white text-gray-400 border-gray-100"
                                                )}
                                            >
                                                {ROLE_LABELS[ROLES[r]]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Credenciales de Acceso</p>
                                    <div className="space-y-4">
                                        <InputField 
                                            label="Email de Acceso (Usuario)" 
                                            type="email" 
                                            value={formData.email} 
                                            onChange={v => setFormData({...formData, email: v})} 
                                            required 
                                            placeholder="correo@oleacontrols.com"
                                        />
                                        <div className="relative">
                                            <InputField 
                                                label={isEditModalOpen ? "Cambiar Contraseña" : "Contraseña Temporal"} 
                                                type={showPassword ? "text" : "password"} 
                                                value={formData.password} 
                                                onChange={v => setFormData({...formData, password: v})} 
                                                placeholder="••••••••"
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-8 text-gray-400 hover:text-primary"
                                            >
                                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {activeFormTab === 'CONTRACT' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <SectionHeader title="Datos Laborales Actuales" icon={Briefcase} color="emerald" />
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Número Empleado" value={formData.employeeId} onChange={v => setFormData({...formData, employeeId: v})} />
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Puesto</label>
                                        <select className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-[1.25rem] font-bold text-sm outline-none focus:bg-white focus:border-primary/30" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>
                                            <option value="">Seleccionar...</option>
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <InputField label="Departamento" value={formData.department} onChange={v => setFormData({...formData, department: v})} />
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Reporta a (Superior)</label>
                                        <select 
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-[1.25rem] font-bold text-sm outline-none focus:bg-white focus:border-primary/30" 
                                            value={formData.reportsTo || ''} 
                                            onChange={e => setFormData({...formData, reportsTo: e.target.value})}
                                        >
                                            <option value="">Ninguno (Nivel Raíz)</option>
                                            {employees.filter(e => e.id !== editingId).map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <InputField label="Fecha Ingreso" type="date" value={formData.joinDate} onChange={v => setFormData({...formData, joinDate: v})} />
                                    <SelectField label="Tipo Contrato" value={formData.contractType} options={['INDEFINIDO', 'TEMPORAL', 'PROYECTO']} onChange={v => setFormData({...formData, contractType: v})} />
                                    <InputField label="Sueldo Mensual" type="number" value={formData.salary} onChange={v => setFormData({...formData, salary: v})} />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <SectionHeader title="Expediente de Contratación" icon={FileSignature} color="purple" />
                                <div className="grid grid-cols-2 gap-4">
                                    <FileField label="Contrato Firmado" value={formData.contractSigned} onChange={v => setFormData({...formData, contractSigned: v})} />
                                    <FileField label="Aviso Privacidad" value={formData.privacyPolicySigned} onChange={v => setFormData({...formData, privacyPolicySigned: v})} />
                                    <FileField label="Reglamento Interno" value={formData.internalRulesSigned} onChange={v => setFormData({...formData, internalRulesSigned: v})} />
                                    <FileField label="Alta en el IMSS" value={formData.imssHigh} onChange={v => setFormData({...formData, imssHigh: v})} />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-purple-50/30 rounded-[2.5rem] border border-purple-100">
                             <SectionHeader title="Datos Bancarios y Nómina" icon={Landmark} color="purple" />
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                                <InputField label="Institución Bancaria" value={formData.bankName} onChange={v => setFormData({...formData, bankName: v})} />
                                <InputField label="Cuenta / CLABE" value={formData.bankAccount} onChange={v => setFormData({...formData, bankAccount: v})} />
                                <SelectField label="Frecuencia Pago" value={formData.paymentType} options={['SEMANAL', 'QUINCENAL', 'MENSUAL']} onChange={v => setFormData({...formData, paymentType: v})} />
                             </div>
                        </div>
                    </div>
                )}

                {activeFormTab === 'TRACKING' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <SectionHeader title="Formación y Academia" icon={Award} color="blue" />
                                <div className="grid grid-cols-2 gap-4">
                                    <FileField label="Certificado Estudios" value={formData.studyCertificate} onChange={v => setFormData({...formData, studyCertificate: v})} />
                                    <FileField label="Título / Cédula" value={formData.degreeOrProfessionalId} onChange={v => setFormData({...formData, degreeOrProfessionalId: v})} />
                                    <FileField label="Diplomas / Cursos" value={formData.diplomasOrCourses} onChange={v => setFormData({...formData, diplomasOrCourses: v})} />
                                    <FileField label="Certificaciones" value={formData.laborCertifications} onChange={v => setFormData({...formData, laborCertifications: v})} />
                                    <FileField label="Cartas Recomendación" value={formData.recommendationLetter} onChange={v => setFormData({...formData, recommendationLetter: v})} />
                                    <FileField label="Capacitaciones" value={formData.receivedTraining} onChange={v => setFormData({...formData, receivedTraining: v})} />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <SectionHeader title="Desempeño e Incidencias" icon={Shield} color="amber" />
                                <div className="grid grid-cols-2 gap-4">
                                    <FileField label="Evaluaciones Desempeño" value={formData.performanceEvaluations} onChange={v => setFormData({...formData, performanceEvaluations: v})} />
                                    <FileField label="Actas Administrativas" value={formData.administrativeActs} onChange={v => setFormData({...formData, administrativeActs: v})} />
                                    <FileField label="Reportes Disciplinarios" value={formData.disciplinaryReports} onChange={v => setFormData({...formData, disciplinaryReports: v})} />
                                    <FileField label="Permisos / Licencias" value={formData.permitsOrLicenses} onChange={v => setFormData({...formData, permitsOrLicenses: v})} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeFormTab === 'EXIT' && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-300">
                        <div className="max-w-2xl mx-auto p-10 bg-red-50/30 rounded-[3rem] border border-red-100 text-center space-y-8">
                            <div className="h-20 w-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm">
                                <X className="h-10 w-10" />
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-xl font-black text-gray-900">Expediente de Desvinculación</h4>
                                <p className="text-sm text-gray-500 font-medium italic">Documentación para el cierre de ciclo del colaborador.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                                <FileField label="Carta Renuncia / Rescisión" value={formData.resignationLetter} onChange={v => setFormData({...formData, resignationLetter: v})} />
                                <FileField label="Finiquito / Liquidación" value={formData.settlementOrLiquidation} onChange={v => setFormData({...formData, settlementOrLiquidation: v})} />
                                <FileField label="Baja del IMSS" value={formData.imssLow} onChange={v => setFormData({...formData, imssLow: v})} />
                                <FileField label="Constancia Laboral" value={formData.laborConstancy} onChange={v => setFormData({...formData, laborConstancy: v})} />
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-12 flex gap-4">
                    <button type="submit" disabled={isSaving} className="flex-1 bg-primary text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50">
                        {isSaving ? 'Procesando...' : (isEditModalOpen ? 'Guardar Cambios en Expediente' : 'Finalizar Alta de Colaborador')}
                    </button>
                    <button type="button" onClick={() => { setIsModalOpen(false); setIsEditModalOpen(false); }} className="px-10 py-5 bg-gray-100 text-gray-400 rounded-[2rem] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                </div>
            </form>
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

function InputField({ label, value, onChange, type = "text", required = false, placeholder = "" }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{label} {required && '*'}</label>
            <input 
                type={type} required={required} placeholder={placeholder}
                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-[1.25rem] outline-none focus:bg-white focus:border-primary/30 font-bold text-sm transition-all"
                value={value || ''} onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}

function SelectField({ label, value, options, onChange, required = false }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
            <select 
                required={required}
                className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-[1.25rem] outline-none focus:bg-white focus:border-primary/30 font-bold text-sm transition-all appearance-none"
                value={value || ''} onChange={e => onChange(e.target.value)}
            >
                <option value="">Seleccionar...</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    );
}

function SectionHeader({ title, icon: Icon, color = "blue" }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600",
        amber: "bg-amber-50 text-amber-600",
        emerald: "bg-emerald-50 text-emerald-600",
        purple: "bg-purple-50 text-purple-600",
        red: "bg-red-50 text-red-600"
    };

    return (
        <div className="flex items-center gap-3 border-b pb-4">
            <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", colors[color])}>
                <Icon className="h-5 w-5" />
            </div>
            <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">{title}</h4>
        </div>
    );
}

function FileField({ label, value, onChange }) {
    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                alert('Solo se permiten archivos PDF');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert('El archivo es demasiado grande (máx 5MB)');
                return;
            }
            const base64 = await fileToBase64(file);
            onChange(base64);
        }
    };

    return (
        <div className="space-y-1.5">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative group">
                <input 
                    type="file" 
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id={`file-${label}`}
                />
                <label 
                    htmlFor={`file-${label}`}
                    className={cn(
                        "flex items-center justify-between w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-[1.25rem] cursor-pointer hover:bg-gray-100 transition-all group-hover:border-primary/30",
                        value ? "border-emerald-100 bg-emerald-50/30" : ""
                    )}
                >
                    <div className="flex items-center gap-3">
                        {value ? (
                            <div className="h-8 w-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                                <Check className="h-4 w-4" />
                            </div>
                        ) : (
                            <div className="h-8 w-8 rounded-lg bg-gray-200 text-gray-400 flex items-center justify-center">
                                <Upload className="h-4 w-4" />
                            </div>
                        )}
                        <span className={cn("text-xs font-bold", value ? "text-emerald-700" : "text-gray-400")}>
                            {value ? "Archivo Cargado" : "Subir PDF"}
                        </span>
                    </div>
                    {value && (
                        <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); onChange(''); }}
                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </label>
            </div>
        </div>
    );
}
