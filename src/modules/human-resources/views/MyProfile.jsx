import React, { useState, useEffect } from 'react';
import { 
  Award, Briefcase, Calendar, ShieldCheck, FileText, Download, User, FileSignature, Palmtree, HardHat, MoreVertical, Mail, MapPin, Phone, Info, Clock, CheckCircle2, AlertTriangle, Sparkles,
  Star, TrendingUp, Users, DollarSign
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
  
  if (!metrics || !metrics.current || metrics.current.total === 0) return (
    <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl mb-8 flex items-center gap-4 text-amber-700">
        <Star className="h-6 w-6" />
        <div>
            <p className="text-xs font-black uppercase tracking-widest">Sin Evaluaciones Recientes (15 días)</p>
            <p className="text-[10px] font-bold opacity-70">Aún no hay datos suficientes para calcular tu bono de este periodo.</p>
        </div>
    </div>
  );

  const current = metrics.current;
  const avgTotal = current.totalAvg || 0;
  
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
            <p className="text-3xl font-black text-amber-500">{(current.avg1 || 0).toFixed(1)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2 border-blue-100">
            <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Liderazgo/Proc.</p>
                <TrendingUp className="h-4 w-4 text-blue-400" />
            </div>
            <p className="text-3xl font-black text-blue-500">{(current.avg2 || 0).toFixed(1)}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-2">
            <div className="flex justify-between items-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Feedback</p>
                <Users className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-3xl font-black text-gray-900">{current.total || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-3xl shadow-xl text-white space-y-2 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                <DollarSign className="h-12 w-12" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Mi Bono Proyectado</p>
            <p className="text-3xl font-black">${(projectedBonus || 0).toLocaleString()}</p>
            <p className="text-[8px] font-bold uppercase mt-1 opacity-60">Meta: {avgTotal.toFixed(1)} prome.</p>
        </div>
    </div>
  );
};
import { hrService } from '@/api/hrService';
import { useAuth, ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

const PROFILE_TABS = [
  { id: 'OVERVIEW', label: 'Mi Perfil', icon: User },
  { id: 'TIMEOFF', label: 'Vacaciones y Permisos', icon: Palmtree },
  { id: 'DOCUMENTS', label: 'Mis Documentos', icon: FileSignature },
];

export default function MyProfile() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('OVERVIEW');

  useEffect(() => {
    const fetch = async () => {
      // Try to find employee by email or ID
      const allEmployees = await hrService.getEmployees();
      const emp = allEmployees.find(e => e.email === user.email || e.id === user.id);
      
      if (emp) {
        const details = await hrService.getEmployeeDetail(emp.id);
        setEmployee(details);
      } else {
        // Fallback for mock users or if not found in DB yet
        setEmployee({
          ...user,
          department: user.role === ROLES.COLLABORATOR ? 'Colaboradores' : 'General',
          joinDate: '2024-01-01',
          location: 'Remoto / Oficina Central',
          phone: 'No registrado',
          certifications: []
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return <div className="p-10 text-center animate-pulse text-gray-400 font-bold uppercase tracking-widest">Cargando tu perfil...</div>;

  const isCollaborator = user.role === ROLES.COLLABORATOR;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-700">
      {/* Header Profile */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-transparent blur-[80px]" />
        
        <img src={employee.avatar} className="h-32 w-32 rounded-[2rem] object-cover border-4 border-white shadow-2xl relative z-10" />
        
        <div className="flex-1 space-y-4 relative z-10">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-gray-900 leading-none">{employee.name}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 pt-2">
              <span className={cn(
                "text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider",
                isCollaborator ? "bg-gray-100 text-gray-600" : "bg-primary/10 text-primary"
              )}>{employee.role}</span>
              <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">{employee.department}</span>
              <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">Perfil Activo</span>
            </div>
          </div>
          <p className="text-sm font-bold text-gray-500 max-w-lg leading-relaxed">
            Miembro desde: {employee.joinDate} • Base: {employee.location}
          </p>
        </div>

        <div className="hidden md:block">
            <div className="bg-gray-50 p-4 rounded-3xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Mi Estatus Capital Humano</p>
                <div className="flex items-center gap-2 text-emerald-600 font-black text-sm">
                    <CheckCircle2 className="h-5 w-5" /> Expediente Completo
                </div>
            </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
                <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" /> Información de Contacto
                </h3>
                <div className="space-y-5">
                  <InfoRow label="ID de Empleado" value={employee.id || 'TEMP-USER'} />
                  <InfoRow label="Email Registrado" value={employee.email} icon={Mail} />
                  <InfoRow label="Teléfono" value={employee.phone} icon={Phone} />
                </div>
              </div>

              {!isCollaborator && employee.certifications?.length > 0 && (
                 <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                    <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">Mis Insignias</h3>
                    <div className="flex flex-wrap gap-2">
                        {employee.certifications.map(c => (
                            <div key={c.id} className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shadow-sm" title={c.name}>
                                <Award className="h-6 w-6" />
                            </div>
                        ))}
                    </div>
                 </div>
              )}
            </div>

            <div className="md:col-span-2 space-y-6">
               <div className="bg-primary/5 rounded-[2.5rem] p-8 border border-primary/10 relative overflow-hidden group mb-6">
                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-primary">¡Hola, {employee.name.split(' ')[0]}!</h3>
                        <p className="text-primary/70 font-medium text-sm">Aquí puedes gestionar todas tus solicitudes de Capital Humano de forma directa.</p>
                    </div>
                  </div>
                  <Sparkles className="absolute -right-4 -top-4 h-32 w-32 text-primary/10 group-hover:text-primary/20 transition-colors" />
               </div>

               {/* Métricas Individuales (Solo para Técnicos/Ops/Ventas) */}
               {(user.role === ROLES.TECH || user.role === ROLES.OPS || user.role === ROLES.SALES) && (
                  <MetricsSection targetId={user.id} />
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DashboardCard 
                        title="Días de Vacaciones" 
                        value="12" 
                        total="14" 
                        icon={Palmtree} 
                        color="text-emerald-500" 
                    />
                    <DashboardCard 
                        title="Horas Capacitación" 
                        value="24" 
                        icon={Clock} 
                        color="text-blue-500" 
                    />
               </div>
            </div>
          </div>
        )}

        {activeTab === 'TIMEOFF' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h3 className="text-2xl font-black text-gray-900">Gestión de Tiempo</h3>
                    <p className="text-sm text-gray-500 font-medium mt-1">Consulta tus saldos y solicita nuevas vacaciones o permisos.</p>
                </div>
                <button className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary transition-all shadow-xl">
                    Nueva Solicitud
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 border shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bolsa Actual (Días)</p>
                <p className="text-4xl font-black text-gray-900 mt-2">12 <span className="text-sm text-gray-400">/ 14</span></p>
                <div className="w-full bg-gray-100 h-2 rounded-full mt-4 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div className="bg-white rounded-3xl p-6 border shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">En Proceso de Firma</p>
                <p className="text-4xl font-black text-amber-500 mt-2">1</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-4">Esperando aprobación</p>
              </div>
              <div className="bg-white rounded-3xl p-6 border shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Próximo Aniversario</p>
                <p className="text-xl font-black text-gray-900 mt-2">15 Ene 2026</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-4">+2 días adicionales</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest mb-6">Mis Solicitudes Recientes</h3>
              <div className="space-y-4">
                {[
                  { date: '12 May 2025', type: 'Vacaciones (5 días)', status: 'APROBADO', by: 'Ana Admin' },
                  { date: '15 Jun 2025', type: 'Permiso Especial (Cita Médica)', status: 'PENDIENTE', by: 'RH' }
                ].map((inc, i) => (
                  <div key={i} className="flex justify-between items-center p-4 border rounded-2xl bg-gray-50/50 hover:bg-white transition-all">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "p-3 rounded-xl border bg-white",
                            inc.status === 'PENDIENTE' ? "text-amber-500 border-amber-100" : "text-emerald-500 border-emerald-100"
                        )}>
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-gray-900">{inc.type}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{inc.date} • Estado: {inc.status}</p>
                        </div>
                    </div>
                    <button className="text-[10px] font-black text-gray-400 hover:text-primary uppercase tracking-widest px-4 py-2 rounded-lg border bg-white shadow-sm transition-all">
                        Ver Detalle
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'DOCUMENTS' && (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-black text-gray-900">Expediente Digital</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">Consulta y descarga tus documentos oficiales.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Contrato Laboral 2024', type: 'PDF', status: 'OK' },
                { name: 'Recibo Nómina (Quincena 1 - Feb)', type: 'PDF/XML', status: 'OK' },
                { name: 'Constancia Situación Fiscal', type: 'PDF', status: 'PENDING' },
                { name: 'Carta de Confidencialidad', type: 'PDF', status: 'OK' }
              ].map((doc, i) => (
                <div key={i} className="flex justify-between items-center p-4 border rounded-2xl bg-gray-50/50 group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3">
                    <FileText className={cn("h-6 w-6", doc.status === 'OK' ? "text-primary" : "text-gray-300")} />
                    <div>
                      <p className="text-sm font-black text-gray-900">{doc.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{doc.type}</p>
                    </div>
                  </div>
                  {doc.status === 'OK' ? (
                    <button className="h-10 w-10 rounded-xl bg-white border flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                        <Download className="h-5 w-5" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase bg-amber-50 px-2 py-1 rounded border border-amber-100">
                        <AlertTriangle className="h-3 w-3" /> Falta Cargar
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
      {Icon && (
          <div className="p-2 rounded-lg bg-gray-50 text-gray-400 mt-1">
              <Icon className="h-4 w-4" />
          </div>
      )}
      <div className="space-y-0.5">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function DashboardCard({ title, value, total, icon: Icon, color }) {
    return (
        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
                <p className="text-3xl font-black text-gray-900">
                    {value} {total && <span className="text-sm text-gray-400">/ {total}</span>}
                </p>
            </div>
            <div className={cn("p-4 rounded-2xl bg-gray-50 transition-colors", color)}>
                <Icon className="h-7 w-7" />
            </div>
        </div>
    );
}
