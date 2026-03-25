'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Notice {
  _id: string;
  title: string;
  message: string;
  type: string;
  created_by?: { name: string; role: string };
  createdAt: string;
  isRead: boolean;
}

export default function GuardianNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiRequest<{ success: boolean; data: Notice[] }>('/api/school-notices?limit=50', { token })
      .then((res) => {
        if (res.success) setNotices(res.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    const notice = notices.find((n) => n._id === id);
    if (notice && !notice.isRead) {
      const token = getToken();
      if (token) {
        apiRequest(`/api/school-notices/${id}/read`, { method: 'POST', token }).catch(() => {});
        setNotices((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notices.length === 0) {
    return <p className="text-center text-muted-foreground py-20">No notices yet.</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Notices</h2>
      <div className="space-y-2">
        {notices.map((notice) => (
          <div
            key={notice._id}
            className={`rounded-xl border bg-card transition-colors ${
              notice.isRead ? 'border-border' : 'border-primary/30 bg-primary/5'
            }`}
          >
            <button
              onClick={() => toggleExpand(notice._id)}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {!notice.isRead && (
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                )}
                <div className="min-w-0">
                  <span className={`block truncate text-sm ${notice.isRead ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
                    {notice.title}
                  </span>
                  {notice.created_by && (
                    <span className="text-xs text-muted-foreground capitalize">
                      From: {notice.created_by.name} ({notice.created_by.role})
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ml-3">
                {new Date(notice.createdAt).toLocaleDateString()}
              </span>
            </button>
            {expanded === notice._id && (
              <div className="border-t border-border px-5 py-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">{notice.message}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
