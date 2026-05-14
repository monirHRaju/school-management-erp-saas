'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, CreditCard, TrendingUp, Eye, Plus,
  Printer, Link2, Copy, Check, CheckSquare, Square, Receipt, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { getFees, getFeeHistory, collectPayment, createAdditionalFee, collectMultiFees, deleteFee } from '@/lib/fees';
import { apiRequest } from '@/lib/api';
import { openInvoiceWindow, openMultiInvoiceWindow } from '@/lib/invoice';
import type { Fee, FeeSummary, FeePayment } from '@/types/fee';
import type { Student } from '@/types/student';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const selectCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

function feeCategoryLabel(fee: Fee) {
  return fee.category || fee.fee_type || 'other';
}

export default function StudentFeeReportPage() {
  const params = useParams();
  const studentId = typeof params.id === 'string' ? params.id : '';
  const { token, user, school } = useAuth();

  const [student, setStudent] = useState<Student | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [summary, setSummary] = useState<FeeSummary>({ totalDue: 0, unpaidCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic categories + school settings for invoice
  const [feeCategories, setFeeCategories] = useState<string[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<{ logoUrl?: string; contact?: string; address?: string; nameBn?: string } | null>(null);

  // Single collect modal
  const [collectFee, setCollectFee] = useState<Fee | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectDiscount, setCollectDiscount] = useState('');
  const [collectNote, setCollectNote] = useState('');
  const [collectPaying, setCollectPaying] = useState(false);

  // View details modal
  const [detailsFee, setDetailsFee] = useState<Fee | null>(null);
  const [detailsPayments, setDetailsPayments] = useState<FeePayment[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Add fee modal
  const [addFeeOpen, setAddFeeOpen] = useState(false);
  const [addCategory, setAddCategory] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addMonth, setAddMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [addAmount, setAddAmount] = useState('');
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Multi-collect
  const [selectedFeeIds, setSelectedFeeIds] = useState<Set<string>>(new Set());
  const [multiCollectOpen, setMultiCollectOpen] = useState(false);
  const [multiItems, setMultiItems] = useState<{ fee_id: string; amount: string; discount: string; note: string; label: string }[]>([]);
  const [multiSubmitting, setMultiSubmitting] = useState(false);

  // Payment link
  const [linkFee, setLinkFee] = useState<Fee | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Delete fee
  const [feeToDelete, setFeeToDelete] = useState<Fee | null>(null);
  const [deleting, setDeleting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const fetchStudent = useCallback(async () => {
    if (!token || !studentId) return;
    try {
      const res = await apiRequest<{ success: boolean; data: Student }>(`/api/students/${studentId}`, { token });
      setStudent(res.data);
    } catch { setStudent(null); }
  }, [token, studentId]);

  const fetchFees = useCallback(async () => {
    if (!token || !studentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getFees({ student_id: studentId }, token);
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
  }, [token, studentId]);

  useEffect(() => { fetchStudent(); }, [fetchStudent]);
  useEffect(() => { fetchFees(); }, [fetchFees]);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ success: boolean; data: { feeCategories: string[] } }>('/api/settings/categories', { token })
      .then((r) => {
        if (r.success && r.data?.feeCategories?.length) {
          setFeeCategories(r.data.feeCategories);
          setAddCategory(r.data.feeCategories[0] || '');
        }
      }).catch(() => {});
    apiRequest<{ success: boolean; data: { logoUrl?: string; contact?: string; address?: string; nameBn?: string } }>(
      '/api/settings', { token }
    ).then((r) => { if (r.success) setSchoolSettings(r.data); }).catch(() => {});
  }, [token]);

  const totalPaid = fees.reduce((s, f) => s + (f.paid_amount || 0), 0);
  const totalExpected = fees.reduce((s, f) => s + (f.total_fee || 0), 0);

  // Build invoice student/school objects from state
  const invoiceStudent = () => ({
    name: student?.name || '—',
    class: student?.class,
    section: student?.section,
    rollNo: student?.rollNo,
    fatherName: (student as unknown as Record<string, string>)?.fatherName,
    guardianName: (student as unknown as Record<string, string>)?.guardianName,
    guardianPhone: (student as unknown as Record<string, string>)?.guardianPhone,
  });
  const invoiceSchool = () => ({
    name: school?.name,
    nameBn: schoolSettings?.nameBn,
    address: schoolSettings?.address,
    contact: schoolSettings?.contact,
    logoUrl: schoolSettings?.logoUrl,
  });

  // Print single receipt from details modal
  const handlePrintReceipt = useCallback((payment: FeePayment) => {
    if (!detailsFee) return;
    openInvoiceWindow({
      receiptNo: String(payment._id).slice(-8).toUpperCase(),
      paymentDate: payment.payment_date,
      amount: payment.amount,
      discount: payment.discount,
      note: payment.note,
      collectedBy: user?.name,
      fee: {
        category: feeCategoryLabel(detailsFee),
        month: detailsFee.month,
        description: detailsFee.description,
        total_fee: detailsFee.total_fee,
        paid_amount: detailsFee.paid_amount,
        due_amount: detailsFee.due_amount,
      },
      student: invoiceStudent(),
      school: invoiceSchool(),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsFee, student, school, schoolSettings, user]);

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
    navigator.clipboard.writeText(linkUrl).then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); });
  }

  const handleDeleteFee = async () => {
    if (!token || !feeToDelete) return;
    setDeleting(true);
    try {
      await deleteFee(feeToDelete._id, token);
      toast.success('Fee entry removed.');
      setFeeToDelete(null);
      fetchFees();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  // Single collect
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
      const res = await collectPayment(
        collectFee._id,
        { amount, discount: Number(collectDiscount) || 0, note: collectNote.trim() || undefined },
        token
      );
      toast.success('Payment collected.');
      closeCollectModal();
      // Print receipt immediately
      const payment = res.data?.feePayment;
      if (payment) {
        openInvoiceWindow({
          receiptNo: String(payment._id).slice(-8).toUpperCase(),
          paymentDate: payment.payment_date,
          amount: payment.amount,
          discount: payment.discount,
          note: payment.note,
          collectedBy: user?.name,
          fee: {
            category: feeCategoryLabel(collectFee),
            month: collectFee.month,
            description: collectFee.description,
            total_fee: collectFee.total_fee,
            paid_amount: (collectFee.paid_amount || 0) + amount,
            due_amount: Math.max(0, (collectFee.due_amount || 0) - amount),
          },
          student: invoiceStudent(),
          school: invoiceSchool(),
        });
      }
      fetchFees();
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

  // Add fee
  const handleAddFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !studentId || !addCategory) { toast.error('Select a category.'); return; }
    const amount = Number(addAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Enter a valid amount.'); return; }
    setAddSubmitting(true);
    try {
      await createAdditionalFee(
        { category: addCategory, description: addDescription.trim() || undefined, month: addMonth || undefined, amount, student_id: studentId, for_all_students: false },
        token
      );
      toast.success('Fee added.');
      setAddFeeOpen(false);
      setAddDescription('');
      setAddAmount('');
      fetchFees();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add fee');
    } finally { setAddSubmitting(false); }
  };

  // Checkbox selection
  const unpaidFees = fees.filter((f) => f.status !== 'paid' && f.due_amount > 0);
  const toggleSelect = (feeId: string) => {
    setSelectedFeeIds((prev) => {
      const next = new Set(prev);
      next.has(feeId) ? next.delete(feeId) : next.add(feeId);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedFeeIds.size === unpaidFees.length) {
      setSelectedFeeIds(new Set());
    } else {
      setSelectedFeeIds(new Set(unpaidFees.map((f) => f._id)));
    }
  };

  // Open multi-collect modal
  const openMultiCollect = () => {
    const selected = fees.filter((f) => selectedFeeIds.has(f._id));
    setMultiItems(selected.map((f) => ({
      fee_id: f._id,
      amount: String(f.due_amount || 0),
      discount: '',
      note: '',
      label: `${feeCategoryLabel(f)}${f.month ? ' — ' + f.month : ''}${f.description ? ' (' + f.description + ')' : ''} · Due: ৳${(f.due_amount || 0).toLocaleString()}`,
    })));
    setMultiCollectOpen(true);
  };

  const handleMultiCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const items = multiItems.map((item) => ({
      fee_id: item.fee_id,
      amount: Number(item.amount),
      discount: Number(item.discount) || 0,
      note: item.note.trim() || undefined,
    })).filter((item) => item.amount > 0);
    if (items.length === 0) { toast.error('Enter at least one valid amount.'); return; }
    setMultiSubmitting(true);
    try {
      const res = await collectMultiFees(items, token);
      toast.success(`Collected ${res.data.count} payment(s) · Total ৳${res.data.totalAmount.toLocaleString()}`);
      setMultiCollectOpen(false);
      setSelectedFeeIds(new Set());

      // Build multi-invoice
      const receiptNo = String(Date.now()).slice(-8).toUpperCase();
      openMultiInvoiceWindow({
        receiptNo,
        paymentDate: new Date().toISOString(),
        collectedBy: user?.name,
        items: res.data.results.map((r) => ({
          fee: {
            category: feeCategoryLabel(r.fee),
            month: r.fee.month,
            description: r.fee.description,
            total_fee: r.fee.total_fee,
            paid_amount: r.fee.paid_amount,
            due_amount: r.fee.due_amount,
          },
          payment: r.payment,
        })),
        student: invoiceStudent(),
        school: invoiceSchool(),
      });
      fetchFees();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to collect');
    } finally { setMultiSubmitting(false); }
  };

  const handlePrint = useCallback(() => {
    const printContent = printRef.current;
    if (!printContent) { window.print(); return; }
    const s = document.createElement('style');
    s.textContent = `@media print { body * { visibility: hidden; } #student-fee-print, #student-fee-print * { visibility: visible; } #student-fee-print { position: absolute; left: 0; top: 0; width: 100%; } }`;
    document.head.appendChild(s);
    window.print();
    document.head.removeChild(s);
  }, []);

  if (!studentId) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Invalid student.</p>
        <Link href="/dashboard/fees"><Button variant="outline">Back to Fees</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/fees">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Fee report{student ? ` — ${student.name}` : ''}</h1>
            <p className="text-sm text-muted-foreground">Collection and due summary for this student</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedFeeIds.size > 0 && (
            <Button
              onClick={openMultiCollect}
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Receipt className="h-4 w-4" />
              Collect Selected ({selectedFeeIds.size})
            </Button>
          )}
          <Button variant="outline" onClick={() => setAddFeeOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />Add fee
          </Button>
          <Link href="/dashboard/fees">
            <Button variant="outline">Back</Button>
          </Link>
        </div>
      </div>

      {student && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {student.class && `Class ${student.class}`}
              {student.section && ` • Section ${student.section}`}
              {student.rollNo && ` • Roll ${student.rollNo}`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground">Total expected</p>
          <p className="mt-2 text-2xl font-semibold">৳ {totalExpected.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground">Total collected</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">৳ {totalPaid.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground">Total due</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">৳ {summary.totalDue.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm font-medium text-muted-foreground">Unpaid / partial</p>
          <p className="mt-2 text-2xl font-semibold">{summary.unpaidCount}</p>
        </CardContent></Card>
      </div>

      {/* Bar chart */}
      {fees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Paid vs due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fees.slice(0, 12).map((fee) => {
                const total = fee.total_fee || 0;
                const paid = fee.paid_amount || 0;
                const pct = total > 0 ? (paid / total) * 100 : 0;
                const label = fee.month ? fee.month : feeCategoryLabel(fee);
                return (
                  <div key={fee._id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{label}</span>
                      <span>৳ {paid.toLocaleString()} / ৳ {total.toLocaleString()}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-select hint */}
      {unpaidFees.length > 1 && selectedFeeIds.size === 0 && (
        <p className="text-xs text-muted-foreground">
          Tip: Check multiple unpaid fees to collect and generate a single combined invoice.
        </p>
      )}

      {/* Fee list */}
      <Card id="student-fee-print" ref={printRef}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" />All fees</CardTitle>
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 print:hidden">
            <Printer className="h-4 w-4" />Print list
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 hidden print:block">
            <p className="text-lg font-semibold">Fee report — {student?.name ?? 'Student'}</p>
            <p className="text-sm text-muted-foreground">Printed on {new Date().toLocaleDateString()}</p>
          </div>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : fees.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No fee records for this student.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 print:hidden">
                      <button onClick={toggleSelectAll} className="text-muted-foreground hover:text-foreground transition-colors">
                        {selectedFeeIds.size === unpaidFees.length && unpaidFees.length > 0
                          ? <CheckSquare className="h-4 w-4" />
                          : <Square className="h-4 w-4" />}
                      </button>
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Amount (৳)</TableHead>
                    <TableHead className="text-right">Paid (৳)</TableHead>
                    <TableHead className="text-right">Due (৳)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right print:hidden">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => {
                    const isUnpaid = fee.status !== 'paid' && fee.due_amount > 0;
                    const isSelected = selectedFeeIds.has(fee._id);
                    return (
                      <TableRow key={fee._id} className={isSelected ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}>
                        <TableCell className="print:hidden">
                          {isUnpaid ? (
                            <button onClick={() => toggleSelect(fee._id)} className="text-muted-foreground hover:text-foreground transition-colors">
                              {isSelected ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4" />}
                            </button>
                          ) : <span className="w-4 inline-block" />}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {fee.createdAt ? new Date(fee.createdAt).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="capitalize">{feeCategoryLabel(fee)}</TableCell>
                        <TableCell className="max-w-[140px] truncate" title={fee.description || ''}>{fee.description || '—'}</TableCell>
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
                        <TableCell className="text-right flex gap-1 justify-end print:hidden">
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => openDetailsModal(fee)}>
                            <Eye className="h-4 w-4 mr-1" />View
                          </Button>
                          {isUnpaid && (
                            <>
                              <Button
                                size="sm" variant="outline"
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400"
                                onClick={() => openCollectModal(fee)}
                              >
                                Collect
                              </Button>
                              <Button
                                size="sm" variant="ghost"
                                className="h-8 text-pink-600 hover:text-pink-700 hover:bg-pink-50 dark:text-pink-400"
                                onClick={() => openPaymentLink(fee)}
                                title="bKash payment link"
                              >
                                <Link2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm" variant="ghost"
                            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setFeeToDelete(fee)}
                            title="Delete fee"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Single Collect modal */}
      <Dialog open={!!collectFee} onOpenChange={(open) => !open && closeCollectModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Collect payment</DialogTitle></DialogHeader>
          {collectFee && (
            <form onSubmit={handleCollectSubmit} className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <p><span className="font-medium">Category:</span> {feeCategoryLabel(collectFee)}</p>
                {collectFee.month && <p><span className="font-medium">Month:</span> {collectFee.month}</p>}
                <p><span className="font-medium">Due amount:</span> ৳ {(collectFee.due_amount || 0).toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <Label>Amount to collect (৳)</Label>
                <Input type="number" min="1" value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Discount (৳, optional)</Label>
                <Input type="number" min="0" value={collectDiscount} onChange={(e) => setCollectDiscount(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Input value={collectNote} onChange={(e) => setCollectNote(e.target.value)} placeholder="e.g. Cash received" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeCollectModal} disabled={collectPaying}>Cancel</Button>
                <Button type="submit" disabled={collectPaying} className="bg-emerald-600 hover:bg-emerald-700">
                  {collectPaying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Collect &amp; Print
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Multi-collect modal */}
      <Dialog open={multiCollectOpen} onOpenChange={(open) => !open && setMultiCollectOpen(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Collect {multiItems.length} fees — Combined Invoice
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleMultiCollectSubmit} className="space-y-4">
            <p className="text-xs text-muted-foreground">Review amounts below. On submit, all fees are collected and a single combined invoice is generated.</p>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {multiItems.map((item, idx) => (
                <div key={item.fee_id} className="rounded-lg border bg-muted/20 p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Amount (৳)</Label>
                      <Input
                        type="number" min="1" value={item.amount}
                        onChange={(e) => setMultiItems((prev) => prev.map((mi, i) => i === idx ? { ...mi, amount: e.target.value } : mi))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Discount (৳)</Label>
                      <Input
                        type="number" min="0" value={item.discount} placeholder="0"
                        onChange={(e) => setMultiItems((prev) => prev.map((mi, i) => i === idx ? { ...mi, discount: e.target.value } : mi))}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Note</Label>
                      <Input
                        value={item.note} placeholder="optional"
                        onChange={(e) => setMultiItems((prev) => prev.map((mi, i) => i === idx ? { ...mi, note: e.target.value } : mi))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-sm flex justify-between">
              <span className="font-medium">Total to collect</span>
              <span className="font-bold">
                ৳ {multiItems.reduce((s, i) => s + (Number(i.amount) || 0), 0).toLocaleString()}
              </span>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMultiCollectOpen(false)} disabled={multiSubmitting}>Cancel</Button>
              <Button type="submit" disabled={multiSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
                {multiSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Collect All &amp; Print Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details modal — with print button */}
      <Dialog open={!!detailsFee} onOpenChange={(open) => !open && closeDetailsModal()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Fee details &amp; payment history</DialogTitle></DialogHeader>
          {detailsFee && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
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
                  <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : detailsPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Amount (৳)</TableHead>
                          <TableHead className="text-right">Discount</TableHead>
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
                            <TableCell className="max-w-[120px] truncate text-muted-foreground">{p.note || '—'}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm" variant="ghost" className="h-7 px-2"
                                onClick={() => handlePrintReceipt(p)}
                                title="Print money receipt"
                              >
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

      {/* Add fee modal */}
      <Dialog open={addFeeOpen} onOpenChange={setAddFeeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add fee for this student</DialogTitle></DialogHeader>
          <form onSubmit={handleAddFeeSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <select value={addCategory} onChange={(e) => setAddCategory(e.target.value)} className={selectCls}>
                <option value="">Select category</option>
                {feeCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input value={addDescription} onChange={(e) => setAddDescription(e.target.value)} placeholder="e.g. March Exam Fee" />
            </div>
            <div className="space-y-2">
              <Label>Month (optional)</Label>
              <Input type="month" value={addMonth} onChange={(e) => setAddMonth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Amount (৳)</Label>
              <Input type="number" min="1" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} placeholder="e.g. 500" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddFeeOpen(false)} disabled={addSubmitting}>Cancel</Button>
              <Button type="submit" disabled={addSubmitting}>
                {addSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add fee
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete fee confirmation */}
      <Dialog open={!!feeToDelete} onOpenChange={(open) => !open && setFeeToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Remove fee entry?</DialogTitle></DialogHeader>
          {feeToDelete && (
            <>
              <p className="text-sm text-muted-foreground">
                Permanently removes <strong>{feeCategoryLabel(feeToDelete)}</strong>
                {feeToDelete.month ? ` (${feeToDelete.month})` : ''} — ৳{(feeToDelete.total_fee || 0).toLocaleString()}.
                Payment history and related income records will also be removed.
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
                Pay <strong>৳{linkFee.due_amount.toLocaleString()}</strong> via bKash — no login required.
              </p>
              {linkLoading ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : linkUrl ? (
                <>
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                    <p className="flex-1 text-xs font-mono truncate">{linkUrl}</p>
                    <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2" onClick={copyLink}>
                      {linkCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <Button className="w-full bg-[#E2136E] hover:bg-[#c0125e] text-white" onClick={copyLink}>
                    {linkCopied ? <><Check className="h-4 w-4 mr-2" />Copied!</> : <><Copy className="h-4 w-4 mr-2" />Copy Link</>}
                  </Button>
                </>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
