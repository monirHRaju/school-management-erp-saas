'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import {
  Shield, LayoutDashboard, School, CreditCard, MessageSquare, Bell,
  LogOut, Menu, X, ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/super-admin/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/super-admin/schools',    label: 'Schools',    icon: School },
  { href: '/super-admin/plans',      label: 'Plans',      icon: CreditCard },
  { href: '/super-admin/sms-orders', label: 'SMS Orders', icon: MessageSquare },
  { href: '/super-admin/notices',    label: 'Notices',    icon: Bell },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, admin, logout } = useSuperAdmin();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoginPage = pathname === '/super-admin/login';

  useEffect(() => {
    if (!loading && !isAuthenticated && !isLoginPage) {
      window.location.href = '/super-admin/login';
    }
  }, [loading, isAuthenticated, isLoginPage]);

  if (loading && !isLoginPage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        {children}
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 flex flex-col bg-zinc-900 border-r border-zinc-800/60 transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto lg:h-screen lg:sticky lg:top-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-zinc-800/60">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Amar School</p>
            <p className="text-xs text-indigo-400 font-medium">Super Admin</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== '/super-admin/dashboard' && pathname.startsWith(href));
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-indigo-500/15 text-indigo-300' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
                {active && <ChevronRight className="w-3 h-3 ml-auto opacity-40" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-zinc-800/60 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 shrink-0">
              {admin?.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-200 truncate">{admin?.name}</p>
              <p className="text-[10px] text-zinc-600 truncate">{admin?.email}</p>
            </div>
          </div>
          <button onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-3 h-14 px-4 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md">
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/60 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <h1 className="text-sm font-semibold text-zinc-300 flex-1">
            {navItems.find(n => pathname === n.href || pathname.startsWith(n.href + '/'))?.label || 'Super Admin'}
          </h1>
          <span className="hidden sm:flex items-center gap-2 text-xs text-zinc-600 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Super Admin Portal
          </span>
        </header>
        <main className="flex-1 p-5 lg:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
