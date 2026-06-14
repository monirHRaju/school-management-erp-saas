'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, GraduationCap, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { invalidateAcademicConfigCache } from '@/lib/useAcademicConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

interface AcademicClass {
  _id: string;
  name: string;
  admissionFee: number;
  examFee: number;
  idCardFee: number;
  sessionFee: number;
  transcriptFee: number;
  tuitionFee: number;
  status: 'active' | 'inactive';
}

const emptyForm = {
  name: '',
  admissionFee: '',
  examFee: '',
  idCardFee: '',
  sessionFee: '',
  transcriptFee: '',
  tuitionFee: '',
  status: 'active' as 'active' | 'inactive',
};

type FormData = typeof emptyForm;

const FEE_FIELDS: { key: keyof Omit<FormData, 'name' | 'status'>; label: string }[] = [
  { key: 'admissionFee', label: 'Admission Fee' },
  { key: 'examFee', label: 'Exam Fee' },
  { key: 'idCardFee', label: 'ID Card Fee' },
  { key: 'sessionFee', label: 'Session Fee' },
  { key: 'transcriptFee', label: 'Transcript Fee' },
  { key: 'tuitionFee', label: 'Tuition Fee' },
];

export default function ClassesPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState<AcademicClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicClass | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AcademicClass | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiRequest<{ success: boolean; data: AcademicClass[] }>(
        `/api/academic/classes?${params}`,
        { token }
      );
      setItems(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: AcademicClass) => {
    setEditing(item);
    setForm({
      name: item.name,
      admissionFee: item.admissionFee ? String(item.admissionFee) : '',
      examFee: item.examFee ? String(item.examFee) : '',
      idCardFee: item.idCardFee ? String(item.idCardFee) : '',
      sessionFee: item.sessionFee ? String(item.sessionFee) : '',
      transcriptFee: item.transcriptFee ? String(item.transcriptFee) : '',
      tuitionFee: item.tuitionFee ? String(item.tuitionFee) : '',
      status: item.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Class name is required'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        admissionFee: Number(form.admissionFee) || 0,
        examFee: Number(form.examFee) || 0,
        idCardFee: Number(form.idCardFee) || 0,
        sessionFee: Number(form.sessionFee) || 0,
        transcriptFee: Number(form.transcriptFee) || 0,
        tuitionFee: Number(form.tuitionFee) || 0,
        status: form.status,
      };
      if (editing) {
        await apiRequest(`/api/academic/classes/${editing._id}`, { method: 'PATCH', body: JSON.stringify(body), token: token ?? undefined });
        toast.success('Class updated');
      } else {
        await apiRequest('/api/academic/classes', { method: 'POST', body: JSON.stringify(body), token: token ?? undefined });
        toast.success('Class added');
      }
      setDialogOpen(false);
      invalidateAcademicConfigCache();
      fetchItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/academic/classes/${deleteTarget._id}`, { method: 'DELETE', token: token ?? undefined });
      toast.success('Class deleted');
      setDeleteTarget(null);
      invalidateAcademicConfigCache();
      fetchItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Classes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage class levels and their fee structures.</p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Class
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search classes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button type="submit" variant="outline">Search</Button>
        {(search || statusFilter) && (
          <Button type="button" variant="ghost" onClick={() => { setSearch(''); setStatusFilter(''); }}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Class Name</th>
              <th className="px-4 py-3 text-right font-medium">Admission Fee</th>
              <th className="px-4 py-3 text-right font-medium">Exam Fee</th>
              <th className="px-4 py-3 text-right font-medium">ID Card Fee</th>
              <th className="px-4 py-3 text-right font-medium">Session Fee</th>
              <th className="px-4 py-3 text-right font-medium">Transcript Fee</th>
              <th className="px-4 py-3 text-right font-medium">Tuition Fee</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              {isAdmin && <th className="px-4 py-3 text-center font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} className="py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 10 : 9} className="py-12 text-center text-muted-foreground">
                  No classes found.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-right">{item.admissionFee > 0 ? item.admissionFee.toLocaleString() : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-right">{item.examFee > 0 ? item.examFee.toLocaleString() : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-right">{item.idCardFee > 0 ? item.idCardFee.toLocaleString() : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-right">{item.sessionFee > 0 ? item.sessionFee.toLocaleString() : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-right">{item.transcriptFee > 0 ? item.transcriptFee.toLocaleString() : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-right">{item.tuitionFee > 0 ? item.tuitionFee.toLocaleString() : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                      {item.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(item)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(item)} title="Delete"
                          className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Class' : 'Add New Class'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label>Class Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. Class One"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              {FEE_FIELDS.map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? 'Update' : 'Add Class'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
