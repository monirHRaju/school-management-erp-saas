'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { apiRequest } from '@/lib/api';
import type { SchoolDetail, SchoolUser } from '@/types/superAdmin';

export default function SchoolDetailPage() {
  const { token, isAuthenticated, loading } = useSuperAdmin();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [detail, setDetail] = useState<SchoolDetail | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Subscription edit form
  const [planForm, setPlanForm] = useState({ subscription_plan: '', subscription_expiry: '', name: '', contact: '' });

  // Reset password
  const [resetUser, setResetUser] = useState<SchoolUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [resetError, setResetError] = useState('');

  // Delete school
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/super-admin/login');
  }, [loading, isAuthenticated, router]);

  const fetchDetail = useCallback(async () => {
    if (!token) return;
    setLoadingData(true);
    setError('');
    try {
      const res = await apiRequest<{ success: boolean; data: SchoolDetail }>(
        `/api/super-admin/schools/${id}`,
        { token }
      );
      if (res.success) {
        setDetail(res.data);
        setPlanForm({
          subscription_plan: res.data.school.subscription_plan,
          subscription_expiry: res.data.school.subscription_expiry
            ? new Date(res.data.school.subscription_expiry).toISOString().split('T')[0]
            : '',
          name: res.data.school.name,
          contact: res.data.school.contact || '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load school');
    } finally {
      setLoadingData(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (isAuthenticated && token) fetchDetail();
  }, [isAuthenticated, token, fetchDetail]);

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      await apiRequest(`/api/super-admin/schools/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: planForm.name,
          contact: planForm.contact,
          subscription_plan: planForm.subscription_plan,
          subscription_expiry: planForm.subscription_expiry || null,
        }),
        token: token!,
      });
      setSaveMsg('Saved successfully');
      fetchDetail();
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUser) return;
    setResetting(true);
    setResetMsg('');
    setResetError('');
    try {
      await apiRequest(`/api/super-admin/schools/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ userId: resetUser._id, newPassword }),
        token: token!,
      });
      setResetMsg(`Password reset for ${resetUser.name}`);
      setResetUser(null);
      setNewPassword('');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirm !== detail?.school.slug) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/super-admin/schools/${id}`, {
        method: 'DELETE',
        token: token!,
      });
      router.push('/super-admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
      setShowDelete(false);
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (error && !detail) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <p className="text-red-400">{error}</p>
        <Link href="/super-admin/dashboard" className="text-indigo-400 hover:text-indigo-300 text-sm">← Back to dashboard</Link>
      </div>
    );
  }

  const school = detail?.school;
  const users = detail?.users || [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href="/super-admin/dashboard" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            ← Dashboard
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="font-semibold text-white">{school?.name}</span>
          <span className={`ml-auto inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            school?.subscription_plan === 'pro'
              ? 'bg-indigo-900/40 text-indigo-300'
              : 'bg-zinc-700 text-zinc-300'
          }`}>
            {school?.subscription_plan}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-900/20 border border-red-800 px-4 py-3 text-red-400 text-sm">{error}</div>
        )}
        {resetMsg && (
          <div className="rounded-lg bg-green-900/20 border border-green-800 px-4 py-3 text-green-400 text-sm">{resetMsg}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* School Info + Subscription */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
            <h2 className="font-semibold text-white mb-4">School Settings</h2>
            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">School Name</label>
                <input
                  value={planForm.name}
                  onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Contact</label>
                <input
                  value={planForm.contact}
                  onChange={e => setPlanForm(f => ({ ...f, contact: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Subscription Plan</label>
                <select
                  value={planForm.subscription_plan}
                  onChange={e => setPlanForm(f => ({ ...f, subscription_plan: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Subscription Expiry</label>
                <input
                  type="date"
                  value={planForm.subscription_expiry}
                  onChange={e => setPlanForm(f => ({ ...f, subscription_expiry: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                {saveMsg && (
                  <span className={`text-sm ${saveMsg.includes('fail') || saveMsg.includes('error') ? 'text-red-400' : 'text-green-400'}`}>
                    {saveMsg}
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* School Stats */}
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
              <h2 className="font-semibold text-white mb-3">Overview</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Slug</dt>
                  <dd className="text-zinc-300 font-mono">{school?.slug}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Students</dt>
                  <dd className="text-zinc-300">{detail?.studentCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Staff accounts</dt>
                  <dd className="text-zinc-300">{users.length}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Registered</dt>
                  <dd className="text-zinc-300">
                    {school?.createdAt ? new Date(school.createdAt).toLocaleDateString() : '—'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Danger Zone */}
            <div className="bg-zinc-900 rounded-xl border border-red-900/40 p-5">
              <h2 className="font-semibold text-red-400 mb-2">Danger Zone</h2>
              <p className="text-xs text-zinc-500 mb-3">Permanently delete this school and all associated data. This cannot be undone.</p>
              <button
                onClick={() => setShowDelete(true)}
                className="rounded-lg border border-red-800 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
              >
                Delete School
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="px-6 py-4 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Staff Accounts ({users.length})</h2>
          </div>
          {users.length === 0 ? (
            <p className="px-6 py-8 text-center text-zinc-500 text-sm">No users</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-3 font-medium text-white">{u.name}</td>
                    <td className="px-6 py-3 text-zinc-400">{u.email}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === 'admin'
                          ? 'bg-amber-900/30 text-amber-300'
                          : u.role === 'accountant'
                          ? 'bg-green-900/30 text-green-300'
                          : 'bg-zinc-700 text-zinc-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => { setResetUser(u); setNewPassword(''); setResetError(''); }}
                        className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
                      >
                        Reset password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Reset Password Modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <h2 className="font-semibold text-white text-lg mb-1">Reset Password</h2>
            <p className="text-sm text-zinc-400 mb-4">Set a new password for <strong className="text-zinc-200">{resetUser.name}</strong></p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              {resetError && <p className="text-sm text-red-400">{resetError}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setResetUser(null)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={resetting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                  {resetting ? 'Resetting…' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm bg-zinc-900 rounded-2xl border border-red-900/50 p-6">
            <h2 className="font-semibold text-red-400 text-lg mb-2">Delete School</h2>
            <p className="text-sm text-zinc-400 mb-4">
              This will permanently delete <strong className="text-zinc-200">{school?.name}</strong> and all users, students, and fees. This cannot be undone.
            </p>
            <p className="text-xs text-zinc-500 mb-2">Type the school slug to confirm:</p>
            <input
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={school?.slug}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 font-mono mb-4 focus:border-red-500 focus:outline-none"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirm !== school?.slug}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
