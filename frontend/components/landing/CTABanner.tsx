'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    q: 'কিভাবে আমাদের স্কুল আমার স্কুল ব্যবহার করতে পারব?',
    a: 'আমাদের ওয়েবসাইটে রেজিস্ট্রেশন করে বিনামূল্যে ট্রায়াল শুরু করুন। অ্যাকাউন্ট তৈরির পর সাথে সাথেই ড্যাশবোর্ড ব্যবহার শুরু করতে পারবেন।',
  },
  {
    q: 'আমার স্কুল ব্যবহার করতে কি ইন্টারনেট প্রয়োজন?',
    a: 'হ্যাঁ, এটি একটি ক্লাউড-ভিত্তিক সফটওয়্যার। ইন্টারনেট সংযোগ থাকলেই যেকোনো ডিভাইস থেকে ব্যবহার করা যাবে।',
  },
  {
    q: 'ফি কালেকশন কি স্বয়ংক্রিয়ভাবে রিপোর্ট তৈরি করে?',
    a: 'হ্যাঁ, প্রতিটি ফি সংগ্রহের পরে স্বয়ংক্রিয়ভাবে রসিদ তৈরি হয় এবং মাসিক/বার্ষিক রিপোর্ট PDF আকারে ডাউনলোড করা যায়।',
  },
  {
    q: 'আমার স্কুল-এ শিক্ষক ও শিক্ষার্থী কতজন পর্যন্ত যোগ করা যাবে?',
    a: 'বিনামূল্যের প্ল্যানে ৫০ জন শিক্ষার্থী পর্যন্ত। স্ট্যান্ডার্ড ও প্রো প্ল্যানে সীমাহীন শিক্ষার্থী ও শিক্ষক যোগ করা সম্ভব।',
  },
];

function FAQItem({ item, index, inView }: { item: (typeof FAQ_ITEMS)[0]; index: number; inView: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="border border-gray-200 rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-[#0D1B2A] text-sm pr-4">{item.q}</span>
        <ChevronDown
          className={`w-5 h-5 text-[#E8471D] shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 pt-3 text-sm text-gray-600 leading-relaxed bg-gray-50 border-t border-gray-100">
              {item.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CTABanner() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <>
      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-[#F8FAFC] font-bengali">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-12" ref={ref}>
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="lg:w-80 shrink-0"
            >
              <span className="text-sm font-semibold text-[#E8471D] uppercase tracking-wider">
                সাধারণত জিজ্ঞাসিত প্রশ্ন
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-[#0D1B2A] leading-tight">
                আমার স্কুল সম্পর্কে
                <br />
                <span className="text-[#E8471D]">বহুল জিজ্ঞাসিত প্রশ্ন</span>
              </h2>
              <p className="mt-4 text-sm text-gray-500 leading-relaxed">
                আমার স্কুল সম্পর্কে স্কুল ম্যানেজমেন্ট ও শিক্ষকদের সাধারণত যেসব প্রশ্ন থাকে
                তার উত্তর নিচে দেওয়া আছে।
              </p>
              <ul className="mt-5 space-y-2 text-sm text-gray-600">
                {['অনলাইন ভর্তি ও তথ্যপত্র', 'স্বয়ংক্রিয় ফলাফল প্রকাশ', 'শিক্ষক ও শিক্ষার্থীর উপস্থিতি', 'সকল ফি কালেকশন ও রিপোর্টিং'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E8471D] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/try-demo"
                className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#E8471D] text-white text-sm font-semibold rounded-full hover:bg-[#CC3D18] transition-all"
              >
                ডেমো দেখুন <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>

            {/* Right: accordion */}
            <div className="flex-1 space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <FAQItem key={item.q} item={item} index={i} inView={inView} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="contact" className="py-16 bg-[#E8471D] font-bengali">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              আমার স্কুল কি ব্যবহার করতে চাইছেন?
            </h2>
            <p className="text-orange-100 mb-8 text-lg">
              একটি পূর্ণাঙ্গ শিক্ষা প্রতিষ্ঠান পরিচালনা সফটওয়্যার — বিনামূল্যে শুরু করুন আজই।
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/try-demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#E8471D] font-bold rounded-full hover:bg-orange-50 transition-all shadow-lg hover:-translate-y-0.5"
              >
                ডেমো দেখুন <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#0D1B2A] text-white font-bold rounded-full hover:bg-[#1B3A5C] transition-all hover:-translate-y-0.5"
              >
                বিনামূল্যে শুরু করুন
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
