'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, CreditCard, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { getFees } from '@/lib/fees';
import { apiRequest } from '@/lib/api';
import type { Fee, FeeSummary } from '@/types/fee';
import type { Student } from '@/types/student';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const FEE_TYPE_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  admission: 'Admission',
  exam: 'Exam',
  book: 'Book',
  other: 'Other',
};

export default function StudentFeeReportPage() {
  const params = useParams();
  const studentId = typeof params.id === 'string' ? params.id : '';
  const { token } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [summary, setSummary] = useState<FeeSummary>({ totalDue: 0, unpaidCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudent = useCallback(async () => {
    if (!token || !studentId) return;
    try {
      const res = await apiRequest<{ success: boolean; data: Student }>(
        `/api/students/${studentId}`,
        { token }
      );
      setStudent(res.data);
    } catch {
      setStudent(null);
    }
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

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  const totalPaid = fees.reduce((s, f) => s + (f.paid_amount || 0), 0);
  const totalExpected = fees.reduce((s, f) => s + (f.total_fee || 0), 0);

  if (!studentId) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Invalid student.</p>
        <Link href="/dashboard/fees">
          <Button variant="outline">Back to Fees</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/fees">
            <Button variant="ghost" size="icon" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Fee report {student ? `— ${student.name}` : ''}
            </h1>
            <p className="text-sm text-muted-foreground">
              Collection and due summary for this student
            </p>
          </div>
        </div>
        <Link href="/dashboard/fees">
          <Button variant="outline">Back to Fees</Button>
        </Link>
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
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Total expected</p>
            <p className="mt-2 text-2xl font-semibold">৳ {totalExpected.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Total collected</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">৳ {totalPaid.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Total due</p>
            <p className="mt-2 text-2xl font-semibold text-amber-600 dark:text-amber-400">৳ {summary.totalDue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Unpaid / partial items</p>
            <p className="mt-2 text-2xl font-semibold">{summary.unpaidCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Simple chart: bar representation of paid vs due per fee */}
      {fees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Paid vs due by fee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fees.slice(0, 12).map((fee) => {
                const total = fee.total_fee || 0;
                const paid = fee.paid_amount || 0;
                const due = fee.due_amount || 0;
                const pct = total > 0 ? (paid / total) * 100 : 0;
                const label = fee.fee_type === 'monthly' && fee.month ? fee.month : (FEE_TYPE_LABELS[fee.fee_type || 'monthly'] ?? fee.fee_type);
                return (
                  <div key={fee._id} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{label}</span>
                      <span>৳ {paid.toLocaleString()} / ৳ {total.toLocaleString()}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {fees.length > 12 && (
                <p className="text-xs text-muted-foreground">Showing first 12; total {fees.length} fee records.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fee list table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            All fees
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : fees.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No fee records for this student.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Total (৳)</TableHead>
                    <TableHead className="text-right">Paid (৳)</TableHead>
                    <TableHead className="text-right">Due (৳)</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fees.map((fee) => (
                    <TableRow key={fee._id}>
                      <TableCell className="capitalize">
                        {FEE_TYPE_LABELS[fee.fee_type || 'monthly'] ?? fee.fee_type}
                      </TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
