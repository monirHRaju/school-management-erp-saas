'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Settings, Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ExamWeight {
  examName: string;
  weight: number;
}

interface ResultSettings {
  finalResultMethod: 'average_all' | 'final_only' | 'weighted';
  finalExamName: string;
  includeOptionalSubjects: boolean;
  passMark: number;
  gpaMethod: 'subject_average' | 'total_marks';
  examWeights: ExamWeight[];
}

const defaults: ResultSettings = {
  finalResultMethod: 'average_all',
  finalExamName: 'Final',
  includeOptionalSubjects: false,
  passMark: 33,
  gpaMethod: 'subject_average',
  examWeights: [],
};

export default function ResultSettingsPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [settings, setSettings] = useState<ResultSettings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: ResultSettings }>('/api/result-settings', { token: token ?? undefined });
      setSettings({ ...defaults, ...res.data });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    if (settings.finalResultMethod === 'weighted') {
      const total = settings.examWeights.reduce((sum, w) => sum + Number(w.weight), 0);
      if (Math.abs(total - 100) > 0.01) {
        toast.error('Exam weights must sum to 100');
        return;
      }
    }
    setSaving(true);
    try {
      await apiRequest('/api/result-settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
        token: token ?? undefined,
      });
      toast.success('Result settings saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const addWeight = () => setSettings((s) => ({ ...s, examWeights: [...s.examWeights, { examName: '', weight: 0 }] }));
  const removeWeight = (idx: number) => setSettings((s) => ({ ...s, examWeights: s.examWeights.filter((_, i) => i !== idx) }));
  const updateWeight = (idx: number, field: 'examName' | 'weight', val: string) => {
    setSettings((s) => ({
      ...s,
      examWeights: s.examWeights.map((w, i) => i === idx ? { ...w, [field]: field === 'weight' ? Number(val) : val } : w),
    }));
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Result Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure how final results and GPA are calculated for this school.
        </p>
      </div>

      <div className="rounded-md border p-6 space-y-6">
        {/* Final Result Method */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Final Result Method</Label>
          <div className="space-y-2">
            {[
              { value: 'average_all', label: 'Average of all exams', desc: 'GPA calculated as average across all exams in the session.' },
              { value: 'final_only', label: 'Final exam only', desc: 'Only the specified final exam counts for the result.' },
              { value: 'weighted', label: 'Weighted average', desc: 'Each exam has a configurable weight (must sum to 100%).' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="finalResultMethod"
                  value={opt.value}
                  checked={settings.finalResultMethod === opt.value}
                  onChange={() => setSettings((s) => ({ ...s, finalResultMethod: opt.value as ResultSettings['finalResultMethod'] }))}
                  disabled={!isAdmin}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-sm">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Final Exam Name (only for final_only) */}
        {settings.finalResultMethod === 'final_only' && (
          <div className="space-y-2">
            <Label>Final Exam Name</Label>
            <Input
              className="max-w-xs"
              placeholder="e.g. Final"
              value={settings.finalExamName}
              onChange={(e) => setSettings((s) => ({ ...s, finalExamName: e.target.value }))}
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground">Results from exams with this name will be used.</p>
          </div>
        )}

        {/* Weighted exams */}
        {settings.finalResultMethod === 'weighted' && (
          <div className="space-y-3">
            <Label>Exam Weights</Label>
            <div className="space-y-2">
              {settings.examWeights.map((w, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Exam name (e.g. Half Yearly)"
                    value={w.examName}
                    onChange={(e) => updateWeight(idx, 'examName', e.target.value)}
                    disabled={!isAdmin}
                  />
                  <Input
                    className="w-24"
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Weight %"
                    value={w.weight}
                    onChange={(e) => updateWeight(idx, 'weight', e.target.value)}
                    disabled={!isAdmin}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  {isAdmin && (
                    <Button size="icon" variant="ghost" onClick={() => removeWeight(idx)}
                      className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {isAdmin && (
                <Button variant="outline" size="sm" onClick={addWeight} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Exam Weight
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total weight: <strong>{settings.examWeights.reduce((s, w) => s + Number(w.weight), 0)}%</strong> (must equal 100%)
            </p>
          </div>
        )}

        {/* Include Optional Subjects */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="includeOptional"
            checked={settings.includeOptionalSubjects}
            onChange={(e) => setSettings((s) => ({ ...s, includeOptionalSubjects: e.target.checked }))}
            disabled={!isAdmin}
            className="h-4 w-4"
          />
          <div>
            <Label htmlFor="includeOptional" className="cursor-pointer">Include Optional Subjects in GPA</Label>
            <p className="text-xs text-muted-foreground">If unchecked, optional subjects are shown but not counted in GPA.</p>
          </div>
        </div>

        {/* Pass Mark */}
        <div className="space-y-2">
          <Label>Pass Mark (minimum raw marks per subject)</Label>
          <Input
            className="max-w-xs"
            type="number"
            min={0}
            value={settings.passMark}
            onChange={(e) => setSettings((s) => ({ ...s, passMark: Number(e.target.value) }))}
            disabled={!isAdmin}
          />
          <p className="text-xs text-muted-foreground">Students scoring below this in any subject are marked as failed.</p>
        </div>

        {/* GPA Method */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">GPA Calculation Method</Label>
          <div className="space-y-2">
            {[
              { value: 'subject_average', label: 'Subject-wise average GPA', desc: 'GPA = average of all subject grade points.' },
              { value: 'total_marks', label: 'Based on total marks', desc: 'GPA derived from total obtained marks vs. total maximum marks.' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="gpaMethod"
                  value={opt.value}
                  checked={settings.gpaMethod === opt.value}
                  onChange={() => setSettings((s) => ({ ...s, gpaMethod: opt.value as ResultSettings['gpaMethod'] }))}
                  disabled={!isAdmin}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-sm">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Settings
          </Button>
        </div>
      )}
    </div>
  );
}
