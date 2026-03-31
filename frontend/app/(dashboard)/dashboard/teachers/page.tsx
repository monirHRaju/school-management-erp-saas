'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  GraduationCap, Plus, Pencil, Trash2, Eye, Loader2, Mail, Phone, X,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import toast from 'react-hot-toast';

interface Teacher {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'teacher';
  status: 'active' | 'inactive';
  photoUrl?: string;
  // profile fields (filled by teacher via /dashboard/profile)
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  religion?: string;
  designation?: string;
  qualification?: string;
  experience?: string;
  subjects?: string[];
  joiningDate?: string;
  createdAt: string;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  password: string;
  status: 'active' | 'inactive';
  joiningDate: string;
}

const EMPTY_FORM: FormState = { name: '', email: '', phone: '', password: '', status: 'active', joiningDate: '' };

function fmt(v?: string | null) { return v || '—'; }
function fmtDate(d?: string) { return d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'active' | 'inactive' | ''>('active');

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Teacher | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [detailsTeacher, setDetailsTeacher] = useState<Teacher | null>(null);

  const loadTeachers = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ role: 'teacher' });
      if (filterStatus) params.set('status', filterStatus);
      const res = await apiRequest<{ success: boolean; data: Teacher[]; total: number }>(
        `/api/users?${params}`,
        { token }
      );
      if (res.success) {
        setTeachers(res.data || []);
        setTotal(res.total || 0);
      }
    } catch {
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { loadTeachers(); }, [loadTeachers]);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(t: Teacher) {
    setEditTarget(t);
    setForm({
      name: t.name,
      email: t.email || '',
      phone: t.phone || '',
      password: '',
      status: t.status || 'active',
      joiningDate: t.joiningDate ? t.joiningDate.slice(0, 10) : '',
    });
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    const token = getToken();
    if (!token) return;
    if (!form.name.trim()) { setFormError('Name is required'); return; }

    setSaving(true);
    try {
      if (editTarget) {
        const body: Record<string, string> = {
          name: form.name.trim(),
          status: form.status,
        };
        if (form.email.trim()) body.email = form.email.trim();
        if (form.phone.trim()) body.phone = form.phone.trim();
        if (form.password) body.password = form.password;
        if (form.joiningDate) body.joiningDate = form.joiningDate;

        const res = await apiRequest<{ success: boolean; error?: string }>(
          `/api/users/${editTarget._id}`,
          { method: 'PATCH', token, body: JSON.stringify(body) }
        );
        if (!res.success) throw new Error(res.error || 'Update failed');
        toast.success('Teacher updated');
      } else {
        if (!form.email.trim()) { setFormError('Email is required'); setSaving(false); return; }
        if (!form.password) { setFormError('Password is required'); setSaving(false); return; }

        const body: Record<string, string> = {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: 'teacher',
          status: form.status,
        };
        if (form.phone.trim()) body.phone = form.phone.trim();
        if (form.joiningDate) body.joiningDate = form.joiningDate;

        const res = await apiRequest<{ success: boolean; error?: string }>(
          '/api/users',
          { method: 'POST', token, body: JSON.stringify(body) }
        );
        if (!res.success) throw new Error(res.error || 'Create failed');
        toast.success('Teacher added');
      }

      setShowForm(false);
      loadTeachers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = getToken();
      const res = await apiRequest<{ success: boolean; error?: string }>(
        `/api/users/${deleteTarget._id}`,
        { method: 'DELETE', token: token ?? undefined }
      );
      if (!res.success) throw new Error(res.error || 'Delete failed');
      toast.success('Teacher removed');
      setDeleteTarget(null);
      loadTeachers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            Teachers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} teacher{total !== 1 ? 's' : ''} found</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'active' | 'inactive' | '')}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="">All</option>
          </select>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add Teacher
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : teachers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <GraduationCap className="h-12 w-12 text-muted-foreground/20" />
            <p className="text-muted-foreground">
              {filterStatus ? `No ${filterStatus} teachers found.` : 'No teachers yet.'}
            </p>
            <Button onClick={openCreate} size="sm" variant="outline" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Teacher
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-8">#</th>
                <th className="px-4 py-3 text-left font-medium">Photo</th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Designation</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Subjects</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">Joining Date</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teachers.map((t, idx) => (
                <tr key={t._id} className="bg-card hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    {t.photoUrl ? (
                      <div className="relative h-9 w-9 rounded-full overflow-hidden">
                        <Image src={t.photoUrl} alt={t.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-sm">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{t.name}</div>
                    {t.email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Mail className="h-3 w-3" /> {t.email}
                      </div>
                    )}
                    {t.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {t.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {t.designation || '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {t.subjects && t.subjects.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {t.subjects.slice(0, 3).map((s) => (
                          <span key={s} className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{s}</span>
                        ))}
                        {t.subjects.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{t.subjects.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {fmtDate(t.joiningDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {t.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setDetailsTeacher(t)} title="View details">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => openEdit(t)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(t)} title="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => !saving && setShowForm(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tName">Full Name <span className="text-destructive">*</span></Label>
              <Input id="tName" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Teacher full name" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tEmail">Email {!editTarget && <span className="text-destructive">*</span>}</Label>
                <Input id="tEmail" type="email" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="teacher@school.com" required={!editTarget} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tPhone">Phone</Label>
                <Input id="tPhone" type="tel" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="01XXXXXXXXX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tJoining">Joining Date</Label>
                <Input id="tJoining" type="date" value={form.joiningDate}
                  onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tStatus">Status</Label>
                <select id="tStatus" value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tPassword">
                {editTarget ? 'New Password' : 'Password'}{' '}
                {editTarget
                  ? <span className="text-muted-foreground text-xs">(leave blank to keep)</span>
                  : <span className="text-destructive">*</span>}
              </Label>
              <Input id="tPassword" type="password" value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 4 characters" required={!editTarget} minLength={4} />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {editTarget ? 'Update' : 'Add Teacher'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!detailsTeacher} onOpenChange={(o) => !o && setDetailsTeacher(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Teacher Details</DialogTitle>
          </DialogHeader>
          {detailsTeacher && (
            <div className="space-y-5 py-1">
              {/* Photo + name */}
              <div className="flex items-center gap-4">
                {detailsTeacher.photoUrl ? (
                  <div className="relative h-16 w-16 rounded-full overflow-hidden ring-2 ring-border shrink-0">
                    <Image src={detailsTeacher.photoUrl} alt={detailsTeacher.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 text-2xl font-bold shrink-0">
                    {detailsTeacher.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-lg">{detailsTeacher.name}</p>
                  <p className="text-sm text-muted-foreground">{detailsTeacher.designation || 'Teacher'}</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${
                    detailsTeacher.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-destructive/10 text-destructive'
                  }`}>
                    {detailsTeacher.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Personal Info */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Personal</p>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Email" value={detailsTeacher.email} />
                  <InfoRow label="Phone" value={detailsTeacher.phone} />
                  <InfoRow label="Gender" value={detailsTeacher.gender} capitalize />
                  <InfoRow label="Date of Birth" value={fmtDate(detailsTeacher.dateOfBirth)} />
                  <InfoRow label="Religion" value={detailsTeacher.religion} />
                </div>
                {detailsTeacher.address && (
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="text-sm">{detailsTeacher.address}</p>
                  </div>
                )}
              </div>

              {/* Academic Info */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Academic</p>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Designation" value={detailsTeacher.designation} />
                  <InfoRow label="Qualification" value={detailsTeacher.qualification} />
                  <InfoRow label="Experience" value={detailsTeacher.experience} />
                  <InfoRow label="Joining Date" value={fmtDate(detailsTeacher.joiningDate)} />
                </div>
                {detailsTeacher.subjects && detailsTeacher.subjects.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">Subjects</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailsTeacher.subjects.map((s) => (
                        <span key={s} className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground pt-1 border-t">
                Added {fmtDate(detailsTeacher.createdAt)}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsTeacher(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Teacher?</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-6">
            <strong>{deleteTarget?.name}</strong> will be removed and lose access to the dashboard.
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoRow({ label, value, capitalize }: { label: string; value?: string | null; capitalize?: boolean }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-medium ${capitalize ? 'capitalize' : ''}`}>{value || '—'}</p>
    </div>
  );
}
