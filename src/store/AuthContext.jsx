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

  const loginWithCredentials = (email, password, portal) => {
    const credentialsKey = 'olea_credentials';
    const credentialsData = localStorage.getItem(credentialsKey);
    const credentials = credentialsData ? JSON.parse(credentialsData) : [];
    
    const userCreds = credentials.find(c => c.email === email && c.password === password);
    
    if (userCreds) {
        const fullUser = {
            id: userCreds.id,
            name: userCreds.name,
            role: portal === 'COLLABORATOR' ? ROLES.COLLABORATOR : userCreds.role,
            realRole: userCreds.role, // Guardamos el rol real por si acaso
            email: userCreds.email,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userCreds.name)}&background=random`
        };
        setUser(fullUser);
        localStorage.setItem('olea_user', JSON.stringify(fullUser));
        return true;
    }
    return false;
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
