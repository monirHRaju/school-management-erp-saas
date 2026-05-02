'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import type { SubscriptionInfo, UsageInfo, SubscriptionPlan } from '@/types/superAdmin';
import { Check, X, Zap, ArrowUpRight, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

const planColors: Record<string, { badge: string; ring: string; glow: string }> = {
  free:     { badge: 'bg-zinc-700/60 text-zinc-300',    ring: 'border-zinc-700',     glow: '' },
  standard: { badge: 'bg-indigo-500/20 text-indigo-300', ring: 'border-indigo-500/40', glow: 'shadow-indigo-500/10' },
  pro:      { badge: 'bg-violet-500/20 text-violet-300', ring: 'border-violet-500/40', glow: 'shadow-violet-500/10' },
};

const FEATURE_LABELS = [
  { key: 'bulkFeeGeneration',     label: 'Bulk Fee Generation' },
  { key: 'smsNotifications',      label: 'SMS Notifications' },
  { key: 'incomeExpenseTracking', label: 'Income/Expense Tracking' },
  { key: 'multipleRoles',         label: 'Multiple Roles' },
  { key: 'guardianAccess',        label: 'Guardian Access' },
  { key: 'exportReports',         label: 'Export Reports' },
  { key: 'autoIncomeTracking',    label: 'Auto Income Tracking' },
];

function UsageBar({ label, used, max, unlimited }: { label: string; used: number; max: number; unlimited: boolean }) {
  const pct = unlimited || max <= 0 ? 0 : Math.min(100, (used / max) * 100);
  const isWarning = !unlimited && pct >= 80;
  const isDanger  = !unlimited && pct >= 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className={`font-medium ${isDanger ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-zinc-300'}`}>
          {used} / {unlimited ? '∞' : max}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {unlimited && (
        <div className="h-2 bg-indigo-500/20 rounded-full">
          <div className="h-full w-full bg-gradient-to-r from-indigo-500/60 to-violet-500/60 rounded-full" />
        </div>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  const { token } = useAuth();
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [bkashPaying, setBkashPaying] = useState(false);
  const [bkashError, setBkashError] = useState('');

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [subRes, usageRes, plansRes] = await Promise.all([
        apiRequest<{ success: boolean; data: SubscriptionInfo }>('/api/subscription/plan', { token }),
        apiRequest<{ success: boolean; data: UsageInfo }>('/api/subscription/usage', { token }),
        apiRequest<{ success: boolean; data: SubscriptionPlan[] }>('/api/subscription/plans', { token }),
      ]);
      if (subRes.success)   setSubInfo(subRes.data);
      if (usageRes.success) setUsage(usageRes.data);
      if (plansRes.success) setAllPlans(plansRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function payViaBkash(planSlug: string) {
    setBkashPaying(true);
    setBkashError('');
    try {
      const res = await apiRequest<{ success: boolean; data: { paymentID: string; bkashURL: string } }>(
        '/api/payment/bkash/create-sub',
        { method: 'POST', body: JSON.stringify({ plan_slug: planSlug }), token: token! }
      );
      if (res.success && res.data.bkashURL) {
        sessionStorage.setItem('bkash_payment_id', res.data.paymentID);
        sessionStorage.setItem('bkash_payment_type', 'subscription');
        window.location.href = res.data.bkashURL;
      } else {
        setBkashError('Failed to initiate payment. Please try again.');
        setBkashPaying(false);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setBkashError(e.message || 'Failed to initiate payment.');
      setBkashPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const plan = subInfo?.plan;
  const slug = subInfo?.plan_slug || 'free';
  const colors = planColors[slug] || planColors.free;
  const expiry = subInfo?.subscription_expiry;
  const isExpired = expiry ? new Date(expiry) < new Date() : false;
  const daysLeft = expiry
    ? Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Subscription</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Your current plan, usage, and upgrade options.</p>
      </div>

      {/* Current Plan Card */}
      <div className={`bg-card border-2 ${colors.ring} rounded-2xl p-6 shadow-lg ${colors.glow}`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${colors.badge}`}>{slug}</span>
              {isExpired && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/15 text-red-400">Expired</span>
              )}
            </div>
            <h3 className="text-2xl font-extrabold text-foreground mt-2">{plan?.name || 'Free Plan'}</h3>
            {plan && (
              <p className="text-3xl font-black text-foreground mt-1">
                ৳{plan.price.toLocaleString()}
                <span className="text-base font-normal text-muted-foreground">/month</span>
              </p>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-1 sm:text-right">
            {expiry ? (
              <p className={daysLeft !== null && daysLeft <= 7 ? 'text-amber-500 font-medium' : ''}>
                {isExpired ? 'Expired' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
              </p>
            ) : (
              <p>No expiry set</p>
            )}
            {expiry && <p className="text-xs">{new Date(expiry).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
          </div>
        </div>

        {/* Expiry warning */}
        {daysLeft !== null && daysLeft <= 7 && !isExpired && (
          <div className="mt-4 flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">Your subscription expires soon. Contact your administrator to renew.</p>
          </div>
        )}
        {isExpired && (
          <div className="mt-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">Your subscription has expired. Some features may be limited. Contact support to renew.</p>
          </div>
        )}
      </div>

      {/* Usage */}
      {usage && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
          <h3 className="font-semibold text-foreground">Current Usage</h3>
          <UsageBar
            label="Students"
            used={usage.students.used}
            max={usage.students.max}
            unlimited={usage.students.unlimited}
          />
          <UsageBar
            label="Staff Accounts"
            used={usage.admins.used}
            max={usage.admins.max}
            unlimited={usage.admins.unlimited}
          />
          {subInfo?.effective_limits && (
            <p className="text-xs text-muted-foreground pt-1">
              {subInfo.effective_limits.maxStudents === -1 ? 'Unlimited students' : `Up to ${subInfo.effective_limits.maxStudents} students`} ·{' '}
              {subInfo.effective_limits.maxAdmins === -1 ? 'Unlimited admins' : `Up to ${subInfo.effective_limits.maxAdmins} admin accounts`}
              {(subInfo.custom_limits?.maxStudents != null || subInfo.custom_limits?.maxAdmins != null) && ' (custom limits applied)'}
            </p>
          )}
        </div>
      )}

      {/* Features */}
      {plan && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Plan Features</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FEATURE_LABELS.map(({ key, label }) => {
              const enabled = plan.features[key as keyof typeof plan.features];
              return (
                <div key={key} className={`flex items-center gap-2.5 text-sm ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {enabled
                    ? <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <X className="w-4 h-4 shrink-0 text-muted-foreground/50" />}
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upgrade Options */}
      {allPlans.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-400" /> Upgrade Your Plan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {allPlans.map((p) => {
              const isCurrent = p.slug === slug;
              const c = planColors[p.slug] || planColors.free;
              return (
                <div key={p._id}
                  className={`relative bg-card border rounded-2xl p-5 flex flex-col gap-3 transition-all ${
                    isCurrent ? `border-2 ${c.ring}` : p.mostPopular ? 'border-amber-500/50 hover:border-amber-400/70' : 'border-border hover:border-zinc-600'
                  } ${p.mostPopular ? 'ring-1 ring-amber-500/20' : ''}`}>
                  {p.mostPopular && !isCurrent && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-500 rounded-full text-[10px] font-bold text-black tracking-wide uppercase whitespace-nowrap">
                      Most Popular
                    </div>
                  )}
                  {isCurrent && (
                    <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full">Current</span>
                  )}
                  <div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${c.badge}`}>{p.slug}</span>
                    <h4 className="text-base font-bold text-foreground mt-2">{p.name}</h4>
                    <p className="text-xl font-extrabold text-foreground mt-0.5">
                      ৳{p.price.toLocaleString()}
                      <span className="text-xs font-normal text-muted-foreground">/mo</span>
                    </p>
                  </div>
                  <ul className="space-y-1 flex-1">
                    <li className="text-xs text-muted-foreground">
                      {p.maxStudents === -1 ? 'Unlimited students' : `Up to ${p.maxStudents} students`}
                    </li>
                    <li className="text-xs text-muted-foreground">
                      {p.maxAdmins === -1 ? 'Unlimited admins' : `Up to ${p.maxAdmins} admin accounts`}
                    </li>
                    {FEATURE_LABELS.filter(f => p.features[f.key as keyof typeof p.features]).slice(0, 3).map(f => (
                      <li key={f.key} className="text-xs text-muted-foreground flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />{f.label}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && p.price > 0 && (
                    <button
                      onClick={() => payViaBkash(p.slug)}
                      disabled={bkashPaying}
                      className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-semibold text-white bg-[#E2136E] hover:bg-[#c0125e] disabled:opacity-60 rounded-xl transition-colors mt-1"
                    >
                      {bkashPaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                      Pay ৳{p.price.toLocaleString()} via bKash
                    </button>
                  )}
                  {!isCurrent && p.price === 0 && (
                    <a
                      href="mailto:support@amarschool.app"
                      className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors mt-1"
                    >
                      Contact Us <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
          {bkashError && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 mt-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{bkashError}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Pay via bKash and our team will activate your plan within 24 hours. Questions? Contact{' '}
            <a href="mailto:support@amarschool.app" className="text-indigo-400 hover:underline">support@amarschool.app</a>
          </p>
        </div>
      )}
    </div>
  );
}
