import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  Users2,
  FileText,
  ShoppingCart,
  Receipt,
  TrendingUp,
  Sliders,
  Briefcase,
  Activity
} from 'lucide-react';
import { useAuth, ROLES } from '@/store/AuthContext';
import { cn } from '@/lib/utils';

const crmNavItems = [
  { name: 'Pipeline / Tratos', path: '/crm/deals', icon: Briefcase },
  { name: 'Prospectos (Leads)', path: '/crm/leads', icon: Target },
  { name: 'Clientes (Cuentas)', path: '/crm/clients', icon: Users2 },
  { name: 'Presupuestos', path: '/crm/quotes', icon: FileText },
  { name: 'Órdenes de Compra', path: '/crm/orders', icon: ShoppingCart },
  { name: 'Facturación', path: '/crm/invoices', icon: Receipt },
  { name: 'Registro de Actividad', path: '/crm/activity', icon: Activity, adminOnly: true },
  { name: 'Config. Pipeline', path: '/crm/settings', icon: Sliders },
];

export default function CRMLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const isSalesPerson = user?.role === ROLES.ADMIN || user?.role === ROLES.SALES;
  const isFullHeight = ['/crm', '/crm/deals', '/crm/clients'].includes(location.pathname) && !location.pathname.startsWith('/crm/settings');

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 md:-m-8 bg-gray-50">
      {/* CRM Sidebar - Only for Admins and Sales Roles */}
      {isSalesPerson && (
        <aside className="w-64 bg-white border-r hidden lg:flex flex-col h-full overflow-y-auto">
          <div className="p-6 border-b sticky top-0 bg-white z-10">
            <h2 className="text-xl font-black text-gray-900 leading-tight">Sales &<br/>CRM</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Pipeline Manager</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {crmNavItems.filter(item => !item.adminOnly || user?.roles?.includes('ADMIN') || user?.role === 'ADMIN').map((item) => {
              const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/crm');
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
      )}

      {/* CRM Content Area */}
      <main className={cn(
        "flex-1 overflow-hidden flex flex-col bg-gray-50/50",
        !isSalesPerson && "w-full"
      )}>
        {/* Vistas fullscreen → sin padding ni max-width */}
        {isFullHeight ? (
          <div className="flex-1 overflow-hidden">
            <Outlet />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-6xl mx-auto pb-20">
              <Outlet />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
