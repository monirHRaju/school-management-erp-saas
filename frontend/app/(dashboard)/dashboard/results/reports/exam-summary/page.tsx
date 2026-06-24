'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Printer, BarChart2, Users, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SummaryData {
  totalStudents: number;
  totalParticipant: number;
  totalPass: number;
  totalFail: number;
  passRate: string;
  failRate: string;
  highestMark: number;
  averageMark: string;
}

export default function ExamSummaryPage() {
  const { token } = useAuth();

  const [sessionFilter, setSessionFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [examId, setExamId] = useState('');
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
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
      if (examId) params.set('exam_id', examId);
      const res = await apiRequest<{ success: boolean; data: SummaryData }>(`/api/results/report/summary?${params}`, { token: token ?? undefined });
      setData(res.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart2 className="h-6 w-6" />
            Exam Summary Report
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Overview of exam participation and results.</p>
        </div>
        {data && (
          <Button variant="outline" onClick={() => window.print()} className="gap-2 print:hidden">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 items-end print:hidden">
        <div className="space-y-1">
          <Label className="text-xs">Session</Label>
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
        <div className="space-y-1">
          <Label className="text-xs">Exam ID</Label>
          <Input className="w-44" placeholder="Exam ID" value={examId} onChange={(e) => setExamId(e.target.value)} />
        </div>
        <Button onClick={handleSearch} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </Button>
      </div>

      {data && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard icon={<Users className="h-5 w-5" />} label="Total Students" value={data.totalStudents} color="blue" />
          <StatCard icon={<Users className="h-5 w-5" />} label="Participated" value={data.totalParticipant} color="indigo" />
          <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Total Pass" value={data.totalPass} color="green" />
          <StatCard icon={<XCircle className="h-5 w-5" />} label="Total Fail" value={data.totalFail} color="red" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Pass Rate" value={data.passRate} color="green" />
          <StatCard icon={<XCircle className="h-5 w-5" />} label="Fail Rate" value={data.failRate} color="red" />
          <StatCard icon={<BarChart2 className="h-5 w-5" />} label="Highest Mark" value={data.highestMark} color="amber" />
          <StatCard icon={<BarChart2 className="h-5 w-5" />} label="Average Mark" value={data.averageMark} color="purple" />
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'blue' | 'indigo' | 'green' | 'red' | 'amber' | 'purple';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <div className={`rounded-lg border p-4 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1 opacity-70">{icon}<span className="text-xs font-medium">{label}</span></div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
