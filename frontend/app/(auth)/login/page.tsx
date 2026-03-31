'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Phone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type LoginTab = 'staff' | 'guardian';

const DEMO_ACCOUNTS = {
  staff: [
    { label: 'Admin', email: 'admin@school.com', password: 'admin123' },
    { label: 'Staff', email: 'staff@school.com', password: 'staff123' },
    { label: 'Accountant', email: 'accounts@school.com', password: 'accounts123' },
    { label: 'Teacher', email: 'teacher@school.com', password: 'teacher123' },
  ],
  guardian: [
    { label: 'Guardian', phone: '01711111120', password: '01711111120' },
  ],
};

export default function LoginPage() {
  const { login } = useAuth();
  const [tab, setTab] = useState<LoginTab>('staff');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (tab === 'staff') {
        await login({ email: email.trim(), password });
      } else {
        await login({ phone: phone.trim(), password });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">Welcome back</h1>
        <p className="mt-2 text-zinc-500">Sign in to your school dashboard</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-zinc-900 p-1 mb-6">
        <button
          type="button"
          onClick={() => { setTab('staff'); setError(''); }}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            tab === 'staff'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Admin / Staff
        </button>
        <button
          type="button"
          onClick={() => { setTab('guardian'); setError(''); }}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
            tab === 'guardian'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Guardian
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email or Phone */}
        {tab === 'staff' ? (
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourschool.com"
                className="w-full bg-zinc-900 border border-zinc-700/60 text-zinc-100 placeholder-zinc-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
              />
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-zinc-400 mb-1.5">
              Phone number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                id="phone"
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className="w-full bg-zinc-900 border border-zinc-700/60 text-zinc-100 placeholder-zinc-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
              />
            </div>
          </div>
        )}

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-zinc-400">
              Password
            </label>
            <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-zinc-900 border border-zinc-700/60 text-zinc-100 placeholder-zinc-600 rounded-xl pl-10 pr-12 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
          >
            <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-500/30 hover:-translate-y-0.5 disabled:hover:translate-y-0"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Demo accounts */}
      <div className="mt-5">
        <p className="text-xs text-zinc-600 text-center mb-2">Quick demo login</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {(tab === 'staff' ? DEMO_ACCOUNTS.staff : DEMO_ACCOUNTS.guardian).map((demo) => (
            <button
              key={demo.label}
              type="button"
              onClick={() => {
                if ('email' in demo) {
                  setTab('staff');
                  setEmail(demo.email);
                } else {
                  setTab('guardian');
                  setPhone(demo.phone);
                }
                setPassword(demo.password);
                setError('');
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800 transition-all"
            >
              {demo.label}
            </button>
          ))}
        </div>
      </div>

      {/* Footer links */}
      <div className="mt-6 space-y-3">
        <p className="text-center text-sm text-zinc-600">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Create one free
          </Link>
        </p>
        <p className="text-center text-xs text-zinc-700">
          Super Admin?{' '}
          <Link href="/super-admin/login" className="text-zinc-500 hover:text-zinc-400 transition-colors">
            Log in here →
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
