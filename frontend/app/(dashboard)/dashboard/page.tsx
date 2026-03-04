import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Dashboard</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Welcome. Use the sidebar to open Students, Fees, Attendance, Income/Expense, or Settings.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { title: 'Students', desc: 'Manage student records', href: '/dashboard/students' },
          { title: 'Fees', desc: 'Fee types, assignments, payments', href: '/dashboard/fees' },
          { title: 'Attendance', desc: 'Daily attendance', href: '/dashboard/attendance' },
          { title: 'Income / Expense', desc: 'Simple ledger', href: '/dashboard/income-expense' },
          { title: 'Settings', desc: 'Users and school', href: '/dashboard/settings' },
        ].map(({ title, desc, href }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300 hover:shadow dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
          >
            <h2 className="font-medium text-zinc-900 dark:text-zinc-50">{title}</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
