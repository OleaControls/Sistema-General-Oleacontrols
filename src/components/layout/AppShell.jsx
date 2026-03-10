import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Receipt, 
  Users, 
  GraduationCap, 
  Briefcase,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronDown,
  Trophy,
  User as UserIcon,
  BarChart3,
  Wallet,
  Target
} from 'lucide-react';
import { useAuth, ROLES } from '@/store/AuthContext';
import { useTenant } from '@/store/TenantContext';
import { useTechnicianTracking } from '@/hooks/useTechnicianTracking';
import { cn } from '@/lib/utils';
import ConnectivityAlert from '@/components/shared/ConnectivityAlert';

const navItems = [
  { 
    name: 'Dashboard', 
    path: '/', 
    icon: LayoutDashboard, 
    roles: Object.values(ROLES),
    getName: (user) => {
      const r = user?.role;
      if (r === ROLES.TECH) return 'Mi Jornada';
      if (r === ROLES.OPS) return 'Control OTs';
      if (r === ROLES.HR) return 'Métricas RH';
      if (r === ROLES.SALES) return 'Pipeline Ventas';
      if (r === ROLES.COLLABORATOR) return 'Mi Inicio';
      return 'Panel Global';
    }
  },
  { 
    name: 'Operaciones', 
    path: '/ots', 
    icon: ClipboardList, 
    roles: [ROLES.ADMIN, ROLES.TECH],
    getName: (user) => user?.role === ROLES.ADMIN ? 'Gestión Global OTs' : 'Mis Órdenes'
  },
  { 
    name: 'Ranking', 
    path: '/ots/leaderboard', 
    icon: Trophy, 
    roles: [ROLES.ADMIN, ROLES.OPS, ROLES.TECH],
    getName: () => 'Arena de Líderes'
  },
  { 
    name: 'Control de Gastos', 
    path: '/ops/expenses/control', 
    icon: BarChart3, 
    roles: [ROLES.ADMIN, ROLES.OPS],
    getName: () => 'Control de Gastos'
  },
  { 
    name: 'Aprobaciones', 
    path: '/ops/approvals/expenses', 
    icon: Wallet, 
    roles: [ROLES.ADMIN, ROLES.OPS],
    getName: () => 'Aprobaciones'
  },
  { 
    name: 'Mis Viáticos', 
    path: '/expenses', 
    icon: Receipt, 
    roles: [ROLES.TECH],
    getName: () => 'Mis Viáticos'
  },
  { 
    name: 'Recursos Humanos', 
    path: '/hr', 
    icon: Users, 
    roles: [ROLES.ADMIN, ROLES.HR] 
  },
  { 
    name: 'Ventas y CRM', 
    path: '/crm', 
    icon: Briefcase, 
    roles: [ROLES.ADMIN, ROLES.SALES] 
  },
  {
    name: 'Ventas Indirectas',
    path: '/crm/indirect-sales',
    icon: Target,
    roles: [ROLES.ADMIN, ROLES.OPS, ROLES.TECH, ROLES.SALES]
  },
  {
    name: 'Evaluaciones',
    path: '/performance',
    icon: BarChart3,
    roles: [ROLES.ADMIN, ROLES.OPS, ROLES.TECH, ROLES.SALES],
    getName: () => 'Desempeño y Evaluación'
  },
  {
    name: 'Mi Perfil',
    path: '/profile',
    icon: UserIcon,
    roles: Object.values(ROLES)
  },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  useTechnicianTracking();
  const { activeTenant, switchTenant, allTenants } = useTenant();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const filteredNavItems = navItems.filter(item => {
    const userRoles = user?.roles || [user?.role];
    return item.roles.some(role => userRoles.includes(role));
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <ConnectivityAlert />
      <header className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
          <img src="/img/OLEACONTROLS.png" className="h-5 object-contain" alt="Olea Controls" />
        </div>
        <img src={user?.avatar} className="h-8 w-8 rounded-full border shadow-sm" alt="Profile" />
      </header>

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white border-r transform transition-all duration-300 md:sticky md:top-0 md:h-screen",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className="h-full flex flex-col">
          <div className={cn("p-6 flex items-center justify-between", isCollapsed && "px-4 justify-center")}>
            {isCollapsed ? (
              <img src="/img/Insignia.png" className="h-8 w-8 object-contain" alt="Insignia" />
            ) : (
              <img src="/img/OLEACONTROLS.png" className="h-6 object-contain" alt="Olea Controls" />
            )}
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}><X className="h-6 w-6" /></button>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {filteredNavItems.map((item) => {
              const itemPath = item.path;
              const itemName = item.getName ? item.getName(user) : item.name;
              const isActive = location.pathname === itemPath;
              return (
                <Link key={item.name} to={itemPath} onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all",
                    isActive ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-gray-500 hover:bg-gray-100"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "stroke-[3px]" : "")} />
                  {!isCollapsed && <span>{itemName}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t">
            <div className={cn("flex items-center gap-3 py-2", isCollapsed ? "justify-center" : "px-3")}>
              <img src={user?.avatar} className="h-9 w-9 rounded-xl border-2 border-white shadow-md shrink-0" alt="Profile" />
              {!isCollapsed && (
                  <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-black text-gray-900 truncate uppercase leading-none mb-1">{user?.name}</p>
                      <p className="text-[9px] font-bold text-primary truncate uppercase tracking-widest">{user?.role}</p>
                  </div>
              )}
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="hidden md:flex bg-white border-b h-16 items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors">
                <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                {navItems.find(n => n.path === location.pathname)?.name || 'Módulo de Operaciones'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">{activeTenant.name}</p>
              <p className="text-[9px] font-bold text-gray-400">STATUS: ONLINE</p>
            </div>
            <button className="relative p-2 text-gray-400 hover:text-primary transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
