'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { apiRequest } from '@/lib/api';
import type { SchoolDetail, SchoolUser, SubscriptionPlan } from '@/types/superAdmin';
import { Users, BookOpen, Calendar, ChevronLeft } from 'lucide-react';

const planColors: Record<string, string> = {
  free:     'bg-zinc-700/50 text-zinc-300',
  standard: 'bg-indigo-500/15 text-indigo-300',
  pro:      'bg-violet-500/15 text-violet-300',
};

export default function SchoolDetailPage() {
  const { token, isAuthenticated, loading } = useSuperAdmin();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [detail, setDetail] = useState<SchoolDetail | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  // School settings form
  const [infoForm, setInfoForm] = useState({ name: '', contact: '' });
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');

  // Plan form
  const [planForm, setPlanForm] = useState({ plan_slug: '', subscription_expiry: '' });
  const [savingPlan, setSavingPlan] = useState(false);
  const [planMsg, setPlanMsg] = useState('');

  // Custom limits form
  const [limitsForm, setLimitsForm] = useState({ maxStudents: '', maxAdmins: '' });
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsMsg, setLimitsMsg] = useState('');

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

  const fetchPlans = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiRequest<{ success: boolean; data: SubscriptionPlan[] }>(
        '/api/super-admin/plans',
        { token }
      );
      if (res.success) setPlans(res.data ?? []);
    } catch { /* ignore */ }
  }, [token]);

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
        const s = res.data.school;
        setDetail(res.data);
        setInfoForm({ name: s.name, contact: s.contact || '' });
        setPlanForm({
          plan_slug: s.plan_slug || 'free',
          subscription_expiry: s.subscription_expiry
            ? new Date(s.subscription_expiry).toISOString().split('T')[0]
            : '',
        });
        setLimitsForm({
          maxStudents: s.custom_limits?.maxStudents != null ? String(s.custom_limits.maxStudents) : '',
          maxAdmins:   s.custom_limits?.maxAdmins   != null ? String(s.custom_limits.maxAdmins)   : '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load school');
    } finally {
      setLoadingData(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchDetail();
      fetchPlans();
    }
  }, [isAuthenticated, token, fetchDetail, fetchPlans]);

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault();
    setSavingInfo(true); setInfoMsg('');
    try {
      await apiRequest(`/api/super-admin/schools/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: infoForm.name, contact: infoForm.contact }),
        token: token!,
      });
      setInfoMsg('Saved');
      fetchDetail();
    } catch (err) {
      setInfoMsg(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingInfo(false);
      setTimeout(() => setInfoMsg(''), 3000);
    }
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    setSavingPlan(true); setPlanMsg('');
    try {
      await apiRequest(`/api/super-admin/schools/${id}/plan`, {
        method: 'PUT',
        body: JSON.stringify({
          plan_slug: planForm.plan_slug,
          subscription_expiry: planForm.subscription_expiry || null,
        }),
        token: token!,
      });
      setPlanMsg('Plan updated');
      fetchDetail();
    } catch (err) {
      setPlanMsg(err instanceof Error ? err.message : 'Failed to update plan');
    } finally {
      setSavingPlan(false);
      setTimeout(() => setPlanMsg(''), 3000);
    }
  }

  async function handleSaveLimits(e: React.FormEvent) {
    e.preventDefault();
    setSavingLimits(true); setLimitsMsg('');
    try {
      await apiRequest(`/api/super-admin/schools/${id}/limits`, {
        method: 'PUT',
        body: JSON.stringify({
          maxStudents: limitsForm.maxStudents !== '' ? Number(limitsForm.maxStudents) : null,
          maxAdmins:   limitsForm.maxAdmins   !== '' ? Number(limitsForm.maxAdmins)   : null,
        }),
        token: token!,
      });
      setLimitsMsg('Limits updated');
      fetchDetail();
    } catch (err) {
      setLimitsMsg(err instanceof Error ? err.message : 'Failed to update limits');
    } finally {
      setSavingLimits(false);
      setTimeout(() => setLimitsMsg(''), 3000);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetUser) return;
    setResetting(true); setResetMsg(''); setResetError('');
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
      router.push('/super-admin/schools');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
      setShowDelete(false);
    }
  }

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (error && !detail) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-red-400">{error}</p>
        <Link href="/super-admin/schools" className="text-indigo-400 hover:text-indigo-300 text-sm">← Back to schools</Link>
      </div>
    );
  }

  const school = detail?.school;
  const users = detail?.users || [];
  const currentPlan = plans.find(p => p.slug === school?.plan_slug);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Link href="/super-admin/schools" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Schools
        </Link>
        <span className="text-zinc-700">/</span>
        <span className="text-sm text-zinc-300 font-medium">{school?.name}</span>
        <span className={`ml-2 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${planColors[school?.plan_slug || 'free'] || planColors.free}`}>
          {school?.plan_slug || 'free'}
        </span>
      </div>

      {resetMsg && (
        <div className="rounded-xl bg-emerald-900/20 border border-emerald-800/60 px-4 py-3 text-emerald-400 text-sm">{resetMsg}</div>
      )}
      {error && (
        <div className="rounded-xl bg-red-900/20 border border-red-800/60 px-4 py-3 text-red-400 text-sm">{error}</div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BookOpen, label: 'Students', value: detail?.studentCount ?? 0 },
          { icon: Users,    label: 'Staff',    value: users.length },
          { icon: Calendar, label: 'Joined',   value: school?.createdAt ? new Date(school.createdAt).toLocaleDateString() : '—' },
          { icon: Calendar, label: 'Expires',  value: school?.subscription_expiry ? new Date(school.subscription_expiry).toLocaleDateString() : 'No expiry' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="text-sm font-semibold text-zinc-200">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Info */}
        <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-white">School Info</h3>
          <form onSubmit={handleSaveInfo} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">School Name</label>
              <input value={infoForm.name}
                onChange={e => setInfoForm(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Contact</label>
              <input value={infoForm.contact}
                onChange={e => setInfoForm(f => ({ ...f, contact: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                placeholder="contact@school.com"
              />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={savingInfo}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors">
                {savingInfo ? 'Saving…' : 'Save'}
              </button>
              {infoMsg && <span className={`text-sm ${infoMsg.includes('fail') ? 'text-red-400' : 'text-emerald-400'}`}>{infoMsg}</span>}
            </div>
          </form>
        </div>

        {/* Subscription Plan */}
        <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold text-white">Subscription Plan</h3>
          {currentPlan && (
            <div className="bg-zinc-800/40 rounded-lg px-3 py-2 text-xs text-zinc-400 space-y-0.5">
              <p>Current: <span className="text-zinc-200 font-medium">{currentPlan.name}</span> — ৳{currentPlan.price}/mo</p>
              <p>Students: {currentPlan.maxStudents === -1 ? 'Unlimited' : currentPlan.maxStudents} · Admins: {currentPlan.maxAdmins === -1 ? 'Unlimited' : currentPlan.maxAdmins}</p>
            </div>
          )}
          <form onSubmit={handleSavePlan} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Plan</label>
              <select value={planForm.plan_slug}
                onChange={e => setPlanForm(f => ({ ...f, plan_slug: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500">
                {plans.length === 0 && <option value="free">free</option>}
                {plans.map(p => (
                  <option key={p._id} value={p.slug}>{p.name} — ৳{p.price}/mo</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Expiry Date</label>
              <input type="date" value={planForm.subscription_expiry}
                onChange={e => setPlanForm(f => ({ ...f, subscription_expiry: e.target.value }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={savingPlan}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors">
                {savingPlan ? 'Updating…' : 'Update Plan'}
              </button>
              {planMsg && <span className={`text-sm ${planMsg.includes('fail') ? 'text-red-400' : 'text-emerald-400'}`}>{planMsg}</span>}
            </div>
          </form>
        </div>

        {/* Custom Limits Override */}
        <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-white">Custom Limits Override</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Leave blank to use plan defaults. Set -1 for unlimited.</p>
          </div>
          <form onSubmit={handleSaveLimits} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Max Students</label>
                <input type="number" min="-1" value={limitsForm.maxStudents}
                  onChange={e => setLimitsForm(f => ({ ...f, maxStudents: e.target.value }))}
                  placeholder="Plan default"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Max Admins</label>
                <input type="number" min="-1" value={limitsForm.maxAdmins}
                  onChange={e => setLimitsForm(f => ({ ...f, maxAdmins: e.target.value }))}
                  placeholder="Plan default"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 placeholder-zinc-600"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={savingLimits}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors">
                {savingLimits ? 'Saving…' : 'Save Limits'}
              </button>
              <button type="button"
                onClick={() => { setLimitsForm({ maxStudents: '', maxAdmins: '' }); }}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 border border-zinc-700 rounded-xl transition-colors">
                Reset to Plan
              </button>
              {limitsMsg && <span className={`text-sm ${limitsMsg.includes('fail') ? 'text-red-400' : 'text-emerald-400'}`}>{limitsMsg}</span>}
            </div>
          </form>
        </div>

        {/* Danger Zone */}
        <div className="bg-zinc-900 border border-red-900/40 rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-red-400">Danger Zone</h3>
          <p className="text-xs text-zinc-500">Permanently delete this school and all associated data. This cannot be undone.</p>
          <button onClick={() => setShowDelete(true)}
            className="px-4 py-2 text-sm font-medium text-red-400 border border-red-800/60 rounded-xl hover:bg-red-900/20 transition-colors">
            Delete School
          </button>
        </div>
      </div>

      {/* Staff Accounts Table */}
      <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800/60">
          <h3 className="font-semibold text-white">Staff Accounts <span className="text-zinc-500 font-normal text-sm">({users.length})</span></h3>
        </div>
        {users.length === 0 ? (
          <p className="px-5 py-10 text-center text-zinc-600 text-sm">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/40">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3 font-medium text-zinc-200">{u.name}</td>
                    <td className="px-5 py-3 text-zinc-500 hidden sm:table-cell">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        u.role === 'admin' ? 'bg-amber-500/15 text-amber-300'
                        : u.role === 'accountant' ? 'bg-emerald-500/15 text-emerald-300'
                        : 'bg-zinc-700/50 text-zinc-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => { setResetUser(u); setNewPassword(''); setResetError(''); }}
                        className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors">
                        Reset password
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reset Password Modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="font-semibold text-white mb-1">Reset Password</h2>
            <p className="text-sm text-zinc-400 mb-4">Set a new password for <strong className="text-zinc-200">{resetUser.name}</strong></p>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">New Password</label>
                <input type="password" required minLength={6} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              {resetError && <p className="text-sm text-red-400">{resetError}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setResetUser(null)}
                  className="px-4 py-2 text-sm text-zinc-400 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={resetting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl transition-colors">
                  {resetting ? 'Resetting…' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-red-900/50 rounded-2xl p-6">
            <h2 className="font-semibold text-red-400 mb-2">Delete School</h2>
            <p className="text-sm text-zinc-400 mb-4">
              This will permanently delete <strong className="text-zinc-200">{school?.name}</strong> and all users, students, and fees. This cannot be undone.
            </p>
            <p className="text-xs text-zinc-500 mb-2">Type the school slug to confirm:</p>
            <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
              placeholder={school?.slug}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 font-mono mb-4 focus:outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowDelete(false); setDeleteConfirm(''); }}
                className="px-4 py-2 text-sm text-zinc-400 border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting || deleteConfirm !== school?.slug}
                className="px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
