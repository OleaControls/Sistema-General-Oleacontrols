import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const ROLES = {
  ADMIN: 'ADMIN',
  OPS: 'SUPERVISOR',
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
                
                // El token ya viene incluido si el login fue exitoso en el backend
                const token = userData.token;
                
                // Determinar el rol principal del array de roles
                let primaryRole = ROLES.COLLABORATOR;
                if (userData.roles && Array.isArray(userData.roles)) {
                    // Priorizar cualquier rol que no sea COLLABORATOR
                    primaryRole = userData.roles.find(r => r !== ROLES.COLLABORATOR) || ROLES.COLLABORATOR;
                }

                const fullUser = {
                    ...userData,
                    // Si entra por el portal colaborador, forzamos ese rol, si no, usamos su rol principal
                    role: portal === 'COLLABORATOR' ? ROLES.COLLABORATOR : primaryRole
                };
                setUser(fullUser);
                localStorage.setItem('olea_user', JSON.stringify(fullUser));
                // Opcional: guardar el token por separado para mayor facilidad si se prefiere
                if (token) localStorage.setItem('olea_token', token);
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
    localStorage.removeItem('olea_token');
  };

  const updateUser = (newData) => {
    if (user && newData.id === user.id) {
        // Determinar el nuevo rol principal si los roles cambiaron
        let primaryRole = user.role;
        if (newData.roles && Array.isArray(newData.roles)) {
            primaryRole = newData.roles.find(r => r !== ROLES.COLLABORATOR) || ROLES.COLLABORATOR;
        }

        const updated = { 
            ...user, 
            ...newData,
            role: primaryRole // Actualizar el rol de sesión
        };
        setUser(updated);
        localStorage.setItem('olea_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithCredentials, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
