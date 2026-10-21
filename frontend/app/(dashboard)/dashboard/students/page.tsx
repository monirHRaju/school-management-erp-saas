'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Plus,
  Pencil,
  Users,
  Loader2,
  ArrowUpDown,
  Eye,
  Printer,
  FileDown,
  CreditCard,
  FileSpreadsheet,
  UserPlus,
  IdCard,
  UserX,
  UserCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
import { printStudentAdmissionForm } from '@/lib/studentPrint';
import type { Student } from '@/types/student';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
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
import ImportStudentsDialog from './_components/ImportStudentsDialog';

const STATUS_OPTIONS: { value: Student['status']; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'left', label: 'Left' },
];

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  const display = value === undefined || value === null || value === '' ? '—' : String(value);
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground print:text-black/70">{label}</p>
      <p className="text-sm font-medium print:text-black">{display}</p>
    </div>
  );
}

export default function StudentsPage() {
  const t = useTranslations('students');
  const tc = useTranslations('common');
  const { token, user, school } = useAuth();
  const canManage = user?.role !== 'teacher';
  const { classes, sections } = useAcademicConfig();
  const [importOpen, setImportOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [studentToToggle, setStudentToToggle] = useState<Student | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [sortField, setSortField] = useState<
    'name' | 'class' | 'section' | 'rollNo' | 'monthlyFee' | 'admissionDate' | 'dateOfBirth'
  >('rollNo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [detailsStudent, setDetailsStudent] = useState<Student | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsPrintRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;
  const [schoolSettings, setSchoolSettings] = useState<{ logoUrl?: string; contact?: string; address?: string; nameBn?: string } | null>(null);
  const [hoveredPhoto, setHoveredPhoto] = useState<{ url: string; name: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ success: boolean; data: { logoUrl?: string; contact?: string; address?: string; nameBn?: string } }>('/api/settings', { token })
      .then((res) => { if (res.success && res.data) setSchoolSettings(res.data); })
      .catch(() => {});
  }, [token]);

  const fetchStudents = useCallback(async (pageNum = 1) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (classFilter) params.set('class', classFilter);
      if (sectionFilter) params.set('section', sectionFilter);
      params.set('status', statusFilter || 'active');
      if (searchQuery) params.set('q', searchQuery);
      params.set('page', String(pageNum));
      params.set('limit', String(LIMIT));
      const res = await apiRequest<{ success: boolean; data: Student[]; total: number; page: number; totalPages: number }>(
        `/api/students?${params.toString()}`,
        { token }
      );
      setStudents(res.data || []);
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
      setPage(pageNum);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load students';
      setError(msg);
      toast.error(msg);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [token, classFilter, sectionFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchStudents(1);
  }, [fetchStudents]);

  const openStatusConfirm = (s: Student) => {
    setStudentToToggle(s);
    setStatusDialogOpen(true);
  };

  const openDetails = (s: Student) => {
    setDetailsStudent(s);
    setDetailsOpen(true);
  };

  const handleGenerateGuardian = async () => {
    const s = detailsStudent;
    if (!s) return;
    if (!s.guardianPhone || !s.guardianPhone.trim()) {
      toast.error('Guardian phone is missing. Edit the student to add one first.');
      return;
    }
    setGuardianLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; created?: boolean; message?: string; error?: string }>(
        `/api/students/${s._id}/guardian`,
        { method: 'POST', body: JSON.stringify({}), token: token ?? undefined }
      );
      if (!res.success) throw new Error(res.error || 'Failed to generate guardian');
      toast.success(res.message || (res.created ? 'Guardian account created.' : 'Guardian linked.'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate guardian');
    } finally {
      setGuardianLoading(false);
    }
  };

  const handlePrintDetails = () => {
    if (!detailsStudent) return;
    printStudentAdmissionForm(detailsStudent, school?.name ?? '', schoolSettings);
  };

  const handleDownloadPdf = () => {
    setPdfLoading(true);
    try {
      if (detailsStudent && printStudentAdmissionForm(detailsStudent, school?.name ?? '', schoolSettings)) {
        toast.success('Choose "Save as PDF" in the print dialog to download.');
      }
    } finally {
      setPdfLoading(false);
    }
  };

  const confirmStatusToggle = async () => {
    if (!token || !studentToToggle) return;
    const nextStatus: Student['status'] = studentToToggle.status === 'active' ? 'inactive' : 'active';
    setTogglingStatus(true);
    try {
      try {
        await apiRequest<{ success: boolean }>(`/api/students/${studentToToggle._id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: nextStatus }),
          token,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (/not found|404/i.test(msg)) {
          await apiRequest<{ success: boolean }>(`/api/students/${studentToToggle._id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: nextStatus }),
            token,
          });
        } else {
          throw err;
        }
      }
      setStatusDialogOpen(false);
      setStudentToToggle(null);
      toast.success(
        nextStatus === 'inactive'
          ? 'Student made inactive.'
          : 'Student activated successfully.'
      );
      fetchStudents(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Status update failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setTogglingStatus(false);
    }
  };

  const sortedStudents = useMemo(() => {
    const arr = [...students];
    return arr.sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      const field = sortField;
      const av = (a as any)[field];
      const bv = (b as any)[field];
      if (!av && !bv) return 0;
      if (!av) return -1 * dir;
      if (!bv) return 1 * dir;
      if (field === 'monthlyFee') return (Number(av) - Number(bv)) * dir;
      if (field === 'admissionDate' || field === 'dateOfBirth') {
        return (new Date(av).getTime() - new Date(bv).getTime()) * dir;
      }
      if (field === 'rollNo') {
        return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [students, sortDirection, sortField]);

  const isDeactivating = studentToToggle?.status === 'active';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/dashboard/students/admit-card">
              <Button variant="outline" className="gap-1.5">
                <IdCard className="h-4 w-4" />
                {t('admitCards')}
              </Button>
            </Link>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setImportOpen(true)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              {t('importCsv')}
            </Button>
            <Link href="/dashboard/students/new">
              <Button className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">
                <Plus className="h-4 w-4" />
                {t('addStudent')}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('filters')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="filter-class">{t('class')}</Label>
              <select
                id="filter-class"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                <option value="">{t('all')}</option>
                {classes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-section">{t('section')}</Label>
              <select
                id="filter-section"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                <option value="">{t('all')}</option>
                {sections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-status">{t('status')}</Label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
                <option value="all">{t('all')}</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-search">{t('search')}</Label>
              <Input
                id="filter-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="text-xs sm:text-sm"
              onClick={() => {
                setClassFilter('');
                setSectionFilter('');
                setStatusFilter('active');
                setSearchQuery('');
              }}
            >
              {t('clearFilters')}
            </Button>
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
              <p className="text-sm text-muted-foreground">{t('loadingStudents')}</p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">{t('noStudentsYet')}</p>
                <p className="text-sm text-muted-foreground">{canManage ? t('addFirstStudent') : t('noStudentsFound')}</p>
              </div>
              {canManage && (
                <Link href="/dashboard/students/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    {t('addStudent')}
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('sl')}</TableHead>
                      <TableHead>{t('studentId')}</TableHead>
                      <TableHead>{t('photo')}</TableHead>
                      <TableHead
                        onClick={() => {
                          setSortField((prev) => {
                            const next = 'name' as const;
                            setSortDirection((d) =>
                              prev === next ? (d === 'asc' ? 'desc' : 'asc') : 'asc'
                            );
                            return next;
                          });
                        }}
                        className="cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-1">
                          {t('name')}
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => {
                          setSortField((prev) => {
                            const next = 'rollNo' as const;
                            setSortDirection((d) =>
                              prev === next ? (d === 'asc' ? 'desc' : 'asc') : 'asc'
                            );
                            return next;
                          });
                        }}
                        className="cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-1">
                          {t('roll')}
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        </span>
                      </TableHead>
                      <TableHead
                        onClick={() => {
                          setSortField((prev) => {
                            const next = 'class' as const;
                            setSortDirection((d) =>
                              prev === next ? (d === 'asc' ? 'desc' : 'asc') : 'asc'
                            );
                            return next;
                          });
                        }}
                        className="cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-1">
                          {t('class')}
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        </span>
                      </TableHead>
                      <TableHead>{t('status')}</TableHead>
                      <TableHead className="w-[140px] text-right">{t('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStudents.map((s, index) => (
                      <TableRow key={s._id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{s.studentId || '—'}</TableCell>
                        <TableCell>
                          <Link href={`/dashboard/students/${s._id}`} className="inline-flex">
                            {s.photoUrl ? (
                              <div
                                className="relative inline-flex"
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const previewHeight = 180;
                                  const clampedY = Math.min(
                                    Math.max(rect.top + rect.height / 2, previewHeight / 2 + 12),
                                    window.innerHeight - previewHeight / 2 - 12
                                  );
                                  setHoveredPhoto({
                                    url: s.photoUrl!,
                                    name: s.name,
                                    x: rect.right + 14,
                                    y: clampedY,
                                  });
                                }}
                                onMouseLeave={() => setHoveredPhoto(null)}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={s.photoUrl}
                                  alt={s.name}
                                  className="h-10 w-10 rounded-full object-cover ring-1 ring-border cursor-zoom-in transition-all duration-200 ease-out hover:scale-125 hover:ring-2 hover:ring-violet-500 shadow-xs"
                                />
                              </div>
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-200 ring-1 ring-border/60">
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </Link>
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link
                            href={`/dashboard/students/${s._id}`}
                            className="text-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:underline transition-colors"
                          >
                            {s.name}
                          </Link>
                        </TableCell>
                        <TableCell>{s.rollNo || '—'}</TableCell>
                        <TableCell>{s.class || '—'}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                              s.status === 'active' && 'bg-primary/10 text-primary',
                              s.status === 'inactive' && 'bg-muted text-muted-foreground',
                              s.status === 'left' && 'bg-destructive/10 text-destructive'
                            )}
                          >
                            {t(s.status === 'active' ? 'active' : s.status === 'inactive' ? 'inactive' : 'left')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDetails(s)}
                              aria-label="Quick view"
                              title="Quick view"
                              className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canManage && (
                              <>
                                <Link href={`/dashboard/fees/student/${s._id}`}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Fee report"
                                    title="Fee report"
                                    className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                                  >
                                    <CreditCard className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Link href={`/dashboard/students/${s._id}/edit`}>
                                  <Button variant="ghost" size="icon" aria-label="Edit" title="Edit student">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openStatusConfirm(s)}
                                  aria-label={s.status === 'active' ? 'Make inactive' : 'Activate'}
                                  title={s.status === 'active' ? 'Make inactive (soft delete)' : 'Activate student'}
                                  className={
                                    s.status === 'active'
                                      ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40'
                                      : 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                                  }
                                >
                                  {s.status === 'active' ? (
                                    <UserX className="h-4 w-4" />
                                  ) : (
                                    <UserCheck className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
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
                        <div className="flex items-start gap-3">
                          <Link href={`/dashboard/students/${s._id}`} className="shrink-0">
                            {s.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={s.photoUrl}
                                alt={s.name}
                                className="h-11 w-11 rounded-full object-cover ring-1 ring-border shrink-0 transition-transform duration-200 active:scale-[2.2] hover:scale-[2.2] z-10"
                              />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </Link>
                          <div>
                            <Link
                              href={`/dashboard/students/${s._id}`}
                              className="flex items-center gap-2 font-medium hover:text-violet-600 dark:hover:text-violet-400 hover:underline"
                            >
                              {s.name}
                            </Link>
                            {s.studentId && (
                              <p className="text-xs font-mono text-muted-foreground">ID: {s.studentId}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {s.guardianName || t('noGuardian')}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-sm">
                              {s.class && (
                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                                  Class {s.class}
                                </span>
                              )}
                              {s.rollNo && <span>Roll {s.rollNo}</span>}
                              {s.monthlyFee != null && (
                                <span>Fee ৳ {s.monthlyFee.toLocaleString()}</span>
                              )}
                              {s.guardianPhone && <span>📞 {s.guardianPhone}</span>}
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-xs font-medium',
                                  s.status === 'active' && 'bg-primary/10 text-primary',
                                  s.status === 'inactive' && 'bg-muted text-muted-foreground',
                                  s.status === 'left' && 'bg-destructive/10 text-destructive'
                                )}
                              >
                                {t(s.status === 'active' ? 'active' : s.status === 'inactive' ? 'inactive' : 'left')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDetails(s)}
                            aria-label="Quick view"
                            className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canManage && (
                            <>
                              <Link href={`/dashboard/fees/student/${s._id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Fee report"
                                  className="text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/dashboard/students/${s._id}/edit`}>
                                <Button variant="ghost" size="icon" aria-label="Edit">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openStatusConfirm(s)}
                                aria-label={s.status === 'active' ? 'Make inactive' : 'Activate'}
                                className={
                                  s.status === 'active'
                                    ? 'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40'
                                    : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
                                }
                              >
                                {s.status === 'active' ? (
                                  <UserX className="h-4 w-4" />
                                ) : (
                                  <UserCheck className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={LIMIT}
            onPageChange={(p) => fetchStudents(p)}
          />
        </CardContent>
      </Card>

      {/* Floating Hover Zoom Photo Preview */}
      {hoveredPhoto && (
        <div
          className="fixed z-50 pointer-events-none rounded-2xl border border-border bg-card p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          style={{
            left: `${hoveredPhoto.x}px`,
            top: `${hoveredPhoto.y}px`,
            transform: 'translateY(-50%)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hoveredPhoto.url}
            alt={hoveredPhoto.name}
            className="h-36 w-36 rounded-xl object-cover"
          />
          <p className="mt-1.5 max-w-[144px] truncate text-center text-xs font-medium text-foreground">
            {hoveredPhoto.name}
          </p>
        </div>
      )}

      {/* View details modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg print:max-w-none print:block">
          <DialogHeader className="print:hidden">
            <DialogTitle>{t('studentDetails')}</DialogTitle>
          </DialogHeader>
          {detailsStudent && (
            <div
              id="student-details-print"
              ref={detailsPrintRef}
              className="space-y-6 rounded-lg border bg-card p-6 text-card-foreground print:border-0 print:bg-white print:p-0 print:shadow-none"
            >
              <div className="border-b pb-4 print:border-black/20">
                <h3 className="text-center text-lg font-semibold text-muted-foreground print:text-black">
                  {t('admissionForm')}
                </h3>
              </div>
              <div className="flex justify-center">
                {detailsStudent.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detailsStudent.photoUrl}
                    alt={detailsStudent.name}
                    className="h-24 w-24 rounded-full object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
                    {detailsStudent.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow label={t('name')} value={detailsStudent.name} />
                <DetailRow label={t('rollNo')} value={detailsStudent.rollNo} />
                <DetailRow label={t('fatherName')} value={detailsStudent.fatherName} />
                <DetailRow label={t('motherName')} value={detailsStudent.motherName} />
                <DetailRow
                  label={t('dateOfBirth')}
                  value={
                    detailsStudent.dateOfBirth
                      ? new Date(detailsStudent.dateOfBirth).toLocaleDateString()
                      : undefined
                  }
                />
                <DetailRow label={t('birthRegNo')} value={detailsStudent.birthRegNo} />
                <DetailRow label={t('gender')} value={detailsStudent.gender} />
                <DetailRow label={t('religion')} value={detailsStudent.religion} />
                <DetailRow label={t('class')} value={detailsStudent.class} />
                <DetailRow label={t('section')} value={detailsStudent.section} />
                <DetailRow label={t('shift')} value={detailsStudent.shift} />
                <DetailRow label={t('group')} value={detailsStudent.group} />
                <DetailRow label={t('guardianName')} value={detailsStudent.guardianName} />
                <DetailRow label={t('guardianPhone')} value={detailsStudent.guardianPhone} />
                <DetailRow label={t('monthlyFee')} value={detailsStudent.monthlyFee != null ? `৳ ${detailsStudent.monthlyFee.toLocaleString()}` : undefined} />
                <DetailRow label={t('admissionDate')} value={detailsStudent.admissionDate ? new Date(detailsStudent.admissionDate).toLocaleDateString() : undefined} />
                <DetailRow
                  label={t('status')}
                  value={t(detailsStudent.status === 'active' ? 'active' : detailsStudent.status === 'inactive' ? 'inactive' : 'left')}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 print:hidden flex-wrap">
            {detailsStudent && (
              <Link href={`/dashboard/students/${detailsStudent._id}`} className="mr-auto">
                <Button type="button" variant="secondary" className="gap-2">
                  <Eye className="h-4 w-4" /> Full Profile
                </Button>
              </Link>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateGuardian}
              disabled={guardianLoading || !detailsStudent?.guardianPhone}
              className="gap-2"
              title={!detailsStudent?.guardianPhone ? 'Add a guardian phone to this student first' : 'Create or link a guardian account'}
            >
              {guardianLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {t('generateGuardian')}
            </Button>
            <Button type="button" variant="outline" onClick={handlePrintDetails} className="gap-2">
              <Printer className="h-4 w-4" />
              {tc('print')}
            </Button>
            <Button type="button" variant="outline" onClick={handleDownloadPdf} disabled={pdfLoading} className="gap-2">
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {'PDF'}
            </Button>
            <Button type="button" onClick={() => setDetailsOpen(false)}>
              {tc('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Soft Delete (Make Inactive) / Activate Confirmation */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isDeactivating ? 'Make Student Inactive?' : 'Activate Student?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isDeactivating
                ? `Are you sure you want to make "${studentToToggle?.name ?? ''}" inactive? Their fee records, attendance, and exam results will be safely preserved, and they will be hidden from active lists. (Permanent deletion is available on the student's profile page.)`
                : `Make "${studentToToggle?.name ?? ''}" active again so they appear in active student lists, attendance, and fee generation?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={togglingStatus}>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmStatusToggle();
              }}
              disabled={togglingStatus}
              className={
                isDeactivating
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }
            >
              {togglingStatus && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {isDeactivating ? 'Make Inactive' : 'Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportStudentsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => fetchStudents(1)}
      />
    </div>
  );
}
