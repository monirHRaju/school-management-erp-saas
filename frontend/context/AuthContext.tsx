'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { getToken, removeToken, setToken } from '@/lib/auth';
import type { AuthData, AuthResponse, School, User } from '@/types/auth';

interface AuthContextValue {
  user: User | null;
  school: School | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (params: {
    schoolName: string;
    slug: string;
    contact?: string;
    phone?: string;
    subscription_plan?: string;
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setTokenState(null);
      setUser(null);
      setSchool(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiRequest<{ success: boolean; data: { user: User; school: School } }>(
        '/api/auth/me',
        { token: t }
      );
      if (res.success && res.data) {
        setTokenState(t);
        setUser(res.data.user);
        setSchool(res.data.school);
      } else {
        removeToken();
        setTokenState(null);
        setUser(null);
        setSchool(null);
      }
    } catch {
      removeToken();
      setTokenState(null);
      setUser(null);
      setSchool(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!res.success || !res.data) throw new Error(res.error || 'Login failed');
      setToken(res.data.token);
      setTokenState(res.data.token);
      setUser(res.data.user);
      setSchool(res.data.school);
      router.push('/dashboard');
    },
    [router]
  );

  const register = useCallback(
    async (params: {
      schoolName: string;
      slug: string;
      contact?: string;
      phone?: string;
      subscription_plan?: string;
      name: string;
      email: string;
      password: string;
    }) => {
      const res = await apiRequest<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(params),
      });
      if (!res.success || !res.data) throw new Error(res.error || 'Registration failed');
      setToken(res.data.token);
      setTokenState(res.data.token);
      setUser(res.data.user);
      setSchool(res.data.school);
      router.push('/dashboard');
    },
    [router]
  );

  const logout = useCallback(() => {
    removeToken();
    setTokenState(null);
    setUser(null);
    setSchool(null);
    router.push('/login');
  }, [router]);

  const value: AuthContextValue = {
    user,
    school,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
