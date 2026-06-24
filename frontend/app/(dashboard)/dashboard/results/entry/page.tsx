'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Search, Loader2, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Student {
  _id: string;
  name: string;
  rollNumber?: string;
  admissionId?: string;
}

interface Exam {
  _id: string;
  name: string;
  session: string;
  class: string;
  term: string;
}

interface Subject {
  _id: string;
  name: string;
  writtenMark: number;
  mcqMark: number;
  practicalMark: number;
}

interface MarkRow {
  student_id: string;
  name: string;
  rollNumber: string;
  writtenMark: number;
  mcqMark: number;
  practicalMark: number;
}

export default function MarkEntryPage() {
  const { token, user } = useAuth();
  const router = useRouter();

  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [sessionFilter, setSessionFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [examId, setExamId] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  const [rows, setRows] = useState<MarkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sessions, setSessions] = useState<string[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const { classes, sections, loading: configLoading } = useAcademicConfig();

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiRequest<{ success: boolean; data: Exam[] }>('/api/exams?status=active', { token: token ?? undefined }),
      apiRequest<{ success: boolean; data: Subject[] }>('/api/academic/subjects?status=active', { token: token ?? undefined }),
    ]).then(([examRes, subRes]) => {
      setExams(examRes.data);
      setSubjects(subRes.data);
    }).catch(() => {});
  }, [token]);

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

  const handleSubjectChange = (name: string) => {
    setSubjectName(name);
    const sub = subjects.find((s) => s.name === name) || null;
    setSelectedSubject(sub);
  };

  const handleSearch = useCallback(async () => {
    if (!classFilter.trim()) { toast.error('Class is required'); return; }
    if (!examId) { toast.error('Exam is required'); return; }
    if (!subjectName) { toast.error('Subject is required'); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams({ class: classFilter.trim(), status: 'active' });
      if (sectionFilter) params.set('section', sectionFilter);
      const res = await apiRequest<{ success: boolean; data: Student[] }>(`/api/students?${params}`, { token: token ?? undefined });
      const students = res.data;

      // Load existing results for this exam+subject
      const resParams = new URLSearchParams({ exam_id: examId, subject: subjectName });
      const existing = await apiRequest<{ success: boolean; data: Array<{ student_id: { _id: string }; writtenMark: number; mcqMark: number; practicalMark: number }> }>(`/api/results?${resParams}`, { token: token ?? undefined });
      const existingMap: Record<string, { writtenMark: number; mcqMark: number; practicalMark: number }> = {};
      for (const r of existing.data) {
        existingMap[r.student_id._id] = { writtenMark: r.writtenMark, mcqMark: r.mcqMark, practicalMark: r.practicalMark };
      }

      setRows(students.map((s) => ({
        student_id: s._id,
        name: s.name,
        rollNumber: s.rollNumber || '',
        writtenMark: existingMap[s._id]?.writtenMark ?? 0,
        mcqMark: existingMap[s._id]?.mcqMark ?? 0,
        practicalMark: existingMap[s._id]?.practicalMark ?? 0,
      })));
      setSearched(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [token, classFilter, sectionFilter, examId, subjectName]);

  const updateMark = (idx: number, field: 'writtenMark' | 'mcqMark' | 'practicalMark', val: number) => {
    setRows((r) => r.map((row, i) => i === idx ? { ...row, [field]: val } : row));
  };

  const handleSubmit = async () => {
    if (!rows.length) { toast.error('No students loaded'); return; }
    const selectedExam = exams.find((e) => e._id === examId);
    setSaving(true);
    try {
      await apiRequest('/api/results/entry', {
        method: 'POST',
        body: JSON.stringify({
          exam_id: examId,
          session: selectedExam?.session || sessionFilter,
          class: classFilter,
          section: sectionFilter,
          subject: subjectName,
          entries: rows.map((r) => ({
            student_id: r.student_id,
            writtenMark: r.writtenMark,
            mcqMark: r.mcqMark,
            practicalMark: r.practicalMark,
          })),
        }),
        token: token ?? undefined,
      });
      toast.success('Marks saved successfully');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const showMcq = (selectedSubject?.mcqMark ?? 0) > 0;
  const showPractical = (selectedSubject?.practicalMark ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.push('/dashboard/results')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mark Entry</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Enter marks for students by exam and subject.</p>
        </div>
      </div>

      <div className="rounded-md border p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs">Session</Label>
            <select value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={sessionsLoading}>
              <option value="">Select session</option>
              {sessions.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Class <span className="text-destructive">*</span></Label>
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={configLoading}>
              <option value="">Select class</option>
              {classes.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Section</Label>
            <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={configLoading}>
              <option value="">Select section</option>
              {sections.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Exam <span className="text-destructive">*</span></Label>
            <select value={examId} onChange={(e) => setExamId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select exam</option>
              {exams.map((e) => (
                <option key={e._id} value={e._id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Subject <span className="text-destructive">*</span></Label>
            <select value={subjectName} onChange={(e) => handleSubjectChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Select subject</option>
              {subjects.map((s) => (
                <option key={s._id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSearch} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search Students
          </Button>
        </div>
      </div>

      {searched && (
        <>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">#</th>
                  <th className="px-4 py-3 text-left font-medium">Student Name</th>
                  <th className="px-4 py-3 text-left font-medium">Roll</th>
                  <th className="px-4 py-3 text-center font-medium">Written Mark</th>
                  {showMcq && <th className="px-4 py-3 text-center font-medium">MCQ Mark</th>}
                  {showPractical && <th className="px-4 py-3 text-center font-medium">Practical Mark</th>}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={3 + (showMcq ? 1 : 0) + (showPractical ? 1 : 0)} className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={3 + (showMcq ? 1 : 0) + (showPractical ? 1 : 0)} className="py-12 text-center text-muted-foreground">
                    No students found for the selected class/section.
                  </td></tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={row.student_id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-2 font-medium">{row.name}</td>
                      <td className="px-4 py-2 text-muted-foreground">{row.rollNumber || '—'}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={selectedSubject?.writtenMark || undefined}
                          className="w-24 mx-auto"
                          value={row.writtenMark}
                          onChange={(e) => updateMark(idx, 'writtenMark', Number(e.target.value))}
                        />
                      </td>
                      {showMcq && (
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={selectedSubject?.mcqMark || undefined}
                            className="w-24 mx-auto"
                            value={row.mcqMark}
                            onChange={(e) => updateMark(idx, 'mcqMark', Number(e.target.value))}
                          />
                        </td>
                      )}
                      {showPractical && (
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={selectedSubject?.practicalMark || undefined}
                            className="w-24 mx-auto"
                            value={row.practicalMark}
                            onChange={(e) => updateMark(idx, 'practicalMark', Number(e.target.value))}
                          />
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {rows.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Marks
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
