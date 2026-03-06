'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Loader2, Plus, Calendar, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { getFees, generateMonth, generateYear, payFee, payFeeById, createOneTimeFee } from '@/lib/fees';
import type { Fee, FeeSummary, FeeType } from '@/types/fee';
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

const FEE_TYPE_OPTIONS: { value: '' | FeeType; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'admission', label: 'Admission' },
  { value: 'exam', label: 'Exam' },
  { value: 'book', label: 'Book' },
  { value: 'other', label: 'Other' },
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'unpaid' | 'partial' | 'paid'>('');
  const [feeTypeFilter, setFeeTypeFilter] = useState<'' | FeeType>('');
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
  const [generateYearValue, setGenerateYearValue] = useState(new Date().getFullYear());
  const [generatingYear, setGeneratingYear] = useState(false);
  const [collectFee, setCollectFee] = useState<Fee | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectPaying, setCollectPaying] = useState(false);
  const [oneTimeStudentId, setOneTimeStudentId] = useState('');
  const [oneTimeFeeType, setOneTimeFeeType] = useState<'admission' | 'exam' | 'book' | 'other'>('admission');
  const [oneTimeAmount, setOneTimeAmount] = useState('');
  const [oneTimeSubmitting, setOneTimeSubmitting] = useState(false);

  const fetchFees = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getFees(
        {
          month: monthFilter || undefined,
          status: statusFilter || undefined,
          fee_type: feeTypeFilter || undefined,
          class: classFilter || undefined,
        },
        token
      );
      setFees(res.data || []);
      setSummary(res.summary || { totalDue: 0, unpaidCount: 0 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load fees';
      setError(msg);
      toast.error(msg);
      setFees([]);
      setSummary({ totalDue: 0, unpaidCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [token, monthFilter, statusFilter, feeTypeFilter, classFilter]);

  const fetchStudents = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest<{ success: boolean; data: Student[] }>('/api/students', { token });
      setStudents(res.data || []);
    } catch {
      setStudents([]);
    }
  }, [token]);

  useEffect(() => {
    fetchFees();
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
      fetchFees();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate month');
    } finally {
      setGenerating(false);
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
      fetchFees();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  const handleGenerateYear = async () => {
    if (!token) return;
    setGeneratingYear(true);
    try {
      const res = await generateYear(generateYearValue, token);
      toast.success(
        `Generated year ${generateYearValue}: ${res.data?.created ?? 0} created, ${res.data?.updated ?? 0} updated.`
      );
      fetchFees();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate year');
    } finally {
      setGeneratingYear(false);
    }
  };

  const openCollectModal = (fee: Fee) => {
    setCollectFee(fee);
    setCollectAmount(String(fee.due_amount || 0));
  };
  const closeCollectModal = () => {
    setCollectFee(null);
    setCollectAmount('');
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
      await payFeeById(collectFee._id, amount, token);
      toast.success('Payment collected.');
      closeCollectModal();
      fetchFees();
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
      fetchFees();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add fee');
    } finally {
      setOneTimeSubmitting(false);
    }
  };

  const feeTypeLabel = (fee: Fee) => {
    const t = fee.fee_type || 'monthly';
    return FEE_TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t;
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
            <div className="space-y-2">
              <Label htmlFor="generate-year">Generate full year (Jan–Dec)</Label>
              <div className="flex gap-2">
                <Input
                  id="generate-year"
                  type="number"
                  min="2020"
                  max="2100"
                  value={generateYearValue}
                  onChange={(e) => setGenerateYearValue(Number(e.target.value) || new Date().getFullYear())}
                  className="max-w-[100px]"
                />
                <Button
                  onClick={handleGenerateYear}
                  disabled={generatingYear}
                  variant="outline"
                >
                  {generatingYear && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate year
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
              <Label htmlFor="filter-fee-type">Fee type</Label>
              <select
                id="filter-fee-type"
                value={feeTypeFilter}
                onChange={(e) => setFeeTypeFilter(e.target.value as '' | FeeType)}
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
                    <TableHead>Type</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Total (৳)</TableHead>
                    <TableHead className="text-right">Paid (৳)</TableHead>
                    <TableHead className="text-right">Due (৳)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => (
                    <TableRow key={fee._id}>
                      <TableCell className="capitalize">{feeTypeLabel(fee)}</TableCell>
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
                      <TableCell className="text-right">
                        {(fee.status === 'unpaid' || fee.status === 'partial') && fee.due_amount > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950/50"
                            onClick={() => openCollectModal(fee)}
                          >
                            Collect
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
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
                <p><span className="font-medium">Type:</span> {feeTypeLabel(collectFee)}</p>
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
    </div>
  );
}
