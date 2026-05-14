'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { apiRequest } from '@/lib/api';
import { Search, ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';

interface DemoRequest {
  _id: string;
  name: string;
  email?: string;
  occupation?: string;
  institution?: string;
  mobile: string;
  address?: string;
  specialRequirements?: string;
  heardFrom?: string;
  isVerified: boolean;
  verifiedAt?: string;
  createdAt: string;
}

const LIMIT = 20;

export default function DemoRequestsPage() {
  const { token } = useSuperAdmin();
  const [requests, setRequests] = useState<DemoRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async (pg = 1, q = query) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
      if (q) params.set('search', q);
      const data = await apiRequest(`/api/demo/requests?${params}`, { token: token ?? undefined }) as {
        requests?: DemoRequest[];
        total?: number;
        totalPages?: number;
      };
      setRequests(data.requests ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setPage(pg);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [token, query]);

  useEffect(() => { fetchRequests(1, ''); }, [token]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(search);
    fetchRequests(1, search);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Demo Requests</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{total} total requests</p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or mobile..."
              className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 w-56"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">No demo requests found.</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800/60 bg-zinc-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Mobile</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden md:table-cell">Institution</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Heard From</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {requests.map((r) => (
                  <tr key={r._id} className="hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-zinc-200">{r.name}</p>
                        {r.email && <p className="text-xs text-zinc-600">{r.email}</p>}
                        {r.occupation && <p className="text-xs text-zinc-600">{r.occupation}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300 font-mono text-xs">{r.mobile}</td>
                    <td className="px-4 py-3 text-zinc-400 hidden md:table-cell">
                      {r.institution || <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">
                      {r.heardFrom || <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.isVerified ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 text-emerald-400 text-xs font-semibold rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 text-amber-400 text-xs font-semibold rounded-full">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs hidden sm:table-cell whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800/60">
              <p className="text-xs text-zinc-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchRequests(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fetchRequests(page + 1)}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
