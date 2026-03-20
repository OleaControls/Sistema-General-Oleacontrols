import React, { useState, useEffect } from 'react';
import { 
  UserPlus, Briefcase, ChevronRight, Search, Clock, Mail, 
  Plus, X, User, Phone, FileText, CheckCircle2, Trash2, Shield, Upload, 
  FileSignature, Award, Lock, Landmark, Eye, EyeOff, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hrService } from '@/api/hrService';
import { ROLES } from '@/store/AuthContext';

const PIPELINE = [
  { id: 'APPLIED', label: 'Postulados', color: 'bg-gray-50/50', border: 'border-gray-200' },
  { id: 'SCREENING', label: 'Entrevista RH', color: 'bg-blue-50/30', border: 'border-blue-100' },
  { id: 'TECHNICAL', label: 'Prueba Técnica', color: 'bg-purple-50/30', border: 'border-purple-100' },
  { id: 'OFFER', label: 'Oferta / Contratación', color: 'bg-emerald-50/30', border: 'border-emerald-100' }
];

const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.HR]: 'RH',
  [ROLES.OPS]: 'Super',
  [ROLES.TECH]: 'Tech',
  [ROLES.SALES]: 'Ventas',
  [ROLES.COLLABORATOR]: 'Colab'
};

export default function Recruitment() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedCandidate, setDraggedCandidate] = useState(null);
  
  const [newCandidate, setNewCandidate] = useState({
    name: '', email: '', phone: '', position: '', source: 'Web', notes: ''
  });

  // Estado para la conversión a empleado
  const initialForm = {
    name: '', email: '', phone: '', birthDate: '', birthPlace: '', nationality: '', maritalStatus: 'SOLTERO/A', address: '', emergencyContactName: '', emergencyContactPhone: '',
    ine: '', curp: '', rfc: '', nss: '', birthCertificate: '', proofOfResidency: '', cv: '',
    contractSigned: '', privacyPolicySigned: '', internalRulesSigned: '', imssHigh: '',
    studyCertificate: '', degreeOrProfessionalId: '', diplomasOrCourses: '', laborCertifications: '', recommendationLetter: '',
    performanceEvaluations: '', receivedTraining: '', administrativeActs: '', disciplinaryReports: '', permitsOrLicenses: '',
    resignationLetter: '', settlementOrLiquidation: '', imssLow: '', laborConstancy: '',
    employeeId: '', position: '', department: '', joinDate: new Date().toISOString().split('T')[0], contractType: 'INDEFINIDO', workSchedule: '', salary: '', roles: [ROLES.COLLABORATOR], reportsTo: '',
    bankName: '', bankAccount: '', paymentType: 'QUINCENAL', password: ''
  };
  const [employeeForm, setEmployeeForm] = useState(initialForm);
  const [activeFormTab, setActiveFormTab] = useState('PERSONAL');
  const [convertingCandidateId, setConvertCandidateId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [candData, catData, empData] = await Promise.all([
        hrService.getCandidates(),
        hrService.getCategories(),
        hrService.getEmployees()
      ]);
      setCandidates(candData);
      setCategories(catData);
      setEmployees(empData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await hrService.saveCandidate(newCandidate);
      setShowAddModal(false);
      setNewCandidate({ name: '', email: '', phone: '', position: '', source: 'Web', notes: '' });
      loadData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateCandidateStage = async (id, newStage) => {
    try {
      await hrService.updateCandidate(id, { stage: newStage });
      loadData();
    } catch (err) {
      alert("Error al mover candidato");
    }
  };

  const handleDeleteCandidate = async (id, name) => {
    if (!confirm(`¿Eliminar candidato ${name}?`)) return;
    try {
      await hrService.deleteCandidate(id);
      loadData();
    } catch (err) {
      alert("Error al eliminar");
    }
  };

  const startConversion = (candidate) => {
    setConvertCandidateId(candidate.id);
    setEmployeeForm({
      ...initialForm,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone || '',
      position: candidate.position || '',
    });
    setShowConvertModal(true);
  };

  const handleFinishConversion = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Crear Empleado
      await hrService.saveEmployee(employeeForm);
      // 2. Eliminar Candidato
      await hrService.deleteCandidate(convertingCandidateId);
      
      setShowConvertModal(false);
      alert("Colaborador dado de alta exitosamente y removido de reclutamiento.");
      loadData();
    } catch (error) {
      alert(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center font-black text-gray-300 animate-pulse uppercase tracking-[0.3em]">Sincronizando ATS...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-12rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Reclutamiento (ATS)</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Gestión de vacantes y seguimiento de candidatos.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
          >
            <Plus className="h-4 w-4" /> Nuevo Candidato
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-hidden">
        {PIPELINE.map((stage) => {
          const stageCandidates = candidates.filter(c => c.stage === stage.id);
          return (
            <div key={stage.id} className="flex flex-col h-full" onDragOver={(e) => e.preventDefault()} onDrop={() => draggedCandidate && updateCandidateStage(draggedCandidate.id, stage.id)}>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="font-black text-[11px] text-gray-900 uppercase tracking-widest">{stage.label}</h3>
                <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full">{stageCandidates.length}</span>
              </div>
              
              <div className={cn("flex-1 rounded-[2.5rem] p-3 space-y-3 overflow-y-auto border border-dashed", stage.color, stage.border)}>
                {stageCandidates.map(cand => (
                  <div 
                    key={cand.id} 
                    draggable 
                    onDragStart={() => setDraggedCandidate(cand)}
                    className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing group relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg uppercase">{cand.position || 'General'}</span>
                      <button onClick={() => handleDeleteCandidate(cand.id, cand.name)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <h4 className="font-black text-gray-900 text-sm leading-tight mb-1 group-hover:text-primary transition-colors">{cand.name}</h4>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mb-4 italic">
                      <Mail className="h-3 w-3" /> {cand.email}
                    </div>
                    
                    <div className="pt-4 border-t border-gray-50">
                      {stage.id === 'OFFER' ? (
                        <button 
                          onClick={() => startConversion(cand)}
                          className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Convertir a Empleado
                        </button>
                      ) : (
                        <div className="flex justify-between items-center">
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{cand.source}</span>
                           <div className="h-6 w-6 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-primary group-hover:text-white transition-all">
                             <ChevronRight className="h-3 w-3" />
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Agregar Candidato */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <form onSubmit={handleAddCandidate} className="p-10 space-y-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Nuevo Candidato</h3>
                <button type="button" onClick={() => setShowAddModal(false)}><X className="h-6 w-6 text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <InputField label="Nombre Completo" value={newCandidate.name} onChange={v => setNewCandidate({...newCandidate, name: v})} required />
                <InputField label="Email" type="email" value={newCandidate.email} onChange={v => setNewCandidate({...newCandidate, email: v})} required />
                <InputField label="Teléfono" value={newCandidate.phone} onChange={v => setNewCandidate({...newCandidate, phone: v})} />
                <InputField label="Puesto / Vacante" value={newCandidate.position} onChange={v => setNewCandidate({...newCandidate, position: v})} />
              </div>
              <button type="submit" disabled={isSaving} className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all disabled:opacity-50">
                {isSaving ? 'Guardando...' : 'Registrar Candidato'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Conversión a Empleado (Inspirado en EmployeeDirectory) */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 duration-500">
            <div className="p-8 border-b flex justify-between items-center bg-emerald-50/50">
                <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                      <UserPlus className="h-7 w-7 text-emerald-600" /> Alta de Nuevo Colaborador
                    </h3>
                    <p className="text-xs font-bold text-emerald-600/60 uppercase tracking-widest mt-1 italic">Convirtiendo candidato: {employeeForm.name}</p>
                </div>
                <button onClick={() => setShowConvertModal(false)} className="p-3 bg-white border rounded-2xl shadow-sm hover:bg-gray-100 transition-colors"><X className="h-6 w-6 text-gray-400" /></button>
            </div>

            <div className="flex border-b bg-gray-50/50 px-8">
                {[
                    { id: 'PERSONAL', label: '1. Datos Personales', icon: User },
                    { id: 'CONTRACT', label: '2. Contratación', icon: FileSignature },
                    { id: 'TRACKING', label: '3. Seguimiento', icon: Clock }
                ].map(tab => (
                    <button 
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveFormTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                            activeFormTab === tab.id ? "border-emerald-500 text-emerald-600 bg-white" : "border-transparent text-gray-400 hover:text-gray-600"
                        )}
                    >
                        <tab.icon className="h-4 w-4" /> {tab.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleFinishConversion} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeFormTab === 'PERSONAL' && (
                    <div className="space-y-10 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <SectionHeader title="Información Básica" icon={User} color="blue" />
                                <div className="grid grid-cols-1 gap-4">
                                    <InputField label="Nombre Completo" value={employeeForm.name} onChange={v => setEmployeeForm({...employeeForm, name: v})} required />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="Fecha Nacimiento" type="date" value={employeeForm.birthDate} onChange={v => setEmployeeForm({...employeeForm, birthDate: v})} />
                                        <InputField label="Lugar Nacimiento" value={employeeForm.birthPlace} onChange={v => setEmployeeForm({...employeeForm, birthPlace: v})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="Nacionalidad" value={employeeForm.nationality} onChange={v => setEmployeeForm({...employeeForm, nationality: v})} />
                                        <SelectField label="Estado Civil" value={employeeForm.maritalStatus} options={['SOLTERO/A', 'CASADO/A', 'DIVORCIADO/A', 'VIUDO/A', 'UNIÓN LIBRE']} onChange={v => setEmployeeForm({...employeeForm, maritalStatus: v})} />
                                    </div>
                                    <InputField label="Dirección Completa" value={employeeForm.address} onChange={v => setEmployeeForm({...employeeForm, address: v})} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputField label="Teléfono Celular" value={employeeForm.phone} onChange={v => setEmployeeForm({...employeeForm, phone: v})} />
                                        <InputField label="Email Corporativo" type="email" value={employeeForm.email} onChange={v => setEmployeeForm({...employeeForm, email: v})} required />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <SectionHeader title="Documentos de Identidad" icon={FileText} color="amber" />
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="INE / ID (Número)" value={employeeForm.ine} onChange={v => setEmployeeForm({...employeeForm, ine: v})} />
                                    <InputField label="CURP (Clave)" value={employeeForm.curp} onChange={v => setEmployeeForm({...employeeForm, curp: v})} />
                                    <InputField label="RFC (SAT)" value={employeeForm.rfc} onChange={v => setEmployeeForm({...employeeForm, rfc: v})} />
                                    <InputField label="NSS (IMSS)" value={employeeForm.nss} onChange={v => setEmployeeForm({...employeeForm, nss: v})} />
                                    <FileField label="Acta de Nacimiento" value={employeeForm.birthCertificate} onChange={v => setEmployeeForm({...employeeForm, birthCertificate: v})} />
                                    <FileField label="Comprobante Domicilio" value={employeeForm.proofOfResidency} onChange={v => setEmployeeForm({...employeeForm, proofOfResidency: v})} />
                                    <FileField label="Identificación Oficial" value={employeeForm.ineDoc} onChange={v => setEmployeeForm({...employeeForm, ineDoc: v})} />
                                    <FileField label="Currículum Vitae (CV)" value={employeeForm.cv} onChange={v => setEmployeeForm({...employeeForm, cv: v})} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeFormTab === 'CONTRACT' && (
                    <div className="space-y-10 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <SectionHeader title="Datos Laborales Actuales" icon={Briefcase} color="emerald" />
                                <div className="grid grid-cols-2 gap-4">
                                    <InputField label="Número Empleado" value={employeeForm.employeeId} onChange={v => setEmployeeForm({...employeeForm, employeeId: v})} />
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Puesto</label>
                                        <select className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-[1.25rem] font-bold text-sm outline-none focus:bg-white focus:border-primary/30" value={employeeForm.position} onChange={e => setEmployeeForm({...employeeForm, position: e.target.value})}>
                                            <option value="">Seleccionar...</option>
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <InputField label="Departamento" value={employeeForm.department} onChange={v => setEmployeeForm({...employeeForm, department: v})} />
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Reporta a (Superior)</label>
                                        <select 
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-transparent rounded-[1.25rem] font-bold text-sm outline-none focus:bg-white focus:border-primary/30" 
                                            value={employeeForm.reportsTo || ''} 
                                            onChange={e => setEmployeeForm({...employeeForm, reportsTo: e.target.value})}
                                        >
                                            <option value="">Ninguno (Nivel Raíz)</option>
                                            {employees.map(emp => (
                                                <option key={emp.id} value={emp.id}>{emp.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <InputField label="Fecha Ingreso" type="date" value={employeeForm.joinDate} onChange={v => setEmployeeForm({...employeeForm, joinDate: v})} />
                                    <SelectField label="Tipo Contrato" value={employeeForm.contractType} options={['INDEFINIDO', 'TEMPORAL', 'PROYECTO']} onChange={v => setEmployeeForm({...employeeForm, contractType: v})} />
                                    <InputField label="Sueldo Mensual" type="number" value={employeeForm.salary} onChange={v => setEmployeeForm({...employeeForm, salary: v})} />
                                </div>
                            </div>

                            <div className="space-y-6">
                                <SectionHeader title="Expediente de Contratación" icon={FileSignature} color="purple" />
                                <div className="grid grid-cols-2 gap-4">
                                    <FileField label="Contrato Firmado" value={employeeForm.contractSigned} onChange={v => setEmployeeForm({...employeeForm, contractSigned: v})} />
                                    <FileField label="Aviso Privacidad" value={employeeForm.privacyPolicySigned} onChange={v => setEmployeeForm({...employeeForm, privacyPolicySigned: v})} />
                                    <FileField label="Reglamento Interno" value={employeeForm.internalRulesSigned} onChange={v => setEmployeeForm({...employeeForm, internalRulesSigned: v})} />
                                    <FileField label="Alta en el IMSS" value={employeeForm.imssHigh} onChange={v => setEmployeeForm({...employeeForm, imssHigh: v})} />
                                </div>
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
                                                onClick={() => {
                                                  const current = employeeForm.roles || [];
                                                  const role = ROLES[r];
                                                  const newRoles = current.includes(role) ? current.filter(rv => rv !== role) : [...current, role];
                                                  setEmployeeForm({...employeeForm, roles: newRoles});
                                                }} 
                                                className={cn(
                                                    "px-3 py-2 rounded-xl text-[9px] font-black uppercase border transition-all", 
                                                    employeeForm.roles.includes(ROLES[r]) 
                                                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md" 
                                                        : "bg-white text-gray-400 border-gray-100"
                                                )}
                                            >
                                                {ROLE_LABELS[ROLES[r]]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <InputField label="Contraseña de Acceso" type="password" value={employeeForm.password} onChange={v => setEmployeeForm({...employeeForm, password: v})} required placeholder="••••••••" />
                                </div>
                             </div>
                        </div>
                    </div>
                )}

                {activeFormTab === 'TRACKING' && (
                    <div className="space-y-10 animate-in fade-in duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <SectionHeader title="Formación y Academia" icon={Award} color="blue" />
                                <div className="grid grid-cols-2 gap-4">
                                    <FileField label="Certificado Estudios" value={employeeForm.studyCertificate} onChange={v => setEmployeeForm({...employeeForm, studyCertificate: v})} />
                                    <FileField label="Título / Cédula" value={employeeForm.degreeOrProfessionalId} onChange={v => setEmployeeForm({...employeeForm, degreeOrProfessionalId: v})} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-12 flex gap-4">
                    <button type="submit" disabled={isSaving} className="flex-1 bg-emerald-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-emerald-200 hover:scale-[1.02] transition-all disabled:opacity-50">
                        {isSaving ? 'Procesando...' : 'Finalizar Alta y Contratación'}
                    </button>
                    <button type="button" onClick={() => setShowConvertModal(false)} className="px-10 py-5 bg-gray-100 text-gray-400 rounded-[2rem] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers components (Same as EmployeeDirectory)
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
                    id={`file-convert-${label}`}
                />
                <label 
                    htmlFor={`file-convert-${label}`}
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
