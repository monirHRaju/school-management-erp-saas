'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSuperAdmin } from '@/context/SuperAdminContext';
import { apiRequest } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Loader2, CheckCircle2, Clock, XCircle, MessageSquare, Plus,
} from 'lucide-react';

interface SchoolInfo { _id: string; name: string; slug: string }

interface SmsOrderEntry {
  _id: string;
  school_id: string;
  school?: SchoolInfo;
  sms_count: number;
  amount: number;
  payment_method: string;
  status: string;
  bkash_last4?: string;
  manual_trxid?: string;
  bkash_trxid?: string;
  reject_reason?: string;
  createdAt: string;
}

const STATUS_TABS = ['all', 'pending', 'approved', 'rejected'] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending:  { label: 'Pending',  color: 'text-amber-500 bg-amber-500/10',  icon: Clock },
  approved: { label: 'Approved', color: 'text-emerald-500 bg-emerald-500/10', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-500 bg-red-500/10',     icon: XCircle },
};

export default function SuperAdminSmsOrdersPage() {
  const { token } = useSuperAdmin();

  const [orders, setOrders] = useState<SmsOrderEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof STATUS_TABS[number]>('all');
  const [actionId, setActionId] = useState<string | null>(null);

  // Manual balance add
  const [balanceSchoolId, setBalanceSchoolId] = useState('');
  const [balanceCount, setBalanceCount] = useState('');
  const [balanceAdding, setBalanceAdding] = useState(false);

  // Reject reason
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadOrders = useCallback(async (p = 1, statusFilter = tab) => {
    if (!token) return;
    setLoading(true);
    try {
      const query = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
      const res = await apiRequest<{
        success: boolean;
        data: SmsOrderEntry[];
        total: number;
        totalPages: number;
      }>(`/api/super-admin/sms-orders?page=${p}&limit=15${query}`, { token });
      setOrders(res.data);
      setTotalPages(res.totalPages);
      setPage(p);
    } catch {
      toast.error('Failed to load SMS orders.');
    } finally {
      setLoading(false);
    }
  }, [token, tab]);

  useEffect(() => { loadOrders(1, tab); }, [tab, loadOrders]);

  const handleApprove = async (orderId: string) => {
    if (!token) return;
    setActionId(orderId);
    try {
      await apiRequest(`/api/super-admin/sms-orders/${orderId}/approve`, { method: 'PUT', token });
      toast.success('Order approved! SMS balance added.');
      loadOrders(page, tab);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve.');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (orderId: string) => {
    if (!token) return;
    setActionId(orderId);
    try {
      await apiRequest(`/api/super-admin/sms-orders/${orderId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ reason: rejectReason }),
        token,
      });
      toast.success('Order rejected.');
      setRejectId(null);
      setRejectReason('');
      loadOrders(page, tab);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject.');
    } finally {
      setActionId(null);
    }
  };

  const handleAddBalance = async () => {
    if (!token || !balanceSchoolId || !balanceCount) return;
    setBalanceAdding(true);
    try {
      const res = await apiRequest<{ success: boolean; data: { sms_balance: number } }>(
        `/api/super-admin/schools/${balanceSchoolId}/sms-balance`,
        { method: 'POST', body: JSON.stringify({ count: parseInt(balanceCount) }), token }
      );
      toast.success(`Balance added! New balance: ${res.data.sms_balance}`);
      setBalanceSchoolId('');
      setBalanceCount('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add balance.');
    } finally {
      setBalanceAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-100">SMS Orders</h2>
        <p className="text-sm text-zinc-500 mt-0.5">Manage school SMS purchase orders and manually add balance.</p>
      </div>

      {/* Manual Balance Add */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2 mb-3">
          <Plus className="w-4 h-4" /> Manually Add SMS Balance
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">School ID</label>
            <input
              type="text"
              placeholder="Paste school ObjectId"
              value={balanceSchoolId}
              onChange={(e) => setBalanceSchoolId(e.target.value)}
              className="w-64 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">SMS Count</label>
            <input
              type="number"
              min={1}
              placeholder="500"
              value={balanceCount}
              onChange={(e) => setBalanceCount(e.target.value)}
              className="w-32 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
          <button
            onClick={handleAddBalance}
            disabled={balanceAdding || !balanceSchoolId || !balanceCount}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {balanceAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Balance'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg w-fit">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-zinc-600" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
            <p className="text-sm text-zinc-600">No orders found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-800/30">
                    <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium text-zinc-500">School</th>
                    <th className="text-right px-4 py-2.5 font-medium text-zinc-500">SMS</th>
                    <th className="text-right px-4 py-2.5 font-medium text-zinc-500">Amount</th>
                    <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Method</th>
                    <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Reference</th>
                    <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Status</th>
                    <th className="text-center px-4 py-2.5 font-medium text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                    const Icon = cfg.icon;
                    return (
                      <tr key={order._id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20">
                        <td className="px-4 py-2.5 text-xs text-zinc-500 whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="text-zinc-200 text-sm font-medium">{order.school?.name || '—'}</p>
                          <p className="text-zinc-600 text-xs">{order.school?.slug || order.school_id}</p>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-zinc-200">{order.sms_count.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right text-zinc-300">৳{order.amount.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-xs text-zinc-400 capitalize">
                          {order.payment_method === 'bkash' ? 'bKash' : 'Manual'}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-zinc-500">
                          {order.bkash_last4 && <span>****{order.bkash_last4}</span>}
                          {order.manual_trxid && <span className="ml-1">TrxID: {order.manual_trxid}</span>}
                          {order.bkash_trxid && <span>TrxID: {order.bkash_trxid}</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </span>
                          {order.reject_reason && (
                            <p className="text-xs text-red-400/80 mt-0.5">{order.reject_reason}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {order.status === 'pending' && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleApprove(order._id)}
                                disabled={actionId === order._id}
                                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                              >
                                {actionId === order._id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                              </button>
                              {rejectId === order._id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    placeholder="Reason (optional)"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    className="w-28 px-2 py-1 text-xs rounded border border-zinc-700 bg-zinc-800 text-zinc-200"
                                  />
                                  <button
                                    onClick={() => handleReject(order._id)}
                                    disabled={actionId === order._id}
                                    className="px-2 py-1 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => { setRejectId(null); setRejectReason(''); }}
                                    className="px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setRejectId(order._id)}
                                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          )}
                          {order.status !== 'pending' && (
                            <span className="text-zinc-700 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-zinc-800">
                <button
                  onClick={() => loadOrders(page - 1, tab)}
                  disabled={page <= 1}
                  className="px-3 py-1 text-xs rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-xs text-zinc-600">{page} / {totalPages}</span>
                <button
                  onClick={() => loadOrders(page + 1, tab)}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-xs rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-300 disabled:opacity-40"
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
