import React from 'react';
import { BarChart4, Download, PieChart, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HRReports() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Reportes y Analítica</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Exportaciones y visualización de datos estadísticos de RH.</p>
        </div>
        <button className="flex items-center gap-2 bg-gray-900 text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg hover:bg-primary transition-all">
          <Download className="h-4 w-4" /> Exportar Master CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Plantilla y Rotación', desc: 'Altas, bajas y head-count por periodo.', icon: TrendingDown },
          { title: 'Cumplimiento Documental', desc: 'Auditoría de expedientes y EPP.', icon: BarChart4 },
          { title: 'Asistencia y Nómina', desc: 'Reporte de incidencias y retardos consolidados.', icon: PieChart }
        ].map((report, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all cursor-pointer group">
            <div className="h-12 w-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <report.icon className="h-6 w-6" />
            </div>
            <h3 className="font-black text-gray-900 group-hover:text-primary transition-colors">{report.title}</h3>
            <p className="text-xs font-medium text-gray-500 mt-2 mb-6">{report.desc}</p>
            <button className="w-full border-2 text-xs font-black text-gray-600 py-2 rounded-xl group-hover:border-primary group-hover:text-primary uppercase tracking-widest transition-all">Generar Reporte</button>
          </div>
        ))}
      </div>
      
      <div className="bg-white rounded-3xl border shadow-sm p-12 text-center text-gray-400 border-dashed space-y-4">
        <BarChart4 className="h-16 w-16 mx-auto opacity-30" />
        <h3 className="font-bold">Gráficas de BI Dinámicas (PowerBI / Metabase Integrado)</h3>
        <p className="text-sm">Sección reservada para dashboards interactivos de PowerBI incrustados.</p>
      </div>
    </div>
  );
}
