'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('teachers');
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

  function openEdit(tchr: Teacher) {
    setEditTarget(tchr);
    setForm({
      name: tchr.name,
      email: tchr.email || '',
      phone: tchr.phone || '',
      password: '',
      status: tchr.status || 'active',
      joiningDate: tchr.joiningDate ? tchr.joiningDate.slice(0, 10) : '',
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
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle', { count: total })}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'active' | 'inactive' | '')}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="active">{t('active')}</option>
            <option value="inactive">{t('inactive')}</option>
            <option value="">{t('all')}</option>
          </select>
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> {t('addTeacher')}
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
              {t('noTeachers')}
            </p>
            <Button onClick={openCreate} size="sm" variant="outline" className="gap-1.5">
              <Plus className="h-4 w-4" /> {t('addTeacher')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium w-8">{t('sl')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('photo')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('name')}</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">{t('designation')}</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">{t('subjects')}</th>
                <th className="px-4 py-3 text-left font-medium hidden lg:table-cell">{t('joiningDate')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('status')}</th>
                <th className="px-4 py-3 text-right font-medium">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teachers.map((tchr, idx) => (
                <tr key={tchr._id} className="bg-card hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    {tchr.photoUrl ? (
                      <div className="relative h-9 w-9 rounded-full overflow-hidden">
                        <Image src={tchr.photoUrl} alt={tchr.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-sm">
                        {tchr.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{tchr.name}</div>
                    {tchr.email && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Mail className="h-3 w-3" /> {tchr.email}
                      </div>
                    )}
                    {tchr.phone && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" /> {tchr.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {tchr.designation || '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {tchr.subjects && tchr.subjects.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tchr.subjects.slice(0, 3).map((s) => (
                          <span key={s} className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{s}</span>
                        ))}
                        {tchr.subjects.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{tchr.subjects.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {fmtDate(tchr.joiningDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      tchr.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {tchr.status === 'active' ? t('active') : t('inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setDetailsTeacher(tchr)} title="View details">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => openEdit(tchr)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(tchr)} title="Remove">
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
            <DialogTitle>{editTarget ? t('editTeacher') : t('addTeacher')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tName">{t('fullName')} <span className="text-destructive">*</span></Label>
              <Input id="tName" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Teacher full name" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tEmail">{t('email')} {!editTarget && <span className="text-destructive">*</span>}</Label>
                <Input id="tEmail" type="email" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="teacher@school.com" required={!editTarget} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tPhone">{t('phone')}</Label>
                <Input id="tPhone" type="tel" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="01XXXXXXXXX" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tJoining">{t('joiningDate')}</Label>
                <Input id="tJoining" type="date" value={form.joiningDate}
                  onChange={(e) => setForm((f) => ({ ...f, joiningDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tStatus">{t('status')}</Label>
                <select id="tStatus" value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="active">{t('active')}</option>
                  <option value="inactive">{t('inactive')}</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tPassword">
                {editTarget ? t('newPassword') : t('password')}{' '}
                {editTarget
                  ? <span className="text-muted-foreground text-xs">{t('keepBlank')}</span>
                  : <span className="text-destructive">*</span>}
              </Label>
              <Input id="tPassword" type="password" value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={t('minChars')} required={!editTarget} minLength={4} />
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>{t('cancel')}</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                {editTarget ? t('update') : t('addTeacher')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!detailsTeacher} onOpenChange={(o) => !o && setDetailsTeacher(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('teacherDetails')}</DialogTitle>
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
                    {detailsTeacher.status === 'active' ? t('active') : t('inactive')}
                  </span>
                </div>
              </div>

              {/* Personal Info */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('personal')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label={t('email2')} value={detailsTeacher.email} />
                  <InfoRow label={t('phone2')} value={detailsTeacher.phone} />
                  <InfoRow label={t('gender')} value={detailsTeacher.gender} capitalize />
                  <InfoRow label={t('dateOfBirth')} value={fmtDate(detailsTeacher.dateOfBirth)} />
                  <InfoRow label={t('religion')} value={detailsTeacher.religion} />
                </div>
                {detailsTeacher.address && (
                  <div className="mt-2 space-y-0.5">
                    <p className="text-xs text-muted-foreground">{t('address')}</p>
                    <p className="text-sm">{detailsTeacher.address}</p>
                  </div>
                )}
              </div>

              {/* Academic Info */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('academic')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label={t('designation')} value={detailsTeacher.designation} />
                  <InfoRow label={t('qualification')} value={detailsTeacher.qualification} />
                  <InfoRow label={t('experience')} value={detailsTeacher.experience} />
                  <InfoRow label={t('joiningDate')} value={fmtDate(detailsTeacher.joiningDate)} />
                </div>
                {detailsTeacher.subjects && detailsTeacher.subjects.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">{t('subjects')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailsTeacher.subjects.map((s) => (
                        <span key={s} className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground pt-1 border-t">
                {t('added', { date: fmtDate(detailsTeacher.createdAt) })}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsTeacher(null)}>{t('close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeTeacher')}</AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground px-6">
            {t('removeConfirm', { name: deleteTarget?.name ?? '' })}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {t('remove')}
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
