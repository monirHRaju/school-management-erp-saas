'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Users, TurkishLira, CalendarCheck } from 'lucide-react';

const fadeUp: import('framer-motion').Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

function DashboardMockup() {
  const students = [
    { name: 'Rahul Sharma', cls: 'Class 10-A', status: 'Paid', color: 'text-emerald-400 bg-emerald-400/10' },
    { name: 'Priya Mehta', cls: 'Class 8-B', status: 'Due', color: 'text-red-400 bg-red-400/10' },
    { name: 'Amit Kumar', cls: 'Class 9-C', status: 'Partial', color: 'text-amber-400 bg-amber-400/10' },
    { name: 'Sara Lee', cls: 'Class 7-A', status: 'Paid', color: 'text-emerald-400 bg-emerald-400/10' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Glow effect behind card */}
      <div className="absolute -inset-4 bg-indigo-500/10 rounded-3xl blur-2xl" />

      {/* Main card */}
      <div className="relative bg-zinc-900 border border-zinc-700/60 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-zinc-800/60 border-b border-zinc-700/50">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-amber-500/70" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
          </div>
          <span className="text-xs text-zinc-400 ml-2">Amar School — Dashboard</span>
        </div>

        <div className="p-4 space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Users, label: 'Students', value: '1,234', color: 'indigo' },
              { icon: TurkishLira, label: 'Fees Due', value: '৳45K', color: 'amber' },
              { icon: CalendarCheck, label: 'Attendance', value: '96%', color: 'emerald' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700/40">
                <div className={`w-6 h-6 rounded-md flex items-center justify-center mb-2 ${
                  color === 'indigo' ? 'bg-indigo-500/20' : color === 'amber' ? 'bg-amber-500/20' : 'bg-emerald-500/20'
                }`}>
                  <Icon className={`w-3.5 h-3.5 ${
                    color === 'indigo' ? 'text-indigo-400' : color === 'amber' ? 'text-amber-400' : 'text-emerald-400'
                  }`} />
                </div>
                <p className="text-lg font-bold text-white leading-none">{value}</p>
                <p className="text-xs text-zinc-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div>
            <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Recent Students</p>
            <div className="space-y-1.5">
              {students.map((s) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-800/40 border border-zinc-700/30 hover:bg-zinc-800/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300">
                      {s.name[0]}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-zinc-200 leading-none">{s.name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{s.cls}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.color}`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-4 -right-4 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg shadow-indigo-600/40"
      >
        Live Updates
      </motion.div>

      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="absolute -bottom-4 -left-4 bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-600/40"
      >
        Fee Collected ✓
      </motion.div>
    </motion.div>
  );
}

export default function Hero() {
  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden bg-zinc-950">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-indigo-800/10 rounded-full blur-[80px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 pt-32 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <div className="space-y-8">
            {/* Badge */}
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
              <span className="inline-flex items-center gap-2 text-sm font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-full px-4 py-1.5">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                Trusted School ERP Platform
              </span>
            </motion.div>

            {/* Headline */}
            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show" className="space-y-2">
              <h1 className="text-5xl sm:text-6xl font-extrabold leading-[1.08] tracking-tight text-white">
                Transform Your
                <br />
                School{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                  Management
                </span>
              </h1>
            </motion.div>

            {/* Subtext */}
            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="text-lg text-zinc-400 leading-relaxed max-w-lg"
            >
              The all-in-one platform for schools — manage students, collect fees, track attendance, monitor finances, and generate reports from a single powerful dashboard.
            </motion.p>

            {/* Feature pills */}
            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="flex flex-wrap gap-2"
            >
              {['Fee Management', 'Attendance Tracking', 'Student Profiles', 'Financial Reports'].map((f) => (
                <span key={f} className="text-xs text-zinc-400 bg-zinc-800/60 border border-zinc-700/50 px-3 py-1.5 rounded-full">
                  ✓ {f}
                </span>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              custom={4}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="flex flex-wrap items-center gap-4"
            >
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 text-zinc-300 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 font-medium px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5"
              >
                <Play className="w-4 h-4 text-indigo-400" />
                View Pricing
              </a>
            </motion.div>

            {/* Trust line */}
            <motion.p
              custom={5}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="text-sm text-zinc-600"
            >
              Free plan available · No credit card required · 14-day Pro trial
            </motion.p>
          </div>

          {/* Right: Dashboard Mockup */}
          <div className="hidden lg:block">
            <DashboardMockup />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-zinc-600">Scroll to explore</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-5 h-8 rounded-full border border-zinc-700 flex items-start justify-center pt-1.5"
        >
          <div className="w-1 h-2 rounded-full bg-zinc-500" />
        </motion.div>
      </motion.div>
    </section>
  );
}
