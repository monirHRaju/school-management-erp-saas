'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Users, TurkishLira, CalendarCheck, BarChart3,
  BookOpen, Bell, CheckCircle2, ChevronRight,
} from 'lucide-react';

const TABS = ['স্কুল', 'কলেজ', 'মাদ্রাসা', 'কিন্ডারগার্টেন', 'অন্যান্য'];

type Feature = { icon: React.ElementType; title: string; desc: string };

const FEATURES: Record<string, Feature[]> = {
  স্কুল: [
    { icon: Users, title: 'শিক্ষার্থী ব্যবস্থাপনা', desc: 'শিক্ষার্থীর পূর্ণ প্রোফাইল, ভর্তি, স্থানান্তর ও ডেটা পরিচালনা।' },
    { icon: TurkishLira, title: 'ফি সংগ্রহ', desc: 'মাসিক বেতন, বিশেষ ফি সংগ্রহ ও রসিদ তৈরি এক জায়গায়।' },
    { icon: CalendarCheck, title: 'অনলাইন হাজিরা', desc: 'ক্লাসভিত্তিক দৈনিক হাজিরা ও মাসিক রিপোর্ট জেনারেট করুন।' },
    { icon: BarChart3, title: 'আয়-ব্যয় ট্র্যাকিং', desc: 'আয় ও ব্যয়ের পূর্ণ হিসাব, ক্যাটাগরিভিত্তিক রিপোর্ট।' },
    { icon: BookOpen, title: 'পরীক্ষা ও ফলাফল', desc: 'পরীক্ষার রুটিন, মার্কশিট ও রেজাল্ট পাবলিশিং।' },
    { icon: Bell, title: 'SMS বিজ্ঞপ্তি', desc: 'ফি বকেয়া ও হাজিরা অনুপস্থিতিতে অভিভাবককে SMS।' },
  ],
  কলেজ: [
    { icon: Users, title: 'ছাত্রছাত্রী পরিচালনা', desc: 'উচ্চ মাধ্যমিকের শিক্ষার্থী ভর্তি ও বিভাগ ব্যবস্থাপনা।' },
    { icon: TurkishLira, title: 'টিউশন ফি', desc: 'বিভাগ ও বর্ষভিত্তিক ফি কাঠামো ও সংগ্রহ।' },
    { icon: CalendarCheck, title: 'উপস্থিতি নিয়ন্ত্রণ', desc: 'বিষয় ও শিক্ষকভিত্তিক হাজিরা ট্র্যাকিং।' },
    { icon: BarChart3, title: 'ফিনান্সিয়াল রিপোর্ট', desc: 'আয়-ব্যয়ের বিস্তারিত রিপোর্ট ও এক্সপোর্ট।' },
    { icon: BookOpen, title: 'পরীক্ষা ব্যবস্থাপনা', desc: 'অর্ধ-বার্ষিক ও বার্ষিক পরীক্ষার সম্পূর্ণ পরিচালনা।' },
    { icon: Bell, title: 'নোটিশ সিস্টেম', desc: 'সকল শিক্ষার্থী ও অভিভাবককে ডিজিটাল নোটিশ।' },
  ],
  মাদ্রাসা: [
    { icon: Users, title: 'তালিবে ইলম তালিকা', desc: 'মাদ্রাসার শিক্ষার্থীদের পূর্ণ তথ্য ও শ্রেণী ব্যবস্থাপনা।' },
    { icon: TurkishLira, title: 'মাসিক বেতন', desc: 'বোর্ডিং ও ডে-স্টুডেন্টদের আলাদা ফি ব্যবস্থাপনা।' },
    { icon: CalendarCheck, title: 'হাজিরা খাতা', desc: 'ডিজিটাল হাজিরা ও মাসিক উপস্থিতি রিপোর্ট।' },
    { icon: BarChart3, title: 'হিসাব-নিকাশ', desc: 'মাদ্রাসার সমস্ত আয়-ব্যয়ের স্বচ্ছ হিসাব।' },
    { icon: BookOpen, title: 'পরীক্ষার ফলাফল', desc: 'ইসলামিক বিষয়সহ সকল পরীক্ষার ফলাফল প্রকাশ।' },
    { icon: Bell, title: 'অভিভাবক সংযোগ', desc: 'সন্তানের অগ্রগতি নিয়ে অভিভাবককে নিয়মিত আপডেট।' },
  ],
  কিন্ডারগার্টেন: [
    { icon: Users, title: 'শিশু ভর্তি', desc: 'শিশুর সম্পূর্ণ তথ্য ও অভিভাবকের যোগাযোগ ব্যবস্থাপনা।' },
    { icon: TurkishLira, title: 'মাসিক ফি', desc: 'সহজ ফি সংগ্রহ ও রসিদ ব্যবস্থাপনা।' },
    { icon: CalendarCheck, title: 'উপস্থিতি', desc: 'ডিজিটাল হাজিরা ও অভিভাবককে বার্তা।' },
    { icon: BarChart3, title: 'আয়ের রিপোর্ট', desc: 'মাসিক আয়-ব্যয়ের সরল রিপোর্ট।' },
    { icon: BookOpen, title: 'অগ্রগতি রিপোর্ট', desc: 'শিশুর বিকাশ ও শিক্ষার অগ্রগতির রিপোর্ট।' },
    { icon: Bell, title: 'অভিভাবক পোর্টাল', desc: 'অভিভাবক অ্যাপে সন্তানের সব তথ্য দেখুন।' },
  ],
  অন্যান্য: [
    { icon: Users, title: 'যেকোনো প্রতিষ্ঠান', desc: 'কোচিং সেন্টার, ট্রেনিং ইন্সটিটিউট সহ যেকোনো শিক্ষা প্রতিষ্ঠান।' },
    { icon: TurkishLira, title: 'কাস্টম ফি', desc: 'আপনার প্রতিষ্ঠানের জন্য কাস্টমাইজড ফি কাঠামো।' },
    { icon: CalendarCheck, title: 'শিডিউল ম্যানেজমেন্ট', desc: 'ক্লাস রুটিন ও সিডিউল পরিচালনা।' },
    { icon: BarChart3, title: 'ফিনান্স ট্র্যাকিং', desc: 'যেকোনো ধরনের আয়-ব্যয় ট্র্যাকিং।' },
    { icon: BookOpen, title: 'কোর্স ব্যবস্থাপনা', desc: 'বিভিন্ন কোর্স ও ব্যাচ পরিচালনা।' },
    { icon: Bell, title: 'যোগাযোগ সিস্টেম', desc: 'শিক্ষার্থী ও অভিভাবকের সাথে সহজ যোগাযোগ।' },
  ],
};

