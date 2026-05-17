'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getDailyAttendance,
  markAttendance,
  getMonthlyAttendance,
  getAttendanceReport,
  getStudentMonthlyReport,
  getStudentYearlyReport,
  getHolidays,
  createHoliday,
  deleteHoliday,
  clearAttendance,
} from '@/lib/attendance';
import type { Holiday } from '@/lib/attendance';
import type {
  AttendanceRecord,
  AttendanceStatus,
  MonthlyStudentRow,
  ClassSummary,
  AttendanceTotals,
  StudentMonthlyRow,
  StudentYearlyRow,
} from '@/types/attendance';
import toast from 'react-hot-toast';
import {
  Loader2, Users, CalendarDays, BarChart3, CheckCircle2, XCircle, Clock, LogOut,
  Download, Printer, PartyPopper, Trash2, Plus, FileText, Percent, Eye,
} from 'lucide-react';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
import { apiRequest } from '@/lib/api';

type Tab = 'mark' | 'monthly' | 'reports' | 'holidays';
type ReportType = 'class-monthly' | 'student-monthly' | 'student-yearly';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface SchoolProfile {
  name: string;
  nameBn?: string;
  address?: string;
  contact?: string;
  logoUrl?: string;
}

// ─── Download CSV helper ─────────────────────────────────────────────────────
function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── School-header HTML for printable reports ────────────────────────────────
function schoolHeaderHTML(school: SchoolProfile | null, subtitle: string) {
  if (!school) return `<div class="report-meta"><div class="subtitle">${subtitle}</div></div>`;
  const logo = school.logoUrl
    ? `<img src="${school.logoUrl}" alt="logo" style="height:60px;width:60px;object-fit:contain;margin-right:14px;" />`
    : '';
  const nameBn = school.nameBn ? `<div style="font-size:14px;color:#444;">${escapeHtml(school.nameBn)}</div>` : '';
  const address = school.address ? `<div style="font-size:12px;color:#555;">${escapeHtml(school.address)}</div>` : '';
  const contact = school.contact ? `<div style="font-size:12px;color:#555;">Contact: ${escapeHtml(school.contact)}</div>` : '';
  return `
    <div class="school-header" style="display:flex;align-items:center;border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:14px;">
      ${logo}
      <div style="flex:1;text-align:center;">
        <div style="font-size:22px;font-weight:700;color:#111;">${escapeHtml(school.name || '')}</div>
        ${nameBn}
        ${address}
        ${contact}
      </div>
    </div>
    <div style="text-align:center;font-size:15px;font-weight:600;margin-bottom:10px;color:#222;">${escapeHtml(subtitle)}</div>
  `;
}

function escapeHtml(s: string) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );
}

