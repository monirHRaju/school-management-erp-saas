'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Loader2, ShoppingCart, CreditCard, Smartphone, History,
  CheckCircle2, Clock, XCircle, AlertTriangle,
} from 'lucide-react';

interface PricingData {
  pricePerSms: number;
  minCount: number;
  cashoutRate: number;
}

interface SmsOrderEntry {
  _id: string;
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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending:  { label: 'Pending',  color: 'text-amber-500 bg-amber-500/10',  icon: Clock },
  approved: { label: 'Approved', color: 'text-emerald-500 bg-emerald-500/10', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-500 bg-red-500/10',     icon: XCircle },
};

export default function SmsOrderPage() {
  const { token } = useAuth();

  const [pricing, setPricing] = useState<PricingData | null>(null);
  const [smsBalance, setSmsBalance] = useState(0);
  const [smsCount, setSmsCount] = useState(500);
  const [loading, setLoading] = useState(true);

  // Manual payment
  const [bkashLast4, setBkashLast4] = useState('');
  const [trxId, setTrxId] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // bKash payment
  const [bkashSubmitting, setBkashSubmitting] = useState(false);

  // Order history
  const [orders, setOrders] = useState<SmsOrderEntry[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Tab
  const [payTab, setPayTab] = useState<'bkash' | 'manual'>('bkash');

  // Load pricing
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await apiRequest<{ success: boolean; data: PricingData }>('/api/sms-order/pricing', { token });
        setPricing(res.data);
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Load orders
  const loadOrders = useCallback(async (page = 1) => {
    if (!token) return;
    setOrdersLoading(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        data: SmsOrderEntry[];
        sms_balance: number;
        totalPages: number;
      }>(`/api/sms-order/history?page=${page}&limit=10`, { token });
      setOrders(res.data);
      setSmsBalance(res.sms_balance);
      setOrdersTotalPages(res.totalPages);
      setOrdersPage(page);
    } catch {
      toast.error('Failed to load order history.');
    } finally {
      setOrdersLoading(false);
    }
  }, [token]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const calcAmount = (count: number) => {
    if (!pricing) return 0;
    return Math.ceil(count * pricing.pricePerSms * (1 + pricing.cashoutRate));
  };

  const amount = calcAmount(smsCount);

  // bKash payment
  const handleBkashPay = async () => {
    if (!token || !pricing || smsCount < pricing.minCount) return;
    setBkashSubmitting(true);
    try {
      const res = await apiRequest<{
        success: boolean;
        data: { paymentID: string; bkashURL: string; amount: number; smsCount: number };
        error?: string;
      }>('/api/sms-order/create-bkash', {
        method: 'POST',
        body: JSON.stringify({ smsCount }),
        token,
      });
      if (res.success && res.data.bkashURL) {
        sessionStorage.setItem('bkash_sms_payment_id', res.data.paymentID);
        window.location.href = res.data.bkashURL;
      } else {
        toast.error('Failed to initiate bKash payment.');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create payment.');
    } finally {
      setBkashSubmitting(false);
    }
  };

  // Manual payment
  const handleManualSubmit = async () => {
    if (!token || !pricing || smsCount < pricing.minCount) return;
    if (!bkashLast4 || !trxId) {
      toast.error('Last 4 digits and Transaction ID are required.');
      return;
    }
    setManualSubmitting(true);
    try {
      await apiRequest('/api/sms-order/create-manual', {
        method: 'POST',
        body: JSON.stringify({ smsCount, bkash_last4: bkashLast4, trxid: trxId }),
        token,
      });
      toast.success('Order submitted! Awaiting approval.');
      setBkashLast4('');
      setTrxId('');
      loadOrders();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit order.');
    } finally {
      setManualSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-foreground">Buy SMS Credits</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Purchase SMS credits to send notifications to guardians.</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Current SMS Balance</p>
          <p className="text-3xl font-bold text-foreground mt-0.5">{smsBalance.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">SMS credits remaining</p>
        </div>
        <Smartphone className="w-10 h-10 text-primary/40" />
      </div>

      {/* Purchase Section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Purchase SMS
          </h3>
        </div>

        <div className="p-5 space-y-5">
          {/* SMS Count Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">SMS Count</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={pricing?.minCount || 500}
                step={100}
                value={smsCount}
                onChange={(e) => setSmsCount(Math.max(pricing?.minCount || 500, parseInt(e.target.value) || 500))}
                className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <div className="text-sm text-muted-foreground">
                Minimum: <span className="font-semibold">{pricing?.minCount || 500}</span>
              </div>
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">SMS Count</span>
              <span className="font-medium text-foreground">{smsCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rate</span>
              <span className="text-foreground">৳{pricing?.pricePerSms}/SMS</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cashout Charge ({((pricing?.cashoutRate || 0) * 100).toFixed(2)}%)</span>
              <span className="text-foreground">৳{Math.ceil(smsCount * (pricing?.pricePerSms || 0) * (pricing?.cashoutRate || 0))}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between text-base font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-primary">৳{amount.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Tabs */}
          <div className="flex gap-1 bg-muted/40 p-1 rounded-lg">
            <button
              onClick={() => setPayTab('bkash')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                payTab === 'bkash' ? 'bg-[#E2136E] text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              bKash Payment
            </button>
            <button
              onClick={() => setPayTab('manual')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                payTab === 'manual' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Manual Payment
            </button>
          </div>

          {payTab === 'bkash' ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Pay instantly with bKash. Your SMS balance will be added automatically after payment.
              </p>
              <button
                onClick={handleBkashPay}
                disabled={bkashSubmitting || smsCount < (pricing?.minCount || 500)}
                className="w-full px-4 py-3 rounded-xl bg-[#E2136E] text-white text-sm font-bold hover:bg-[#c91060] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {bkashSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Pay ৳{amount.toLocaleString()} with bKash
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm">
                <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">Payment Instructions</p>
                <p className="text-amber-600 dark:text-amber-500">
                  bKash Send Money to <span className="font-bold">01917383378</span> — Amount: <span className="font-bold">৳{amount.toLocaleString()}</span>
                </p>
                <p className="text-amber-600/80 dark:text-amber-500/80 text-xs mt-1">
                  After sending, fill in the details below and submit. Your balance will be added after admin approval.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">bKash Number (Last 4 Digits)</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="e.g. 3378"
                    value={bkashLast4}
                    onChange={(e) => setBkashLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Transaction ID (TrxID)</label>
                  <input
                    type="text"
                    placeholder="e.g. BK1234ABCD"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              </div>

              <button
                onClick={handleManualSubmit}
                disabled={manualSubmitting || !bkashLast4 || !trxId || smsCount < (pricing?.minCount || 500)}
                className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
              >
                {manualSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Submit Payment Reference'
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Order History */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Order History</h3>
        </div>

        {ordersLoading && orders.length === 0 ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No orders yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">SMS</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Method</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                    const Icon = cfg.icon;
                    return (
                      <tr key={order._id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-foreground">{order.sms_count.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-foreground">৳{order.amount.toLocaleString()}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs capitalize text-muted-foreground">
                            {order.payment_method === 'bkash' ? 'bKash' : 'Manual'}
                            {order.bkash_last4 && ` (****${order.bkash_last4})`}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                            <Icon className="w-3 h-3" /> {cfg.label}
                          </span>
                          {order.reject_reason && (
                            <p className="text-xs text-red-400 mt-0.5">{order.reject_reason}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {ordersTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-border">
                <button
                  onClick={() => loadOrders(ordersPage - 1)}
                  disabled={ordersPage <= 1}
                  className="px-3 py-1 text-xs rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-xs text-muted-foreground">{ordersPage} / {ordersTotalPages}</span>
                <button
                  onClick={() => loadOrders(ordersPage + 1)}
                  disabled={ordersPage >= ordersTotalPages}
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
