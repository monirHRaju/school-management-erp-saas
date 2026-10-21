'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Pencil,
  CreditCard,
  Printer,
  IdCard,
  MessageSquare,
  UserPlus,
  CalendarCheck,
  Trophy,
  UserX,
  UserCheck,
  Trash2,
  Phone,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  ExternalLink,
  Send,
  User as UserIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { printStudentAdmissionForm, type SchoolPrintSettings } from '@/lib/studentPrint';
import type { Student, StudentProfileData } from '@/types/student';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';

type TabKey = 'overview' | 'fees' | 'attendance' | 'results' | 'guardian';

function InfoField({ label, value }: { label: string; value?: string | number | null }) {
  const display =
    value !== undefined && value !== null && String(value).trim() !== '' ? String(value) : '—';
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{display}</p>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  student_fee: 'Monthly Tuition',
  book_sales: 'Book Sales',
  stationery: 'Stationery',
  exam_fee: 'Exam Fee',
  syllabus_fee: 'Syllabus Fee',
  fine: 'Fine',
  other: 'Other',
};

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === 'string' ? params.id : '';
  const { token, user, school } = useAuth();

  const isAdmin = user?.role === 'admin';
  const canManage = user?.role === 'admin' || user?.role === 'staff';
  const canFinance = user?.role === 'admin' || user?.role === 'staff' || user?.role === 'accountant';

  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [schoolSettings, setSchoolSettings] = useState<SchoolPrintSettings | null>(null);

  // Action states
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [guardianLoading, setGuardianLoading] = useState(false);
  const [photoZoomOpen, setPhotoZoomOpen] = useState(false);

  // SMS Modal
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);

  // Permanent Delete Modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ success: boolean; data: StudentProfileData }>(
        `/api/students/${id}/profile`,
        { token }
      );
      setProfile(res.data);
      const s = res.data.student;
      setSmsPhone(s.guardianPhone || s.fatherMobile || s.motherMobile || '');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load student profile';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ success: boolean; data: SchoolPrintSettings }>('/api/settings', { token })
      .then((res) => {
        if (res.success && res.data) setSchoolSettings(res.data);
      })
      .catch(() => {});
  }, [token]);

  const handleStatusChange = async (newStatus: Student['status']) => {
    if (!token || !profile) return;
    setTogglingStatus(true);
    try {
      await apiRequest(`/api/students/${profile.student._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
        token,
      });
      toast.success(
        newStatus === 'active'
          ? 'Student activated.'
          : newStatus === 'inactive'
          ? 'Student made inactive.'
          : 'Student marked as left.'
      );
      await fetchProfile();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleGenerateGuardian = async () => {
    if (!token || !profile) return;
    const s = profile.student;
    if (!s.guardianPhone?.trim()) {
      toast.error('Guardian phone is missing. Edit the student to add one first.');
      return;
    }
    setGuardianLoading(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        created?: boolean;
        message?: string;
        error?: string;
      }>(`/api/students/${s._id}/guardian`, {
        method: 'POST',
        body: JSON.stringify({}),
        token,
      });
      if (!res.success) throw new Error(res.error || 'Failed to generate guardian');
      toast.success(res.message || (res.created ? 'Guardian account created.' : 'Guardian linked.'));
      await fetchProfile();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate guardian');
    } finally {
      setGuardianLoading(false);
    }
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !smsPhone.trim() || !smsMessage.trim()) {
      toast.error('Phone number and message are required.');
      return;
    }
    setSmsSending(true);
    try {
      const res = await apiRequest<{ success: boolean; error?: string }>('/api/sms/send', {
        method: 'POST',
        body: JSON.stringify({ to: smsPhone.trim(), message: smsMessage.trim() }),
        token,
      });
      if (!res.success) throw new Error(res.error || 'Failed to send SMS');
      toast.success('SMS sent successfully.');
      setSmsMessage('');
      setSmsOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send SMS');
    } finally {
      setSmsSending(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!token || !profile) return;
    const s = profile.student;
    if (confirmName.trim().toLowerCase() !== s.name.trim().toLowerCase()) {
      toast.error('Please type the exact student name to confirm.');
      return;
    }
    setDeleting(true);
    try {
      await apiRequest(`/api/students/${s._id}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmName: confirmName.trim() }),
        token,
      });
      toast.success('Student and all related records permanently deleted.');
      router.push('/dashboard/students');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading student profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/dashboard/students')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Students
        </Button>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center text-destructive">
          {error || 'Student not found'}
        </div>
      </div>
    );
  }

  const { student: s, fees, attendance, results, guardian, siblings, counts } = profile;
  const latestExam = results[0];
  const whatsappClean = (s.whatsappNumber || s.guardianPhone || '').replace(/\D/g, '');
  const whatsappLink = whatsappClean
    ? `https://wa.me/${whatsappClean.startsWith('88') ? whatsappClean : `88${whatsappClean}`}`
    : null;

  const TABS: { key: TabKey; label: string; badge?: string | number }[] = [
    { key: 'overview', label: 'Overview' },
    ...(canFinance
      ? [{ key: 'fees' as const, label: 'Fees & Payments', badge: fees?.unpaidCount || undefined }]
      : []),
    { key: 'attendance', label: 'Attendance', badge: `${attendance.thisMonth.pct}%` },
    { key: 'results', label: 'Exam Results', badge: results.length || undefined },
    ...(canManage ? [{ key: 'guardian' as const, label: 'Guardian & SMS' }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Top navigation bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/students')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Students
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => printStudentAdmissionForm(s, school?.name ?? '', schoolSettings)}
            className="gap-1.5"
          >
            <Printer className="h-4 w-4" /> Print Admission Form
          </Button>
          {canManage && (
            <Link href={`/dashboard/students/${s._id}/edit`}>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Pencil className="h-4 w-4" /> Edit Student
              </Button>
            </Link>
          )}
          {canFinance && (
            <Link href={`/dashboard/fees/student/${s._id}`}>
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              >
                <CreditCard className="h-4 w-4" /> Collect / Manage Fees
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Hero Profile Header Card */}
      <Card className="overflow-hidden border-violet-200/70 dark:border-violet-900/40">
        <div className="bg-linear-to-r from-violet-600/10 via-blue-600/5 to-transparent p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {s.photoUrl ? (
              <button
                type="button"
                onClick={() => setPhotoZoomOpen(true)}
                className="group relative shrink-0 rounded-2xl overflow-hidden ring-2 ring-violet-500/40 shadow-md cursor-zoom-in"
                title="Click to enlarge photo"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.photoUrl}
                  alt={s.name}
                  className="h-24 w-24 sm:h-28 sm:w-28 object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </button>
            ) : (
              <div className="flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-3xl font-bold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 ring-2 ring-violet-500/20">
                {s.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{s.name}</h1>
                {s.nameBn && (
                  <span className="text-base font-medium text-muted-foreground">({s.nameBn})</span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
                    s.status === 'active' &&
                      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                    s.status === 'inactive' &&
                      'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                    s.status === 'left' && 'bg-destructive/15 text-destructive'
                  )}
                >
                  {s.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                <span className="font-mono text-xs bg-background/80 border border-border rounded-md px-2 py-0.5 text-foreground">
                  ID: {s.studentId || '—'}
                </span>
                {s.class && (
                  <span>
                    Class: <strong className="text-foreground">{s.class}</strong>
                  </span>
                )}
                {s.section && (
                  <span>
                    Section: <strong className="text-foreground">{s.section}</strong>
                  </span>
                )}
                {s.rollNo && (
                  <span>
                    Roll: <strong className="text-foreground">{s.rollNo}</strong>
                  </span>
                )}
                {s.session && (
                  <span>
                    Session: <strong className="text-foreground">{s.session}</strong>
                  </span>
                )}
                {s.shift && (
                  <span>
                    Shift: <strong className="text-foreground">{s.shift}</strong>
                  </span>
                )}
                {s.group && (
                  <span>
                    Group: <strong className="text-foreground">{s.group}</strong>
                  </span>
                )}
              </div>

              {/* Quick Contact & Service Links */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {s.guardianPhone && (
                  <a
                    href={`tel:${s.guardianPhone}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    {s.guardianPhone}
                  </a>
                )}
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                  >
                    WhatsApp
                  </a>
                )}
                {isAdmin && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSmsOpen(true)}
                    className="h-7 rounded-full px-3 text-xs gap-1.5"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Send SMS
                  </Button>
                )}
                {canManage && (
                  <Link href="/dashboard/students/admit-card">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full px-3 text-xs gap-1.5"
                    >
                      <IdCard className="h-3.5 w-3.5" /> Admit Card
                    </Button>
                  </Link>
                )}
                {canManage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={togglingStatus}
                    onClick={() => handleStatusChange(s.status === 'active' ? 'inactive' : 'active')}
                    className={cn(
                      'h-7 rounded-full px-3 text-xs gap-1.5',
                      s.status === 'active'
                        ? 'text-amber-700 dark:text-amber-300 border-amber-500/30 hover:bg-amber-500/10'
                        : 'text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10'
                    )}
                  >
                    {s.status === 'active' ? (
                      <>
                        <UserX className="h-3.5 w-3.5" /> Make Inactive
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-3.5 w-3.5" /> Activate
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {canFinance && fees && (
          <>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Billed</p>
                <p className="text-xl font-bold mt-1">৳ {fees.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Monthly: ৳ {(s.monthlyFee ?? 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  ৳ {fees.paid.toLocaleString()}
                </p>
                {fees.discount > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Discount: ৳ {fees.discount.toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className={cn(fees.due > 0 && 'border-destructive/40 bg-destructive/5')}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Current Due</p>
                <p
                  className={cn(
                    'text-xl font-bold mt-1',
                    fees.due > 0 ? 'text-destructive' : 'text-foreground'
                  )}
                >
                  ৳ {fees.due.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {fees.unpaidCount} unpaid fee(s)
                </p>
              </CardContent>
            </Card>
          </>
        )}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Attendance (This Month)</p>
            <p className="text-xl font-bold mt-1">{attendance.thisMonth.pct}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              P: {attendance.thisMonth.present} · A: {attendance.thisMonth.absent} · Year:{' '}
              {attendance.thisYear.pct}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Latest Exam Result</p>
            <p className="text-xl font-bold mt-1">
              {latestExam ? (latestExam.isFail ? 'Failed' : `GPA ${latestExam.gpa.toFixed(2)}`) : '—'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {latestExam ? latestExam.examName : 'No exam records yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-px">
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                active
                  ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
              {t.badge !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    active
                      ? 'bg-violet-600/15 text-violet-700 dark:text-violet-300'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── TAB 1: OVERVIEW ───────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Personal Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoField label="Student ID" value={s.studentId} />
                <InfoField label="Name (English)" value={s.name} />
                <InfoField label="Name (বাংলা)" value={s.nameBn} />
                <InfoField
                  label="Date of Birth"
                  value={s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-GB') : undefined}
                />
                <InfoField label="Birth Reg. No." value={s.birthRegNo} />
                <InfoField label="Gender" value={s.gender} />
                <InfoField label="Religion" value={s.religion} />
                <InfoField label="Blood Group" value={s.bloodGroup} />
                <div className="col-span-2 sm:col-span-3">
                  <InfoField label="Full Address" value={s.address} />
                </div>
              </CardContent>
            </Card>

            {/* Academic Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Academic &amp; Admission Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoField label="Class" value={s.class} />
                <InfoField label="Section" value={s.section} />
                <InfoField label="Academic Session" value={s.session} />
                <InfoField label="Roll No." value={s.rollNo} />
                <InfoField label="Shift" value={s.shift} />
                <InfoField label="Group" value={s.group} />
                {canFinance && (
                  <InfoField
                    label="Monthly Fee"
                    value={s.monthlyFee != null ? `৳ ${s.monthlyFee.toLocaleString()}` : undefined}
                  />
                )}
                <InfoField
                  label="Admission Date"
                  value={
                    s.admissionDate ? new Date(s.admissionDate).toLocaleDateString('en-GB') : undefined
                  }
                />
                <InfoField label="Status" value={s.status} />
              </CardContent>
            </Card>
          </div>

          {/* Family & Guardian Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Family &amp; Guardian Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <InfoField label="Father Name" value={s.fatherName} />
                <InfoField label="Father Mobile" value={s.fatherMobile} />
                <InfoField label="Father Profession" value={s.fatherProfession} />
                {canFinance && (
                  <InfoField
                    label="Father Monthly Income"
                    value={
                      s.fatherMonthlyIncome != null
                        ? `৳ ${s.fatherMonthlyIncome.toLocaleString()}`
                        : undefined
                    }
                  />
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-border/60">
                <InfoField label="Mother Name" value={s.motherName} />
                <InfoField label="Mother Mobile" value={s.motherMobile} />
                <InfoField label="Mother Profession" value={s.motherProfession} />
                {canFinance && (
                  <InfoField
                    label="Mother Monthly Income"
                    value={
                      s.motherMonthlyIncome != null
                        ? `৳ ${s.motherMonthlyIncome.toLocaleString()}`
                        : undefined
                    }
                  />
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-border/60">
                <InfoField label="Guardian Name" value={s.guardianName} />
                <InfoField label="Guardian Relation" value={s.guardianRelation} />
                <InfoField label="Guardian Phone" value={s.guardianPhone} />
                <InfoField label="WhatsApp Number" value={s.whatsappNumber} />
              </div>
            </CardContent>
          </Card>

          {/* Siblings Card (if any) */}
          {siblings.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-violet-600" /> Siblings in School ({siblings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {siblings.map((sib) => (
                    <Link
                      key={sib._id}
                      href={`/dashboard/students/${sib._id}`}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                    >
                      {sib.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={sib.photoUrl}
                          alt={sib.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                          {sib.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{sib.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Class {sib.class || '—'}
                          {sib.section ? ` (${sib.section})` : ''}
                          {sib.rollNo ? ` · Roll ${sib.rollNo}` : ''}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status & Danger Zone */}
          {canManage && (
            <Card className="border-destructive/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Student Status &amp; Danger Zone
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium">Change Student Status (Soft Delete)</p>
                    <p className="text-xs text-muted-foreground">
                      Making a student <strong>Inactive</strong> or <strong>Left</strong> keeps all fee,
                      payment, attendance, and exam records intact while hiding them from active lists.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(['active', 'inactive', 'left'] as const).map((st) => (
                      <Button
                        key={st}
                        type="button"
                        size="sm"
                        variant={s.status === st ? 'default' : 'outline'}
                        disabled={togglingStatus || s.status === st}
                        onClick={() => handleStatusChange(st)}
                        className="capitalize"
                      >
                        {st}
                      </Button>
                    ))}
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
                    <div>
                      <p className="text-sm font-semibold text-destructive">
                        Permanently Delete Student
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Irreversibly deletes this student along with{' '}
                        <strong>{counts.fees}</strong> fee record(s),{' '}
                        <strong>{counts.payments}</strong> payment(s),{' '}
                        <strong>{counts.attendance}</strong> attendance record(s), and{' '}
                        <strong>{counts.results}</strong> exam result(s).
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setConfirmName('');
                        setDeleteOpen(true);
                      }}
                      className="gap-1.5 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" /> Delete Permanently
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── TAB 2: FEES & PAYMENTS ────────────────────────────────────── */}
      {activeTab === 'fees' && canFinance && fees && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div>
              <p className="text-sm font-semibold">Fee Collection &amp; Ledger</p>
              <p className="text-xs text-muted-foreground">
                Collect single or multiple fees, add one-time/additional fees, or print payment invoices.
              </p>
            </div>
            <Link href={`/dashboard/fees/student/${s._id}`}>
              <Button className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                <CreditCard className="h-4 w-4" /> Open Full Fee Manager
              </Button>
            </Link>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Fee Records ({fees.records.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {fees.records.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No fee records generated for this student yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month / Ref</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fees.records.map((f) => (
                      <TableRow key={f._id}>
                        <TableCell className="font-medium">{f.month || 'One-time'}</TableCell>
                        <TableCell>{CATEGORY_LABELS[f.category] || f.category}</TableCell>
                        <TableCell className="text-muted-foreground">{f.description || '—'}</TableCell>
                        <TableCell className="text-right">৳ {f.total_fee.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                          ৳ {f.paid_amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {f.discount_amount > 0 ? `৳ ${f.discount_amount.toLocaleString()}` : '—'}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-medium',
                            f.due_amount > 0 && 'text-destructive'
                          )}
                        >
                          ৳ {f.due_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                              f.status === 'paid' &&
                                'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                              f.status === 'partial' &&
                                'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                              f.status === 'unpaid' && 'bg-destructive/15 text-destructive'
                            )}
                          >
                            {f.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Payments ({fees.payments.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {fees.payments.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fees.payments.map((p) => (
                      <TableRow key={p._id}>
                        <TableCell>
                          {p.payment_date
                            ? new Date(p.payment_date).toLocaleDateString('en-GB')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {CATEGORY_LABELS[p.feeCategory || ''] || p.feeCategory || 'Fee'}
                          {p.feeMonth ? ` (${p.feeMonth})` : ''}
                          {p.feeDescription ? ` — ${p.feeDescription}` : ''}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                          ৳ {p.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.discount > 0 ? `৳ ${p.discount.toLocaleString()}` : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.note || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 3: ATTENDANCE ─────────────────────────────────────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">This Month Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-5 gap-2 text-center">
                <div className="rounded-lg bg-emerald-500/10 p-2.5">
                  <p className="text-xs text-muted-foreground">Present</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {attendance.thisMonth.present}
                  </p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-2.5">
                  <p className="text-xs text-muted-foreground">Absent</p>
                  <p className="text-lg font-bold text-destructive">
                    {attendance.thisMonth.absent}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-2.5">
                  <p className="text-xs text-muted-foreground">Late</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {attendance.thisMonth.late}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-2.5">
                  <p className="text-xs text-muted-foreground">Leave</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {attendance.thisMonth.leave}
                  </p>
                </div>
                <div className="rounded-lg bg-violet-500/10 p-2.5">
                  <p className="text-xs text-muted-foreground">Rate</p>
                  <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                    {attendance.thisMonth.pct}%
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">This Year Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-5 gap-2 text-center">
                <div className="rounded-lg bg-emerald-500/10 p-2.5">
                  <p className="text-xs text-muted-foreground">Present</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {attendance.thisYear.present}
                  </p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-2.5">
                  <p className="text-xs text-muted-foreground">Absent</p>
                  <p className="text-lg font-bold text-destructive">{attendance.thisYear.absent}</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-2.5">
                  <p className="text-xs text-muted-foreground">Late</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {attendance.thisYear.late}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-2.5">
                  <p className="text-xs text-muted-foreground">Leave</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {attendance.thisYear.leave}
                  </p>
                </div>
                <div className="rounded-lg bg-violet-500/10 p-2.5">
                  <p className="text-xs text-muted-foreground">Rate</p>
                  <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                    {attendance.thisYear.pct}%
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">This Month Daily Log</CardTitle>
              <Link href="/dashboard/attendance?tab=monthly">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <CalendarCheck className="h-4 w-4" /> Full Attendance Report
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {attendance.thisMonth.records.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No attendance records marked for this month yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {attendance.thisMonth.records.map((r) => (
                    <div
                      key={r._id}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-xs font-medium flex items-center gap-2',
                        r.status === 'present' &&
                          'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                        r.status === 'absent' &&
                          'border-destructive/30 bg-destructive/10 text-destructive',
                        r.status === 'late' &&
                          'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
                        r.status === 'leave' &&
                          'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      )}
                    >
                      <span>{new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                      <span className="uppercase font-bold">{r.status.charAt(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── TAB 4: EXAM RESULTS ───────────────────────────────────────── */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          {results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <Trophy className="h-10 w-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  No exam results recorded for this student yet.
                </p>
                <Link href="/dashboard/results/entry">
                  <Button variant="outline" size="sm">
                    Go to Mark Entry
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            results.map((ex) => (
              <Card key={ex.examId}>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {ex.examName}
                      {ex.term && (
                        <span className="text-xs font-normal text-muted-foreground">
                          ({ex.term})
                        </span>
                      )}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Total Marks: <strong>{ex.totalMark}</strong> · GPA:{' '}
                      <strong>{ex.gpa.toFixed(2)}</strong> · Status:{' '}
                      <strong className={ex.isFail ? 'text-destructive' : 'text-emerald-600'}>
                        {ex.isFail ? 'Failed' : 'Passed'}
                      </strong>
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/results/print?studentId=${s._id}&examId=${ex.examId}`}
                  >
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Printer className="h-4 w-4" /> Marksheet
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-right">Written</TableHead>
                        <TableHead className="text-right">MCQ</TableHead>
                        <TableHead className="text-right">Practical</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead className="text-right">GP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ex.subjects.map((sub) => (
                        <TableRow key={sub._id}>
                          <TableCell className="font-medium">{sub.subject}</TableCell>
                          <TableCell className="text-right">{sub.writtenMark}</TableCell>
                          <TableCell className="text-right">{sub.mcqMark}</TableCell>
                          <TableCell className="text-right">{sub.practicalMark}</TableCell>
                          <TableCell className="text-right font-semibold">{sub.totalMark}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                                sub.isFail
                                  ? 'bg-destructive/15 text-destructive'
                                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              )}
                            >
                              {sub.grade}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{sub.gradePoint.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ─── TAB 5: GUARDIAN & SMS ─────────────────────────────────────── */}
      {activeTab === 'guardian' && canManage && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Guardian Portal Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {guardian.accounts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground space-y-3">
                  <p>No guardian login account is linked to this student yet.</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGenerateGuardian}
                    disabled={guardianLoading || !s.guardianPhone}
                    className="gap-2"
                  >
                    {guardianLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Create / Link Guardian Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {guardian.accounts.map((acc) => (
                    <div
                      key={acc._id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">Phone: {acc.phone}</p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
                          acc.isLinked
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        )}
                      >
                        {acc.isLinked ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Linked
                          </>
                        ) : (
                          <>
                            <Clock className="h-3.5 w-3.5" /> Unlinked
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateGuardian}
                    disabled={guardianLoading || !s.guardianPhone}
                    className="gap-2"
                  >
                    {guardianLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Re-sync Guardian Link
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Send Direct SMS to Guardian</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendSms} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sms-phone">Recipient Phone</Label>
                    <Input
                      id="sms-phone"
                      value={smsPhone}
                      onChange={(e) => setSmsPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sms-msg">Message</Label>
                    <textarea
                      id="sms-msg"
                      rows={3}
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      placeholder={`Dear Guardian of ${s.name}, ...`}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                    />
                  </div>
                  <Button type="submit" disabled={smsSending} className="gap-2">
                    {smsSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send SMS
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Photo Enlarge Dialog */}
      <Dialog open={photoZoomOpen} onOpenChange={setPhotoZoomOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{s.name}</DialogTitle>
          </DialogHeader>
          {s.photoUrl && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.photoUrl}
                alt={s.name}
                className="max-h-[70vh] w-auto rounded-xl object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Send SMS Dialog */}
      <Dialog open={smsOpen} onOpenChange={setSmsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send SMS — {s.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSendSms} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modal-sms-phone">Phone Number</Label>
              <Input
                id="modal-sms-phone"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-sms-msg">Message</Label>
              <textarea
                id="modal-sms-msg"
                rows={4}
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder={`Dear Guardian of ${s.name}, ...`}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSmsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={smsSending} className="gap-2">
                {smsSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send SMS
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Permanent Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Permanently Delete Student
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              This action <strong>cannot be undone</strong>. It will permanently delete{' '}
              <strong className="text-foreground">{s.name}</strong> and all associated data:
            </p>
            <ul className="list-disc list-inside rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-1">
              <li>
                <strong>{counts.fees}</strong> fee record(s) &amp;{' '}
                <strong>{counts.payments}</strong> payment(s)
              </li>
              <li>
                <strong>{counts.attendance}</strong> attendance record(s)
              </li>
              <li>
                <strong>{counts.results}</strong> exam result(s)
              </li>
            </ul>
            <div className="space-y-2">
              <Label htmlFor="confirm-student-name">
                Type <span className="font-mono font-bold text-foreground">{s.name}</span> to
                confirm:
              </Label>
              <Input
                id="confirm-student-name"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={s.name}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={
                deleting || confirmName.trim().toLowerCase() !== s.name.trim().toLowerCase()
              }
              className="gap-2"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete Forever
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
