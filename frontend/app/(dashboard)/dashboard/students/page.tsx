'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Users, Loader2, ArrowUpDown, Image as ImageIcon, Eye, Printer, FileDown, CreditCard, FileSpreadsheet, UserPlus, IdCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
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
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
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
      if (statusFilter) params.set('status', statusFilter);
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

  const openDeleteConfirm = (s: Student) => {
    setStudentToDelete(s);
    setDeleteDialogOpen(true);
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
    const s = detailsStudent;
    if (!s) return;
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Allow pop-ups to print.');
      return;
    }
    const fmt = (v: string | number | undefined | null) =>
      v === undefined || v === null || v === '' ? '' : String(v);
    const fmtDate = (d: string | undefined) =>
      d ? new Date(d).toLocaleDateString('en-GB') : '';
    const fmtTk = (n: number | undefined) =>
      n != null ? '৳ ' + n.toLocaleString() : '';
    const schoolName = school?.name ?? '';
    const schoolNameBn = schoolSettings?.nameBn ?? '';
    const schoolContact = schoolSettings?.contact ?? '';
    const schoolAddress = schoolSettings?.address ?? '';
    const schoolLogo = schoolSettings?.logoUrl ?? '';
    const statusLabel = STATUS_OPTIONS.find((o) => o.value === s.status)?.label ?? s.status;
    const sid = s.studentId || s._id.slice(-6).toUpperCase();

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Student Information - ${s.name}</title>
  <style>
    @page { size: A4; margin: 10mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; font-size: 10.5pt; }
    .page {
      width: 100%;
      min-height: 277mm;
      display: flex;
      flex-direction: column;
    }
    .bn { font-family: 'SolaimanLipi','Kalpurush','Noto Sans Bengali','Segoe UI', sans-serif; }

    /* Header */
    .header {
      display: flex; align-items: center; gap: 14px;
      padding-bottom: 6px;
    }
    .header-logo, .header-logo-placeholder {
      width: 78px; height: 78px; object-fit: contain; flex-shrink: 0;
    }
    .header-logo-placeholder {
      background: #eef; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: bold; color: #335;
    }
    .header-text { flex: 1; text-align: center; }
    .header-text h1 { font-size: 20pt; font-weight: 800; line-height: 1.15; letter-spacing: 0.3px; }
    .header-text h2 { font-size: 16pt; font-weight: 700; line-height: 1.2; margin-top: 2px; color: #222; }
    .header-text p { font-size: 9.5pt; margin-top: 3px; color: #444; }
    .divider-thick { border: none; border-top: 2.5px solid #111; margin: 4px 0 8px; }

    .form-title {
      text-align: center;
      font-size: 13pt; font-weight: 800;
      text-transform: uppercase; letter-spacing: 2px;
      padding: 4px 0;
      border: 1.5px solid #111;
      margin: 6px 0 10px;
    }

    /* ID + photo */
    .id-photo-row {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 12px; margin-bottom: 8px;
    }
    .id-block { flex: 1; }
    .id-block .id-line { font-size: 11pt; font-weight: 700; padding: 4px 8px; border: 1px solid #111; display: inline-block; min-width: 200px; background: #f6f6f6; }
    .id-block .quick {
      margin-top: 6px; font-size: 9.5pt; color: #333;
    }
    .photo-box {
      width: 30mm; height: 38mm;
      border: 1px solid #555;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; flex-shrink: 0; background: #fafafa;
    }
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }
    .photo-placeholder { font-size: 9pt; color: #888; text-align: center; padding: 4px; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    td { border: 1px solid #444; padding: 4px 7px; vertical-align: middle; }
    .section-hdr {
      background: #e8e8e8;
      font-weight: 800;
      text-align: center;
      font-size: 10.5pt;
      letter-spacing: 1.5px;
      padding: 5px 7px;
      text-transform: uppercase;
    }
    .lbl { width: 24%; font-weight: 600; white-space: nowrap; background: #fafafa; }
    .colon { width: 10px; text-align: center; background: #fafafa; }
    .val { min-height: 18px; }
    table + table { margin-top: 6px; }

    /* Signatures */
    .sig-row {
      margin-top: auto;
      padding-top: 32mm;
      display: flex;
      justify-content: space-between;
      gap: 18px;
    }
    .sig-box { flex: 1; text-align: center; }
    .sig-line { border-top: 1px solid #111; padding-top: 4px; font-size: 10pt; font-weight: 700; }
    .sig-sub { font-size: 9pt; color: #555; }

    .footnote { margin-top: 6mm; font-size: 8.5pt; color: #777; text-align: center; }

    @media print {
      .toolbar { display: none !important; }
    }
    .toolbar { position: fixed; top: 8px; right: 8px; display: flex; gap: 6px; z-index: 10; }
    .toolbar button { padding: 6px 14px; border: 1px solid #888; background: #fff; cursor: pointer; border-radius: 4px; font-size: 12px; }
    .toolbar button.primary { background: #111; color: #fff; border-color: #111; }
  </style>
</head>
<body>
<div class="toolbar">
  <button onclick="window.print()" class="primary">Print</button>
  <button onclick="window.close()">Close</button>
</div>

<div class="page">

  <!-- Header -->
  <div class="header">
    ${schoolLogo
      ? `<img src="${schoolLogo}" class="header-logo" alt="Logo">`
      : `<div class="header-logo-placeholder">${(schoolName || 'S').charAt(0).toUpperCase()}</div>`
    }
    <div class="header-text">
      <h1>${fmt(schoolName)}</h1>
      ${schoolNameBn ? `<h2 class="bn">${schoolNameBn}</h2>` : ''}
      ${schoolAddress ? `<p>${schoolAddress}</p>` : ''}
      ${schoolContact ? `<p>Mobile: ${schoolContact}</p>` : ''}
    </div>
    <div style="width:78px;flex-shrink:0;"></div>
  </div>
  <hr class="divider-thick">

  <!-- Title -->
  <div class="form-title">Student Information</div>

  <!-- ID + Photo row -->
  <div class="id-photo-row">
    <div class="id-block">
      <div class="id-line">Student ID :&nbsp; ${sid}</div>
      <div class="quick">
        <strong>Class:</strong> ${fmt(s.class)}
        &nbsp;·&nbsp; <strong>Section:</strong> ${fmt(s.section)}
        &nbsp;·&nbsp; <strong>Roll:</strong> ${fmt(s.rollNo)}
        &nbsp;·&nbsp; <strong>Shift:</strong> ${fmt(s.shift)}
        &nbsp;·&nbsp; <strong>Group:</strong> ${fmt(s.group)}
      </div>
    </div>
    <div class="photo-box">
      ${s.photoUrl
        ? `<img src="${s.photoUrl}" alt="Photo">`
        : `<div class="photo-placeholder">Student<br>Photo</div>`
      }
    </div>
  </div>

  <!-- Personal Information -->
  <table>
    <tr><td colspan="4" class="section-hdr">Personal Information</td></tr>

    <tr>
      <td class="lbl">Name (English)</td>
      <td class="colon">:</td>
      <td class="val" colspan="2">${fmt(s.name)}</td>
    </tr>
    <tr>
      <td class="lbl">নাম (বাংলা)</td>
      <td class="colon">:</td>
      <td class="val bn" colspan="2">${fmt(s.nameBn)}</td>
    </tr>
    <tr>
      <td class="lbl">Date of Birth</td>
      <td class="colon">:</td>
      <td class="val">${fmtDate(s.dateOfBirth)}</td>
      <td class="val"><strong>Gender:</strong>&nbsp; ${fmt(s.gender)}</td>
    </tr>
    <tr>
      <td class="lbl">Birth Reg. No.</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.birthRegNo)}</td>
      <td class="val"><strong>Blood Group:</strong>&nbsp; ${fmt(s.bloodGroup)}</td>
    </tr>
    <tr>
      <td class="lbl">Religion</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.religion)}</td>
      <td class="val"><strong>Status:</strong>&nbsp; ${statusLabel}</td>
    </tr>
  </table>

  <!-- Family Information -->
  <table>
    <tr><td colspan="4" class="section-hdr">Family Information</td></tr>

    <tr>
      <td class="lbl">Father's Name</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.fatherName)}</td>
      <td class="val"><strong>Mobile:</strong>&nbsp; ${fmt(s.fatherMobile)}</td>
    </tr>
    <tr>
      <td class="lbl">Profession</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.fatherProfession)}</td>
      <td class="val"><strong>Monthly Income:</strong>&nbsp; ${fmtTk(s.fatherMonthlyIncome)}</td>
    </tr>
    <tr>
      <td class="lbl">Mother's Name</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.motherName)}</td>
      <td class="val"><strong>Mobile:</strong>&nbsp; ${fmt(s.motherMobile)}</td>
    </tr>
    <tr>
      <td class="lbl">Profession</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.motherProfession)}</td>
      <td class="val"><strong>Monthly Income:</strong>&nbsp; ${fmtTk(s.motherMonthlyIncome)}</td>
    </tr>
    <tr>
      <td class="lbl">Guardian Name</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.guardianName)}</td>
      <td class="val"><strong>Relation:</strong>&nbsp; ${fmt(s.guardianRelation)}</td>
    </tr>
    <tr>
      <td class="lbl">Guardian Phone</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.guardianPhone)}</td>
      <td class="val"><strong>WhatsApp:</strong>&nbsp; ${fmt(s.whatsappNumber)}</td>
    </tr>
    <tr>
      <td class="lbl">Address</td>
      <td class="colon">:</td>
      <td class="val" colspan="2">${fmt(s.address)}</td>
    </tr>
  </table>

  <!-- Academic Information -->
  <table>
    <tr><td colspan="4" class="section-hdr">Academic Information</td></tr>

    <tr>
      <td class="lbl">Class</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.class)}</td>
      <td class="val"><strong>Section:</strong>&nbsp; ${fmt(s.section)}</td>
    </tr>
    <tr>
      <td class="lbl">Roll No.</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.rollNo)}</td>
      <td class="val"><strong>Shift:</strong>&nbsp; ${fmt(s.shift)}</td>
    </tr>
    <tr>
      <td class="lbl">Group</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.group)}</td>
      <td class="val"><strong>Monthly Fee:</strong>&nbsp; ${fmtTk(s.monthlyFee)}</td>
    </tr>
    <tr>
      <td class="lbl">Admission Date</td>
      <td class="colon">:</td>
      <td class="val" colspan="2">${fmtDate(s.admissionDate)}</td>
    </tr>
  </table>

  <!-- Signatures -->
  <div class="sig-row">
    <div class="sig-box">
      <div class="sig-line">Student Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Guardian Signature</div>
    </div>
    <div class="sig-box">
      <div class="sig-line">Principal</div>
      <div class="sig-sub">${fmt(schoolName)}</div>
    </div>
  </div>

  <p class="footnote">Generated on ${new Date().toLocaleString('en-GB')} · ${fmt(schoolName)}</p>
</div>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handleDownloadPdf = () => {
    // Use the redesigned print template; the browser print dialog provides
    // a "Save as PDF" destination on every modern desktop browser.
    setPdfLoading(true);
    try {
      handlePrintDetails();
      toast.success('Choose "Save as PDF" in the print dialog to download.');
    } finally {
      setPdfLoading(false);
    }
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
      toast.success('Student deleted successfully.');
      fetchStudents(page);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Delete failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setDeleting(false);
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
                <option value="">{t('all')}</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
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
                setStatusFilter('');
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
                          {s.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.photoUrl}
                              alt={s.name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
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
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDetails(s)}
                              aria-label="View details"
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
                                    className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
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
                                  onClick={() => openDeleteConfirm(s)}
                                  aria-label="Delete"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
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
                        <div>
                          <p className="flex items-center gap-2 font-medium">
                            {s.photoUrl && (
                              <ImageIcon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                            )}
                            {s.name}
                          </p>
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
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDetails(s)}
                            aria-label="View details"
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
                                onClick={() => openDeleteConfirm(s)}
                                aria-label="Delete"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
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
          <DialogFooter className="gap-2 print:hidden">
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

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteStudent')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirm', { name: studentToDelete?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{tc('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc('delete')}
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
