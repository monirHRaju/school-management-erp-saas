'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SubResult {
  trxID: string;
  amount: number;
  plan_slug: string;
  customerMsisdn?: string;
  message: string;
  alreadyProcessed?: boolean;
}

function SubCallbackContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const paymentID = searchParams.get('paymentID');
  const status    = searchParams.get('status');

  const [state, setState]     = useState<'loading' | 'success' | 'failed' | 'cancelled'>('loading');
  const [result, setResult]   = useState<SubResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const executed = useRef(false);

  useEffect(() => {
    if (executed.current) return;
    executed.current = true;

    async function execute() {
      if (status === 'cancel') { setState('cancelled'); return; }
      if (status === 'failure') {
        setState('failed');
        setErrorMsg('The bKash payment was not completed.');
        return;
      }

      const pid = paymentID || sessionStorage.getItem('bkash_payment_id');
      if (!pid) {
        setState('failed');
        setErrorMsg('Payment ID missing. Please contact support.');
        return;
      }

      try {
        const res = await apiRequest<{ success: boolean; data: SubResult; error?: string }>(
          '/api/payment/bkash/execute-sub',
          { method: 'POST', body: JSON.stringify({ paymentID: pid }), token: token! }
        );
        if (res.success) {
          setResult(res.data);
          setState('success');
          sessionStorage.removeItem('bkash_payment_id');
          sessionStorage.removeItem('bkash_payment_type');
        } else {
          setState('failed');
          setErrorMsg(res.error || 'Payment verification failed.');
        }
      } catch (err: unknown) {
        const e = err as { message?: string };
        setState('failed');
        setErrorMsg(e.message || 'Failed to verify payment. Please contact support.');
      }
    }

    execute();
  }, [paymentID, status, token]);

  if (state === 'loading') {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Verifying payment, please wait…</p>
      </div>
    );
  }

  if (state === 'success' && result) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-1">Payment Received!</h2>
        <p className="text-sm text-muted-foreground mb-5">{result.message}</p>

        <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm text-left mb-5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="font-bold text-foreground">৳{result.amount.toLocaleString()}</span>
          </div>
          {result.trxID && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Transaction ID</span>
              <span className="font-mono text-xs font-semibold text-foreground">{result.trxID}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Plan</span>
            <span className="capitalize font-medium text-foreground">{result.plan_slug}</span>
          </div>
          {result.customerMsisdn && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid from</span>
              <span className="text-foreground">{result.customerMsisdn}</span>
            </div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left mb-5">
          <p className="text-sm text-amber-800 font-medium">Activation Pending</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Our team will review and activate your plan within 24 hours. You will be notified once it's done.
          </p>
        </div>

        <Link href="/dashboard/subscription"
          className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Back to Subscription
        </Link>
      </div>
    );
  }

  if (state === 'cancelled') {
    return (
      <div className="text-center py-4">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">Payment Cancelled</h2>
        <p className="text-sm text-muted-foreground mb-5">No amount was deducted from your bKash account.</p>
        <Link href="/dashboard/subscription"
          className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
          Back to Subscription
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h2 className="text-lg font-bold text-foreground mb-2">Payment Failed</h2>
      <p className="text-sm text-muted-foreground mb-5">{errorMsg || 'The payment could not be completed.'}</p>
      <Link href="/dashboard/subscription"
        className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
        Back to Subscription
      </Link>
    </div>
  );
}

export default function SubscriptionCallbackPage() {
  return (
    <div className="max-w-md mx-auto py-10">
      <div className="bg-card border border-border rounded-2xl p-8">
        <div className="text-center mb-6">
          <span className="font-black text-2xl text-[#E2136E]">bKash</span>
          <p className="text-xs text-muted-foreground mt-0.5">Subscription Payment</p>
        </div>
        <Suspense fallback={
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
          </div>
        }>
          <SubCallbackContent />
        </Suspense>
      </div>
    </div>
  );
}
