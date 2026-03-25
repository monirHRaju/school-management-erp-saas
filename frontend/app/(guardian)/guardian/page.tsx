'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Child {
  _id: string;
  name: string;
  class: string;
  section?: string;
  rollNo?: string;
}

interface NoticeSummary {
  _id: string;
  title: string;
  createdAt: string;
  isRead: boolean;
}

export default function GuardianDashboard() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [notices, setNotices] = useState<NoticeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    Promise.all([
      apiRequest<{ success: boolean; data: Child[] }>('/api/guardian/children', { token }),
      apiRequest<{ success: boolean; data: NoticeSummary[] }>('/api/guardian/notices', { token }),
    ])
      .then(([childrenRes, noticesRes]) => {
        if (childrenRes.success) setChildren(childrenRes.data || []);
        if (noticesRes.success) setNotices((noticesRes.data || []).slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const unreadCount = notices.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Welcome, {user?.name || 'Guardian'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          View your children&apos;s information, fees, and notices
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/guardian/children"
          className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
        >
          <p className="text-sm text-muted-foreground">My Children</p>
          <p className="text-3xl font-bold text-foreground mt-1">{children.length}</p>
        </Link>
        <Link
          href="/guardian/notices"
          className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
        >
          <p className="text-sm text-muted-foreground">Unread Notices</p>
          <p className="text-3xl font-bold text-foreground mt-1">{unreadCount}</p>
        </Link>
        <Link
          href="/guardian/fees"
          className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
        >
          <p className="text-sm text-muted-foreground">Fees & Payment</p>
          <p className="text-sm font-medium text-primary mt-2">View fees →</p>
        </Link>
      </div>

      {/* Children list */}
      {children.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h3 className="font-semibold text-foreground">My Children</h3>
          </div>
          <div className="divide-y divide-border">
            {children.map((child) => (
              <Link
                key={child._id}
                href={`/guardian/children/${child._id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">{child.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Class {child.class}{child.section ? ` - ${child.section}` : ''}
                    {child.rollNo ? ` | Roll: ${child.rollNo}` : ''}
                  </p>
                </div>
                <span className="text-xs text-primary">View →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent notices */}
      {notices.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h3 className="font-semibold text-foreground">Recent Notices</h3>
            <Link href="/guardian/notices" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-border">
            {notices.map((notice) => (
              <div
                key={notice._id}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-2">
                  {!notice.isRead && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                  <p className={`text-sm ${notice.isRead ? 'text-muted-foreground' : 'font-medium text-foreground'}`}>
                    {notice.title}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-3">
                  {new Date(notice.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
