'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Sparkles, Loader2, X } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface StudentResult {
  _id: string;
  name: string;
  studentId?: string;
  rollNo?: string;
  class?: string;
  section?: string;
  guardianPhone?: string;
  phone?: string;
}

export function QuickStudentSearch() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!token || !query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const res = await apiRequest<{ success: boolean; data: StudentResult[] }>(
          `/api/students?q=${encodeURIComponent(query.trim())}&limit=6&page=1`,
          { token }
        );
        setResults(res.data || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, token]);

  function clear() {
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative mx-auto w-full max-w-2xl">
      <div className="relative flex items-center">
        <Sparkles className="absolute left-3.5 h-4 w-4 text-violet-500 pointer-events-none" />
        <Search className="absolute left-9 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search..."
          className="w-full rounded-2xl border-2 border-violet-200 dark:border-violet-900/40 bg-card pl-15 pr-10 py-3.5 text-base placeholder:text-muted-foreground focus:border-violet-400 dark:focus:border-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-950/30 transition-colors shadow-sm"
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Quickly find a student using Student ID or Phone Number
      </p>

      {/* Dropdown */}
      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-border bg-card shadow-xl z-30 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching...
            </div>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No students found for &quot;{query}&quot;
            </p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-border">
              {results.map((s) => (
                <li key={s._id}>
                  <Link
                    href={`/dashboard/fees/student/${s._id}`}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-violet-50 dark:hover:bg-violet-950/20 transition-colors"
                  >
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      {s.studentId && <span><span className="font-medium">ID:</span> {s.studentId}</span>}
                      <span><span className="font-medium">Roll:</span> {s.rollNo || 'N/A'}</span>
                      {s.class && (
                        <span>
                          <span className="font-medium">Class:</span> {s.class}
                          {s.section ? ` — ${s.section}` : ''}
                        </span>
                      )}
                      {(s.guardianPhone || s.phone) && (
                        <span><span className="font-medium">Phone:</span> {s.guardianPhone || s.phone}</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
