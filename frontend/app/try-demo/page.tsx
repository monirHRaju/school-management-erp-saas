'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Loader2, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL ?? '';

const HEARD_FROM = [
  'ফেসবুক',
  'ইউটিউব',
  'বন্ধু/পরিচিত',
  'গুগল',
  'পত্রিকা/ব্লগ',
  'অন্যান্য',
];

type Step = 'form' | 'otp' | 'success';

interface FormData {
  name: string;
  email: string;
  occupation: string;
  institution: string;
  mobile: string;
  address: string;
  specialRequirements: string;
  heardFrom: string;
}

const EMPTY: FormData = {
  name: '', email: '', occupation: '', institution: '',
  mobile: '', address: '', specialRequirements: '', heardFrom: '',
};

export default function TryDemoPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormData>(EMPTY);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.mobile.trim()) {
      toast.error('নাম ও মোবাইল নম্বর আবশ্যক।');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/demo/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('OTP পাঠানো হয়েছে!');
      setStep('otp');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'সার্ভার ত্রুটি।');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      const res = await fetch(`${API}/api/demo/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('নতুন OTP পাঠানো হয়েছে।');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'সার্ভার ত্রুটি।');
    } finally {
      setResending(false);
    }
  }

  async function handleVerify() {
    const otpStr = otp.join('');
    if (otpStr.length < 6) {
      toast.error('৬ সংখ্যার OTP দিন।');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/demo/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: form.mobile, otp: otpStr }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.demoToken) {
        localStorage.setItem('school_management_token', data.demoToken);
        toast.success('যাচাই সফল! ড্যাশবোর্ডে যাচ্ছেন...');
        setTimeout(() => router.push('/dashboard'), 1200);
      } else {
        setStep('success');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'সার্ভার ত্রুটি।');
    } finally {
      setLoading(false);
    }
  }

  function handleOtpChange(val: string, idx: number) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus();
    }
  }

  function handleOtpKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 font-bengali flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E8471D] flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-[#0D1B2A]">
              আমার <span className="text-[#E8471D]">স্কুল</span>
            </span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#E8471D] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            হোমে ফিরুন
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {/* ── FORM STEP ── */}
            {step === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8"
              >
                <h1 className="text-2xl font-bold text-[#0D1B2A] text-center mb-1">
                  আমার স্কুলের ডেমো দেখুন
                </h1>
                <p className="text-sm text-gray-500 text-center mb-7">
                  ফর্মটি পূরণ করুন — মোবাইলে OTP পাঠানো হবে
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    required
                    type="text"
                    placeholder="আপনার নাম লিখুন *"
                    value={form.name}
                    onChange={set('name')}
                    className={INPUT}
                  />
                  <input
                    type="email"
                    placeholder="আপনার ইমেইল লিখুন"
                    value={form.email}
                    onChange={set('email')}
                    className={INPUT}
                  />
                  <input
                    type="text"
                    placeholder="আপনার পেশা লিখুন"
                    value={form.occupation}
                    onChange={set('occupation')}
                    className={INPUT}
                  />
                  <input
                    type="text"
                    placeholder="আপনার প্রতিষ্ঠানের নাম লিখুন"
                    value={form.institution}
                    onChange={set('institution')}
                    className={INPUT}
                  />
                  <input
                    required
                    type="tel"
                    placeholder="আপনার মোবাইল নম্বর লিখুন * (01XXXXXXXXX)"
                    value={form.mobile}
                    onChange={set('mobile')}
                    className={INPUT}
                  />
                  <input
                    type="text"
                    placeholder="আপনার ঠিকানা লিখুন"
                    value={form.address}
                    onChange={set('address')}
                    className={INPUT}
                  />
                  <textarea
                    rows={3}
                    placeholder="বিশেষ কোনো চাহিদা থাকলে তা এখানে উল্লেখ করুন"
                    value={form.specialRequirements}
                    onChange={set('specialRequirements')}
                    className={`${INPUT} resize-none`}
                  />
                  <select value={form.heardFrom} onChange={set('heardFrom')} className={INPUT}>
                    <option value="">আপনি কোথায় শুনেছেন?</option>
                    {HEARD_FROM.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8471D] text-white font-bold rounded-xl hover:bg-[#CC3D18] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {loading ? 'অপেক্ষা করুন...' : '⚙ সাবমিট করুন'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── OTP STEP ── */}
            {step === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center"
              >
                <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-5">
                  <GraduationCap className="w-8 h-8 text-[#E8471D]" />
                </div>
                <h2 className="text-2xl font-bold text-[#0D1B2A] mb-2">OTP যাচাই করুন</h2>
                <p className="text-sm text-gray-500 mb-8">
                  <span className="font-semibold text-[#0D1B2A]">{form.mobile}</span> নম্বরে
                  ৬ সংখ্যার OTP পাঠানো হয়েছে
                </p>

                {/* OTP boxes */}
                <div className="flex justify-center gap-3 mb-8">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, i)}
                      onKeyDown={(e) => handleOtpKeyDown(e, i)}
                      className="w-12 h-14 text-center text-xl font-bold text-gray-900 border-2 border-gray-200 rounded-xl focus:border-[#E8471D] focus:outline-none transition-colors bg-white"
                    />
                  ))}
                </div>

                <button
                  onClick={handleVerify}
                  disabled={loading || otp.join('').length < 6}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#E8471D] text-white font-bold rounded-xl hover:bg-[#CC3D18] transition-all disabled:opacity-60 disabled:cursor-not-allowed mb-4"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {loading ? 'যাচাই হচ্ছে...' : 'যাচাই করুন'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    onClick={() => setStep('form')}
                    className="text-gray-500 hover:text-[#0D1B2A] transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> ফিরে যান
                  </button>
                  <button
                    onClick={handleResend}
                    disabled={resending}
                    className="text-[#E8471D] hover:text-[#CC3D18] transition-colors flex items-center gap-1 disabled:opacity-60"
                  >
                    {resending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    OTP পুনরায় পাঠান
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── SUCCESS STEP ── */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, type: 'spring' }}
                className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                </motion.div>

                <h2 className="text-2xl font-bold text-[#0D1B2A] mb-3">
                  আবেদন সফল হয়েছে!
                </h2>
                <p className="text-gray-500 mb-6 leading-relaxed">
                  আপনার ডেমো আবেদন গৃহীত হয়েছে। আমাদের টিম শীঘ্রই{' '}
                  <span className="font-semibold text-[#0D1B2A]">{form.mobile}</span> নম্বরে
                  যোগাযোগ করবে।
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                  <Link
                    href="/"
                    className="px-6 py-3 bg-[#0D1B2A] text-white font-semibold rounded-full hover:bg-[#1B3A5C] transition-all"
                  >
                    হোমে ফিরুন
                  </Link>
                </div>

                <div className="border-t border-gray-100 pt-5">
                  <p className="text-xs text-gray-400 mb-2">অ্যাডমিন প্যানেলে প্রবেশ করতে:</p>
                  <Link
                    href="/sp"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E8471D] hover:underline"
                  >
                    লগইন পেজে যান →
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const INPUT =
  'w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#E8471D] focus:ring-1 focus:ring-[#E8471D]/20 transition-all bg-gray-50 focus:bg-white';
