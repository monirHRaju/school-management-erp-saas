'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Shield, CheckCircle, Quote } from 'lucide-react';

const features = [
  'Complete student management & profiles',
  'Fee collection with instant receipts',
  'Real-time attendance tracking',
  'Income/expense financial ledger',
  'Role-based staff access control',
  'Analytics & exportable reports',
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      window.location.href = '/dashboard';
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[46%] relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-indigo-950/80 via-zinc-900 to-zinc-950 border-r border-zinc-800/50">
        {/* Background glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-[80px] pointer-events-none" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />

        {/* Top: Logo */}
        <div className="relative">
          <Link href="/" className="flex items-center gap-2.5 group w-fit">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Amar School
            </span>
          </Link>
        </div>

        {/* Middle: Tagline + Features */}
        <div className="relative space-y-8">
          <div>
            <h2 className="text-3xl font-extrabold text-white leading-snug">
              The smartest way to run
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                your school
              </span>
            </h2>
            <p className="mt-3 text-zinc-400 leading-relaxed">
              Everything you need to manage students, fees, attendance, and finances — in one powerful platform.
            </p>
          </div>

          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-sm text-zinc-300">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: Testimonial */}
        <div className="relative bg-zinc-900/50 border border-zinc-700/40 rounded-2xl p-5">
          <Quote className="w-5 h-5 text-indigo-400 mb-2" />
          <p className="text-sm text-zinc-400 italic leading-relaxed">
            &ldquo;Amar School reduced our fee collection time by 80%. The dashboard gives us a complete picture of every student and every rupee.&rdquo;
          </p>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
              RS
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-200">Rahul Sharma</p>
              <p className="text-xs text-zinc-500">Principal, Sunrise English School</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-zinc-800/60">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Amar School
            </span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
