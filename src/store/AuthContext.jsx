import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const ROLES = {
  ADMIN: 'ADMIN',
  OPS: 'OPERATIONS',
  TECH: 'TECHNICIAN',
  HR: 'HR',
  SALES: 'SALES'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carga de sesión desde localStorage
    const savedUser = localStorage.getItem('olea_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (role) => {
    const mockUser = {
      id: 'user-123',
      name: `Usuario ${role}`,
      role: role,
      avatar: 'https://github.com/shadcn.png'
    };
    setUser(mockUser);
    localStorage.setItem('olea_user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('olea_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
