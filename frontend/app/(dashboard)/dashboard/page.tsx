'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, CreditCard, ClipboardList, Wallet, Settings, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';

interface DashboardStats {
  totalStudents: number;
  todayAttendancePercent: number;
  monthIncome: number;
  monthExpense: number;
  netBalance: number;
  totalDueFees: number;
  recentTransactions: { _id?: string; type?: string; category?: string; amount?: number; date?: string; note?: string }[];
  recentPayments: { _id?: string; studentName?: string; amount?: number; date?: string; month?: string }[];
}

interface DashboardResponse {
  success: boolean;
  data?: DashboardStats;
  error?: string;
}

const links = [
  { title: 'Students', desc: 'Manage student records and guardian info', href: '/dashboard/students', icon: Users },
  { title: 'Fees', desc: 'Fee types, assignments, and payments', href: '/dashboard/fees', icon: CreditCard },
  { title: 'Attendance', desc: 'Mark and view daily attendance', href: '/dashboard/attendance', icon: ClipboardList },
  { title: 'Income / Expense', desc: 'Simple income and expense ledger', href: '/dashboard/income-expense', icon: Wallet },
  { title: 'Settings', desc: 'Users and school profile', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardPage() {
  const { token, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await apiRequest<DashboardResponse>('/api/dashboard', { token });
        if (!res.success || !res.data) {
          throw new Error(res.error || 'Failed to load dashboard');
        }
        if (!cancelled) {
          setStats(res.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, token]);

  const totalStudents = stats?.totalStudents ?? 0;
  const todayAttendancePercent = stats?.todayAttendancePercent ?? 0;
  const monthIncome = stats?.monthIncome ?? 0;
  const monthExpense = stats?.monthExpense ?? 0;
  const netBalance = stats?.netBalance ?? 0;
  const totalDueFees = stats?.totalDueFees ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          School overview
        </h1>
        <p className="mt-1 text-muted-foreground">
          See students, attendance, fees, and finance in one place.
        </p>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Total students</p>
            <p className="mt-2 text-2xl font-semibold">{totalStudents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Today&apos;s attendance</p>
            <p className="mt-2 text-2xl font-semibold">{todayAttendancePercent.toFixed(0)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">This month income</p>
            <p className="mt-2 text-2xl font-semibold">৳ {monthIncome.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">This month expense</p>
            <p className="mt-2 text-2xl font-semibold">৳ {monthExpense.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Net balance (this month)</p>
            <p className="mt-2 text-2xl font-semibold">৳ {netBalance.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium text-muted-foreground">Total due fees</p>
            <p className="mt-2 text-2xl font-semibold">৳ {totalDueFees.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity + quick links */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">Recent activity</h2>
              <span className="text-xs text-muted-foreground">
                {loading ? 'Loading...' : 'Updated from your data'}
              </span>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">Error: {error}</p>
            )}
            {!loading &&
              !error &&
              stats &&
              (stats.recentTransactions.length > 0 || stats.recentPayments.length > 0) && (
                <div className="mt-4 space-y-4">
                  {stats.recentPayments.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent payments</p>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {stats.recentPayments.slice(0, 5).map((p, i) => (
                          <li key={i} className="flex justify-between gap-2">
                            <span>{p.studentName ?? '—'} — {p.month ?? ''}</span>
                            <span className="font-medium">৳ {(p.amount ?? 0).toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {stats.recentTransactions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent transactions</p>
                      <ul className="mt-2 space-y-1.5 text-sm">
                        {stats.recentTransactions.slice(0, 5).map((t) => (
                          <li key={t._id} className="flex justify-between gap-2">
                            <span>{t.type === 'income' ? '+' : '-'} {t.category ?? ''} — {t.date ? new Date(t.date).toLocaleDateString() : ''}</span>
                            <span className="font-medium">৳ {(t.amount ?? 0).toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            {!loading &&
              !error &&
              stats &&
              stats.recentTransactions.length === 0 &&
              stats.recentPayments.length === 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  No recent transactions yet. Start by adding students, generating fees, and recording payments.
                </p>
              )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-base font-semibold">Quick links</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {links.map(({ title, desc, href, icon: Icon }) => (
              <Link key={href} href={href}>
                <Card className="group h-full transition-colors hover:border-primary/50 hover:bg-accent/50">
                  <CardContent className="flex items-start gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">
                        {title}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
