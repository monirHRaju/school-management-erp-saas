'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, User, BookOpen, MapPin, Phone, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { useAcademicConfig } from '@/lib/useAcademicConfig';
import type { Student, StudentFormData } from '@/types/student';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const set = <K extends keyof StudentFormData>(key: K, value: StudentFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/students')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {student ? 'Edit Student' : 'Add Student'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identification */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" /> Identification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID {!student && <span className="text-xs text-muted-foreground">(auto-generated, 6 digits)</span>}</Label>
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
                {isAdmin
                  ? <p className="text-xs text-muted-foreground">Must be exactly 6 digits.</p>
                  : <p className="text-xs text-muted-foreground">Only admin can change the student ID.</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => set('status', e.target.value as Student['status'])}
                  className={selectClass}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo">Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
              {form.photoUrl && !photoFile && (
                <p className="text-xs text-muted-foreground">
                  Existing photo will be kept if you do not upload a new one.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name (English) *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  required
                  placeholder="Student name in English"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameBn">Name (বাংলা)</Label>
                <Input
                  id="nameBn"
                  value={form.nameBn ?? ''}
                  onChange={(e) => set('nameBn', e.target.value)}
                  placeholder="শিক্ষার্থীর নাম"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth ?? ''}
                  onChange={(e) => set('dateOfBirth', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthRegNo">Birth Registration No</Label>
                <Input
                  id="birthRegNo"
                  value={form.birthRegNo ?? ''}
                  onChange={(e) => set('birthRegNo', e.target.value)}
                  placeholder="Birth registration number"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  value={form.gender ?? ''}
                  onChange={(e) => set('gender', e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select gender</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="religion">Religion</Label>
                <select
                  id="religion"
                  value={form.religion ?? ''}
                  onChange={(e) => set('religion', e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select religion</option>
                  {RELIGION_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloodGroup">Blood Group</Label>
                <select
                  id="bloodGroup"
                  value={form.bloodGroup ?? ''}
                  onChange={(e) => set('bloodGroup', e.target.value)}
                  className={selectClass}
                >
                  <option value="">Select</option>
                  {BLOOD_GROUP_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Father Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Father Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fatherName">Father Name</Label>
                <Input
                  id="fatherName"
                  value={form.fatherName ?? ''}
                  onChange={(e) => set('fatherName', e.target.value)}
                  placeholder="Father name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fatherProfession">Profession</Label>
                <Input
                  id="fatherProfession"
                  value={form.fatherProfession ?? ''}
                  onChange={(e) => set('fatherProfession', e.target.value)}
                  placeholder="e.g. Farmer, Teacher"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fatherMobile">Mobile</Label>
                <Input
                  id="fatherMobile"
                  value={form.fatherMobile ?? ''}
                  onChange={(e) => set('fatherMobile', e.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fatherMonthlyIncome">Monthly Income (৳)</Label>
                <Input
                  id="fatherMonthlyIncome"
                  type="number"
                  min="0"
                  value={form.fatherMonthlyIncome ?? ''}
                  onChange={(e) => set('fatherMonthlyIncome', e.target.value)}
                  placeholder="e.g. 25000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mother Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mother Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="motherName">Mother Name</Label>
                <Input
                  id="motherName"
                  value={form.motherName ?? ''}
                  onChange={(e) => set('motherName', e.target.value)}
                  placeholder="Mother name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motherProfession">Profession</Label>
                <Input
                  id="motherProfession"
                  value={form.motherProfession ?? ''}
                  onChange={(e) => set('motherProfession', e.target.value)}
                  placeholder="e.g. Homemaker, Doctor"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="motherMobile">Mobile</Label>
                <Input
                  id="motherMobile"
                  value={form.motherMobile ?? ''}
                  onChange={(e) => set('motherMobile', e.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motherMonthlyIncome">Monthly Income (৳)</Label>
                <Input
                  id="motherMonthlyIncome"
                  type="number"
                  min="0"
                  value={form.motherMonthlyIncome ?? ''}
                  onChange={(e) => set('motherMonthlyIncome', e.target.value)}
                  placeholder="e.g. 0"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guardian / Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Phone className="h-4 w-4" /> Guardian & Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guardianName">Guardian Name</Label>
                <Input
                  id="guardianName"
                  value={form.guardianName ?? ''}
                  onChange={(e) => set('guardianName', e.target.value)}
                  placeholder="Guardian / emergency contact"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianRelation">Relation</Label>
                <Input
                  id="guardianRelation"
                  value={form.guardianRelation ?? ''}
                  onChange={(e) => set('guardianRelation', e.target.value)}
                  placeholder="e.g. Father, Uncle"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guardianPhone">Guardian Phone</Label>
                <Input
                  id="guardianPhone"
                  value={form.guardianPhone ?? ''}
                  onChange={(e) => set('guardianPhone', e.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                <Input
                  id="whatsappNumber"
                  value={form.whatsappNumber ?? ''}
                  onChange={(e) => set('whatsappNumber', e.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              id="address"
              value={form.address ?? ''}
              onChange={(e) => set('address', e.target.value)}
              placeholder="Village, Upazila, District"
              rows={2}
              className={cn(
                'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none'
              )}
            />
          </CardContent>
        </Card>

        {/* Academic */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <select
                  id="class"
                  value={form.class ?? ''}
                  onChange={(e) => set('class', e.target.value)}
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
                  value={form.section ?? ''}
                  onChange={(e) => set('section', e.target.value)}
                  className={selectClass}
                  disabled={configLoading}
                >
                  <option value="">Select section</option>
                  {sections.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shift">Shift</Label>
                <select
                  id="shift"
                  value={form.shift ?? ''}
                  onChange={(e) => set('shift', e.target.value)}
                  className={selectClass}
                  disabled={configLoading}
                >
                  <option value="">Select shift</option>
                  {shifts.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="group">Group</Label>
                <select
                  id="group"
                  value={form.group ?? ''}
                  onChange={(e) => set('group', e.target.value)}
                  className={selectClass}
                  disabled={configLoading}
                >
                  <option value="">Select group</option>
                  {groups.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="rollNo">Roll No</Label>
                <Input
                  id="rollNo"
                  value={form.rollNo ?? ''}
                  onChange={(e) => set('rollNo', e.target.value)}
                  placeholder="Roll number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyFee">Monthly Fee (৳)</Label>
                <Input
                  id="monthlyFee"
                  type="number"
                  min="0"
                  value={form.monthlyFee ?? ''}
                  onChange={(e) => set('monthlyFee', e.target.value)}
                  placeholder="e.g. 1500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admissionDate">Admission Date</Label>
                <Input
                  id="admissionDate"
                  type="date"
                  value={form.admissionDate ?? ''}
                  onChange={(e) => set('admissionDate', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/students')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {student ? 'Save Changes' : 'Add Student'}
          </Button>
        </div>
      </form>
    </div>
  );
}
