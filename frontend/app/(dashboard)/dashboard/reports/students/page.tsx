'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  FileDown,
  Loader2,
  CheckSquare,
  Square,
  RotateCcw,
  Users,
  SlidersHorizontal,
  Columns3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
import type { Student } from '@/types/student';
import type { SchoolPrintSettings } from '@/lib/studentPrint';
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
import { cn } from '@/lib/utils';

interface StudentReportRow extends Student {
  feeTotal?: number;
  feePaid?: number;
  feeDiscount?: number;
  feeDue?: number;
}

type ColumnGroup = 'Basic' | 'Academic' | 'Family & Contact' | 'Fees';

interface ColumnDef {
  key: string;
  label: string;
  group: ColumnGroup;
  numeric?: boolean;
  getValue: (row: StudentReportRow, index: number) => string | number;
}

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-GB') : '');

const ALL_COLUMNS: ColumnDef[] = [
  // Basic
  { key: 'sl', label: 'SL', group: 'Basic', numeric: true, getValue: (_r, i) => i + 1 },
  { key: 'studentId', label: 'Student ID', group: 'Basic', getValue: (r) => r.studentId || '' },
  { key: 'name', label: 'Student Name', group: 'Basic', getValue: (r) => r.name || '' },
  { key: 'nameBn', label: 'Name (বাংলা)', group: 'Basic', getValue: (r) => r.nameBn || '' },
  { key: 'gender', label: 'Gender', group: 'Basic', getValue: (r) => r.gender || '' },
  { key: 'dateOfBirth', label: 'Date of Birth', group: 'Basic', getValue: (r) => fmtDate(r.dateOfBirth) },
  { key: 'religion', label: 'Religion', group: 'Basic', getValue: (r) => r.religion || '' },
  { key: 'bloodGroup', label: 'Blood Group', group: 'Basic', getValue: (r) => r.bloodGroup || '' },
  { key: 'birthRegNo', label: 'Birth Reg. No.', group: 'Basic', getValue: (r) => r.birthRegNo || '' },

  // Academic
  { key: 'session', label: 'Session', group: 'Academic', getValue: (r) => r.session || '' },
  { key: 'class', label: 'Class', group: 'Academic', getValue: (r) => r.class || '' },
  { key: 'section', label: 'Section', group: 'Academic', getValue: (r) => r.section || '' },
  { key: 'shift', label: 'Shift', group: 'Academic', getValue: (r) => r.shift || '' },
  { key: 'group', label: 'Group', group: 'Academic', getValue: (r) => r.group || '' },
  { key: 'rollNo', label: 'Roll No.', group: 'Academic', getValue: (r) => r.rollNo || '' },
  { key: 'admissionDate', label: 'Admission Date', group: 'Academic', getValue: (r) => fmtDate(r.admissionDate) },
  { key: 'status', label: 'Status', group: 'Academic', getValue: (r) => r.status || '' },

  // Family & Contact
  { key: 'guardianPhone', label: 'Phone Number', group: 'Family & Contact', getValue: (r) => r.guardianPhone || '' },
  { key: 'whatsappNumber', label: 'WhatsApp', group: 'Family & Contact', getValue: (r) => r.whatsappNumber || '' },
  { key: 'fatherName', label: 'Father Name', group: 'Family & Contact', getValue: (r) => r.fatherName || '' },
  { key: 'fatherMobile', label: 'Father Mobile', group: 'Family & Contact', getValue: (r) => r.fatherMobile || '' },
  { key: 'fatherProfession', label: 'Father Profession', group: 'Family & Contact', getValue: (r) => r.fatherProfession || '' },
  {
    key: 'fatherMonthlyIncome',
    label: 'Father Income (৳)',
    group: 'Family & Contact',
    numeric: true,
    getValue: (r) => (r.fatherMonthlyIncome != null ? r.fatherMonthlyIncome : ''),
  },
  { key: 'motherName', label: 'Mother Name', group: 'Family & Contact', getValue: (r) => r.motherName || '' },
  { key: 'motherMobile', label: 'Mother Mobile', group: 'Family & Contact', getValue: (r) => r.motherMobile || '' },
  { key: 'motherProfession', label: 'Mother Profession', group: 'Family & Contact', getValue: (r) => r.motherProfession || '' },
  {
    key: 'motherMonthlyIncome',
    label: 'Mother Income (৳)',
    group: 'Family & Contact',
    numeric: true,
    getValue: (r) => (r.motherMonthlyIncome != null ? r.motherMonthlyIncome : ''),
  },
  { key: 'guardianName', label: 'Guardian Name', group: 'Family & Contact', getValue: (r) => r.guardianName || '' },
  { key: 'guardianRelation', label: 'Guardian Relation', group: 'Family & Contact', getValue: (r) => r.guardianRelation || '' },
  { key: 'address', label: 'Address', group: 'Family & Contact', getValue: (r) => r.address || '' },

  // Fees
  {
    key: 'monthlyFee',
    label: 'Monthly Fee (৳)',
    group: 'Fees',
    numeric: true,
    getValue: (r) => (r.monthlyFee != null ? r.monthlyFee : 0),
  },
  {
    key: 'feeTotal',
    label: 'Total Billed (৳)',
    group: 'Fees',
    numeric: true,
    getValue: (r) => r.feeTotal ?? 0,
  },
  {
    key: 'feePaid',
    label: 'Total Paid (৳)',
    group: 'Fees',
    numeric: true,
    getValue: (r) => r.feePaid ?? 0,
  },
  {
    key: 'feeDue',
    label: 'Current Due (৳)',
    group: 'Fees',
    numeric: true,
    getValue: (r) => r.feeDue ?? 0,
  },
];

