import React from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function CRMLayout() {
  const location = useLocation();
  const isFullHeight = ['/crm', '/crm/deals', '/crm/clients', '/crm/calendar'].includes(location.pathname);

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 md:-m-8 bg-gray-50">
      {/* CRM Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col bg-gray-50/50 w-full">
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
