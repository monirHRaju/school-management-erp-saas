'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Printer, BookMarked } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AnnualRow {
  student: { _id: string; name: string; rollNumber?: string; admissionId?: string; session?: string; class?: string };
  total: number;
  gpa: string;
  hasFail: boolean;
  result: 'PASS' | 'FAIL';
  rank: number;
}

export default function AnnualResultPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [sessionFilter, setSessionFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [rows, setRows] = useState<AnnualRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sessions, setSessions] = useState<string[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const { classes, sections, loading: configLoading } = useAcademicConfig();

  useEffect(() => {
    if (!token) return;
    const fetchSessions = async () => {
      try {
        const res = await apiRequest<{ success: boolean; data: { session: string }[] }>('/api/academic/sessions', { token });
        setSessions(res.data.map(item => item.session));
      } catch (e) {
        console.error('Failed to fetch sessions', e);
      } finally {
        setSessionsLoading(false);
      }
    };
    fetchSessions();
  }, [token]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sessionFilter) params.set('session', sessionFilter);
      if (classFilter) params.set('class', classFilter);
      if (sectionFilter) params.set('section', sectionFilter);
      const res = await apiRequest<{ success: boolean; data: AnnualRow[] }>(`/api/results/report/annual?${params}`, { token: token ?? undefined });
      setRows(res.data);
      setSearched(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const goToPrint = (studentId: string) => {
    const params = new URLSearchParams();
    params.set('studentId', studentId);
    if (sessionFilter) params.set('session', sessionFilter);
    router.push(`/dashboard/results/print?${params}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookMarked className="h-6 w-6" />
            Annual Result Report
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Aggregate results across all exams for a session.</p>
        </div>
        {rows.length > 0 && (
          <Button variant="outline" onClick={() => window.print()} className="gap-2 print:hidden">
            <Printer className="h-4 w-4" />
            Print All
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-end print:hidden">
        <div className="space-y-1">
          <Label className="text-xs">Session <span className="text-destructive">*</span></Label>
          <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}
            className="h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={sessionsLoading}>
            <option value="">Session</option>
            {sessions.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Class</Label>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
            className="h-10 w-28 rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={configLoading}>
            <option value="">Class</option>
            {classes.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Section</Label>
          <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}
            className="h-10 w-28 rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={configLoading}>
            <option value="">Section</option>
            {sections.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
        <Button onClick={handleSearch} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </Button>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-center font-medium">SL</th>
              <th className="px-4 py-3 text-left font-medium">Student Name</th>
              <th className="px-4 py-3 text-left font-medium">Session</th>
              <th className="px-4 py-3 text-left font-medium">Class</th>
              <th className="px-4 py-3 text-left font-medium">Roll</th>
              <th className="px-4 py-3 text-left font-medium">Admission ID</th>
              <th className="px-4 py-3 text-center font-medium">Total</th>
              <th className="px-4 py-3 text-center font-medium">GPA</th>
              <th className="px-4 py-3 text-center font-medium">Result</th>
              <th className="px-4 py-3 text-center font-medium print:hidden">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : !searched ? (
              <tr><td colSpan={10} className="py-12 text-center text-muted-foreground">Use filters above and press Search.</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="py-12 text-center text-muted-foreground">No results found.</td></tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.student._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-center text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{row.student.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.student.session || sessionFilter || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.student.class || classFilter || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.student.rollNumber || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.student.admissionId || '—'}</td>
                  <td className="px-4 py-3 text-center font-semibold">{row.total}</td>
                  <td className="px-4 py-3 text-center">{row.gpa}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.result === 'PASS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {row.result}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center print:hidden">
                    <Button size="sm" variant="outline" onClick={() => goToPrint(row.student._id)} className="gap-1">
                      <Printer className="h-3 w-3" />
                      Print
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
