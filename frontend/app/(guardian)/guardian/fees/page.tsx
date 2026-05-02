'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { openInvoiceWindow } from '@/lib/invoice';

interface Child {
  _id: string;
  name: string;
  class: string;
}

interface Fee {
  _id: string;
  student_id: string;
  category: string;
  month?: string;
  description?: string;
  total_fee: number;
  paid_amount: number;
  due_amount: number;
  status: string;
}

interface PaymentItem {
  _id: string;
  amount: number;
  discount?: number;
  note?: string;
  payment_date: string;
  fee?: { _id: string; category: string; month?: string; total_fee: number; description?: string } | null;
  student?: { _id: string; name: string; class?: string; section?: string; rollNo?: string } | null;
}

interface InvoicePayload {
  payment: { _id: string; amount: number; discount?: number; note?: string; payment_date: string; created_by?: { name?: string } };
  fee: { category: string; month?: string; total_fee: number; paid_amount?: number; due_amount?: number; description?: string; fee_type?: string };
  student: { name: string; class?: string; section?: string; rollNo?: string; fatherName?: string; guardianName?: string; guardianPhone?: string };
  school: { name?: string; address?: string; contact?: string; logoUrl?: string };
}

export default function GuardianFeesPage() {
  const searchParams = useSearchParams();
  const payFeeId = searchParams.get('pay');

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [fees, setFees] = useState<Fee[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiRequest<{ success: boolean; data: Child[] }>('/api/guardian/children', { token })
      .then((res) => {
        if (res.success && res.data?.length) {
          setChildren(res.data);
          setSelectedChild(res.data[0]._id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadFees = useCallback(async () => {
    if (!selectedChild) return;
    const token = getToken();
    if (!token) return;
    const res = await apiRequest<{ success: boolean; data: Fee[] }>(
      `/api/guardian/children/${selectedChild}/fees`,
      { token }
    );
    if (res.success) setFees(res.data || []);
  }, [selectedChild]);

  useEffect(() => {
    loadFees();
  }, [loadFees]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiRequest<{ success: boolean; data: PaymentItem[] }>('/api/guardian/payments', { token })
      .then((res) => { if (res.success) setPayments(res.data || []); })
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

  // Auto-trigger pay if ?pay= is present
  useEffect(() => {
    if (payFeeId && fees.length > 0 && !paying) {
      handlePay(payFeeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payFeeId, fees]);

  async function handlePay(feeId: string) {
    const token = getToken();
    if (!token) return;
    setPaying(feeId);
    try {
      const res = await apiRequest<{ success: boolean; data: { payUrl: string } }>(
        `/api/guardian/pay/${feeId}`,
        { method: 'POST', token }
      );
      if (res.success && res.data?.payUrl) {
        window.location.href = res.data.payUrl;
      }
    } catch {
      alert('Failed to initiate payment');
    } finally {
      setPaying(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (children.length === 0) {
    return <p className="text-center text-muted-foreground py-20">No children linked to your account.</p>;
  }

  const totalDue = fees.filter((f) => f.status !== 'paid').reduce((s, f) => s + (f.due_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">Fees & Payment</h2>
        {children.length > 1 && (
          <select
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
          >
            {children.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} (Class {c.class})
              </option>
            ))}
          </select>
        )}
      </div>

      {totalDue > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-muted-foreground">Total Due</p>
          <p className="text-2xl font-bold text-red-500">৳{totalDue.toLocaleString()}</p>
        </div>
      )}

      {selectedChild && (() => {
        const childPayments = payments.filter((p) => p.student?._id === selectedChild);
        if (childPayments.length === 0) return null;
        return (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">Payment History & Receipts</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Print money receipt for any past payment.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-xs">
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">Date</th>
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">Category</th>
                    <th className="px-4 py-2 text-left text-muted-foreground font-medium">Month</th>
                    <th className="px-4 py-2 text-right text-muted-foreground font-medium">Amount</th>
                    <th className="px-4 py-2 text-center text-muted-foreground font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {childPayments.map((p) => (
                    <tr key={p._id}>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {new Date(p.payment_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-2 text-foreground capitalize">{(p.fee?.category || '—').replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2 text-muted-foreground">{p.fee?.month || '—'}</td>
                      <td className="px-4 py-2 text-right text-foreground font-medium">৳{p.amount.toLocaleString()}</td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(p._id)}
                          disabled={printingId === p._id}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                          title="Print money receipt"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          {printingId === p._id ? 'Loading…' : 'Print'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {fees.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No fees found.</p>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Category</th>
                  <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Month</th>
                  <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Total</th>
                  <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Paid</th>
                  <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Due</th>
                  <th className="px-4 py-2.5 text-center text-muted-foreground font-medium">Status</th>
                  <th className="px-4 py-2.5 text-center text-muted-foreground font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fees.map((fee) => (
                  <tr key={fee._id}>
                    <td className="px-4 py-2.5 text-foreground capitalize">{fee.category?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fee.month || '-'}</td>
                    <td className="px-4 py-2.5 text-right text-foreground">৳{fee.total_fee?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-foreground">৳{fee.paid_amount?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-foreground">৳{fee.due_amount?.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        fee.status === 'paid'
                          ? 'bg-green-500/10 text-green-500'
                          : fee.status === 'partial'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {fee.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {fee.status !== 'paid' && (
                        <button
                          onClick={() => handlePay(fee._id)}
                          disabled={paying === fee._id}
                          className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                        >
                          {paying === fee._id ? 'Processing...' : 'Pay Now'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
