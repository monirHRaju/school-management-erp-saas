'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, CreditCard, ClipboardList, Wallet, Settings, ArrowRight,
  TrendingUp, TrendingDown, AlertCircle, CalendarCheck,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  monthlyFinance: { month: string; income: number; expense: number }[];
  feeStats: { paid: number; partial: number; unpaid: number };
  studentsByClass: { class: string; count: number }[];
}

interface DashboardResponse {
  success: boolean;
  data?: DashboardStats;
  error?: string;
}

const quickLinks = [
  { title: 'Students', desc: 'Manage student records and guardian info', href: '/dashboard/students', icon: Users, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  { title: 'Fees', desc: 'Fee types, assignments, and payments', href: '/dashboard/fees', icon: CreditCard, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  { title: 'Attendance', desc: 'Mark and view daily attendance', href: '/dashboard/attendance', icon: ClipboardList, color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  { title: 'Income / Expense', desc: 'Simple income and expense ledger', href: '/dashboard/income-expense', icon: Wallet, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  { title: 'Settings', desc: 'Users and school profile', href: '/dashboard/settings', icon: Settings, color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
];

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  loading?: boolean;
}

function StatCard({ label, value, icon: Icon, iconBg, iconColor, borderColor, loading }: StatCardProps) {
  return (
    <Card className={`border-l-4 ${borderColor} overflow-hidden`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            {loading ? (
              <div className="mt-2 h-7 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="mt-1.5 text-2xl font-bold text-foreground">{value}</p>
            )}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { token, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await apiRequest<DashboardResponse>('/api/dashboard', { token });
        if (!res.success || !res.data) throw new Error(res.error || 'Failed to load dashboard');
        if (!cancelled) { setStats(res.data); setError(null); }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authLoading, token]);

  const totalStudents = stats?.totalStudents ?? 0;
  const todayAttendancePercent = stats?.todayAttendancePercent ?? 0;
  const monthIncome = stats?.monthIncome ?? 0;
  const monthExpense = stats?.monthExpense ?? 0;
  const netBalance = stats?.netBalance ?? 0;
  const totalDueFees = stats?.totalDueFees ?? 0;

  const netPositive = netBalance >= 0;

  const monthlyFinance = stats?.monthlyFinance ?? [];
  const feeStats = stats?.feeStats ?? { paid: 0, partial: 0, unpaid: 0 };
  const studentsByClass = stats?.studentsByClass ?? [];

  const feeStatusData = [
    { name: 'Paid', value: feeStats.paid, color: '#10b981' },
    { name: 'Partial', value: feeStats.partial, color: '#f59e0b' },
    { name: 'Unpaid', value: feeStats.unpaid, color: '#f43f5e' },
  ].filter((d) => d.value > 0);

  const attendanceData = [
    { value: todayAttendancePercent },
    { value: 100 - todayAttendancePercent },
  ];

  const tkFmt = (v: unknown) => `৳ ${Number(v).toLocaleString()}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          School Overview
        </h1>
        <p className="mt-1 text-muted-foreground">
          Students, attendance, fees, and finance at a glance.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stat cards — row 1 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Students"
          value={String(totalStudents)}
          icon={Users}
          iconBg="bg-blue-500/10"
          iconColor="text-blue-600 dark:text-blue-400"
          borderColor="border-blue-500"
          loading={loading}
        />
        <StatCard
          label="Today's Attendance"
          value={`${todayAttendancePercent.toFixed(0)}%`}
          icon={CalendarCheck}
          iconBg="bg-green-500/10"
          iconColor="text-green-600 dark:text-green-400"
          borderColor="border-green-500"
          loading={loading}
        />
        <StatCard
          label="Total Due Fees"
          value={`৳ ${totalDueFees.toLocaleString()}`}
          icon={AlertCircle}
          iconBg="bg-amber-500/10"
          iconColor="text-amber-600 dark:text-amber-400"
          borderColor="border-amber-500"
          loading={loading}
        />
      </div>

      {/* Stat cards — row 2 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Month Income"
          value={`৳ ${monthIncome.toLocaleString()}`}
          icon={TrendingUp}
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-600 dark:text-emerald-400"
          borderColor="border-emerald-500"
          loading={loading}
        />
        <StatCard
          label="Month Expense"
          value={`৳ ${monthExpense.toLocaleString()}`}
          icon={TrendingDown}
          iconBg="bg-rose-500/10"
          iconColor="text-rose-600 dark:text-rose-400"
          borderColor="border-rose-500"
          loading={loading}
        />
        <StatCard
          label="Net Balance"
          value={`৳ ${netBalance.toLocaleString()}`}
          icon={Wallet}
          iconBg={netPositive ? 'bg-purple-500/10' : 'bg-red-500/10'}
          iconColor={netPositive ? 'text-purple-600 dark:text-purple-400' : 'text-red-600 dark:text-red-400'}
          borderColor={netPositive ? 'border-purple-500' : 'border-red-500'}
          loading={loading}
        />
      </div>

      {/* Charts row 1 — Monthly Finance + Fee Status */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Income vs Expense</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-56 animate-pulse rounded-lg bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyFinance} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`} width={48} />
                  <Tooltip formatter={tkFmt} cursor={{ fill: 'currentColor', fillOpacity: 0.04 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fee Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-56 animate-pulse rounded-lg bg-muted" />
            ) : feeStatusData.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">No fee data</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={feeStatusData}
                    cx="50%" cy="46%"
                    innerRadius="55%" outerRadius="80%"
                    dataKey="value"
                    strokeWidth={2}
                    stroke="transparent"
                  >
                    {feeStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => [`${v} fees`, '']} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 — Students by Class + Attendance Gauge */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Students by Class</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-52 animate-pulse rounded-lg bg-muted" />
            ) : studentsByClass.length === 0 ? (
              <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">No class data</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, studentsByClass.length * 36)}>
                <BarChart data={studentsByClass} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="class" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip formatter={(v: unknown) => [`${v} students`, 'Count']} />
                  <Bar dataKey="count" name="Students" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today&apos;s Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-52 animate-pulse rounded-lg bg-muted" />
            ) : (
              <div className="relative flex items-center justify-center" style={{ height: 208 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceData}
                      cx="50%" cy="50%"
                      innerRadius="62%" outerRadius="82%"
                      startAngle={90} endAngle={-270}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="currentColor" style={{ opacity: 0.08 }} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-4xl font-bold tabular-nums">{todayAttendancePercent}%</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Present</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity + quick links */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-base font-semibold">Recent Activity</h2>
              <span className="text-xs text-muted-foreground">
                {loading ? 'Loading...' : 'Live from your data'}
              </span>
            </div>

            {!loading && !error && stats && (stats.recentPayments.length > 0 || stats.recentTransactions.length > 0) ? (
              <div className="space-y-5">
                {stats.recentPayments.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Fee Payments
                    </p>
                    <ul className="space-y-2">
                      {stats.recentPayments.slice(0, 5).map((p, i) => (
                        <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                            <span className="truncate">{p.studentName ?? '—'}</span>
                            {p.month && <span className="text-xs text-muted-foreground shrink-0">({p.month})</span>}
                          </div>
                          <span className="font-semibold text-green-600 dark:text-green-400 shrink-0">
                            +৳ {(p.amount ?? 0).toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {stats.recentTransactions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Transactions
                    </p>
                    <ul className="space-y-2">
                      {stats.recentTransactions.slice(0, 5).map((t) => (
                        <li key={t._id} className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${t.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className="truncate">{t.category ?? ''}</span>
                            {t.date && <span className="text-xs text-muted-foreground shrink-0">({new Date(t.date).toLocaleDateString()})</span>}
                          </div>
                          <span className={`font-semibold shrink-0 ${t.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {t.type === 'income' ? '+' : '-'}৳ {(t.amount ?? 0).toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : !loading && !error ? (
              <p className="text-sm text-muted-foreground">
                No recent activity yet. Add students, generate fees, and record payments to see data here.
              </p>
            ) : null}

            {loading && (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold">Quick Links</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {quickLinks.map(({ title, desc, href, icon: Icon, color }) => (
              <Link key={href} href={href}>
                <Card className="group h-full transition-all hover:shadow-md hover:border-border/80">
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">{desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
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
