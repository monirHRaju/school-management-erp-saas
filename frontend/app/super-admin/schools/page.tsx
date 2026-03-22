'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { apiRequest } from '@/lib/api';
import type { SchoolWithCounts } from '@/types/superAdmin';
import { Search, ExternalLink, Users, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

const LIMIT = 20;

const planColors: Record<string, string> = {
  free:     'bg-zinc-700/50 text-zinc-300',
  standard: 'bg-indigo-500/15 text-indigo-300',
  pro:      'bg-violet-500/15 text-violet-300',
};

export default function SuperAdminSchoolsPage() {
  const { token } = useSuperAdmin();
  const [schools, setSchools] = useState<SchoolWithCounts[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchSchools = useCallback(async (pg = 1, q = query) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
      if (q) params.set('search', q);
      const res = await apiRequest<{ success: boolean; data: SchoolWithCounts[]; total: number; page: number; totalPages: number }>(
        `/api/super-admin/schools?${params}`,
        { token: token! }
      );
      if (res.success) {
        setSchools(res.data ?? []);
        setTotal(res.total ?? 0);
        setPage(res.page ?? 1);
        setTotalPages(res.totalPages ?? 1);
      }
    } finally {
      setLoading(false);
    }
  }, [token, query]);

  useEffect(() => { fetchSchools(1, query); }, [token]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(search);
    fetchSchools(1, search);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Schools</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{total} total schools registered</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or slug…"
            className="w-full bg-zinc-900 border border-zinc-700/60 text-zinc-100 placeholder-zinc-600 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
          />
        </div>
        <button type="submit" className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors">
          Search
        </button>
      </form>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : schools.length === 0 ? (
          <div className="text-center py-16 text-zinc-600">No schools found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/60">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">School</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Plan</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Students</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Users</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {schools.map((s) => (
                  <tr key={s._id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-zinc-100">{s.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{s.slug}</p>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${planColors[s.plan_slug] || planColors.free}`}>
                        {s.plan_slug || 'free'}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <BookOpen className="w-3.5 h-3.5" />{s.studentCount}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="flex items-center gap-1.5 text-zinc-400">
                        <Users className="w-3.5 h-3.5" />{s.userCount}
                      </span>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell text-zinc-500 text-xs">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/super-admin/schools/${s._id}`}
                        className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors"
                      >
                        Manage <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-zinc-600">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fetchSchools(page - 1)}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-zinc-400 font-medium">{page} / {totalPages}</span>
            <button
              onClick={() => fetchSchools(page + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
