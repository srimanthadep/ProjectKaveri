import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { api } from '../lib/api';
import { propIdToSlug } from '../lib/utils';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  register: (data: { name: string; email: string; phone?: string; password?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchRoleDemo: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'kaveri_stays_auth_user';
const TOKEN_STORAGE_KEY = 'kaveri_stays_jwt_token';

const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
  owner: { email: 'owner@kaveristays.com', pass: 'DemoPassword123!' },
  manager: { email: 'manager.coorg@kaveristays.com', pass: 'DemoPassword123!' },
  staff: { email: 'staff.coorg@kaveristays.com', pass: 'DemoPassword123!' },
  guest: { email: 'guest@kaveristays.com', pass: 'DemoPassword123!' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.avatarUrl) delete parsed.avatarUrl;
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  });

  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  // Verify and sync current user on initial mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedToken) {
        try {
          const me = await api.auth.me();
          const liveUser: User = {
            id: String(me.id),
            name: me.full_name || me.email,
            email: me.email,
            role: me.role as UserRole,
            propertyId: propIdToSlug(me.property_id),
          };
          setUser(liveUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(liveUser));
          setIsAuthReady(true);
          return;
        } catch {
          // Token expired or invalid
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken(null);
        }
      }
      // If no valid session, auto-login with default demo account (owner for rich overview)
      try {
        const creds = DEMO_CREDENTIALS.owner;
        const res = await api.auth.login({ email: creds.email, password: creds.pass });
        localStorage.setItem(TOKEN_STORAGE_KEY, res.access_token);
        setToken(res.access_token);
        const me = await api.auth.me();
        const liveUser: User = {
          id: String(me.id),
          name: me.full_name || me.email,
          email: me.email,
          role: me.role as UserRole,
          propertyId: propIdToSlug(me.property_id),
        };
        setUser(liveUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(liveUser));
      } catch (err) {
        console.warn('Backend live auth fallback:', err);
      } finally {
        setIsAuthReady(true);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password = 'DemoPassword123!'): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    try {
      const res = await api.auth.login({ email, password });
      localStorage.setItem(TOKEN_STORAGE_KEY, res.access_token);
      setToken(res.access_token);

      const me = await api.auth.me();
      const liveUser: User = {
        id: String(me.id),
        name: me.full_name || me.email,
        email: me.email,
        role: me.role as UserRole,
        propertyId: propIdToSlug(me.property_id),
      };
      setUser(liveUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(liveUser));
      return { success: true, role: liveUser.role };
    } catch (err: any) {
      return { success: false, error: err.message || 'Invalid email address or credentials.' };
    }
  };

  const register = async (data: {
    name: string;
    email: string;
    phone?: string;
    password?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    try {
      const pwd = data.password || 'DemoPassword123!';
      await api.auth.register({
        email: data.email,
        password: pwd,
        full_name: data.name,
        phone: data.phone,
      });
      const loginRes = await login(data.email, pwd);
      return { success: loginRes.success, error: loginRes.error };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to register account.' };
    }
  };

  const logout = useCallback(() => {
    try {
      api.auth.logout().catch(() => {});
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, []);

  const switchRoleDemo = async (role: UserRole) => {
    const creds = DEMO_CREDENTIALS[role] || DEMO_CREDENTIALS.guest;
    await login(creds.email, creds.pass);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isAuthReady,
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
