import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Award, Briefcase, Calendar, ShieldCheck, FileText, Download, User, FileSignature, Palmtree, HardHat, MoreVertical
} from 'lucide-react';
import { hrService } from '@/api/hrService';
import { cn } from '@/lib/utils';

const PROFILE_TABS = [
  { id: 'OVERVIEW', label: 'Resumen y KPIs', icon: User },
  { id: 'DOCUMENTS', label: 'Docs. y Contratos', icon: FileSignature },
  { id: 'TIMEOFF', label: 'Asistencia y Vacaciones', icon: Palmtree },
  { id: 'ASSETS', label: 'Inventario y EPP', icon: HardHat }
];

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
              <span className="bg-primary/10 text-primary text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">{employee.role}</span>
              <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">{employee.department}</span>
              <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">Activo</span>
            </div>
          </div>
          <p className="text-sm font-bold text-gray-500 max-w-lg leading-relaxed">
            Ingreso: {employee.joinDate} • Base: {employee.location}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Left Col */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
                <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" /> Datos Personales
                </h3>
                <div className="space-y-5">
                  <InfoRow label="ID Nómina / Empleado" value={employee.id} />
                  <InfoRow label="Email Corporativo" value={employee.email} />
                  <InfoRow label="Teléfono (Emergencia)" value={employee.phone} />
                  <InfoRow label="NSS / RFC" value="Oculto por seguridad (Clic para revelar)" isSecret />
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
                  {employee.certifications.length > 0 ? employee.certifications.map((cert) => (
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
        )}

        {activeTab === 'DOCUMENTS' && (
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest">Documentación Legal</h3>
              <button className="bg-gray-900 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary transition-colors shadow-lg">
                Subir Archivo
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Contrato Laboral Firmado', type: 'PDF', required: true, status: 'OK' },
                { name: 'Identificación Oficial (INE)', type: 'PDF/IMG', required: true, status: 'OK' },
                { name: 'Constancia Situación Fiscal', type: 'PDF', required: true, status: 'PENDING' },
                { name: 'Comprobante de Domicilio', type: 'PDF/IMG', required: true, status: 'OK' },
                { name: 'Políticas Confidencialidad (NDA)', type: 'PDF', required: false, status: 'OK' }
              ].map((doc, i) => (
                <div key={i} className="flex justify-between items-center p-4 border rounded-2xl bg-gray-50/50 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className={cn("h-6 w-6", doc.status === 'OK' ? "text-primary" : "text-gray-300")} />
                    <div>
                      <p className="text-sm font-black text-gray-900">{doc.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Req: {doc.required ? 'Obligatorio' : 'Opcional'}</p>
                    </div>
                  </div>
                  {doc.status === 'OK' ? (
                    <span className="text-[10px] font-black bg-green-50 text-green-700 px-2 py-1 rounded uppercase tracking-wider border border-green-100">Cargado</span>
                  ) : (
                    <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-2 py-1 rounded uppercase tracking-wider border border-amber-100">Falta</span>
                  )}
                </div>
              ))}
            </div>
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
