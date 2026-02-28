import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileSignature, 
  CalendarClock, 
  Palmtree, 
  Network, 
  UserPlus, 
  Target, 
  HardHat, 
  Megaphone, 
  BarChart4, 
  Settings,
  GraduationCap,
  ClipboardCheck,
  Gift
} from 'lucide-react';
import { cn } from '@/lib/utils';

const hrNavItems = [
  { name: 'Dashboard', path: '/hr', icon: LayoutDashboard },
  { name: 'Empleados', path: '/hr/directory', icon: Users },
  { name: 'Asistencia y Faltas', path: '/hr/attendance', icon: CalendarClock },
  { name: 'Vacaciones y Permisos', path: '/hr/time-off', icon: Palmtree },
  { name: 'Contratos y Docs', path: '/hr/documents', icon: FileSignature },
  { name: 'Organigrama', path: '/hr/org-chart', icon: Network },
  { name: 'Reclutamiento', path: '/hr/recruitment', icon: UserPlus },
  { name: 'Desempeño', path: '/hr/performance', icon: Target },
  { name: 'Incentivos y Premios', path: '/hr/rewards', icon: Gift },
  { name: 'EPP e Inventario', path: '/hr/assets', icon: HardHat },
  { name: 'Gestión Academia', path: '/hr/academy-admin', icon: GraduationCap },
  { name: 'Encuestas de Clima', path: '/hr/surveys', icon: ClipboardCheck },
  { name: 'Comunicados', path: '/hr/announcements', icon: Megaphone },
  { name: 'Reportes', path: '/hr/reports', icon: BarChart4 },
  { name: 'Configuración', path: '/hr/settings', icon: Settings },
];

export default function HRLayout() {
  const location = useLocation();

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 md:-m-8 bg-gray-50">
      {/* HR Sidebar */}
      <aside className="w-64 bg-white border-r hidden lg:flex flex-col h-full overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-black text-gray-900 leading-tight">Human<br/>Resources</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestión Integral</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {hrNavItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/hr');
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                  isActive 
                    ? "bg-primary text-white shadow-md shadow-primary/20" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* HR Content Area */}
      <main className="flex-1 overflow-y-auto bg-gray-50/50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto pb-20">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
