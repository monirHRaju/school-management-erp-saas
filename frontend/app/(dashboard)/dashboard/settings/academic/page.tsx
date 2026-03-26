'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, X, Loader2, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { invalidateAcademicConfigCache } from '@/lib/useAcademicConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ConfigData {
  classes: string[];
  sections: string[];
  shifts: string[];
  groups: string[];
}

const CATEGORY_LABELS: { key: keyof ConfigData; label: string }[] = [
  { key: 'classes', label: 'Classes' },
  { key: 'sections', label: 'Sections' },
  { key: 'shifts', label: 'Shifts' },
  { key: 'groups', label: 'Groups' },
];

export default function AcademicSettingsPage() {
  const { token } = useAuth();
  const [config, setConfig] = useState<ConfigData>({ classes: [], sections: [], shifts: [], groups: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newValues, setNewValues] = useState<Record<string, string>>({ classes: '', sections: '', shifts: '', groups: '' });

  const fetchConfig = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest<{ success: boolean; data: ConfigData }>('/api/academic-config', { token });
      setConfig(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const save = async (updated: ConfigData) => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await apiRequest<{ success: boolean; data: ConfigData }>('/api/academic-config', {
        method: 'PATCH',
        body: JSON.stringify(updated),
        token,
      });
      setConfig(res.data);
      invalidateAcademicConfigCache();
      toast.success('Settings saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addItem = (key: keyof ConfigData) => {
    const val = newValues[key]?.trim();
    if (!val) return;
    if (config[key].includes(val)) {
      toast.error(`"${val}" already exists`);
      return;
    }
    const updated = { ...config, [key]: [...config[key], val] };
    setConfig(updated);
    setNewValues((p) => ({ ...p, [key]: '' }));
    save(updated);
  };

  const removeItem = (key: keyof ConfigData, index: number) => {
    const updated = { ...config, [key]: config[key].filter((_, i) => i !== index) };
    setConfig(updated);
    save(updated);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          Academic Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage classes, sections, shifts, and groups for your school
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {CATEGORY_LABELS.map(({ key, label }) => (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder={`Add ${label.toLowerCase().slice(0, -1)}...`}
                  value={newValues[key]}
                  onChange={(e) => setNewValues((p) => ({ ...p, [key]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addItem(key);
                    }
                  }}
                  disabled={saving}
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => addItem(key)}
                  disabled={saving || !newValues[key]?.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {config[key].map((item, i) => (
                  <span
                    key={`${item}-${i}`}
                    className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2.5 py-1 text-sm font-medium"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeItem(key, i)}
                      disabled={saving}
                      className="ml-0.5 rounded-sm p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {config[key].length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No items yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
