'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'মো. তানভীর আহমেদ',
    role: 'প্রধান শিক্ষক, ঢাকাটোইল ইন্টারমিডিয়েট ফ্যাশন স্কুল',
    text: '"ফি রিপোর্ট, আয়-ব্যয়ের রিপোর্ট ও অডিট রিপোর্ট আগের থেকে অনেক সহজে পাওয়া যাচ্ছে সেটা সত্যিই দারুণ!"',
    stars: 5,
  },
  {
    name: 'সালমা খাতুন',
    role: 'প্রতিষ্ঠাতা ও অধ্যক্ষ, আল-কুরআন ইন্টারন্যাশনাল মাদ্রাসা',
    text: '"শিক্ষার্থী ও অভিভাবক, শিক্ষকদের জন্য এমন একটি User-friendly এবং সহজলভ্য সফটওয়্যার!"',
    stars: 4,
  },
  {
    name: 'রহুল আমিন',
    role: 'সহকারী শিক্ষক, বাগেরহাট মাধ্যমিক বিদ্যালয়',
    text: '"অনলাইন ভর্তি, অনলাইন রেজাল্ট এবং শিক্ষক উপস্থিতি সব কিছুই এখন সফটওয়্যারে পাওয়া সম্ভব হয়েছে!"',
    stars: 5,
  },
  {
    name: 'নাসরিন বেগম',
    role: 'হিসাবরক্ষক, ঢাকা মডেল স্কুল অ্যান্ড কলেজ',
    text: '"ফি সংগ্রহ ও রিপোর্ট তৈরি এখন মাত্র কয়েক সেকেন্ডের ব্যাপার। আমাদের অফিসের কাজ অনেক সহজ হয়ে গেছে।"',
    stars: 5,
  },
  {
    name: 'আব্দুল্লাহ আল-মামুন',
    role: 'উপাধ্যক্ষ, চট্টগ্রাম আদর্শ কলেজ',
    text: '"শিক্ষার্থীদের হাজিরা এবং পরীক্ষার ফলাফল প্রকাশ এখন অনেক দ্রুত ও নির্ভুল হয়েছে।"',
    stars: 4,
  },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 transition-colors ${i < count ? 'text-[#E8471D] fill-[#E8471D]' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 280 : -280, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -280 : 280, opacity: 0 }),
};

export default function Testimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const goTo = (idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  };
  const prev = () => { setDirection(-1); setCurrent((p) => (p - 1 + TESTIMONIALS.length) % TESTIMONIALS.length); };
  const next = () => { setDirection(1); setCurrent((p) => (p + 1) % TESTIMONIALS.length); };

  const t = TESTIMONIALS[current];

  return (
    <section id="testimonials" className="py-20 bg-white font-bengali overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-sm font-semibold text-[#E8471D] uppercase tracking-wider">
            আমাদের গ্রাহকরা যা বলছেন
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#0D1B2A]">
            বাংলাদেশের সেরা স্কুল ম্যানেজমেন্ট সফটওয়্যার
            <br />
            যাদের আস্থা{' '}
            <span className="text-[#E8471D]">আমার স্কুল</span>
          </h2>
        </motion.div>

        {/* Slider */}
        <div className="relative max-w-2xl mx-auto">
          <div className="overflow-hidden rounded-2xl">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={current}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white border border-gray-100 rounded-2xl p-8 shadow-lg"
              >
                <Quote className="w-10 h-10 text-[#E8471D]/15 mb-4" />

                <p className="text-gray-700 text-lg leading-relaxed mb-6 italic">{t.text}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#E8471D]/10 flex items-center justify-center text-xl font-bold text-[#E8471D]">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-[#0D1B2A]">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role}</p>
                    </div>
                  </div>
                  <StarRating count={t.stars} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Prev / Next */}
          <button
            onClick={prev}
            className="absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:text-[#E8471D] hover:border-[#E8471D] transition-all"
            aria-label="পূর্ববর্তী"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:text-[#E8471D] hover:border-[#E8471D] transition-all"
            aria-label="পরবর্তী"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? 'bg-[#E8471D] w-6' : 'bg-gray-200 w-2 hover:bg-gray-300'
                }`}
                aria-label={`স্লাইড ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
