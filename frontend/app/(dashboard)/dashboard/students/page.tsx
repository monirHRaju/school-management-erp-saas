'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Users, Loader2, ArrowUpDown, Image as ImageIcon, Eye, Printer, FileDown, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import type { Student, StudentFormData } from '@/types/student';
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

const STATUS_OPTIONS: { value: Student['status']; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'left', label: 'Left' },
];

const CLASS_OPTIONS = ['Play', 'Nursery', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const SECTION_OPTIONS = ['A', 'B', 'C', 'D'];
const SHIFT_OPTIONS = ['Morning', 'Day'];
const GROUP_OPTIONS = ['General', 'Science', 'Commerce', 'Arts'];
const GENDER_OPTIONS = ['Male', 'Female', 'Other'];

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  const display = value === undefined || value === null || value === '' ? '—' : String(value);
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground print:text-black/70">{label}</p>
      <p className="text-sm font-medium print:text-black">{display}</p>
    </div>
  );
}

const emptyForm: StudentFormData = {
  name: '',
  fatherName: '',
  motherName: '',
  guardianName: '',
  guardianPhone: '',
  photoUrl: '',
  shift: '',
  group: '',
  dateOfBirth: '',
  birthRegNo: '',
  gender: '',
  religion: '',
  class: '',
  section: '',
  rollNo: '',
  monthlyFee: '',
  admissionDate: '',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
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

  const openCreate = () => {
    setEditingStudent(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setDialogOpen(true);
  };

  const openEdit = (s: Student) => {
    setEditingStudent(s);
    setForm({
      name: s.name,
      fatherName: s.fatherName ?? '',
      motherName: s.motherName ?? '',
      guardianName: s.guardianName ?? '',
      guardianPhone: s.guardianPhone ?? '',
      photoUrl: s.photoUrl ?? '',
      shift: s.shift ?? '',
      group: s.group ?? '',
      dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : '',
      birthRegNo: s.birthRegNo ?? '',
      gender: s.gender ?? '',
      religion: s.religion ?? '',
      class: s.class ?? '',
      section: s.section ?? '',
      rollNo: s.rollNo ?? '',
      monthlyFee: s.monthlyFee != null ? String(s.monthlyFee) : '',
      admissionDate: s.admissionDate ? s.admissionDate.slice(0, 10) : '',
      status: s.status,
    });
    setPhotoFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      let photoUrl = form.photoUrl?.trim() || undefined;

      if (photoFile) {
        const toBase64 = (file: File) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

        const dataUrl = await toBase64(photoFile);
        const uploadRes = await apiRequest<{
          success: boolean;
          data?: { url: string };
          error?: string;
        }>('/api/students/photo', {
          method: 'POST',
          body: JSON.stringify({ image: dataUrl }),
          token,
        });
        if (!uploadRes.success || !uploadRes.data) {
          throw new Error(uploadRes.error || 'Photo upload failed');
        }
        photoUrl = uploadRes.data.url;
      }

      const payload = {
        name: form.name.trim(),
        fatherName: form.fatherName?.trim() || undefined,
        motherName: form.motherName?.trim() || undefined,
        guardianName: form.guardianName?.trim() || undefined,
        guardianPhone: form.guardianPhone?.trim() || undefined,
        photoUrl,
        shift: form.shift?.trim() || undefined,
        group: form.group?.trim() || undefined,
        dateOfBirth: form.dateOfBirth?.trim() || undefined,
        birthRegNo: form.birthRegNo?.trim() || undefined,
        gender: form.gender?.trim() || undefined,
        religion: form.religion?.trim() || undefined,
        class: form.class?.trim() || undefined,
        section: form.section?.trim() || undefined,
        rollNo: form.rollNo?.trim() || undefined,
        monthlyFee: form.monthlyFee?.trim() || undefined,
        admissionDate: form.admissionDate?.trim() || undefined,
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
      toast.success(editingStudent ? 'Student updated successfully.' : 'Student added successfully.');
      fetchStudents(editingStudent ? page : 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

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
      v === undefined || v === null || v === '' ? '—' : String(v);
    const fmtDate = (d: string | undefined) =>
      d ? new Date(d).toLocaleDateString() : '—';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Details - ${s.name}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 24px; color: #111; max-width: 640px; margin: 0 auto; }
            .title { text-align: center; color: #555; margin-bottom: 20px; font-size: 1.1rem; }
            .photo-wrap { text-align: center; margin-bottom: 20px; }
            .photo { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; }
            .initial { width: 96px; height: 96px; border-radius: 50%; background: #e5e7eb; display: inline-flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 600; color: #374151; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
            .field { margin-bottom: 4px; }
            .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.02em; }
            .value { font-size: 14px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="title">Student Admission Form</div>
          <div class="photo-wrap">
            ${s.photoUrl
              ? `<img src="${s.photoUrl}" alt="${s.name}" class="photo" />`
              : `<div class="initial">${s.name.charAt(0).toUpperCase()}</div>`
            }
          </div>
          <div class="grid">
            <div class="field"><div class="label">Name</div><div class="value">${fmt(s.name)}</div></div>
            <div class="field"><div class="label">Roll no.</div><div class="value">${fmt(s.rollNo)}</div></div>
            <div class="field"><div class="label">Father name</div><div class="value">${fmt((s as any).fatherName)}</div></div>
            <div class="field"><div class="label">Mother name</div><div class="value">${fmt((s as any).motherName)}</div></div>
            <div class="field"><div class="label">Date of birth</div><div class="value">${fmtDate(s.dateOfBirth)}</div></div>
            <div class="field"><div class="label">Birth reg. no.</div><div class="value">${fmt(s.birthRegNo)}</div></div>
            <div class="field"><div class="label">Gender</div><div class="value">${fmt(s.gender)}</div></div>
            <div class="field"><div class="label">Religion</div><div class="value">${fmt(s.religion)}</div></div>
            <div class="field"><div class="label">Class</div><div class="value">${fmt(s.class)}</div></div>
            <div class="field"><div class="label">Section</div><div class="value">${fmt(s.section)}</div></div>
            <div class="field"><div class="label">Shift</div><div class="value">${fmt(s.shift)}</div></div>
            <div class="field"><div class="label">Group</div><div class="value">${fmt(s.group)}</div></div>
            <div class="field"><div class="label">Guardian name</div><div class="value">${fmt(s.guardianName)}</div></div>
            <div class="field"><div class="label">Guardian phone</div><div class="value">${fmt(s.guardianPhone)}</div></div>
            <div class="field"><div class="label">Monthly fee</div><div class="value">${s.monthlyFee != null ? '৳ ' + s.monthlyFee.toLocaleString() : '—'}</div></div>
            <div class="field"><div class="label">Admission date</div><div class="value">${fmtDate(s.admissionDate)}</div></div>
            <div class="field"><div class="label">Status</div><div class="value">${STATUS_OPTIONS.find((o) => o.value === s.status)?.label ?? s.status}</div></div>
          </div>
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
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
      toast.error('Failed to generate PDF. Opening print dialog instead – choose \"Save as PDF\".');
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
        <Button
          onClick={openCreate}
          className="w-full sm:w-auto bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        >
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
              <select
                id="filter-class"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                <option value="">All</option>
                {CLASS_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
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
                {SECTION_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(s)}
                              aria-label="Edit"
                            >
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
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={LIMIT}
            onPageChange={(p) => fetchStudents(p)}
          />
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
              <Label htmlFor="dateOfBirth">Date of birth *</Label>
              <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fatherName">Father name</Label>
                <Input
                  id="fatherName"
                  value={form.fatherName ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, fatherName: e.target.value }))}
                  placeholder="Father name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motherName">Mother name</Label>
                <Input
                  id="motherName"
                  value={form.motherName ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, motherName: e.target.value }))}
                  placeholder="Mother name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardianName">Guardian name</Label>
              <Input
                id="guardianName"
                value={form.guardianName ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))}
                placeholder="Optional – guardian / emergency contact"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guardianPhone">Guardian phone</Label>
              <Input
                id="guardianPhone"
                value={form.guardianPhone ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, guardianPhone: e.target.value }))}
                placeholder="e.g. 01XXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo">Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setPhotoFile(file);
                }}
              />
              {form.photoUrl && !photoFile && (
                <p className="text-xs text-muted-foreground">
                  Existing photo will be kept if you do not upload a new one.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <select
                  id="class"
                  value={form.class ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  <option value="">Select class</option>
                  {CLASS_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <select
                  id="section"
                  value={form.section ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  <option value="">Select section</option>
                  {SECTION_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shift">Shift</Label>
                <select
                  id="shift"
                  value={form.shift ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value }))}
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  <option value="">Select shift</option>
                  {SHIFT_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="group">Group</Label>
                <select
                  id="group"
                  value={form.group ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  <option value="">Select group</option>
                  {GROUP_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyFee">Monthly fee</Label>
                <Input
                  id="monthlyFee"
                  type="number"
                  min="0"
                  value={form.monthlyFee ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyFee: e.target.value }))}
                  placeholder="e.g. 1500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admissionDate">Admission date</Label>
                <Input
                  id="admissionDate"
                  type="date"
                  value={form.admissionDate ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, admissionDate: e.target.value }))}
                />
              </div>
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

      {/* View details modal — admission form style with Print & PDF */}
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
                <DetailRow
                  label="Father name"
                  value={detailsStudent.fatherName}
                />
                <DetailRow
                  label="Mother name"
                  value={detailsStudent.motherName}
                />
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
    </div>
  );
}
