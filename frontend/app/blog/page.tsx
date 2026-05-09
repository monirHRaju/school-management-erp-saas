import type { Metadata } from 'next';
import Link from 'next/link';
import { GraduationCap, ArrowLeft, Calendar, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'ব্লগ — আমার স্কুল',
  description: 'আমার স্কুল সফটওয়্যারের ব্লগ — শিক্ষা ব্যবস্থাপনা, টিউটোরিয়াল ও আপডেট।',
};

const POSTS = [
  {
    slug: 'digital-school-management',
    title: 'কেন ডিজিটাল স্কুল ম্যানেজমেন্ট সফটওয়্যার প্রয়োজন?',
    excerpt: 'ঐতিহ্যগত কাগজ-ভিত্তিক পদ্ধতি থেকে ডিজিটাল সিস্টেমে রূপান্তর কীভাবে শিক্ষা প্রতিষ্ঠানের কার্যক্ষমতা বাড়ায়।',
    date: '০৫ মে ২০২৬',
    readTime: '৫ মিনিট',
    tag: 'শিক্ষা প্রযুক্তি',
  },
  {
    slug: 'fee-management-guide',
    title: 'সহজে ফি সংগ্রহ ও রিপোর্ট ব্যবস্থাপনা — সম্পূর্ণ গাইড',
    excerpt: 'আমার স্কুল ব্যবহার করে কীভাবে মাত্র ১০ সেকেন্ডে ফি পেমেন্ট গ্রহণ ও রসিদ তৈরি করবেন।',
    date: '০১ মে ২০২৬',
    readTime: '৭ মিনিট',
    tag: 'ফি ম্যানেজমেন্ট',
  },
  {
    slug: 'attendance-automation',
    title: 'অনলাইন হাজিরা সিস্টেম — শিক্ষার্থী উপস্থিতি অটোমেশন',
    excerpt: 'ডিজিটাল হাজিরা গ্রহণ পদ্ধতি ব্যবহার করে সময় বাঁচান এবং মাসিক রিপোর্ট স্বয়ংক্রিয়ভাবে তৈরি করুন।',
    date: '২৫ এপ্রিল ২০২৬',
    readTime: '৪ মিনিট',
    tag: 'হাজিরা',
  },
  {
    slug: 'admit-card-generation',
    title: 'মাত্র ৩০ সেকেন্ডে ছবিসহ প্রবেশপত্র তৈরি করুন',
    excerpt: 'পরীক্ষার আগে শত শত প্রবেশপত্র তৈরিতে ঘণ্টার পর ঘণ্টা নষ্ট না করে এক ক্লিকে সব শিক্ষার্থীর অ্যাডমিট কার্ড জেনারেট করুন।',
    date: '১৮ এপ্রিল ২০২৬',
    readTime: '৩ মিনিট',
    tag: 'পরীক্ষা',
  },
  {
    slug: 'sms-notification-guide',
    title: 'SMS বিজ্ঞপ্তি সিস্টেম — অভিভাবকদের সাথে সংযুক্ত থাকুন',
    excerpt: 'ফি বকেয়া, হাজিরা অনুপস্থিতি ও গুরুত্বপূর্ণ নোটিশ অভিভাবকদের কাছে স্বয়ংক্রিয়ভাবে পাঠান।',
    date: '১০ এপ্রিল ২০২৬',
    readTime: '৬ মিনিট',
    tag: 'SMS সিস্টেম',
  },
  {
    slug: 'school-erp-benefits',
    title: 'স্কুল ERP সফটওয়্যারের ১০টি প্রধান সুবিধা',
    excerpt: 'একটি আধুনিক স্কুল ERP সিস্টেম কীভাবে প্রশাসনিক কাজ, শিক্ষক ব্যবস্থাপনা ও অভিভাবক যোগাযোগকে সহজ করে তোলে।',
    date: '০২ এপ্রিল ২০২৬',
    readTime: '৮ মিনিট',
    tag: 'ERP',
  },
];

const TAG_COLORS: Record<string, string> = {
  'শিক্ষা প্রযুক্তি': 'bg-blue-50 text-blue-700',
  'ফি ম্যানেজমেন্ট': 'bg-green-50 text-green-700',
  'হাজিরা': 'bg-purple-50 text-purple-700',
  'পরীক্ষা': 'bg-orange-50 text-[#E8471D]',
  'SMS সিস্টেম': 'bg-yellow-50 text-yellow-700',
  'ERP': 'bg-red-50 text-red-700',
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] font-bengali">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E8471D] flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-[#0D1B2A]">
              আমার <span className="text-[#E8471D]">স্কুল</span>
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#E8471D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            হোমে ফিরুন
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-[#0D1B2A] py-14 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-sm font-semibold text-[#E8471D] uppercase tracking-wider">আমাদের ব্লগ</span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold text-white">
            শিক্ষা প্রযুক্তি ও{' '}
            <span className="text-[#E8471D]">স্কুল ব্যবস্থাপনা</span>
          </h1>
          <p className="mt-4 text-gray-400 text-sm">
            আমার স্কুল সফটওয়্যারের টিউটোরিয়াল, টিপস ও শিক্ষা প্রযুক্তির আপডেট।
          </p>
        </div>
      </div>

      {/* Posts grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {POSTS.map((post) => (
            <article
              key={post.slug}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 overflow-hidden group"
            >
              {/* Color banner */}
              <div className="h-2 bg-[#E8471D]" />

              <div className="p-6">
                <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3 ${TAG_COLORS[post.tag] ?? 'bg-gray-100 text-gray-600'}`}>
                  {post.tag}
                </span>

                <h2 className="text-base font-bold text-[#0D1B2A] mb-2 leading-snug group-hover:text-[#E8471D] transition-colors">
                  {post.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">{post.excerpt}</p>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {post.readTime}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <p className="text-gray-500 mb-4">আমার স্কুল ব্যবহার করে আপনার প্রতিষ্ঠান ডিজিটাল করুন</p>
          <Link
            href="/try-demo"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#E8471D] text-white font-bold rounded-full hover:bg-[#CC3D18] transition-all shadow-lg hover:-translate-y-0.5"
          >
            ডেমো দেখুন →
          </Link>
        </div>
      </div>
    </div>
  );
}
