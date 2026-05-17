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
  ChevronDown,
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
  BookOpen,
  UserCheck,
  UserPlus,
  Wallet,
  IdCard,
  PartyPopper,
  SlidersHorizontal,
  BookMarked,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/NotificationBell';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

type Role = 'admin' | 'staff' | 'accountant' | 'guardian' | 'teacher';

interface NavLeaf {
  href: string;
  labelKey: string;
  icon?: LucideIcon;
}

interface NavItem {
  key: string;
  labelKey: string;
  icon: LucideIcon;
  roles: Role[];
  href?: string;
  children?: NavLeaf[];
}

const navItems: NavItem[] = [
  {
    key: 'dashboard',
    labelKey: 'dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    roles: ['admin', 'staff', 'accountant', 'teacher'],
  },
  {
    key: 'new-admission',
    labelKey: 'newAdmission',
    icon: UserPlus,
    href: '/dashboard/students/new',
    roles: ['admin', 'staff'],
  },
  {
    key: 'students',
    labelKey: 'students',
    icon: GraduationCap,
    roles: ['admin', 'staff', 'teacher'],
    children: [
      { href: '/dashboard/students', labelKey: 'allStudents' },
      { href: '/dashboard/students/admit-card', labelKey: 'admitCard', icon: IdCard },
    ],
  },
  {
    key: 'accounts',
    labelKey: 'accounts',
    icon: Wallet,
    roles: ['admin', 'staff', 'accountant'],
    children: [
      { href: '/dashboard/fees', labelKey: 'feesAndDue', icon: Receipt },
      { href: '/dashboard/income', labelKey: 'income', icon: TrendingUp },
      { href: '/dashboard/income-expense', labelKey: 'incomeExpense', icon: ArrowLeftRight },
    ],
  },
  {
    key: 'attendance',
    labelKey: 'attendance',
    icon: CalendarCheck,
    roles: ['admin', 'staff', 'teacher'],
    children: [
      { href: '/dashboard/attendance', labelKey: 'takeAttendance' },
      { href: '/dashboard/attendance?tab=monthly', labelKey: 'attendanceReport' },
      { href: '/dashboard/attendance?tab=holidays', labelKey: 'holidays', icon: PartyPopper },
    ],
  },
  {
    key: 'homework',
    labelKey: 'homework',
    icon: BookOpen,
    href: '/dashboard/homework',
    roles: ['admin', 'staff', 'teacher'],
  },
  {
    key: 'sms',
    labelKey: 'bulkSMS',
    icon: MessageSquare,
    roles: ['admin'],
    children: [
      { href: '/dashboard/sms', labelKey: 'sendSMS' },
      { href: '/dashboard/sms-order', labelKey: 'buySMS', icon: ShoppingCart },
    ],
  },
  {
    key: 'notices',
    labelKey: 'notices',
    icon: Megaphone,
    roles: ['admin', 'staff', 'accountant', 'teacher'],
    children: [
      { href: '/dashboard/school-notices', labelKey: 'schoolNotices' },
      { href: '/dashboard/notices', labelKey: 'systemNotices', icon: Bell },
    ],
  },
  {
    key: 'manage-users',
    labelKey: 'manageUsers',
    icon: Users,
    roles: ['admin'],
    children: [
      { href: '/dashboard/users', labelKey: 'staffAndUsers' },
      { href: '/dashboard/teachers', labelKey: 'teachers', icon: UserCheck },
    ],
  },
  {
    key: 'subscription',
    labelKey: 'subscription',
    icon: CreditCard,
    href: '/dashboard/subscription',
    roles: ['admin'],
  },
  {
    key: 'settings',
    labelKey: 'settings',
    icon: Settings,
    roles: ['admin'],
    children: [
      { href: '/dashboard/settings', labelKey: 'general', icon: SlidersHorizontal },
      { href: '/dashboard/settings/academic', labelKey: 'academic', icon: BookMarked },
    ],
  },
];

const STORAGE_KEY = 'sidebar-collapsed';
const OPEN_GROUPS_KEY = 'sidebar-open-groups';

function isLinkActive(pathname: string, href: string) {
  const cleanHref = href.split('?')[0];
  if (cleanHref === '/dashboard') return pathname === '/dashboard';
  return pathname === cleanHref || pathname.startsWith(cleanHref + '/');
}