const HIGHLIGHTS = [
  'অনলাইন ভর্তি ফর্ম',
  'ছবিসহ প্রবেশপত্র',
  'ক্লাসভিত্তিক হাজিরা',
  'শিক্ষার্থী আইডি কার্ড',
  'ফি কালেকশন ও রিপোর্ট',
  'পিডিএফ রিপোর্ট এক্সপোর্ট',
  'SMS বিজ্ঞপ্তি',
  'অভিভাবক পোর্টাল',
];

export default function Features() {
  const [activeTab, setActiveTab] = useState('স্কুল');
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const features = FEATURES[activeTab] ?? FEATURES['স্কুল'];

  return (
    <section id="features" className="py-20 bg-white font-bengali">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="text-sm font-semibold text-[#E8471D] tracking-wider uppercase">
            আমার স্কুলের সুবিধাসমূহ
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#0D1B2A]">
            যে সকল প্রতিষ্ঠানের জন্য{' '}
            <span className="text-[#E8471D]">আমার স্কুল</span> প্রযোজ্য
          </h2>
        </motion.div>

        {/* Tab buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-[#E8471D] text-white shadow-md scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-[#E8471D] hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Left: dark card */}
          <div className="lg:col-span-2 bg-[#0D1B2A] rounded-2xl p-8">
            <span className="text-xs font-semibold text-[#E8471D] uppercase tracking-wider">
              🔥 মূল সুবিধাসমূহ
            </span>
            <h3 className="mt-2 text-xl sm:text-2xl font-bold text-white mb-2">
              আধুনিক{' '}
              <span className="text-[#E8471D]">{activeTab} সফটওয়্যার</span>
            </h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              শিক্ষার্থী, শিক্ষক ও অভিভাবকদের মধ্যে সহজ সংযোগ স্থাপন করে,
              আমার স্কুল {activeTab} পরিচালনাকে সহজ ও ডিজিটাল করে তোলে।
            </p>

            <div className="space-y-2">
              {HIGHLIGHTS.map((h) => (
                <div key={h} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#E8471D]/20 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#E8471D]" />
                  </div>
                  <span className="text-sm text-gray-300">{h}</span>
                </div>
              ))}
            </div>

            <a
              href="#why"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#E8471D] hover:gap-3 transition-all"
            >
              আরো জানুন <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Right: feature cards with inverse hover */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {features.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <motion.div
                      key={f.title}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="group bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:bg-[#E8471D] hover:border-[#E8471D] hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-default"
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-50 group-hover:bg-white/20 flex items-center justify-center mb-3 transition-colors duration-200">
                        <Icon className="w-5 h-5 text-[#E8471D] group-hover:text-white transition-colors duration-200" />
                      </div>
                      <h4 className="font-semibold text-[#0D1B2A] group-hover:text-white mb-1 transition-colors duration-200">{f.title}</h4>
                      <p className="text-sm text-gray-500 group-hover:text-white/80 leading-relaxed transition-colors duration-200">{f.desc}</p>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
