'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const SUB_PAGES = [
  { href: '/dashboard/settings/academic/classes', label: 'Classes' },
  { href: '/dashboard/settings/academic/sessions', label: 'Sessions' },
  { href: '/dashboard/settings/academic/sections', label: 'Sections' },
  { href: '/dashboard/settings/academic/subjects', label: 'Subjects' },
  { href: '/dashboard/settings/academic/shifts', label: 'Shifts' },
  { href: '/dashboard/settings/academic/groups', label: 'Groups' },
  { href: '/dashboard/settings/academic/holidays', label: 'Holidays' },
];

export default function AcademicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-1 border-b border-border pb-3">
        {SUB_PAGES.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
