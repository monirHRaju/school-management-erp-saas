import Link from 'next/link';

export default function StudentsPlaceholderPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Students</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">Student management will be available here.</p>
      <Link href="/dashboard" className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
        ← Back to Dashboard
      </Link>
    </div>
  );
}
