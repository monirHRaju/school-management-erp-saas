'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  Users, BangladeshnRupee, CalendarCheck, BookOpen,
  BarChart3, ShieldCheck, Globe, Heart,
} from 'lucide-react';

const features = [
  {
    icon: Users,
    color: 'indigo',
    title: 'Student Management',
    desc: 'Manage complete student profiles, batch assignments, enrollment, and full academic history in one place.',
  },
  {
    icon: BangladeshnRupee,
    color: 'emerald',
    title: 'Fee & Finance',
    desc: 'Collect fees, track payments, send reminders, and generate payment receipts with zero manual effort.',
  },
  {
    icon: CalendarCheck,
    color: 'sky',
    title: 'Attendance Tracking',
    desc: 'Mark and monitor real-time attendance per class. Generate daily, weekly, and monthly attendance reports.',
  },
  {
    icon: BookOpen,
    color: 'violet',
    title: 'Income/Expense Ledger',
    desc: 'Track all school income and expenses with a running balance ledger. Export to PDF or CSV anytime.',
  },
  {
    icon: BarChart3,
    color: 'amber',
    title: 'Analytics & Reports',
    desc: 'Comprehensive dashboards with fee collection rates, attendance percentages, and financial summaries.',
  },
  {
    icon: ShieldCheck,
    color: 'rose',
    title: 'Role-Based Access',
    desc: 'Admin, Staff, Accountant — each role sees only what they need. No data leaks, full control.',
  },
  {
    icon: Globe,
    color: 'teal',
    title: 'Multi-School (Super Admin)',
    desc: 'Manage multiple schools from one console. Set subscription plans, reset passwords, monitor all activity.',
  },
  {
    icon: Heart,
    color: 'pink',
    title: 'Guardian Portal',
    desc: 'Parents get a read-only portal to view their child\'s fees, attendance, and results. Total transparency.',
  },
];

const colorMap: Record<string, { bg: string; icon: string; glow: string }> = {
  indigo: { bg: 'bg-indigo-500/10', icon: 'text-indigo-400', glow: 'group-hover:shadow-indigo-500/20' },
  emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', glow: 'group-hover:shadow-emerald-500/20' },
  sky: { bg: 'bg-sky-500/10', icon: 'text-sky-400', glow: 'group-hover:shadow-sky-500/20' },
  violet: { bg: 'bg-violet-500/10', icon: 'text-violet-400', glow: 'group-hover:shadow-violet-500/20' },
  amber: { bg: 'bg-amber-500/10', icon: 'text-amber-400', glow: 'group-hover:shadow-amber-500/20' },
  rose: { bg: 'bg-rose-500/10', icon: 'text-rose-400', glow: 'group-hover:shadow-rose-500/20' },
  teal: { bg: 'bg-teal-500/10', icon: 'text-teal-400', glow: 'group-hover:shadow-teal-500/20' },
  pink: { bg: 'bg-pink-500/10', icon: 'text-pink-400', glow: 'group-hover:shadow-pink-500/20' },
};

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const c = colorMap[feature.color];
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: (index % 4) * 0.1, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative bg-zinc-900 border border-zinc-800/60 rounded-2xl p-6 hover:border-zinc-700 hover:shadow-lg ${c.glow} transition-all duration-300`}
    >
      <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
      <p className="text-sm text-zinc-500 leading-relaxed">{feature.desc}</p>
    </motion.div>
  );
}

export default function Features() {
  const titleRef = useRef(null);
  const titleInView = useInView(titleRef, { once: true });

  return (
    <section id="features" className="py-24 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          ref={titleRef}
          initial={{ opacity: 0, y: 20 }}
          animate={titleInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-indigo-400 tracking-wider uppercase">Powerful Features</span>
          <h2 className="mt-3 text-4xl font-extrabold text-white tracking-tight">
            Everything You Need to Run Your{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              School
            </span>
          </h2>
          <p className="mt-4 text-lg text-zinc-500 max-w-2xl mx-auto">
            From student enrollment to financial reports — every module you need, seamlessly integrated in one platform.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
