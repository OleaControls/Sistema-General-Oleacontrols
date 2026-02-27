import React from 'react';
import { Network, Users, Download, Plus } from 'lucide-react';

export default function OrgChart() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-[calc(100vh-12rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Organigrama Corporativo</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Estructura jerárquica y centros de costo.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border text-gray-700 px-5 py-3 rounded-2xl font-bold text-sm hover:border-gray-300 transition-all shadow-sm">
            <Download className="h-4 w-4" /> Exportar PDF
          </button>
          <button className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
            <Plus className="h-4 w-4" /> Nuevo Departamento
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white border rounded-3xl shadow-sm flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Decorative background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        
        <div className="relative z-10 flex flex-col items-center gap-8">
          {/* CEO / Director */}
          <div className="bg-gray-900 text-white p-4 rounded-2xl shadow-xl w-64 text-center border-4 border-white">
            <div className="h-12 w-12 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center">
              <Network className="h-6 w-6 text-white" />
            </div>
            <h3 className="font-black">Dirección General</h3>
            <p className="text-[10px] text-gray-300 uppercase tracking-widest mt-1">Roberto Olea</p>
          </div>

          <div className="w-px h-8 bg-gray-300" />
          <div className="w-full max-w-3xl h-px bg-gray-300 relative">
            <div className="absolute left-0 top-0 w-px h-8 bg-gray-300" />
            <div className="absolute left-1/2 top-0 w-px h-8 bg-gray-300 -translate-x-1/2" />
            <div className="absolute right-0 top-0 w-px h-8 bg-gray-300" />
          </div>

          <div className="flex justify-between w-full max-w-4xl gap-4 px-4">
            {/* Dept 1 */}
            <div className="bg-white border-2 border-blue-100 p-4 rounded-2xl shadow-md w-full text-center hover:border-blue-300 transition-colors cursor-pointer">
              <h3 className="font-black text-blue-900">Operaciones</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">85 Empleados</p>
            </div>
            {/* Dept 2 */}
            <div className="bg-white border-2 border-purple-100 p-4 rounded-2xl shadow-md w-full text-center hover:border-purple-300 transition-colors cursor-pointer">
              <h3 className="font-black text-purple-900">Comercial / CRM</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">12 Empleados</p>
            </div>
            {/* Dept 3 */}
            <div className="bg-white border-2 border-emerald-100 p-4 rounded-2xl shadow-md w-full text-center hover:border-emerald-300 transition-colors cursor-pointer">
              <h3 className="font-black text-emerald-900">Administración y RH</h3>
              <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">5 Empleados</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 text-center text-gray-400 font-bold italic text-sm bg-white/80 backdrop-blur px-6 py-2 rounded-full">
          * Vista de organigrama interactiva (Arrastrar y Soltar)
        </div>
      </div>
    </div>
  );
}
