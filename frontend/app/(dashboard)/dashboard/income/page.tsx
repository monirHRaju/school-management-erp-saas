'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
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
  const { token } = useAuth();
  const [data, setData] = useState<IncomeType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'' | FeeCategory>('');
  const [page, setPage] = useState(1);
  const limit = 20;

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Income</h1>
        <p className="mt-1 text-muted-foreground">
          Income records from fee collections. Use for financial reports.
        </p>
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
              <div className="overflow-x-auto rounded-md border">
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
