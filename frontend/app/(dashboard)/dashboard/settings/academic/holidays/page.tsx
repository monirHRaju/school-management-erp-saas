'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, CalendarOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { invalidateAcademicConfigCache, type Weekday } from '@/lib/useAcademicConfig';

const ALL_WEEKDAYS: Weekday[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function HolidaysPage() {
  const { token } = useAuth();
  const [weeklyHolidays, setWeeklyHolidays] = useState<Weekday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest<{ success: boolean; data: { weeklyHolidays?: Weekday[] } }>('/api/academic-config', { token: token ?? undefined });
      setWeeklyHolidays(res.data.weeklyHolidays ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const toggleDay = async (day: Weekday) => {
    const next = weeklyHolidays.includes(day)
      ? weeklyHolidays.filter((d) => d !== day)
      : [...weeklyHolidays, day];
    setWeeklyHolidays(next);
    setSaving(true);
    try {
      await apiRequest('/api/academic-config', {
        method: 'PATCH',
        body: JSON.stringify({ weeklyHolidays: next }),
        token: token ?? undefined,
      });
      invalidateAcademicConfigCache();
      toast.success('Weekly holidays updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
      fetchConfig();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CalendarOff className="h-6 w-6" />
          Weekly Holidays
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Select weekly off days. These are automatically marked as holiday in attendance.
        </p>
      </div>

      <div className="rounded-md border p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          {ALL_WEEKDAYS.map((day) => {
            const active = weeklyHolidays.includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                disabled={saving}
                className={`inline-flex items-center rounded-full px-5 py-2 text-sm font-medium border transition-colors disabled:opacity-50 ${
                  active
                    ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                    : 'bg-muted/50 border-border hover:bg-muted text-foreground'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>
        {weeklyHolidays.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No weekly holiday selected.</p>
        )}
        {weeklyHolidays.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Weekly off: <span className="font-medium text-foreground">{weeklyHolidays.join(', ')}</span>
          </p>
        )}
      </div>
    </div>
  );
}
