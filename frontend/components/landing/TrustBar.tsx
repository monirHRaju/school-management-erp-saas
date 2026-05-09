'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  UserPlus, Globe, BarChart3, CreditCard,
  Award, FileText, TrendingDown, Bell,
} from 'lucide-react';

const STEPS = [
  { num: '০১', time: '৩০ সেকেন্ডে', label: 'নতুন শিক্ষার্থী ভর্তি', icon: UserPlus },
  { num: '০২', time: '২০ সেকেন্ডে', label: 'অনলাইন হাজিরা', icon: Globe },
  { num: '০৩', time: '১৫ সেকেন্ডে', label: 'ফি এর রিপোর্ট', icon: BarChart3 },
  { num: '০৪', time: '১০ সেকেন্ডে', label: 'ফি পেমেন্ট', icon: CreditCard },
  { num: '০৫', time: '২০ সেকেন্ডে', label: 'ফলাফল প্রকাশ', icon: Award },
  { num: '০৬', time: '৩০ সেকেন্ডে', label: 'আইডি/অ্যাডমিট কার্ড তৈরি', icon: FileText },
  { num: '০৭', time: '২০ সেকেন্ডে', label: 'আয়-ব্যয়ের রিপোর্ট', icon: TrendingDown },
  { num: '০৮', time: '১০ সেকেন্ডে', label: 'নোটিশ প্রদান', icon: Bell },
];

function StepCard({
  s,
  dark,
  delay,
  inView,
}: {
  s: (typeof STEPS)[0];
  dark: boolean;
  delay: number;
  inView: boolean;
}) {
  const Icon = s.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay }}
      className={`group rounded-2xl p-6 text-center hover:-translate-y-1 transition-all duration-200 hover:bg-[#E8471D] hover:border-[#E8471D] hover:shadow-lg ${
        dark
          ? 'bg-white/5 border border-white/10'
          : 'bg-white border border-gray-100 shadow-sm'
      }`}
    >
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#E8471D] group-hover:bg-white/20 text-white text-xs font-bold mb-3 transition-colors duration-200">
        {s.num}
      </span>
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-white/20 transition-colors duration-200 ${
          dark ? 'bg-[#E8471D]/15' : 'bg-orange-50'
        }`}
      >
        <Icon className="w-5 h-5 text-[#E8471D] group-hover:text-white transition-colors duration-200" />
      </div>
      <p className="text-xl font-bold text-[#E8471D] group-hover:text-white transition-colors duration-200">{s.time}</p>
      <p className={`text-sm mt-1 group-hover:text-white/80 transition-colors duration-200 ${dark ? 'text-gray-400' : 'text-gray-600'}`}>{s.label}</p>
    </motion.div>
  );
}

export default function TrustBar() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section className="font-bengali" ref={ref}>
      {/* Header + first 4 — light bg */}
      <div className="bg-[#F8FAFC] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-10"
          >
            <span className="text-xs font-semibold text-[#E8471D] uppercase tracking-wider">
              কিভাবে আমাদের সফটওয়্যার কম সময়ে কাজ করে ও সাশ্রয় করে তা দেখুন
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#0D1B2A]">
              মাত্র কয়েকটি ধাপে কমবে কার্যক্রমের{' '}
              <span className="text-[#E8471D]">সময় ও শ্রম</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STEPS.slice(0, 4).map((s, i) => (
              <StepCard key={s.num} s={s} dark={false} delay={i * 0.08 + 0.2} inView={inView} />
            ))}
          </div>
        </div>
      </div>

      {/* Last 4 — dark bg */}
      <div className="bg-[#0D1B2A] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STEPS.slice(4).map((s, i) => (
              <StepCard key={s.num} s={s} dark delay={i * 0.08 + 0.4} inView={inView} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