const PRESETS: Record<string, { label: string; keys: string[] }> = {
  standard: {
    label: 'Standard List',
    keys: [
      'sl',
      'studentId',
      'name',
      'class',
      'section',
      'rollNo',
      'fatherName',
      'guardianPhone',
      'monthlyFee',
      'feeDue',
      'status',
    ],
  },
  contact: {
    label: 'Contact & Family',
    keys: [
      'sl',
      'studentId',
      'name',
      'class',
      'section',
      'rollNo',
      'fatherName',
      'fatherMobile',
      'motherName',
      'motherMobile',
      'guardianPhone',
      'whatsappNumber',
      'address',
    ],
  },
  fees: {
    label: 'Fee Summary',
    keys: [
      'sl',
      'studentId',
      'name',
      'session',
      'class',
      'section',
      'rollNo',
      'guardianPhone',
      'monthlyFee',
      'feeTotal',
      'feePaid',
      'feeDue',
    ],
  },
};

const STORAGE_KEY = 'student-report-columns-v1';

const selectClass = cn(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
);

export default function StudentReportPage() {
  const { token, school } = useAuth();
  const { classes, sections, shifts, groups } = useAcademicConfig();

  // Filter states
  const [sessionFilter, setSessionFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [genderFilter, setGenderFilter] = useState('');
  const [religionFilter, setReligionFilter] = useState('');
  const [bloodGroupFilter, setBloodGroupFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [sessions, setSessions] = useState<{ _id: string; name: string; year: string }[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolPrintSettings | null>(null);

  // Columns state
  const [selectedKeys, setSelectedKeys] = useState<string[]>(PRESETS.standard.keys);
  const [showColumnPicker, setShowColumnPicker] = useState(true);

  // Data state
  const [rows, setRows] = useState<StudentReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [capped, setCapped] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load saved columns from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedKeys(parsed);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const updateSelectedKeys = (next: string[]) => {
    setSelectedKeys(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!token) return;
    apiRequest<{ success: boolean; data: { _id: string; name: string; year: string }[] }>(
      '/api/academic/sessions?status=active',
      { token }
    )
      .then((res) => setSessions(res.data || []))
      .catch(() => {});

    apiRequest<{ success: boolean; data: SchoolPrintSettings }>('/api/settings', { token })
      .then((res) => {
        if (res.success && res.data) setSchoolSettings(res.data);
      })
      .catch(() => {});
  }, [token]);

  const fetchReport = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sessionFilter) params.set('session', sessionFilter);
      if (classFilter) params.set('class', classFilter);
      if (sectionFilter) params.set('section', sectionFilter);
      if (shiftFilter) params.set('shift', shiftFilter);
      if (groupFilter) params.set('group', groupFilter);
      params.set('status', statusFilter || 'active');
      if (genderFilter) params.set('gender', genderFilter);
      if (religionFilter) params.set('religion', religionFilter);
      if (bloodGroupFilter) params.set('bloodGroup', bloodGroupFilter);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      try {
        const res = await apiRequest<{
          success: boolean;
          data: StudentReportRow[];
          total: number;
          capped: boolean;
        }>(`/api/reports/students?${params.toString()}`, { token });

        setRows(res.data || []);
        setTotal(res.total ?? 0);
        setCapped(Boolean(res.capped));
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (/not found|404/i.test(msg)) {
          // Fallback to /api/students if backend server hasn't restarted with /api/reports/students yet
          const fallbackParams = new URLSearchParams();
          if (classFilter) fallbackParams.set('class', classFilter);
          if (sectionFilter) fallbackParams.set('section', sectionFilter);
          if (groupFilter) fallbackParams.set('group', groupFilter);
          fallbackParams.set('status', statusFilter || 'active');
          if (searchQuery.trim()) fallbackParams.set('q', searchQuery.trim());
          fallbackParams.set('limit', '100');

          const fallbackRes = await apiRequest<{
            success: boolean;
            data: StudentReportRow[];
            total: number;
          }>(`/api/students?${fallbackParams.toString()}`, { token });

          const filtered = (fallbackRes.data || []).filter((s) => {
            if (sessionFilter && s.session !== sessionFilter) return false;
            if (shiftFilter && s.shift !== shiftFilter) return false;
            if (genderFilter && s.gender !== genderFilter) return false;
            if (religionFilter && s.religion !== religionFilter) return false;
            if (bloodGroupFilter && s.bloodGroup !== bloodGroupFilter) return false;
            return true;
          });

          setRows(filtered);
          setTotal(filtered.length);
          setCapped(false);
        } else {
          throw err;
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load student report');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [
    token,
    sessionFilter,
    classFilter,
    sectionFilter,
    shiftFilter,
    groupFilter,
    statusFilter,
    genderFilter,
    religionFilter,
    bloodGroupFilter,
    searchQuery,
  ]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const activeColumns = useMemo(
    () => ALL_COLUMNS.filter((c) => selectedKeys.includes(c.key)),
    [selectedKeys]
  );

  const toggleColumn = (key: string) => {
    if (selectedKeys.includes(key)) {
      if (selectedKeys.length <= 1) {
        toast.error('Select at least one column.');
        return;
      }
      updateSelectedKeys(selectedKeys.filter((k) => k !== key));
    } else {
      updateSelectedKeys([...selectedKeys, key]);
    }
  };

  const resetFilters = () => {
    setSessionFilter('');
    setClassFilter('');
    setSectionFilter('');
    setShiftFilter('');
    setGroupFilter('');
    setStatusFilter('active');
    setGenderFilter('');
    setReligionFilter('');
    setBloodGroupFilter('');
    setSearchQuery('');
  };

  const filterSummaryText = useMemo(() => {
    const parts: string[] = [];
    if (sessionFilter) parts.push(`Session: ${sessionFilter}`);
    if (classFilter) parts.push(`Class: ${classFilter}`);
    if (sectionFilter) parts.push(`Section: ${sectionFilter}`);
    if (shiftFilter) parts.push(`Shift: ${shiftFilter}`);
    if (groupFilter) parts.push(`Group: ${groupFilter}`);
    parts.push(`Status: ${statusFilter.toUpperCase()}`);
    if (genderFilter) parts.push(`Gender: ${genderFilter}`);
    if (religionFilter) parts.push(`Religion: ${religionFilter}`);
    if (bloodGroupFilter) parts.push(`Blood Group: ${bloodGroupFilter}`);
    if (searchQuery.trim()) parts.push(`Search: "${searchQuery.trim()}"`);
    return parts.join(' · ');
  }, [
    sessionFilter,
    classFilter,
    sectionFilter,
    shiftFilter,
    groupFilter,
    statusFilter,
    genderFilter,
    religionFilter,
    bloodGroupFilter,
    searchQuery,
  ]);

  const handleDownloadExcel = () => {
    if (rows.length === 0) {
      toast.error('No student records to export.');
      return;
    }
    if (activeColumns.length === 0) {
      toast.error('Please select at least one column.');
      return;
    }

    const schoolTitle = school?.name || 'School Student Report';
    const headers = activeColumns.map((c) => c.label);
    const dataMatrix = rows.map((row, idx) =>
      activeColumns.map((col) => col.getValue(row, idx))
    );

    const sheetData = [
      [schoolTitle],
      [`Student Report — ${filterSummaryText}`],
      [`Generated on: ${new Date().toLocaleString('en-GB')} · Total Students: ${rows.length}`],
      [],
      headers,
      ...dataMatrix,
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Auto-size columns
    ws['!cols'] = activeColumns.map((col, colIdx) => {
      let maxLen = col.label.length;
      for (let r = 0; r < Math.min(rows.length, 200); r++) {
        const val = String(dataMatrix[r][colIdx] ?? '');
        if (val.length > maxLen) maxLen = val.length;
      }
      return { wch: Math.min(Math.max(maxLen + 3, 8), 38) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    const dateTag = new Date().toISOString().slice(0, 10);
    const classTag = classFilter ? `-class-${classFilter}` : '';
    XLSX.writeFile(wb, `student-report${classTag}-${dateTag}.xlsx`);
    toast.success('Excel report downloaded.');
  };

  const handleDownloadPdf = () => {
    if (rows.length === 0) {
      toast.error('No student records to export.');
      return;
    }
    if (activeColumns.length === 0) {
      toast.error('Please select at least one column.');
      return;
    }

    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Allow pop-ups to generate PDF.');
      return;
    }

    const isLandscape = activeColumns.length > 7;
    const schoolName = school?.name || 'School';
    const schoolNameBn = schoolSettings?.nameBn || '';
    const schoolAddress = schoolSettings?.address || '';
    const schoolContact = schoolSettings?.contact || '';
    const schoolLogo = schoolSettings?.logoUrl || '';

    const escapeHtml = (str: string | number) =>
      String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const theadHtml = activeColumns
      .map(
        (c) =>
          `<th class="${c.numeric ? 'num' : ''}">${escapeHtml(c.label)}</th>`
      )
      .join('');

    const tbodyHtml = rows
      .map((row, idx) => {
        const cells = activeColumns
          .map((c) => {
            const val = c.getValue(row, idx);
            const display =
              c.numeric && typeof val === 'number' && c.key !== 'sl'
                ? val.toLocaleString()
                : val;
            return `<td class="${c.numeric ? 'num' : ''}">${escapeHtml(display)}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Student Report - ${escapeHtml(schoolName)}</title>
  <style>
    @page { size: A4 ${isLandscape ? 'landscape' : 'portrait'}; margin: 10mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', 'SolaimanLipi', 'Kalpurush', 'Noto Sans Bengali', Arial, sans-serif;
      color: #111;
      background: #fff;
      font-size: ${activeColumns.length > 10 ? '8pt' : '9pt'};
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 2px solid #111;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }
    .header-logo { width: 56px; height: 56px; object-fit: contain; }
    .header-center { flex: 1; text-align: center; }
    .header-center h1 { font-size: 16pt; font-weight: 800; }
    .header-center h2 { font-size: 12pt; font-weight: 700; color: #222; }
    .header-center p { font-size: 8.5pt; color: #444; margin-top: 2px; }
    .meta-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f4f4f6;
      border: 1px solid #ccc;
      padding: 5px 8px;
      margin-bottom: 8px;
      font-size: 8.5pt;
      font-weight: 600;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      border: 1px solid #444;
      padding: 4px 6px;
      text-align: left;
      vertical-align: middle;
      word-break: break-word;
    }
    th {
      background: #e9e9ee;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8pt;
    }
    tr:nth-child(even) td { background: #fafafa; }
    .num { text-align: right; white-space: nowrap; }
    .footer {
      margin-top: 8px;
      font-size: 8pt;
      color: #666;
      display: flex;
      justify-content: space-between;
    }
    .toolbar {
      position: fixed;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 6px;
      z-index: 99;
    }
    .toolbar button {
      padding: 6px 14px;
      border: 1px solid #555;
      background: #fff;
      cursor: pointer;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .toolbar button.primary { background: #111; color: #fff; border-color: #111; }
    @media print {
      .toolbar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="primary" onclick="window.print()">Print / Save as PDF</button>
    <button onclick="window.close()">Close</button>
  </div>

  <div class="header">
    ${
      schoolLogo
        ? `<img src="${escapeHtml(schoolLogo)}" class="header-logo" alt="Logo" />`
        : `<div style="width:56px"></div>`
    }
    <div class="header-center">
      <h1>${escapeHtml(schoolName)}</h1>
      ${schoolNameBn ? `<h2>${escapeHtml(schoolNameBn)}</h2>` : ''}
      ${schoolAddress ? `<p>${escapeHtml(schoolAddress)}${schoolContact ? ` · Mobile: ${escapeHtml(schoolContact)}` : ''}</p>` : ''}
    </div>
    <div style="width:56px"></div>
  </div>

  <div class="meta-bar">
    <span>STUDENT REPORT — ${escapeHtml(filterSummaryText)}</span>
    <span>Total Students: ${rows.length}</span>
  </div>

  <table>
    <thead>
      <tr>${theadHtml}</tr>
    </thead>
    <tbody>
      ${tbodyHtml}
    </tbody>
  </table>

  <div class="footer">
    <span>Generated on ${new Date().toLocaleString('en-GB')}</span>
    <span>${escapeHtml(schoolName)}</span>
  </div>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
    }, 450);
    toast.success('Choose "Save as PDF" in the print dialog to save the PDF.');
  };

  const COLUMN_GROUPS: ColumnGroup[] = ['Basic', 'Academic', 'Family & Contact', 'Fees'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Student Report</h1>
          <p className="text-sm text-muted-foreground">
            Filter students by session, class, section, shift, group, or status, choose columns, and
            download in Excel or PDF.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowColumnPicker((v) => !v)}
            className="gap-1.5"
          >
            <Columns3 className="h-4 w-4" />
            Columns ({activeColumns.length})
          </Button>
          <Button
            type="button"
            onClick={handleDownloadExcel}
            disabled={loading || rows.length === 0}
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download Excel
          </Button>
          <Button
            type="button"
            onClick={handleDownloadPdf}
            disabled={loading || rows.length === 0}
            className="gap-1.5 bg-violet-600 text-white hover:bg-violet-700"
          >
            <FileDown className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-violet-600" /> Report Filters
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label htmlFor="rep-session">Academic Session</Label>
              <select
                id="rep-session"
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">All Sessions</option>
                {sessions.map((s) => (
                  <option key={s._id} value={s.name}>
                    {s.name}
                    {s.year ? ` (${s.year})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep-class">Class</Label>
              <select
                id="rep-class"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep-section">Section</Label>
              <select
                id="rep-section"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">All Sections</option>
                {sections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep-shift">Shift</Label>
              <select
                id="rep-shift"
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">All Shifts</option>
                {shifts.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep-group">Group</Label>
              <select
                id="rep-group"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">All Groups</option>
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep-status">Status</Label>
              <select
                id="rep-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={selectClass}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="left">Left</option>
                <option value="all">All Statuses</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep-gender">Gender</Label>
              <select
                id="rep-gender"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep-religion">Religion</Label>
              <select
                id="rep-religion"
                value={religionFilter}
                onChange={(e) => setReligionFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">All Religions</option>
                <option value="Islam">Islam</option>
                <option value="Hinduism">Hinduism</option>
                <option value="Christian">Christian</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep-blood">Blood Group</Label>
              <select
                id="rep-blood"
                value={bloodGroupFilter}
                onChange={(e) => setBloodGroupFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">All Blood Groups</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rep-search">Search</Label>
              <Input
                id="rep-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, ID, Roll, Phone..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Column Picker Card */}
      {showColumnPicker && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Columns3 className="h-4 w-4 text-violet-600" /> Select Columns to Include (
              {activeColumns.length} of {ALL_COLUMNS.length})
            </CardTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              {Object.entries(PRESETS).map(([k, preset]) => (
                <Button
                  key={k}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateSelectedKeys(preset.keys)}
                >
                  {preset.label}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => updateSelectedKeys(ALL_COLUMNS.map((c) => c.key))}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => updateSelectedKeys(['sl', 'studentId', 'name'])}
              >
                Minimal
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COLUMN_GROUPS.map((group) => {
              const groupCols = ALL_COLUMNS.filter((c) => c.group === group);
              return (
                <div
                  key={group}
                  className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-2"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </p>
                  <div className="space-y-1.5">
                    {groupCols.map((col) => {
                      const checked = selectedKeys.includes(col.key);
                      return (
                        <button
                          key={col.key}
                          type="button"
                          onClick={() => toggleColumn(col.key)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors',
                            checked
                              ? 'bg-violet-600/10 text-foreground font-medium'
                              : 'text-muted-foreground hover:bg-muted/60'
                          )}
                        >
                          {checked ? (
                            <CheckSquare className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                          ) : (
                            <Square className="h-3.5 w-3.5 shrink-0 opacity-60" />
                          )}
                          <span className="truncate">{col.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Preview Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3">
          <div>
            <CardTitle className="text-base">
              Report Preview ({rows.length} {rows.length === 1 ? 'student' : 'students'})
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{filterSummaryText}</p>
          </div>
          {capped && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Showing first {rows.length} of {total} students. Narrow filters for smaller batches.
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading report data...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No students match the selected filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {activeColumns.map((col) => (
                        <TableHead
                          key={col.key}
                          className={cn('whitespace-nowrap', col.numeric && 'text-right')}
                        >
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 100).map((row, idx) => (
                      <TableRow key={row._id}>
                        {activeColumns.map((col) => {
                          const raw = col.getValue(row, idx);
                          const formatted =
                            col.numeric && typeof raw === 'number' && col.key !== 'sl'
                              ? `৳ ${raw.toLocaleString()}`
                              : raw || '—';

                          if (col.key === 'name') {
                            return (
                              <TableCell key={col.key} className="font-medium whitespace-nowrap">
                                <Link
                                  href={`/dashboard/students/${row._id}`}
                                  className="hover:text-violet-600 dark:hover:text-violet-400 hover:underline"
                                >
                                  {row.name}
                                </Link>
                              </TableCell>
                            );
                          }

                          return (
                            <TableCell
                              key={col.key}
                              className={cn(
                                'whitespace-nowrap',
                                col.numeric && 'text-right',
                                col.key === 'feeDue' &&
                                  Number(row.feeDue || 0) > 0 &&
                                  'text-destructive font-semibold'
                              )}
                            >
                              {formatted}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 100 && (
                <div className="border-t border-border px-4 py-3 text-center text-xs text-muted-foreground">
                  Previewing first 100 of {rows.length} rows. Downloading Excel or PDF will include
                  all {rows.length} students.
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
