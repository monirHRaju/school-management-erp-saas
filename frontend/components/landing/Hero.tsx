'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function Hero() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-white pt-24 pb-12 lg:pt-28 lg:pb-0 font-bengali"
    >
      {/* Subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(#E8471D 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />
      {/* Orange glow top-right */}
      <div className="pointer-events-none absolute -top-32 -right-32 w-125 h-125 rounded-full bg-orange-100 blur-3xl opacity-60" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-8">
          {/* Left: Text */}
          <div className="flex-1 text-center lg:text-left space-y-6">
            {/* Label */}
            <motion.p
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-500"
            >
              <span className="w-2 h-2 rounded-full bg-[#E8471D] animate-pulse" />
              শিক্ষা প্রতিষ্ঠান ব্যবস্থাপনার জন্য বাংলাদেশের সেরা
            </motion.p>

            {/* Headline */}
            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="text-4xl sm:text-5xl xl:text-6xl font-bold text-[#0D1B2A] leading-tight"
            >
              আধুনিক{' '}
              <span className="text-[#E8471D]">স্কুল ম্যানেজমেন্ট</span>
              <br />
              সফটওয়্যার{' '}
              <span className="relative inline-block">
                <span className="text-[#E8471D]">আমার স্কুল</span>
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: 0.8, ease: 'easeOut' }}
                  className="absolute left-0 -bottom-1 h-1 w-full bg-[#E8471D]/30 rounded-full origin-left"
                />
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl mx-auto lg:mx-0"
            >
              আপনার শিক্ষা প্রতিষ্ঠান পরিচালনা করুন সহজে — শিক্ষার্থী ভর্তি, ফি সংগ্রহ,
              হাজিরা, ফলাফল ও রিপোর্ট, সব একটি আধুনিক ড্যাশবোর্ডে।
            </motion.p>

            {/* Feature tags */}
            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="flex flex-wrap gap-2 justify-center lg:justify-start"
            >
              {['শিক্ষার্থী ব্যবস্থাপনা', 'ফি সংগ্রহ', 'হাজিরা ট্র্যাকিং', 'রিপোর্ট জেনারেশন'].map((f) => (
                <span
                  key={f}
                  className="text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-full"
                >
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
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <Link
                href="/try-demo"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#E8471D] text-white font-semibold rounded-full hover:bg-[#CC3D18] transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 group"
              >
                ডেমো দেখুন
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#0D1B2A] text-white font-semibold rounded-full hover:bg-[#1B3A5C] transition-all duration-200 hover:-translate-y-0.5"
              >
                <Play className="w-4 h-4" />
                অ্যাকাউন্ট তৈরি করুন
              </Link>
            </motion.div>

            {/* Trust badge */}
            <motion.p
              custom={5}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="text-sm text-gray-500"
            >
              বিনামূল্যে শুরু করুন · কোনো ক্রেডিট কার্ড লাগবে না · ১৪ দিনের প্রো ট্রায়াল
            </motion.p>
          </div>

          {/* Right: Laptop Image */}
          <motion.div
            className="flex-1 w-full lg:self-end"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative">
              {/* Glow behind image */}
              <div className="absolute inset-8 bg-orange-200/40 rounded-full blur-3xl" />
              <Image
                src="/hero-laptop.png"
                alt="আমার স্কুল ড্যাশবোর্ড প্রিভিউ"
                width={760}
                height={520}
                className="relative w-full h-auto drop-shadow-2xl"
                priority
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="hidden lg:block overflow-hidden leading-none">
        <svg viewBox="0 0 1440 48" className="w-full" preserveAspectRatio="none" style={{ height: 48 }}>
          <path d="M0,48 C360,0 1080,0 1440,48 L1440,48 L0,48 Z" fill="#F8FAFC" />
        </svg>
      </div>
    </section>
  );
}
