'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Student {
  _id: string;
  name: string;
  class: string;
  section?: string;
  rollNo?: string;
  status?: string;
  guardianName?: string;
  guardianPhone?: string;
  dateOfBirth?: string;
  gender?: string;
}

interface Fee {
  _id: string;
  category: string;
  month?: string;
  description?: string;
  total_fee: number;
  paid_amount: number;
  due_amount: number;
  status: string;
}

interface AttendanceSummary {
  totalDays: number;
  present: number;
  absent: number;
  percentage: number;
}

export default function ChildDetailPage() {
  const { id } = useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token || !id) return;

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    Promise.all([
      apiRequest<{ success: boolean; data: Student }>(`/api/guardian/children/${id}`, { token }),
      apiRequest<{ success: boolean; data: Fee[] }>(`/api/guardian/children/${id}/fees`, { token }),
      apiRequest<{ success: boolean; data: { summary: AttendanceSummary } }>(
        `/api/guardian/children/${id}/attendance?month=${month}`,
        { token }
      ),
    ])
      .then(([studentRes, feesRes, attendanceRes]) => {
        if (studentRes.success) setStudent(studentRes.data);
        if (feesRes.success) setFees(feesRes.data || []);
        if (attendanceRes.success) setAttendance(attendanceRes.data?.summary || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return <p className="text-center text-muted-foreground py-20">Student not found</p>;
  }

  const unpaidFees = fees.filter((f) => f.status !== 'paid');
  const totalDue = unpaidFees.reduce((sum, f) => sum + (f.due_amount || 0), 0);

  return (
    <div className="space-y-6">
      <Link href="/guardian/children" className="text-sm text-primary hover:underline">
        ← Back to children
      </Link>

      {/* Student info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xl font-bold text-foreground">{student.name}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Class:</span>{' '}
            <span className="text-foreground font-medium">{student.class}</span>
          </div>
          {student.section && (
            <div>
              <span className="text-muted-foreground">Section:</span>{' '}
              <span className="text-foreground font-medium">{student.section}</span>
            </div>
          )}
          {student.rollNo && (
            <div>
              <span className="text-muted-foreground">Roll No:</span>{' '}
              <span className="text-foreground font-medium">{student.rollNo}</span>
            </div>
          )}
          {student.gender && (
            <div>
              <span className="text-muted-foreground">Gender:</span>{' '}
              <span className="text-foreground font-medium capitalize">{student.gender}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Due</p>
          <p className="text-2xl font-bold text-foreground mt-1">৳{totalDue.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Unpaid Fees</p>
          <p className="text-2xl font-bold text-foreground mt-1">{unpaidFees.length}</p>
        </div>
        {attendance && (
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">This Month Attendance</p>
            <p className="text-2xl font-bold text-foreground mt-1">{attendance.percentage}%</p>
            <p className="text-xs text-muted-foreground">
              {attendance.present}/{attendance.totalDays} days present
            </p>
          </div>
        )}
      </div>

      {/* Fees table */}
      {fees.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <h3 className="font-semibold text-foreground">Fees</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Category</th>
                  <th className="px-4 py-2.5 text-left text-muted-foreground font-medium">Month</th>
                  <th className="px-4 py-2.5 text-right text-muted-foreground font-medium">Total</th>
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
                        <Link
                          href={`/guardian/fees?pay=${fee._id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Pay Now
                        </Link>
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
