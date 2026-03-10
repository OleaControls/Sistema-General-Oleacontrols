import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Award, Briefcase, Calendar, ShieldCheck, FileText, Download, User, FileSignature, Palmtree, HardHat, MoreVertical,
  Zap, Star, CheckCircle, Target, TrendingUp, Users, DollarSign
} from 'lucide-react';

// --- NUEVO: Componente de Métricas y Bonos ---
const MetricsSection = ({ targetId }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch(`/api/evaluations?targetId=${targetId}&days=15`);
        if (!res.ok) return;
        const data = await res.json();
        setMetrics(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [targetId]);

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-pulse">
      {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-3xl" />)}
    </div>
  );
  
  if (!metrics || metrics.total === 0) return (
    <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl mb-8 flex items-center gap-4 text-amber-700">
        <Star className="h-6 w-6" />
        <div>
            <p className="text-xs font-black uppercase tracking-widest">Sin Evaluaciones Recientes (15 días)</p>
            <p className="text-[10px] font-bold opacity-70">Aún no hay datos suficientes para calcular el bono de este periodo.</p>
        </div>
    </div>
  );

  const avgTotal = (metrics.avgScore1 + metrics.avgScore2 + (metrics.avgScore3 || 0)) / (metrics.avgScore3 ? 3 : 2);
  
  // Lógica de Bonos OleaControls (15 días):
  let projectedBonus = 0;
  if (avgTotal >= 4.8) projectedBonus = 1500;
  else if (avgTotal >= 4.5) projectedBonus = 1000;
  else if (avgTotal >= 4.0) projectedBonus = 500;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2 border-amber-100">
            <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Satisfacción</p>
                <Star className="h-4 w-4 text-amber-400 fill-current" />
            </div>
            <p className="text-3xl font-black text-amber-500">{metrics.avgScore1.toFixed(1)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2 border-blue-100">
            <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Liderazgo/Proc.</p>
                <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-3xl font-black text-blue-500">{metrics.avgScore2.toFixed(1)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2">
            <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Feedback</p>
                <Users className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-3xl font-black text-gray-900">{metrics.total}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-3xl shadow-xl text-white space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                <DollarSign className="h-12 w-12" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Bono Proyectado</p>
            <p className="text-3xl font-black">${projectedBonus.toLocaleString()}</p>
            <p className="text-[8px] font-bold uppercase mt-1 opacity-60">Meta: {avgTotal.toFixed(1)} prome.</p>
        </div>
    </div>
  );
};
import { hrService } from '@/api/hrService';
import { ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

const PROFILE_TABS = [
  { id: 'OVERVIEW', label: 'Resumen y KPIs', icon: User },
  { id: 'DOCUMENTS', label: 'Docs. y Contratos', icon: FileSignature },
  { id: 'TIMEOFF', label: 'Asistencia y Vacaciones', icon: Palmtree },
  { id: 'ASSETS', label: 'Inventario y EPP', icon: HardHat }
];

const ROLE_CONFIG = {
    [ROLES.ADMIN]: { label: 'Administrador', color: 'bg-red-50 text-red-600 border-red-100', icon: ShieldCheck },
    [ROLES.HR]: { label: 'Recursos Humanos', color: 'bg-purple-50 text-purple-600 border-purple-100', icon: Users },
    [ROLES.OPS]: { label: 'Supervisor de Operaciones', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: HardHat },
    [ROLES.TECH]: { label: 'Técnico Especialista', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: Zap },
    [ROLES.SALES]: { label: 'Consultor de Ventas', color: 'bg-orange-50 text-orange-600 border-orange-100', icon: TrendingUp },
    [ROLES.COLLABORATOR]: { label: 'Colaborador', color: 'bg-gray-50 text-gray-600 border-gray-100', icon: User }
};

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');

  useEffect(() => {
    const fetch = async () => {
      const data = await hrService.getEmployeeDetail(id);
      setEmployee(data);
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return <div className="p-10 text-center animate-pulse text-gray-400 font-bold uppercase tracking-widest">Cargando expediente...</div>;
  if (!employee) return <div className="p-10 text-center text-red-500 font-bold">Empleado no encontrado</div>;

  // Corregir detección de rol principal (priorizando roles que no sean COLLABORATOR)
  const allRoles = Array.isArray(employee.roles) ? employee.roles : [employee.role || ROLES.COLLABORATOR];
  const mainRole = allRoles.find(r => r !== ROLES.COLLABORATOR) || ROLES.COLLABORATOR;
  const roleInfo = ROLE_CONFIG[mainRole] || ROLE_CONFIG[ROLES.COLLABORATOR];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <button 
          onClick={() => navigate('/hr/directory')}
          className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-primary transition-colors uppercase tracking-widest bg-white px-4 py-2 rounded-xl border shadow-sm"
        >
          <ChevronLeft className="h-4 w-4" /> Directorio
        </button>
        <button className="text-gray-400 hover:text-gray-900 bg-white p-2 rounded-xl border shadow-sm transition-colors">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      {/* Header Profile */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent blur-[80px]" />
        
        <img src={employee.avatar} className="h-32 w-32 rounded-[2rem] object-cover border-4 border-white shadow-2xl relative z-10" />
        
        <div className="flex-1 space-y-4 relative z-10">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-gray-900 leading-none">{employee.name}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
              <span className="bg-primary text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">{employee.position || 'Sin Puesto'}</span>
              <span className={cn("text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider border flex items-center gap-1.5", roleInfo.color)}>
                <roleInfo.icon className="h-3 w-3" /> {roleInfo.label}
              </span>
              <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">{employee.department}</span>
              <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">Activo</span>
            </div>
          </div>
          <p className="text-sm font-bold text-gray-500 max-w-lg leading-relaxed">
            Ingreso: {employee.joinDate ? new Date(employee.joinDate).toLocaleDateString() : 'N/A'} • Base: {employee.location || 'Oficina Central'}
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b gap-6 px-2 overflow-x-auto scrollbar-hide">
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 py-4 border-b-[3px] font-black text-xs transition-all whitespace-nowrap uppercase tracking-widest",
              activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-400 hover:text-gray-900"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-2 min-h-[400px]">
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Sección de Métricas de Satisfacción y Bonos (15 días) */}
            {(mainRole === ROLES.TECH || mainRole === ROLES.OPS || mainRole === ROLES.SALES || mainRole === 'SUPERVISOR' || mainRole === 'OPERACIONES') && (
                <MetricsSection targetId={id} />
            )}

            {/* KPI Section for Operations/Tech/Sales */}
            {(mainRole === ROLES.TECH || mainRole === ROLES.OPS || mainRole === ROLES.SALES) && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <KPICard label={mainRole === ROLES.SALES ? "Ventas Mes" : "OTs Cerradas"} value={mainRole === ROLES.SALES ? "$42k" : "24"} icon={Target} color="blue" />
                    <KPICard label="Satisfacción" value="4.8" icon={Star} color="amber" />
                    <KPICard label="Efectividad" value="96%" icon={CheckCircle} color="emerald" />
                    <KPICard label="Meta Anual" value="72%" icon={TrendingUp} color="purple" />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Col */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
                        <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" /> Datos Personales
                        </h3>
                        <div className="space-y-5">
                            <InfoRow label="ID Nómina / Empleado" value={employee.employeeId || employee.id} />
                            <InfoRow label="Email Corporativo" value={employee.email} />
                            <InfoRow label="Teléfono Personal" value={employee.phone || 'No registrado'} />
                            <div className="pt-2 border-t border-gray-50">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Contacto de Emergencia</p>
                                <InfoRow label="Nombre" value={employee.emergencyContactName || 'No registrado'} />
                                <InfoRow label="Teléfono" value={employee.emergencyContactPhone || 'No registrado'} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Col */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm space-y-6">
                        <div className="flex justify-between items-center">
                        <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
                            <Award className="h-4 w-4 text-primary" /> Certificaciones LMS
                        </h3>
                        </div>
                        <div className="space-y-4">
                        {(employee.certifications?.length || 0) > 0 ? employee.certifications.map((cert) => (
                            <div key={cert.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border hover:bg-white transition-all">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary border shadow-sm">
                                <ShieldCheck className="h-5 w-5" />
                                </div>
                                <div>
                                <p className="text-sm font-black text-gray-900">{cert.name}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Obtenido: {new Date(cert.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                                <Download className="h-5 w-5" />
                            </button>
                            </div>
                        )) : (
                            <p className="text-center py-6 text-gray-400 font-bold italic text-sm">Sin certificaciones completadas.</p>
                        )}
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'DOCUMENTS' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {[
              { 
                title: '1. Datos Personales', 
                color: 'blue',
                docs: [
                    { name: 'Acta de Nacimiento', value: employee.birthCertificate },
                    { name: 'Identificación Oficial', value: employee.ineDoc || employee.ine },
                    { name: 'CURP', value: employee.curp },
                    { name: 'RFC (SAT)', value: employee.rfc },
                    { name: 'NSS (IMSS)', value: employee.nss },
                    { name: 'Comprobante Domicilio', value: employee.proofOfResidency },
                    { name: 'Currículum Vitae', value: employee.cv }
                ]
              },
              { 
                title: '2. Contratación', 
                color: 'purple',
                docs: [
                    { name: 'Contrato Laboral', value: employee.contractSigned },
                    { name: 'Aviso de Privacidad', value: employee.privacyPolicySigned },
                    { name: 'Reglamento Interno', value: employee.internalRulesSigned },
                    { name: 'Alta en el IMSS', value: employee.imssHigh }
                ]
              },
              { 
                title: '3. Seguimiento Laboral', 
                color: 'emerald',
                docs: [
                    { name: 'Certificado de Estudios', value: employee.studyCertificate },
                    { name: 'Título / Cédula', value: employee.degreeOrProfessionalId },
                    { name: 'Diplomas o Cursos', value: employee.diplomasOrCourses },
                    { name: 'Certificaciones', value: employee.laborCertifications },
                    { name: 'Evaluaciones Desempeño', value: employee.performanceEvaluations },
                    { name: 'Capacitaciones', value: employee.receivedTraining },
                    { name: 'Actas Administrativas', value: employee.administrativeActs },
                    { name: 'Incidencias / Reportes', value: employee.disciplinaryReports },
                    { name: 'Permisos / Licencias', value: employee.permitsOrLicenses }
                ]
              },
              { 
                title: '4. Baja del Empleado', 
                color: 'red',
                docs: [
                    { name: 'Carta de Renuncia', value: employee.resignationLetter },
                    { name: 'Finiquito / Liquidación', value: employee.settlementOrLiquidation },
                    { name: 'Baja del IMSS', value: employee.imssLow },
                    { name: 'Constancia Laboral', value: employee.laborConstancy }
                ]
              }
            ].map((section, idx) => (
              <div key={idx} className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b pb-4">
                  <div className={cn(
                    "h-10 w-10 rounded-2xl flex items-center justify-center",
                    section.color === 'blue' ? "bg-blue-50 text-blue-600" :
                    section.color === 'purple' ? "bg-purple-50 text-purple-600" :
                    section.color === 'emerald' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                  )}>
                    <FileSignature className="h-5 w-5" />
                  </div>
                  <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">{section.title}</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.docs.map((doc, i) => (
                    <div key={i} className="flex justify-between items-center p-4 border rounded-2xl bg-gray-50/50 hover:bg-white transition-all group">
                      <div className="flex items-center gap-3">
                        <FileText className={cn("h-5 w-5", doc.value ? "text-primary" : "text-gray-300")} />
                        <div>
                          <p className="text-[11px] font-black text-gray-900 leading-tight">{doc.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{doc.value ? 'Cargado' : 'Faltante'}</p>
                        </div>
                      </div>
                      {doc.value && doc.value.startsWith('data:') ? (
                        <button 
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = doc.value;
                            link.download = `${doc.name}.pdf`;
                            link.click();
                          }}
                          className="p-2 bg-white border rounded-xl text-primary hover:bg-primary hover:text-white transition-all shadow-sm opacity-0 group-hover:opacity-100"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      ) : doc.value ? (
                        <span className="text-[9px] font-black text-gray-500 bg-white border px-2 py-1 rounded-lg">{doc.value}</span>
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-gray-200" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'TIMEOFF' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 border shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Días Vacaciones (Bolsa)</p>
                <p className="text-4xl font-black text-gray-900 mt-2">12 <span className="text-sm text-gray-400">/ 14</span></p>
                <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div className="bg-white rounded-3xl p-6 border shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Faltas Injustificadas (Año)</p>
                <p className="text-4xl font-black text-gray-900 mt-2">0</p>
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-4">Asistencia Perfecta</p>
              </div>
              <div className="bg-white rounded-3xl p-6 border shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Retardos Acumulados</p>
                <p className="text-4xl font-black text-gray-900 mt-2">1</p>
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mt-4">Tolerancia: 3 max / mes</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest mb-6">Historial de Incidencias y Permisos</h3>
              <div className="space-y-4">
                {[
                  { date: '12 May 2025', type: 'Vacaciones (5 días)', status: 'APROBADO', by: 'Ana Admin' },
                  { date: '04 Mar 2025', type: 'Retardo (45 min)', status: 'APLICADO', by: 'Sistema (Reloj)' }
                ].map((inc, i) => (
                  <div key={i} className="flex justify-between items-center p-4 border rounded-2xl bg-gray-50/50">
                    <div>
                      <p className="text-sm font-black text-gray-900">{inc.type}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{inc.date} • Autoriza: {inc.by}</p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider border",
                      inc.status === 'APROBADO' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-gray-100 text-gray-600 border-gray-200"
                    )}>{inc.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ASSETS' && (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500 text-center space-y-4 py-20">
            <HardHat className="h-16 w-16 text-gray-200 mx-auto" />
            <h3 className="text-xl font-black text-gray-900">Control de EPP e Inventario</h3>
            <p className="text-gray-500 font-medium max-w-sm mx-auto">
              Sección donde se registrará la entrega de laptops, herramientas, y equipo de protección personal (botas, cascos) asociados a este trabajador, con carta responsiva digital.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, isSecret }) {
  return (
    <div className="space-y-1 border-b border-gray-50 pb-3 last:border-0 last:pb-0">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <p className={cn("text-sm font-bold text-gray-900", isSecret && "blur-sm hover:blur-none transition-all cursor-pointer select-none")}>{value}</p>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
    };

    return (
        <div className={cn("p-6 rounded-3xl border shadow-sm space-y-2", colors[color])}>
            <div className="flex justify-between items-center">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
                <Icon className="h-4 w-4 opacity-70" />
            </div>
            <p className="text-3xl font-black leading-none">{value}</p>
        </div>
    );
}
