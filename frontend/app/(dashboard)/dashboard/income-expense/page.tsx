'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Download,
  FileText,
  Loader2,
  Printer,
  PlusCircle,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import {
  getLedger,
  createExpense,
  deleteExpense,
  createManualIncome,
  deleteManualIncome,
} from '@/lib/transactions';
import type {
  LedgerRow,
  ExpenseCategory,
  CreateExpensePayload,
  ManualIncomeCategory,
  CreateManualIncomePayload,
} from '@/types/fee';
import { EXPENSE_CATEGORIES, MANUAL_INCOME_CATEGORIES } from '@/types/fee';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Pagination } from '@/components/ui/pagination';

interface LedgerRowWithBalance extends LedgerRow {
  sl: number;
  balance: number;
}

const today = () => new Date().toISOString().split('T')[0];

const emptyExpenseForm = (): CreateExpensePayload => ({
  date: today(),
  title: '',
  category: 'Other',
  amount: 0,
  note: '',
});

const emptyIncomeForm = (): CreateManualIncomePayload => ({
  date: today(),
  title: '',
  category: 'Other',
  amount: 0,
  note: '',
});

export default function IncomeExpensePage() {
  const { token, school } = useAuth();
  const [rows, setRows] = useState<LedgerRowWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Expense modal
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState<CreateExpensePayload>(emptyExpenseForm());
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);

  // Income modal
  const [incomeModalOpen, setIncomeModalOpen] = useState(false);
  const [incomeForm, setIncomeForm] = useState<CreateManualIncomePayload>(emptyIncomeForm());
  const [incomeSubmitting, setIncomeSubmitting] = useState(false);

  // Delete confirmation — track both the id and whether it's income or expense
  const [pendingDelete, setPendingDelete] = useState<{ id: string; source: 'manual_income' | 'expense' } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Export
  const [exporting, setExporting] = useState(false);

  const fetchLedger = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getLedger({ from: from || undefined, to: to || undefined }, token);
      const data = res.data || [];
      let balance = 0;
      const withBalance: LedgerRowWithBalance[] = data.map((row, i) => {
        balance = row.type === 'income' ? balance + row.amount : balance - row.amount;
        return { ...row, sl: i + 1, balance };
      });
      setRows(withBalance);
      setPage(1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load ledger';
      setError(msg);
      toast.error(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, from, to]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  const totalIncome = rows.reduce((s, r) => (r.type === 'income' ? s + r.amount : s), 0);
  const totalExpense = rows.reduce((s, r) => (r.type === 'expense' ? s + r.amount : s), 0);
  const netBalance = totalIncome - totalExpense;
  const totalPages = Math.ceil(rows.length / PAGE_SIZE);
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Add Expense ──────────────────────────────────────────────────────────
  const handleExpenseFormChange = (field: keyof CreateExpensePayload, value: string | number) =>
    setExpenseForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmitExpense = async () => {
    if (!token) return;
    if (!expenseForm.title.trim()) { toast.error('Title is required'); return; }
    if (!expenseForm.date) { toast.error('Date is required'); return; }
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) { toast.error('Amount must be greater than 0'); return; }
    setExpenseSubmitting(true);
    try {
      await createExpense({ ...expenseForm, amount: Number(expenseForm.amount) }, token);
      toast.success('Expense added');
      setExpenseModalOpen(false);
      setExpenseForm(emptyExpenseForm());
      fetchLedger();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add expense');
    } finally {
      setExpenseSubmitting(false);
    }
  };

  // ── Add Income ───────────────────────────────────────────────────────────
  const handleIncomeFormChange = (field: keyof CreateManualIncomePayload, value: string | number) =>
    setIncomeForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmitIncome = async () => {
    if (!token) return;
    if (!incomeForm.title.trim()) { toast.error('Title is required'); return; }
    if (!incomeForm.date) { toast.error('Date is required'); return; }
    if (!incomeForm.amount || Number(incomeForm.amount) <= 0) { toast.error('Amount must be greater than 0'); return; }
    setIncomeSubmitting(true);
    try {
      await createManualIncome({ ...incomeForm, amount: Number(incomeForm.amount) }, token);
      toast.success('Income added');
      setIncomeModalOpen(false);
      setIncomeForm(emptyIncomeForm());
      fetchLedger();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add income');
    } finally {
      setIncomeSubmitting(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!token || !pendingDelete) return;
    const { id, source } = pendingDelete;
    setDeletingId(id);
    setPendingDelete(null);
    try {
      if (source === 'manual_income') {
        await deleteManualIncome(id, token);
        toast.success('Income deleted');
      } else {
        await deleteExpense(id, token);
        toast.success('Expense deleted');
      }
      fetchLedger();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Export helpers ───────────────────────────────────────────────────────
  const dateRangeLabel =
    from || to
      ? `${from ? new Date(from).toLocaleDateString() : 'Start'} – ${to ? new Date(to).toLocaleDateString() : 'Today'}`
      : 'All dates';

  const schoolName = school?.name ?? 'School';

  const buildTableHtml = () => `
    <table style="width:100%;border-collapse:collapse;font-size:12px;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #ddd;">#</th>
          <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #ddd;">Date</th>
          <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #ddd;">Title</th>
          <th style="padding:6px 8px;text-align:left;border-bottom:2px solid #ddd;">Category</th>
          <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #ddd;color:#16a34a;">Income (৳)</th>
          <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #ddd;color:#dc2626;">Expense (৳)</th>
          <th style="padding:6px 8px;text-align:right;border-bottom:2px solid #ddd;">Balance (৳)</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((r) => `
          <tr style="background:${r.type === 'expense' ? '#fff5f5' : '#fff'};">
            <td style="padding:5px 8px;border-bottom:1px solid #eee;">${r.sl}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #eee;white-space:nowrap;">${new Date(r.date).toLocaleDateString()}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #eee;">${r.title}${r.note ? ` <span style="color:#888;font-size:11px;">(${r.note})</span>` : ''}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #eee;color:#555;">${r.category}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;color:#16a34a;font-weight:500;">${r.type === 'income' ? r.amount.toLocaleString() : ''}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;color:#dc2626;font-weight:500;">${r.type === 'expense' ? r.amount.toLocaleString() : ''}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:${r.balance >= 0 ? '#2563eb' : '#ea580c'};">${r.balance.toLocaleString()}</td>
          </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="padding:8px;font-weight:bold;border-top:2px solid #333;font-size:13px;">Total</td>
          <td style="padding:8px;text-align:right;font-weight:bold;border-top:2px solid #333;color:#16a34a;">৳ ${totalIncome.toLocaleString()}</td>
          <td style="padding:8px;text-align:right;font-weight:bold;border-top:2px solid #333;color:#dc2626;">৳ ${totalExpense.toLocaleString()}</td>
          <td style="padding:8px;text-align:right;font-weight:bold;border-top:2px solid #333;color:${netBalance >= 0 ? '#2563eb' : '#ea580c'};">৳ ${netBalance.toLocaleString()}</td>
        </tr>
      </tfoot>
    </table>`;

  const buildDocumentHeader = () => `
    <h1 style="font-size:20px;font-weight:bold;text-align:center;margin-bottom:4px;">${schoolName}</h1>
    <h2 style="font-size:15px;font-weight:normal;text-align:center;color:#555;margin-bottom:12px;">Income / Expense Ledger</h2>
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#666;margin-bottom:16px;border-bottom:1px solid #ccc;padding-bottom:10px;">
      <span>Period: ${dateRangeLabel}</span>
      <span>Generated: ${new Date().toLocaleDateString()}</span>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:16px;">
      <div style="border:1px solid #ddd;border-radius:6px;padding:8px 14px;flex:1;">
        <div style="font-size:10px;color:#888;margin-bottom:3px;">Total Income</div>
        <div style="font-size:16px;font-weight:bold;color:#16a34a;">৳ ${totalIncome.toLocaleString()}</div>
      </div>
      <div style="border:1px solid #ddd;border-radius:6px;padding:8px 14px;flex:1;">
        <div style="font-size:10px;color:#888;margin-bottom:3px;">Total Expense</div>
        <div style="font-size:16px;font-weight:bold;color:#dc2626;">৳ ${totalExpense.toLocaleString()}</div>
      </div>
      <div style="border:1px solid #ddd;border-radius:6px;padding:8px 14px;flex:1;">
        <div style="font-size:10px;color:#888;margin-bottom:3px;">Net Balance</div>
        <div style="font-size:16px;font-weight:bold;color:${netBalance >= 0 ? '#2563eb' : '#ea580c'};">৳ ${netBalance.toLocaleString()}</div>
      </div>
    </div>`;

  const handlePrint = () => {
    if (rows.length === 0) { toast.error('No data to print'); return; }
    const win = window.open('', '', 'height=1200,width=900');
    if (!win) { toast.error('Popup blocked — allow popups and try again.'); return; }
    win.document.open();
    win.document.write(`<!DOCTYPE html><html><head><title>Income / Expense Ledger</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,sans-serif;padding:32px;color:#111;}</style>
      </head><body>${buildDocumentHeader()}${buildTableHtml()}
      <div style="margin-top:20px;text-align:center;font-size:11px;color:#999;">Printed from ${schoolName} Management System</div>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const handleExportPdf = async () => {
    if (rows.length === 0) { toast.error('No data to export'); return; }
    setExporting(true);
    const toastId = toast.loading('Generating PDF…');
    try {
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:794px;background:#fff;padding:40px;font-family:Arial,sans-serif;font-size:13px;color:#111;';
      container.innerHTML = buildDocumentHeader() + buildTableHtml() +
        `<div style="margin-top:20px;text-align:center;font-size:11px;color:#999;">Generated from ${schoolName} Management System · ${new Date().toLocaleString()}</div>`;
      document.body.appendChild(container);

      const html2canvasMod = await import('html2canvas');
      const jspdfMod = await import('jspdf');
      const html2canvas = (html2canvasMod as any).default || (html2canvasMod as any);
      const jsPDFCtor = (jspdfMod as any).jsPDF || (jspdfMod as any).default;

      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(container);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDFCtor({ unit: 'mm', format: 'a4' });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pdfW) / canvas.width;

      let yOffset = 0;
      let remaining = imgH;
      let firstPage = true;
      while (remaining > 0) {
        if (!firstPage) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, imgH);
        yOffset += pdfH;
        remaining -= pdfH;
        firstPage = false;
      }

      const fileSuffix = from && to ? `${from}-to-${to}` : from ? `from-${from}` : to ? `to-${to}` : 'all';
      pdf.save(`income-expense-${fileSuffix}.pdf`);
      toast.success('PDF downloaded!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF.', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const handleExportCsv = () => {
    if (rows.length === 0) { toast.error('No data to export'); return; }
    const header = ['SL', 'Date', 'Title', 'Category', 'Type', 'Income (BDT)', 'Expense (BDT)', 'Balance (BDT)'];
    const csvRows = rows.map((r) => [
      r.sl,
      new Date(r.date).toLocaleDateString(),
      `"${r.title.replace(/"/g, '""')}"`,
      `"${r.category.replace(/"/g, '""')}"`,
      r.type,
      r.type === 'income' ? r.amount : '',
      r.type === 'expense' ? r.amount : '',
      r.balance,
    ]);
    const totalsRow = ['', '', 'TOTAL', '', '', totalIncome, totalExpense, netBalance];
    const csvContent = [header, ...csvRows, [], totalsRow].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileSuffix = from && to ? `${from}-to-${to}` : from ? `from-${from}` : to ? `to-${to}` : 'all';
    link.download = `income-expense-${fileSuffix}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded!');
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Income / Expense</h1>
          <p className="mt-1 text-muted-foreground">
            Combined ledger of all income and expenses with running balance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={exporting}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exporting}>
            <FileText className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting}>
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => { setIncomeForm(emptyIncomeForm()); setIncomeModalOpen(true); }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Income
          </Button>
          <Button onClick={() => { setExpenseForm(emptyExpenseForm()); setExpenseModalOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="le-from">From date</Label>
              <Input id="le-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="le-to">To date</Label>
              <Input id="le-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <Button variant="secondary" onClick={fetchLedger}>Apply</Button>
            {(from || to) && (
              <Button variant="ghost" onClick={() => { setFrom(''); setTo(''); }}>Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2 dark:bg-green-900/30">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Income</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">৳ {totalIncome.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-2 dark:bg-red-900/30">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Expense</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">৳ {totalExpense.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-full p-2', netBalance >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30')}>
                <Wallet className={cn('h-5 w-5', netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400')} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Balance</p>
                <p className={cn('text-xl font-bold', netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400')}>
                  ৳ {netBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No records found. Collect fee payments or add income / expenses to get started.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">SL</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Income / Expense Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right text-green-600">Income (৳)</TableHead>
                    <TableHead className="text-right text-red-600">Expense (৳)</TableHead>
                    <TableHead className="text-right">Balance (৳)</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedRows.map((row) => (
                    <TableRow
                      key={row._id}
                      className={row.type === 'expense' ? 'bg-red-50/40 dark:bg-red-950/10' : ''}
                    >
                      <TableCell className="text-center text-xs text-muted-foreground">{row.sl}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(row.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{row.title}</span>
                        {row.note && (
                          <span className="ml-2 text-xs text-muted-foreground">({row.note})</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.category}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {row.type === 'income' ? row.amount.toLocaleString() : ''}
                      </TableCell>
                      <TableCell className="text-right font-medium text-red-600">
                        {row.type === 'expense' ? row.amount.toLocaleString() : ''}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-semibold',
                          row.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
                        )}
                      >
                        {row.balance.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {(row.source === 'expense' || row.source === 'manual_income') && (
                          <button
                            onClick={() => setPendingDelete({ id: row._id, source: row.source as 'expense' | 'manual_income' })}
                            disabled={deletingId === row._id}
                            className="text-muted-foreground hover:text-destructive disabled:opacity-40 transition-colors"
                            title={row.source === 'expense' ? 'Delete expense' : 'Delete income'}
                          >
                            {deletingId === row._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
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
            total={rows.length}
            limit={PAGE_SIZE}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {pendingDelete?.source === 'manual_income' ? 'Income' : 'Expense'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {pendingDelete?.source === 'manual_income' ? 'income' : 'expense'} entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Income Modal */}
      <Dialog open={incomeModalOpen} onOpenChange={setIncomeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Income</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="inc-date">Date</Label>
              <Input
                id="inc-date"
                type="date"
                value={incomeForm.date}
                onChange={(e) => handleIncomeFormChange('date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inc-title">Title</Label>
              <Input
                id="inc-title"
                type="text"
                placeholder="e.g. Land Sale"
                value={incomeForm.title}
                onChange={(e) => handleIncomeFormChange('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inc-category">Category</Label>
              <select
                id="inc-category"
                value={incomeForm.category}
                onChange={(e) => handleIncomeFormChange('category', e.target.value as ManualIncomeCategory)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                {MANUAL_INCOME_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inc-amount">Amount (৳)</Label>
              <Input
                id="inc-amount"
                type="number"
                min={1}
                placeholder="0"
                value={incomeForm.amount || ''}
                onChange={(e) => handleIncomeFormChange('amount', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inc-note">
                Note <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="inc-note"
                type="text"
                placeholder="Any additional details"
                value={incomeForm.note || ''}
                onChange={(e) => handleIncomeFormChange('note', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncomeModalOpen(false)} disabled={incomeSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitIncome} disabled={incomeSubmitting}>
              {incomeSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Income
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Expense Modal */}
      <Dialog open={expenseModalOpen} onOpenChange={setExpenseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="exp-date">Date</Label>
              <Input
                id="exp-date"
                type="date"
                value={expenseForm.date}
                onChange={(e) => handleExpenseFormChange('date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-title">Title</Label>
              <Input
                id="exp-title"
                type="text"
                placeholder="e.g. Electricity Bill"
                value={expenseForm.title}
                onChange={(e) => handleExpenseFormChange('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-category">Category</Label>
              <select
                id="exp-category"
                value={expenseForm.category}
                onChange={(e) => handleExpenseFormChange('category', e.target.value as ExpenseCategory)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-amount">Amount (৳)</Label>
              <Input
                id="exp-amount"
                type="number"
                min={1}
                placeholder="0"
                value={expenseForm.amount || ''}
                onChange={(e) => handleExpenseFormChange('amount', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-note">
                Note <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="exp-note"
                type="text"
                placeholder="Any additional details"
                value={expenseForm.note || ''}
                onChange={(e) => handleExpenseFormChange('note', e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseModalOpen(false)} disabled={expenseSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitExpense} disabled={expenseSubmitting}>
              {expenseSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
