import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Receipt, Users, GraduationCap,
  Briefcase, Menu, X, LogOut, Bell, ChevronDown, Trophy, User as UserIcon,
  BarChart3, Wallet, Target, Users2, FileText, Sliders, TrendingUp,
  Activity, Settings, BarChart4, BookOpen, Calendar, Package, Star, CalendarCheck, ClipboardCheck,
  FolderKanban, PenTool, Wrench, RefreshCw, Compass, Calculator, Building2, Store, ShieldCheck, Boxes,
  Map as MapIcon, Sparkles
} from 'lucide-react';
import { useAuth, ROLES } from '@/store/AuthContext';
import { useTenant } from '@/store/TenantContext';
import { useTechnicianTracking } from '@/hooks/useTechnicianTracking';
import { cn } from '@/lib/utils';
import ConnectivityAlert from '@/components/shared/ConnectivityAlert';

// ── Estructura de navegación por rol ─────────────────────────────────────────
// Cada entrada define qué roles la ven. Admin solo métricas.

const NAV_STRUCTURE = [

  // ── ADMIN: métricas ────────────────────────────────────────────────────────
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
      { name: 'Asistencia Técnicos', path: '/ops/tech-attendance',   icon: ClipboardCheck, roles: [ROLES.ADMIN] },
    ]
  },

  // ── ADMIN: CRM / Seguimientos ─────────────────────────────────────────────
  {
    type: 'group',
    name: 'CRM',
    icon: Activity,
    roles: [ROLES.ADMIN],
    defaultOpen: false,
    items: [
      { name: 'Agenda Ventas',  path: '/crm/calendar',     icon: Calendar,   roles: [ROLES.ADMIN] },
      { name: 'Cotizaciones', path: '/crm/quotes',       icon: FileText,   roles: [ROLES.ADMIN] },
      { name: 'Métricas CRM', path: '/sales/metricas',   icon: TrendingUp, roles: [ROLES.ADMIN] },
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
      { name: 'Embudo / Tratos',    path: '/crm/deals',           icon: Briefcase,  roles: [ROLES.SALES] },
      { name: 'Prospectos (Leads)', path: '/crm/leads',           icon: Target,     roles: [ROLES.SALES] },
      { name: 'Clientes',           path: '/crm/clients',         icon: Users2,     roles: [ROLES.SALES] },
      { name: 'Cotizaciones',       path: '/crm/quotes',          icon: FileText,   roles: [ROLES.SALES] },
      { name: 'Agenda',             path: '/crm/calendar',        icon: Calendar,   roles: [ROLES.SALES] },
      { name: 'Métricas Ventas',    path: '/sales/metricas',      icon: TrendingUp, roles: [ROLES.SALES] },
      { name: 'Catálogo Productos', path: '/crm/catalog',         icon: Package,    roles: [ROLES.SALES] },
      { name: 'Config. Embudo',     path: '/crm/settings',        icon: Sliders,    roles: [ROLES.SALES] },
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
      { name: 'Agenda Operativa',   path: '/ops/calendar',           icon: Calendar,      roles: [ROLES.OPS] },
      { name: 'Arena de Líderes',   path: '/ots/leaderboard',        icon: Trophy,        roles: [ROLES.OPS] },
      { name: 'Catálogos OT',       path: '/ops/ots/catalogs',       icon: BookOpen,      roles: [ROLES.OPS] },
      { name: 'Control de Gastos',  path: '/ops/expenses/control',   icon: BarChart3,     roles: [ROLES.OPS] },
      { name: 'Aprobaciones',       path: '/ops/approvals/expenses', icon: Wallet,        roles: [ROLES.OPS] },
      { name: 'Métricas Ops',       path: '/ops/metricas',           icon: TrendingUp,    roles: [ROLES.OPS] },
      { name: 'PROP Técnicos',      path: '/prop',                   icon: Compass,       roles: [ROLES.OPS] },
      { name: 'Calificaciones',     path: '/performance',            icon: Star,          roles: [ROLES.OPS] },
      { name: 'Asistencia Técnicos', path: '/ops/tech-attendance',    icon: ClipboardCheck, roles: [ROLES.OPS] },
      // El supervisor es quien carga y renueva los documentos para entrar a
      // tienda, así que el acceso también vive aquí, no solo en RH.
      { name: 'Docs. de Campo',     path: '/hr/documentacion-campo', icon: ShieldCheck,   roles: [ROLES.OPS] },
    ]
  },

  // ── TÉCNICOS ───────────────────────────────────────────────────────────────
  {
    type: 'item',
    name: 'Mi Asistencia',
    path: '/tech/attendance',
    icon: ClipboardCheck,
    roles: [ROLES.TECH],
  },
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
    roles: [ROLES.TECH, ROLES.COLLABORATOR],
  },
  {
    type: 'item',
    name: 'PROP',
    path: '/prop',
    icon: Compass,
    roles: [ROLES.TECH],
  },

  // ── GERENTE DE PROYECTOS ────────────────────────────────────────────────────
  {
    type: 'group',
    name: 'Proyectos',
    icon: FolderKanban,
    roles: [ROLES.PM, ROLES.ADMIN],
    defaultOpen: true,
    items: [
      { name: 'Todos',          path: '/projects',                        icon: FolderKanban, roles: [ROLES.PM, ROLES.ADMIN], exact: true },
      // Panel del gerente: indicadores, regla de anticipación y carga de técnicos.
      { name: 'Supervisión',    path: '/projects/supervision',            icon: ShieldCheck,  roles: [ROLES.PM, ROLES.ADMIN] },
      // El calendario de operaciones es el mismo para OTs y proyectos.
      { name: 'Calendario general', path: '/ops/calendar',                icon: CalendarCheck, roles: [ROLES.PM, ROLES.ADMIN] },
      // Zonificación de la operación: qué vive en cada zona.
      { name: 'Mapa de Zonas',  path: '/projects/zonas',                  icon: MapIcon,      roles: [ROLES.PM, ROLES.ADMIN] },
      // Las áreas de mejora dejan de ser una hoja suelta.
      { name: 'Mejora Continua', path: '/projects/mejora-continua',       icon: Sparkles,     roles: [ROLES.PM, ROLES.ADMIN] },
      {
        name: 'Diseño', path: '/projects/servicio/diseno', icon: PenTool, roles: [ROLES.PM, ROLES.ADMIN],
        // Tercer nivel: se despliega al entrar a Diseño o con el chevron.
        children: [
          { name: 'Cotizador de Retail', path: '/projects/cotizador', icon: Calculator, roles: [ROLES.PM, ROLES.ADMIN] },
        ],
      },
      {
        name: 'Implementación', path: '/projects/servicio/implementacion', icon: Wrench, roles: [ROLES.PM, ROLES.ADMIN],
        children: [
          { name: 'Cotizador de Edificios', path: '/projects/cotizador-edificios', icon: Building2, roles: [ROLES.PM, ROLES.ADMIN] },
        ],
      },
      { name: 'Re-Ingeniería',  path: '/projects/servicio/reingenieria',  icon: RefreshCw,    roles: [ROLES.PM, ROLES.ADMIN] },
      // Las OT de tienda se gestionan como proyecto y llevan su propio embudo.
      // Antes este apartado era exclusivo de Coppel; ahora agrupa a todas las
      // cadenas y la marca de cada una va en el campo Marca.
      { name: 'Tiendas',        path: '/projects/servicio/tiendas',       icon: Store,        roles: [ROLES.PM, ROLES.ADMIN] },
      // Un solo inventario para toda la operación de tiendas, no uno por proyecto.
      { name: 'Inventario de Tiendas', path: '/projects/inventario-tiendas', icon: Boxes,     roles: [ROLES.PM, ROLES.ADMIN, ROLES.OPS] },
    ]
  },

  // ── RH ────────────────────────────────────────────────────────────────────
  {
    type: 'group',
    name: 'Recursos Humanos',
    icon: Users,
    roles: [ROLES.HR, ROLES.ADMIN],
    defaultOpen: true,
    items: [
      { name: 'Dashboard',            path: '/hr',              icon: LayoutDashboard, roles: [ROLES.HR, ROLES.ADMIN], exact: true },
      { name: 'Empleados',            path: '/hr/directory',    icon: Users,           roles: [ROLES.HR, ROLES.ADMIN] },
      { name: 'Organigrama',          path: '/hr/org-chart',    icon: Users2,          roles: [ROLES.HR, ROLES.ADMIN] },
      { name: 'Reclutamiento',        path: '/hr/recruitment',  icon: GraduationCap,   roles: [ROLES.HR, ROLES.ADMIN] },
      { name: 'Asistencia & Vacaciones', path: '/hr/attendance', icon: CalendarCheck,  roles: [ROLES.HR, ROLES.ADMIN] },
      { name: 'Desempeño',            path: '/hr/performance',  icon: Target,          roles: [ROLES.HR, ROLES.ADMIN] },
      { name: 'KPIs Técnicos',        path: '/hr/tech-kpis',    icon: BarChart3,       roles: [ROLES.HR, ROLES.ADMIN] },
      { name: 'Incentivos y Premios', path: '/hr/rewards',      icon: Star,            roles: [ROLES.HR, ROLES.ADMIN] },
      { name: 'EPP e Inventario',     path: '/hr/assets',       icon: Package,         roles: [ROLES.HR, ROLES.ADMIN] },
      { name: 'Contratos y Docs',     path: '/hr/documents',    icon: FileText,        roles: [ROLES.HR, ROLES.ADMIN] },
      // Documentos con vigencia que el técnico debe traer para entrar a sitio.
      { name: 'Docs. de Campo',       path: '/hr/documentacion-campo', icon: ShieldCheck, roles: [ROLES.HR, ROLES.ADMIN] },
      { name: 'Capacitación',         path: '/hr/capacitacion',  icon: GraduationCap,  roles: [ROLES.HR, ROLES.ADMIN] },
      { name: 'Encuestas de Clima',   path: '/hr/surveys',      icon: ClipboardCheck,  roles: [ROLES.HR, ROLES.ADMIN] },
      { name: 'Comunicados',          path: '/hr/announcements', icon: Bell,           roles: [ROLES.HR, ROLES.ADMIN] },
      { name: 'Sistema de Nómina',    path: '/hr/payroll',      icon: Receipt,         roles: [ROLES.HR, ROLES.ADMIN] },
      { name: 'Reportes',             path: '/hr/reports',      icon: BarChart4,       roles: [ROLES.ADMIN] },
      { name: 'Configuración',        path: '/hr/settings',     icon: Settings,        roles: [ROLES.ADMIN] },
    ]
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
// Vistas exclusivas de técnico (van aparte; el admin no las ve).
const TECH_SCOPE = [ROLES.TECH, ROLES.COLLABORATOR];
function isTechOnly(entry) {
  return Array.isArray(entry.roles) && entry.roles.length > 0 && entry.roles.every(r => TECH_SCOPE.includes(r));
}

function hasRole(entry, userRoles) {
  // El admin ve todas las vistas de todos los perfiles, excepto las de técnico.
  if (userRoles.includes(ROLES.ADMIN) && !isTechOnly(entry)) return true;
  return entry.roles?.some(r => userRoles.includes(r));
}

function filterItems(items, userRoles) {
  return items.filter(i => hasRole(i, userRoles));
}

// Un item cuenta como activo en su ruta exacta y, salvo que se marque `exact`,
// también en sus rutas hijas (/x/123).
function isPathActive(pathname, item) {
  if (item.path === '/' || item.exact) return pathname === item.path;
  return pathname === item.path || pathname.startsWith(item.path + '/');
}

// ── Componente NavItem (link simple) ──────────────────────────────────────────
function NavItem({ item, user, isCollapsed, onClick }) {
  const location = useLocation();
  const isActive = isPathActive(location.pathname, item);
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

// ── Componente NavBranch (item con sub-items) ─────────────────────────────────
// Tercer nivel del menú: el item sigue siendo un link normal y además despliega
// sus hijos. Al entrar al item se abre solo; el chevron permite cerrarlo.
function NavBranch({ item, user, userRoles, closeSidebar }) {
  const location = useLocation();
  const children = filterItems(item.children, userRoles);

  const isSelfActive = isPathActive(location.pathname, item);
  const isChildActive = children.some(c => isPathActive(location.pathname, c));
  const [open, setOpen] = useState(isSelfActive || isChildActive);

  // Reabre al navegar aquí desde otra sección o desde un enlace directo.
  useEffect(() => {
    if (isSelfActive || isChildActive) setOpen(true);
  }, [isSelfActive, isChildActive]);

  if (children.length === 0) {
    return <NavItem item={item} user={user} isCollapsed={false} onClick={closeSidebar} />;
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 pr-1.5 rounded-xl transition-all",
          isSelfActive ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-gray-500 hover:bg-gray-100"
        )}
      >
        <Link
          to={item.path}
          onClick={() => { setOpen(true); closeSidebar?.(); }}
          className="flex items-center gap-3 flex-1 min-w-0 px-3 py-2.5 text-[11px] font-black uppercase tracking-wider"
        >
          <item.icon className={cn("h-4 w-4 shrink-0", isSelfActive && "stroke-[3px]")} />
          <span className="truncate">{item.name}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? `Ocultar sub-secciones de ${item.name}` : `Ver sub-secciones de ${item.name}`}
          aria-expanded={open}
          className={cn("p-1 rounded-lg shrink-0", isSelfActive ? "hover:bg-white/20" : "hover:bg-gray-200")}
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", open && "rotate-180")} />
        </button>
      </div>

      {open && (
        <div className="mt-0.5 ml-4 pl-3 border-l-2 border-gray-100 space-y-0.5">
          {children.map(c => (
            <NavItem key={c.path} item={c} user={user} isCollapsed={false} onClick={closeSidebar} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente NavGroup (colapsable) ──────────────────────────────────────────
function NavGroup({ group, user, userRoles, isCollapsed, closeSidebar }) {
  const location = useLocation();
  const visibleItems = filterItems(group.items, userRoles);

  const isGroupActive = visibleItems.some(i =>
    isPathActive(location.pathname, i) ||
    (i.children || []).some(c => isPathActive(location.pathname, c))
  );

  const [open, setOpen] = useState(group.defaultOpen || isGroupActive);

  // Los hooks deben ir antes de cualquier return condicional para no romper el orden de hooks.
  if (visibleItems.length === 0) return null;

  // Con la barra colapsada no hay espacio para desplegables: los sub-items se
  // aplanan y quedan como un icono más.
  if (isCollapsed) {
    const flat = visibleItems.flatMap(i => [i, ...filterItems(i.children || [], userRoles)]);
    return (
      <div className="space-y-1">
        {flat.map(item => (
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
            item.children
              ? <NavBranch key={item.path} item={item} user={user} userRoles={userRoles} closeSidebar={closeSidebar} />
              : <NavItem key={item.path} item={item} user={user} isCollapsed={false} onClick={closeSidebar} />
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

  const rawRoles = user?.roles || [user?.role];
  // El rol RH es exclusivo: un usuario de Recursos Humanos que NO sea ADMIN solo
  // ve el módulo de RH, aunque tenga otros roles asignados. ADMIN sigue viendo todo.
  const userRoles = (!rawRoles.includes(ROLES.ADMIN) && rawRoles.includes(ROLES.HR))
    ? [ROLES.HR]
    : rawRoles;

  const handleLogout = () => { logout(); navigate('/login'); };

  // Nombre de la ruta activa para el header
  const activeItemName = (() => {
    for (const entry of NAV_STRUCTURE) {
      if (entry.type === 'item' && entry.path === location.pathname)
        return entry.getName ? entry.getName(user) : entry.name;
      if (entry.type === 'group') {
        // Aplana los sub-items para que el título también salga en el 3er nivel.
        const flat = (entry.items || []).flatMap(i => [i, ...(i.children || [])]);
        const found = flat.find(i => i.path === location.pathname);
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
                {userRoles.map(r =>
                  r === ROLES.ADMIN ? 'Administrador' :
                  r === ROLES.SALES ? 'Ventas' :
                  r === ROLES.OPS   ? 'Operaciones' :
                  r === ROLES.TECH  ? 'Técnico' :
                  r === ROLES.HR    ? 'R. Humanos' :
                  r === ROLES.PM    ? 'Gerente de Proyectos' :
                  r === ROLES.COLLABORATOR ? 'Colaborador' : r
                ).join(' · ')}
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
