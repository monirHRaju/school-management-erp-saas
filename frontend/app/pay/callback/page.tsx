'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Suspense } from 'react';

interface ExecuteResult {
  trxID: string;
  amount: number;
  studentName?: string;
  feeCategory?: string;
  feeStatus?: string;
  customerMsisdn?: string;
  alreadyProcessed?: boolean;
}

function CallbackContent() {
  const searchParams = useSearchParams();
  const paymentID = searchParams.get('paymentID');
  const status    = searchParams.get('status');   // success | failure | cancel

  const [state, setState] = useState<'loading' | 'success' | 'failed' | 'cancelled'>('loading');
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const executed = useRef(false);

  useEffect(() => {
    if (executed.current) return;
    executed.current = true;

    async function execute() {
      if (status === 'cancel') {
        setState('cancelled');
        return;
      }
      if (status === 'failure') {
        setState('failed');
        setErrorMsg('The bKash payment was not completed.');
        return;
      }

      // status === 'success'
      const pid = paymentID || sessionStorage.getItem('bkash_payment_id');
      if (!pid) {
        setState('failed');
        setErrorMsg('Payment ID not found. Please contact the school to verify payment.');
        return;
      }

      try {
        const res = await apiRequest<{ success: boolean; data: ExecuteResult; error?: string }>(
          '/api/payment/bkash/execute-fee',
          { method: 'POST', body: JSON.stringify({ paymentID: pid }) }
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
        setErrorMsg(e.message || 'Payment verification failed. Please contact the school.');
      }
    }

    execute();
  }, [paymentID, status]);

  if (state === 'loading') {
    return (
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-pink-500 animate-spin mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-800">Verifying payment…</h2>
        <p className="text-sm text-gray-500 mt-1">Please wait, do not close this page.</p>
      </div>
    );
  }

  if (state === 'success' && result) {
    return (
      <div className="text-center">
        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-1">Payment Successful!</h2>
        <p className="text-sm text-gray-500 mb-5">
          {result.alreadyProcessed ? 'This payment was already processed.' : 'Your fee has been recorded.'}
        </p>

        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-left mb-6">
          <div className="flex justify-between">
            <span className="text-gray-500">Amount Paid</span>
            <span className="font-bold text-gray-900">৳{result.amount.toLocaleString()}</span>
          </div>
          {result.trxID && (
            <div className="flex justify-between">
              <span className="text-gray-500">Transaction ID</span>
              <span className="font-mono text-xs text-gray-800 font-semibold">{result.trxID}</span>
            </div>
          )}
          {result.studentName && (
            <div className="flex justify-between">
              <span className="text-gray-500">Student</span>
              <span className="font-medium text-gray-800">{result.studentName}</span>
            </div>
          )}
          {result.customerMsisdn && (
            <div className="flex justify-between">
              <span className="text-gray-500">Paid from</span>
              <span className="text-gray-800">{result.customerMsisdn}</span>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400">
          Please save your Transaction ID <strong>{result.trxID}</strong> for your records.
        </p>
      </div>
    );
  }

  if (state === 'cancelled') {
    return (
      <div className="text-center">
        <AlertCircle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Cancelled</h2>
        <p className="text-sm text-gray-500">You cancelled the bKash payment. No amount was deducted.</p>
        <p className="mt-4 text-xs text-gray-400">You can ask the school to resend the payment link.</p>
      </div>
    );
  }

  // failed
  return (
    <div className="text-center">
      <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Failed</h2>
      <p className="text-sm text-gray-500">{errorMsg || 'The payment could not be completed.'}</p>
      <p className="mt-4 text-xs text-gray-400">Please contact the school to try again.</p>
    </div>
  );
}

export default function FeePaymentCallbackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 max-w-sm w-full p-8">
        {/* bKash branding */}
        <div className="text-center mb-6">
          <span className="font-black text-2xl text-[#E2136E]">bKash</span>
          <p className="text-xs text-gray-400 mt-0.5">Payment Result</p>
        </div>

        <Suspense fallback={
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-pink-500 animate-spin mx-auto" />
          </div>
        }>
          <CallbackContent />
        </Suspense>
      </div>
    </div>
  );
}
