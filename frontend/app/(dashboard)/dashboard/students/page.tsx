'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Users, Loader2, ArrowUpDown, Image as ImageIcon, Eye, Printer, FileDown, CreditCard, FileSpreadsheet } from 'lucide-react';
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
  >('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [detailsStudent, setDetailsStudent] = useState<Student | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const detailsPrintRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;
  const [schoolSettings, setSchoolSettings] = useState<{ logoUrl?: string; contact?: string; address?: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ success: boolean; data: { logoUrl?: string; contact?: string } }>('/api/settings', { token })
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
    const schoolName = school?.name ?? '';
    const schoolContact = schoolSettings?.contact ?? '';
    const schoolAddress = schoolSettings?.address ?? '';
    const schoolLogo = schoolSettings?.logoUrl ?? '';
    const statusLabel = STATUS_OPTIONS.find((o) => o.value === s.status)?.label ?? s.status;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Student Information - ${s.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; background: #fff; color: #111; }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 12mm 14mm;
      margin: 0 auto;
      background: #fff;
    }
    /* Header */
    .header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 8px;
    }
    .header-logo { width: 72px; height: 72px; object-fit: contain; flex-shrink: 0; }
    .header-logo-placeholder {
      width: 72px; height: 72px; flex-shrink: 0;
      background: #e5e7eb; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: bold; color: #374151;
    }
    .header-text { flex: 1; text-align: center; }
    .header-text h1 { font-size: 22pt; font-weight: bold; line-height: 1.2; }
    .header-text p { font-size: 9.5pt; margin-top: 3px; }
    .divider-thick { border: none; border-top: 2.5px solid #111; margin: 6px 0 4px; }
    /* Form title */
    .form-title {
      text-align: center;
      font-size: 13pt;
      font-weight: bold;
      text-decoration: underline;
      margin: 8px 0 6px;
      letter-spacing: 0.03em;
    }
    /* Student ID + photo row */
    .id-photo-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    .student-id-line { font-size: 10.5pt; font-weight: 500; }
    .photo-box {
      width: 85px; height: 105px;
      border: 1px solid #555;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; flex-shrink: 0;
    }
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }
    .photo-placeholder { font-size: 8.5pt; color: #888; text-align: center; padding: 4px; }
    /* Info table */
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    td { border: 1px solid #444; padding: 4px 7px; vertical-align: middle; }
    .section-hdr {
      background: #e8e8e8;
      font-weight: bold;
      text-align: center;
      font-size: 10.5pt;
      text-decoration: underline;
      padding: 5px 7px;
    }
    .lbl { width: 28%; font-weight: 500; white-space: nowrap; background: #fafafa; }
    .colon { width: 12px; text-align: center; border-left: none; border-right: none; background: #fafafa; }
    .val { min-height: 18px; }
    .val-right { min-height: 18px; color: #333; }
    @media print {
      html, body { margin: 0; padding: 0; }
      .page { padding: 10mm 12mm; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    ${schoolLogo
      ? `<img src="${schoolLogo}" class="header-logo" alt="Logo">`
      : `<div class="header-logo-placeholder">${schoolName.charAt(0).toUpperCase()}</div>`
    }
    <div class="header-text">
      <h1>${schoolName}</h1>
      ${schoolAddress ? `<p>Address: ${schoolAddress}</p>` : ''}
      ${schoolContact ? `<p>Mobile: ${schoolContact}</p>` : ''}
    </div>
    <div style="width:72px;flex-shrink:0;"></div>
  </div>
  <hr class="divider-thick">

  <!-- Title -->
  <div class="form-title">Student Information</div>

  <!-- Student ID + Photo -->
  <div class="id-photo-row">
    <div class="student-id-line">Student ID :&nbsp; ${s._id.slice(-8).toUpperCase()}</div>
    <div class="photo-box">
      ${s.photoUrl
        ? `<img src="${s.photoUrl}" alt="Photo">`
        : `<div class="photo-placeholder">Student<br>Photo</div>`
      }
    </div>
  </div>

  <!-- Personal Information -->
  <table>
    <tr><td colspan="4" class="section-hdr">PERSONAL INFORMATION</td></tr>

    <tr>
      <td class="lbl">Student Name (In Bangla)</td>
      <td class="colon">:</td>
      <td class="val" colspan="2"></td>
    </tr>
    <tr>
      <td class="lbl">(In English)</td>
      <td class="colon">:</td>
      <td class="val" colspan="2">${fmt(s.name)}</td>
    </tr>
    <tr>
      <td class="lbl">Date of Birth</td>
      <td class="colon">:</td>
      <td class="val" colspan="2">${fmtDate(s.dateOfBirth)}</td>
    </tr>
    <tr>
      <td class="lbl">Birth Reg. No.</td>
      <td class="colon">:</td>
      <td class="val" style="width:28%">${fmt(s.birthRegNo)}</td>
      <td class="val-right">Blood Group :&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
    </tr>
    <tr>
      <td class="lbl">Father's Name</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.fatherName)}</td>
      <td class="val-right">Mobile :</td>
    </tr>
    <tr>
      <td class="lbl">Profession</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.fatherProfession)}</td>
      <td class="val-right">Monthly Income :</td>
    </tr>
    <tr>
      <td class="lbl">Mother's Name</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.motherName)}</td>
      <td class="val-right">Mobile :</td>
    </tr>
    <tr>
      <td class="lbl">Profession</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.motherProfession)}</td>
      <td class="val-right">Monthly Income :</td>
    </tr>
    <tr>
      <td class="lbl">Guardian Name</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.guardianName)}</td>
      <td class="val-right">WhatsApp :&nbsp; ${fmt(s.whatsappNumber)}</td>
    </tr>
    <tr>
      <td class="lbl">Relation</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.guardianRelation)}</td>
      <td class="val-right">Monthly Income :</td>
    </tr>
    <tr>
      <td class="lbl">Address</td>
      <td class="colon">:</td>
      <td class="val" colspan="2">${fmt(s.address)}</td>
    </tr>

    <!-- Academic Information -->
    <tr><td colspan="4" class="section-hdr">ACADEMIC INFORMATION</td></tr>

    <tr>
      <td class="lbl">Class</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.class)}</td>
      <td class="val-right">Section :&nbsp; ${fmt(s.section)}</td>
    </tr>
    <tr>
      <td class="lbl">Roll No.</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.rollNo)}</td>
      <td class="val-right">Shift :&nbsp; ${fmt(s.shift)}</td>
    </tr>
    <tr>
      <td class="lbl">Group</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.group)}</td>
      <td class="val-right">Gender :&nbsp; ${fmt(s.gender)}</td>
    </tr>
    <tr>
      <td class="lbl">Religion</td>
      <td class="colon">:</td>
      <td class="val">${fmt(s.religion)}</td>
      <td class="val-right">Status :&nbsp; ${statusLabel}</td>
    </tr>
    <tr>
      <td class="lbl">Admission Date</td>
      <td class="colon">:</td>
      <td class="val">${fmtDate(s.admissionDate)}</td>
      <td class="val-right">Monthly Fee :&nbsp; ${s.monthlyFee != null ? '৳ ' + s.monthlyFee.toLocaleString() : ''}</td>
    </tr>
  </table>

