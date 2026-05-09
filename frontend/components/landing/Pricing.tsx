'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { FileText } from 'lucide-react';

const REPORT_TABS = [
  'ভর্তির তথ্যপত্র',
  'ছবিসহ প্রবেশপত্র',
  'শ্রেণী শিক্ষার্থীর নথিপত্র',
  'অনুপস্থিত তালিকা',
  'বেতন তালিকা',
  'আগামী পরীক্ষাসমূহ',
  'ক্লাস রুটিন',
  'সিট প্ল্যান',
  'শিক্ষার্থী উপস্থিতি রিপোর্ট',
  'শিক্ষার্থী আইডি কার্ড',
  'শিক্ষার্থী তালিকা',
  'শিক্ষার্থী প্রোফাইল',
  'ট্যাবুলেশন শিট',
  'শিক্ষক আইডি কার্ড',
  'শিক্ষকদের মানসম্পন্ন উপস্থিতি',
  'শিক্ষক তালিকা',
  'শিক্ষক ট্র্যাকিং',
];

/* eslint-disable @next/next/no-img-element */
function ReportPreview({ tab }: { tab: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
      >
        {/* Fake browser bar */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="ml-3 text-xs text-gray-400">{tab} — রিপোর্ট প্রিভিউ</span>
        </div>

        <div className="p-4 bg-gray-50">
          <img
            src="https://i.ibb.co.com/1YHrDf31/Student-Information-Kamrun-Nahar.png"
            alt={`${tab} রিপোর্ট প্রিভিউ`}
            className="w-full rounded-lg shadow-md object-contain max-h-96"
            loading="lazy"
          />
        </div>

        <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">{tab}</span>
          <span className="text-xs bg-[#E8471D]/10 text-[#E8471D] font-semibold px-3 py-1 rounded-full">
            PDF ডাউনলোড সমর্থিত
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function Pricing() {
  const [activeTab, setActiveTab] = useState(REPORT_TABS[0]);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section id="reports" className="py-20 bg-[#0D1B2A] font-bengali">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <span className="text-sm font-semibold text-[#E8471D] uppercase tracking-wider">
            রিপোর্টসমূহ
          </span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
            আমার স্কুল-এর মাধ্যমে আপনি পাবেন{' '}
            <span className="text-[#E8471D]">১০০% নির্ভুল রিপোর্ট</span>
          </h2>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Tab list */}
          <div className="lg:w-64 shrink-0">
            <div className="flex flex-wrap lg:flex-col gap-2">
              {REPORT_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-all duration-150 ${
                    activeTab === tab
                      ? 'bg-[#E8471D] text-white shadow-md'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1">
            <ReportPreview tab={activeTab} />
          </div>
        </div>
      </div>
    </section>
  );
}
