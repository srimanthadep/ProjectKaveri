import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, PropertyId } from '../types';
import { INITIAL_USERS } from '../data/mockData';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  register: (data: { name: string; email: string; phone?: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRoleDemo: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'kaveri_stays_auth_user';
const TOKEN_STORAGE_KEY = 'kaveri_stays_jwt_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
      // Default to Siddharth Rao (Guest) so app opens populated and instantly testable
      return INITIAL_USERS[0];
    } catch {
      return INITIAL_USERS[0];
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || 'mock-jwt-token-kaveri-stays-2026';
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      const simulatedJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
        JSON.stringify({ sub: user.id, email: user.email, role: user.role, exp: Date.now() + 86400000 })
      )}.simulated_sig`;
      localStorage.setItem(TOKEN_STORAGE_KEY, simulatedJwt);
      setToken(simulatedJwt);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
    }
  }, [user]);

  const login = async (email: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    // Check if user exists in initial users list
    const found = INITIAL_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (found) {
      setUser(found);
      return { success: true, role: found.role };
    }

    // If new guest email entered directly
    if (email.includes('@')) {
      const newGuest: User = {
        id: `user-${Date.now()}`,
        name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        email: email.trim().toLowerCase(),
        role: 'guest',
        lifetimeNights: 0,
        totalSpent: 0,
      };
      setUser(newGuest);
      return { success: true, role: 'guest' };
    }

    return { success: false, error: 'Invalid email address or credentials.' };
  };

  const register = async (data: {
    name: string;
    email: string;
    phone?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!data.name || !data.email) {
      return { success: false, error: 'Name and Email are required.' };
    }

    // Check if email already registered
    const existing = INITIAL_USERS.find((u) => u.email.toLowerCase() === data.email.trim().toLowerCase());
    if (existing) {
      setUser(existing);
      return { success: true };
    }

    // Always enforce 'guest' role for registration to prevent privilege escalation
    const newUser: User = {
      id: `user-reg-${Date.now()}`,
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || '',
      role: 'guest',
      lifetimeNights: 0,
      totalSpent: 0,
    };

    setUser(newUser);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
  };

  const switchRoleDemo = (role: UserRole) => {
    const targetUser = INITIAL_USERS.find((u) => u.role === role);
    if (targetUser) {
      setUser(targetUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        switchRoleDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
