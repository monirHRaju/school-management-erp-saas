'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Child {
  _id: string;
  name: string;
  class: string;
  section?: string;
  rollNo?: string;
  status?: string;
  guardianPhone?: string;
  guardianName?: string;
}

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiRequest<{ success: boolean; data: Child[] }>('/api/guardian/children', { token })
      .then((res) => {
        if (res.success) setChildren(res.data || []);
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

  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-foreground">No children found</p>
        <p className="text-sm text-muted-foreground mt-1">Your account is not linked to any students yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">My Children</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {children.map((child) => (
          <Link
            key={child._id}
            href={`/guardian/children/${child._id}`}
            className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 transition-colors"
          >
            <p className="text-lg font-semibold text-foreground">{child.name}</p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>Class: {child.class}{child.section ? ` | Section: ${child.section}` : ''}</p>
              {child.rollNo && <p>Roll No: {child.rollNo}</p>}
              {child.status && (
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                  child.status === 'active'
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-red-500/10 text-red-500'
                }`}>
                  {child.status}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