function NavGroup({
  items,
  pathname,
  showLabels,
  openGroups,
  onToggleGroup,
  onLinkClick,
  mobile = false,
  t,
}: {
  items: NavItem[];
  pathname: string;
  showLabels: boolean;
  openGroups: Set<string>;
  onToggleGroup: (key: string) => void;
  onLinkClick?: () => void;
  mobile?: boolean;
  t: ReturnType<typeof useTranslations<'nav'>>;
}) {
  return (
    <>
      {items.map((item) => {
        const { key, labelKey, icon: Icon, href, children } = item;
        const label = t(labelKey as Parameters<typeof t>[0]);

        // Single link
        if (href) {
          const isActive = isLinkActive(pathname, href);
          return (
            <Link
              key={key}
              href={href}
              onClick={onLinkClick}
              title={!showLabels ? label : undefined}
              className={`group relative flex items-center gap-3 rounded-lg px-3 ${mobile ? 'py-3 text-base' : 'py-2.5 text-[13px]'} font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-sidebar-primary/10 text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.75 rounded-r-full bg-sidebar-primary" />
              )}
              <Icon className={`${mobile ? 'h-5 w-5' : 'h-4.5 w-4.5'} shrink-0 transition-colors ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground/90'}`} />
              {showLabels && <span className="truncate whitespace-nowrap">{label}</span>}
            </Link>
          );
        }

        // Collapsible group
        if (!children) return null;
        const open = openGroups.has(key);
        const groupActive = children.some((c) => isLinkActive(pathname, c.href));

        return (
          <div key={key}>
            <button
              type="button"
              onClick={() => onToggleGroup(key)}
              title={!showLabels ? label : undefined}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 ${mobile ? 'py-3 text-base' : 'py-2.5 text-[13px]'} font-medium transition-all duration-200 ${
                groupActive
                  ? 'bg-sidebar-primary/10 text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              }`}
            >
              {groupActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.75 rounded-r-full bg-sidebar-primary" />
              )}
              <Icon className={`${mobile ? 'h-5 w-5' : 'h-4.5 w-4.5'} shrink-0 ${groupActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground/90'}`} />
              {showLabels && (
                <>
                  <span className="truncate whitespace-nowrap flex-1 text-left">{label}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 opacity-60 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                  />
                </>
              )}
            </button>

            {showLabels && open && (
              <div className="mt-1 ml-7 mb-1 space-y-0.5 border-l border-sidebar-border/60 pl-3">
                {children.map((leaf) => {
                  const ChildIcon = leaf.icon;
                  const childActive = isLinkActive(pathname, leaf.href);
                  const childLabel = t(leaf.labelKey as Parameters<typeof t>[0]);
                  return (
                    <Link
                      key={leaf.href}
                      href={leaf.href}
                      onClick={onLinkClick}
                      className={`flex items-center gap-2 rounded-md px-2.5 ${mobile ? 'py-2 text-sm' : 'py-2 text-[12.5px]'} transition-colors ${
                        childActive
                          ? 'bg-sidebar-primary/10 text-sidebar-primary font-medium'
                          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
                      }`}
                    >
                      {ChildIcon && <ChildIcon className="h-3.5 w-3.5 shrink-0 opacity-70" />}
                      <span className="truncate">{childLabel}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, loading, user, school, logout } = useAuth();
  const t = useTranslations('nav');
  const tHeader = useTranslations('header');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') setCollapsed(true);
      const storedGroups = localStorage.getItem(OPEN_GROUPS_KEY);
      if (storedGroups) {
        try {
          const arr = JSON.parse(storedGroups);
          if (Array.isArray(arr)) setOpenGroups(new Set(arr));
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const toggleGroup = useCallback((key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try { localStorage.setItem(OPEN_GROUPS_KEY, JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const showLabels = !collapsed || hovered;

  const filteredNav = useMemo(() => {
    const role = user?.role || 'staff';
    return navItems.filter((item) => item.roles.includes(role as Role));
  }, [user?.role]);

  // Auto-open group when current path matches a child
  useEffect(() => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      let changed = false;
      filteredNav.forEach((item) => {
        if (item.children && item.children.some((c) => isLinkActive(pathname, c.href))) {
          if (!next.has(item.key)) {
            next.add(item.key);
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [pathname, filteredNav]);

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
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Build a human-readable page title from the pathname
  const pageTitle =
    pathname === '/dashboard'
      ? t('dashboard')
      : pathname
          .split('/')
          .slice(2)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '))
          .join(' / ') || t('dashboard');

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
          {/* Sidebar header */}
          <div className="flex items-center justify-between border-b border-sidebar-border p-4 min-h-14.25">
            <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
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
                aria-label={tHeader('collapseExpand')}
              >
                <ChevronLeft className={`h-4 w-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-1">
            <NavGroup
              items={filteredNav}
              pathname={pathname}
              showLabels={showLabels}
              openGroups={openGroups}
              onToggleGroup={toggleGroup}
              t={t}
            />
          </div>

          {/* Collapsed expand button */}
          {!showLabels && (
            <div className="border-t border-sidebar-border p-2">
              <button
                onClick={toggleCollapsed}
                className="flex w-full items-center justify-center rounded-lg p-2.5 text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                aria-label={tHeader('expandSidebar')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile nav sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <div className="flex flex-col border-b border-sidebar-border p-4 shrink-0">
            <span className="text-lg font-semibold text-sidebar-foreground">
              {school?.name || 'School'}
            </span>
          </div>
          <nav className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 p-4">
            <NavGroup
              items={filteredNav}
              pathname={pathname}
              showLabels
              openGroups={openGroups}
              onToggleGroup={toggleGroup}
              onLinkClick={() => setMobileMenuOpen(false)}
              mobile
              t={t}
            />
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label={tHeader('openMenu')}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-medium text-foreground md:text-base">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language switcher */}
            <LocaleSwitcher />

            <ThemeToggle />
            <NotificationBell noticesHref="/dashboard/school-notices" />

            <div className="hidden items-center gap-2 border-l border-border pl-3 md:flex">
              <Link
                href="/dashboard/profile"
                className="text-sm text-foreground hover:text-primary transition-colors"
              >
                {user?.name}
              </Link>
              <span className="text-xs text-muted-foreground">({user?.role})</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label={tHeader('logout')}
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
