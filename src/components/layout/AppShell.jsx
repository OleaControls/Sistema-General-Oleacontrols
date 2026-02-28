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
  Trophy
} from 'lucide-react';
import { useAuth, ROLES } from '@/store/AuthContext';
import { useTenant } from '@/store/TenantContext';
import { cn } from '@/lib/utils';
import ConnectivityAlert from '@/components/shared/ConnectivityAlert';

const navItems = [
  { 
    name: 'Dashboard', 
    path: '/', 
    icon: LayoutDashboard, 
    roles: Object.values(ROLES),
    getName: (user) => {
      if (user?.role === ROLES.TECH) return 'Mis Trabajos';
      if (user?.role === ROLES.OPS) return 'Control OTs';
      if (user?.role === ROLES.HR) return 'Métricas RH';
      if (user?.role === ROLES.SALES) return 'Pipeline Ventas';
      return 'Panel Global';
    }
  },
  { 
    name: 'Operaciones', 
    path: '/ots', 
    icon: ClipboardList, 
    roles: [ROLES.ADMIN, ROLES.OPS, ROLES.TECH],
    getName: (user) => user?.role === ROLES.TECH ? 'Órdenes Asignadas' : 'Gestión de OTs'
  },
  { 
    name: 'Ranking', 
    path: '/ots/leaderboard', 
    icon: Trophy, 
    roles: [ROLES.OPS, ROLES.TECH],
    getName: () => 'Arena de Líderes'
  },
  { 
    name: 'Gastos', 
    path: '/expenses', 
    icon: Receipt, 
    roles: [ROLES.ADMIN, ROLES.OPS, ROLES.TECH],
    getPath: (user) => (user?.role === ROLES.ADMIN || user?.role === ROLES.OPS) ? '/ops/approvals/expenses' : '/expenses',
    getName: (user) => (user?.role === ROLES.ADMIN || user?.role === ROLES.OPS) ? 'Aprobaciones' : 'Mis Viáticos'
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
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const { activeTenant, switchTenant, allTenants } = useTenant();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <ConnectivityAlert />
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
          <span className="font-bold text-primary">Olea Controls</span>
        </div>
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 text-gray-500" />
          <img src={user?.avatar} className="h-8 w-8 rounded-full border" alt="Profile" />
        </div>
      </header>

      {/* Sidebar (Desktop) / Drawer (Mobile) */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center justify-between">
            <span className="text-xl font-bold text-primary tracking-tight">OLEA PLATFORM</span>
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {filteredNavItems.map((item) => {
              const itemPath = item.getPath ? item.getPath(user) : item.path;
              const itemName = item.getName ? item.getName(user) : item.name;
              return (
                <Link
                  key={item.name}
                  to={itemPath}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all",
                    location.pathname === itemPath 
                      ? "bg-primary text-white shadow-md shadow-primary/20" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {itemName}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t space-y-4">
            {/* Tenant Selector */}
            <div className="relative group">
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Instalación</label>
              <select 
                value={activeTenant.id}
                onChange={(e) => switchTenant(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-md py-1.5 px-2 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
              >
                {allTenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 px-3 py-2">
              <img src={user?.avatar} className="h-8 w-8 rounded-full border" alt="Profile" />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{user?.role?.toLowerCase()}</p>
              </div>
              <button onClick={handleLogout} title="Cerrar sesión">
                <LogOut className="h-4 w-4 text-gray-400 hover:text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar (Desktop) */}
        <header className="hidden md:flex bg-white border-b h-16 items-center justify-between px-8 sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-gray-800">
            {navItems.find(n => n.path === location.pathname)?.name || 'Dashboard'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right mr-2">
              <p className="text-xs font-bold text-primary">{activeTenant.name}</p>
              <p className="text-[10px] text-gray-400">ID: {activeTenant.id}</p>
            </div>
            <button className="relative p-2 text-gray-400 hover:text-primary transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
          {children}
        </div>

        {/* Bottom Nav (Mobile/PWA) */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t flex justify-around py-2 px-1 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          {filteredNavItems.slice(0, 5).map((item) => {
            const itemPath = item.getPath ? item.getPath(user) : item.path;
            const itemName = item.getName ? item.getName(user) : item.name;
            const isActive = location.pathname === itemPath;
            return (
              <Link
                key={item.name}
                to={itemPath}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 gap-1 py-1 transition-all",
                  isActive ? "text-primary scale-110" : "text-gray-400"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "stroke-[3px]" : "stroke-[2px]")} />
                <span className="text-[8px] font-black uppercase tracking-tighter truncate w-full text-center">{itemName.split(' ')[0]}</span>
              </Link>
            );
          })}
        </nav>
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
