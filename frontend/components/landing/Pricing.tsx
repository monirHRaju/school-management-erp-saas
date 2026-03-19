'use client';

import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Check, X, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '৳0',
    period: '/ forever',
    desc: 'Perfect for small schools just getting started.',
    highlight: false,
    cta: 'Get Started Free',
    ctaHref: '/register',
    ctaStyle: 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800',
    features: [
      { text: 'Up to 50 students', available: true },
      { text: '1 admin account', available: true },
      { text: 'Fee management', available: true },
      { text: 'Attendance tracking', available: true },
      { text: 'Basic dashboard', available: true },
      { text: 'Reports & export', available: false },
      { text: 'Guardian portal', available: false },
      { text: 'Priority support', available: false },
    ],
  },
  {
    name: 'Pro',
    price: '৳999',
    period: '/ month',
    desc: 'For growing schools that need full power.',
    highlight: true,
    badge: 'Most Popular',
    cta: 'Start Free Trial',
    ctaHref: '/register',
    ctaStyle: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30',
    features: [
      { text: 'Unlimited students', available: true },
      { text: '5 staff accounts', available: true },
      { text: 'Fee management', available: true },
      { text: 'Attendance tracking', available: true },
      { text: 'Advanced dashboard', available: true },
      { text: 'Full reports & export (CSV/PDF)', available: true },
      { text: 'Guardian portal', available: true },
      { text: 'Email support', available: true },
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large institutions with advanced needs.',
    highlight: false,
    cta: 'Contact Sales',
    ctaHref: 'mailto:contact@amarschool.com',
    ctaStyle: 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800',
    features: [
      { text: 'Unlimited students', available: true },
      { text: 'Unlimited staff accounts', available: true },
      { text: 'Everything in Pro', available: true },
      { text: 'Multiple branches', available: true },
      { text: 'API access', available: true },
      { text: 'Custom branding', available: true },
      { text: 'Dedicated support', available: true },
      { text: 'SLA guarantee', available: true },
    ],
  },
];

export default function Pricing() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="pricing" className="py-24 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-amber-400 tracking-wider uppercase">Flexible Pricing</span>
          <h2 className="mt-3 text-4xl font-extrabold text-white tracking-tight">
            Plans for Every{' '}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              School
            </span>
          </h2>
          <p className="mt-4 text-lg text-zinc-500 max-w-xl mx-auto">
            Start free, scale as you grow. No hidden fees.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12 + 0.2 }}
              whileHover={{ y: -4 }}
              className={`relative rounded-2xl p-7 border transition-all duration-300 ${
                plan.highlight
                  ? 'bg-gradient-to-b from-indigo-950/60 to-zinc-900 border-indigo-500/50 shadow-xl shadow-indigo-500/10'
                  : 'bg-zinc-900 border-zinc-800/60'
              }`}
            >
              {/* Popular badge */}
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-indigo-600/30">
                    <Zap className="w-3 h-3" />
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <p className="text-sm text-zinc-500 mt-1">{plan.desc}</p>
              </div>

              {/* Price */}
              <div className="mb-7">
                <span className="text-4xl font-black text-white">{plan.price}</span>
                {plan.period && <span className="text-zinc-500 ml-1">{plan.period}</span>}
              </div>

              {/* CTA */}
              <Link
                href={plan.ctaHref}
                className={`w-full block text-center font-semibold px-4 py-2.5 rounded-xl text-sm transition-all mb-7 ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-3 text-sm">
                    {f.available ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                    )}
                    <span className={f.available ? 'text-zinc-300' : 'text-zinc-600'}>{f.text}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="text-center mt-10 text-sm text-zinc-600"
        >
          All paid plans include a 14-day free trial · Cancel anytime
        </motion.p>
      </div>
    </section>
  );
}
