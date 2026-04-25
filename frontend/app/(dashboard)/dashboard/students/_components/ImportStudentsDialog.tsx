'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
import { apiRequest } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, Download, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Column alias map (lowercase header → field key) ──────────────────────────
const COL: Record<string, string> = {
  'name': 'name', 'student name': 'name', 'student_name': 'name', 'full name': 'name',
  'roll': 'rollNo', 'roll no': 'rollNo', 'roll_no': 'rollNo', 'roll number': 'rollNo', 'rollno': 'rollNo',
  'father': 'fatherName', 'father name': 'fatherName', 'father_name': 'fatherName',
  'mother': 'motherName', 'mother name': 'motherName', 'mother_name': 'motherName',
  'guardian': 'guardianName', 'guardian name': 'guardianName', 'guardian_name': 'guardianName',
  'phone': 'guardianPhone', 'guardian phone': 'guardianPhone', 'guardian_phone': 'guardianPhone',
  'contact': 'guardianPhone', 'mobile': 'guardianPhone', 'mobile no': 'guardianPhone',
  'gender': 'gender', 'sex': 'gender',
  'religion': 'religion',
  'dob': 'dateOfBirth', 'date of birth': 'dateOfBirth', 'dateofbirth': 'dateOfBirth',
  'birth date': 'dateOfBirth', 'birthdate': 'dateOfBirth',
  'fee': 'monthlyFee', 'monthly fee': 'monthlyFee', 'monthlyfee': 'monthlyFee', 'monthly_fee': 'monthlyFee',
  'address': 'address', 'addr': 'address',
  'whatsapp': 'whatsappNumber', 'whatsapp number': 'whatsappNumber', 'whatsapp_number': 'whatsappNumber',
  'class': 'class', 'grade': 'class', 'std': 'class', 'standard': 'class',
  'section': 'section', 'sec': 'section',
  'shift': 'shift',
  'group': 'group', 'stream': 'group',
};

interface ParsedRow {
  name: string;
  rollNo?: string;
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  guardianPhone?: string;
  gender?: string;
  religion?: string;
  dateOfBirth?: string;
  monthlyFee?: string | number;
  address?: string;
  whatsappNumber?: string;
  class?: string;
  section?: string;
  shift?: string;
  group?: string;
}

interface ImportDefaults {
  class: string;
  section: string;
  shift: string;
  group: string;
  monthlyFee: string;
  admissionDate: string;
}

interface FailedRow { row: number; name: string; error: string }

type Step = 'setup' | 'preview' | 'result';

const TEMPLATE_HEADERS = 'Name*,Roll No,Father Name,Mother Name,Guardian Name,Guardian Phone,Gender,Religion,Date of Birth,Monthly Fee,Address';
const TEMPLATE_SAMPLE = [
  'Ahmad Ali,1,Mr. Ali,Mrs. Ali,Mr. Ali,01712345678,Male,Islam,2015-01-15,500,123 Main Street',
  'Fatima Begum,2,Mr. Karim,Mrs. Karim,Mr. Karim,01812345678,Female,Islam,2016-03-20,500,456 Oak Avenue',
].join('\n');

function downloadTemplate() {
  const csv = `${TEMPLATE_HEADERS}\n${TEMPLATE_SAMPLE}`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'student_import_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

async function parseFile(file: File): Promise<ParsedRow[]> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (raw.length < 2) return [];

  // First row is headers
  const headers = (raw[0] as any[]).map((h) => String(h ?? '').toLowerCase().trim());

  const rows: ParsedRow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const cells = raw[i] as any[];
    // Skip completely empty rows
    if (cells.every((c) => c === '' || c == null)) continue;

    const obj: any = {};
    headers.forEach((h, idx) => {
      const field = COL[h];
      if (!field) return;
      let val = cells[idx];
      // xlsx returns Date objects for date cells
      if (val instanceof Date) {
        val = val.toISOString().slice(0, 10);
      }
      obj[field] = val !== undefined && val !== null ? String(val).trim() : '';
    });
    rows.push(obj as ParsedRow);
  }
  return rows;
}

