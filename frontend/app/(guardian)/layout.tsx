'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, LogOut, ChevronRight, Home, Users, CreditCard, Bell, UserCircle, BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/NotificationBell';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const navConfig = [
  { href: '/guardian', key: 'home', icon: Home },
  { href: '/guardian/children', key: 'myChildren', icon: Users },
  { href: '/guardian/fees', key: 'feesPayment', icon: CreditCard },
  { href: '/guardian/notices', key: 'notices', icon: Bell },
  { href: '/guardian/homework', key: 'homework', icon: BookOpen },
  { href: '/guardian/profile', key: 'profile', icon: UserCircle },
] as const;

function NavLinks({
  pathname,
  onLinkClick,
  mobile = false,
  t,
}: {
  pathname: string;
  onLinkClick?: () => void;
  mobile?: boolean;
  t: ReturnType<typeof useTranslations<'guardianNav'>>;
}) {
  return (
    <nav className={mobile ? 'flex flex-1 flex-col gap-1 p-4' : 'flex-1 space-y-0.5 p-2'}>
      {navConfig.map(({ href, key, icon: Icon }) => {
        const isActive =
          pathname === href || (href !== '/guardian' && pathname.startsWith(href));
        const label = t(key);
        return (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            className={
              mobile
                ? `flex items-center justify-between rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary/20 text-sidebar-primary'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`
                : `group relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-sidebar-primary/20 text-sidebar-primary'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  }`
            }
          >
            {isActive && !mobile && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.75 rounded-r-full bg-sidebar-primary" />
            )}
            <span className="flex items-center gap-2.5">
              <Icon className={`h-4 w-4 ${isActive ? 'text-sidebar-primary' : 'text-sidebar-foreground/60 group-hover:text-sidebar-foreground/90'}`} />
              {label}
            </span>
            {mobile && <ChevronRight className="h-4 w-4 opacity-50" />}
          </Link>
        );
      })}
    </nav>
  );
}

export default function GuardianLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, loading, user, school, logout } = useAuth();
  const t = useTranslations('guardianNav');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = '/login';
    }
    if (!loading && isAuthenticated && user?.role !== 'guardian') {
      window.location.href = '/dashboard';
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

  if (!isAuthenticated || user?.role !== 'guardian') return null;

  const pageTitle = (() => {
    const match = navConfig.find(
      (n) => n.href === pathname || (n.href !== '/guardian' && pathname.startsWith(n.href))
    );
    return match ? t(match.key) : t('home');
  })();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex sticky top-0 h-screen">
        <div className="flex h-full flex-col">
          <div className="border-b border-sidebar-border p-4">
            <Link href="/guardian" className="text-lg font-semibold tracking-tight text-sidebar-foreground">
              {school?.name || 'School'}
            </Link>
            <p className="text-xs text-sidebar-foreground/60 mt-0.5">{t('guardianPortal')}</p>
          </div>
          <NavLinks pathname={pathname} t={t} />
        </div>
      </aside>

      {/* Mobile nav sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar">
          <div className="flex flex-col border-b border-sidebar-border p-4">
            <span className="text-lg font-semibold text-sidebar-foreground">
              {school?.name || 'School'}
            </span>
            <span className="text-xs text-sidebar-foreground/60">{t('guardianPortal')}</span>
          </div>
          <NavLinks pathname={pathname} onLinkClick={() => setMobileMenuOpen(false)} mobile t={t} />
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
            <h1 className="truncate text-sm font-medium text-foreground md:text-base">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <LocaleSwitcher />
            <ThemeToggle />
            <NotificationBell noticesHref="/guardian/notices" />
            <div className="hidden items-center gap-2 border-l border-border pl-3 md:flex">
              <span className="text-sm text-foreground">{user?.name}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label={t('logout')}
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
