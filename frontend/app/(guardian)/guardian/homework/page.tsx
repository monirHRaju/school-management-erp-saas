'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { BookOpen, ChevronDown, ChevronUp, Paperclip, AlertCircle, Clock } from 'lucide-react';

interface Homework {
  _id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  section: string;
  group: string;
  due_date: string;
  assigned_date: string;
  attachment_url: string;
  created_by?: { name: string; role: string };
}

function isOverdue(due_date: string) {
  return new Date(due_date) < new Date(new Date().toDateString());
}

function isDueToday(due_date: string) {
  return new Date(due_date).toDateString() === new Date().toDateString();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const SUBJECT_COLORS: Record<string, string> = {
  math: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  english: 'bg-green-500/10 text-green-600 dark:text-green-400',
  science: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  bangla: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  history: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  default: 'bg-primary/10 text-primary',
};

function subjectColor(subject: string) {
  const key = subject.toLowerCase();
  return SUBJECT_COLORS[key] || SUBJECT_COLORS.default;
}

export default function GuardianHomeworkPage() {
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState('');
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const params = new URLSearchParams({ limit: '50', status: 'active' });
    apiRequest<{ success: boolean; data: Homework[] }>(`/api/homework?${params}`, { token })
      .then((res) => { if (res.success) setHomeworks(res.data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const subjects = Array.from(new Set(homeworks.map((h) => h.subject))).sort();

  const filtered = homeworks.filter((h) => {
    if (filterSubject && h.subject !== filterSubject) return false;
    if (!showPast && isOverdue(h.due_date)) return false;
    return true;
  });

  // Separate upcoming and overdue
  const upcoming = filtered.filter((h) => !isOverdue(h.due_date));
  const overdue = filtered.filter((h) => isOverdue(h.due_date));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Homework</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {subjects.length > 0 && (
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button
            onClick={() => setShowPast((v) => !v)}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              showPast
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-input text-muted-foreground hover:text-foreground'
            }`}
          >
            {showPast ? 'Hiding past' : 'Show past'}
          </button>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
          <BookOpen className="h-10 w-10 opacity-20" />
          <p>No homework found.</p>
        </div>
      )}

      {/* Upcoming homework */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          {upcoming.map((hw) => (
            <HomeworkCard
              key={hw._id}
              hw={hw}
              expanded={expanded === hw._id}
              onToggle={() => setExpanded(expanded === hw._id ? null : hw._id)}
            />
          ))}
        </div>
      )}

      {/* Overdue section */}
      {showPast && overdue.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-destructive flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" /> Overdue ({overdue.length})
          </h3>
          {overdue.map((hw) => (
            <HomeworkCard
              key={hw._id}
              hw={hw}
              expanded={expanded === hw._id}
              onToggle={() => setExpanded(expanded === hw._id ? null : hw._id)}
              overdue
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HomeworkCard({
  hw,
  expanded,
  onToggle,
  overdue = false,
}: {
  hw: Homework;
  expanded: boolean;
  onToggle: () => void;
  overdue?: boolean;
}) {
  const dueToday = isDueToday(hw.due_date);

  return (
    <div className={`rounded-xl border bg-card transition-colors ${
      overdue ? 'border-destructive/30' : dueToday ? 'border-amber-400/40' : 'border-border'
    }`}>
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between px-4 py-3.5 text-left gap-3"
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${subjectColor(hw.subject)}`}>
            {hw.subject}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-foreground truncate">{hw.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Class {hw.class}{hw.section ? ` — Sec ${hw.section}` : ''}{hw.group ? ` (${hw.group})` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className={`flex items-center gap-1 text-xs font-medium ${
              overdue ? 'text-destructive' : dueToday ? 'text-amber-500 dark:text-amber-400' : 'text-muted-foreground'
            }`}>
              <Clock className="h-3 w-3" />
              {dueToday ? 'Due Today' : overdue ? 'Overdue' : formatDate(hw.due_date)}
            </div>
            {!dueToday && !overdue && (
              <p className="text-[10px] text-muted-foreground">{formatDate(hw.due_date)}</p>
            )}
          </div>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          }
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-3">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{hw.description}</p>
          {hw.attachment_url && (
            <a
              href={hw.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Paperclip className="h-3.5 w-3.5" /> View Attachment
            </a>
          )}
          {hw.created_by && (
            <p className="text-xs text-muted-foreground">
              Posted by {hw.created_by.name} ({hw.created_by.role}) · Assigned {formatDate(hw.due_date)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