// ─── Print helper with school header ─────────────────────────────────────────
function printElement(elementId: string, title: string, school: SchoolProfile | null, subtitle: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html><head><title>${escapeHtml(title)}</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 20px; color: #111; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: center; }
      th { background: #f5f5f5; font-weight: 600; }
      td:first-child, th:first-child { text-align: left; }
      h2 { margin-bottom: 12px; }
      .text-emerald-500 { color: #10b981; }
      .text-red-500 { color: #ef4444; }
      .text-amber-500 { color: #f59e0b; }
      .summary-cards { display: grid !important; grid-template-columns: repeat(6, 1fr); gap: 8px; margin: 10px 0 16px; }
      .summary-card { border: 1px solid #ddd; border-radius: 8px; padding: 8px 10px; text-align: left; }
      .summary-card .label { font-size: 10px; color: #777; text-transform: uppercase; letter-spacing: .5px; }
      .summary-card .value { font-size: 20px; font-weight: 700; color: #111; }
      @media print { button { display: none; } }
    </style></head><body>
    ${schoolHeaderHTML(school, subtitle)}
    ${el.innerHTML}
    </body></html>
  `);
  win.document.close();
  win.print();
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentYearStr() {
  return String(new Date().getFullYear());
}

// ─── Select helper ───────────────────────────────────────────────────────────
function Select({
  label, value, onChange, options, allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  allLabel?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        {allLabel && <option value="">{allLabel}</option>}
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Shared: useSchoolProfile ────────────────────────────────────────────────
function useSchoolProfile() {
  const { token } = useAuth();
  const [school, setSchool] = useState<SchoolProfile | null>(null);
  useEffect(() => {
    if (!token) return;
    apiRequest<{ success: boolean; data: SchoolProfile }>('/api/settings', { token })
      .then((res) => { if (res.success) setSchool(res.data); })
      .catch(() => {});
  }, [token]);
  return school;
}

// ─── Shared: SummaryCard ─────────────────────────────────────────────────────
function SummaryCard({ label, value, accent, icon: Icon }: { label: string; value: string | number; accent: string; icon: typeof Users }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-extrabold text-foreground mt-1">{value}</p>
      </div>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
}

// ─── Status pill button (used in marking) ────────────────────────────────────
function StatusButton({
  status, active, onClick, label, Icon,
}: {
  status: AttendanceStatus;
  active: boolean;
  onClick: () => void;
  label: string;
  Icon: typeof CheckCircle2;
}) {
  const colors: Record<AttendanceStatus, string> = {
    present: active ? 'bg-emerald-500 text-white border-emerald-500' : 'border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10',
    absent: active ? 'bg-red-500 text-white border-red-500' : 'border-red-500/40 text-red-600 hover:bg-red-500/10',
    late: active ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-500/40 text-amber-600 hover:bg-amber-500/10',
    leave: active ? 'bg-blue-500 text-white border-blue-500' : 'border-blue-500/40 text-blue-600 hover:bg-blue-500/10',
  };
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${colors[status]}`}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

const STATUS_META: { key: AttendanceStatus; label: string; Icon: typeof CheckCircle2 }[] = [
  { key: 'present', label: 'Present', Icon: CheckCircle2 },
  { key: 'absent', label: 'Absent', Icon: XCircle },
  { key: 'late', label: 'Late', Icon: Clock },
  { key: 'leave', label: 'Leave', Icon: LogOut },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Mark Attendance
// ═══════════════════════════════════════════════════════════════════════════════
function MarkAttendanceTab() {
  const { token } = useAuth();
  const { classes: CLASS_OPTIONS, sections: SECTION_OPTIONS, shifts: SHIFT_OPTIONS, weeklyHolidays } = useAcademicConfig();
  const [cls, setCls] = useState('');
  const [section, setSection] = useState('');
  const [shift, setShift] = useState('');
  const [date, setDate] = useState(todayStr());
  const [students, setStudents] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [holidayForDate, setHolidayForDate] = useState<Holiday | null>(null);
  const [clearing, setClearing] = useState(false);

  useEffect(() => { if (CLASS_OPTIONS.length && !cls) setCls(CLASS_OPTIONS[0]); }, [CLASS_OPTIONS]);

  // Detect weekly holiday for the selected date
  const weeklyHolidayName = useMemo(() => {
    if (!date) return null;
    const d = new Date(date + 'T00:00:00.000Z');
    const dayName = WEEKDAYS[d.getUTCDay()];
    return (weeklyHolidays || []).includes(dayName as 'Sunday') ? dayName : null;
  }, [date, weeklyHolidays]);

  useEffect(() => {
    if (!token || !date) return;
    const month = date.slice(0, 7);
    getHolidays(month, token).then((res) => {
      if (res.success) {
        const dateUtc = date;
        const found = res.data.find((h) => h.date.slice(0, 10) === dateUtc);
        setHolidayForDate(found || null);
      }
    }).catch(() => {});
  }, [token, date]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getDailyAttendance(date, cls, section, shift, token);
      if (res.success) {
        setStudents(res.data.students);
        setLoaded(true);
      }
    } catch {
      toast.error('Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [token, date, cls, section, shift]);

  const setStatus = (idx: number, status: AttendanceStatus) => {
    setStudents((prev) => prev.map((s, i) => (i === idx ? { ...s, status } : s)));
  };

  const markAll = (status: AttendanceStatus) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const save = async () => {
    if (!token || students.length === 0) return;
    setSaving(true);
    try {
      const records = students.map((s) => ({ student_id: s.student_id, status: s.status }));
      const res = await markAttendance(date, cls, section, shift, records, token);
      if (res.success) {
        const smsCount = res.data?.smsSent || 0;
        const smsMsg = smsCount > 0 ? `. ${smsCount} absence SMS sent` : '';
        toast.success(`Attendance saved for Class ${cls}${section ? ' ' + section : ''}${smsMsg}`);
      }
    } catch {
      toast.error('Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const resetToHoliday = async () => {
    if (!token || !cls) return;
    setClearing(true);
    try {
      const res = await clearAttendance(date, cls, section, shift, token);
      if (res.success) {
        const count = res.data.deleted;
        toast.success(`Cleared ${count} record${count !== 1 ? 's' : ''} — date now shows as Holiday.`);
        setStudents((prev) => prev.map((s) => ({ ...s, status: 'present' })));
        setLoaded(false);
      }
    } catch {
      toast.error('Failed to clear attendance.');
    } finally {
      setClearing(false);
    }
  };

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, late: 0, leave: 0 };
    for (const s of students) c[s.status]++;
    return c;
  }, [students]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Select label="Class" value={cls} onChange={setCls} options={CLASS_OPTIONS} />
        <Select label="Section" value={section} onChange={setSection} options={SECTION_OPTIONS} allLabel="All" />
        <Select label="Shift" value={shift} onChange={setShift} options={SHIFT_OPTIONS} allLabel="All" />
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={load}
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Load Students'}
          </button>
        </div>
      </div>

      {/* Weekly holiday banner */}
      {weeklyHolidayName && !holidayForDate && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800/50 px-4 py-2.5 text-sm">
          <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-semibold text-indigo-700 dark:text-indigo-300">Weekly Holiday — {weeklyHolidayName}</span>
          <span className="text-xs text-indigo-500 hidden sm:inline">automatically excluded from attendance %</span>
        </div>
      )}

      {/* Manual holiday banner */}
      {holidayForDate && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50 px-4 py-2.5 text-sm">
          <PartyPopper className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="font-semibold text-amber-700 dark:text-amber-300">{holidayForDate.name}</span>
          {holidayForDate.description && (
            <span className="text-amber-600 dark:text-amber-400 hidden sm:inline">— {holidayForDate.description}</span>
          )}
          <span className="text-xs text-amber-500 hidden sm:inline">Holiday</span>
          {loaded && (
            <button
              onClick={resetToHoliday}
              disabled={clearing}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 disabled:opacity-50 transition-colors"
            >
              {clearing ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
              Reset to Holiday
            </button>
          )}
        </div>
      )}

      {loaded && students.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No active students found for this class.</p>
      )}

      {students.length > 0 && (
        <>
          {/* Batch actions + summary */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <button onClick={() => markAll('present')} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 transition-colors">
                Mark All Present
              </button>
              <button onClick={() => markAll('absent')} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/40 text-red-600 hover:bg-red-500/10 transition-colors">
                Mark All Absent
              </button>
              <button onClick={() => markAll('late')} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-500/40 text-amber-600 hover:bg-amber-500/10 transition-colors">
                Mark All Late
              </button>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-medium">
              <span className="text-emerald-500">Present: {counts.present}</span>
              <span className="text-red-500">Absent: {counts.absent}</span>
              <span className="text-amber-500">Late: {counts.late}</span>
              <span className="text-blue-500">Leave: {counts.leave}</span>
              <span className="text-muted-foreground">Total: {students.length}</span>
            </div>
          </div>

          {/* Student list */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-10">#</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Student ID</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-20">Roll</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.student_id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{s.studentId || '—'}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{s.studentName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.rollNo}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {STATUS_META.map((m) => (
                          <StatusButton
                            key={m.key}
                            status={m.key}
                            active={s.status === m.key}
                            onClick={() => setStatus(i, m.key)}
                            label={m.label}
                            Icon={m.Icon}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Attendance'}
          </button>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Monthly View
// ═══════════════════════════════════════════════════════════════════════════════
function MonthlyViewTab() {
  const { token } = useAuth();
  const { classes: CLASS_OPTIONS, sections: SECTION_OPTIONS, shifts: SHIFT_OPTIONS, weeklyHolidays } = useAcademicConfig();
  const school = useSchoolProfile();
  const [cls, setCls] = useState('');
  const [section, setSection] = useState('');
  const [shift, setShift] = useState('');
  const [month, setMonth] = useState(currentMonthStr());
  const [students, setStudents] = useState<MonthlyStudentRow[]>([]);
  const [totalDays, setTotalDays] = useState(0);
  const [daysInMonth, setDaysInMonth] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  useEffect(() => { if (CLASS_OPTIONS.length && !cls) setCls(CLASS_OPTIONS[0]); }, [CLASS_OPTIONS]);

  const holidayDays = useMemo(() => new Set(
    holidays.filter((h) => h.date.slice(0, 7) === month).map((h) => new Date(h.date).getUTCDate())
  ), [holidays, month]);

  // Compute which day numbers in this month fall on a weekly holiday
  const weeklyHolidayDays = useMemo(() => {
    const set = new Set<number>();
    if (!daysInMonth || !weeklyHolidays?.length) return set;
    const [y, m] = month.split('-').map(Number);
    for (let d = 1; d <= daysInMonth; d++) {
      const dayName = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
      if (weeklyHolidays.includes(dayName as 'Sunday')) set.add(d);
    }
    return set;
  }, [month, daysInMonth, weeklyHolidays]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [attRes, holRes] = await Promise.all([
        getMonthlyAttendance(month, cls, section, shift, token),
        getHolidays(month, token),
      ]);
      if (attRes.success) {
        setStudents(attRes.data.students);
        setTotalDays(attRes.data.totalDays);
        setDaysInMonth(attRes.data.daysInMonth);
        setLoaded(true);
      }
      if (holRes.success) setHolidays(holRes.data);
    } catch {
      toast.error('Failed to load monthly data.');
    } finally {
      setLoading(false);
    }
  }, [token, month, cls, section, shift]);

  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Select label="Class" value={cls} onChange={setCls} options={CLASS_OPTIONS} />
        <Select label="Section" value={section} onChange={setSection} options={SECTION_OPTIONS} allLabel="All" />
        <Select label="Shift" value={shift} onChange={setShift} options={SHIFT_OPTIONS} allLabel="All" />
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={load}
            disabled={loading}
            className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Load'}
          </button>
        </div>
      </div>

      {loaded && students.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No attendance data found.</p>
      )}

      {students.length > 0 && (
        <>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                const header = ['Student', 'Student ID', 'Roll', ...dayNumbers.map(String), 'Present', 'Absent', 'Late', 'Leave', '%'];
                const rows = students.map((s) => [
                  s.name,
                  s.studentId || '',
                  s.rollNo,
                  ...dayNumbers.map((d) => s.days[String(d)] || (weeklyHolidayDays.has(d) ? 'WH' : holidayDays.has(d) ? 'H' : '-')),
                  String(s.totalPresent),
                  String(s.totalAbsent),
                  String(s.totalLate),
                  String(s.totalLeave),
                  `${s.percentage}%`,
                ]);
                const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
                downloadCSV(`attendance-${cls}-${month}.csv`, csv);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV
            </button>
            <button
              onClick={() => printElement('monthly-table', `Monthly Attendance — Class ${cls} (${month})`, school, `Monthly Attendance — Class ${cls} (${month})`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>

          <div id="monthly-table" className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-xs min-w-max">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground sticky left-0 bg-muted/30 z-10 min-w-35">Student</th>
                    <th className="text-left px-2 py-2 font-medium text-muted-foreground w-20">Student ID</th>
                    <th className="text-left px-2 py-2 font-medium text-muted-foreground w-14">Roll</th>
                    {dayNumbers.map((d) => {
                      const wh = weeklyHolidayDays.has(d);
                      const h = holidayDays.has(d);
                      return (
                        <th key={d} className={`text-center px-1 py-2 font-medium w-8 ${wh ? 'text-indigo-500' : h ? 'text-amber-500' : 'text-muted-foreground'}`} title={wh ? 'Weekly Holiday' : h ? (holidays.find((x) => new Date(x.date).getUTCDate() === d)?.name || 'Holiday') : undefined}>
                          {d}
                          {wh && <span className="block text-[8px] leading-none">WH</span>}
                          {!wh && h && <span className="block text-[8px] leading-none">H</span>}
                        </th>
                      );
                    })}
                    <th className="text-center px-2 py-2 font-medium text-emerald-500 w-12">P</th>
                    <th className="text-center px-2 py-2 font-medium text-red-500 w-12">A</th>
                    <th className="text-center px-2 py-2 font-medium text-amber-500 w-12">L</th>
                    <th className="text-center px-2 py-2 font-medium text-blue-500 w-12">Lv</th>
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground w-14">%</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s._id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-foreground sticky left-0 bg-card z-10">{s.name}</td>
                      <td className="px-2 py-2 font-mono text-xs text-muted-foreground">{s.studentId || '—'}</td>
                      <td className="px-2 py-2 text-muted-foreground">{s.rollNo}</td>
                      {dayNumbers.map((d) => {
                        const val = s.days[String(d)];
                        const isHoliday = holidayDays.has(d);
                        const isWeekly = weeklyHolidayDays.has(d);
                        const bg = isWeekly ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : isHoliday ? 'bg-amber-50/50 dark:bg-amber-950/20' : '';
                        return (
                          <td key={d} className={`text-center px-1 py-2 ${bg}`}>
                            {val === 'P' && <span className="text-emerald-500 font-bold">P</span>}
                            {val === 'A' && <span className="text-red-500 font-bold">A</span>}
                            {val === 'L' && <span className="text-amber-500 font-bold">L</span>}
                            {val === 'Lv' && <span className="text-blue-500 font-bold">Lv</span>}
                            {!val && isWeekly && <span className="text-indigo-500 font-bold text-[10px]">WH</span>}
                            {!val && !isWeekly && isHoliday && <span className="text-amber-500 font-bold">H</span>}
                            {!val && !isWeekly && !isHoliday && <span className="text-muted-foreground/30">·</span>}
                          </td>
                        );
                      })}
                      <td className="text-center px-2 py-2 font-bold text-emerald-500">{s.totalPresent}</td>
                      <td className="text-center px-2 py-2 font-bold text-red-500">{s.totalAbsent}</td>
                      <td className="text-center px-2 py-2 font-bold text-amber-500">{s.totalLate}</td>
                      <td className="text-center px-2 py-2 font-bold text-blue-500">{s.totalLeave}</td>
                      <td className={`text-center px-2 py-2 font-bold ${s.percentage >= 80 ? 'text-emerald-500' : s.percentage >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                        {s.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground flex flex-wrap gap-3">
              <span>{totalDays} day{totalDays !== 1 ? 's' : ''} with attendance data recorded.</span>
              <span>Late counts as Present, Leave counts as Absent in % calculation.</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Reports (Class Monthly / Student Monthly / Student Yearly)
// ═══════════════════════════════════════════════════════════════════════════════
function ReportsTab() {
  const { token } = useAuth();
  const { classes: CLASS_OPTIONS, sections: SECTION_OPTIONS } = useAcademicConfig();
  const school = useSchoolProfile();

  const [reportType, setReportType] = useState<ReportType>('class-monthly');
  const [month, setMonth] = useState(currentMonthStr());
  const [year, setYear] = useState(currentYearStr());
  const [cls, setCls] = useState('');
  const [section, setSection] = useState('');
  const shift = '';
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Class Monthly state
  const [classSummary, setClassSummary] = useState<ClassSummary[]>([]);
  const [schoolSummary, setSchoolSummary] = useState<{ totalStudents: number; avgAttendance: number } | null>(null);
  const [classMonthlyTotals, setClassMonthlyTotals] = useState<AttendanceTotals>({ present: 0, absent: 0, late: 0, leave: 0 });
  const [classTotalDays, setClassTotalDays] = useState(0);
  const [classTotalRecords, setClassTotalRecords] = useState(0);

  // Student Monthly state
  const [studentMonthlyRows, setStudentMonthlyRows] = useState<StudentMonthlyRow[]>([]);
  const [studentMonthlyTotals, setStudentMonthlyTotals] = useState<AttendanceTotals>({ present: 0, absent: 0, late: 0, leave: 0 });
  const [studentMonthlyDaysInMonth, setStudentMonthlyDaysInMonth] = useState(0);

  // Student Yearly state
  const [studentYearlyRows, setStudentYearlyRows] = useState<StudentYearlyRow[]>([]);
  const [studentYearlyTotals, setStudentYearlyTotals] = useState<AttendanceTotals>({ present: 0, absent: 0, late: 0, leave: 0 });

  const reset = () => {
    setClassSummary([]); setSchoolSummary(null);
    setStudentMonthlyRows([]); setStudentYearlyRows([]);
    setLoaded(false);
  };

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    reset();
    try {
      if (reportType === 'class-monthly') {
        const res = await getAttendanceReport(month, token);
        if (res.success) {
          setClassSummary(res.data.classSummary);
          setSchoolSummary(res.data.schoolSummary);
          setClassTotalDays(res.data.totalDays);
          setClassMonthlyTotals(res.data.totals);
          setClassTotalRecords(res.data.totalRecords);
          setLoaded(true);
        }
      } else if (reportType === 'student-monthly') {
        const res = await getStudentMonthlyReport(month, { class: cls, section, shift, search }, token);
        if (res.success) {
          setStudentMonthlyRows(res.data.students);
          setStudentMonthlyTotals(res.data.totals);
          setStudentMonthlyDaysInMonth(res.data.daysInMonth);
          setLoaded(true);
        }
      } else {
        const res = await getStudentYearlyReport(year, { class: cls, section, shift, search }, token);
        if (res.success) {
          setStudentYearlyRows(res.data.students);
          setStudentYearlyTotals(res.data.totals);
          setLoaded(true);
        }
      }
    } catch {
      toast.error('Failed to load report.');
    } finally {
      setLoading(false);
    }
  }, [token, reportType, month, year, cls, section, shift, search]);

  // Cards derived from active report
  const cards = useMemo(() => {
    let totals: AttendanceTotals = { present: 0, absent: 0, late: 0, leave: 0 };
    let totalRecords = 0;
    let showing = 0;
    if (reportType === 'class-monthly') {
      totals = classMonthlyTotals;
      totalRecords = classTotalRecords;
      showing = classSummary.length;
    } else if (reportType === 'student-monthly') {
      totals = studentMonthlyTotals;
      totalRecords = totals.present + totals.absent + totals.late + totals.leave;
      showing = studentMonthlyRows.length;
    } else {
      totals = studentYearlyTotals;
      totalRecords = totals.present + totals.absent + totals.late + totals.leave;
      showing = studentYearlyRows.length;
    }
    const effective = totals.present + totals.late;
    const pct = totalRecords > 0 ? Math.round((effective / totalRecords) * 1000) / 10 : 0;
    return { totals, totalRecords, showing, pct };
  }, [reportType, classMonthlyTotals, classTotalRecords, classSummary, studentMonthlyTotals, studentMonthlyRows, studentYearlyTotals, studentYearlyRows]);

  const subtitle = reportType === 'class-monthly'
    ? `Class Monthly Report — ${month}`
    : reportType === 'student-monthly'
      ? `Student Monthly Report — ${month}`
      : `Student Yearly Report — ${year}`;

  const handleDownload = () => {
    let csv = '';
    if (reportType === 'class-monthly') {
      const header = ['Class', 'Section', 'Students', 'Avg Attendance (%)'];
      const rows = classSummary.map((c) => [c.class, c.section || '-', String(c.totalStudents), `${c.avgAttendance}%`]);
      rows.push(['', '', '', '']);
      if (schoolSummary) rows.push(['School Total', '', String(schoolSummary.totalStudents), `${schoolSummary.avgAttendance}%`]);
      csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    } else if (reportType === 'student-monthly') {
      const days = Array.from({ length: studentMonthlyDaysInMonth }, (_, i) => i + 1);
      const header = ['Student', 'Student ID', 'Class', 'Section', 'Roll', ...days.map(String), 'Present', 'Absent', 'Late', 'Leave', '%'];
      const rows = studentMonthlyRows.map((s) => [
        s.name, s.studentId || '', s.class, s.section || '-', s.rollNo,
        ...days.map((d) => s.days[String(d)] || '-'),
        String(s.totalPresent), String(s.totalAbsent), String(s.totalLate), String(s.totalLeave),
        `${s.percentage}%`,
      ]);
      csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    } else {
      const header = ['Student', 'Student ID', 'Class', 'Section', 'Roll', ...MONTH_NAMES.map((m) => `${m} %`), 'Year %'];
      const rows = studentYearlyRows.map((s) => [
        s.name, s.studentId || '', s.class, s.section || '-', s.rollNo,
        ...s.months.map((m) => `${m.percentage}%`),
        `${s.yearPercentage}%`,
      ]);
      csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    }
    const filename = `${reportType}-${reportType === 'student-yearly' ? year : month}.csv`;
    downloadCSV(filename, csv);
  };

  const handlePrint = () => {
    printElement('attendance-report-content', subtitle, school, subtitle);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="space-y-1 col-span-2 sm:col-span-1">
          <label className="text-xs font-medium text-muted-foreground">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => { setReportType(e.target.value as ReportType); reset(); }}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="class-monthly">Class Monthly Report</option>
            <option value="student-monthly">Student Monthly Report</option>
            <option value="student-yearly">Student Yearly Report</option>
          </select>
        </div>

        {reportType !== 'student-yearly' ? (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Year</label>
            <input
              type="number"
              value={year}
              min="2000"
              max="2100"
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        )}

        {reportType !== 'class-monthly' && (
          <>
            <Select label="Class" value={cls} onChange={setCls} options={CLASS_OPTIONS} allLabel="All" />
            <Select label="Section" value={section} onChange={setSection} options={SECTION_OPTIONS} allLabel="All" />
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Search Student</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, Roll, Phone"
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Search'}
          </button>
        </div>
      </div>

      {loaded && (
        <>
          {/* Header / Title */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-foreground">Attendance Report</h3>
            <div className="flex gap-2">
              <button onClick={handleDownload} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                <Download className="w-3.5 h-3.5" /> Download CSV
              </button>
              <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                <Printer className="w-3.5 h-3.5" /> Print / PDF
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SummaryCard label="Total Records" value={cards.totalRecords} accent="bg-slate-500/15 text-slate-500" icon={FileText} />
            <SummaryCard label="Present" value={cards.totals.present} accent="bg-emerald-500/15 text-emerald-500" icon={CheckCircle2} />
            <SummaryCard label="Absent" value={cards.totals.absent} accent="bg-red-500/15 text-red-500" icon={XCircle} />
            <SummaryCard label="Late" value={cards.totals.late} accent="bg-amber-500/15 text-amber-500" icon={Clock} />
            <SummaryCard label="Leave" value={cards.totals.leave} accent="bg-blue-500/15 text-blue-500" icon={LogOut} />
            <SummaryCard label="Attendance %" value={`${cards.pct}%`} accent="bg-violet-500/15 text-violet-500" icon={Percent} />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Eye className="w-3.5 h-3.5" /> Showing {cards.showing} record{cards.showing !== 1 ? 's' : ''}
            <span className="ml-2">Late counts as Present, Leave counts as Absent.</span>
          </div>

          {/* Report content (printable) */}
          <div id="attendance-report-content" className="space-y-4">
            {/* Printable summary cards mirror (visible only when printed via innerHTML) */}
            <div className="summary-cards" style={{ display: 'none' }}>
              <div className="summary-card"><div className="label">Total Records</div><div className="value">{cards.totalRecords}</div></div>
              <div className="summary-card"><div className="label">Present</div><div className="value">{cards.totals.present}</div></div>
              <div className="summary-card"><div className="label">Absent</div><div className="value">{cards.totals.absent}</div></div>
              <div className="summary-card"><div className="label">Late</div><div className="value">{cards.totals.late}</div></div>
              <div className="summary-card"><div className="label">Leave</div><div className="value">{cards.totals.leave}</div></div>
              <div className="summary-card"><div className="label">Attendance %</div><div className="value">{cards.pct}%</div></div>
            </div>

            {reportType === 'class-monthly' && (
              <ClassMonthlyReportContent
                classSummary={classSummary}
                schoolSummary={schoolSummary}
                totalDays={classTotalDays}
              />
            )}
            {reportType === 'student-monthly' && (
              <StudentMonthlyReportContent
                rows={studentMonthlyRows}
                daysInMonth={studentMonthlyDaysInMonth}
              />
            )}
            {reportType === 'student-yearly' && (
              <StudentYearlyReportContent rows={studentYearlyRows} year={year} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ClassMonthlyReportContent({
  classSummary, schoolSummary, totalDays,
}: {
  classSummary: ClassSummary[];
  schoolSummary: { totalStudents: number; avgAttendance: number } | null;
  totalDays: number;
}) {
  if (!schoolSummary) return null;
  return (
    <>
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-3">School Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-2xl font-extrabold text-foreground">{schoolSummary.avgAttendance}%</p>
            <p className="text-xs text-muted-foreground">Avg Attendance</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-foreground">{schoolSummary.totalStudents}</p>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </div>
          <div>
            <p className="text-2xl font-extrabold text-foreground">{totalDays}</p>
            <p className="text-xs text-muted-foreground">Days Recorded</p>
          </div>
        </div>
      </div>

      {classSummary.length > 0 ? (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground">Class-wise Attendance</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Class</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Section</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Students</th>
                <th className="text-center px-4 py-2.5 font-medium text-muted-foreground">Avg Attendance</th>
              </tr>
            </thead>
            <tbody>
              {classSummary.map((c, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium text-foreground">{c.class}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c.section || '—'}</td>
                  <td className="px-4 py-2.5 text-center text-foreground">{c.totalStudents}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`font-bold ${c.avgAttendance >= 80 ? 'text-emerald-500' : c.avgAttendance >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                      {c.avgAttendance}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">No attendance data recorded for this month.</p>
      )}
    </>
  );
}

function StudentMonthlyReportContent({
  rows, daysInMonth,
}: {
  rows: StudentMonthlyRow[];
  daysInMonth: number;
}) {
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  if (rows.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">No students match the filters.</p>;
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-xs min-w-max">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground sticky left-0 bg-muted/30 z-10">Student</th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground">Class</th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground">Sec</th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground">Roll</th>
              {days.map((d) => (
                <th key={d} className="text-center px-1 py-2 font-medium text-muted-foreground w-7">{d}</th>
              ))}
              <th className="text-center px-2 py-2 font-medium text-emerald-500">P</th>
              <th className="text-center px-2 py-2 font-medium text-red-500">A</th>
              <th className="text-center px-2 py-2 font-medium text-amber-500">L</th>
              <th className="text-center px-2 py-2 font-medium text-blue-500">Lv</th>
              <th className="text-center px-2 py-2 font-medium text-muted-foreground">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s._id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium text-foreground sticky left-0 bg-card z-10">{s.name}</td>
                <td className="px-2 py-2 text-muted-foreground">{s.class}</td>
                <td className="px-2 py-2 text-muted-foreground">{s.section || '—'}</td>
                <td className="px-2 py-2 text-muted-foreground">{s.rollNo}</td>
                {days.map((d) => {
                  const v = s.days[String(d)];
                  return (
                    <td key={d} className="text-center px-1 py-2">
                      {v === 'P' && <span className="text-emerald-500 font-bold">P</span>}
                      {v === 'A' && <span className="text-red-500 font-bold">A</span>}
                      {v === 'L' && <span className="text-amber-500 font-bold">L</span>}
                      {v === 'Lv' && <span className="text-blue-500 font-bold">Lv</span>}
                      {!v && <span className="text-muted-foreground/30">·</span>}
                    </td>
                  );
                })}
                <td className="text-center px-2 py-2 font-bold text-emerald-500">{s.totalPresent}</td>
                <td className="text-center px-2 py-2 font-bold text-red-500">{s.totalAbsent}</td>
                <td className="text-center px-2 py-2 font-bold text-amber-500">{s.totalLate}</td>
                <td className="text-center px-2 py-2 font-bold text-blue-500">{s.totalLeave}</td>
                <td className={`text-center px-2 py-2 font-bold ${s.percentage >= 80 ? 'text-emerald-500' : s.percentage >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                  {s.percentage}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentYearlyReportContent({ rows, year }: { rows: StudentYearlyRow[]; year: string | number }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">No students match the filters.</p>;
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="font-semibold text-foreground">Yearly Attendance — {year}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs min-w-max">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground sticky left-0 bg-muted/30 z-10">Student</th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground">Class</th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground">Sec</th>
              <th className="text-left px-2 py-2 font-medium text-muted-foreground">Roll</th>
              {MONTH_NAMES.map((m) => (
                <th key={m} className="text-center px-2 py-2 font-medium text-muted-foreground w-14">{m}</th>
              ))}
              <th className="text-center px-2 py-2 font-medium text-foreground">Year %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s._id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium text-foreground sticky left-0 bg-card z-10">{s.name}</td>
                <td className="px-2 py-2 text-muted-foreground">{s.class}</td>
                <td className="px-2 py-2 text-muted-foreground">{s.section || '—'}</td>
                <td className="px-2 py-2 text-muted-foreground">{s.rollNo}</td>
                {s.months.map((m) => (
                  <td key={m.month} className={`text-center px-2 py-2 font-medium ${m.recorded === 0 ? 'text-muted-foreground/40' : m.percentage >= 80 ? 'text-emerald-500' : m.percentage >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                    {m.recorded === 0 ? '—' : `${m.percentage}%`}
                  </td>
                ))}
                <td className={`text-center px-2 py-2 font-extrabold ${s.yearPercentage >= 80 ? 'text-emerald-500' : s.yearPercentage >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                  {s.yearPercentage}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — Holidays
// ═══════════════════════════════════════════════════════════════════════════════
function HolidaysTab() {
  const { token } = useAuth();
  const { weeklyHolidays } = useAcademicConfig();
  const [month, setMonth] = useState(currentMonthStr());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(todayStr());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getHolidays(month, token);
      if (res.success) setHolidays(res.data);
    } catch {
      toast.error('Failed to load holidays.');
    } finally {
      setLoading(false);
    }
  }, [token, month]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !date || !name.trim()) return;
    setSaving(true);
    try {
      const res = await createHoliday(date, name.trim(), description.trim(), token);
      if (res.success) {
        toast.success('Holiday added.');
        setName('');
        setDescription('');
        load();
      }
    } catch {
      toast.error('Failed to add holiday.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    setDeletingId(id);
    try {
      await deleteHoliday(id, token);
      toast.success('Holiday removed.');
      setHolidays((prev) => prev.filter((h) => h._id !== id));
    } catch {
      toast.error('Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Weekly holidays info */}
      <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50 rounded-xl p-4">
        <h3 className="font-semibold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-2">
          <CalendarDays className="w-4 h-4" /> Weekly Holidays
        </h3>
        <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80">
          {(weeklyHolidays || []).length > 0
            ? <>Configured: <strong>{weeklyHolidays.join(', ')}</strong>. These are auto-marked as holiday in attendance sheets.</>
            : 'No weekly holiday configured yet.'}
          {' '}Manage in <a href="/dashboard/settings/academic" className="underline font-medium">Academic Settings</a>.
        </p>
      </div>

      {/* Add holiday form */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Holiday
        </h3>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Holiday Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eid ul-Fitr"
              required
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Add Holiday'}
            </button>
          </div>
        </form>
      </div>

      {/* Holiday list for month */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">Holidays by Month</h3>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : holidays.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No holidays for {month}.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Description</th>
                <th className="w-12 px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((h) => (
                <tr key={h._id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    {new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-foreground">{h.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{h.description || '—'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(h._id)}
                      disabled={deletingId === h._id}
                      className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === h._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════════════════════
const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: 'mark', label: 'Mark Attendance', icon: Users },
  { key: 'monthly', label: 'Monthly View', icon: CalendarDays },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'holidays', label: 'Holidays', icon: PartyPopper },
];

export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>('mark');

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Attendance</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Mark daily attendance, view monthly records, and reports.</p>
      </div>

      <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'mark' && <MarkAttendanceTab />}
      {tab === 'monthly' && <MonthlyViewTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'holidays' && <HolidaysTab />}
    </div>
  );
}
