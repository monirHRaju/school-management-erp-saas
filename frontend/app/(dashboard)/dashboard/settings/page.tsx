'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { Settings2, BookOpen, Loader2, Camera, Plus, X, Tags } from 'lucide-react';
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
  nameBn?: string;
  slug: string;
  contact?: string;
  address?: string;
  logoUrl?: string;
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const { token } = useAuth();
  const [profile, setProfile] = useState<SchoolProfile | null>(null);
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Categories state
  const [feeCategories, setFeeCategories] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [newFeeCategory, setNewFeeCategory] = useState('');
  const [newExpenseCategory, setNewExpenseCategory] = useState('');
  const [savingCategories, setSavingCategories] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiRequest<{ success: boolean; data: SchoolProfile }>('/api/settings', { token }),
      apiRequest<{ success: boolean; data: { feeCategories: string[]; expenseCategories: string[] } }>(
        '/api/settings/categories', { token }
      ),
    ])
      .then(([settingsRes, catRes]) => {
        if (settingsRes.success && settingsRes.data) {
          setProfile(settingsRes.data);
          setName(settingsRes.data.name);
          setNameBn(settingsRes.data.nameBn ?? '');
          setContact(settingsRes.data.contact ?? '');
          setAddress(settingsRes.data.address ?? '');
          setLogoUrl(settingsRes.data.logoUrl ?? '');
          setLogoPreview(settingsRes.data.logoUrl ?? '');
        }
        if (catRes.success && catRes.data) {
          setFeeCategories(catRes.data.feeCategories || []);
          setExpenseCategories(catRes.data.expenseCategories || []);
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSaveCategories = async () => {
    if (!token) return;
    setSavingCategories(true);
    try {
      await apiRequest('/api/settings/categories', {
        method: 'PUT',
        body: JSON.stringify({ feeCategories, expenseCategories }),
        token,
      });
      toast.success('Categories saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingCategories(false);
    }
  };

  const addFeeCategory = () => {
    const v = newFeeCategory.trim();
    if (!v || feeCategories.includes(v)) return;
    setFeeCategories([...feeCategories, v]);
    setNewFeeCategory('');
  };

  const addExpenseCategory = () => {
    const v = newExpenseCategory.trim();
    if (!v || expenseCategories.includes(v)) return;
    setExpenseCategories([...expenseCategories, v]);
    setNewExpenseCategory('');
  };

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
        body: JSON.stringify({ name: name.trim(), nameBn: nameBn.trim(), contact: contact.trim(), address: address.trim(), logoUrl: finalLogoUrl }),
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
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* School Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4" />
            {t('schoolProfile')}
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
                <p className="text-sm font-medium">{t('logoLabel')}</p>
                <p className="text-xs text-muted-foreground">{t('logoNote')}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t('chooseFile')}
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

            {/* School Name (English) */}
            <div className="space-y-1.5">
              <Label htmlFor="schoolName">{t('schoolNameEnLabel')}</Label>
              <Input
                id="schoolName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter school name in English"
                required
              />
            </div>

            {/* School Name (Bangla) */}
            <div className="space-y-1.5">
              <Label htmlFor="schoolNameBn">{t('schoolNameBnLabel')}</Label>
              <Input
                id="schoolNameBn"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="বিদ্যালয়ের নাম বাংলায়"
              />
              <p className="text-xs text-muted-foreground">{t('schoolNameBnNote')}</p>
            </div>

            {/* School Slug (read-only) */}
            <div className="space-y-1.5">
              <Label htmlFor="slug">{t('schoolIdLabel')}</Label>
              <Input
                id="slug"
                value={profile?.slug ?? ''}
                readOnly
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">{t('schoolIdNote')}</p>
            </div>

            {/* Contact */}
            <div className="space-y-1.5">
              <Label htmlFor="contact">{t('contact')}</Label>
              <Input
                id="contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="e.g. +880 1700 000000"
              />
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address">{t('address')}</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Dattapara, Tongi, Gazipur"
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full sm:w-auto">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Fee & Expense Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tags className="h-4 w-4" />
            {t('feeExpenseCategories')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Fee Categories */}
          <div>
            <Label className="mb-2 block text-sm font-medium">{t('feeCategories')}</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {feeCategories.map((cat) => (
                <span key={cat} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
                  {cat}
                  <button
                    type="button"
                    onClick={() => setFeeCategories(feeCategories.filter((c) => c !== cat))}
                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newFeeCategory}
                onChange={(e) => setNewFeeCategory(e.target.value)}
                placeholder={t('newFeeCategory')}
                className="max-w-xs"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addFeeCategory())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addFeeCategory}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Expense Categories */}
          <div>
            <Label className="mb-2 block text-sm font-medium">{t('expenseCategories')}</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {expenseCategories.map((cat) => (
                <span key={cat} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium">
                  {cat}
                  <button
                    type="button"
                    onClick={() => setExpenseCategories(expenseCategories.filter((c) => c !== cat))}
                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newExpenseCategory}
                onChange={(e) => setNewExpenseCategory(e.target.value)}
                placeholder={t('newExpenseCategory')}
                className="max-w-xs"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExpenseCategory())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addExpenseCategory}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button onClick={handleSaveCategories} disabled={savingCategories} className="w-full sm:w-auto">
            {savingCategories && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('saveCategories')}
          </Button>
        </CardContent>
      </Card>

      {/* Academic Configuration Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4" />
            {t('academicConfig')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t('academicConfigDesc')}
          </p>
          <Link
            href="/dashboard/settings/academic"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {t('openAcademic')}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
