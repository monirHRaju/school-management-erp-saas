'use client';

import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { UserPlus, Settings, TrendingUp } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: UserPlus,
    color: 'indigo',
    title: 'Sign Up Free',
    desc: 'Create your school account in under 60 seconds. No credit card needed. Start your 14-day Pro trial instantly.',
  },
  {
    number: '02',
    icon: Settings,
    color: 'violet',
    title: 'Configure Your School',
    desc: 'Add students, set up fee structures, configure classes, and assign roles to your staff — all from one dashboard.',
  },
  {
    number: '03',
    icon: TrendingUp,
    color: 'purple',
    title: 'Manage & Grow',
    desc: 'Track everything in real time. Collect fees, take attendance, monitor finances, and generate professional reports.',
  },
];

const colorMap: Record<string, { border: string; bg: string; icon: string; number: string }> = {
  indigo: {
    border: 'border-indigo-500/30 hover:border-indigo-500/60',
    bg: 'bg-indigo-500/10',
    icon: 'text-indigo-400',
    number: 'text-indigo-500/30',
  },
  violet: {
    border: 'border-violet-500/30 hover:border-violet-500/60',
    bg: 'bg-violet-500/10',
    icon: 'text-violet-400',
    number: 'text-violet-500/30',
  },
  purple: {
    border: 'border-purple-500/30 hover:border-purple-500/60',
    bg: 'bg-purple-500/10',
    icon: 'text-purple-400',
    number: 'text-purple-500/30',
  },
};

export default function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="how-it-works" className="py-24 bg-zinc-900/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-violet-400 tracking-wider uppercase">Simple Setup</span>
          <h2 className="mt-3 text-4xl font-extrabold text-white tracking-tight">
            Up and Running in{' '}
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Minutes
            </span>
          </h2>
          <p className="mt-4 text-lg text-zinc-500 max-w-xl mx-auto">
            No lengthy setup, no IT team required. Three simple steps to transform your school management.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-12 left-[calc(16.67%-16px)] right-[calc(16.67%-16px)] h-px border-t-2 border-dashed border-zinc-700/60 z-0" />

          {steps.map((step, i) => {
            const c = colorMap[step.color];
            const Icon = step.icon;
            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.15 + 0.2, ease: [0.22, 1, 0.36, 1] }}
                className={`relative z-10 bg-zinc-900 border ${c.border} rounded-2xl p-7 transition-all duration-300`}
              >
                {/* Step number watermark */}
                <span className={`absolute top-4 right-5 text-5xl font-black ${c.number} select-none`}>
                  {step.number}
                </span>

                <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center mb-5`}>
                  <Icon className={`w-6 h-6 ${c.icon}`} />
                </div>

                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-zinc-500 leading-relaxed">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="text-center mt-12"
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-8 py-3.5 rounded-xl shadow-xl shadow-indigo-600/25 transition-all hover:-translate-y-0.5"
          >
            Start Your Free Account →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
