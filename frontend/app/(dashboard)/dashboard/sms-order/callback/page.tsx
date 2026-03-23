'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SmsPayResult {
  trxID: string;
  amount: number;
  smsCount: number;
  message: string;
  alreadyProcessed?: boolean;
}

function SmsCallbackContent() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const paymentID = searchParams.get('paymentID');
  const status = searchParams.get('status');

  const [state, setState] = useState<'loading' | 'success' | 'failed' | 'cancelled'>('loading');
  const [result, setResult] = useState<SmsPayResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const executed = useRef(false);

  useEffect(() => {
    if (executed.current) return;
    executed.current = true;

    async function execute() {
      if (status === 'cancel') { setState('cancelled'); return; }
      if (status === 'failure') {
        setState('failed');
        setErrorMsg('bKash পেমেন্ট সম্পন্ন হয়নি।');
        return;
      }

      const pid = paymentID || sessionStorage.getItem('bkash_sms_payment_id');
      if (!pid) {
        setState('failed');
        setErrorMsg('Payment ID পাওয়া যায়নি। সাপোর্টে যোগাযোগ করুন।');
        return;
      }

      try {
        const res = await apiRequest<{ success: boolean; data: SmsPayResult; error?: string }>(
          '/api/sms-order/execute-bkash',
          { method: 'POST', body: JSON.stringify({ paymentID: pid }), token: token! }
        );
        if (res.success) {
          setResult(res.data);
          setState('success');
          sessionStorage.removeItem('bkash_sms_payment_id');
        } else {
          setState('failed');
          setErrorMsg(res.error || 'পেমেন্ট ভেরিফাই ব্যর্থ হয়েছে।');
        }
      } catch (err: unknown) {
        const e = err as { message?: string };
        setState('failed');
        setErrorMsg(e.message || 'পেমেন্ট ভেরিফাই ব্যর্থ। সাপোর্টে যোগাযোগ করুন।');
      }
    }

    execute();
  }, [paymentID, status, token]);

  if (state === 'loading') {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-10 h-10 text-pink-500 animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">পেমেন্ট ভেরিফাই হচ্ছে, অপেক্ষা করুন...</p>
      </div>
    );
  }

  if (state === 'success' && result) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-foreground mb-1">পেমেন্ট সফল!</h2>
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
            <span className="text-muted-foreground">SMS Added</span>
            <span className="font-bold text-emerald-500">{result.smsCount.toLocaleString()}</span>
          </div>
        </div>

        <Link href="/dashboard/sms-order"
          className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          Back to SMS Orders
        </Link>
      </div>
    );
  }

  if (state === 'cancelled') {
    return (
      <div className="text-center py-4">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-foreground mb-2">পেমেন্ট বাতিল</h2>
        <p className="text-sm text-muted-foreground mb-5">আপনার bKash অ্যাকাউন্ট থেকে কোনো টাকা কাটা হয়নি।</p>
        <Link href="/dashboard/sms-order"
          className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
          Back to SMS Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h2 className="text-lg font-bold text-foreground mb-2">পেমেন্ট ব্যর্থ</h2>
      <p className="text-sm text-muted-foreground mb-5">{errorMsg || 'পেমেন্ট সম্পন্ন করা যায়নি।'}</p>
      <Link href="/dashboard/sms-order"
        className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
        Back to SMS Orders
      </Link>
    </div>
  );
}

export default function SmsOrderCallbackPage() {
  return (
    <div className="max-w-md mx-auto py-10">
      <div className="bg-card border border-border rounded-2xl p-8">
        <div className="text-center mb-6">
          <span className="font-black text-2xl text-[#E2136E]">bKash</span>
          <p className="text-xs text-muted-foreground mt-0.5">SMS Purchase Payment</p>
        </div>
        <Suspense fallback={
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin mx-auto" />
          </div>
        }>
          <SmsCallbackContent />
        </Suspense>
      </div>
    </div>
  );
}
