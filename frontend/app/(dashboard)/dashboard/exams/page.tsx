'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, FileText, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Exam {
  _id: string;
  name: string;
  session: string;
  class: string;
  term: string;
  examDate: string | null;
  status: 'active' | 'inactive';
}

const TERMS = ['1st Term', '2nd Term', 'Half Yearly', 'Final', 'Other'];
const emptyForm = { name: '', session: '', class: '', term: '', examDate: '', status: 'active' as 'active' | 'inactive' };
type FormData = typeof emptyForm;

export default function ExamsPage() {
  const { token, user } = useAuth();
  const canWrite = user?.role === 'admin' || user?.role === 'staff';

  const [items, setItems] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sessions, setSessions] = useState<string[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { classes, sections, loading: configLoading } = useAcademicConfig();

  const fetchItems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      if (sessionFilter) params.set('session', sessionFilter);
      if (classFilter) params.set('class', classFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiRequest<{ success: boolean; data: Exam[] }>(`/api/exams?${params}`, { token: token ?? undefined });
      setItems(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  }, [token, search, sessionFilter, classFilter, statusFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    if (!token) return;
    const fetchSessions = async () => {
      setSessionsLoading(true);
      try {
        const res = await apiRequest<{ success: boolean; data: { name: string; year: string }[] }>('/api/academic/sessions', { token });
        const data = res.data.map(item => item.name);
        setSessions(data);
      } catch (e) {
        console.error('Failed to fetch sessions', e);
        setSessions([]); // fallback
      } finally {
        setSessionsLoading(false);
      }
    };
    fetchSessions();
  }, [token]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item: Exam) => {
    setEditing(item);
    setForm({
      name: item.name,
      session: item.session,
      class: item.class,
      term: item.term,
      examDate: item.examDate ? item.examDate.substring(0, 10) : '',
      status: item.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Exam name is required'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        session: form.session.trim(),
        class: form.class.trim(),
        term: form.term,
        examDate: form.examDate || null,
        status: form.status,
      };
      if (editing) {
        await apiRequest(`/api/exams/${editing._id}`, { method: 'PATCH', body: JSON.stringify(body), token: token ?? undefined });
        toast.success('Exam updated');
      } else {
        await apiRequest('/api/exams', { method: 'POST', body: JSON.stringify(body), token: token ?? undefined });
        toast.success('Exam added');
      }
      setDialogOpen(false);
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
      await apiRequest(`/api/exams/${deleteTarget._id}`, { method: 'DELETE', token: token ?? undefined });
      toast.success('Exam deleted');
      setDeleteTarget(null);
      fetchItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const f = (key: keyof FormData, val: string) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Exam List
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage school exams and schedules.</p>
        </div>
        {canWrite && (
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Exam
          </Button>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); fetchItems(); }} className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search exams..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}
          className="h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={sessionsLoading}>
          <option value="">Session</option>
          {sessions.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
          className="h-10 w-28 rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={configLoading}>
          <option value="">Class</option>
          {classes.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <Button type="submit" variant="outline">Search</Button>
        {(search || sessionFilter || classFilter || statusFilter) && (
          <Button type="button" variant="ghost" onClick={() => { setSearch(''); setSessionFilter(''); setClassFilter(''); setStatusFilter(''); }}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Exam Name</th>
              <th className="px-4 py-3 text-left font-medium">Session</th>
              <th className="px-4 py-3 text-left font-medium">Class</th>
              <th className="px-4 py-3 text-left font-medium">Term</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-center font-medium">Status</th>
              {canWrite && <th className="px-4 py-3 text-center font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canWrite ? 8 : 7} className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={canWrite ? 8 : 7} className="py-12 text-center text-muted-foreground">No exams found.</td></tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3">{item.session || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3">{item.class || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3">{item.term || <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3">{item.examDate ? new Date(item.examDate).toLocaleDateString() : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                      {item.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  {canWrite && (
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
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Edit Exam' : 'Add New Exam'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Exam Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Mid Term 2024" value={form.name} onChange={(e) => f('name', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Session</Label>
              <select value={form.session} onChange={(e) => f('session', e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={sessionsLoading}>
                  <option value="">Select session</option>
                  {sessions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <select value={form.class} onChange={(e) => f('class', e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={configLoading}>
                  <option value="">Select class</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
            </div>
            <div className="space-y-2">
              <Label>Term</Label>
              <select value={form.term} onChange={(e) => f('term', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select term</option>
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Exam Date</Label>
              <Input type="date" value={form.examDate} onChange={(e) => f('examDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select value={form.status} onChange={(e) => f('status', e.target.value as 'active' | 'inactive')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? 'Update' : 'Add Exam'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam</AlertDialogTitle>
            <AlertDialogDescription>Delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</AlertDialogDescription>
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
