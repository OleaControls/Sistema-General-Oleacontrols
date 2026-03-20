import React, { useState, useEffect } from 'react';
import { 
  FileSignature, 
  UploadCloud, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Download,
  Eye,
  ExternalLink,
  ShieldCheck,
  ClipboardCheck,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hrService } from '@/api/hrService';
import { useNavigate } from 'react-router-dom';

export default function HRDocuments() {
  const [activeTab, setActiveTab] = useState('EMPLOYEES');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, COMPLETE, INCOMPLETE
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await hrService.getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error('Error fetching employees for docs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Documentos críticos para el expediente legal
  const CRITICAL_DOCS = [
    { key: 'contractSigned', label: 'Contrato' },
    { key: 'privacyPolicySigned', label: 'Privacidad' },
    { key: 'internalRulesSigned', label: 'Reglamento' },
    { key: 'imssHigh', label: 'Alta IMSS' }
  ];

  const calculateProgress = (emp) => {
    const total = CRITICAL_DOCS.length;
    const current = CRITICAL_DOCS.filter(doc => emp[doc.key] && emp[doc.key] !== '').length;
    return Math.round((current / total) * 100);
  };

  const getMissingDocs = (emp) => {
    return CRITICAL_DOCS.filter(doc => !emp[doc.key] || emp[doc.key] === '').map(doc => doc.label);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) || 
                          (emp.position || '').toLowerCase().includes(search.toLowerCase());
    
    const progress = calculateProgress(emp);
    if (filterStatus === 'COMPLETE') return matchesSearch && progress === 100;
    if (filterStatus === 'INCOMPLETE') return matchesSearch && progress < 100;
    return matchesSearch;
  });

  if (loading && employees.length === 0) {
    return <div className="p-10 text-center font-black text-gray-400 uppercase tracking-widest animate-pulse">Cargando expedientes...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Gestión Contratos y Expedientes</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Auditoría legal de documentos firmados y vigencia de contratos.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border text-gray-700 px-5 py-3 rounded-2xl font-bold text-sm hover:border-gray-300 transition-all shadow-sm">
            <FileText className="h-4 w-4 text-primary" />
            Plantillas PDF
          </button>
          <button className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
            <UploadCloud className="h-4 w-4" />
            Carga Masiva
          </button>
        </div>
      </div>

      <div className="flex border-b gap-8 px-2 overflow-x-auto scrollbar-hide">
        {[
          { id: 'EMPLOYEES', label: 'Auditoría de Contratos' },
          { id: 'TEMPLATES', label: 'Modelos de Contrato' },
          { id: 'POLICIES', label: 'Políticas Corporativas' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "py-4 border-b-2 font-black text-sm transition-all whitespace-nowrap uppercase tracking-wider",
              activeTab === tab.id 
                ? "border-primary text-primary" 
                : "border-transparent text-gray-400 hover:text-gray-600"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-4">
        {activeTab === 'EMPLOYEES' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="bg-white p-4 border rounded-3xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o cargo..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:border-primary w-full sm:w-80 font-bold" 
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex-1 sm:flex-none border rounded-xl px-4 py-2 text-sm font-black text-gray-600 outline-none bg-gray-50 focus:bg-white transition-all uppercase tracking-tighter"
                >
                  <option value="ALL">Todos los Expedientes</option>
                  <option value="COMPLETE">Expedientes Completos</option>
                  <option value="INCOMPLETE">Incompletos / Pendientes</option>
                </select>
              </div>
            </div>

            <div className="bg-white border rounded-[2.5rem] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 border-b">
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-6 py-5">Colaborador</th>
                      <th className="px-6 py-5">Contrato e IMSS</th>
                      <th className="px-6 py-5">Reglamento y Privacidad</th>
                      <th className="px-6 py-5">Progreso</th>
                      <th className="px-6 py-5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredEmployees.length > 0 ? filteredEmployees.map((emp) => {
                      const progress = calculateProgress(emp);
                      return (
                        <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-400 border text-sm uppercase">
                                {emp.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-black text-sm text-gray-900 leading-tight">{emp.name}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{emp.position || 'Sin cargo'} • {emp.contractType || 'No especificado'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {/* Contrato */}
                              <div className="group/doc relative">
                                <a 
                                  href={emp.contractSigned} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "p-2 rounded-lg flex items-center justify-center transition-all",
                                    emp.contractSigned ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-red-50 text-red-400 opacity-40 grayscale"
                                  )}
                                >
                                  <FileSignature className="h-4 w-4" />
                                </a>
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[8px] font-black rounded opacity-0 group-hover/doc:opacity-100 transition-opacity pointer-events-none uppercase">Contrato</span>
                              </div>
                              {/* Alta IMSS */}
                              <div className="group/doc relative">
                                <a 
                                  href={emp.imssHigh} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "p-2 rounded-lg flex items-center justify-center transition-all",
                                    emp.imssHigh ? "bg-blue-50 text-blue-600 hover:bg-blue-100" : "bg-red-50 text-red-400 opacity-40 grayscale"
                                  )}
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                </a>
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[8px] font-black rounded opacity-0 group-hover/doc:opacity-100 transition-opacity pointer-events-none uppercase">IMSS</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {/* Reglamento */}
                              <div className="group/doc relative">
                                <a 
                                  href={emp.internalRulesSigned} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "p-2 rounded-lg flex items-center justify-center transition-all",
                                    emp.internalRulesSigned ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-red-50 text-red-400 opacity-40 grayscale"
                                  )}
                                >
                                  <ClipboardCheck className="h-4 w-4" />
                                </a>
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[8px] font-black rounded opacity-0 group-hover/doc:opacity-100 transition-opacity pointer-events-none uppercase">Reglamento</span>
                              </div>
                              {/* Privacidad */}
                              <div className="group/doc relative">
                                <a 
                                  href={emp.privacyPolicySigned} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "p-2 rounded-lg flex items-center justify-center transition-all",
                                    emp.privacyPolicySigned ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100" : "bg-red-50 text-red-400 opacity-40 grayscale"
                                  )}
                                >
                                  <FileText className="h-4 w-4" />
                                </a>
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[8px] font-black rounded opacity-0 group-hover/doc:opacity-100 transition-opacity pointer-events-none uppercase">Privacidad</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-4 min-w-[100px]">
                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all duration-1000",
                                      progress === 100 ? "bg-emerald-500" : "bg-amber-500"
                                    )}
                                    style={{ width: `${progress}%` }} 
                                  />
                                </div>
                                <span className="text-[10px] font-black text-gray-700">{progress}%</span>
                              </div>
                              {progress < 100 && (
                                <p className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">Faltan {getMissingDocs(emp).length} documentos</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => navigate(`/hr/employee/${emp.id}`)}
                                className="p-2 text-gray-400 hover:text-primary transition-colors bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md"
                                title="Ver Expediente Completo"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan="5" className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-2 opacity-30">
                            <Search className="h-10 w-10 text-gray-400" />
                            <p className="font-black text-sm uppercase">No se encontraron colaboradores</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-3xl flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-xs font-medium text-blue-800 leading-relaxed">
                <span className="font-black uppercase">Nota legal:</span> Esta tabla audita los documentos obligatorios por ley. Un expediente al 100% indica que el colaborador ha firmado su contrato, aviso de privacidad, reglamento interno y cuenta con su alta en el IMSS debidamente cargada.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'TEMPLATES' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in zoom-in-95 duration-500">
            {[
              { title: 'Contrato Indeterminado v2', update: '12 Ene 2026', color: 'bg-emerald-50 text-emerald-600' },
              { title: 'Contrato Prueba 3 Meses', update: '05 Feb 2026', color: 'bg-amber-50 text-amber-600' },
              { title: 'Carta Responsiva EPP', update: '20 Ene 2026', color: 'bg-blue-50 text-blue-600' },
              { title: 'Acuerdo Confidencialidad (NDA)', update: '15 Mar 2026', color: 'bg-indigo-50 text-indigo-600' }
            ].map((tpl, i) => (
              <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:border-primary/30 transition-all group cursor-pointer hover:shadow-xl hover:-translate-y-1">
                <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform", tpl.color)}>
                  <FileSignature className="h-7 w-7" />
                </div>
                <h4 className="font-black text-gray-900 mb-1 text-lg leading-tight">{tpl.title}</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Última Revisión: {tpl.update}</p>
                <div className="flex gap-2">
                  <button className="flex-1 border border-gray-100 text-gray-600 text-[10px] font-black py-3 rounded-2xl hover:bg-gray-50 uppercase tracking-wider transition-colors">Editar</button>
                  <button className="flex-1 bg-gray-900 text-white text-[10px] font-black py-3 rounded-2xl hover:bg-primary uppercase tracking-wider shadow-lg shadow-gray-200 transition-all">Generar PDF</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'POLICIES' && (
          <div className="bg-white border rounded-[2.5rem] p-12 text-center border-dashed flex flex-col items-center justify-center text-gray-400 gap-4">
            <ShieldCheck className="h-16 w-16 opacity-10" />
            <div>
              <p className="font-black text-sm uppercase tracking-widest text-gray-900">Repositorio de Políticas Corporativas</p>
              <p className="text-xs font-medium max-w-xs mx-auto mt-2">Aquí podrás gestionar el Reglamento Interior de Trabajo, Código de Ética y Políticas de EPP.</p>
            </div>
            <button className="mt-4 bg-gray-50 text-gray-600 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 border">Configurar Módulo</button>
          </div>
        )}
      </div>
    </div>
  );
}
