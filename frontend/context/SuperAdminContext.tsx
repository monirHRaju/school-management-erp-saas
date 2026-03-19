'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { getSAToken, removeSAToken, setSAToken } from '@/lib/superAdminAuth';
import type { SuperAdmin } from '@/types/superAdmin';

interface SAContextValue {
  admin: SuperAdmin | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const SuperAdminContext = createContext<SAContextValue | null>(null);

export function SuperAdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<SuperAdmin | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadAdmin = useCallback(async () => {
    const t = getSAToken();
    if (!t) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiRequest<{ success: boolean; data: { admin: SuperAdmin } }>(
        '/api/super-admin/me',
        { token: t }
      );
      if (res.success && res.data) {
        setTokenState(t);
        setAdmin(res.data.admin);
      } else {
        removeSAToken();
      }
    } catch {
      removeSAToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmin();
  }, [loadAdmin]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiRequest<{ success: boolean; data: { token: string; admin: SuperAdmin } }>(
        '/api/super-admin/login',
        { method: 'POST', body: JSON.stringify({ email, password }) }
      );
      if (!res.success || !res.data) throw new Error('Login failed');
      setSAToken(res.data.token);
      setTokenState(res.data.token);
      setAdmin(res.data.admin);
      router.push('/super-admin/dashboard');
    },
    [router]
  );

  const logout = useCallback(() => {
    removeSAToken();
    setTokenState(null);
    setAdmin(null);
    router.push('/super-admin/login');
  }, [router]);

  return (
    <SuperAdminContext.Provider
      value={{ admin, token, loading, isAuthenticated: !!admin, login, logout }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
}

export function useSuperAdmin(): SAContextValue {
  const ctx = useContext(SuperAdminContext);
  if (!ctx) throw new Error('useSuperAdmin must be used within SuperAdminProvider');
  return ctx;
}
