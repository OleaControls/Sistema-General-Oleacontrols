import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  Users, FileSignature, CalendarClock, Network,
  UserPlus, Target, HardHat, Megaphone, BarChart4, Settings,
  ClipboardCheck, Gift, LayoutDashboard, Receipt, Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';

const hrNavGroups = [
  {
    label: 'General',
    items: [
      { name: 'Dashboard', path: '/hr', icon: LayoutDashboard, exact: true },
    ]
  },
  {
    label: 'Personas',
    items: [
      { name: 'Empleados', path: '/hr/directory', icon: Users },
      { name: 'Organigrama', path: '/hr/org-chart', icon: Network },
      { name: 'Reclutamiento', path: '/hr/recruitment', icon: UserPlus },
    ]
  },
  {
    label: 'Asistencia & Tiempo',
    items: [
      { name: 'Asistencia & Vacaciones', path: '/hr/attendance', icon: CalendarClock },
    ]
  },
  {
    label: 'Talento',
    items: [
      { name: 'Desempeño', path: '/hr/performance', icon: Target },
      { name: 'KPIs Técnicos', path: '/hr/tech-kpis', icon: Gauge },
      { name: 'Incentivos y Premios', path: '/hr/rewards', icon: Gift },
    ]
  },
  {
    label: 'Recursos',
    items: [
      { name: 'EPP e Inventario', path: '/hr/assets', icon: HardHat },
      { name: 'Contratos y Docs', path: '/hr/documents', icon: FileSignature },
    ]
  },
  {
    label: 'Comunicación',
    items: [
      { name: 'Encuestas de Clima', path: '/hr/surveys', icon: ClipboardCheck },
      { name: 'Comunicados', path: '/hr/announcements', icon: Megaphone },
    ]
  },
  {
    label: 'Nómina',
    items: [
      { name: 'Sistema de Nómina', path: '/hr/payroll', icon: Receipt },
    ]
  },
  {
    label: 'Administración',
    items: [
      { name: 'Reportes', path: '/hr/reports', icon: BarChart4 },
      { name: 'Configuración', path: '/hr/settings', icon: Settings },
    ]
  },
];

const allItems = hrNavGroups.flatMap(g => g.items);

function isActive(path, exact, locationPath) {
  if (exact) return locationPath === path;
  return locationPath.startsWith(path) && path !== '/hr';
}

export default function HRLayout() {
  const location = useLocation();

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] -m-4 md:-m-8 bg-gray-50">
      {/* Mobile HR Nav */}
      <div className="lg:hidden bg-white border-b sticky top-0 z-20 flex overflow-x-auto no-scrollbar scroll-smooth px-2 py-3 gap-2 shadow-sm">
        {allItems.map((item) => {
          const active = isActive(item.path, item.exact, location.pathname);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight whitespace-nowrap transition-all flex-shrink-0",
                active
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-gray-50 text-gray-500 border border-transparent hover:bg-gray-100"
              )}
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </div>

      {/* HR Sidebar (Desktop) */}
      <aside className="w-60 bg-white border-r hidden lg:flex flex-col h-full overflow-y-auto">
        <div className="px-5 py-5 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-black text-gray-900 leading-tight">Human Resources</h2>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Gestión Integral</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {hrNavGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 mb-1.5 text-[9px] font-black text-gray-300 uppercase tracking-widest">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.path, item.exact, location.pathname);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all",
                        active
                          ? "bg-primary text-white shadow-sm shadow-primary/20"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto bg-gray-50/50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto pb-20">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
