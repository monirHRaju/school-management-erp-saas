'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2, Loader2, ClipboardList, Search, X, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ResultRecord {
  _id: string;
  student_id: { _id: string; name: string; rollNumber?: string; admissionId?: string };
  exam_id: { _id: string; name: string; term?: string };
  session: string;
  class: string;
  section: string;
  subject: string;
  writtenMark: number;
  mcqMark: number;
  practicalMark: number;
  totalMark: number;
  grade: string;
  gradePoint: number;
  isFail: boolean;
}

export default function ResultListPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const canWrite = user?.role === 'admin' || user?.role === 'staff';

  const [items, setItems] = useState<ResultRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [examFilter, setExamFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [searched, setSearched] = useState(false);

  const [editTarget, setEditTarget] = useState<ResultRecord | null>(null);
  const [editMarks, setEditMarks] = useState({ writtenMark: 0, mcqMark: 0, practicalMark: 0 });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResultRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sessionFilter) params.set('session', sessionFilter);
      if (classFilter) params.set('class', classFilter);
      if (sectionFilter) params.set('section', sectionFilter);
      if (examFilter) params.set('exam_id', examFilter);
      if (subjectFilter) params.set('subject', subjectFilter);
      if (gradeFilter) params.set('grade', gradeFilter);
      const res = await apiRequest<{ success: boolean; data: ResultRecord[] }>(`/api/results?${params}`, { token: token ?? undefined });
      setItems(res.data);
      setSearched(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [token, sessionFilter, classFilter, sectionFilter, examFilter, subjectFilter, gradeFilter]);

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await apiRequest(`/api/results/${editTarget._id}`, {
        method: 'PATCH',
        body: JSON.stringify(editMarks),
        token: token ?? undefined,
      });
      toast.success('Marks updated');
      setEditTarget(null);
      fetchItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/results/${deleteTarget._id}`, { method: 'DELETE', token: token ?? undefined });
      toast.success('Result deleted');
      setDeleteTarget(null);
      fetchItems();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const reset = () => {
    setSessionFilter(''); setClassFilter(''); setSectionFilter('');
    setExamFilter(''); setSubjectFilter(''); setGradeFilter('');
    setItems([]); setSearched(false);
  };

  const hasFilter = sessionFilter || classFilter || sectionFilter || examFilter || subjectFilter || gradeFilter;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6" />
            Result List
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">View and manage exam results.</p>
        </div>
        {canWrite && (
          <Button onClick={() => router.push('/dashboard/results/entry')} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Manually
          </Button>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); fetchItems(); }} className="flex flex-wrap gap-2">
        <Input className="w-36" placeholder="Session" value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)} />
        <Input className="w-28" placeholder="Class" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} />
        <Input className="w-28" placeholder="Section" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} />
        <Input className="w-40" placeholder="Subject" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} />
        <Input className="w-24" placeholder="Grade" value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} />
        <Button type="submit" variant="outline" className="gap-2">
          <Search className="h-4 w-4" />
          Search
        </Button>
        {hasFilter && (
          <Button type="button" variant="ghost" onClick={reset}><X className="h-4 w-4" /></Button>
        )}
      </form>

      <div className="rounded-md border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">#</th>
              <th className="px-4 py-3 text-left font-medium">Student</th>
              <th className="px-4 py-3 text-left font-medium">Session</th>
              <th className="px-4 py-3 text-left font-medium">Class</th>
              <th className="px-4 py-3 text-left font-medium">Exam</th>
              <th className="px-4 py-3 text-left font-medium">Subject</th>
              <th className="px-4 py-3 text-center font-medium">Marks</th>
              <th className="px-4 py-3 text-center font-medium">Grade</th>
              {canWrite && <th className="px-4 py-3 text-center font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={canWrite ? 9 : 8} className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : !searched ? (
              <tr><td colSpan={canWrite ? 9 : 8} className="py-12 text-center text-muted-foreground">Use filters above and press Search to load results.</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={canWrite ? 9 : 8} className="py-12 text-center text-muted-foreground">No results found.</td></tr>
            ) : (
              items.map((item, idx) => (
                <tr key={item._id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.student_id?.name}</div>
                    {item.student_id?.rollNumber && (
                      <div className="text-xs text-muted-foreground">Roll: {item.student_id.rollNumber}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{item.session || '—'}</td>
                  <td className="px-4 py-3 text-sm">{item.class || '—'}</td>
                  <td className="px-4 py-3 text-sm">{item.exam_id?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm">{item.subject}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {item.writtenMark}+{item.mcqMark}+{item.practicalMark}=<strong>{item.totalMark}</strong>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${item.isFail ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {item.grade} ({item.gradePoint.toFixed(2)})
                    </span>
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => {
                          setEditTarget(item);
                          setEditMarks({ writtenMark: item.writtenMark, mcqMark: item.mcqMark, practicalMark: item.practicalMark });
                        }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(item)}
                          className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Marks</DialogTitle></DialogHeader>
          {editTarget && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {editTarget.student_id?.name} — {editTarget.subject}
              </p>
              <div className="space-y-2">
                <Label>Written Mark</Label>
                <Input type="number" min={0} value={editMarks.writtenMark}
                  onChange={(e) => setEditMarks((m) => ({ ...m, writtenMark: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>MCQ Mark</Label>
                <Input type="number" min={0} value={editMarks.mcqMark}
                  onChange={(e) => setEditMarks((m) => ({ ...m, mcqMark: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Practical Mark</Label>
                <Input type="number" min={0} value={editMarks.practicalMark}
                  onChange={(e) => setEditMarks((m) => ({ ...m, practicalMark: Number(e.target.value) }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Result</AlertDialogTitle>
            <AlertDialogDescription>
              Delete result for <strong>{deleteTarget?.student_id?.name}</strong> — {deleteTarget?.subject}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
