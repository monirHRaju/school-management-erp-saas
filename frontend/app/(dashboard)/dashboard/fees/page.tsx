'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Loader2, Plus, Calendar, Wallet, FileText, Eye, Trash2, Link2, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { getFees, generateMonth, payFee, collectPayment, createOneTimeFee, createAdditionalFee, getFeeHistory, deleteFee } from '@/lib/fees';
import type { Fee, FeeSummary, FeeCategory, FeePayment } from '@/types/fee';
import { Pagination } from '@/components/ui/pagination';
import { FEE_CATEGORIES } from '@/types/fee';
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

const FEE_TYPE_OPTIONS: { value: '' | FeeCategory; label: string }[] = [
  { value: '', label: 'All categories' },
  ...FEE_CATEGORIES,
];
const ONE_TIME_FEE_TYPES: { value: 'admission' | 'exam' | 'book' | 'other'; label: string }[] = [
  { value: 'admission', label: 'Admission Fee' },
  { value: 'exam', label: 'Exam Fee' },
  { value: 'book', label: 'Book Fee' },
  { value: 'other', label: 'Other' },
];
const CLASS_OPTIONS = ['Play', 'Nursery', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
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

export default function FeesPage() {
  const { token } = useAuth();
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
  const [categoryFilter, setCategoryFilter] = useState<'' | FeeCategory>('');
  const [classFilter, setClassFilter] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generateMonthValue, setGenerateMonthValue] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [payStudentId, setPayStudentId] = useState('');
  const [payMonth, setPayMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [collectFee, setCollectFee] = useState<Fee | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectDiscount, setCollectDiscount] = useState('');
  const [collectNote, setCollectNote] = useState('');
  const [collectPaying, setCollectPaying] = useState(false);
  const [oneTimeStudentId, setOneTimeStudentId] = useState('');
  const [oneTimeFeeType, setOneTimeFeeType] = useState<'admission' | 'exam' | 'book' | 'other'>('admission');
  const [oneTimeAmount, setOneTimeAmount] = useState('');
  const [oneTimeSubmitting, setOneTimeSubmitting] = useState(false);
  const [additionalCategory, setAdditionalCategory] = useState<FeeCategory>('exam_fee');
  const [additionalDescription, setAdditionalDescription] = useState('');
  const [additionalMonth, setAdditionalMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [additionalAmount, setAdditionalAmount] = useState('');
  const [additionalForAll, setAdditionalForAll] = useState(false);
  const [additionalStudentId, setAdditionalStudentId] = useState('');
  const [additionalSubmitting, setAdditionalSubmitting] = useState(false);
  const [detailsFee, setDetailsFee] = useState<Fee | null>(null);
  const [detailsPayments, setDetailsPayments] = useState<FeePayment[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [feeToDelete, setFeeToDelete] = useState<Fee | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Payment link
  const [linkFee, setLinkFee] = useState<Fee | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchFees = useCallback(async (pageNum = 1) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getFees(
        {
          month: monthFilter || undefined,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          class: classFilter || undefined,
          page: pageNum,
          limit: LIMIT,
        },
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
    } finally {
      setLinkLoading(false);
    }
  }

  function copyLink() {
    if (!linkUrl) return;
    navigator.clipboard.writeText(linkUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  const fetchStudents = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest<{ success: boolean; data: Student[] }>('/api/students', { token });
      setStudents(res.data || []);
    } catch {
      setStudents([]);
    }
  }, [token]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    fetchFees(1);
  }, [fetchFees]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleGenerateMonth = async () => {
    if (!token) return;
    setGenerating(true);
    try {
      const res = await generateMonth(generateMonthValue, token);
      toast.success(
        `Generated: ${res.data?.created ?? 0} created, ${res.data?.updated ?? 0} updated for ${generateMonthValue}.`
      );
      setGenerateMonthValue(generateMonthValue);
      fetchFees(page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate month');
    } finally {
      setGenerating(false);
    }
  };

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

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !payStudentId || !payMonth || !payAmount) {
      toast.error('Select student, month, and enter amount.');
      return;
    }
    const amount = Number(payAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    setPaying(true);
    try {
      await payFee({ student_id: payStudentId, month: payMonth, amount }, token);
      toast.success('Payment recorded.');
      setPayAmount('');
      fetchFees(page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  // const handleGenerateYear = async () => {
  //   if (!token) return;
  //   setGeneratingYear(true);
  //   try {
  //     const res = await generateYear(generateYearValue, token);
  //     toast.success(
  //       `Generated year ${generateYearValue}: ${res.data?.created ?? 0} created, ${res.data?.updated ?? 0} updated.`
  //     );
  //     fetchFees(page);
  //   } catch (e) {
  //     toast.error(e instanceof Error ? e.message : 'Failed to generate year');
  //   } finally {
  //     setGeneratingYear(false);
  //   }
  // };

  const openCollectModal = (fee: Fee) => {
    setCollectFee(fee);
    setCollectAmount(String(fee.due_amount || 0));
    setCollectDiscount('');
    setCollectNote('');
  };
  const closeCollectModal = () => {
    setCollectFee(null);
    setCollectAmount('');
    setCollectDiscount('');
    setCollectNote('');
  };
  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !collectFee) return;
    const amount = Number(collectAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    setCollectPaying(true);
    try {
      await collectPayment(
        collectFee._id,
        {
          amount,
          discount: Number(collectDiscount) || 0,
          note: collectNote.trim() || undefined,
        },
        token
      );
      toast.success('Payment collected.');
      closeCollectModal();
      fetchFees(page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to collect');
    } finally {
      setCollectPaying(false);
    }
  };

  const handleOneTimeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !oneTimeStudentId || !oneTimeAmount) {
      toast.error('Select student and enter amount.');
      return;
    }
    const amount = Number(oneTimeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    setOneTimeSubmitting(true);
    try {
      await createOneTimeFee(
        { student_id: oneTimeStudentId, fee_type: oneTimeFeeType, amount },
        token
      );
      toast.success(`${ONE_TIME_FEE_TYPES.find((t) => t.value === oneTimeFeeType)?.label} added.`);
      setOneTimeAmount('');
      fetchFees(page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add fee');
    } finally {
      setOneTimeSubmitting(false);
    }
  };

  const handleAdditionalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const amount = Number(additionalAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    if (!additionalForAll && !additionalStudentId) {
      toast.error('Select a student or choose "All students".');
      return;
    }
    setAdditionalSubmitting(true);
    try {
      const res = await createAdditionalFee(
        {
          category: additionalCategory,
          description: additionalDescription.trim() || undefined,
          month: additionalMonth || undefined,
          amount,
          student_id: additionalForAll ? undefined : additionalStudentId,
          for_all_students: additionalForAll,
        },
        token
      );
      toast.success(
        additionalForAll
          ? `Added ${res.count ?? 0} fee(s) for all students.`
          : 'Additional fee added.'
      );
      setAdditionalAmount('');
      setAdditionalDescription('');
      fetchFees(page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add fee');
    } finally {
      setAdditionalSubmitting(false);
    }
  };

  const openDetailsModal = useCallback(
    async (fee: Fee) => {
      setDetailsFee(fee);
      setDetailsPayments([]);
      if (!token) return;
      setDetailsLoading(true);
      try {
        const res = await getFeeHistory(fee._id, token);
        setDetailsPayments(res.data || []);
      } catch {
        setDetailsPayments([]);
      } finally {
        setDetailsLoading(false);
      }
    },
    [token]
  );
  const closeDetailsModal = () => {
    setDetailsFee(null);
    setDetailsPayments([]);
  };

  const feeCategoryLabel = (fee: Fee) => {
    const cat = fee.category || (fee.fee_type === 'monthly' ? 'student_fee' : fee.fee_type === 'exam' ? 'exam_fee' : fee.fee_type === 'book' ? 'book_sales' : 'other');
    return FEE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
  };

  const studentName = (fee: Fee) => {
    const s = fee.student_id;
    return typeof s === 'object' && s?.name ? s.name : '—';
  };
  const studentClass = (fee: Fee) => {
    const s = fee.student_id;
    return typeof s === 'object' && s?.class ? s.class : '—';
  };
  const studentSection = (fee: Fee) => {
    const s = fee.student_id;
    return typeof s === 'object' && s?.section ? s.section : '—';
  };
  const studentRoll = (fee: Fee) => {
    const s = fee.student_id;
    return typeof s === 'object' && s?.rollNo ? s.rollNo : '—';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Fees & Due</h1>
        <p className="mt-1 text-muted-foreground">
          Generate monthly fees, record payments, and view due list.
        </p>
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

      {/* Actions: Generate month + Record payment */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="generate-month">Generate fees for month</Label>
              <div className="flex gap-2">
                <Input
                  id="generate-month"
                  type="month"
                  value={generateMonthValue}
                  onChange={(e) => setGenerateMonthValue(e.target.value)}
                  className="max-w-[180px]"
                />
                <Button
                  onClick={handleGenerateMonth}
                  disabled={generating}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                >
                  {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate month
                </Button>
              </div>
            </div>
          </div>
          <hr className="border-border" />
          <form onSubmit={handlePay} className="space-y-4">
            <p className="text-sm font-medium">Record payment</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="pay-student">Student</Label>
                <select
                  id="pay-student"
                  value={payStudentId}
                  onChange={(e) => setPayStudentId(e.target.value)}
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} {s.class ? `(${s.class})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-month">Month</Label>
                <Input
                  id="pay-month"
                  type="month"
                  value={payMonth}
                  onChange={(e) => setPayMonth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pay-amount">Amount (৳)</Label>
                <Input
                  id="pay-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="e.g. 1500"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={paying} className="gap-2">
                  {paying && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Plus className="h-4 w-4" />
                  Record payment
                </Button>
              </div>
            </div>
          </form>
          <hr className="border-border" />
          <form onSubmit={handleAdditionalSubmit} className="space-y-4">
            <p className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Add fee (monthly, exam, book, fine, etc.) — one student or all students
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  value={additionalCategory}
                  onChange={(e) => setAdditionalCategory(e.target.value as FeeCategory)}
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  {FEE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={additionalDescription}
                  onChange={(e) => setAdditionalDescription(e.target.value)}
                  placeholder="e.g. March Exam Fee"
                />
              </div>
              <div className="space-y-2">
                <Label>Month (optional)</Label>
                <Input
                  type="month"
                  value={additionalMonth}
                  onChange={(e) => setAdditionalMonth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (৳)</Label>
                <Input
                  type="number"
                  min="1"
                  value={additionalAmount}
                  onChange={(e) => setAdditionalAmount(e.target.value)}
                  placeholder="e.g. 500"
                />
              </div>
              <div className="space-y-2">
                <Label>For</Label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={additionalForAll}
                      onChange={() => setAdditionalForAll(true)}
                    />
                    All students
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={!additionalForAll}
                      onChange={() => setAdditionalForAll(false)}
                    />
                    One student
                  </label>
                  {!additionalForAll && (
                    <select
                      value={additionalStudentId}
                      onChange={(e) => setAdditionalStudentId(e.target.value)}
                      className={cn(
                        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'
                      )}
                    >
                      <option value="">Select student</option>
                      {students.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name} {s.class ? `(${s.class})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={additionalSubmitting}>
                  {additionalSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add additional fee
                </Button>
              </div>
            </div>
          </form>
          <hr className="border-border" />
          <form onSubmit={handleOneTimeSubmit} className="space-y-4">
            <p className="text-sm font-medium flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Add one-time fee (Admission, Exam, Book, Other)
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Student</Label>
                <select
                  value={oneTimeStudentId}
                  onChange={(e) => setOneTimeStudentId(e.target.value)}
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  <option value="">Select student</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} {s.class ? `(${s.class})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Fee type</Label>
                <select
                  value={oneTimeFeeType}
                  onChange={(e) => setOneTimeFeeType(e.target.value as 'admission' | 'exam' | 'book' | 'other')}
                  className={cn(
                    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  )}
                >
                  {ONE_TIME_FEE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Amount (৳)</Label>
                <Input
                  type="number"
                  min="1"
                  value={oneTimeAmount}
                  onChange={(e) => setOneTimeAmount(e.target.value)}
                  placeholder="e.g. 5000"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={oneTimeSubmitting}>
                  {oneTimeSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add fee
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filters + Due list */}
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
              <Label htmlFor="filter-month">Month</Label>
              <select
                id="filter-month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                <option value="">All</option>
                {MONTH_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-category">Category</Label>
              <select
                id="filter-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as '' | FeeCategory)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                {FEE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filter-status">Status</Label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as '' | 'unpaid' | 'partial' | 'paid')}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
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
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : fees.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No fees match the filters. Generate a month first.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
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
                      <TableCell className="max-w-[140px] truncate" title={fee.description || ''}>
                        {fee.description || '—'}
                      </TableCell>
                      <TableCell className="font-medium">{studentName(fee)}</TableCell>
                      <TableCell>{studentClass(fee)}</TableCell>
                      <TableCell>{studentSection(fee)}</TableCell>
                      <TableCell>{studentRoll(fee)}</TableCell>
                      <TableCell>{fee.month || '—'}</TableCell>
                      <TableCell className="text-right">{fee.total_fee.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{fee.paid_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{fee.due_amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            fee.status === 'paid' && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200',
                            fee.status === 'partial' && 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200',
                            fee.status === 'unpaid' && 'bg-destructive/10 text-destructive'
                          )}
                        >
                          {fee.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={() => openDetailsModal(fee)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
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
                          aria-label="Delete fee entry"
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
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={LIMIT}
            onPageChange={(p) => fetchFees(p)}
          />
        </CardContent>
      </Card>

      {/* Collect payment modal */}
      <Dialog open={!!collectFee} onOpenChange={(open) => !open && closeCollectModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Collect payment</DialogTitle>
          </DialogHeader>
          {collectFee && (
            <form onSubmit={handleCollectSubmit} className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p><span className="font-medium">Student:</span> {studentName(collectFee)}</p>
                <p><span className="font-medium">Category:</span> {feeCategoryLabel(collectFee)}</p>
                <p><span className="font-medium">Month:</span> {collectFee.month || '—'}</p>
                <p><span className="font-medium">Due amount:</span> ৳ {(collectFee.due_amount || 0).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="collect-amount">Amount to collect (৳)</Label>
                <Input
                  id="collect-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  placeholder="e.g. 1500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collect-discount">Discount (৳, optional)</Label>
                <Input
                  id="collect-discount"
                  type="number"
                  min="0"
                  step="1"
                  value={collectDiscount}
                  onChange={(e) => setCollectDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collect-note">Note (optional)</Label>
                <Input
                  id="collect-note"
                  type="text"
                  value={collectNote}
                  onChange={(e) => setCollectNote(e.target.value)}
                  placeholder="e.g. Cash received"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeCollectModal} disabled={collectPaying}>
                  Cancel
                </Button>
                <Button type="submit" disabled={collectPaying} className="bg-emerald-600 hover:bg-emerald-700">
                  {collectPaying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Collect
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete fee confirmation */}
      <Dialog open={!!feeToDelete} onOpenChange={(open) => !open && setFeeToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove fee entry?</DialogTitle>
          </DialogHeader>
          {feeToDelete && (
            <>
              <p className="text-sm text-muted-foreground">
                This will permanently remove this fee entry (student: {studentName(feeToDelete)}, {feeCategoryLabel(feeToDelete)}, ৳ {(feeToDelete.total_fee || 0).toLocaleString()}). Any payment history and related income records for this fee will also be removed.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setFeeToDelete(null)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteFee} disabled={deleting}>
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Remove
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* View Details modal — payment history */}
      <Dialog open={!!detailsFee} onOpenChange={(open) => !open && closeDetailsModal()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Fee details & payment history</DialogTitle>
          </DialogHeader>
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
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailsPayments.map((p) => (
                          <TableRow key={p._id}>
                            <TableCell className="text-xs">
                              {p.payment_date ? new Date(p.payment_date).toLocaleString() : '—'}
                            </TableCell>
                            <TableCell className="text-right">{p.amount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{(p.discount ?? 0).toLocaleString()}</TableCell>
                            <TableCell className="max-w-[180px] truncate text-muted-foreground">{p.note || '—'}</TableCell>
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
                Share this link with the parent/guardian. They can pay <strong>৳{linkFee.due_amount.toLocaleString()}</strong> directly via bKash — no login required.
              </p>
              {linkLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : linkUrl ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                    <p className="flex-1 text-xs font-mono text-foreground truncate">{linkUrl}</p>
                    <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2" onClick={copyLink}>
                      {linkCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <Button
                    className="w-full bg-[#E2136E] hover:bg-[#c0125e] text-white"
                    onClick={copyLink}
                  >
                    {linkCopied ? <><Check className="h-4 w-4 mr-2" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Copy Link</>}
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