</div>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const handleDownloadPdf = async () => {
    const el = detailsPrintRef.current;
    if (!el) return;
    setPdfLoading(true);
    try {
      const html2canvasMod = await import('html2canvas');
      const jspdfMod = await import('jspdf');
      const html2canvas = (html2canvasMod as any).default || (html2canvasMod as any);
      const jsPDFCtor = (jspdfMod as any).jsPDF || (jspdfMod as any).default;
      if (!html2canvas || !jsPDFCtor) {
        throw new Error('PDF libraries not loaded');
      }
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDFCtor({ unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = pdfW;
      const imgH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgW, Math.min(imgH, pdfH));
      if (imgH > pdfH) pdf.addPage();
      pdf.save(
        detailsStudent
          ? `student-${detailsStudent.name.replace(/\s+/g, '-')}.pdf`
          : 'student-details.pdf'
      );
      toast.success('PDF downloaded.');
    } catch (e) {
      toast.error('Failed to generate PDF. Opening print dialog instead – choose "Save as PDF".');
      handlePrintDetails();
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
      if (field === 'admissionDate') {
        return (new Date(av).getTime() - new Date(bv).getTime()) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [students, sortDirection, sortField]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-muted-foreground">
            Manage admissions, classes, and monthly fees for your school.
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => setImportOpen(true)}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Import CSV / Excel
            </Button>
            <Link href="/dashboard/students/new">
              <Button className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400">
                <Plus className="h-4 w-4" />
                Add student
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="filter-class">Class</Label>
              <select
                id="filter-class"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                <option value="">All</option>
                {classes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-section">Section</Label>
              <select
                id="filter-section"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                <option value="">All</option>
                {sections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
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
            <div className="space-y-2">
              <Label htmlFor="filter-search">Search</Label>
              <Input
                id="filter-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or roll"
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
              Clear all filters
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
              <p className="text-sm text-muted-foreground">Loading students…</p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">No students yet</p>
                <p className="text-sm text-muted-foreground">{canManage ? 'Add your first student to get started.' : 'No students found.'}</p>
              </div>
              {canManage && (
                <Link href="/dashboard/students/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Add student
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
                      <TableHead>SL</TableHead>
                      <TableHead>Photo</TableHead>
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
                          Name
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
                          Roll
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
                          Class
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        </span>
                      </TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[140px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStudents.map((s, index) => (
                      <TableRow key={s._id}>
                        <TableCell>{index + 1}</TableCell>
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
                        <TableCell>{s.section || '—'}</TableCell>
                        <TableCell>{s.shift || '—'}</TableCell>
                        <TableCell>{s.group || '—'}</TableCell>
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
                          <p className="text-sm text-muted-foreground">
                            {s.guardianName || 'No guardian'}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-sm">
                            {s.class && (
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950/60 dark:text-blue-200">
                                Class {s.class}
                              </span>
                            )}
                            {s.section && (
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200">
                                Sec {s.section}
                              </span>
                            )}
                            {s.shift && (
                              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
                                {s.shift}
                              </span>
                            )}
                            {s.group && (
                              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
                                {s.group}
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
                              {STATUS_OPTIONS.find((o) => o.value === s.status)?.label ?? s.status}
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
            <DialogTitle>Student details</DialogTitle>
          </DialogHeader>
          {detailsStudent && (
            <div
              id="student-details-print"
              ref={detailsPrintRef}
              className="space-y-6 rounded-lg border bg-card p-6 text-card-foreground print:border-0 print:bg-white print:p-0 print:shadow-none"
            >
              <div className="border-b pb-4 print:border-black/20">
                <h3 className="text-center text-lg font-semibold text-muted-foreground print:text-black">
                  Student Admission Form
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
                <DetailRow label="Name" value={detailsStudent.name} />
                <DetailRow label="Roll no." value={detailsStudent.rollNo} />
                <DetailRow label="Father name" value={detailsStudent.fatherName} />
                <DetailRow label="Mother name" value={detailsStudent.motherName} />
                <DetailRow
                  label="Date of birth"
                  value={
                    detailsStudent.dateOfBirth
                      ? new Date(detailsStudent.dateOfBirth).toLocaleDateString()
                      : undefined
                  }
                />
                <DetailRow label="Birth reg. no." value={detailsStudent.birthRegNo} />
                <DetailRow label="Gender" value={detailsStudent.gender} />
                <DetailRow label="Religion" value={detailsStudent.religion} />
                <DetailRow label="Class" value={detailsStudent.class} />
                <DetailRow label="Section" value={detailsStudent.section} />
                <DetailRow label="Shift" value={detailsStudent.shift} />
                <DetailRow label="Group" value={detailsStudent.group} />
                <DetailRow label="Guardian name" value={detailsStudent.guardianName} />
                <DetailRow label="Guardian phone" value={detailsStudent.guardianPhone} />
                <DetailRow label="Monthly fee" value={detailsStudent.monthlyFee != null ? `৳ ${detailsStudent.monthlyFee.toLocaleString()}` : undefined} />
                <DetailRow label="Admission date" value={detailsStudent.admissionDate ? new Date(detailsStudent.admissionDate).toLocaleDateString() : undefined} />
                <DetailRow
                  label="Status"
                  value={STATUS_OPTIONS.find((o) => o.value === detailsStudent.status)?.label ?? detailsStudent.status}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 print:hidden">
            <Button type="button" variant="outline" onClick={handlePrintDetails} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button type="button" variant="outline" onClick={handleDownloadPdf} disabled={pdfLoading} className="gap-2">
              {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              PDF
            </Button>
            <Button type="button" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
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

      <ImportStudentsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => fetchStudents(1)}
      />
    </div>
  );
}
