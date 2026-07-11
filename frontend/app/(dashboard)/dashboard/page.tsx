'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, CreditCard, ClipboardList, Wallet, Settings, ArrowRight,
  TrendingUp, TrendingDown, AlertCircle, CalendarCheck,
  GraduationCap, UserCheck, MessageSquare, UserPlus, Receipt,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { QuickStudentSearch } from '@/components/QuickStudentSearch';
import { useTranslations } from 'next-intl';

interface DashboardStats {
  totalStudents: number;
  totalStudentsAll?: number;
  runningStudents?: number;
  totalTeachers?: number;
  smsBalance?: number;
  todayIncome?: number;
  todayExpense?: number;
  totalIncome?: number;
  totalExpense?: number;
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

// quickActions and quickLinks are built inside the component to use translations

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  gradient: string; // tailwind gradient classes
  iconColor: string;
  loading?: boolean;
}

function StatCard({ label, value, icon: Icon, gradient, iconColor, loading }: StatCardProps) {
  return (
    <Card className={`overflow-hidden border-0 ${gradient} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-black/20 shadow-sm">
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="h-7 w-16 animate-pulse rounded bg-white/40 dark:bg-white/10" />
            ) : (
              <p className="text-2xl font-bold text-foreground tabular-nums leading-tight">{value}</p>
            )}
            <p className="text-xs font-medium text-foreground/70 mt-0.5">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { token, user, loading: authLoading } = useAuth();
  const isTeacher = user?.role === 'teacher';  const t = useTranslations('dashboard');
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

  const quickActions = [
    { key: 'overview', label: t('overview'), href: '/dashboard' },
    { key: 'admission', label: t('newAdmission'), href: '/dashboard/students/new' },
    { key: 'payment', label: t('takePayment'), href: '/dashboard/fees' },
    { key: 'attendance', label: t('takeAttendance'), href: '/dashboard/attendance' },
  ];

  const quickLinks = [
    { title: t('students'), desc: t('manageDesc'), href: '/dashboard/students', icon: Users, color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
    { title: t('fees'), desc: t('feeDesc'), href: '/dashboard/fees', icon: CreditCard, color: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400' },
    { title: t('attendance'), desc: t('attendanceDesc'), href: '/dashboard/attendance', icon: ClipboardList, color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
    { title: t('incomeExpense'), desc: t('incomeDesc'), href: '/dashboard/income-expense', icon: Wallet, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
    { title: t('settings'), desc: t('settingsDesc'), href: '/dashboard/settings', icon: Settings, color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  ];

  const monthlyFinance = stats?.monthlyFinance ?? [];
  const feeStats = stats?.feeStats ?? { paid: 0, partial: 0, unpaid: 0 };
  const studentsByClass = stats?.studentsByClass ?? [];

  const feeStatusData = [
    { name: t('paid'), value: feeStats.paid, color: '#10b981' },
    { name: t('partial'), value: feeStats.partial, color: '#f59e0b' },
    { name: t('unpaid'), value: feeStats.unpaid, color: '#f43f5e' },
  ].filter((d) => d.value > 0);

  const attendanceData = [
    { value: todayAttendancePercent },
    { value: 100 - todayAttendancePercent },
  ];

  const tkFmt = (v: unknown) => `৳ ${Number(v).toLocaleString()}`;

  const totalStudentsAll = stats?.totalStudentsAll ?? totalStudents;
  const runningStudents = stats?.runningStudents ?? totalStudents;
  const totalTeachers = stats?.totalTeachers ?? 0;
  const smsBalance = stats?.smsBalance ?? 0;
  const todayIncome = stats?.todayIncome ?? 0;
  const todayExpense = stats?.todayExpense ?? 0;
  const totalIncome = stats?.totalIncome ?? 0;
  const totalExpense = stats?.totalExpense ?? 0;

  return (
    <div className="space-y-6">
      {/* Quick search */}
      <div className="pt-2">
        <QuickStudentSearch />
      </div>

      {/* Quick action tabs */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
        {quickActions.map((a) => {
          const isActive = a.key === 'overview';
          return (
            <Link
              key={a.key}
              href={a.href}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
                isActive
                  ? 'bg-linear-to-r from-violet-600 to-violet-500 text-white shadow-violet-300/40 dark:shadow-violet-900/40'
                  : 'bg-card border border-border text-foreground hover:border-violet-300 hover:text-violet-600 dark:hover:border-violet-800 dark:hover:text-violet-400'
              }`}
            >
              {a.label}
            </Link>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stat cards — 8 colored tiles */}
      { !isTeacher && (      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('totalStudents')} value={String(totalStudentsAll)} icon={Users} gradient="bg-linear-to-br from-violet-100 to-violet-50 dark:from-violet-950/40 dark:to-violet-900/20" iconColor="text-violet-600 dark:text-violet-300" loading={loading} />
        <StatCard label={t('runningStudents')} value={String(runningStudents)} icon={GraduationCap} gradient="bg-linear-to-br from-fuchsia-100 to-fuchsia-50 dark:from-fuchsia-950/40 dark:to-fuchsia-900/20" iconColor="text-fuchsia-600 dark:text-fuchsia-300" loading={loading} />
        <StatCard label={t('teachers')} value={String(totalTeachers)} icon={UserCheck} gradient="bg-linear-to-br from-indigo-100 to-indigo-50 dark:from-indigo-950/40 dark:to-indigo-900/20" iconColor="text-indigo-600 dark:text-indigo-300" loading={loading} />
        <StatCard label={t('smsBalance')} value={smsBalance.toLocaleString()} icon={MessageSquare} gradient="bg-linear-to-br from-sky-100 to-sky-50 dark:from-sky-950/40 dark:to-sky-900/20" iconColor="text-sky-600 dark:text-sky-300" loading={loading} />
        <StatCard label={t('totalIncome')} value={`৳ ${totalIncome.toLocaleString()}`} icon={TrendingUp} gradient="bg-linear-to-br from-teal-100 to-teal-50 dark:from-teal-950/40 dark:to-teal-900/20" iconColor="text-teal-600 dark:text-teal-300" loading={loading} />
        <StatCard label={t('todayIncome')} value={`৳ ${todayIncome.toLocaleString()}`} icon={Receipt} gradient="bg-linear-to-br from-emerald-100 to-emerald-50 dark:from-emerald-950/40 dark:to-emerald-900/20" iconColor="text-emerald-600 dark:text-emerald-300" loading={loading} />
        <StatCard label={t('totalExpense')} value={`৳ ${totalExpense.toLocaleString()}`} icon={TrendingDown} gradient="bg-linear-to-br from-rose-100 to-rose-50 dark:from-rose-950/40 dark:to-rose-900/20" iconColor="text-rose-600 dark:text-rose-300" loading={loading} />
        <StatCard label={t('todayExpense')} value={`৳ ${todayExpense.toLocaleString()}`} icon={Wallet} gradient="bg-linear-to-br from-amber-100 to-amber-50 dark:from-amber-950/40 dark:to-amber-900/20" iconColor="text-amber-600 dark:text-amber-300" loading={loading} />
      </div>
       )}
      {/* Secondary stat row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <StatCard label={t('todayAttendance')} value={`${todayAttendancePercent.toFixed(0)}%`} icon={CalendarCheck} gradient="bg-linear-to-br from-cyan-100 to-cyan-50 dark:from-cyan-950/40 dark:to-cyan-900/20" iconColor="text-cyan-600 dark:text-cyan-300" loading={loading} />
        <StatCard label={t('dueFees')} value={`৳ ${totalDueFees.toLocaleString()}`} icon={AlertCircle} gradient="bg-linear-to-br from-orange-100 to-orange-50 dark:from-orange-950/40 dark:to-orange-900/20" iconColor="text-orange-600 dark:text-orange-300" loading={loading} />
        <StatCard label={t('netBalance')} value={`৳ ${netBalance.toLocaleString()}`} icon={Wallet} gradient={netPositive ? 'bg-linear-to-br from-purple-100 to-purple-50 dark:from-purple-950/40 dark:to-purple-900/20' : 'bg-linear-to-br from-red-100 to-red-50 dark:from-red-950/40 dark:to-red-900/20'} iconColor={netPositive ? 'text-purple-600 dark:text-purple-300' : 'text-red-600 dark:text-red-300'} loading={loading} />
      </div>

      {/* Charts row 1 — Monthly Finance + Fee Status */}
      <div className="grid gap-6 lg:grid-cols-3">
        { !isTeacher && (        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('monthlyFinance')}</CardTitle>
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
            <CardTitle className="text-base">{t('feeStatus')}</CardTitle>
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
            <CardTitle className="text-base">{t('studentsByClass')}</CardTitle>
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
            <CardTitle className="text-base">{t('attendanceToday')}</CardTitle>
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
              <h2 className="text-base font-semibold">{t('recentActivity')}</h2>
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
                { !isTeacher && stats.recentTransactions.length > 0 && (                  <div>
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
          <h2 className="text-base font-semibold">{t('quickLinks')}</h2>
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
         )}