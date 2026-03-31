'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
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

const emptyForm: StudentFormData = {
  name: '',
  fatherName: '',
  fatherProfession: '',
  motherName: '',
  motherProfession: '',
  guardianName: '',
  guardianPhone: '',
  guardianRelation: '',
  guardianProfession: '',
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
  admissionDate: '',
  status: 'active',
};

const selectClass = cn(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
);

interface StudentFormProps {
  student?: Student; // if provided, we're editing
}

export default function StudentForm({ student }: StudentFormProps) {
  const router = useRouter();
  const { token } = useAuth();
  const { classes, sections, shifts, groups, loading: configLoading } = useAcademicConfig();

  const [form, setForm] = useState<StudentFormData>(() => {
    if (!student) return emptyForm;
    return {
      name: student.name,
      fatherName: student.fatherName ?? '',
      fatherProfession: student.fatherProfession ?? '',
      motherName: student.motherName ?? '',
      motherProfession: student.motherProfession ?? '',
      guardianName: student.guardianName ?? '',
      guardianPhone: student.guardianPhone ?? '',
      guardianRelation: student.guardianRelation ?? '',
      guardianProfession: student.guardianProfession ?? '',
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
      admissionDate: student.admissionDate ? student.admissionDate.slice(0, 10) : '',
      status: student.status,
    };
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
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

      const payload = {
        name: form.name.trim(),
        fatherName: form.fatherName?.trim() || undefined,
        fatherProfession: form.fatherProfession?.trim() || undefined,
        motherName: form.motherName?.trim() || undefined,
        motherProfession: form.motherProfession?.trim() || undefined,
        guardianName: form.guardianName?.trim() || undefined,
        guardianPhone: form.guardianPhone?.trim() || undefined,
        guardianRelation: form.guardianRelation?.trim() || undefined,
        guardianProfession: form.guardianProfession?.trim() || undefined,
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                placeholder="Student name"
              />
            </div>

            {/* Date of Birth & Birth Reg No */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={form.dateOfBirth ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthRegNo">Birth Registration No</Label>
                <Input
                  id="birthRegNo"
                  value={form.birthRegNo ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, birthRegNo: e.target.value }))}
                  placeholder="Birth registration number"
                />
              </div>
            </div>

            {/* Gender & Religion */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  value={form.gender ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
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
                <Input
                  id="religion"
                  value={form.religion ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, religion: e.target.value }))}
                  placeholder="e.g. Islam, Hindu, Christian"
                />
              </div>
            </div>

            {/* Father */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fatherName">Father Name</Label>
                <Input
                  id="fatherName"
                  value={form.fatherName ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, fatherName: e.target.value }))}
                  placeholder="Father name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fatherProfession">Father Profession</Label>
                <Input
                  id="fatherProfession"
                  value={form.fatherProfession ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, fatherProfession: e.target.value }))}
                  placeholder="e.g. Farmer, Teacher, Business"
                />
              </div>
            </div>

            {/* Mother */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="motherName">Mother Name</Label>
                <Input
                  id="motherName"
                  value={form.motherName ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, motherName: e.target.value }))}
                  placeholder="Mother name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="motherProfession">Mother Profession</Label>
                <Input
                  id="motherProfession"
                  value={form.motherProfession ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, motherProfession: e.target.value }))}
                  placeholder="e.g. Homemaker, Doctor"
                />
              </div>
            </div>

            {/* Guardian */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guardianName">Guardian Name</Label>
                <Input
                  id="guardianName"
                  value={form.guardianName ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))}
                  placeholder="Guardian / emergency contact"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianRelation">Relation with Student</Label>
                <Input
                  id="guardianRelation"
                  value={form.guardianRelation ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, guardianRelation: e.target.value }))}
                  placeholder="e.g. Father, Mother, Uncle"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="guardianPhone">Guardian Phone</Label>
                <Input
                  id="guardianPhone"
                  value={form.guardianPhone ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, guardianPhone: e.target.value }))}
                  placeholder="e.g. 01XXXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="guardianProfession">Guardian Profession</Label>
                <Input
                  id="guardianProfession"
                  value={form.guardianProfession ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, guardianProfession: e.target.value }))}
                  placeholder="e.g. Business, Service"
                />
              </div>
            </div>

            {/* WhatsApp & Address */}
            <div className="space-y-2">
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
              <Input
                id="whatsappNumber"
                value={form.whatsappNumber ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
                placeholder="e.g. 01XXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <textarea
                id="address"
                value={form.address ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Village, Upazila, District"
                rows={2}
                className={cn(
                  'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none'
                )}
              />
            </div>

            {/* Photo */}
            <div className="space-y-2">
              <Label htmlFor="photo">Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setPhotoFile(file);
                }}
              />
              {form.photoUrl && !photoFile && (
                <p className="text-xs text-muted-foreground">
                  Existing photo will be kept if you do not upload a new one.
                </p>
              )}
            </div>

            {/* Class & Section */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <select
                  id="class"
                  value={form.class ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
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
                  onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
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

            {/* Shift & Group */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shift">Shift</Label>
                <select
                  id="shift"
                  value={form.shift ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value }))}
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
                  onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
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

            {/* Roll No */}
            <div className="space-y-2">
              <Label htmlFor="rollNo">Roll No</Label>
              <Input
                id="rollNo"
                value={form.rollNo ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, rollNo: e.target.value }))}
                placeholder="Roll number"
              />
            </div>

            {/* Monthly Fee & Admission Date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="monthlyFee">Monthly Fee</Label>
                <Input
                  id="monthlyFee"
                  type="number"
                  min="0"
                  value={form.monthlyFee ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyFee: e.target.value }))}
                  placeholder="e.g. 1500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admissionDate">Admission Date</Label>
                <Input
                  id="admissionDate"
                  type="date"
                  value={form.admissionDate ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, admissionDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Student['status'] }))}
                className={selectClass}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
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
        </CardContent>
      </Card>
    </div>
  );
}
