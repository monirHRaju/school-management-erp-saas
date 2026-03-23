'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { apiRequest } from '@/lib/api';
import toast from 'react-hot-toast';
import { Loader2, Bell, Trash2, Send, Plus } from 'lucide-react';

interface NoticeEntry {
  _id: string;
  title: string;
  message: string;
  target: string;
  type: string;
  from: string;
  createdAt: string;
}

export default function SuperAdminNoticesPage() {
  const { token } = useSuperAdmin();

  const [notices, setNotices] = useState<NoticeEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // New notice form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [creating, setCreating] = useState(false);

  const loadNotices = useCallback(async (p = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        data: NoticeEntry[];
        totalPages: number;
      }>(`/api/super-admin/notices?page=${p}&limit=15`, { token });
      setNotices(res.data);
      setTotalPages(res.totalPages);
      setPage(p);
    } catch {
      toast.error('Failed to load notices.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadNotices(); }, [loadNotices]);

  const handleCreate = async () => {
    if (!token || !title || !message) return;
    setCreating(true);
    try {
      await apiRequest('/api/super-admin/notices', {
        method: 'POST',
        body: JSON.stringify({ title, message, target: target || 'all' }),
        token,
      });
      toast.success('Notice created!');
      setTitle('');
      setMessage('');
      setTarget('all');
      setShowForm(false);
      loadNotices();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create notice.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    setDeletingId(id);
    try {
      await apiRequest(`/api/super-admin/notices/${id}`, { method: 'DELETE', token });
      toast.success('Notice deleted.');
      loadNotices(page);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Notices</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Send notices to all schools or individual schools.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors"
        >
          <Plus className="w-4 h-4" /> New Notice
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Send className="w-4 h-4" /> Create Notice
          </h3>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Title</label>
            <input
              type="text"
              placeholder="Notice title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Message</label>
            <textarea
              rows={3}
              placeholder="Notice message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Target</label>
            <input
              type="text"
              placeholder="'all' or School ObjectId"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-64 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <p className="text-xs text-zinc-600">Use &quot;all&quot; for all schools, or paste a school ID for a specific school.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !title || !message}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Notice'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-400 text-sm hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notices List */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading && notices.length === 0 ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>
        ) : notices.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-600">No notices yet.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-zinc-800/50">
              {notices.map((notice) => (
                <div key={notice._id} className="px-5 py-4 hover:bg-zinc-800/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-zinc-200">{notice.title}</h3>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          notice.type === 'auto'
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'bg-violet-500/15 text-violet-400'
                        }`}>
                          {notice.type === 'auto' ? 'Auto' : 'Manual'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
                          {notice.target === 'all' ? 'All Schools' : `School: ${notice.target.slice(-6)}`}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 line-clamp-2">{notice.message}</p>
                      <p className="text-xs text-zinc-600 mt-1">
                        {new Date(notice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' '}
                        {new Date(notice.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(notice._id)}
                      disabled={deletingId === notice._id}
                      className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                      title="Delete notice"
                    >
                      {deletingId === notice._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-zinc-800">
                <button
                  onClick={() => loadNotices(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1 text-xs rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-xs text-zinc-600">{page} / {totalPages}</span>
                <button
                  onClick={() => loadNotices(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-xs rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
