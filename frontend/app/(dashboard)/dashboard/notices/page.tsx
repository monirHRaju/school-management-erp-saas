'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { Loader2, Bell, Mail, MailOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface NoticeEntry {
  _id: string;
  title: string;
  message: string;
  target: string;
  type: string;
  from: string;
  isRead: boolean;
  createdAt: string;
}

export default function NoticesPage() {
  const { token } = useAuth();

  const [notices, setNotices] = useState<NoticeEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadNotices = useCallback(async (p = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        data: NoticeEntry[];
        totalPages: number;
      }>(`/api/notices?page=${p}&limit=20`, { token });
      setNotices(res.data);
      setTotalPages(res.totalPages);
      setPage(p);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadNotices(); }, [loadNotices]);

  const handleExpand = async (notice: NoticeEntry) => {
    if (expandedId === notice._id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(notice._id);

    if (!notice.isRead && token) {
      try {
        await apiRequest(`/api/notices/${notice._id}/read`, { method: 'POST', token });
        setNotices((prev) =>
          prev.map((n) => (n._id === notice._id ? { ...n, isRead: true } : n))
        );
      } catch { /* silent */ }
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5" /> Notices
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Notifications from system and admin.</p>
      </div>

      {loading && notices.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notices yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notices.map((notice) => {
            const isExpanded = expandedId === notice._id;
            return (
              <div
                key={notice._id}
                className={`bg-card border rounded-xl overflow-hidden transition-colors ${
                  notice.isRead ? 'border-border' : 'border-primary/30 bg-primary/[0.02]'
                }`}
              >
                <button
                  onClick={() => handleExpand(notice)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="mt-0.5 shrink-0">
                    {notice.isRead ? (
                      <MailOpen className="w-4 h-4 text-muted-foreground/50" />
                    ) : (
                      <Mail className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-medium truncate ${notice.isRead ? 'text-foreground/80' : 'text-foreground font-semibold'}`}>
                        {notice.title}
                      </h3>
                      {!notice.isRead && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(notice.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' '}
                      {new Date(notice.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      <span className="mx-1.5">·</span>
                      <span className="capitalize">{notice.from === 'system' ? 'System' : 'Admin'}</span>
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  )}
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pl-11">
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{notice.message}</p>
                  </div>
                )}
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => loadNotices(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
              <button
                onClick={() => loadNotices(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
