'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Mail, Lock, User, Phone, Building2,
  Globe, Upload, ArrowRight, ArrowLeft, Check, Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

// ─── Plan picker data ────────────────────────────────────────────────────────

const plans = [
  {
    key: 'free',
    name: 'Free',
    price: '৳0',
    period: 'forever',
    students: 'Up to 50 students',
    color: 'zinc',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '৳999',
    period: '/month',
    students: 'Unlimited students',
    color: 'indigo',
    popular: true,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    students: 'Unlimited + API',
    color: 'violet',
  },
];

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-3 mb-8">
      {[1, 2].map((s) => (
        <div key={s} className="flex items-center gap-3">
          {s > 1 && (
            <div className={`flex-1 h-px w-16 transition-colors ${step >= s ? 'bg-indigo-500' : 'bg-zinc-700'}`} />
          )}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
            step > s
              ? 'bg-indigo-600 text-white'
              : step === s
              ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20'
              : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
          }`}>
            {step > s ? <Check className="w-4 h-4" /> : s}
          </div>
          <span className={`text-sm font-medium transition-colors ${
            step >= s ? 'text-zinc-200' : 'text-zinc-600'
          }`}>
            {s === 1 ? 'Organization' : 'Admin Details'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Input field helper ───────────────────────────────────────────────────────

function Field({
  id, label, required, children,
}: { id: string; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-zinc-400 mb-1.5">
        {label}{required && <span className="text-indigo-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full bg-zinc-900 border border-zinc-700/60 text-zinc-100 placeholder-zinc-600 rounded-xl py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all';

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { register } = useAuth();

  // Step
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Organization
  const [schoolName, setSchoolName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Step 2: Admin + plan
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('pro');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate slug from school name
  useEffect(() => {
    if (!slugTouched) {
      setSlug(
        schoolName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      );
    }
  }, [schoolName, slugTouched]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleStep1Next(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!schoolName.trim() || !slug.trim()) {
      setError('School name and slug are required.');
      return;
    }
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await register({
        schoolName: schoolName.trim(),
        slug: slug.trim().toLowerCase(),
        contact: contact.trim() || undefined,
        phone: phone.trim() || undefined,
        subscription_plan: selectedPlan,
        name: name.trim(),
        email: email.trim(),
        password,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-white">Create your school</h1>
        <p className="mt-2 text-zinc-500">Start your 14-day free trial. No credit card required.</p>
      </div>

      <StepIndicator step={step} />

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5"
        >
          <span className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.form
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleStep1Next}
            className="space-y-5"
          >
            {/* School Name */}
            <Field id="schoolName" label="School Name" required>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  id="schoolName"
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Sunrise English Medium School"
                  className={`${inputCls} pl-10`}
                />
              </div>
            </Field>

            {/* Slug */}
            <Field id="slug" label="School Identifier (slug)" required>
              <div className="relative">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <div className="absolute left-10 top-1/2 -translate-y-1/2 text-zinc-600 text-sm pointer-events-none select-none">
                  app/
                </div>
                <input
                  id="slug"
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                  placeholder="sunrise-school"
                  className={`${inputCls} pl-[72px]`}
                />
              </div>
              <p className="mt-1 text-xs text-zinc-600">This is your unique school identifier.</p>
            </Field>

            {/* Contact + Phone row */}
            <div className="grid grid-cols-2 gap-4">
              <Field id="contact" label="Contact Email">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    id="contact"
                    type="email"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="info@school.com"
                    className={`${inputCls} pl-10`}
                  />
                </div>
              </Field>
              <Field id="phone" label="Phone">
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880..."
                    className={`${inputCls} pl-10`}
                  />
                </div>
              </Field>
            </div>

            {/* Logo upload */}
            <Field id="logo" label="School Logo (optional)">
              <div
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-4 cursor-pointer group"
              >
                <div className="w-16 h-16 rounded-xl bg-zinc-900 border border-zinc-700/60 flex items-center justify-center overflow-hidden group-hover:border-indigo-500/40 transition-colors">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-6 h-6 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    {logoPreview ? 'Click to change' : 'Upload logo'}
                  </p>
                  <p className="text-xs text-zinc-600">PNG, JPG up to 2MB</p>
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </Field>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/25 hover:-translate-y-0.5"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.form>
        ) : (
          <motion.form
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Full Name */}
            <Field id="name" label="Your Full Name" required>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Principal / Admin name"
                  className={`${inputCls} pl-10`}
                />
              </div>
            </Field>

            {/* Admin Email */}
            <Field id="email" label="Admin Email" required>
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
                  className={`${inputCls} pl-10`}
                />
              </div>
            </Field>

            {/* Password */}
            <Field id="password" label="Password" required>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className={`${inputCls} pl-10 pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            {/* Confirm Password */}
            <Field id="confirmPassword" label="Confirm Password" required>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={`${inputCls} pl-10 pr-12 ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-500/60 focus:border-red-500'
                      : confirmPassword && confirmPassword === password
                      ? 'border-emerald-500/60 focus:border-emerald-500'
                      : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Field>

            {/* Plan picker */}
            <div>
              <p className="text-sm font-medium text-zinc-400 mb-2">
                Preferred Plan <span className="text-zinc-600 font-normal">(informational)</span>
              </p>
              <div className="grid grid-cols-3 gap-2">
                {plans.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setSelectedPlan(p.key)}
                    className={`relative rounded-xl border p-3 text-left transition-all ${
                      selectedPlan === p.key
                        ? 'border-indigo-500/60 bg-indigo-500/10'
                        : 'border-zinc-700/50 bg-zinc-900 hover:border-zinc-600'
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Zap className="w-2.5 h-2.5" />Best
                      </span>
                    )}
                    <p className={`text-sm font-bold ${selectedPlan === p.key ? 'text-indigo-300' : 'text-zinc-200'}`}>
                      {p.name}
                    </p>
                    <p className="text-xs font-semibold text-zinc-400 mt-0.5">{p.price}<span className="text-zinc-600 font-normal">{p.period}</span></p>
                    <p className="text-[10px] text-zinc-600 mt-1 leading-tight">{p.students}</p>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-zinc-600 flex items-center gap-1">
                <span className="text-amber-500">★</span>
                All accounts start with a 14-day free trial. Plan activated by our team.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                className="flex items-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/25 hover:-translate-y-0.5 disabled:hover:translate-y-0"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Create School
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <p className="mt-6 text-center text-sm text-zinc-600">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
