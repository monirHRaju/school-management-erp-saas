export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <main className="w-full max-w-2xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          School Management
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          Simple fee management, attendance, and income/expense for small private schools.
        </p>
      </main>
    </div>
  );
}
