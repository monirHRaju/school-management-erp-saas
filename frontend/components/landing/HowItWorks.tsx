'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { Settings2, UserCheck, TrendingUp, Repeat2 } from 'lucide-react';

const BENEFITS = [
  {
    number: '০১',
    icon: Settings2,
    title: 'স্বয়ংক্রিয় ব্যবস্থাপনা',
    desc: 'প্রতিষ্ঠানের সব কাজ স্বয়ংক্রিয়ভাবে সম্পন্ন হওয়ায় সময় ও পরিশ্রম দুটোই বাঁচে।',
    link: 'আরো জানুন →',
  },
  {
    number: '০২',
    icon: UserCheck,
    title: 'শিক্ষকের মনোযোগ',
    desc: 'শিক্ষকদের সময় প্রশাসনিক কাজে নষ্ট না হয়ে পড়ানোয় মনোযোগ দেওয়া সম্ভব হয়।',
    link: 'আরো জানুন →',
  },
  {
    number: '০৩',
    icon: TrendingUp,
    title: 'ফলাফল ও হাজিরা',
    desc: 'ডিজিটাল হাজিরার কারণে প্রতিষ্ঠানের শিক্ষার্থীদের উপস্থিতি ও ফলাফল উন্নত হয়।',
    link: 'আরো জানুন →',
  },
  {
    number: '০৪',
    icon: Repeat2,
    title: 'অবিরাম অগ্রগতি',
    desc: 'শিক্ষার্থীদের সংখ্যা ও মানের দিক থেকে প্রতিষ্ঠানের নিরবচ্ছিন্ন উন্নতি নিশ্চিত হয়।',
    link: 'আরো জানুন →',
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="benefits" className="py-20 bg-[#0D1B2A] font-bengali">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header row */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-semibold text-[#E8471D] uppercase tracking-wider">
              কেন আমার স্কুল?
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white leading-tight">
              কিভাবে{' '}
              <span className="text-[#E8471D]">আমার স্কুল</span>
              <br />
              আপনার প্রতিষ্ঠানের উন্নয়নে
              <br />
              ভূমিকা রাখবে?
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link
              href="/try-demo"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#E8471D] text-white font-semibold rounded-full hover:bg-[#CC3D18] transition-all duration-200 shadow-lg hover:-translate-y-0.5"
            >
              যোগাযোগ করুন →
            </Link>
          </motion.div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <motion.div
                key={b.number}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 + 0.2 }}
                className="group relative bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-[#E8471D] hover:border-[#E8471D] transition-all duration-300 hover:-translate-y-1"
              >
                {/* Step number watermark */}
                <span className="absolute top-4 right-5 text-4xl font-black text-white/5 select-none group-hover:text-white/10 transition-colors">
                  {b.number}
                </span>

                <div className="w-12 h-12 rounded-xl bg-[#E8471D]/15 flex items-center justify-center mb-5 group-hover:bg-white/20 transition-colors duration-300">
                  <Icon className="w-6 h-6 text-[#E8471D] group-hover:text-white transition-colors duration-300" />
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-white mb-2">{b.title}</h3>
                <p className="text-sm text-gray-400 group-hover:text-white/80 leading-relaxed mb-5">{b.desc}</p>

                <a
                  href="#why"
                  className="text-sm font-semibold text-[#E8471D] group-hover:text-white transition-colors"
                >
                  {b.link}
                </a>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
