'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote: 'Amar School completely transformed how we manage our 400+ students. The fee collection and automated receipts saved us countless hours every month.',
    name: 'Rahul Sharma',
    role: 'Principal',
    school: 'Sunrise English Medium School',
    initials: 'RS',
    color: 'from-indigo-500 to-violet-600',
  },
  {
    quote: 'The attendance tracking feature is outstanding. Real-time reports help us identify students with issues immediately. We use it every single day.',
    name: 'Priya Mehta',
    role: 'Admin Manager',
    school: 'Greenfield Academy',
    initials: 'PM',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    quote: 'The analytics dashboard helped us identify weak areas in our fee collection. Our recovery rate improved from 70% to 96% within a single academic session.',
    name: 'Ankit Verma',
    role: 'Accountant',
    school: 'New Horizon School',
    initials: 'AV',
    color: 'from-amber-500 to-orange-600',
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5 mb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
}

export default function Testimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="py-24 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-emerald-400 tracking-wider uppercase">Testimonials</span>
          <h2 className="mt-3 text-4xl font-extrabold text-white tracking-tight">
            Trusted by Schools{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Across Bangladesh
            </span>
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.12 + 0.2 }}
              className="bg-zinc-900 border border-zinc-800/60 rounded-2xl p-7 hover:border-zinc-700 transition-colors"
            >
              <Stars />
              <p className="text-zinc-400 leading-relaxed mb-6 text-sm">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.role} · {t.school}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
