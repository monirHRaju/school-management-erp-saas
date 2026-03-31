'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { User, BookOpen, Camera, Loader2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UserProfile {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  photoUrl?: string;
  address?: string;
  dateOfBirth?: string;
  gender?: string;
  religion?: string;
  designation?: string;
  qualification?: string;
  experience?: string;
  subjects?: string[];
  joiningDate?: string;
}

function toInputDate(iso?: string) {
  if (!iso) return '';
  return iso.split('T')[0];
}

export default function ProfilePage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Personal fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [religion, setReligion] = useState('');

  // Academic fields
  const [designation, setDesignation] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState('');

  // Photo
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ success: boolean; data: UserProfile }>('/api/profile', { token: token ?? undefined })
      .then((res) => {
        if (res.success && res.data) {
          const d = res.data;
          setProfile(d);
          setName(d.name ?? '');
          setPhone(d.phone ?? '');
          setAddress(d.address ?? '');
          setDateOfBirth(toInputDate(d.dateOfBirth));
          setGender(d.gender ?? '');
          setReligion(d.religion ?? '');
          setDesignation(d.designation ?? '');
          setQualification(d.qualification ?? '');
          setExperience(d.experience ?? '');
          setJoiningDate(toInputDate(d.joiningDate));
          setSubjects(d.subjects ?? []);
          setPhotoPreview(d.photoUrl ?? '');
        }
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo must be under 2 MB');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const addSubject = () => {
    const s = subjectInput.trim();
    if (s && !subjects.includes(s)) {
      setSubjects((prev) => [...prev, s]);
    }
    setSubjectInput('');
  };

  const removeSubject = (s: string) => {
    setSubjects((prev) => prev.filter((x) => x !== s));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      let photoBase64: string | undefined;

      if (photoFile) {
        photoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(photoFile);
        });
      }

      const body: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
        religion: religion.trim() || undefined,
        designation: designation.trim() || undefined,
        qualification: qualification.trim() || undefined,
        experience: experience.trim() || undefined,
        joiningDate: joiningDate || undefined,
        subjects,
      };
      if (photoBase64) body.photoBase64 = photoBase64;

      const res = await apiRequest<{ success: boolean; data?: UserProfile; error?: string }>(
        '/api/profile',
        { method: 'PATCH', body: JSON.stringify(body), token: token ?? undefined }
      );
      if (!res.success) throw new Error(res.error || 'Update failed');
      if (res.data?.photoUrl) setPhotoPreview(res.data.photoUrl);
      setPhotoFile(null);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your personal and academic information.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <div
                className="relative h-20 w-20 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-border bg-muted flex items-center justify-center hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {photoPreview ? (
                  <Image src={photoPreview} alt="Profile photo" fill className="object-cover" />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" />
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">Profile Photo</p>
                <p className="text-xs text-muted-foreground">Click to upload. Max 2 MB.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose Photo
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pName">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="pName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pPhone">Phone</Label>
                <Input
                  id="pPhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pEmail">Email</Label>
              <Input
                id="pEmail"
                value={profile?.email ?? ''}
                readOnly
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pDob">Date of Birth</Label>
                <Input
                  id="pDob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pGender">Gender</Label>
                <select
                  id="pGender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pReligion">Religion</Label>
                <Input
                  id="pReligion"
                  value={religion}
                  onChange={(e) => setReligion(e.target.value)}
                  placeholder="e.g. Islam, Christianity..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pAddress">Address</Label>
              <textarea
                id="pAddress"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Your full address"
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* Academic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pDesignation">Designation</Label>
                <Input
                  id="pDesignation"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="e.g. Senior Teacher"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pQualification">Qualification</Label>
                <Input
                  id="pQualification"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g. M.Sc., B.Ed."
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pExperience">Experience</Label>
                <Input
                  id="pExperience"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="e.g. 5 years"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pJoining">Joining Date</Label>
                <Input
                  id="pJoining"
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                />
              </div>
            </div>

            {/* Subjects */}
            <div className="space-y-1.5">
              <Label>Subjects</Label>
              <div className="flex gap-2">
                <Input
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubject(); } }}
                  placeholder="Type a subject and press Enter"
                />
                <Button type="button" variant="outline" size="icon" onClick={addSubject}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {subjects.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => removeSubject(s)}
                        className="text-primary/60 hover:text-primary transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Profile
        </Button>
      </form>
    </div>
  );
}
