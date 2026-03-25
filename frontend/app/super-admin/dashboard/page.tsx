'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { apiRequest } from '@/lib/api';
import type { SAStats, SchoolWithCounts } from '@/types/superAdmin';

const LIMIT = 20;

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-5">
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { admin, token, isAuthenticated, loading, logout } = useSuperAdmin();
  const router = useRouter();

  const [stats, setStats] = useState<SAStats | null>(null);
  const [schools, setSchools] = useState<SchoolWithCounts[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState('');

  // Create school modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    schoolName: '', slug: '', contact: '',
    plan_slug: 'free', subscription_expiry: '',
    adminName: '', adminEmail: '', adminPassword: '',
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/super-admin/login');
    }
  }, [loading, isAuthenticated, router]);

  const fetchData = useCallback(
    async (pageNum = 1, q = search) => {
      if (!token) return;
      setLoadingData(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(pageNum), limit: String(LIMIT) });
        if (q) params.set('search', q);

        const [statsRes, schoolsRes] = await Promise.all([
          apiRequest<{ success: boolean; data: SAStats }>('/api/super-admin/stats', { token }),
          apiRequest<{ success: boolean; data: SchoolWithCounts[]; total: number; page: number; totalPages: number }>(
            `/api/super-admin/schools?${params}`,
            { token }
          ),
        ]);

        if (statsRes.success) setStats(statsRes.data);
        if (schoolsRes.success) {
          setSchools(schoolsRes.data);
          setTotal(schoolsRes.total);
          setPage(schoolsRes.page);
          setTotalPages(schoolsRes.totalPages);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoadingData(false);
      }
    },
    [token, search]
  );

  useEffect(() => {
    if (isAuthenticated && token) fetchData(1, search);
  }, [isAuthenticated, token, search]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  async function handleCreateSchool(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await apiRequest('/api/super-admin/schools', {
        method: 'POST',
        body: JSON.stringify(createForm),
        token: token!,
      });
      setShowCreate(false);
      setCreateForm({ schoolName: '', slug: '', contact: '', plan_slug: 'free', subscription_expiry: '', adminName: '', adminEmail: '', adminPassword: '' });
      fetchData(1, search);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create school');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-semibold text-white">Super Admin Console</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">{admin?.name}</span>
            <button
              onClick={logout}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="rounded-lg bg-red-900/20 border border-red-800 px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Schools" value={stats.totalSchools} sub={`+${stats.newSchoolsLast30Days} this month`} />
            <StatCard label="Total Students" value={stats.totalStudents} />
            <StatCard label="Total Users" value={stats.totalUsers} />
            <StatCard label="Pro Schools" value={stats.planBreakdown['pro'] || 0} sub={`${stats.planBreakdown['free'] || 0} on free`} />
          </div>
        )}

        {/* Schools Table */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800">
          <div className="px-6 py-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-semibold text-white">Schools ({total})</h2>
            <div className="flex gap-2">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search by name or slug…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none w-52"
                />
                <button type="submit" className="rounded-lg bg-zinc-700 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-600 transition-colors">
                  Search
                </button>
              </form>
              <button
                onClick={() => setShowCreate(true)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                + New School
              </button>
            </div>
          </div>

          {loadingData ? (
            <div className="px-6 py-12 text-center text-zinc-500 text-sm">Loading…</div>
          ) : schools.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-500 text-sm">No schools found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">School</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Slug</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Plan</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Expiry</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Users</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Students</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Registered</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {schools.map((s) => (
                    <tr key={s._id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-white">{s.name}</td>
                      <td className="px-6 py-3 text-zinc-400 font-mono text-xs">{s.slug}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.plan_slug === 'pro'
                            ? 'bg-indigo-900/40 text-indigo-300'
                            : 'bg-zinc-700 text-zinc-300'
                        }`}>
                          {s.plan_slug}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-zinc-400 text-xs">
                        {s.subscription_expiry
                          ? new Date(s.subscription_expiry).toLocaleDateString()
                          : <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-6 py-3 text-right text-zinc-300">{s.userCount}</td>
                      <td className="px-6 py-3 text-right text-zinc-300">{s.studentCount}</td>
                      <td className="px-6 py-3 text-zinc-400 text-xs">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          href={`/super-admin/schools/${s._id}`}
                          className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-zinc-800 flex items-center justify-between text-sm">
              <span className="text-zinc-500">
                Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchData(page - 1)}
                  disabled={page <= 1}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <span className="px-2 py-1 text-zinc-400">{page} / {totalPages}</span>
                <button
                  onClick={() => fetchData(page + 1)}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-zinc-700 px-3 py-1 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create School Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white text-lg">Create New School</h2>
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-zinc-300">✕</button>
            </div>
            <form onSubmit={handleCreateSchool} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">School Name *</label>
                  <input required value={createForm.schoolName} onChange={e => setCreateForm(f => ({ ...f, schoolName: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Slug *</label>
                  <input required value={createForm.slug} onChange={e => setCreateForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                    placeholder="my-school"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 font-mono focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Contact</label>
                  <input value={createForm.contact} onChange={e => setCreateForm(f => ({ ...f, contact: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Plan</label>
                  <select value={createForm.plan_slug} onChange={e => setCreateForm(f => ({ ...f, plan_slug: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none">
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Subscription Expiry</label>
                  <input type="date" value={createForm.subscription_expiry} onChange={e => setCreateForm(f => ({ ...f, subscription_expiry: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none" />
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-4">
                <p className="text-xs font-medium text-zinc-500 mb-3 uppercase tracking-wider">Admin Account</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Admin Name *</label>
                    <input required value={createForm.adminName} onChange={e => setCreateForm(f => ({ ...f, adminName: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Admin Email *</label>
                    <input required type="email" value={createForm.adminEmail} onChange={e => setCreateForm(f => ({ ...f, adminEmail: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Admin Password *</label>
                    <input required type="password" minLength={6} value={createForm.adminPassword} onChange={e => setCreateForm(f => ({ ...f, adminPassword: e.target.value }))}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none" />
                  </div>
                </div>
              </div>
              {createError && <p className="text-sm text-red-400 bg-red-900/20 rounded-lg px-3 py-2">{createError}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors">
                  {creating ? 'Creating…' : 'Create School'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
