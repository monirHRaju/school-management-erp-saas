'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';

export interface ClassSubjects {
  class: string;
  subjects: string[];
}

export interface AcademicConfig {
  classes: string[];
  sections: string[];
  shifts: string[];
  groups: string[];
  classSubjects: ClassSubjects[];
}

const DEFAULTS: AcademicConfig = {
  classes: ['Play', 'Nursery', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'],
  sections: ['A', 'B', 'C', 'D'],
  shifts: ['Morning', 'Day'],
  groups: ['General', 'Science', 'Commerce', 'Arts'],
  classSubjects: [],
};

// Simple in-memory cache so multiple components don't re-fetch
let cache: { data: AcademicConfig; ts: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

export function invalidateAcademicConfigCache() {
  cache = null;
}

export function useAcademicConfig() {
  const { token } = useAuth();
  const [config, setConfig] = useState<AcademicConfig>(cache?.data ?? DEFAULTS);
  const [loading, setLoading] = useState(!cache);

  const fetchConfig = useCallback(async () => {
    if (!token) return;
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      setConfig(cache.data);
      setLoading(false);
      return;
    }
    try {
      const res = await apiRequest<{ success: boolean; data: AcademicConfig }>(
        '/api/academic-config',
        { token }
      );
      const data: AcademicConfig = {
        classes: res.data.classes ?? DEFAULTS.classes,
        sections: res.data.sections ?? DEFAULTS.sections,
        shifts: res.data.shifts ?? DEFAULTS.shifts,
        groups: res.data.groups ?? DEFAULTS.groups,
        classSubjects: res.data.classSubjects ?? [],
      };
      cache = { data, ts: Date.now() };
      setConfig(data);
    } catch {
      setConfig(DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { ...config, loading, refetch: fetchConfig };
}