export default function ImportStudentsDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const { token } = useAuth();
  const { classes, sections, shifts, groups } = useAcademicConfig();

  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('setup');

  const [defaults, setDefaults] = useState<ImportDefaults>({
    class: '', section: '', shift: '', group: '', monthlyFee: '', admissionDate: '',
  });

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  const [resultCreated, setResultCreated] = useState(0);
  const [resultFailed, setResultFailed] = useState<FailedRow[]>([]);
  const [resultTotal, setResultTotal] = useState(0);

  function reset() {
    setStep('setup');
    setRows([]);
    setFileName('');
    setDefaults({ class: '', section: '', shift: '', group: '', monthlyFee: '', admissionDate: '' });
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    try {
      const parsed = await parseFile(file);
      if (parsed.length === 0) {
        toast.error('No data rows found. Make sure the file has headers in row 1 and data from row 2.');
        return;
      }
      setRows(parsed);
      setFileName(file.name);
      setStep('preview');
    } catch (err: any) {
      toast.error(`Could not parse file: ${err.message}`);
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function handleImport() {
    if (!token) return;
    setImporting(true);
    try {
      const res = await apiRequest<{ success: boolean; created: number; failed: FailedRow[]; total: number }>(
        '/api/students/bulk',
        {
          method: 'POST',
          token,
          body: JSON.stringify({ defaults, students: rows }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      setResultCreated(res.created);
      setResultFailed(res.failed || []);
      setResultTotal(res.total);
      setStep('result');
      if (res.created > 0) onImported();
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  const previewRows = rows.slice(0, 8);
  const hiddenCount = rows.length - previewRows.length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import Students from CSV / Excel
          </DialogTitle>
        </DialogHeader>

        {/* ── Step indicator ── */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
          {(['setup', 'preview', 'result'] as Step[]).map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              {i > 0 && <span className="mx-1">›</span>}
              <span className={step === s ? 'font-semibold text-foreground' : ''}>
                {i + 1}. {s === 'setup' ? 'Set Defaults' : s === 'preview' ? 'Preview' : 'Results'}
              </span>
            </span>
          ))}
        </div>

        {/* ══ STEP 1: Setup ══════════════════════════════════════════════════ */}
        {step === 'setup' && (
          <div className="space-y-5">
            <div className="rounded-lg bg-muted/40 border border-border p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Step 1 — Pre-fill defaults for all students</p>
              <p className="text-xs text-muted-foreground">
                These values apply to every row. Columns in your file override them individually.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Class</Label>
                  <select
                    value={defaults.class}
                    onChange={(e) => setDefaults((d) => ({ ...d, class: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— none —</option>
                    {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Section</Label>
                  <select
                    value={defaults.section}
                    onChange={(e) => setDefaults((d) => ({ ...d, section: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— none —</option>
                    {sections.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Shift</Label>
                  <select
                    value={defaults.shift}
                    onChange={(e) => setDefaults((d) => ({ ...d, shift: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— none —</option>
                    {shifts.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Group</Label>
                  <select
                    value={defaults.group}
                    onChange={(e) => setDefaults((d) => ({ ...d, group: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— none —</option>
                    {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly Fee (default)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={defaults.monthlyFee}
                    onChange={(e) => setDefaults((d) => ({ ...d, monthlyFee: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Admission Date (default)</Label>
                  <Input
                    type="date"
                    value={defaults.admissionDate}
                    onChange={(e) => setDefaults((d) => ({ ...d, admissionDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Step 2 — Upload your file</p>
              <div className="rounded-lg border-2 border-dashed border-border p-6 text-center space-y-3">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="text-sm text-muted-foreground">CSV or Excel (.xlsx, .xls) file</p>
                  <p className="text-xs text-muted-foreground mt-1">Required column: <strong>Name</strong></p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={parsing}
                  className="gap-2"
                >
                  {parsing
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Parsing…</>
                    : <><Upload className="h-4 w-4" /> Choose File</>
                  }
                </Button>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Don&apos;t have a file?</span>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" /> Download template CSV
                </button>
              </div>

              <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Recognised column headers:</p>
                <p>Name, Roll No, Father Name, Mother Name, Guardian Name, Guardian Phone, Gender, Religion, Date of Birth, Monthly Fee, Address, WhatsApp Number, Class, Section, Shift, Group</p>
                <p className="mt-1">Headers are case-insensitive. Up to 500 rows per import.</p>
              </div>
            </div>
          </div>
        )}

        {/* ══ STEP 2: Preview ════════════════════════════════════════════════ */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {rows.length} student{rows.length !== 1 ? 's' : ''} found in <span className="text-primary">{fileName}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Defaults applied: {[
                    defaults.class && `Class: ${defaults.class}`,
                    defaults.section && `Section: ${defaults.section}`,
                    defaults.shift && `Shift: ${defaults.shift}`,
                    defaults.group && `Group: ${defaults.group}`,
                    defaults.monthlyFee && `Fee: ${defaults.monthlyFee}`,
                  ].filter(Boolean).join(' · ') || 'none'}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep('setup')}>← Back</Button>
            </div>

            <div className="rounded-lg border border-border overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-left font-medium">Roll</th>
                    <th className="px-3 py-2 text-left font-medium">Guardian Phone</th>
                    <th className="px-3 py-2 text-left font-medium">Class</th>
                    <th className="px-3 py-2 text-left font-medium">Section</th>
                    <th className="px-3 py-2 text-left font-medium">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewRows.map((r, i) => (
                    <tr key={i} className={`bg-card ${!r.name ? 'text-destructive' : ''}`}>
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">
                        {r.name || <span className="text-destructive">— missing —</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.rollNo || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.guardianPhone || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.class || defaults.class || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.section || defaults.section || '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.monthlyFee || defaults.monthlyFee || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hiddenCount > 0 && (
                <p className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 text-center">
                  + {hiddenCount} more row{hiddenCount !== 1 ? 's' : ''} not shown in preview
                </p>
              )}
            </div>

            {rows.some((r) => !r.name) && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Some rows are missing a Name and will be skipped during import.
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 3: Results ════════════════════════════════════════════════ */}
        {step === 'result' && (
          <div className="space-y-4">
            <div className={`rounded-lg border p-4 flex items-start gap-3 ${resultFailed.length === 0 ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
              {resultFailed.length === 0
                ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                : <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              }
              <div>
                <p className="text-sm font-medium text-foreground">
                  {resultCreated} of {resultTotal} student{resultTotal !== 1 ? 's' : ''} imported successfully
                </p>
                {resultFailed.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">{resultFailed.length} row{resultFailed.length !== 1 ? 's' : ''} failed</p>
                )}
              </div>
            </div>

            {resultFailed.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Row</th>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {resultFailed.map((f) => (
                      <tr key={f.row} className="bg-card">
                        <td className="px-3 py-2 text-muted-foreground">{f.row}</td>
                        <td className="px-3 py-2 font-medium">{f.name}</td>
                        <td className="px-3 py-2 text-destructive">{f.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === 'setup' && (
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={importing}>Cancel</Button>
              <Button onClick={handleImport} disabled={importing || rows.length === 0}>
                {importing
                  ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Importing…</>
                  : `Import ${rows.length} Student${rows.length !== 1 ? 's' : ''}`
                }
              </Button>
            </>
          )}
          {step === 'result' && (
            <>
              {resultFailed.length > 0 && (
                <Button variant="outline" onClick={reset}>Import Again</Button>
              )}
              <Button onClick={handleClose}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
