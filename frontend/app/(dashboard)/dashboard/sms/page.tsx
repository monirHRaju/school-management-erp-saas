'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Loader2, MessageSquare, Send, History, AlertTriangle, CheckCircle2, Megaphone, RotateCw, ShoppingCart } from 'lucide-react';

const CLASS_OPTIONS = ['Play', 'Nursery', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

const TYPE_LABELS: Record<string, string> = {
  attendance_absent: 'Attendance',
  fee_generated: 'Fee Created',
  fee_due_reminder: 'Due Reminder',
  payment_received: 'Payment',
  payment_link: 'Pay Link',
  manual: 'Manual',
};

interface SmsLogEntry {
  _id: string;
  type: string;
  recipients: number;
  to: string;
  message: string;
  sent: number;
  failed: number;
  createdAt: string;
}

function currentMonthStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function SmsPage() {
  const { token } = useAuth();

  // Status
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [balance, setBalance] = useState('—');
  const [smsBalance, setSmsBalance] = useState(0);
  const [statusLoading, setStatusLoading] = useState(true);

  // Logs
  const [logs, setLogs] = useState<SmsLogEntry[]>([]);
  const [stats, setStats] = useState<{ totalSent: number; totalFailed: number }>({ totalSent: 0, totalFailed: 0 });
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);

  // Manual send
  const [manualTo, setManualTo] = useState('');
  const [manualMsg, setManualMsg] = useState('');
  const [manualSending, setManualSending] = useState(false);

  // Resend
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Due reminders
  const [reminderMonth, setReminderMonth] = useState(currentMonthStr());
  const [reminderClass, setReminderClass] = useState('');
  const [reminderSending, setReminderSending] = useState(false);

  // Load status + balance
  useEffect(() => {
    if (!token) return;
    (async () => {
      setStatusLoading(true);
      try {
        const [statusRes, balanceRes] = await Promise.all([
          apiRequest<{ success: boolean; data: { smsEnabled: boolean } }>('/api/sms/status', { token }),
          apiRequest<{ success: boolean; data: { balance: string; sms_balance: number } }>('/api/sms/balance', { token }),
        ]);
        setSmsEnabled(statusRes.data.smsEnabled);
        setBalance(balanceRes.data.balance || '0');
        setSmsBalance(balanceRes.data.sms_balance || 0);
      } catch {
        // silent
      } finally {
        setStatusLoading(false);
      }
    })();
  }, [token]);

  // Load logs
  const loadLogs = useCallback(async (page = 1) => {
    if (!token) return;
    setLogsLoading(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        data: SmsLogEntry[];
        stats: { totalSent: number; totalFailed: number };
        totalPages: number;
      }>(`/api/sms/logs?page=${page}&limit=15`, { token });
      setLogs(res.data);
      setStats(res.stats);
      setLogsTotalPages(res.totalPages);
      setLogsPage(page);
    } catch {
      toast.error('Failed to load SMS logs.');
    } finally {
      setLogsLoading(false);
    }
  }, [token]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Manual send
  const handleManualSend = async () => {
    if (!token || !manualTo || !manualMsg) return;
    setManualSending(true);
    try {
      const res = await apiRequest<{ success: boolean; data: { success: boolean; statusmsg?: string } }>('/api/sms/send', {
        method: 'POST',
        body: JSON.stringify({ to: manualTo, message: manualMsg }),
        token,
      });
      if (res.data.success) {
        toast.success('SMS sent successfully!');
        setManualTo('');
        setManualMsg('');
        loadLogs();
      } else {
        toast.error(res.data.statusmsg || 'Failed to send SMS.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send SMS.');
    } finally {
      setManualSending(false);
    }
  };

  // Due reminders
  const handleSendReminders = async () => {
    if (!token) return;
    setReminderSending(true);
    try {
      const res = await apiRequest<{ success: boolean; data: { sent: number; failed: number; total: number } }>('/api/sms/send-due-reminders', {
        method: 'POST',
        body: JSON.stringify({ month: reminderMonth, class: reminderClass || undefined }),
        token,
      });
      toast.success(`Due reminders: ${res.data.sent} sent, ${res.data.failed} failed (${res.data.total} total)`);
      loadLogs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reminders.');
    } finally {
      setReminderSending(false);
    }
  };

  // Resend
  const handleResend = async (logId: string) => {
    if (!token) return;
    setResendingId(logId);
    try {
      const res = await apiRequest<{ success: boolean; data: { sent: number; failed: number; total: number } }>(`/api/sms/resend/${logId}`, {
        method: 'POST',
        token,
      });
      toast.success(`Resent: ${res.data.sent} sent, ${res.data.failed} failed`);
      loadLogs(logsPage);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend.');
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">SMS Notifications</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Manage SMS notifications, send manual messages, and view history.</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
            <MessageSquare className="w-4 h-4" /> Status
          </div>
          {statusLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : smsEnabled ? (
            <span className="inline-flex items-center gap-1 text-emerald-500 font-semibold text-sm"><CheckCircle2 className="w-4 h-4" /> Enabled</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-500 font-semibold text-sm"><AlertTriangle className="w-4 h-4" /> Not on plan</span>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-medium text-muted-foreground mb-1">SMS Balance</p>
          <p className="text-xl font-bold text-foreground">{smsBalance.toLocaleString()}</p>
          <Link href="/dashboard/sms-order" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
            <ShoppingCart className="w-3 h-3" /> Buy SMS
          </Link>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-medium text-muted-foreground mb-1">Total Sent</p>
          <p className="text-xl font-bold text-emerald-500">{stats.totalSent}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-medium text-muted-foreground mb-1">Total Failed</p>
          <p className="text-xl font-bold text-red-500">{stats.totalFailed}</p>
        </div>
      </div>

      {!smsEnabled && !statusLoading && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-600">
          <AlertTriangle className="w-4 h-4 inline mr-1.5" />
          SMS notifications are not included in your current plan. Upgrade to Standard or Pro to enable SMS.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Send Manual SMS */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Send className="w-4 h-4" /> Send Manual SMS</h3>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
            <input
              type="tel"
              placeholder="01XXXXXXXXX"
              value={manualTo}
              onChange={(e) => setManualTo(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Message</label>
            <textarea
              rows={3}
              placeholder="Type your message..."
              value={manualMsg}
              onChange={(e) => setManualMsg(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
            />
          </div>
          <button
            onClick={handleManualSend}
            disabled={manualSending || !smsEnabled || !manualTo || !manualMsg}
            className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {manualSending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send SMS'}
          </button>
        </div>

        {/* Send Due Reminders */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Megaphone className="w-4 h-4" /> Send Fee Due Reminders</h3>
          <p className="text-xs text-muted-foreground">Send SMS to all guardians with unpaid/partial fees for a month.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Month</label>
              <input
                type="month"
                value={reminderMonth}
                onChange={(e) => setReminderMonth(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Class (optional)</label>
              <select
                value={reminderClass}
                onChange={(e) => setReminderClass(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">All Classes</option>
                {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={handleSendReminders}
            disabled={reminderSending || !smsEnabled}
            className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {reminderSending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Send Reminders'}
          </button>
        </div>
      </div>

      {/* SMS History */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">SMS History</h3>
        </div>

        {logsLoading && logs.length === 0 ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No SMS history yet.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden sm:table-cell">Message</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-16">Sent</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-16">Failed</th>
                  <th className="text-center px-4 py-2.5 font-medium text-muted-foreground w-20">Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}{' '}
                      {new Date(log.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {TYPE_LABELS[log.type] || log.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs max-w-xs truncate hidden sm:table-cell" title={log.message}>
                      {log.message}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {log.sent > 0 && <span className="text-emerald-500 font-semibold">{log.sent}</span>}
                      {log.sent === 0 && <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {log.failed > 0 && <span className="text-red-500 font-semibold">{log.failed}</span>}
                      {log.failed === 0 && <span className="text-muted-foreground">0</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {log.to ? (
                        <button
                          onClick={() => handleResend(log._id)}
                          disabled={resendingId === log._id || !smsEnabled}
                          title="Resend this SMS"
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 disabled:opacity-40 transition-colors"
                        >
                          {resendingId === log._id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
                          Resend
                        </button>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {logsTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-border">
                <button
                  onClick={() => loadLogs(logsPage - 1)}
                  disabled={logsPage <= 1}
                  className="px-3 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-xs text-muted-foreground">{logsPage} / {logsTotalPages}</span>
                <button
                  onClick={() => loadLogs(logsPage + 1)}
                  disabled={logsPage >= logsTotalPages}
                  className="px-3 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
