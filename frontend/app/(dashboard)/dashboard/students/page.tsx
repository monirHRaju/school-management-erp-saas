'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Users, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import type { Student, StudentFormData } from '@/types/student';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: Student['status']; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'left', label: 'Left' },
];

const emptyForm: StudentFormData = {
  name: '',
  guardianName: '',
  class: '',
  section: '',
  rollNo: '',
  status: 'active',
};

export default function StudentsPage() {
  const { token } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStudents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (classFilter) params.set('class', classFilter);
      if (sectionFilter) params.set('section', sectionFilter);
      if (statusFilter) params.set('status', statusFilter);
      const query = params.toString();
      const res = await apiRequest<{ success: boolean; data: Student[] }>(
        `/api/students${query ? `?${query}` : ''}`,
        { token }
      );
      setStudents(res.data || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [token, classFilter, sectionFilter, statusFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const openCreate = () => {
    setEditingStudent(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditingStudent(s);
    setForm({
      name: s.name,
      guardianName: s.guardianName ?? '',
      class: s.class ?? '',
      section: s.section ?? '',
      rollNo: s.rollNo ?? '',
      status: s.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        guardianName: form.guardianName?.trim() || undefined,
        class: form.class?.trim() || undefined,
        section: form.section?.trim() || undefined,
        rollNo: form.rollNo?.trim() || undefined,
        status: form.status,
      };
      if (editingStudent) {
        await apiRequest<{ success: boolean; data: Student }>(
          `/api/students/${editingStudent._id}`,
          { method: 'PATCH', body: JSON.stringify(payload), token }
        );
      } else {
        await apiRequest<{ success: boolean; data: Student }>('/api/students', {
          method: 'POST',
          body: JSON.stringify(payload),
          token,
        });
      }
      setDialogOpen(false);
      fetchStudents();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const openDeleteConfirm = (s: Student) => {
    setStudentToDelete(s);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!token || !studentToDelete) return;
    setDeleting(true);
    try {
      await apiRequest<{ success: boolean }>(`/api/students/${studentToDelete._id}`, {
        method: 'DELETE',
        token,
      });
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
      fetchStudents();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-muted-foreground">Manage student records</p>
        </div>
        <Button onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add student
        </Button>
      </div>

      {/* Filters - responsive */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="filter-class">Class</Label>
              <Input
                id="filter-class"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                placeholder="All classes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-section">Section</Label>
              <Input
                id="filter-section"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                placeholder="All sections"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-status">Status</Label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                <option value="">All</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading students…</p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">No students yet</p>
                <p className="text-sm text-muted-foreground">Add your first student to get started.</p>
              </div>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Add student
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Guardian</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Roll no</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => (
                      <TableRow key={s._id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground">{s.guardianName || '—'}</TableCell>
                        <TableCell>{s.class || '—'}</TableCell>
                        <TableCell>{s.section || '—'}</TableCell>
                        <TableCell>{s.rollNo || '—'}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                              s.status === 'active' && 'bg-primary/10 text-primary',
                              s.status === 'inactive' && 'bg-muted text-muted-foreground',
                              s.status === 'left' && 'bg-destructive/10 text-destructive'
                            )}
                          >
                            {STATUS_OPTIONS.find((o) => o.value === s.status)?.label ?? s.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteConfirm(s)}
                              aria-label="Delete"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="space-y-3 p-4 md:hidden">
                {students.map((s) => (
                  <Card key={s._id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-sm text-muted-foreground">{s.guardianName || 'No guardian'}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-sm">
                            {s.class && <span>Class {s.class}</span>}
                            {s.section && <span>Sec {s.section}</span>}
                            {s.rollNo && <span>Roll {s.rollNo}</span>}
                            <span
                              className={cn(
                                'rounded-full px-2 py-0.5 text-xs font-medium',
                                s.status === 'active' && 'bg-primary/10 text-primary',
                                s.status === 'inactive' && 'bg-muted text-muted-foreground',
                                s.status === 'left' && 'bg-destructive/10 text-destructive'
                              )}
                            >
                              {STATUS_OPTIONS.find((o) => o.value === s.status)?.label ?? s.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(s)} aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteConfirm(s)}
                            aria-label="Delete"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showClose={!saving} className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingStudent ? 'Edit student' : 'Add student'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="Student name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardianName">Guardian name</Label>
              <Input
                id="guardianName"
                value={form.guardianName ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))}
                placeholder="Guardian / parent name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Input
                  id="class"
                  value={form.class ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
                  placeholder="e.g. 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  value={form.section ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                  placeholder="e.g. A"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rollNo">Roll no</Label>
              <Input
                id="rollNo"
                value={form.rollNo ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, rollNo: e.target.value }))}
                placeholder="Roll number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Student['status'] }))}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingStudent ? 'Save changes' : 'Add student'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {studentToDelete?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
