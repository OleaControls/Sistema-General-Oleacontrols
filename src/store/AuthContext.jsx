import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const ROLES = {
  ADMIN: 'ADMIN',
  OPS: 'OPERATIONS',
  TECH: 'TECHNICIAN',
  HR: 'HR',
  SALES: 'SALES',
  COLLABORATOR: 'COLLABORATOR'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('olea_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (role) => {
    // Esto es para QA/Invitado, sigue igual para pruebas rápidas
    const mockUser = {
      id: 'user-qa',
      name: `Usuario ${role}`,
      role: role,
      avatar: 'https://github.com/shadcn.png'
    };
    setUser(mockUser);
    localStorage.setItem('olea_user', JSON.stringify(mockUser));
  };

  const loginWithCredentials = async (email, password, portal) => {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const userData = await response.json();
            const fullUser = {
                ...userData,
                // Si entra por el portal colaborador, forzamos ese rol para la sesión
                role: portal === 'COLLABORATOR' ? ROLES.COLLABORATOR : userData.role
            };
            setUser(fullUser);
            localStorage.setItem('olea_user', JSON.stringify(fullUser));
            return true;
        }
        return false;
    } catch (error) {
        console.error('Login error:', error);
        return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('olea_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithCredentials, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
