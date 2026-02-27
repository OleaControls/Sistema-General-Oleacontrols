import React, { createContext, useContext, useState, useEffect } from 'react';

const TenantContext = createContext();

export const TENANTS = [
  { id: 'olea-mx', name: 'Olea Controls México', country: 'MX' },
  { id: 'olea-usa', name: 'Olea Controls USA', country: 'USA' },
  { id: 'olea-col', name: 'Olea Controls Colombia', country: 'COL' }
];

export function TenantProvider({ children }) {
  const [activeTenant, setActiveTenant] = useState(TENANTS[0]);

  useEffect(() => {
    const savedTenant = localStorage.getItem('olea_tenant');
    if (savedTenant) {
      const found = TENANTS.find(t => t.id === savedTenant);
      if (found) setActiveTenant(found);
    }
  }, []);

  const switchTenant = (id) => {
    const found = TENANTS.find(t => t.id === id);
    if (found) {
      setActiveTenant(found);
      localStorage.setItem('olea_tenant', id);
    }
  };

  return (
    <TenantContext.Provider value={{ activeTenant, switchTenant, allTenants: TENANTS }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);
