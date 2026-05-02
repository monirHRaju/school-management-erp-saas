'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, Loader2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Student } from '@/types/student';
import { openAdmitCardWindow } from '@/lib/admitCard';

const selectClass = cn(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
);

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AdmitCardPage() {
  const router = useRouter();
  const { token, school } = useAuth();
  const { classes, sections, loading: configLoading } = useAcademicConfig();

  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [controllerName, setControllerName] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [controllerSig, setControllerSig] = useState('');
  const [principalSig, setPrincipalSig] = useState('');
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<{ logoUrl?: string; contact?: string; address?: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ success: boolean; data: { logoUrl?: string; contact?: string; address?: string } }>(
      '/api/settings',
      { token }
    )
      .then((res) => { if (res.success) setSchoolSettings(res.data); })
      .catch(() => { /* ignore */ });
  }, [token]);

  // Live count of students matching the chosen filters
  useEffect(() => {
    if (!token || !classFilter) { setCount(null); return; }
    const params = new URLSearchParams({ class: classFilter, status: 'active' });
    if (sectionFilter) params.set('section', sectionFilter);
    setLoading(true);
    apiRequest<{ success: boolean; data: Student[] }>(
      `/api/students?${params.toString()}`,
      { token }
    )
      .then((res) => { setCount(res.success ? (res.data?.length || 0) : 0); })
      .catch(() => setCount(0))
      .finally(() => setLoading(false));
  }, [token, classFilter, sectionFilter]);

  async function handleSigUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error('Signature must be under 1 MB.');
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setter(dataUrl);
    } catch {
      toast.error('Failed to read image.');
    }
  }

  async function handleGenerate() {
    if (!token) return;
    if (!classFilter) { toast.error('Select a class.'); return; }
    if (!examName.trim()) { toast.error('Type an exam name.'); return; }

    setGenerating(true);
    try {
      const params = new URLSearchParams({ class: classFilter, status: 'active' });
      if (sectionFilter) params.set('section', sectionFilter);
      const res = await apiRequest<{ success: boolean; data: Student[] }>(
        `/api/students?${params.toString()}`,
        { token }
      );
      if (!res.success || !res.data || res.data.length === 0) {
        toast.error('No students found for the chosen filters.');
        return;
      }

      openAdmitCardWindow(
        res.data.map((s) => ({
          name: s.name,
          nameBn: s.nameBn,
          studentId: s.studentId,
          class: s.class,
          section: s.section,
          shift: s.shift,
          group: s.group,
          rollNo: s.rollNo,
          photoUrl: s.photoUrl,
        })),
        {
          name: school?.name,
          address: schoolSettings?.address,
          contact: schoolSettings?.contact,
          logoUrl: schoolSettings?.logoUrl,
        },
        {
          examName: examName.trim(),
          examDate: examDate.trim() || undefined,
          controllerName: controllerName.trim() || undefined,
          principalName: principalName.trim() || undefined,
          controllerSignatureUrl: controllerSig || undefined,
          principalSignatureUrl: principalSig || undefined,
        }
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate admit cards.');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/students')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Generate Admit Cards</h1>
          <p className="text-sm text-muted-foreground">
            Pick class & section, type the exam name, then print A4 sheets (3 cards per page).
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="class">Class *</Label>
              <select
                id="class"
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className={selectClass}
                disabled={configLoading}
              >
                <option value="">Select class</option>
                {classes.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <select
                id="section"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className={selectClass}
                disabled={configLoading}
              >
                <option value="">All sections</option>
                {sections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          {classFilter && (
            <p className="text-sm text-muted-foreground">
              {loading ? 'Counting…' : count !== null ? `${count} active student(s) match.` : ''}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Exam */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exam Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="examName">Exam Name *</Label>
              <Input
                id="examName"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. Half-Yearly Examination 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="examDate">Exam Date / Period</Label>
              <Input
                id="examDate"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                placeholder="e.g. 12 Jun 2026 or June 2026"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signatures */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signatures (optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="controllerName">Exam Controller Name</Label>
              <Input
                id="controllerName"
                value={controllerName}
                onChange={(e) => setControllerName(e.target.value)}
                placeholder="Optional"
              />
              <Label className="text-xs">Signature Image</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSigUpload(e, setControllerSig)}
                  className="text-xs"
                />
                {controllerSig && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setControllerSig('')} aria-label="Remove signature">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {controllerSig && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={controllerSig} alt="Exam controller signature preview" className="mt-2 h-16 object-contain border border-border rounded bg-muted/30" />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="principalName">Principal Name</Label>
              <Input
                id="principalName"
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                placeholder="Optional"
              />
              <Label className="text-xs">Signature Image</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleSigUpload(e, setPrincipalSig)}
                  className="text-xs"
                />
                {principalSig && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setPrincipalSig('')} aria-label="Remove signature">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {principalSig && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={principalSig} alt="Principal signature preview" className="mt-2 h-16 object-contain border border-border rounded bg-muted/30" />
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Upload className="h-3 w-3" />
            Upload PNG with transparent background for best print results. Max 1 MB each.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => router.push('/dashboard/students')} disabled={generating}>
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={generating || !classFilter || !examName.trim()}
          className="gap-2"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Generate {count != null ? `(${count})` : ''} Admit Cards
        </Button>
      </div>
    </div>
  );
}
