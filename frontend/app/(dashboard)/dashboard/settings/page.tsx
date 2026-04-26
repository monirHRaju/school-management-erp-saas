'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Settings2, BookOpen, Loader2, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SchoolProfile {
  _id: string;
  name: string;
  slug: string;
  contact?: string;
  address?: string;
  logoUrl?: string;
}

export default function SettingsPage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    apiRequest<{ success: boolean; data: SchoolProfile }>('/api/settings', { token })
      .then((res) => {
        if (res.success && res.data) {
          setProfile(res.data);
          setName(res.data.name);
          setContact(res.data.contact ?? '');
          setAddress(res.data.address ?? '');
          setLogoUrl(res.data.logoUrl ?? '');
          setLogoPreview(res.data.logoUrl ?? '');
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2 MB');
      return;
    }
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !name.trim()) {
      toast.error('School name is required');
      return;
    }
    setSaving(true);
    try {
      let finalLogoUrl = logoUrl;

      if (logoFile) {
        const toBase64 = (file: File) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        const dataUrl = await toBase64(logoFile);
        const uploadRes = await apiRequest<{ success: boolean; data?: { url: string }; error?: string }>(
          '/api/students/photo',
          { method: 'POST', body: JSON.stringify({ image: dataUrl }), token }
        );
        if (!uploadRes.success || !uploadRes.data) {
          throw new Error(uploadRes.error || 'Logo upload failed');
        }
        finalLogoUrl = uploadRes.data.url;
      }

      await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ name: name.trim(), contact: contact.trim(), address: address.trim(), logoUrl: finalLogoUrl }),
        token,
      });
      setLogoUrl(finalLogoUrl);
      setLogoFile(null);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
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
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your school profile and configuration.</p>
      </div>

      {/* School Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" />
            School Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div
                className="relative h-20 w-20 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {logoPreview ? (
                  <Image src={logoPreview} alt="School logo" fill className="object-cover" />
                ) : (
                  <Camera className="h-6 w-6 text-muted-foreground" />
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                  <Camera className="h-5 w-5 text-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium">School Logo</p>
                <p className="text-xs text-muted-foreground">Click to upload. Max 2 MB.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>

            {/* School Name */}
            <div className="space-y-1.5">
              <Label htmlFor="schoolName">School Name *</Label>
              <Input
                id="schoolName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter school name"
                required
              />
            </div>

            {/* School Slug (read-only) */}
            <div className="space-y-1.5">
              <Label htmlFor="slug">School ID (Slug)</Label>
              <Input
                id="slug"
                value={profile?.slug ?? ''}
                readOnly
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">The school ID cannot be changed.</p>
            </div>

            {/* Contact */}
            <div className="space-y-1.5">
              <Label htmlFor="contact">Contact Number</Label>
              <Input
                id="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. +880 1700 000000"
              />
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Dattapara, Tongi, Gazipur"
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Academic Configuration Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            Academic Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Manage the lists of Classes, Sections, Shifts, and Groups used across the school.
          </p>
          <Link
            href="/dashboard/settings/academic"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Open Academic Settings
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
