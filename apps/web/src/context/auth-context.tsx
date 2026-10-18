'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, UserDTO } from '@healthsync/shared-types';
import { apiClient } from '@/lib/api-client';

interface AuthContextType {
  user: UserDTO | null;
  role: UserRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserDTO | null>;
  demoLogin: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserDTO | null>;
  setUser: (user: UserDTO | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async (): Promise<UserDTO | null> => {
    try {
      const res = await apiClient<{ success: boolean; data: UserDTO }>('/api/auth/me');
      if (res.success && res.data) {
        setUser(res.data);
        return res.data;
      } else {
        setUser(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.data?.user) {
        setUser(res.data.user);
        return res.data.user;
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogin = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/auth/demo-login', {
        method: 'POST',
        body: JSON.stringify({ role: targetRole }),
      });
      if (res.data?.user) {
        setUser(res.data.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient('/api/auth/logout', { method: 'POST' });
      setUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error('Logout error:', err);
      // Do NOT falsely clear local user state if session invalidation failed
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: (user?.role as UserRole) || null,
        isLoading,
        login,
        demoLogin,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
