'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, Star, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface GradeEntry {
  grade: string;
  minMark: number;
  gradePoint: number;
  isFail: boolean;
}

interface GradeScale {
  _id: string;
  grades: GradeEntry[];
}

export default function GradingPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [scale, setScale] = useState<GradeScale | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editRows, setEditRows] = useState<GradeEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchScale = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: GradeScale }>('/api/grading', { token: token ?? undefined });
      setScale(res.data);
      setEditRows(res.data.grades.map((g) => ({ ...g })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load grading');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchScale(); }, [fetchScale]);

  const startEdit = () => {
    if (scale) setEditRows(scale.grades.map((g) => ({ ...g })));
    setEditMode(true);
  };

  const cancelEdit = () => {
    if (scale) setEditRows(scale.grades.map((g) => ({ ...g })));
    setEditMode(false);
  };

  const updateRow = (idx: number, field: keyof GradeEntry, value: string | number | boolean) => {
    setEditRows((rows) => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const addRow = () => {
    setEditRows((rows) => [...rows, { grade: '', minMark: 0, gradePoint: 0, isFail: false }]);
  };

  const removeRow = (idx: number) => {
    setEditRows((rows) => rows.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    for (const row of editRows) {
      if (!row.grade.trim()) { toast.error('All grade names are required'); return; }
    }
    setSaving(true);
    try {
      const res = await apiRequest<{ success: boolean; data: GradeScale }>('/api/grading', {
        method: 'PUT',
        body: JSON.stringify({ grades: editRows }),
        token: token ?? undefined,
      });
      setScale(res.data);
      setEditRows(res.data.grades.map((g) => ({ ...g })));
      setEditMode(false);
      toast.success('Grading scale saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Star className="h-6 w-6" />
            {editMode ? 'Grading Create/Update' : 'Grading System'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {editMode ? 'Edit grade boundaries and points.' : 'View the school grading scale.'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            {editMode ? (
              <>
                <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Grading
                </Button>
              </>
            ) : (
              <Button onClick={startEdit} className="gap-2">
                <Plus className="h-4 w-4" />
                Add/Update
              </Button>
            )}
          </div>
        )}
      </div>

      {editMode ? (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Grade</th>
                <th className="px-4 py-3 text-left font-medium">Min Mark</th>
                <th className="px-4 py-3 text-left font-medium">Grade Point</th>
                <th className="px-4 py-3 text-left font-medium">Fail?</th>
                <th className="px-4 py-3 text-center font-medium">Remove</th>
              </tr>
            </thead>
            <tbody>
              {editRows.map((row, idx) => (
                <tr key={idx} className="border-b last:border-0">
                  <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-2">
                    <Input
                      className="w-24"
                      value={row.grade}
                      onChange={(e) => updateRow(idx, 'grade', e.target.value)}
                      placeholder="A+"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      className="w-24"
                      type="number"
                      min={0}
                      value={row.isFail ? 0 : row.minMark}
                      disabled={row.isFail}
                      onChange={(e) => updateRow(idx, 'minMark', Number(e.target.value))}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      className="w-24"
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.isFail ? 0 : row.gradePoint}
                      disabled={row.isFail}
                      onChange={(e) => updateRow(idx, 'gradePoint', Number(e.target.value))}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={row.isFail}
                      onChange={(e) => updateRow(idx, 'isFail', e.target.checked)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeRow(idx)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 border-t">
            <Button variant="outline" onClick={addRow} className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Grade
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Grade</th>
                <th className="px-4 py-3 text-left font-medium">Min Mark</th>
                <th className="px-4 py-3 text-left font-medium">Grade Point</th>
                <th className="px-4 py-3 text-center font-medium">Fail Grade</th>
              </tr>
            </thead>
            <tbody>
              {!scale || scale.grades.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No grading scale defined.</td></tr>
              ) : (
                [...scale.grades]
                  .sort((a, b) => b.minMark - a.minMark)
                  .map((row, idx) => (
                    <tr key={idx} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold">{row.grade}</td>
                      <td className="px-4 py-3">{row.minMark}</td>
                      <td className="px-4 py-3">{row.gradePoint.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {row.isFail ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Fail</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
