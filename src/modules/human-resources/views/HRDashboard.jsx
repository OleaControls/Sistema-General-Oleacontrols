import React from 'react';
import { 
  Users, 
  UserPlus, 
  FileSignature, 
  Palmtree, 
  AlertTriangle,
  FileText,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function HRDashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Métricas RH</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Resumen mensual de la fuerza laboral y alertas pendientes.</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-xl border shadow-sm">
          <select className="bg-transparent px-4 py-2 text-sm font-bold outline-none cursor-pointer">
            <option>Todas las instalaciones</option>
            <option>Olea Controls MX</option>
            <option>Olea Controls USA</option>
          </select>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <button className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
          <UserPlus className="h-4 w-4" />
          Alta de Empleado
        </button>
        <button className="flex items-center gap-2 bg-white text-gray-700 border px-5 py-3 rounded-2xl font-bold text-sm hover:border-gray-300 hover:shadow-sm transition-all">
          <FileSignature className="h-4 w-4 text-primary" />
          Subir Contrato / Doc
        </button>
        <button className="flex items-center gap-2 bg-white text-gray-700 border px-5 py-3 rounded-2xl font-bold text-sm hover:border-gray-300 hover:shadow-sm transition-all">
          <Palmtree className="h-4 w-4 text-emerald-500" />
          Registrar Solicitud
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded-md uppercase tracking-wider">+3 Este mes</span>
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900">142</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Empleados Activos</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
              <TrendingDown className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-1 rounded-md uppercase tracking-wider">Alto</span>
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900">4.2%</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Tasa de Ausentismo</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-md uppercase tracking-wider">Acción Req.</span>
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900">12</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Contratos por Vencer</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Palmtree className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-black bg-gray-100 text-gray-600 px-2 py-1 rounded-md uppercase tracking-wider">Pendientes</span>
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900">5</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Solicitudes Vacaciones</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Alertas Documentales
            </h3>
            <Link to="/hr/documents" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider flex items-center gap-1">
              Ver Todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-4">
            {[
              { emp: 'Jorge Sánchez', doc: 'Examen Médico Anual', expires: 'En 3 días', urgency: 'high' },
              { emp: 'Ana Cruz (Ventas)', doc: 'Contrato Temporal', expires: 'En 1 semana', urgency: 'medium' },
              { emp: 'Gabriel Tech', doc: 'Certificación DC-3 Alturas', expires: 'Vencido', urgency: 'critical' },
            ].map((alert, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-2xl border bg-gray-50/50 hover:bg-white transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900">{alert.doc}</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase">{alert.emp}</p>
                </div>
                <span className={cn(
                  "text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-tighter",
                  alert.urgency === 'critical' ? "bg-red-100 text-red-700" :
                  alert.urgency === 'high' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                )}>
                  {alert.expires}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
              <Palmtree className="h-4 w-4 text-emerald-500" /> Solicitudes Pendientes
            </h3>
          </div>
          <div className="space-y-4">
            {[
              { emp: 'Luis Martínez', type: 'Vacaciones (5 días)', dates: '12 al 16 May', avatar: 'L' },
              { emp: 'Sofía Reyes', type: 'Permiso Personal (1 día)', dates: 'Mañana, 26 Feb', avatar: 'S' },
            ].map((req, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-2xl border bg-gray-50/50 hover:bg-white transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                    {req.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{req.emp}</p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase">{req.type} • {req.dates}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="text-[10px] font-black bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 uppercase">Rechazar</button>
                  <button className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 uppercase">Aprobar</button>
                </div>
              </div>
            ))}
            <div className="text-center pt-2">
              <Link to="/hr/time-off" className="text-xs font-black text-gray-400 hover:text-primary transition-colors uppercase tracking-wider">Ir a Bandeja Completa</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
