'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { AlertCircle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  student_fee: 'Monthly Fee',
  book_sales:  'Book Fee',
  stationery:  'Stationery',
  exam_fee:    'Exam Fee',
  syllabus_fee: 'Syllabus Fee',
  fine:        'Fine',
  other:       'Other',
};

interface LinkData {
  token: string;
  amount: number;
  expiresAt: string;
  school:  { name: string };
  student: { name: string; class: string; section: string; rollNo: string };
  fee:     { category: string; month: string; description: string; totalFee: number; dueAmount: number };
}

export default function PublicFeePaymentPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData]       = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<{ message: string; code?: string } | null>(null);
  const [paying, setPaying]   = useState(false);
  const [payError, setPayError] = useState('');

  const fetchLink = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: LinkData }>(
        `/api/payment/link/${token}`
      );
      if (res.success) setData(res.data);
    } catch (err: unknown) {
      const e = err as { message?: string; bkashCode?: string };
      setError({ message: e.message || 'This payment link is unavailable.', code: e.bkashCode });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchLink(); }, [fetchLink]);

  async function handlePay() {
    if (!data) return;
    setPaying(true);
    setPayError('');
    try {
      const res = await apiRequest<{ success: boolean; data: { paymentID: string; bkashURL: string } }>(
        '/api/payment/bkash/create-fee',
        { method: 'POST', body: JSON.stringify({ token }) }
      );
      if (res.success && res.data.bkashURL) {
        // Store paymentID for fallback retrieval on callback page
        sessionStorage.setItem('bkash_payment_id', res.data.paymentID);
        sessionStorage.setItem('bkash_payment_type', 'fee');
        window.location.href = res.data.bkashURL;
      } else {
        setPayError('Failed to initiate payment. Please try again.');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setPayError(e.message || 'Failed to initiate payment. Please try again.');
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-800 mb-2">Link Unavailable</h1>
          <p className="text-gray-500 text-sm">{error.message}</p>
          {error.code === 'USED' && (
            <p className="mt-3 text-xs text-gray-400">This payment has already been completed. Please contact the school if you have questions.</p>
          )}
          {error.code === 'EXPIRED' && (
            <p className="mt-3 text-xs text-gray-400">Please ask the school to generate a new payment link.</p>
          )}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const categoryLabel = CATEGORY_LABELS[data.fee.category] || data.fee.category;
  const monthLabel    = data.fee.month
    ? new Date(data.fee.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : '';
  const expiresLabel  = new Date(data.expiresAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#E2136E] to-[#c0125e] px-6 py-5 text-white">
          <div className="flex items-center gap-2 mb-1">
            {/* bKash logo text */}
            <span className="font-black text-xl tracking-tight">bKash</span>
            <span className="text-pink-200 text-sm">Payment</span>
          </div>
          <p className="text-pink-100 text-xs">{data.school.name}</p>
        </div>

        {/* Student & Fee Info */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Student</p>
            <p className="font-semibold text-gray-900">{data.student.name}</p>
            {(data.student.class || data.student.section) && (
              <p className="text-sm text-gray-500">
                Class {data.student.class}{data.student.section ? ` — ${data.student.section}` : ''}
                {data.student.rollNo ? ` · Roll ${data.student.rollNo}` : ''}
              </p>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Fee Type</span>
              <span className="font-medium text-gray-800">{categoryLabel}</span>
            </div>
            {monthLabel && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Month</span>
                <span className="font-medium text-gray-800">{monthLabel}</span>
              </div>
            )}
            {data.fee.description && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Description</span>
                <span className="font-medium text-gray-800 text-right max-w-[60%]">{data.fee.description}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2 mt-2">
              <span className="text-gray-500">Total Fee</span>
              <span className="text-gray-700">৳{data.fee.totalFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-gray-700">Amount Due</span>
              <span className="text-xl font-black text-[#E2136E]">৳{data.amount.toLocaleString()}</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">Link valid until {expiresLabel}</p>

          {payError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-600">{payError}</p>
            </div>
          )}

          <button
            onClick={handlePay}
            disabled={paying}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-base transition-all
              bg-[#E2136E] hover:bg-[#c0125e] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-pink-200"
          >
            {paying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Redirecting to bKash…
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4" />
                Pay ৳{data.amount.toLocaleString()} via bKash
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            You will be redirected to the official bKash payment page
          </p>
        </div>

        {/* Powered by */}
        <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-center gap-1">
          <span className="text-xs text-gray-400">Powered by</span>
          <span className="text-xs font-bold text-[#E2136E]">bKash</span>
        </div>
      </div>
    </div>
  );
}
