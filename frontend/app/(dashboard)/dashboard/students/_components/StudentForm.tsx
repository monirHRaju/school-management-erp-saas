'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, ArrowRight, ImageIcon, BookOpen, DollarSign, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
import type { Student, StudentFormData } from '@/types/student';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: { value: Student['status']; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'left', label: 'Left' },
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other'];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RELIGION_OPTIONS = ['Islam', 'Hinduism', 'Christian', 'Other'];

const todayISO = () => new Date().toISOString().slice(0, 10);

const emptyForm: StudentFormData = {
  studentId: '',
  name: '',
  nameBn: '',
  bloodGroup: '',
  fatherName: '',
  fatherProfession: '',
  fatherMobile: '',
  fatherMonthlyIncome: '',
  motherName: '',
  motherProfession: '',
  motherMobile: '',
  motherMonthlyIncome: '',
  guardianName: '',
  guardianPhone: '',
  guardianRelation: '',
  whatsappNumber: '',
  address: '',
  photoUrl: '',
  shift: '',
  group: '',
  dateOfBirth: '',
  birthRegNo: '',
  gender: '',
  religion: '',
  class: '',
  section: '',
  rollNo: '',
  monthlyFee: '',
  admissionDate: todayISO(),
  status: 'active',
};

const selectClass = cn(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
);

interface StudentFormProps {
  student?: Student;
}

