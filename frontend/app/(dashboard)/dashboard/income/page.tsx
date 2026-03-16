'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, Printer, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { getIncome } from '@/lib/fees';
import type { Income as IncomeType, FeeCategory } from '@/types/fee';
import { FEE_CATEGORIES } from '@/types/fee';
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
import { cn } from '@/lib/utils';

function categoryLabel(cat: string) {
  return FEE_CATEGORIES.find((c) => c.value === cat)?.label ?? cat;
}

export default function IncomePage() {
  const { token, school } = useAuth();
  const [data, setData] = useState<IncomeType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'' | FeeCategory>('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const limit = 20;
  const printRef = useRef<HTMLDivElement>(null);

  const fetchIncome = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getIncome(
        {
          from: from || undefined,
          to: to || undefined,
          category: categoryFilter || undefined,
          page,
          limit,
        },
        token
      );
      setData(res.data || []);
      setTotal(res.total ?? 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load income';
      setError(msg);
      toast.error(msg);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, from, to, categoryFilter, page]);

  useEffect(() => {
    fetchIncome();
  }, [fetchIncome]);

  const totalAmount = data.reduce((s, i) => s + (i.amount || 0), 0);

  // Fetch ALL records for export (no pagination limit)
  const fetchAllForExport = async (): Promise<IncomeType[]> => {
    if (!token) return [];
    const res = await getIncome(
      {
        from: from || undefined,
        to: to || undefined,
        category: categoryFilter || undefined,
        page: 1,
        limit: 1000,
      },
      token
    );
    return res.data || [];
  };

  // Build category breakdown from records
  const buildCategoryBreakdown = (records: IncomeType[]) => {
    const map: Record<string, number> = {};
    for (const r of records) {
      map[r.category] = (map[r.category] || 0) + (r.amount || 0);
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  };

  const handlePrint = async () => {
    setExporting(true);
    try {
      const allRecords = await fetchAllForExport();
      const breakdown = buildCategoryBreakdown(allRecords);
      const grandTotal = allRecords.reduce((s, r) => s + (r.amount || 0), 0);

      const printWindow = window.open('', '', 'height=1200,width=900');
      if (!printWindow) {
        toast.error('Popup blocked. Please allow popups and try again.');
        return;
      }

      const dateRange =
        from || to
          ? `${from ? new Date(from).toLocaleDateString() : 'Start'} – ${to ? new Date(to).toLocaleDateString() : 'Today'}`
          : 'All dates';
      const catLabel = categoryFilter ? categoryLabel(categoryFilter) : 'All categories';

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Income Statement</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px; }
            h1 { font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 4px; }
            h2 { font-size: 15px; font-weight: normal; text-align: center; color: #555; margin-bottom: 16px; }
            .meta { display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
            .summary { display: flex; gap: 24px; margin-bottom: 20px; }
            .summary-card { border: 1px solid #ddd; border-radius: 6px; padding: 10px 16px; flex: 1; }
            .summary-card .label { font-size: 11px; color: #888; margin-bottom: 4px; }
            .summary-card .value { font-size: 18px; font-weight: bold; }
            .breakdown { margin-bottom: 20px; }
            .breakdown h3 { font-size: 13px; font-weight: bold; margin-bottom: 8px; }
            .breakdown table { width: 100%; border-collapse: collapse; }
            .breakdown td { padding: 5px 8px; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
            .breakdown td:last-child { text-align: right; font-weight: 500; }
            table.main { width: 100%; border-collapse: collapse; }
            table.main th { background: #f5f5f5; text-align: left; padding: 7px 8px; font-size: 12px; border-bottom: 2px solid #ddd; }
            table.main td { padding: 6px 8px; font-size: 12px; border-bottom: 1px solid #eee; }
            table.main td.right { text-align: right; font-weight: 500; }
            tfoot td { font-weight: bold; border-top: 2px solid #333; padding: 8px; font-size: 13px; }
            tfoot td.right { text-align: right; }
            .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #999; }
          </style>
        </head>
        <body>
          <h1>${school?.name ?? 'School'}</h1>
          <h2>Income Statement</h2>
          <div class="meta">
            <span>Period: ${dateRange}</span>
            <span>Category: ${catLabel}</span>
            <span>Generated: ${new Date().toLocaleString()}</span>
          </div>
          <div class="summary">
            <div class="summary-card">
              <div class="label">Total Income</div>
              <div class="value">&#2547; ${grandTotal.toLocaleString()}</div>
            </div>
            <div class="summary-card">
              <div class="label">Total Records</div>
              <div class="value">${allRecords.length}</div>
            </div>
          </div>
          ${
            breakdown.length > 1
              ? `<div class="breakdown">
            <h3>Breakdown by Category</h3>
            <table>
              ${breakdown.map(([cat, amt]) => `<tr><td>${categoryLabel(cat)}</td><td>&#2547; ${amt.toLocaleString()}</td></tr>`).join('')}
            </table>
          </div>`
              : ''
          }
          <table class="main">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Category</th>
                <th>Student</th>
                <th>Recorded By</th>
                <th>Amount (&#2547;)</th>
              </tr>
            </thead>
            <tbody>
              ${allRecords
                .map(
                  (r, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                  <td>${categoryLabel(r.category)}</td>
                  <td>${typeof r.student_id === 'object' && r.student_id?.name ? r.student_id.name : '—'}</td>
                  <td>${typeof r.created_by === 'object' && r.created_by?.name ? r.created_by.name : '—'}</td>
                  <td class="right">${(r.amount || 0).toLocaleString()}</td>
                </tr>`
                )
                .join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="5">Total</td>
                <td class="right">&#2547; ${grandTotal.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
          <div class="footer">Printed from ${school?.name ?? 'School'} Management System</div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 400);
    } catch {
      toast.error('Failed to prepare print. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setExporting(true);
    const toastId = toast.loading('Generating PDF…');
    try {
      const allRecords = await fetchAllForExport();
      const breakdown = buildCategoryBreakdown(allRecords);
      const grandTotal = allRecords.reduce((s, r) => s + (r.amount || 0), 0);

      const dateRange =
        from || to
          ? `${from ? new Date(from).toLocaleDateString() : 'Start'} – ${to ? new Date(to).toLocaleDateString() : 'Today'}`
          : 'All dates';
      const catLabel = categoryFilter ? categoryLabel(categoryFilter) : 'All categories';

      // Build an off-screen div for rendering
      const container = document.createElement('div');
      container.style.cssText =
        'position:fixed;top:-9999px;left:-9999px;width:794px;background:#fff;padding:40px;font-family:Arial,sans-serif;font-size:13px;color:#111;';

      container.innerHTML = `
        <h1 style="font-size:20px;font-weight:bold;text-align:center;margin-bottom:4px;">${school?.name ?? 'School'}</h1>
        <h2 style="font-size:15px;font-weight:normal;text-align:center;color:#555;margin-bottom:16px;">Income Statement</h2>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:#666;margin-bottom:20px;border-bottom:1px solid #ccc;padding-bottom:10px;">
          <span>Period: ${dateRange}</span>
          <span>Category: ${catLabel}</span>
          <span>Generated: ${new Date().toLocaleDateString()}</span>
        </div>
        <div style="display:flex;gap:16px;margin-bottom:20px;">
          <div style="border:1px solid #ddd;border-radius:6px;padding:10px 16px;flex:1;">
            <div style="font-size:11px;color:#888;margin-bottom:4px;">Total Income</div>
            <div style="font-size:18px;font-weight:bold;">৳ ${grandTotal.toLocaleString()}</div>
          </div>
          <div style="border:1px solid #ddd;border-radius:6px;padding:10px 16px;flex:1;">
            <div style="font-size:11px;color:#888;margin-bottom:4px;">Total Records</div>
            <div style="font-size:18px;font-weight:bold;">${allRecords.length}</div>
          </div>
        </div>
        ${
          breakdown.length > 1
            ? `<div style="margin-bottom:16px;">
          <div style="font-size:13px;font-weight:bold;margin-bottom:8px;">Breakdown by Category</div>
          <table style="width:100%;border-collapse:collapse;">
            ${breakdown.map(([cat, amt]) => `<tr><td style="padding:4px 8px;font-size:12px;border-bottom:1px solid #f0f0f0;">${categoryLabel(cat)}</td><td style="padding:4px 8px;text-align:right;font-size:12px;font-weight:500;">৳ ${amt.toLocaleString()}</td></tr>`).join('')}
          </table>
        </div>`
            : ''
        }
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="text-align:left;padding:7px 8px;font-size:12px;border-bottom:2px solid #ddd;">#</th>
              <th style="text-align:left;padding:7px 8px;font-size:12px;border-bottom:2px solid #ddd;">Date</th>
              <th style="text-align:left;padding:7px 8px;font-size:12px;border-bottom:2px solid #ddd;">Category</th>
              <th style="text-align:left;padding:7px 8px;font-size:12px;border-bottom:2px solid #ddd;">Student</th>
              <th style="text-align:left;padding:7px 8px;font-size:12px;border-bottom:2px solid #ddd;">Recorded By</th>
              <th style="text-align:right;padding:7px 8px;font-size:12px;border-bottom:2px solid #ddd;">Amount (৳)</th>
            </tr>
          </thead>
          <tbody>
            ${allRecords
              .map(
                (r, i) => `
              <tr>
                <td style="padding:5px 8px;font-size:12px;border-bottom:1px solid #eee;">${i + 1}</td>
                <td style="padding:5px 8px;font-size:12px;border-bottom:1px solid #eee;">${r.date ? new Date(r.date).toLocaleDateString() : '—'}</td>
                <td style="padding:5px 8px;font-size:12px;border-bottom:1px solid #eee;">${categoryLabel(r.category)}</td>
                <td style="padding:5px 8px;font-size:12px;border-bottom:1px solid #eee;">${typeof r.student_id === 'object' && r.student_id?.name ? r.student_id.name : '—'}</td>
                <td style="padding:5px 8px;font-size:12px;border-bottom:1px solid #eee;">${typeof r.created_by === 'object' && r.created_by?.name ? r.created_by.name : '—'}</td>
                <td style="padding:5px 8px;font-size:12px;border-bottom:1px solid #eee;text-align:right;font-weight:500;">${(r.amount || 0).toLocaleString()}</td>
              </tr>`
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="5" style="padding:8px;font-weight:bold;border-top:2px solid #333;font-size:13px;">Total</td>
              <td style="padding:8px;font-weight:bold;border-top:2px solid #333;text-align:right;font-size:13px;">৳ ${grandTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        <div style="margin-top:24px;text-align:center;font-size:11px;color:#999;">
          Generated from ${school?.name ?? 'School'} Management System · ${new Date().toLocaleString()}
        </div>
      `;

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

      const fileName = `income-statement-${from || 'all'}-to-${to || 'today'}.pdf`;
      pdf.save(fileName);
      toast.success('PDF downloaded!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF. Please try again.', { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Income</h1>
          <p className="mt-1 text-muted-foreground">
            Income records from fee collections. Use for financial reports.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-2 h-4 w-4" />
            )}
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="income-from">From date</Label>
              <Input
                id="income-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="income-to">To date</Label>
              <Input
                id="income-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="income-category">Category</Label>
              <select
                id="income-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as '' | FeeCategory)}
                className={cn(
                  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                <option value="">All</option>
                {FEE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => setPage(1)} variant="secondary">
                Apply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Income records</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total in list: ৳ {totalAmount.toLocaleString()} · {total} record(s)
          </p>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No income records match the filters. Collect fee payments to see income here.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border" ref={printRef}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-right">Amount (৳)</TableHead>
                      <TableHead>Recorded by</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row) => (
                      <TableRow key={row._id}>
                        <TableCell className="text-xs">
                          {row.date ? new Date(row.date).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell>{categoryLabel(row.category)}</TableCell>
                        <TableCell>
                          {typeof row.student_id === 'object' && row.student_id?.name
                            ? row.student_id.name
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium">{row.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {typeof row.created_by === 'object' && row.created_by?.name
                            ? row.created_by.name
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {total > limit && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {Math.ceil(total / limit)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= Math.ceil(total / limit)}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
