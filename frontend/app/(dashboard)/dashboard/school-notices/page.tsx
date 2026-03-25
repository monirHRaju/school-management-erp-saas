'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import {
  Loader2,
  Megaphone,
  Mail,
  MailOpen,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Trash2,
  Search,
} from 'lucide-react';

interface NoticeEntry {
  _id: string;
  title: string;
  message: string;
  type: string;
  target_type: string;
  target_roles?: string[];
  created_by: { _id: string; name: string; role: string };
  isRead: boolean;
  createdAt: string;
}

interface StudentOption {
  _id: string;
  name: string;
  class: string;
  section?: string;
  rollNo?: string;
}

interface UserOption {
  _id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

type TargetType = 'all' | 'role' | 'students' | 'users';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'guardian', label: 'Guardian' },
];

function targetLabel(n: NoticeEntry) {
  if (n.target_type === 'all') return 'Everyone';
  if (n.target_type === 'role') return (n.target_roles || []).join(', ');
  if (n.target_type === 'students') return 'Specific students';
  if (n.target_type === 'users') return 'Specific users';
  return n.target_type;
}

export default function SchoolNoticesPage() {
  const { user, token } = useAuth();

  // List state
  const [notices, setNotices] = useState<NoticeEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Compose state
  const [showCompose, setShowCompose] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentOption[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<StudentOption[]>([]);
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [userSearchLoaded, setUserSearchLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState('');

  // ── Load notices ────────────────────────────────────────────────────────────
  const loadNotices = useCallback(
    async (p = 1) => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await apiRequest<{
          success: boolean;
          data: NoticeEntry[];
          totalPages: number;
        }>(`/api/school-notices?page=${p}&limit=20`, { token });
        if (res.success) {
          setNotices(res.data || []);
          setTotalPages(res.totalPages || 1);
          setPage(p);
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  // ── Expand / mark read ──────────────────────────────────────────────────────
  const handleExpand = async (notice: NoticeEntry) => {
    if (expandedId === notice._id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(notice._id);
    if (!notice.isRead && token) {
      try {
        await apiRequest(`/api/school-notices/${notice._id}/read`, {
          method: 'POST',
          token,
        });
        setNotices((prev) =>
          prev.map((n) => (n._id === notice._id ? { ...n, isRead: true } : n))
        );
      } catch {
        /* silent */
      }
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notice?')) return;
    if (!token) return;
    const res = await apiRequest<{ success: boolean }>(`/api/school-notices/${id}`, {
      method: 'DELETE',
      token,
    });
    if (res.success) loadNotices(page);
  };

  // ── Student search ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (targetType !== 'students' || studentSearch.trim().length < 2) {
      setStudentResults([]);
      return;
    }
    const t = getToken();
    if (!t) return;
    const timeout = setTimeout(async () => {
      const res = await apiRequest<{ success: boolean; data: StudentOption[] }>(
        `/api/students?q=${encodeURIComponent(studentSearch.trim())}&limit=10&page=1`,
        { token: t }
      );
      if (res.success) {
        const selectedIds = new Set(selectedStudents.map((s) => s._id));
        setStudentResults((res.data || []).filter((s) => !selectedIds.has(s._id)));
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [studentSearch, targetType, selectedStudents]);

  // ── User list (load once) ──────────────────────────────────────────────────
  useEffect(() => {
    if (targetType !== 'users' || userSearchLoaded) return;
    const t = getToken();
    if (!t) return;
    apiRequest<{ success: boolean; data: UserOption[] }>('/api/users?limit=100', {
      token: t,
    }).then((res) => {
      if (res.success) {
        setUserResults(
          (res.data || []).filter((u) => u._id !== user?._id)
        );
        setUserSearchLoaded(true);
      }
    });
  }, [targetType, userSearchLoaded, user?._id]);

  // ── Send notice ─────────────────────────────────────────────────────────────
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setComposeError('');
    if (!title.trim() || !message.trim()) {
      setComposeError('Title and message are required');
      return;
    }
    if (targetType === 'role' && selectedRoles.length === 0) {
      setComposeError('Select at least one role');
      return;
    }
    if (targetType === 'students' && selectedStudents.length === 0) {
      setComposeError('Select at least one student');
      return;
    }
    if (targetType === 'users' && selectedUsers.length === 0) {
      setComposeError('Select at least one user');
      return;
    }

    setSending(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        message: message.trim(),
        target_type: targetType,
      };
      if (targetType === 'role') body.target_roles = selectedRoles;
      if (targetType === 'students')
        body.target_students = selectedStudents.map((s) => s._id);
      if (targetType === 'users')
        body.target_users = selectedUsers.map((u) => u._id);

      const res = await apiRequest<{ success: boolean; error?: string }>(
        '/api/school-notices',
        { method: 'POST', token: token!, body: JSON.stringify(body) }
      );
      if (!res.success) throw new Error(res.error || 'Failed');

      // Reset form
      setTitle('');
      setMessage('');
      setTargetType('all');
      setSelectedRoles([]);
      setSelectedStudents([]);
      setSelectedUsers([]);
      setShowCompose(false);
      loadNotices(1);
    } catch (err) {
      setComposeError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const canCompose = user?.role && ['admin', 'staff', 'accountant'].includes(user.role);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="w-5 h-5" /> School Notices
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Internal notices and communication
          </p>
        </div>
        {canCompose && (
          <button
            onClick={() => setShowCompose(!showCompose)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {showCompose ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCompose ? 'Close' : 'New Notice'}
          </button>
        )}
      </div>

      {/* Compose form */}
      {showCompose && canCompose && (
        <form
          onSubmit={handleSend}
          className="rounded-xl border border-border bg-card p-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notice title"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Message
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your notice..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Send to
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['all', 'Everyone'],
                  ['role', 'By Role'],
                  ['students', 'Specific Students'],
                  ['users', 'Specific Staff'],
                ] as const
              ).map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTargetType(val)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    targetType === val
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {/* Role checkboxes */}
          {targetType === 'role' && (
            <div className="flex flex-wrap gap-3">
              {ROLE_OPTIONS.map((r) => (
                <label
                  key={r.value}
                  className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(r.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoles((prev) => [...prev, r.value]);
                      } else {
                        setSelectedRoles((prev) => prev.filter((v) => v !== r.value));
                      }
                    }}
                    className="rounded border-border"
                  />
                  {r.label}
                </label>
              ))}
            </div>
          )}

          {/* Student search + chips */}
          {targetType === 'students' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students by name or roll..."
                  className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {studentResults.length > 0 && (
                <div className="rounded-lg border border-border bg-card max-h-40 overflow-y-auto divide-y divide-border">
                  {studentResults.map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      onClick={() => {
                        setSelectedStudents((prev) => [...prev, s]);
                        setStudentResults((prev) => prev.filter((r) => r._id !== s._id));
                        setStudentSearch('');
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="text-muted-foreground ml-2">
                        Class {s.class}
                        {s.section ? `-${s.section}` : ''}
                        {s.rollNo ? ` | Roll: ${s.rollNo}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {selectedStudents.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedStudents.map((s) => (
                    <span
                      key={s._id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                    >
                      {s.name}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedStudents((prev) =>
                            prev.filter((x) => x._id !== s._id)
                          )
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User picker */}
          {targetType === 'users' && (
            <div className="space-y-2">
              {!userSearchLoaded ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-border bg-card max-h-40 overflow-y-auto divide-y divide-border">
                    {userResults
                      .filter(
                        (u) => !selectedUsers.some((s) => s._id === u._id)
                      )
                      .map((u) => (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() =>
                            setSelectedUsers((prev) => [...prev, u])
                          }
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                        >
                          <span className="font-medium text-foreground">
                            {u.name}
                          </span>
                          <span className="text-muted-foreground ml-2 capitalize">
                            ({u.role})
                          </span>
                        </button>
                      ))}
                  </div>
                  {selectedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUsers.map((u) => (
                        <span
                          key={u._id}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                        >
                          {u.name}
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedUsers((prev) =>
                                prev.filter((x) => x._id !== u._id)
                              )
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {composeError && (
            <p className="text-sm text-red-500">{composeError}</p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {sending ? 'Sending...' : 'Send Notice'}
          </button>
        </form>
      )}

      {/* Notice list */}
      {loading && notices.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : notices.length === 0 ? (
        <div className="text-center py-12">
          <Megaphone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No notices yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notices.map((notice) => {
            const isExpanded = expandedId === notice._id;
            const canDelete =
              user?.role === 'admin' ||
              notice.created_by?._id === user?._id;
            return (
              <div
                key={notice._id}
                className={`bg-card border rounded-xl overflow-hidden transition-colors ${
                  notice.isRead
                    ? 'border-border'
                    : 'border-primary/30 bg-primary/[0.02]'
                }`}
              >
                <button
                  onClick={() => handleExpand(notice)}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="mt-0.5 shrink-0">
                    {notice.isRead ? (
                      <MailOpen className="w-4 h-4 text-muted-foreground/50" />
                    ) : (
                      <Mail className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm truncate ${
                          notice.isRead
                            ? 'text-foreground/80 font-medium'
                            : 'text-foreground font-semibold'
                        }`}
                      >
                        {notice.title}
                      </h3>
                      {!notice.isRead && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center flex-wrap gap-x-1.5">
                      <span>
                        {new Date(notice.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span>·</span>
                      <span className="capitalize">
                        {notice.created_by?.name || 'System'}{' '}
                        ({notice.created_by?.role || 'auto'})
                      </span>
                      <span>·</span>
                      <span className="capitalize">{targetLabel(notice)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    {canDelete && (
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notice._id);
                        }}
                        className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 pl-11">
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                      {notice.message}
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => loadNotices(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-xs text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => loadNotices(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
