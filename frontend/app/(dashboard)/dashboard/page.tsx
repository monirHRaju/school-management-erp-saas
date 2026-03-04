import Link from 'next/link';
import { Users, CreditCard, ClipboardList, Wallet, Settings, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const links = [
  { title: 'Students', desc: 'Manage student records and guardian info', href: '/dashboard/students', icon: Users },
  { title: 'Fees', desc: 'Fee types, assignments, and payments', href: '/dashboard/fees', icon: CreditCard },
  { title: 'Attendance', desc: 'Mark and view daily attendance', href: '/dashboard/attendance', icon: ClipboardList },
  { title: 'Income / Expense', desc: 'Simple income and expense ledger', href: '/dashboard/income-expense', icon: Wallet },
  { title: 'Settings', desc: 'Users and school profile', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Welcome back
        </h1>
        <p className="mt-1 text-muted-foreground">
          Use the menu to open Students, Fees, Attendance, or Settings.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map(({ title, desc, href, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="group h-full transition-colors hover:border-primary/50 hover:bg-accent/50">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-foreground group-hover:text-primary">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
