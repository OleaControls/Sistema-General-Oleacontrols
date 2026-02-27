import React, { useState } from 'react';
import { 
  FileSignature, 
  UploadCloud, 
  Search, 
  Filter, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Download,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HRDocuments() {
  const [activeTab, setActiveTab] = useState('EMPLOYEES');

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Gestión Documental</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Auditoría de expedientes, contratos y políticas firmadas.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border text-gray-700 px-5 py-3 rounded-2xl font-bold text-sm hover:border-gray-300 transition-all shadow-sm">
            <FileText className="h-4 w-4 text-primary" />
            Nueva Plantilla
          </button>
          <button className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
            <UploadCloud className="h-4 w-4" />
            Subir Documento
          </button>
        </div>
      </div>

      <div className="flex border-b gap-8 px-2 overflow-x-auto scrollbar-hide">
        {[
          { id: 'EMPLOYEES', label: 'Auditoría por Empleado' },
          { id: 'TEMPLATES', label: 'Plantillas Base' },
          { id: 'POLICIES', label: 'Políticas Internas' }
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
          <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" placeholder="Buscar empleado..." className="pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:border-primary w-full sm:w-64" />
              </div>
              <div className="flex gap-2">
                <select className="border rounded-xl px-4 py-2 text-sm font-bold text-gray-600 outline-none">
                  <option>Estado: Todos</option>
                  <option>Expediente Completo</option>
                  <option>Incompleto</option>
                </select>
              </div>
            </div>
            
            <table className="w-full text-left">
              <thead className="bg-white border-b">
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Empleado</th>
                  <th className="px-6 py-4">Progreso Documental</th>
                  <th className="px-6 py-4">Faltantes Críticos</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { name: 'Gabriel Tech', role: 'Técnico', progress: 100, missing: [] },
                  { name: 'Ana Cruz', role: 'Ventas', progress: 60, missing: ['Contrato Físico', 'Comprobante Domicilio'] },
                  { name: 'Luis Martínez', role: 'Técnico', progress: 90, missing: ['NSS Actualizado'] },
                ].map((emp, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-black text-sm text-gray-900">{emp.name}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{emp.role}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[150px]">
                          <div 
                            className={cn("h-full rounded-full transition-all", emp.progress === 100 ? "bg-green-500" : "bg-amber-500")}
                            style={{ width: `${emp.progress}%` }} 
                          />
                        </div>
                        <span className="text-xs font-black text-gray-700">{emp.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {emp.missing.length === 0 ? (
                        <span className="flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-md uppercase w-fit">
                          <CheckCircle className="h-3 w-3" /> Completo
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {emp.missing.map((doc, idx) => (
                            <span key={idx} className="flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-md uppercase w-fit border border-amber-100">
                              <AlertCircle className="h-3 w-3" /> {doc}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-primary transition-colors bg-white border rounded-lg shadow-sm group-hover:border-primary/30">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'TEMPLATES' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Contrato Indeterminado v2', 'Contrato Prueba 3 Meses', 'Carta Responsiva EPP', 'Acuerdo Confidencialidad (NDA)'].map((tpl, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-primary/30 transition-colors group cursor-pointer">
                <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-all">
                  <FileSignature className="h-6 w-6" />
                </div>
                <h4 className="font-black text-gray-900 mb-1">{tpl}</h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">Actualizado: 12 Ene 2026</p>
                <div className="flex gap-2">
                  <button className="flex-1 border text-gray-600 text-xs font-black py-2 rounded-xl hover:bg-gray-50 uppercase tracking-wider">Editar</button>
                  <button className="flex-1 bg-gray-900 text-white text-xs font-black py-2 rounded-xl hover:bg-primary uppercase tracking-wider shadow-lg shadow-gray-200">Generar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
