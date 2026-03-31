'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
import {
  BookOpen, Plus, Pencil, Trash2, Loader2, X, Paperclip, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import toast from 'react-hot-toast';

interface Homework {
  _id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  section: string;
  group: string;
  due_date: string;
  assigned_date: string;
  attachment_url: string;
  status: 'active' | 'archived';
  created_by: { _id: string; name: string; role: string };
  createdAt: string;
}

interface FormState {
  title: string;
  description: string;
  subject: string;
  class: string;
  section: string;
  group: string;
  due_date: string;
  attachment_url: string;
}

const EMPTY_FORM: FormState = {
  title: '', description: '', subject: '', class: '',
  section: '', group: '', due_date: '', attachment_url: '',
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(due_date: string) {
  return new Date(due_date) < new Date(new Date().toDateString());
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function HomeworkPage() {
  const { user } = useAuth();
  const { classes, sections, groups, classSubjects } = useAcademicConfig();

  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [filterDate, setFilterDate] = useState(todayISO()); // default today

  // Form dialog
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Homework | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Homework | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'staff' || user?.role === 'teacher';

  // Subjects for the currently selected class in the form
  const formClassSubjects = classSubjects.find((cs) => cs.class === form.class)?.subjects ?? [];

  const fetchHomeworks = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const token = getToken() ?? undefined;
      const params = new URLSearchParams({ page: String(p), limit: '20', status: filterStatus });
      if (filterClass) params.set('class', filterClass);
      if (filterSection) params.set('section', filterSection);
      if (filterSubject) params.set('subject', filterSubject);
      if (filterDate) {
        params.set('from_date', filterDate);
        params.set('to_date', filterDate);
      }

      const res = await apiRequest<{ success: boolean; data: Homework[]; totalPages: number }>(
        `/api/homework?${params}`, { token }
      );
      if (res.success) {
        setHomeworks(res.data);
        setTotalPages(res.totalPages || 1);
        setPage(p);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load homework');
    } finally {
      setLoading(false);
    }
  }, [filterClass, filterSection, filterSubject, filterStatus, filterDate]);

  useEffect(() => { fetchHomeworks(1); }, [fetchHomeworks]);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(hw: Homework) {
    setEditTarget(hw);
    setForm({
      title: hw.title,
      description: hw.description,
      subject: hw.subject,
      class: hw.class,
      section: hw.section,
      group: hw.group,
      due_date: hw.due_date.slice(0, 10),
      attachment_url: hw.attachment_url,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return toast.error('Title is required');
    if (!form.description.trim()) return toast.error('Description is required');
    if (!form.subject.trim()) return toast.error('Subject is required');
    if (!form.class.trim()) return toast.error('Class is required');
    if (!form.due_date) return toast.error('Due date is required');

    setSaving(true);
    try {
      const token = getToken() ?? undefined;
      if (editTarget) {
        const res = await apiRequest<{ success: boolean; data: Homework }>(
          `/api/homework/${editTarget._id}`,
          { method: 'PATCH', token, body: JSON.stringify(form), headers: { 'Content-Type': 'application/json' } }
        );
        if (res.success) {
          setHomeworks((prev) => prev.map((h) => h._id === editTarget._id ? res.data : h));
          toast.success('Homework updated');
        }
      } else {
        const res = await apiRequest<{ success: boolean; data: Homework }>(
          '/api/homework',
          { method: 'POST', token, body: JSON.stringify(form), headers: { 'Content-Type': 'application/json' } }
        );
        if (res.success) {
          setHomeworks((prev) => [res.data, ...prev]);
          toast.success('Homework posted');
        }
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = getToken() ?? undefined;
      await apiRequest(`/api/homework/${deleteTarget._id}`, { method: 'DELETE', token });
      setHomeworks((prev) => prev.filter((h) => h._id !== deleteTarget._id));
      toast.success('Homework deleted');
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  function canEdit(hw: Homework) {
    return user?.role === 'admin' || hw.created_by?._id === user?._id;
  }

  const hasActiveFilters = filterClass || filterSection || filterSubject || filterDate;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Homework</h1>
        </div>
        {canManage && (
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Homework
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterSection}
          onChange={(e) => setFilterSection(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Sections</option>
          {sections.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Input
          placeholder="Subject"
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="w-36"
        />
        {/* Single date filter */}
        <div className="flex items-center gap-1">
          <Input
            type="date"
            title="Filter by due date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-36"
          />
          {filterDate && (
            <button
              type="button"
              onClick={() => setFilterDate('')}
              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Clear date filter"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setFilterClass(''); setFilterSection(''); setFilterSubject(''); setFilterDate(''); }}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" /> Clear all
          </Button>
        )}
      </div>

      {/* Date badge — shows when a date is active */}
      {filterDate && (
        <p className="text-xs text-muted-foreground -mt-2">
          Showing homework due on <span className="font-medium text-foreground">{formatDate(filterDate)}</span>
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : homeworks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <BookOpen className="h-10 w-10 opacity-20" />
          <p>No homework found{filterDate ? ` for ${formatDate(filterDate)}` : ''}.</p>
          {filterDate && (
            <Button variant="ghost" size="sm" onClick={() => setFilterDate('')} className="gap-1 text-muted-foreground">
              <X className="h-3.5 w-3.5" /> Show all dates
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Subject</th>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Class / Section</th>
                <th className="px-4 py-3 text-left font-medium">Due Date</th>
                <th className="px-4 py-3 text-left font-medium">Posted By</th>
                {canManage && <th className="px-4 py-3 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {homeworks.map((hw) => (
                <tr key={hw._id} className="bg-card hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {hw.subject}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{hw.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{hw.description}</div>
                    {hw.attachment_url && (
                      <a href={hw.attachment_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary mt-0.5 hover:underline">
                        <Paperclip className="h-3 w-3" /> Attachment
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {hw.class}{hw.section ? ` — ${hw.section}` : ''}
                    {hw.group ? <span className="block text-xs">{hw.group}</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${isOverdue(hw.due_date) ? 'text-destructive' : 'text-foreground'}`}>
                      {formatDate(hw.due_date)}
                    </span>
                    {isOverdue(hw.due_date) && (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" /> Overdue
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {hw.created_by?.name}
                    <span className="block text-xs">{hw.created_by?.role}</span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      {canEdit(hw) && (
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(hw)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(hw)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchHomeworks(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchHomeworks(page + 1)}>
            Next
          </Button>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !saving && setShowForm(o)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Homework' : 'Add Homework'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Class <span className="text-destructive">*</span></Label>
                <select
                  value={form.class}
                  onChange={(e) => setForm((f) => ({ ...f, class: e.target.value, subject: '' }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select class</option>
                  {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Subject — dropdown if class has subjects configured, otherwise free text */}
            <div className="space-y-1.5">
              <Label>Subject <span className="text-destructive">*</span></Label>
              {formClassSubjects.length > 0 ? (
                <select
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select subject</option>
                  {formClassSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option value="__other__">Other (type below)</option>
                </select>
              ) : (
                <Input
                  placeholder="e.g. Math, English"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                />
              )}
              {/* Show text input when "Other" is selected */}
              {formClassSubjects.length > 0 && form.subject === '__other__' && (
                <Input
                  placeholder="Type subject name"
                  value={''}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  autoFocus
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Chapter 5 Exercise 3"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description <span className="text-destructive">*</span></Label>
              <textarea
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                rows={4}
                placeholder="Detailed instructions for students..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Section <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <select
                  value={form.section}
                  onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All sections</option>
                  {sections.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Group <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <select
                  value={form.group}
                  onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All groups</option>
                  {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Attachment URL <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                placeholder="https://..."
                value={form.attachment_url}
                onChange={(e) => setForm((f) => ({ ...f, attachment_url: e.target.value }))}
              />
            </div>
            {editTarget && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  value={(form as any).status || 'active'}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value } as any))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editTarget ? 'Update' : 'Post Homework'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Homework?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-6">
            &quot;{deleteTarget?.title}&quot; will be permanently deleted.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
