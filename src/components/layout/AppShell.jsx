import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Receipt, Users, GraduationCap,
  Briefcase, Menu, X, LogOut, Bell, ChevronDown, Trophy, User as UserIcon,
  BarChart3, Wallet, Target, Users2, FileText, Sliders, TrendingUp,
  Database, Settings, BarChart4, BookOpen
} from 'lucide-react';
import { useAuth, ROLES } from '@/store/AuthContext';
import { useTenant } from '@/store/TenantContext';
import { useTechnicianTracking } from '@/hooks/useTechnicianTracking';
import { cn } from '@/lib/utils';
import ConnectivityAlert from '@/components/shared/ConnectivityAlert';

// ── Estructura de navegación por rol ─────────────────────────────────────────
// Cada entrada define qué roles la ven. Admin solo métricas.

const NAV_STRUCTURE = [

  // ── ADMIN: solo métricas ───────────────────────────────────────────────────
  {
    type: 'group',
    name: 'Métricas',
    icon: BarChart4,
    roles: [ROLES.ADMIN],
    defaultOpen: true,
    items: [
      { name: 'Ventas',       path: '/sales/metricas', icon: TrendingUp,    roles: [ROLES.ADMIN] },
      { name: 'Operaciones',  path: '/ops/metricas',   icon: ClipboardList, roles: [ROLES.ADMIN] },
      { name: 'Técnicos',     path: '/tech/metricas',  icon: Trophy,        roles: [ROLES.ADMIN] },
      { name: 'R. Humanos',   path: '/hr',             icon: Users,         roles: [ROLES.ADMIN] },
    ]
  },

  // ── GRUPO: VENTAS (solo SALES) ─────────────────────────────────────────────
  {
    type: 'group',
    name: 'Ventas',
    icon: Briefcase,
    roles: [ROLES.SALES],
    defaultOpen: true,
    items: [
      { name: 'Pipeline / Tratos',  path: '/crm/deals',      icon: Briefcase,  roles: [ROLES.SALES] },
      { name: 'Prospectos (Leads)', path: '/crm/leads',      icon: Target,     roles: [ROLES.SALES] },
      { name: 'Clientes',           path: '/crm/clients',    icon: Users2,     roles: [ROLES.SALES] },
      { name: 'Cotizaciones',       path: '/crm/quotes',     icon: FileText,   roles: [ROLES.SALES] },
      { name: 'Métricas Ventas',    path: '/sales/metricas', icon: TrendingUp, roles: [ROLES.SALES] },
      { name: 'Gestión de Datos',   path: '/sales/datos',    icon: Database,   roles: [ROLES.SALES] },
      { name: 'Config. Pipeline',   path: '/crm/settings',   icon: Sliders,    roles: [ROLES.SALES] },
    ]
  },

  // ── GRUPO: OPERACIONES (solo OPS) ─────────────────────────────────────────
  {
    type: 'group',
    name: 'Operaciones',
    icon: ClipboardList,
    roles: [ROLES.OPS],
    defaultOpen: true,
    items: [
      { name: 'Órdenes de Trabajo', path: '/ots',                    icon: ClipboardList, roles: [ROLES.OPS],
        getName: () => 'Control OTs' },
      { name: 'Arena de Líderes',   path: '/ots/leaderboard',        icon: Trophy,        roles: [ROLES.OPS] },
      { name: 'Catálogos OT',       path: '/ops/ots/catalogs',       icon: BookOpen,      roles: [ROLES.OPS] },
      { name: 'Control de Gastos',  path: '/ops/expenses/control',   icon: BarChart3,     roles: [ROLES.OPS] },
      { name: 'Aprobaciones',       path: '/ops/approvals/expenses', icon: Wallet,        roles: [ROLES.OPS] },
      { name: 'Métricas Ops',       path: '/ops/metricas',           icon: TrendingUp,    roles: [ROLES.OPS] },
    ]
  },

  // ── TÉCNICOS ───────────────────────────────────────────────────────────────
  {
    type: 'item',
    name: 'Mis Órdenes',
    path: '/ots',
    icon: ClipboardList,
    roles: [ROLES.TECH],
  },
  {
    type: 'item',
    name: 'Mis Viáticos',
    path: '/expenses',
    icon: Receipt,
    roles: [ROLES.TECH],
  },
  {
    type: 'item',
    name: 'Arena de Líderes',
    path: '/ots/leaderboard',
    icon: Trophy,
    roles: [ROLES.TECH],
  },
  {
    type: 'item',
    name: 'Mis Métricas',
    path: '/tech/metricas',
    icon: TrendingUp,
    roles: [ROLES.TECH],
  },
  {
    type: 'item',
    name: 'Mis Ventas Directas',
    path: '/crm/indirect-sales',
    icon: Target,
    roles: [ROLES.TECH],
  },

  // ── RH ────────────────────────────────────────────────────────────────────
  {
    type: 'item',
    name: 'Recursos Humanos',
    path: '/hr/directory',
    icon: Users,
    roles: [ROLES.HR],
  },

  // ── COLABORADOR ───────────────────────────────────────────────────────────
  {
    type: 'item',
    name: 'Mis Ventas Directas',
    path: '/crm/indirect-sales',
    icon: Target,
    roles: [ROLES.COLLABORATOR],
  },

  // ── COMÚN: Mi Perfil ──────────────────────────────────────────────────────
  {
    type: 'item',
    name: 'Mi Perfil',
    path: '/profile',
    icon: UserIcon,
    roles: Object.values(ROLES),
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function hasRole(entry, userRoles) {
  return entry.roles?.some(r => userRoles.includes(r));
}

function filterItems(items, userRoles) {
  return items.filter(i => hasRole(i, userRoles));
}

// ── Componente NavItem (link simple) ──────────────────────────────────────────
function NavItem({ item, user, isCollapsed, onClick }) {
  const location = useLocation();
  const isActive = item.path === '/'
    ? location.pathname === '/'
    : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  const label = item.getName ? item.getName(user) : item.name;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all",
        isActive ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-gray-500 hover:bg-gray-100"
      )}
    >
      <item.icon className={cn("h-4 w-4 shrink-0", isActive && "stroke-[3px]")} />
      {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

// ── Componente NavGroup (colapsable) ──────────────────────────────────────────
function NavGroup({ group, user, userRoles, isCollapsed, closeSidebar }) {
  const location = useLocation();
  const visibleItems = filterItems(group.items, userRoles);
  if (visibleItems.length === 0) return null;

  const isGroupActive = visibleItems.some(i =>
    i.path === location.pathname || location.pathname.startsWith(i.path + '/')
  );

  const [open, setOpen] = useState(group.defaultOpen || isGroupActive);

  if (isCollapsed) {
    return (
      <div className="space-y-1">
        {visibleItems.map(item => (
          <NavItem key={item.path} item={item} user={user} isCollapsed={true} onClick={closeSidebar} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.12em] transition-all",
          isGroupActive ? "text-primary" : "text-gray-400 hover:text-gray-600"
        )}
      >
        <div className="flex items-center gap-2">
          <group.icon className="h-3.5 w-3.5 shrink-0" />
          <span>{group.name}</span>
        </div>
        <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="mt-1 ml-3 pl-3 border-l-2 border-gray-100 space-y-0.5">
          {visibleItems.map(item => (
            <NavItem key={item.path} item={item} user={user} isCollapsed={false} onClick={closeSidebar} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── AppShell ──────────────────────────────────────────────────────────────────
export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  useTechnicianTracking();
  const { activeTenant } = useTenant();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const userRoles = user?.roles || [user?.role];

  const handleLogout = () => { logout(); navigate('/login'); };

  // Nombre de la ruta activa para el header
  const activeItemName = (() => {
    for (const entry of NAV_STRUCTURE) {
      if (entry.type === 'item' && entry.path === location.pathname)
        return entry.getName ? entry.getName(user) : entry.name;
      if (entry.type === 'group') {
        const found = entry.items?.find(i => i.path === location.pathname);
        if (found) return found.getName ? found.getName(user) : found.name;
      }
    }
    return 'Sistema OleaControls';
  })();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <ConnectivityAlert />

      {/* Header móvil */}
      <header className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
          <img src="/img/OLEACONTROLS.png" className="h-5 object-contain" alt="Olea Controls" />
        </div>
        <img src={user?.avatar} className="h-8 w-8 rounded-full border shadow-sm" alt="Profile" />
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 bg-white border-r transform transition-all duration-300 md:sticky md:top-0 md:h-screen",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className="h-full flex flex-col">

          {/* Logo */}
          <div className={cn("p-5 flex items-center justify-between border-b border-gray-50", isCollapsed && "px-4 justify-center")}>
            {isCollapsed
              ? <img src="/img/Insignia.png" className="h-8 w-8 object-contain" alt="Insignia" />
              : <img src="/img/OLEACONTROLS.png" className="h-6 object-contain" alt="Olea Controls" />
            }
            <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Rol badge */}
          {!isCollapsed && (
            <div className="px-5 py-2 border-b border-gray-50">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                {user?.role === ROLES.ADMIN ? 'Administrador — Solo Métricas' :
                 user?.role === ROLES.SALES ? 'Ventas' :
                 user?.role === ROLES.OPS   ? 'Operaciones' :
                 user?.role === ROLES.TECH  ? 'Técnico' :
                 user?.role === ROLES.HR    ? 'Recursos Humanos' :
                 user?.role === ROLES.COLLABORATOR ? 'Colaborador' : user?.role}
              </span>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {NAV_STRUCTURE.map((entry, i) => {
              if (!hasRole(entry, userRoles)) return null;

              if (entry.type === 'item') {
                return (
                  <NavItem
                    key={entry.path + i}
                    item={entry}
                    user={user}
                    isCollapsed={isCollapsed}
                    onClick={() => setSidebarOpen(false)}
                  />
                );
              }

              if (entry.type === 'group') {
                return (
                  <NavGroup
                    key={entry.name}
                    group={entry}
                    user={user}
                    userRoles={userRoles}
                    isCollapsed={isCollapsed}
                    closeSidebar={() => setSidebarOpen(false)}
                  />
                );
              }

              return null;
            })}
          </nav>

          {/* Footer usuario */}
          <div className="p-4 border-t border-gray-50">
            <div className={cn("flex items-center gap-3 py-2", isCollapsed ? "justify-center" : "px-1")}>
              <img src={user?.avatar} className="h-9 w-9 rounded-xl border-2 border-white shadow-md shrink-0" alt="Profile" />
              {!isCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-black text-gray-900 truncate uppercase leading-none mb-1">{user?.name}</p>
                  <p className="text-[9px] font-bold text-primary truncate uppercase tracking-widest">{user?.role}</p>
                </div>
              )}
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Cerrar sesión">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="hidden md:flex bg-white border-b h-16 items-center justify-between px-8 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
              {activeItemName}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">{activeTenant?.name}</p>
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
