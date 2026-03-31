'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, X, Loader2, GraduationCap, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { invalidateAcademicConfigCache, type ClassSubjects } from '@/lib/useAcademicConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ConfigData {
  classes: string[];
  sections: string[];
  shifts: string[];
  groups: string[];
  classSubjects: ClassSubjects[];
}

const CATEGORY_LABELS: { key: keyof Omit<ConfigData, 'classSubjects'>; label: string }[] = [
  { key: 'classes', label: 'Classes' },
  { key: 'sections', label: 'Sections' },
  { key: 'shifts', label: 'Shifts' },
  { key: 'groups', label: 'Groups' },
];

export default function AcademicSettingsPage() {
  const { token } = useAuth();
  const [config, setConfig] = useState<ConfigData>({ classes: [], sections: [], shifts: [], groups: [], classSubjects: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newValues, setNewValues] = useState<Record<string, string>>({ classes: '', sections: '', shifts: '', groups: '' });

  // Class subjects state
  const [selectedClass, setSelectedClass] = useState('');
  const [newSubject, setNewSubject] = useState('');

  const fetchConfig = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest<{ success: boolean; data: ConfigData }>('/api/academic-config', { token });
      setConfig({ ...res.data, classSubjects: res.data.classSubjects ?? [] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  // Auto-select first class when classes load
  useEffect(() => {
    if (config.classes.length > 0 && !selectedClass) {
      setSelectedClass(config.classes[0]);
    }
  }, [config.classes, selectedClass]);

  const save = async (updated: ConfigData) => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await apiRequest<{ success: boolean; data: ConfigData }>('/api/academic-config', {
        method: 'PATCH',
        body: JSON.stringify(updated),
        token,
      });
      setConfig({ ...res.data, classSubjects: res.data.classSubjects ?? [] });
      invalidateAcademicConfigCache();
      toast.success('Settings saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addItem = (key: keyof Omit<ConfigData, 'classSubjects'>) => {
    const val = newValues[key]?.trim();
    if (!val) return;
    if (config[key].includes(val)) { toast.error(`"${val}" already exists`); return; }
    const updated = { ...config, [key]: [...config[key], val] };
    setConfig(updated);
    setNewValues((p) => ({ ...p, [key]: '' }));
    save(updated);
  };

  const removeItem = (key: keyof Omit<ConfigData, 'classSubjects'>, index: number) => {
    const updated = { ...config, [key]: config[key].filter((_, i) => i !== index) };
    setConfig(updated);
    save(updated);
  };

  // Class subjects helpers
  const currentSubjects = config.classSubjects.find((cs) => cs.class === selectedClass)?.subjects ?? [];

  const addSubject = () => {
    const val = newSubject.trim();
    if (!val || !selectedClass) return;
    if (currentSubjects.includes(val)) { toast.error(`"${val}" already exists for this class`); return; }
    const updated = {
      ...config,
      classSubjects: upsertClassSubjects(config.classSubjects, selectedClass, [...currentSubjects, val]),
    };
    setConfig(updated);
    setNewSubject('');
    save(updated);
  };

  const removeSubject = (subject: string) => {
    const updated = {
      ...config,
      classSubjects: upsertClassSubjects(config.classSubjects, selectedClass, currentSubjects.filter((s) => s !== subject)),
    };
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
          Manage classes, sections, shifts, groups, and class-wise subjects for your school.
        </p>
      </div>

      {/* Existing 4 cards */}
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
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(key); } }}
                  disabled={saving}
                />
                <Button size="icon" variant="outline" onClick={() => addItem(key)} disabled={saving || !newValues[key]?.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {config[key].map((item, i) => (
                  <span key={`${item}-${i}`} className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2.5 py-1 text-sm font-medium">
                    {item}
                    <button type="button" onClick={() => removeItem(key, i)} disabled={saving}
                      className="ml-0.5 rounded-sm p-0.5 text-muted-foreground hover:bg-destructive/20 hover:text-destructive disabled:opacity-50">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {config[key].length === 0 && <p className="text-sm text-muted-foreground italic">No items yet</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Class Subjects card — full width */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Class Subjects
          </CardTitle>
          <p className="text-xs text-muted-foreground">Assign subjects to each class. Used in homework forms and future result management.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.classes.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Add classes above first.</p>
          ) : (
            <>
              {/* Class selector */}
              <div className="flex flex-wrap gap-2">
                {config.classes.map((cls) => {
                  const count = config.classSubjects.find((cs) => cs.class === cls)?.subjects.length ?? 0;
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setSelectedClass(cls)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium border transition-colors ${
                        selectedClass === cls
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 border-border hover:bg-muted'
                      }`}
                    >
                      {cls}
                      {count > 0 && (
                        <span className={`text-xs ${selectedClass === cls ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          ({count})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Subject add input for selected class */}
              {selectedClass && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-medium">Subjects for <span className="text-primary">Class {selectedClass}</span></p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Mathematics, English, Science..."
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubject(); } }}
                      disabled={saving}
                    />
                    <Button size="icon" variant="outline" onClick={addSubject} disabled={saving || !newSubject.trim()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentSubjects.map((subj) => (
                      <span key={subj} className="inline-flex items-center gap-1 rounded-md border bg-primary/10 text-primary px-2.5 py-1 text-sm font-medium">
                        {subj}
                        <button type="button" onClick={() => removeSubject(subj)} disabled={saving}
                          className="ml-0.5 rounded-sm p-0.5 text-primary/60 hover:bg-destructive/20 hover:text-destructive disabled:opacity-50">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                    {currentSubjects.length === 0 && (
                      <p className="text-sm text-muted-foreground italic">No subjects yet for this class.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── helper ────────────────────────────────────────────────────────────────────
function upsertClassSubjects(
  existing: ClassSubjects[],
  cls: string,
  subjects: string[]
): ClassSubjects[] {
  const idx = existing.findIndex((cs) => cs.class === cls);
  if (idx >= 0) {
    const next = [...existing];
    next[idx] = { class: cls, subjects };
    return next;
  }
  return [...existing, { class: cls, subjects }];
}
