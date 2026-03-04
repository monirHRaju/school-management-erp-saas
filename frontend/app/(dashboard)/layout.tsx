'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const navItems = [
  { href: '/dashboard', label: 'Home' },
  { href: '/dashboard/students', label: 'Students' },
  { href: '/dashboard/fees', label: 'Fees' },
  { href: '/dashboard/attendance', label: 'Attendance' },
  { href: '/dashboard/income-expense', label: 'Income / Expense' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, loading, user, school, logout } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-sidebar-border bg-sidebar">
        <div className="flex h-full flex-col">
          <div className="border-b border-sidebar-border p-4">
            <Link href="/dashboard" className="text-lg font-semibold text-sidebar-foreground">
              {school?.name || 'School'}
            </Link>
          </div>
          <nav className="flex-1 space-y-0.5 p-2">
            {navItems.map(({ href, label }) => {
              const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-card">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="text-sm text-muted-foreground">
              {pathname === '/dashboard' ? 'Dashboard' : pathname.split('/').slice(2).join(' / ') || 'Dashboard'}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-foreground">
                {user?.name}
                <span className="ml-1 text-muted-foreground">({user?.role})</span>
              </span>
              <button
                type="button"
                onClick={logout}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Log out
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