export default function StudentForm({ student }: StudentFormProps) {
  const router = useRouter();
  const { token, user } = useAuth();
  const { classes, sections, shifts, groups, loading: configLoading } = useAcademicConfig();
  const isAdmin = user?.role === 'admin';

  const [form, setForm] = useState<StudentFormData>(() => {
    if (!student) return emptyForm;
    return {
      studentId: student.studentId ?? '',
      name: student.name,
      nameBn: student.nameBn ?? '',
      bloodGroup: student.bloodGroup ?? '',
      fatherName: student.fatherName ?? '',
      fatherProfession: student.fatherProfession ?? '',
      fatherMobile: student.fatherMobile ?? '',
      fatherMonthlyIncome: student.fatherMonthlyIncome != null ? String(student.fatherMonthlyIncome) : '',
      motherName: student.motherName ?? '',
      motherProfession: student.motherProfession ?? '',
      motherMobile: student.motherMobile ?? '',
      motherMonthlyIncome: student.motherMonthlyIncome != null ? String(student.motherMonthlyIncome) : '',
      guardianName: student.guardianName ?? '',
      guardianPhone: student.guardianPhone ?? '',
      guardianRelation: student.guardianRelation ?? '',
      whatsappNumber: student.whatsappNumber ?? '',
      address: student.address ?? '',
      photoUrl: student.photoUrl ?? '',
      shift: student.shift ?? '',
      group: student.group ?? '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      birthRegNo: student.birthRegNo ?? '',
      gender: student.gender ?? '',
      religion: student.religion ?? '',
      class: student.class ?? '',
      section: student.section ?? '',
      rollNo: student.rollNo ?? '',
      monthlyFee: student.monthlyFee != null ? String(student.monthlyFee) : '',
      admissionDate: student.admissionDate ? student.admissionDate.slice(0, 10) : todayISO(),
      status: student.status,
    };
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const set = <K extends keyof StudentFormData>(key: K, value: StudentFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validateStep1 = () => {
    if (!form.name.trim()) {
      toast.error('Student Name is required.');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s));
  };
  const prevStep = () => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (isAdmin && form.studentId?.trim() && !/^\d{6}$/.test(form.studentId.trim())) {
      toast.error('Student ID must be exactly 6 digits.');
      return;
    }
    setSaving(true);
    try {
      let photoUrl = form.photoUrl?.trim() || undefined;

      if (photoFile) {
        const toBase64 = (file: File) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

        const dataUrl = await toBase64(photoFile);
        const uploadRes = await apiRequest<{
          success: boolean;
          data?: { url: string };
          error?: string;
        }>('/api/students/photo', {
          method: 'POST',
          body: JSON.stringify({ image: dataUrl }),
          token,
        });
        if (!uploadRes.success || !uploadRes.data) {
          throw new Error(uploadRes.error || 'Photo upload failed');
        }
        photoUrl = uploadRes.data.url;
      }

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        nameBn: form.nameBn?.trim() || undefined,
        bloodGroup: form.bloodGroup?.trim() || undefined,
        fatherName: form.fatherName?.trim() || undefined,
        fatherProfession: form.fatherProfession?.trim() || undefined,
        fatherMobile: form.fatherMobile?.trim() || undefined,
        fatherMonthlyIncome: form.fatherMonthlyIncome?.trim() || undefined,
        motherName: form.motherName?.trim() || undefined,
        motherProfession: form.motherProfession?.trim() || undefined,
        motherMobile: form.motherMobile?.trim() || undefined,
        motherMonthlyIncome: form.motherMonthlyIncome?.trim() || undefined,
        guardianName: form.guardianName?.trim() || undefined,
        guardianPhone: form.guardianPhone?.trim() || undefined,
        guardianRelation: form.guardianRelation?.trim() || undefined,
        whatsappNumber: form.whatsappNumber?.trim() || undefined,
        address: form.address?.trim() || undefined,
        photoUrl,
        shift: form.shift?.trim() || undefined,
        group: form.group?.trim() || undefined,
        dateOfBirth: form.dateOfBirth?.trim() || undefined,
        birthRegNo: form.birthRegNo?.trim() || undefined,
        gender: form.gender?.trim() || undefined,
        religion: form.religion?.trim() || undefined,
        class: form.class?.trim() || undefined,
        section: form.section?.trim() || undefined,
        rollNo: form.rollNo?.trim() || undefined,
        monthlyFee: form.monthlyFee?.trim() || undefined,
        admissionDate: form.admissionDate?.trim() || undefined,
        status: form.status,
      };

      // Only send studentId if admin and value differs / exists
      if (isAdmin && form.studentId?.trim()) {
        payload.studentId = form.studentId.trim();
      }

      if (student) {
        await apiRequest(`/api/students/${student._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
          token,
        });
        toast.success('Student updated successfully.');
      } else {
        await apiRequest('/api/students', {
          method: 'POST',
          body: JSON.stringify(payload),
          token,
        });
        toast.success('Student added successfully.');
      }
      router.push('/dashboard/students');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const STEPS = [
    { num: 1 as const, label: "Student's Information", icon: ImageIcon },
    { num: 2 as const, label: 'Admission Details', icon: BookOpen },
    { num: 3 as const, label: 'Fee Information', icon: DollarSign },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/students')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-center flex-1">
          {student ? 'Edit Student' : 'New admission form'}
        </h1>
        <div className="w-10" />
      </div>

      {/* Stepper */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
          {STEPS.map(({ num, label, icon: Icon }) => {
            const active = step === num;
            const done = step > num;
            return (
              <button
                key={num}
                type="button"
                onClick={() => {
                  if (num < step || (num === 2 && validateStep1()) || num === 1) setStep(num);
                }}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-linear-to-r from-violet-600 to-violet-500 text-white shadow-sm'
                    : done
                    ? 'text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                    : 'text-muted-foreground hover:bg-muted/50'
                )}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="p-5 sm:p-8 space-y-5">
            {/* ─── STEP 1: Student's Information ─────────────────────── */}
            {step === 1 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID {!student && <span className="text-xs text-muted-foreground">(auto)</span>}</Label>
                    <Input
                      id="studentId"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={form.studentId ?? ''}
                      onChange={(e) => set('studentId', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder={student ? '' : 'Will be generated automatically'}
                      disabled={!isAdmin && !!student}
                      readOnly={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="photo">Photo</Label>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Student Name <span className="text-destructive">*</span></Label>
                    <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Student Name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameBn">Name (বাংলা)</Label>
                    <Input id="nameBn" value={form.nameBn ?? ''} onChange={(e) => set('nameBn', e.target.value)} placeholder="শিক্ষার্থীর নাম" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="guardianPhone">Phone Number</Label>
                    <Input id="guardianPhone" value={form.guardianPhone ?? ''} onChange={(e) => set('guardianPhone', e.target.value)} placeholder="01XXXXXXXXX" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                    <Input id="whatsappNumber" value={form.whatsappNumber ?? ''} onChange={(e) => set('whatsappNumber', e.target.value)} placeholder="01XXXXXXXXX" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fatherName">Father Name <span className="text-destructive">*</span></Label>
                    <Input id="fatherName" value={form.fatherName ?? ''} onChange={(e) => set('fatherName', e.target.value)} placeholder="Father Name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fatherMobile">Father Mobile</Label>
                    <Input id="fatherMobile" value={form.fatherMobile ?? ''} onChange={(e) => set('fatherMobile', e.target.value)} placeholder="01XXXXXXXXX" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="motherName">Mother Name</Label>
                    <Input id="motherName" value={form.motherName ?? ''} onChange={(e) => set('motherName', e.target.value)} placeholder="Mother Name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motherMobile">Mother Mobile</Label>
                    <Input id="motherMobile" value={form.motherMobile ?? ''} onChange={(e) => set('motherMobile', e.target.value)} placeholder="01XXXXXXXXX" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="guardianName">Guardian Name</Label>
                    <Input id="guardianName" value={form.guardianName ?? ''} onChange={(e) => set('guardianName', e.target.value)} placeholder="Guardian / emergency contact" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardianRelation">Guardian Relation</Label>
                    <Input id="guardianRelation" value={form.guardianRelation ?? ''} onChange={(e) => set('guardianRelation', e.target.value)} placeholder="e.g. Father, Uncle" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth <span className="text-destructive">*</span></Label>
                    <Input id="dateOfBirth" type="date" value={form.dateOfBirth ?? ''} onChange={(e) => set('dateOfBirth', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birthRegNo">Birth Registration No</Label>
                    <Input id="birthRegNo" value={form.birthRegNo ?? ''} onChange={(e) => set('birthRegNo', e.target.value)} placeholder="Birth registration number" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
                    <select id="gender" value={form.gender ?? ''} onChange={(e) => set('gender', e.target.value)} className={selectClass}>
                      <option value="">Select Gender</option>
                      {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="religion">Religion</Label>
                    <select id="religion" value={form.religion ?? ''} onChange={(e) => set('religion', e.target.value)} className={selectClass}>
                      <option value="">Select religion</option>
                      {RELIGION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bloodGroup">Blood Group</Label>
                    <select id="bloodGroup" value={form.bloodGroup ?? ''} onChange={(e) => set('bloodGroup', e.target.value)} className={selectClass}>
                      <option value="">Select</option>
                      {BLOOD_GROUP_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Full Address</Label>
                  <textarea
                    id="address"
                    value={form.address ?? ''}
                    onChange={(e) => set('address', e.target.value)}
                    placeholder="Enter full address"
                    rows={3}
                    className={cn(
                      'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none'
                    )}
                  />
                </div>
              </>
            )}

            {/* ─── STEP 2: Admission Details ─────────────────────────── */}
            {step === 2 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="class">Class</Label>
                    <select id="class" value={form.class ?? ''} onChange={(e) => set('class', e.target.value)} className={selectClass} disabled={configLoading}>
                      <option value="">Select class</option>
                      {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section">Section</Label>
                    <select id="section" value={form.section ?? ''} onChange={(e) => set('section', e.target.value)} className={selectClass} disabled={configLoading}>
                      <option value="">Select section</option>
                      {sections.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="shift">Shift</Label>
                    <select id="shift" value={form.shift ?? ''} onChange={(e) => set('shift', e.target.value)} className={selectClass} disabled={configLoading}>
                      <option value="">Select shift</option>
                      {shifts.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group">Group</Label>
                    <select id="group" value={form.group ?? ''} onChange={(e) => set('group', e.target.value)} className={selectClass} disabled={configLoading}>
                      <option value="">Select group</option>
                      {groups.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="rollNo">Roll No</Label>
                    <Input id="rollNo" value={form.rollNo ?? ''} onChange={(e) => set('rollNo', e.target.value)} placeholder="Roll number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admissionDate">Admission Date</Label>
                    <Input id="admissionDate" type="date" value={form.admissionDate ?? ''} onChange={(e) => set('admissionDate', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select id="status" value={form.status} onChange={(e) => set('status', e.target.value as Student['status'])} className={selectClass}>
                      {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fatherProfession">Father Profession</Label>
                    <Input id="fatherProfession" value={form.fatherProfession ?? ''} onChange={(e) => set('fatherProfession', e.target.value)} placeholder="e.g. Farmer, Teacher" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motherProfession">Mother Profession</Label>
                    <Input id="motherProfession" value={form.motherProfession ?? ''} onChange={(e) => set('motherProfession', e.target.value)} placeholder="e.g. Homemaker, Doctor" />
                  </div>
                </div>
              </>
            )}

            {/* ─── STEP 3: Fee Information ───────────────────────────── */}
            {step === 3 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyFee">Monthly Fee (৳)</Label>
                    <Input id="monthlyFee" type="number" min="0" value={form.monthlyFee ?? ''} onChange={(e) => set('monthlyFee', e.target.value)} placeholder="e.g. 1500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fatherMonthlyIncome">Father Monthly Income (৳)</Label>
                    <Input id="fatherMonthlyIncome" type="number" min="0" value={form.fatherMonthlyIncome ?? ''} onChange={(e) => set('fatherMonthlyIncome', e.target.value)} placeholder="e.g. 25000" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="motherMonthlyIncome">Mother Monthly Income (৳)</Label>
                    <Input id="motherMonthlyIncome" type="number" min="0" value={form.motherMonthlyIncome ?? ''} onChange={(e) => set('motherMonthlyIncome', e.target.value)} placeholder="e.g. 0" />
                  </div>
                </div>

                {/* Review summary */}
                <div className="rounded-xl border border-violet-200 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-950/20 p-4 space-y-1.5 text-sm">
                  <p className="font-semibold text-violet-700 dark:text-violet-300 mb-2">Review</p>
                  <p><span className="font-medium">Name:</span> {form.name || '—'}</p>
                  <p><span className="font-medium">Class:</span> {form.class || '—'}{form.section ? ` — ${form.section}` : ''}{form.rollNo ? ` · Roll ${form.rollNo}` : ''}</p>
                  <p><span className="font-medium">Father:</span> {form.fatherName || '—'} {form.fatherMobile ? `(${form.fatherMobile})` : ''}</p>
                  <p><span className="font-medium">Monthly Fee:</span> ৳ {form.monthlyFee || '0'}</p>
                </div>
              </>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={prevStep} disabled={saving} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              ) : (
                <Button type="button" variant="ghost" onClick={() => router.push('/dashboard/students')} disabled={saving}>
                  Cancel
                </Button>
              )}

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={nextStep}
                  className="gap-2 bg-linear-to-r from-violet-600 to-violet-500 hover:opacity-95 text-white"
                >
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={saving}
                  className="gap-2 bg-linear-to-r from-violet-600 to-violet-500 hover:opacity-95 text-white"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {student ? 'Save Changes' : 'Submit Admission'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
