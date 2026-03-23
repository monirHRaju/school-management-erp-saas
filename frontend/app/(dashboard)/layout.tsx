'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const navItems = [
  { href: '/dashboard', label: 'Home' },
  { href: '/dashboard/students', label: 'Students' },
  { href: '/dashboard/fees', label: 'Fees' },
  { href: '/dashboard/income', label: 'Income' },
  { href: '/dashboard/attendance', label: 'Attendance' },
  { href: '/dashboard/income-expense', label: 'Income / Expense' },
  { href: '/dashboard/sms', label: 'SMS' },
  { href: '/dashboard/subscription', label: 'Subscription' },
  { href: '/dashboard/settings', label: 'Settings' },
];

function NavLinks({
  pathname,
  onLinkClick,
  mobile = false,
}: {
  pathname: string;
  onLinkClick?: () => void;
  mobile?: boolean;
}) {
  return (
    <nav className={mobile ? 'flex flex-1 flex-col gap-1 p-4' : 'flex-1 space-y-0.5 p-2'}>
      {navItems.map(({ href, label }) => {
        const isActive =
          pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            className={
              mobile
                ? `flex items-center justify-between rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`
                : `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`
            }
          >
            {label}
            {mobile && <ChevronRight className="h-4 w-4 opacity-50" />}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, loading, user, school, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [loading, isAuthenticated]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const pageTitle =
    pathname === '/dashboard'
      ? 'Dashboard'
      : pathname
          .split('/')
          .slice(2)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '))
          .join(' / ') || 'Dashboard';

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar - hidden on mobile */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex h-full flex-col">
          <div className="border-b border-sidebar-border p-4">
            <Link
              href="/dashboard"
              className="text-lg font-semibold tracking-tight text-sidebar-foreground"
            >
              {school?.name || 'School'}
            </Link>
          </div>
          <NavLinks pathname={pathname} />
        </div>
      </aside>

      {/* Mobile nav sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex flex-col border-b border-sidebar-border p-4">
            <span className="text-lg font-semibold text-sidebar-foreground">
              {school?.name || 'School'}
            </span>
          </div>
          <NavLinks pathname={pathname} onLinkClick={() => setMobileMenuOpen(false)} mobile />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-medium text-foreground md:text-base">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <div className="hidden items-center gap-2 border-l border-border pl-3 md:flex">
              <span className="text-sm text-foreground">{user?.name}</span>
              <span className="text-xs text-muted-foreground">({user?.role})</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label="Log out"
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
