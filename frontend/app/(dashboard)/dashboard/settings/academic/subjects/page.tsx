'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, BookOpen, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { invalidateAcademicConfigCache } from '@/lib/useAcademicConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AcademicSubject {
  _id: string;
  classes: string[];
  name: string;
  code: string;
  writtenMark: number;
  mcqMark: number;
  practicalMark: number;
  type: 'Main' | 'Optional';
  status: 'active' | 'inactive';
}

interface AcademicClass { _id: string; name: string; }

const emptyForm = {
  classes: [] as string[],
  name: '',
  code: '',
  writtenMark: '',
  mcqMark: '',
  practicalMark: '',
  type: 'Main' as 'Main' | 'Optional',
  status: 'active' as 'active' | 'inactive',
};

type FormData = typeof emptyForm;

export default function SubjectsPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [items, setItems] = useState<AcademicSubject[]>([]);
  const [allClasses, setAllClasses] = useState<AcademicClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicSubject | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AcademicSubject | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchClasses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest<{ success: boolean; data: AcademicClass[] }>('/api/academic/classes?status=active', { token: token ?? undefined });
      setAllClasses(res.data);
    } catch (_) {}
  }, [token]);

  const fetchItems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (statusFilter) params.set('status', statusFilter);
      if (classFilter) params.set('class', classFilter);
      const res = await apiRequest<{ success: boolean; data: AcademicSubject[] }>(
        `/api/academic/subjects?${params}`, { token }
      );
      setItems(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, classFilter]);

  useEffect(() => { fetchClasses(); fetchItems(); }, [fetchClasses, fetchItems]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item: AcademicSubject) => {
    setEditing(item);
    setForm({
      classes: item.classes ?? [],
      name: item.name,
      code: item.code ?? '',
      writtenMark: item.writtenMark ? String(item.writtenMark) : '',
      mcqMark: item.mcqMark ? String(item.mcqMark) : '',
      practicalMark: item.practicalMark ? String(item.practicalMark) : '',
      type: item.type,
      status: item.status,
    });
    setDialogOpen(true);
  };

  const toggleClass = (cls: string) => {
    setForm((f) => ({
      ...f,
      classes: f.classes.includes(cls) ? f.classes.filter((c) => c !== cls) : [...f.classes, cls],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Subject name is required'); return; }
    setSaving(true);
    try {
      const body = {
        classes: form.classes,
        name: form.name.trim(),
        code: form.code.trim(),
        writtenMark: Number(form.writtenMark) || 0,
        mcqMark: Number(form.mcqMark) || 0,
        practicalMark: Number(form.practicalMark) || 0,
        type: form.type,
        status: form.status,
      };
      if (editing) {
        await apiRequest(`/api/academic/subjects/${editing._id}`, { method: 'PATCH', body: JSON.stringify(body), token: token ?? undefined });
        toast.success('Subject updated');
      } else {
        await apiRequest('/api/academic/subjects', { method: 'POST', body: JSON.stringify(body), token: token ?? undefined });
        toast.success('Subject added');
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
      await apiRequest(`/api/academic/subjects/${deleteTarget._id}`, { method: 'DELETE', token: token ?? undefined });
      toast.success('Subject deleted');
      setDeleteTarget(null);
      invalidateAcademicConfigCache();
      fetchItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Subjects
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage subjects with marks, type, and class assignments.</p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Subject
          </Button>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); fetchItems(); }} className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search subjects..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All Classes</option>
          {allClasses.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button type="submit" variant="outline">Search</Button>
        {(search || statusFilter || classFilter) && (
          <Button type="button" variant="ghost" onClick={() => { setSearch(''); setStatusFilter(''); setClassFilter(''); }}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Subject Name</th>
              <th className="px-4 py-3 text-left font-medium">Code</th>
              <th className="px-4 py-3 text-left font-medium">Classes</th>
              <th className="px-4 py-3 text-center font-medium">Written</th>
              <th className="px-4 py-3 text-center font-medium">MCQ</th>
              <th className="px-4 py-3 text-center font-medium">Practical</th>
              <th className="px-4 py-3 text-center font-medium">Type</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              {isAdmin && <th className="px-4 py-3 text-center font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin ? 10 : 9} className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={isAdmin ? 10 : 9} className="py-12 text-center text-muted-foreground">No subjects found.</td></tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{item.code || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.classes?.length ? item.classes.map((c) => (
                        <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                      )) : <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">{item.writtenMark || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-center">{item.mcqMark || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-center">{item.practicalMark || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={item.type === 'Main' ? 'default' : 'secondary'}>{item.type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                      {item.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(item)}
                          className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Subject' : 'Add New Subject'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label>Subject Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Mathematics" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input placeholder="e.g. MTH101" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'Main' | 'Optional' }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="Main">Main</option>
                  <option value="Optional">Optional</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Written Mark (max)</Label>
                <Input type="number" min="0" placeholder="0" value={form.writtenMark} onChange={(e) => setForm((f) => ({ ...f, writtenMark: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>MCQ Mark (max)</Label>
                <Input type="number" min="0" placeholder="0" value={form.mcqMark} onChange={(e) => setForm((f) => ({ ...f, mcqMark: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Practical Mark (max)</Label>
                <Input type="number" min="0" placeholder="0" value={form.practicalMark} onChange={(e) => setForm((f) => ({ ...f, practicalMark: e.target.value }))} />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label>Status</Label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              {allClasses.length > 0 && (
                <div className="sm:col-span-2 space-y-2">
                  <Label>Assign to Classes</Label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-md border">
                    {allClasses.map((cls) => {
                      const selected = form.classes.includes(cls.name);
                      return (
                        <button
                          key={cls._id}
                          type="button"
                          onClick={() => toggleClass(cls.name)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            selected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/50 border-border hover:bg-muted'
                          }`}
                        >
                          {cls.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? 'Update' : 'Add Subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
