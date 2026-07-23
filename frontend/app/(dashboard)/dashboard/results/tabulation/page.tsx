'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Printer, Table } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SubjectResult {
  writtenMark: number;
  mcqMark: number;
  practicalMark: number;
  totalMark: number;
  grade: string;
  gradePoint: number;
  isFail: boolean;
}

interface TabulationRow {
  student: { _id: string; name: string; rollNumber?: string };
  subjects: Record<string, SubjectResult>;
  total: number;
  gpa: string;
  rank: number;
}

interface TabulationData {
  subjects: string[];
  rows: TabulationRow[];
}

export default function TabulationPage() {
  const { token } = useAuth();

  const [sessionFilter, setSessionFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [examId, setExamId] = useState('');
  const [data, setData] = useState<TabulationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<string[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const { classes, sections, loading: configLoading } = useAcademicConfig();

  useEffect(() => {
    if (!token) return;
    const fetchSessions = async () => {
      try {
        const res = await apiRequest<{ success: boolean; data: { name: string; year: string }[] }>('/api/academic/sessions', { token });
        setSessions(res.data.map(item => item.name));
      } catch (e) {
        console.error('Failed to fetch sessions', e);
      } finally {
        setSessionsLoading(false);
      }
    };
    fetchSessions();
  }, [token]);

  const handleSearch = async () => {
    if (!classFilter.trim()) { toast.error('Class is required'); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sessionFilter) params.set('session', sessionFilter);
      params.set('class', classFilter);
      if (sectionFilter) params.set('section', sectionFilter);
      if (examId) params.set('exam_id', examId);
      const res = await apiRequest<{ success: boolean; data: TabulationData }>(`/api/results/tabulation?${params}`, { token: token ?? undefined });
      setData(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load tabulation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Table className="h-6 w-6" />
            Tabulation Sheet
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Student marks across all subjects.</p>
        </div>
        {data && (
          <Button variant="outline" onClick={() => window.print()} className="gap-2 print:hidden">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 print:hidden">
        <div className="space-y-1">
          <Label className="text-xs">Session</Label>
          <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}
            className="h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={sessionsLoading}>
            <option value="">Session</option>
            {sessions.map((s) => (<option key={s} value={s}>{s}</option>))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Class <span className="text-destructive">*</span></Label>
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
        <div className="space-y-1">
          <Label className="text-xs">Exam ID</Label>
          <Input className="w-44" placeholder="Exam ID (optional)" value={examId} onChange={(e) => setExamId(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button onClick={handleSearch} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>
      </div>

      {data && (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Rank</th>
                <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Student Name</th>
                <th className="px-3 py-3 text-left font-medium whitespace-nowrap">Roll</th>
                {data.subjects.map((sub) => (
                  <th key={sub} className="px-3 py-3 text-center font-medium whitespace-nowrap" colSpan={1}>
                    {sub}
                    <div className="text-xs font-normal text-muted-foreground">W/M/P/T</div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-medium whitespace-nowrap">Total</th>
                <th className="px-3 py-3 text-center font-medium whitespace-nowrap">GPA</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr><td colSpan={4 + data.subjects.length} className="py-12 text-center text-muted-foreground">No data found.</td></tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.student._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2 text-center font-semibold">{row.rank}</td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{row.student.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.student.rollNumber || '—'}</td>
                    {data.subjects.map((sub) => {
                      const sr = row.subjects[sub];
                      return (
                        <td key={sub} className="px-3 py-2 text-center whitespace-nowrap">
                          {sr ? (
                            <span className={sr.isFail ? 'text-red-600' : ''}>
                              {sr.writtenMark}/{sr.mcqMark}/{sr.practicalMark}/{sr.totalMark}
                              <span className="ml-1 text-xs text-muted-foreground">({sr.grade})</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center font-semibold">{row.total}</td>
                    <td className="px-3 py-2 text-center">{row.gpa}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
