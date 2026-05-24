'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface StudentInfo {
  _id: string;
  name: string;
  rollNumber?: string;
  admissionId?: string;
  class?: string;
  section?: string;
  session?: string;
  photo?: string;
}

interface ResultRow {
  _id: string;
  subject: string;
  exam_id: { _id: string; name: string; term?: string; examDate?: string };
  writtenMark: number;
  mcqMark: number;
  practicalMark: number;
  totalMark: number;
  grade: string;
  gradePoint: number;
  isFail: boolean;
  session: string;
  class: string;
}

interface SchoolInfo {
  name: string;
  logo?: string;
}

function PrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();

  const studentId = searchParams.get('studentId') || '';
  const session = searchParams.get('session') || '';
  const examId = searchParams.get('examId') || '';

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!studentId || !token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (session) params.set('session', session);
      if (examId) params.set('examId', examId);

      const [studentRes, resultsRes] = await Promise.all([
        apiRequest<{ success: boolean; data: StudentInfo }>(`/api/students/${studentId}`, { token: token ?? undefined }),
        apiRequest<{ success: boolean; data: ResultRow[] }>(`/api/results/student/${studentId}?${params}`, { token: token ?? undefined }),
      ]);

      setStudent(studentRes.data);
      setResults(resultsRes.data);

      try {
        const settingsRes = await apiRequest<{ success: boolean; data: { schoolName?: string; logo?: string } }>('/api/settings', { token: token ?? undefined });
        setSchool({ name: settingsRes.data?.schoolName || 'School', logo: settingsRes.data?.logo });
      } catch {
        setSchool({ name: 'School' });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load result');
    } finally {
      setLoading(false);
    }
  }, [studentId, session, examId, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!studentId) {
    return <div className="p-8 text-center text-muted-foreground">No student selected.</div>;
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalObtained = results.reduce((sum, r) => sum + r.totalMark, 0);
  const totalMax = results.length * 100;
  const avgGpa = results.length
    ? (results.reduce((sum, r) => sum + r.gradePoint, 0) / results.length).toFixed(2)
    : '0.00';
  const hasFail = results.some((r) => r.isFail);

  const showMcq = results.some((r) => r.mcqMark > 0);
  const showPractical = results.some((r) => r.practicalMark > 0);

  const examName = results[0]?.exam_id?.name || '';
  const examTerm = results[0]?.exam_id?.term || '';

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden flex items-center gap-3 p-4 border-b bg-muted/30">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-medium">Result Sheet Preview</span>
        <Button onClick={() => window.print()} className="ml-auto gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <div className="max-w-3xl mx-auto p-8 print:p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 pb-4 border-b-2 border-gray-800">
          <div className="flex-1">
            {school?.logo && (
              <img src={school.logo} alt="School Logo" className="h-16 w-16 object-contain mb-2" />
            )}
            <h1 className="text-2xl font-bold text-gray-900">{school?.name}</h1>
            {examName && (
              <p className="text-sm text-gray-600 mt-1">
                Exam: {examName}{examTerm ? ` (${examTerm})` : ''}
              </p>
            )}
          </div>
          <div className="w-20 h-24 border-2 border-dashed border-gray-300 flex items-center justify-center">
            {student?.photo ? (
              <img src={student.photo} alt="Student" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-gray-400 text-center">Photo</span>
            )}
          </div>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-6 text-sm">
          <InfoRow label="Student Name" value={student?.name || ''} />
          <InfoRow label="Class" value={student?.class || results[0]?.class || ''} />
          <InfoRow label="Roll No." value={student?.rollNumber || ''} />
          <InfoRow label="Session" value={student?.session || results[0]?.session || session || ''} />
          <InfoRow label="Admission ID" value={student?.admissionId || ''} />
          <InfoRow label="Section" value={student?.section || ''} />
        </div>

        {/* Results Table */}
        <table className="w-full text-sm border-collapse border border-gray-400 mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-3 py-2 text-left">SL</th>
              <th className="border border-gray-400 px-3 py-2 text-left">Subject</th>
              <th className="border border-gray-400 px-3 py-2 text-center">Written</th>
              {showMcq && <th className="border border-gray-400 px-3 py-2 text-center">MCQ</th>}
              {showPractical && <th className="border border-gray-400 px-3 py-2 text-center">Practical</th>}
              <th className="border border-gray-400 px-3 py-2 text-center">Total</th>
              <th className="border border-gray-400 px-3 py-2 text-center">Grade</th>
              <th className="border border-gray-400 px-3 py-2 text-center">Grade Point</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan={5 + (showMcq ? 1 : 0) + (showPractical ? 1 : 0)} className="border border-gray-400 px-3 py-4 text-center text-gray-500">
                  No results found.
                </td>
              </tr>
            ) : (
              results.map((r, idx) => (
                <tr key={r._id} className={r.isFail ? 'bg-red-50' : ''}>
                  <td className="border border-gray-400 px-3 py-2">{idx + 1}</td>
                  <td className="border border-gray-400 px-3 py-2 font-medium">{r.subject}</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">{r.writtenMark}</td>
                  {showMcq && <td className="border border-gray-400 px-3 py-2 text-center">{r.mcqMark}</td>}
                  {showPractical && <td className="border border-gray-400 px-3 py-2 text-center">{r.practicalMark}</td>}
                  <td className="border border-gray-400 px-3 py-2 text-center font-semibold">{r.totalMark}</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">{r.grade}</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">{r.gradePoint.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Summary */}
        <div className="border-t-2 border-gray-800 pt-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <InfoRow label="Total Subjects" value={results.length} />
            <InfoRow label="Total Obtained" value={`${totalObtained} / ${totalMax}`} />
            <InfoRow label="GPA" value={avgGpa} />
            <InfoRow label="Result" value={hasFail ? 'FAIL' : 'PASS'} highlight={true} />
          </div>
        </div>

        {/* Signature area */}
        <div className="flex justify-between mt-16 text-sm text-gray-600">
          <div className="text-center">
            <div className="border-t border-gray-600 pt-1 w-36">Class Teacher</div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-600 pt-1 w-36">Headmaster/Principal</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-gray-700 min-w-[120px]">{label}:</span>
      <span className={highlight ? (value === 'PASS' ? 'font-bold text-green-700' : 'font-bold text-red-700') : 'text-gray-900'}>
        {value || '—'}
      </span>
    </div>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <PrintContent />
    </Suspense>
  );
}
