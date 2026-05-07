'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Loader2, Calendar, Users, UserPlus, FileText, Eye, Trash2, Link2, Copy, Check, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { getFees, generateMonth, collectPayment, createAdditionalFee, batchGenerateFee, getFeeHistory, deleteFee } from '@/lib/fees';
import type { Fee, FeeSummary, FeePayment } from '@/types/fee';
import { Pagination } from '@/components/ui/pagination';
import type { Student } from '@/types/student';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
import { openInvoiceWindow } from '@/lib/invoice';

const STATUS_OPTIONS: { value: '' | 'unpaid' | 'partial' | 'paid'; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid', label: 'Paid' },
];

function getMonthOptions() {
  const now = new Date();
  const options: string[] = [];
  for (let i = -2; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return options;
}

const MONTH_OPTIONS = getMonthOptions();

const selectCls = cn(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
  'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
);

export default function FeesPage() {
  const { token, user, school } = useAuth();
  const [schoolSettings, setSchoolSettings] = useState<{ logoUrl?: string; contact?: string; address?: string; nameBn?: string } | null>(null);
  const { classes: CLASS_OPTIONS, sections: SECTION_OPTIONS, shifts: SHIFT_OPTIONS } = useAcademicConfig();

  // Dynamic categories
  const [feeCategories, setFeeCategories] = useState<string[]>([]);

  // Fee list state
  const [fees, setFees] = useState<Fee[]>([]);
  const [summary, setSummary] = useState<FeeSummary>({ totalDue: 0, unpaidCount: 0 });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const LIMIT = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'unpaid' | 'partial' | 'paid'>('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Students list (for individual fee)
  const [students, setStudents] = useState<Student[]>([]);

  // Section 1: Generate Monthly Fees
  const [generating, setGenerating] = useState(false);
  const [generateMonthValue, setGenerateMonthValue] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Section 2: Batch/Class Wise Fee Generation
  const [batchCategory, setBatchCategory] = useState('');
  const [batchClass, setBatchClass] = useState('');
  const [batchSection, setBatchSection] = useState('');
  const [batchShift, setBatchShift] = useState('');
  const [batchMonth, setBatchMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [batchAmount, setBatchAmount] = useState('');
  const [batchDescription, setBatchDescription] = useState('');
  const [batchGenerating, setBatchGenerating] = useState(false);

  // Section 3: Add Individual Student Fee
  const [indivStudentId, setIndivStudentId] = useState('');
  const [indivCategory, setIndivCategory] = useState('');
  const [indivDescription, setIndivDescription] = useState('');
  const [indivMonth, setIndivMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [indivAmount, setIndivAmount] = useState('');
  const [indivSubmitting, setIndivSubmitting] = useState(false);

  // Collect payment modal
  const [collectFee, setCollectFee] = useState<Fee | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectDiscount, setCollectDiscount] = useState('');
  const [collectNote, setCollectNote] = useState('');
  const [collectPaying, setCollectPaying] = useState(false);

  // Details / history modal
  const [detailsFee, setDetailsFee] = useState<Fee | null>(null);
  const [detailsPayments, setDetailsPayments] = useState<FeePayment[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Delete confirm
  const [feeToDelete, setFeeToDelete] = useState<Fee | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Payment link
  const [linkFee, setLinkFee] = useState<Fee | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Load categories + school settings
  useEffect(() => {
    if (!token) return;
    apiRequest<{ success: boolean; data: { feeCategories: string[]; expenseCategories: string[] } }>(
      '/api/settings/categories', { token }
    ).then((res) => {
      if (res.success && res.data?.feeCategories?.length) {
        setFeeCategories(res.data.feeCategories);
        setBatchCategory(res.data.feeCategories[0] || '');
        setIndivCategory(res.data.feeCategories[0] || '');
      }
    }).catch(() => {});

    apiRequest<{ success: boolean; data: { logoUrl?: string; contact?: string; address?: string; nameBn?: string } }>(
      '/api/settings', { token }
    ).then((res) => { if (res.success) setSchoolSettings(res.data); }).catch(() => {});
  }, [token]);

  const fetchFees = useCallback(async (pageNum = 1) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getFees(
        { month: monthFilter || undefined, status: statusFilter || undefined, category: categoryFilter || undefined, class: classFilter || undefined, page: pageNum, limit: LIMIT },
        token
      );
      setFees(res.data || []);
      setSummary(res.summary || { totalDue: 0, unpaidCount: 0 });
      setTotal(res.total ?? 0);
      setTotalPages(res.totalPages ?? 1);
      setPage(pageNum);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load fees';
      setError(msg);
      toast.error(msg);
      setFees([]);
      setSummary({ totalDue: 0, unpaidCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [token, monthFilter, statusFilter, categoryFilter, classFilter]);

  const fetchStudents = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest<{ success: boolean; data: Student[] }>('/api/students', { token });
      setStudents(res.data || []);
    } catch { setStudents([]); }
  }, [token]);

  useEffect(() => { fetchFees(1); }, [fetchFees]);
  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // Print receipt
  const handlePrintReceipt = useCallback(
    (payment: FeePayment) => {
      if (!detailsFee) return;
      const studentObj = (detailsFee as Fee & { student_id?: { name?: string; class?: string; section?: string; rollNo?: string; fatherName?: string; guardianName?: string; guardianPhone?: string } }).student_id;
      const student = typeof studentObj === 'object' && studentObj !== null
        ? studentObj
        : { name: studentName(detailsFee), class: studentClass(detailsFee), section: studentSection(detailsFee), rollNo: studentRoll(detailsFee) };
      openInvoiceWindow({
        receiptNo: String(payment._id).slice(-8).toUpperCase(),
        paymentDate: payment.payment_date,
        amount: payment.amount,
        discount: payment.discount,
        note: payment.note,
        collectedBy: user?.name,
        fee: {
          category: detailsFee.category || detailsFee.fee_type || 'other',
          month: detailsFee.month,
          description: detailsFee.description,
          total_fee: detailsFee.total_fee,
          paid_amount: detailsFee.paid_amount,
          due_amount: detailsFee.due_amount,
        },
        student: {
          name: student.name || '—',
          class: student.class,
          section: student.section,
          rollNo: student.rollNo,
          fatherName: 'fatherName' in student ? student.fatherName : undefined,
          guardianName: 'guardianName' in student ? student.guardianName : undefined,
          guardianPhone: 'guardianPhone' in student ? student.guardianPhone : undefined,
        },
        school: {
          name: school?.name,
          nameBn: schoolSettings?.nameBn,
          address: schoolSettings?.address,
          contact: schoolSettings?.contact,
          logoUrl: schoolSettings?.logoUrl,
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detailsFee, school, schoolSettings, user]
  );

  // Section 1: Generate Monthly Fees
  const handleGenerateMonth = async () => {
    if (!token) return;
    setGenerating(true);
    try {
      const res = await generateMonth(generateMonthValue, token);
      toast.success(`Generated: ${res.data?.created ?? 0} created, ${res.data?.updated ?? 0} updated for ${generateMonthValue}.`);
      fetchFees(page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate month');
    } finally {
      setGenerating(false);
    }
  };

  // Section 2: Batch Fee Generation
  const handleBatchGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !batchCategory || !batchClass || !batchAmount) {
      toast.error('Category, class, and amount are required.');
      return;
    }
    const amount = Number(batchAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount.'); return; }
    setBatchGenerating(true);
    try {
      const res = await batchGenerateFee(
        { category: batchCategory, description: batchDescription.trim() || undefined, month: batchMonth || undefined, amount, class: batchClass, section: batchSection || undefined, shift: batchShift || undefined },
        token
      );
      toast.success(`Generated ${res.data?.created ?? 0} fee(s) for ${batchClass}${batchSection ? ' / ' + batchSection : ''}${batchShift ? ' / ' + batchShift : ''}.`);
      setBatchAmount('');
      setBatchDescription('');
      fetchFees(page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate batch fee');
    } finally {
      setBatchGenerating(false);
    }
  };

  // Section 3: Add Individual Student Fee
  const handleIndivSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !indivStudentId || !indivCategory || !indivAmount) {
      toast.error('Select student, category, and enter amount.');
      return;
    }
    const amount = Number(indivAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount.'); return; }
    setIndivSubmitting(true);
    try {
      await createAdditionalFee(
        { category: indivCategory, description: indivDescription.trim() || undefined, month: indivMonth || undefined, amount, student_id: indivStudentId, for_all_students: false },
        token
      );
      toast.success('Fee added for student.');
      setIndivAmount('');
      setIndivDescription('');
      fetchFees(page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add fee');
    } finally {
      setIndivSubmitting(false);
    }
  };

  // Delete fee
  const handleDeleteFee = async () => {
    if (!token || !feeToDelete) return;
    setDeleting(true);
    try {
      await deleteFee(feeToDelete._id, token);
      toast.success('Fee entry removed.');
      setFeeToDelete(null);
      fetchFees(page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  // Collect modal
  const openCollectModal = (fee: Fee) => {
    setCollectFee(fee);
    setCollectAmount(String(fee.due_amount || 0));
    setCollectDiscount('');
    setCollectNote('');
  };
  const closeCollectModal = () => { setCollectFee(null); setCollectAmount(''); setCollectDiscount(''); setCollectNote(''); };
  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !collectFee) return;
    const amount = Number(collectAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount.'); return; }
    setCollectPaying(true);
    try {
      await collectPayment(collectFee._id, { amount, discount: Number(collectDiscount) || 0, note: collectNote.trim() || undefined }, token);
      toast.success('Payment collected.');
      closeCollectModal();
      fetchFees(page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to collect');
    } finally {
      setCollectPaying(false);
    }
  };

  // Details modal
  const openDetailsModal = useCallback(async (fee: Fee) => {
    setDetailsFee(fee);
    setDetailsPayments([]);
    if (!token) return;
    setDetailsLoading(true);
    try {
      const res = await getFeeHistory(fee._id, token);
      setDetailsPayments(res.data || []);
    } catch { setDetailsPayments([]); } finally { setDetailsLoading(false); }
  }, [token]);
  const closeDetailsModal = () => { setDetailsFee(null); setDetailsPayments([]); };

  // Payment link
  async function openPaymentLink(fee: Fee) {
    setLinkFee(fee);
    setLinkUrl('');
    setLinkCopied(false);
    setLinkLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: { url: string } }>(
        '/api/payment/link/generate',
        { method: 'POST', body: JSON.stringify({ fee_id: fee._id }), token: token! }
      );
      if (res.success) setLinkUrl(res.data.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate link');
      setLinkFee(null);
    } finally { setLinkLoading(false); }
  }

  function copyLink() {
    if (!linkUrl) return;
    navigator.clipboard.writeText(linkUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  // Helpers
  const feeCategoryLabel = (fee: Fee) => fee.category || fee.fee_type || 'other';
  const studentName = (fee: Fee) => { const s = fee.student_id; return typeof s === 'object' && s?.name ? s.name : '—'; };
  const studentClass = (fee: Fee) => { const s = fee.student_id; return typeof s === 'object' && s?.class ? s.class : '—'; };
  const studentSection = (fee: Fee) => { const s = fee.student_id; return typeof s === 'object' && s?.section ? s.section : '—'; };
  const studentRoll = (fee: Fee) => { const s = fee.student_id; return typeof s === 'object' && s?.rollNo ? s.rollNo : '—'; };
  const studentIdValue = (fee: Fee) => { const s = fee.student_id as { studentId?: string } | string | undefined; return typeof s === 'object' && s?.studentId ? s.studentId : '—'; };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fees &amp; Due</h1>
        <p className="mt-1 text-muted-foreground">Generate fees, record payments, and view due list.</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Total due amount</p>
            <p className="mt-2 text-2xl font-semibold">৳ {summary.totalDue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Unpaid / partial count</p>
            <p className="mt-2 text-2xl font-semibold">{summary.unpaidCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Generate Monthly Fees */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Generate Monthly Fees
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Auto-create monthly fee entries for all active students based on their monthly fee amount.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="generate-month">Month</Label>
              <Input
                id="generate-month"
                type="month"
                value={generateMonthValue}
                onChange={(e) => setGenerateMonthValue(e.target.value)}
                className="max-w-[180px]"
              />
            </div>
            <Button
              onClick={handleGenerateMonth}
              disabled={generating}
              className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
            >
              {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate month
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Batch/Class Wise Fee Generation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Batch / Class Wise Fee Generation
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate a specific fee for all students in a class, section, or shift at once.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBatchGenerate}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <div className="space-y-2">
                <Label>Category *</Label>
                <select value={batchCategory} onChange={(e) => setBatchCategory(e.target.value)} className={selectCls}>
                  <option value="">Select category</option>
                  {feeCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Class *</Label>
                <select value={batchClass} onChange={(e) => setBatchClass(e.target.value)} className={selectCls}>
                  <option value="">Select class</option>
                  {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <select value={batchSection} onChange={(e) => setBatchSection(e.target.value)} className={selectCls}>
                  <option value="">All sections</option>
                  {SECTION_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Shift / Batch</Label>
                <select value={batchShift} onChange={(e) => setBatchShift(e.target.value)} className={selectCls}>
                  <option value="">All shifts</option>
                  {SHIFT_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Input type="month" value={batchMonth} onChange={(e) => setBatchMonth(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Amount (৳) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={batchAmount}
                  onChange={(e) => setBatchAmount(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={batchDescription}
                  onChange={(e) => setBatchDescription(e.target.value)}
                  placeholder="e.g. March Exam Fee"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={batchGenerating} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {batchGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Batch Fee
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Section 3: Add Individual Student Fee */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add Individual Student Fee
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add a specific fee (admission, exam, fine, etc.) for a single student.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleIndivSubmit}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <div className="space-y-2">
                <Label>Student *</Label>
                <select value={indivStudentId} onChange={(e) => setIndivStudentId(e.target.value)} className={selectCls}>
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}{s.class ? ` (${s.class})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <select value={indivCategory} onChange={(e) => setIndivCategory(e.target.value)} className={selectCls}>
                  <option value="">Select category</option>
                  {feeCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={indivDescription}
                  onChange={(e) => setIndivDescription(e.target.value)}
                  placeholder="e.g. Annual exam fee"
                />
              </div>
              <div className="space-y-2">
                <Label>Month (optional)</Label>
                <Input type="month" value={indivMonth} onChange={(e) => setIndivMonth(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Amount (৳) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={indivAmount}
                  onChange={(e) => setIndivAmount(e.target.value)}
                  placeholder="e.g. 2000"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button type="submit" disabled={indivSubmitting}>
                {indivSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Fee
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Fee list / Due list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Due list
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Month</Label>
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className={selectCls}>
                <option value="">All</option>
                {MONTH_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectCls}>
                <option value="">All categories</option>
                {feeCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as '' | 'unpaid' | 'partial' | 'paid')} className={selectCls}>
                {STATUS_OPTIONS.map((o) => <option key={o.value || 'all'} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className={selectCls}>
                <option value="">All</option>
                {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : fees.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No fees match the filters. Generate fees first.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Amount (৳)</TableHead>
                    <TableHead className="text-right">Paid (৳)</TableHead>
                    <TableHead className="text-right">Due (৳)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => (
                    <TableRow key={fee._id}>
                      <TableCell className="text-muted-foreground text-xs">
                        {fee.createdAt ? new Date(fee.createdAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="capitalize">{feeCategoryLabel(fee)}</TableCell>
                      <TableCell className="max-w-[140px] truncate" title={fee.description || ''}>{fee.description || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{studentIdValue(fee)}</TableCell>
                      <TableCell className="font-medium">{studentName(fee)}</TableCell>
                      <TableCell>{studentClass(fee)}</TableCell>
                      <TableCell>{studentRoll(fee)}</TableCell>
                      <TableCell>{fee.month || '—'}</TableCell>
                      <TableCell className="text-right">{fee.total_fee.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{fee.paid_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{fee.due_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                          fee.status === 'paid' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200',
                          fee.status === 'partial' && 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200',
                          fee.status === 'unpaid' && 'bg-destructive/10 text-destructive'
                        )}>
                          {fee.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => openDetailsModal(fee)}>
                          <Eye className="h-4 w-4 mr-1" />View
                        </Button>
                        {(fee.status === 'unpaid' || fee.status === 'partial') && fee.due_amount > 0 && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/50"
                              onClick={() => openCollectModal(fee)}
                            >
                              Collect
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-pink-600 hover:text-pink-700 hover:bg-pink-50 dark:text-pink-400 dark:hover:bg-pink-950/30"
                              onClick={() => openPaymentLink(fee)}
                              title="Generate bKash payment link"
                            >
                              <Link2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setFeeToDelete(fee)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={(p) => fetchFees(p)} />
        </CardContent>
      </Card>

      {/* Collect payment modal */}
      <Dialog open={!!collectFee} onOpenChange={(open) => !open && closeCollectModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Collect payment</DialogTitle></DialogHeader>
          {collectFee && (
            <form onSubmit={handleCollectSubmit} className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p><span className="font-medium">Student:</span> {studentName(collectFee)}</p>
                <p><span className="font-medium">Category:</span> {feeCategoryLabel(collectFee)}</p>
                <p><span className="font-medium">Month:</span> {collectFee.month || '—'}</p>
                <p><span className="font-medium">Due amount:</span> ৳ {(collectFee.due_amount || 0).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label>Amount to collect (৳)</Label>
                <Input type="number" min="1" step="1" value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)} placeholder="e.g. 1500" />
              </div>
              <div className="space-y-2">
                <Label>Discount (৳, optional)</Label>
                <Input type="number" min="0" step="1" value={collectDiscount} onChange={(e) => setCollectDiscount(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Input type="text" value={collectNote} onChange={(e) => setCollectNote(e.target.value)} placeholder="e.g. Cash received" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeCollectModal} disabled={collectPaying}>Cancel</Button>
                <Button type="submit" disabled={collectPaying} className="bg-emerald-600 hover:bg-emerald-700">
                  {collectPaying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Collect
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete fee confirmation */}
      <Dialog open={!!feeToDelete} onOpenChange={(open) => !open && setFeeToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Remove fee entry?</DialogTitle></DialogHeader>
          {feeToDelete && (
            <>
              <p className="text-sm text-muted-foreground">
                Permanently removes fee for {studentName(feeToDelete)} — {feeCategoryLabel(feeToDelete)}, ৳{(feeToDelete.total_fee || 0).toLocaleString()}. Payment history and related income records will also be removed.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setFeeToDelete(null)} disabled={deleting}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteFee} disabled={deleting}>
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Remove
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View Details modal */}
      <Dialog open={!!detailsFee} onOpenChange={(open) => !open && closeDetailsModal()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Fee details &amp; payment history</DialogTitle></DialogHeader>
          {detailsFee && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p><span className="font-medium">Student:</span> {studentName(detailsFee)}</p>
                <p><span className="font-medium">Category:</span> {feeCategoryLabel(detailsFee)}</p>
                <p><span className="font-medium">Description:</span> {detailsFee.description || '—'}</p>
                <p><span className="font-medium">Month:</span> {detailsFee.month || '—'}</p>
                <p><span className="font-medium">Total:</span> ৳ {(detailsFee.total_fee || 0).toLocaleString()}</p>
                <p><span className="font-medium">Paid:</span> ৳ {(detailsFee.paid_amount || 0).toLocaleString()}</p>
                <p><span className="font-medium">Due:</span> ৳ {(detailsFee.due_amount || 0).toLocaleString()}</p>
                <p><span className="font-medium">Status:</span> {detailsFee.status}</p>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Payment history</p>
                {detailsLoading ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : detailsPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount (৳)</TableHead>
                          <TableHead className="text-right">Discount (৳)</TableHead>
                          <TableHead>Note</TableHead>
                          <TableHead className="text-right">Receipt</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailsPayments.map((p) => (
                          <TableRow key={p._id}>
                            <TableCell className="text-xs">{p.payment_date ? new Date(p.payment_date).toLocaleString() : '—'}</TableCell>
                            <TableCell className="text-right">{p.amount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{(p.discount ?? 0).toLocaleString()}</TableCell>
                            <TableCell className="max-w-[180px] truncate text-muted-foreground">{p.note || '—'}</TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handlePrintReceipt(p)} title="Print money receipt">
                                <Printer className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Link Modal */}
      <Dialog open={!!linkFee} onOpenChange={(open) => !open && setLinkFee(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-[#E2136E] font-black">bKash</span> Payment Link
            </DialogTitle>
          </DialogHeader>
          {linkFee && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Share this link with the parent/guardian. They can pay <strong>৳{linkFee.due_amount.toLocaleString()}</strong> directly via bKash.
              </p>
              {linkLoading ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : linkUrl ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                    <p className="flex-1 text-xs font-mono text-foreground truncate">{linkUrl}</p>
                    <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2" onClick={copyLink}>
                      {linkCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <Button className="w-full bg-[#E2136E] hover:bg-[#c0125e] text-white" onClick={copyLink}>
                    {linkCopied ? <><Check className="h-4 w-4 mr-2" />Copied!</> : <><Copy className="h-4 w-4 mr-2" />Copy Link</>}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">Link expires in 7 days</p>
                </>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
