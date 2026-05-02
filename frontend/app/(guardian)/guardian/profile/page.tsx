'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Receipt, Printer, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { openInvoiceWindow } from '@/lib/invoice';

interface NoticeItem {
  _id: string;
  title: string;
  body?: string;
  createdAt: string;
  isRead?: boolean;
}

interface PaymentItem {
  _id: string;
  amount: number;
  discount?: number;
  note?: string;
  payment_date: string;
  fee?: {
    _id: string;
    category: string;
    month?: string;
    total_fee: number;
    description?: string;
  } | null;
  student?: {
    _id: string;
    name: string;
    class?: string;
    section?: string;
    rollNo?: string;
  } | null;
}

interface InvoicePayload {
  payment: { _id: string; amount: number; discount?: number; note?: string; payment_date: string; created_by?: { name?: string } };
  fee: { category: string; month?: string; total_fee: number; paid_amount?: number; due_amount?: number; description?: string; fee_type?: string };
  student: { name: string; class?: string; section?: string; rollNo?: string; fatherName?: string; guardianName?: string; guardianPhone?: string };
  school: { name?: string; address?: string; contact?: string; logoUrl?: string };
}

export default function GuardianProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [printingId, setPrintingId] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiRequest<{ success: boolean; data: NoticeItem[] }>('/api/guardian/notices', { token })
      .then((res) => { if (res.success) setNotices((res.data || []).slice(0, 5)); })
      .catch(() => {});
    apiRequest<{ success: boolean; data: PaymentItem[] }>('/api/guardian/payments', { token })
      .then((res) => { if (res.success) setPayments((res.data || []).slice(0, 5)); })
      .catch(() => {});
  }, []);

  const handlePrintReceipt = useCallback(async (paymentId: string) => {
    const token = getToken();
    if (!token) return;
    setPrintingId(paymentId);
    try {
      const res = await apiRequest<{ success: boolean; data: InvoicePayload }>(
        `/api/guardian/payments/${paymentId}`,
        { token }
      );
      if (!res.success || !res.data) return;
      const { payment, fee, student, school } = res.data;
      openInvoiceWindow({
        receiptNo: String(payment._id).slice(-8).toUpperCase(),
        paymentDate: payment.payment_date,
        amount: payment.amount,
        discount: payment.discount,
        note: payment.note,
        collectedBy: payment.created_by?.name,
        fee: {
          category: fee.category || fee.fee_type || 'other',
          month: fee.month,
          description: fee.description,
          total_fee: fee.total_fee,
          paid_amount: fee.paid_amount,
          due_amount: fee.due_amount,
        },
        student: {
          name: student.name,
          class: student.class,
          section: student.section,
          rollNo: student.rollNo,
          fatherName: student.fatherName,
          guardianName: student.guardianName,
          guardianPhone: student.guardianPhone,
        },
        school: {
          name: school.name,
          address: school.address,
          contact: school.contact,
          logoUrl: school.logoUrl,
        },
      });
    } finally {
      setPrintingId(null);
    }
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    const token = getToken();
    if (!token) return;
    setSaving(true);

    try {
      const body: Record<string, string> = {};
      if (name.trim() && name.trim() !== user?.name) body.name = name.trim();
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }

      if (Object.keys(body).length === 0) {
        setMessage({ type: 'error', text: 'Nothing to update' });
        return;
      }

      const res = await apiRequest<{ success: boolean; error?: string }>(
        '/api/guardian/profile',
        { method: 'PATCH', token, body: JSON.stringify(body) }
      );

      if (res.success) {
        setMessage({ type: 'success', text: 'Profile updated successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setMessage({ type: 'error', text: res.error || 'Update failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong' });
    } finally {
      setSaving(false);
    }
  }

  const unreadCount = notices.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-xl font-bold text-foreground">My Profile</h2>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="text-foreground font-medium">{user?.name || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone</span>
            <span className="text-foreground font-medium">{user?.phone || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="text-foreground font-medium capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Notices summary */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="ml-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                {unreadCount} unread
              </span>
            )}
          </div>
          <Link href="/guardian/notices" className="text-xs text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {notices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications.</p>
        ) : (
          <ul className="space-y-2">
            {notices.map((n) => (
              <li key={n._id} className={`flex items-start gap-2 text-sm ${n.isRead ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${n.isRead ? 'bg-muted-foreground/30' : 'bg-primary'}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Payments summary */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">Recent Payments</h3>
          </div>
          <Link href="/guardian/fees" className="text-xs text-primary hover:underline flex items-center gap-1">
            View fees <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="text-left font-medium py-2">Date</th>
                  <th className="text-left font-medium py-2">Student</th>
                  <th className="text-left font-medium py-2">Category</th>
                  <th className="text-right font-medium py-2">Amount</th>
                  <th className="text-right font-medium py-2">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p._id}>
                    <td className="py-2 text-xs text-muted-foreground">
                      {new Date(p.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-2 text-foreground truncate max-w-30">{p.student?.name || '—'}</td>
                    <td className="py-2 text-foreground capitalize">{(p.fee?.category || '').replace(/_/g, ' ') || '—'}{p.fee?.month ? ' · ' + p.fee.month : ''}</td>
                    <td className="py-2 text-right text-foreground font-medium">৳{p.amount.toLocaleString()}</td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handlePrintReceipt(p._id)}
                        disabled={printingId === p._id}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                        title="Print money receipt"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-foreground">Account Settings</h3>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <hr className="border-border" />
        <p className="text-sm font-medium text-muted-foreground">Change Password</p>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Current Password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {message && (
          <p className={`text-sm ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
