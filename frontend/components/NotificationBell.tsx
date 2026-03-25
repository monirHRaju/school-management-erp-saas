'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Notice {
  _id: string;
  title: string;
  created_by?: { name: string; role: string };
  isRead: boolean;
  createdAt: string;
}

interface NotificationBellProps {
  noticesHref: string;
}

export function NotificationBell({ noticesHref }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiRequest<{ success: boolean; count: number }>('/api/school-notices/unread-count', { token })
      .then((res) => {
        if (res.success) setUnreadCount(res.count);
      })
      .catch(() => {});
  }, []);

  // Fetch recent notices when dropdown opens
  const loadNotices = useCallback(async () => {
    if (loaded) return;
    const token = getToken();
    if (!token) return;
    const res = await apiRequest<{ success: boolean; data: Notice[] }>(
      '/api/school-notices?limit=5',
      { token }
    );
    if (res.success) {
      setNotices(res.data || []);
      setLoaded(true);
    }
  }, [loaded]);

  useEffect(() => {
    if (open) loadNotices();
  }, [open, loadNotices]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleNoticeClick(notice: Notice) {
    // Mark as read
    if (!notice.isRead) {
      const token = getToken();
      if (token) {
        apiRequest(`/api/school-notices/${notice._id}/read`, { method: 'POST', token }).catch(() => {});
        setNotices((prev) => prev.map((n) => (n._id === notice._id ? { ...n, isRead: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    }
    setOpen(false);
    router.push(noticesHref);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
            )}
          </div>

          {notices.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notices.map((notice) => (
                <button
                  key={notice._id}
                  onClick={() => handleNoticeClick(notice)}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-2.5"
                >
                  {!notice.isRead && (
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                  <div className={`min-w-0 flex-1 ${notice.isRead ? 'pl-4.5' : ''}`}>
                    <p className={`text-sm truncate ${notice.isRead ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
                      {notice.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {notice.created_by?.name && (
                        <span className="capitalize">{notice.created_by.name} · </span>
                      )}
                      {new Date(notice.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => {
              setOpen(false);
              router.push(noticesHref);
            }}
            className="w-full px-4 py-2.5 text-xs font-medium text-primary hover:bg-muted/50 transition-colors border-t border-border text-center"
          >
            View all notices
          </button>
        </div>
      )}
    </div>
  );
}
