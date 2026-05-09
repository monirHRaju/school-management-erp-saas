'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Cloud, Wallet, MousePointerClick, ShieldCheck, Headphones, RefreshCw } from 'lucide-react';

const WHY = [
  { icon: Cloud, title: 'ক্লাউড সফটওয়্যার', desc: 'যেকোনো সময় যেকোনো জায়গা থেকে অ্যাক্সেস করুন এবং ডেটা নিরাপদ রাখুন।' },
  { icon: Wallet, title: 'সাশ্রয়ী মূল্যে', desc: 'সাশ্রয়ী সাবস্ক্রিপশন প্ল্যানে সার্বক্ষণিক ব্যবহারের সুবিধা।' },
  { icon: MousePointerClick, title: 'সহজে ব্যবহারযোগ্য', desc: 'কোনো আইটি দক্ষতা ছাড়াও সহজেই ব্যবহার করা যায় এই সফটওয়্যার।' },
  { icon: ShieldCheck, title: 'তথ্য নিরাপত্তা', desc: 'উচ্চ এনক্রিপশন ও নিরাপত্তা ব্যবস্থায় তথ্য সুরক্ষিত থাকে।' },
  { icon: Headphones, title: 'ট্রেনিং ও সাপোর্ট', desc: 'ডেডিকেটেড সাপোর্ট টিম এবং প্রয়োজন অনুযায়ী ট্রেনিং প্রদান।' },
  { icon: RefreshCw, title: 'লাইফটাইম আপডেট', desc: 'নিয়মিত আপডেট ও নতুন ফিচার সংযোজন সম্পূর্ণ বিনামূল্যে।' },
];

const DIVISIONS = [
  { name: 'ঢাকা বিভাগ', count: '৪৬+' },
  { name: 'চট্টগ্রাম বিভাগ', count: '৩৩+' },
  { name: 'রাজশাহী বিভাগ', count: '২৪+' },
  { name: 'খুলনা বিভাগ', count: '২০+' },
  { name: 'বরিশাল বিভাগ', count: '২+' },
  { name: 'সিলেট বিভাগ', count: '৩+' },
  { name: 'ময়মনসিংহ বিভাগ', count: '৩+' },
  { name: 'রংপুর বিভাগ', count: '৩+' },
];

export default function Stats() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const covRef = useRef(null);
  const covInView = useInView(covRef, { once: true, margin: '-60px' });

  return (
    <>
      {/* WHY CHOOSE section */}
      <section id="why" className="py-20 bg-[#F8FAFC] font-bengali">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <span className="text-sm font-semibold text-[#E8471D] uppercase tracking-wider">
              আধুনিক, সাশ্রয়ী ও নির্ভরযোগ্য
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#0D1B2A]">
              কেন আপনার প্রতিষ্ঠানের জন্য{' '}
              <span className="text-[#E8471D]">আমার স্কুল</span>
              <br />
              বেছে নেবেন?
            </h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto">
              শিক্ষা প্রতিষ্ঠানের পূর্ণ সমাধান — একটি সফটওয়্যারে সব সমস্যার সমাধান।
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY.map((w, i) => {
              const Icon = w.icon;
              return (
                <motion.div
                  key={w.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: i * 0.08 + 0.2 }}
                  className="group bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:bg-[#E8471D] hover:border-[#E8471D] hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:bg-white/20 transition-colors duration-200">
                      <Icon className="w-6 h-6 text-[#E8471D] group-hover:text-white transition-colors duration-200" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0D1B2A] group-hover:text-white mb-1 transition-colors duration-200">{w.title}</h3>
                      <p className="text-sm text-gray-500 group-hover:text-white/80 leading-relaxed transition-colors duration-200">{w.desc}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* COVERAGE section */}
      <section id="coverage" className="py-20 bg-orange-50 font-bengali">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            ref={covRef}
            initial={{ opacity: 0, y: 20 }}
            animate={covInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-4"
          >
            <span className="text-sm font-semibold text-[#E8471D] uppercase tracking-wider">
              ডেমোগ্রাফি
            </span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#0D1B2A]">
              আমার স্কুল-এর সেবা পৌঁছেছে সমগ্র বাংলাদেশের{' '}
              <span className="text-[#E8471D]">৮টি বিভাগে</span>
            </h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto text-sm">
              ৮ বিভাগে, ৬৪+ জেলা, ৬০০+ শিক্ষা প্রতিষ্ঠান, ৫০,০০০+ শিক্ষার্থী এবং ৩০০০+ শিক্ষক
              তাদের শিক্ষা প্রতিষ্ঠান পরিচালনায় আমার স্কুল ব্যবহার করছেন।
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10">
            {DIVISIONS.map((d, i) => (
              <motion.div
                key={d.name}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={covInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.4, delay: i * 0.06 + 0.2 }}
                className="group bg-white rounded-2xl p-5 text-center shadow-sm border border-orange-100 hover:bg-[#E8471D] hover:border-[#E8471D] hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              >
                <p className="text-sm text-gray-500 group-hover:text-white/80 mb-1 transition-colors duration-200">{d.name}</p>
                <p className="text-3xl font-bold text-[#E8471D] group-hover:text-white transition-colors duration-200">{d.count}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
