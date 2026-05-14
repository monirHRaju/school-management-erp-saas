'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getDailyAttendance,
  markAttendance,
  getMonthlyAttendance,
  getAttendanceReport,
  getHolidays,
  createHoliday,
  deleteHoliday,
  clearAttendance,
} from '@/lib/attendance';
import type { Holiday } from '@/lib/attendance';
import type { AttendanceRecord, MonthlyStudentRow, ClassSummary } from '@/types/attendance';
import toast from 'react-hot-toast';
import { Loader2, Users, CalendarDays, BarChart3, CheckCircle2, XCircle, Download, Printer, PartyPopper, Trash2, Plus } from 'lucide-react';
import { useAcademicConfig } from '@/lib/useAcademicConfig';

type Tab = 'mark' | 'monthly' | 'reports' | 'holidays';

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

// ─── Print helper ────────────────────────────────────────────────────────────
function printElement(elementId: string, title: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html><head><title>${title}</title>
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
      @media print { button { display: none; } }
    </style></head><body>
    <h2>${title}</h2>
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

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Mark Attendance
// ═══════════════════════════════════════════════════════════════════════════════
function MarkAttendanceTab() {
  const { token } = useAuth();
  const { classes: CLASS_OPTIONS, sections: SECTION_OPTIONS, shifts: SHIFT_OPTIONS } = useAcademicConfig();
  const [cls, setCls] = useState('');
  const [section, setSection] = useState('');
  const [shift, setShift] = useState('');
  const [date, setDate] = useState(todayStr());
  const [students, setStudents] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [holidayForDate, setHolidayForDate] = useState<Holiday | null>(null);
  const [holidaysThisMonth, setHolidaysThisMonth] = useState<Holiday[]>([]);
  const [clearing, setClearing] = useState(false);

  // Set default class once config loads
  useEffect(() => { if (CLASS_OPTIONS.length && !cls) setCls(CLASS_OPTIONS[0]); }, [CLASS_OPTIONS]);

  // Fetch holidays for the selected month
  useEffect(() => {
    if (!token || !date) return;
    const month = date.slice(0, 7);
    getHolidays(month, token).then((res) => {
      if (res.success) {
        setHolidaysThisMonth(res.data);
        const dateUtc = date; // YYYY-MM-DD
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

  const toggle = (idx: number) => {
    setStudents((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, status: s.status === 'present' ? 'absent' : 'present' } : s))
    );
  };

  const markAll = (status: 'present' | 'absent') => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const save = async () => {
    if (!token || students.length === 0) return;
    setSaving(true);
    try {
      const records = students.map((s) => ({ student_id: s.student_id, status: s.status }));
      const res = await markAttendance(date, cls, section, shift, records, token);
      if (res.success) {
        const smsCount = (res.data as { smsSent?: number })?.smsSent || 0;
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

  const presentCount = students.filter((s) => s.status === 'present').length;
  const absentCount = students.length - presentCount;

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

      {/* Holiday banner */}
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
              {clearing
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <XCircle className="w-3 h-3" />}
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
          {/* Quick actions + summary */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <button onClick={() => markAll('present')} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                Mark All Present
              </button>
              <button onClick={() => markAll('absent')} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors">
                Mark All Absent
              </button>
            </div>
            <div className="flex gap-3 text-xs font-medium">
              <span className="text-emerald-500">Present: {presentCount}</span>
              <span className="text-red-500">Absent: {absentCount}</span>
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
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-32">Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.student_id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{s.studentId || '—'}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{s.studentName}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{s.rollNo}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => toggle(i)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          s.status === 'present'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-red-500/15 text-red-500'
                        }`}
                      >
                        {s.status === 'present' ? (
                          <><CheckCircle2 className="w-3.5 h-3.5" /> Present</>
                        ) : (
                          <><XCircle className="w-3.5 h-3.5" /> Absent</>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Save */}
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
  const { classes: CLASS_OPTIONS, sections: SECTION_OPTIONS, shifts: SHIFT_OPTIONS } = useAcademicConfig();
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

  // Build a set of holiday day-numbers for the current month
  const holidayDays = new Set(
    holidays
      .filter((h) => h.date.slice(0, 7) === month)
      .map((h) => new Date(h.date).getUTCDate())
  );

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
          {/* Download & Print */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                const header = ['Student', 'Student ID', 'Roll', ...dayNumbers.map(String), 'Total', '%'];
                const rows = students.map((s) => [
                  s.name,
                  s.studentId || '',
                  s.rollNo,
                  ...dayNumbers.map((d) => s.days[String(d)] || '-'),
                  `${s.totalPresent}/${totalDays}`,
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
              onClick={() => printElement('monthly-table', `Monthly Attendance — Class ${cls} (${month})`)}
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
                    {dayNumbers.map((d) => (
                      <th key={d} className={`text-center px-1 py-2 font-medium w-8 ${holidayDays.has(d) ? 'text-amber-500' : 'text-muted-foreground'}`} title={holidayDays.has(d) ? (holidays.find((h) => new Date(h.date).getUTCDate() === d)?.name || 'Holiday') : undefined}>
                        {d}
                        {holidayDays.has(d) && <span className="block text-[8px] leading-none">H</span>}
                      </th>
                    ))}
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground w-14">Total</th>
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
                        return (
                          <td key={d} className={`text-center px-1 py-2 ${isHoliday ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                            {isHoliday && !val && <span className="text-amber-500 font-bold text-xs">H</span>}
                            {!isHoliday && val === 'P' && <span className="text-emerald-500 font-bold">P</span>}
                            {val === 'A' && <span className="text-red-500 font-bold">A</span>}
                            {val === 'P' && isHoliday && <span className="text-emerald-500 font-bold">P</span>}
                            {!val && !isHoliday && <span className="text-muted-foreground/30">·</span>}
                          </td>
                        );
                      })}
                      <td className="text-center px-2 py-2 font-medium text-foreground">
                        {s.totalPresent}/{totalDays}
                      </td>
                      <td className={`text-center px-2 py-2 font-bold ${s.percentage >= 80 ? 'text-emerald-500' : s.percentage >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                        {s.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-border bg-muted/20 text-xs text-muted-foreground">
              {totalDays} day{totalDays !== 1 ? 's' : ''} with attendance data recorded
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Reports
// ═══════════════════════════════════════════════════════════════════════════════
function ReportsTab() {
  const { token } = useAuth();
  const [month, setMonth] = useState(currentMonthStr());
  const [classSummary, setClassSummary] = useState<ClassSummary[]>([]);
  const [schoolSummary, setSchoolSummary] = useState<{ totalStudents: number; avgAttendance: number } | null>(null);
  const [totalDays, setTotalDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getAttendanceReport(month, token);
      if (res.success) {
        setClassSummary(res.data.classSummary);
        setSchoolSummary(res.data.schoolSummary);
        setTotalDays(res.data.totalDays);
        setLoaded(true);
      }
    } catch {
      toast.error('Failed to load report.');
    } finally {
      setLoading(false);
    }
  }, [token, month]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg">
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Load Report'}
          </button>
        </div>
      </div>

      {loaded && schoolSummary && (
        <>
          {/* Download & Print */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                const header = ['Class', 'Section', 'Students', 'Avg Attendance (%)'];
                const rows = classSummary.map((c) => [c.class, c.section || '-', String(c.totalStudents), `${c.avgAttendance}%`]);
                rows.push(['', '', '', '']);
                rows.push(['School Total', '', String(schoolSummary.totalStudents), `${schoolSummary.avgAttendance}%`]);
                const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
                downloadCSV(`attendance-report-${month}.csv`, csv);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV
            </button>
            <button
              onClick={() => printElement('report-content', `Attendance Report — ${month}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>

          <div id="report-content">
          {/* School Summary */}
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

          {/* Class-wise */}
          {classSummary.length > 0 && (
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
          )}

          {classSummary.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No attendance data recorded for this month.</p>
          )}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — Holidays
// ═══════════════════════════════════════════════════════════════════════════════
function HolidaysTab() {
  const { token } = useAuth();
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
                      {deletingId === h._id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />}
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

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'mark' && <MarkAttendanceTab />}
      {tab === 'monthly' && <MonthlyViewTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'holidays' && <HolidaysTab />}
    </div>
  );
}
