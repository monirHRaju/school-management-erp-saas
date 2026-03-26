'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Menu,
  LogOut,
  ChevronRight,
  ChevronLeft,
  LayoutDashboard,
  GraduationCap,
  Receipt,
  TrendingUp,
  CalendarCheck,
  ArrowLeftRight,
  MessageSquare,
  ShoppingCart,
  Bell,
  Megaphone,
  Users,
  CreditCard,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/NotificationBell';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

type Role = 'admin' | 'staff' | 'accountant' | 'guardian';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  group: 'main' | 'communication' | 'system';
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'staff', 'accountant'], group: 'main' },
  { href: '/dashboard/students', label: 'Students', icon: GraduationCap, roles: ['admin', 'staff'], group: 'main' },
  { href: '/dashboard/fees', label: 'Fees', icon: Receipt, roles: ['admin', 'staff', 'accountant'], group: 'main' },
  { href: '/dashboard/income', label: 'Income', icon: TrendingUp, roles: ['admin', 'staff', 'accountant'], group: 'main' },
  { href: '/dashboard/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['admin', 'staff'], group: 'main' },
  { href: '/dashboard/income-expense', label: 'Income / Expense', icon: ArrowLeftRight, roles: ['admin', 'accountant'], group: 'main' },
  { href: '/dashboard/sms', label: 'SMS', icon: MessageSquare, roles: ['admin'], group: 'communication' },
  { href: '/dashboard/sms-order', label: 'Buy SMS', icon: ShoppingCart, roles: ['admin'], group: 'communication' },
  { href: '/dashboard/school-notices', label: 'School Notices', icon: Megaphone, roles: ['admin', 'staff', 'accountant'], group: 'communication' },
  { href: '/dashboard/notices', label: 'System Notices', icon: Bell, roles: ['admin', 'staff', 'accountant'], group: 'communication' },
  { href: '/dashboard/users', label: 'Users', icon: Users, roles: ['admin'], group: 'system' },
  { href: '/dashboard/subscription', label: 'Subscription', icon: CreditCard, roles: ['admin'], group: 'system' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['admin'], group: 'system' },
];

const STORAGE_KEY = 'sidebar-collapsed';

function NavGroup({
  items,
  pathname,
  showLabels,
  onLinkClick,
  mobile = false,
}: {
  items: NavItem[];
  pathname: string;
  showLabels: boolean;
  onLinkClick?: () => void;
  mobile?: boolean;
}) {
  return (
    <>
      {items.map(({ href, label, icon: Icon }) => {
        const isActive =
          pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
        if (mobile) {
          return (
            <Link
              key={href}
              href={href}
              onClick={onLinkClick}
              className={`flex items-center justify-between rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-primary/10 text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                {label}
              </span>
              <ChevronRight className="h-4 w-4 opacity-40" />
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            title={!showLabels ? label : undefined}
            className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
              isActive
                ? 'bg-sidebar-primary/10 text-sidebar-primary'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
            }`}
          >
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.75 rounded-r-full bg-sidebar-primary" />
            )}
            <Icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80'}`} />
            {showLabels && (
              <span className="truncate whitespace-nowrap">{label}</span>
            )}
          </Link>
        );
      })}
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, loading, user, school, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setCollapsed(true);
    } catch { /* ignore */ }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const showLabels = !collapsed || hovered;

  const filteredNav = useMemo(() => {
    const role = user?.role || 'staff';
    return navItems.filter((item) => item.roles.includes(role as Role));
  }, [user?.role]);

  const groupedNav = useMemo(() => {
    const main = filteredNav.filter((i) => i.group === 'main');
    const communication = filteredNav.filter((i) => i.group === 'communication');
    const system = filteredNav.filter((i) => i.group === 'system');
    return { main, communication, system };
  }, [filteredNav]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = '/login';
    }
    if (!loading && isAuthenticated && user?.role === 'guardian') {
      window.location.href = '/guardian';
    }
  }, [loading, isAuthenticated, user?.role]);

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

  const schoolInitial = (school?.name || 'S')[0].toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        onMouseEnter={() => collapsed && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`hidden md:flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out sticky top-0 h-screen ${
          showLabels ? 'w-64' : 'w-17'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-sidebar-border p-4 min-h-14.25">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 min-w-0"
            >
              {showLabels ? (
                <span className="text-lg font-semibold tracking-tight text-sidebar-foreground truncate">
                  {school?.name || 'School'}
                </span>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sm font-bold text-sidebar-primary">
                  {schoolInitial}
                </span>
              )}
            </Link>
            {showLabels && (
              <button
                onClick={toggleCollapsed}
                className="rounded-md p-1.5 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-1">
            {/* Main group */}
            <NavGroup items={groupedNav.main} pathname={pathname} showLabels={showLabels} />

            {/* Communication group */}
            {groupedNav.communication.length > 0 && (
              <>
                <div className="my-2 mx-1 border-t border-sidebar-border/50" />
                <NavGroup items={groupedNav.communication} pathname={pathname} showLabels={showLabels} />
              </>
            )}

            {/* System group */}
            {groupedNav.system.length > 0 && (
              <>
                <div className="my-2 mx-1 border-t border-sidebar-border/50" />
                <NavGroup items={groupedNav.system} pathname={pathname} showLabels={showLabels} />
              </>
            )}
          </div>

          {/* Footer - collapse toggle (when no labels shown / collapsed+not hovered) */}
          {!showLabels && (
            <div className="border-t border-sidebar-border p-2">
              <button
                onClick={toggleCollapsed}
                className="flex w-full items-center justify-center rounded-lg p-2.5 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                aria-label="Expand sidebar"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
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
          <nav className="flex flex-1 flex-col gap-1 p-4">
            <NavGroup
              items={filteredNav}
              pathname={pathname}
              showLabels
              onLinkClick={() => setMobileMenuOpen(false)}
              mobile
            />
          </nav>
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
            <NotificationBell noticesHref="/dashboard/school-notices" />
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
