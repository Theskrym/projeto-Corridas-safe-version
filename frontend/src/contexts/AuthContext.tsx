import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'admin' | 'motorista' | 'unknown';

export interface User {
  id: number;
  login: string;
  nome: string;
  email: string;
  nivel_acesso?: string;
  groups?: Array<{ id: number; name: string }>;
  is_staff?: boolean;
  is_superuser?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: UserRole;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Determinar o role baseado no usuário
  const getUserRole = (userData: User | null): UserRole => {
    if (!userData) return 'unknown';

    const nivelAc = typeof userData.nivel_acesso === 'string'
      ? Number(userData.nivel_acesso)
      : userData.nivel_acesso;

    const groupNames = (userData.groups || []).map(g => g.name.toLowerCase());

    if (
      userData.nivel_acesso === 'admin' ||
      nivelAc === 1 ||
      nivelAc === 2 ||
      nivelAc === 4 ||
      userData.is_superuser ||
      userData.is_staff ||
      groupNames.includes('admin') ||
      groupNames.includes('gerente') ||
      groupNames.includes('operador')
    ) {
      return 'admin';
    }

    if (groupNames.includes('motorista') || groupNames.includes('driver')) {
      return 'motorista';
    }

    if (userData.nivel_acesso === 'motorista' || userData.nivel_acesso === 'driver' || nivelAc === 3) {
      return 'motorista';
    }

    return 'unknown';
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Carregar usuário do localStorage ao montar
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  const userRole = getUserRole(user);
  const isAuthenticated = !!user && !!localStorage.getItem('token');

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, userRole, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

