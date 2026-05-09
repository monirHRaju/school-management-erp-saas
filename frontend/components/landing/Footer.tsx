import Link from 'next/link';
import { GraduationCap, MapPin, Mail, Phone, Facebook, Youtube, Twitter, Linkedin } from 'lucide-react';

const FEATURES_LINKS = [
  { label: 'অনলাইন ভর্তি', href: '#features' },
  { label: 'ফি কালেকশন ও রিপোর্ট', href: '#features' },
  { label: 'শিক্ষার্থী ও শিক্ষক তালিকা', href: '#features' },
  { label: 'ID ও অ্যাডমিট কার্ড', href: '#features' },
  { label: 'SMS ও ইমেইল নোটিশ', href: '#features' },
];

const QUICK_LINKS = [
  { label: 'হোম', href: '#home' },
  { label: 'কাদের জন্য', href: '#features' },
  { label: 'কেন আমার স্কুল', href: '#why' },
  { label: 'রিপোর্টসমূহ', href: '#reports' },
  { label: 'ব্লগ', href: '/blog' },
  { label: 'ডেমো দেখুন', href: '/try-demo' },
];

const SOCIAL = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Youtube, href: '#', label: 'YouTube' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Linkedin, href: '#', label: 'LinkedIn' },
];

export default function Footer() {
  return (
    <footer className="bg-[#0D1B2A] text-gray-400 font-bengali">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#E8471D] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                আমার <span className="text-[#E8471D]">স্কুল</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed mb-5">
              আমার স্কুল হলো একটি আধুনিক শিক্ষা প্রতিষ্ঠান ব্যবস্থাপনা সফটওয়্যার, যা স্কুল, কলেজ
              এবং মাদ্রাসার কার্যক্রম ডিজিটাল করে তোলে।
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#E8471D] mt-0.5 shrink-0" />
                <span>উত্তর দত্তপাড়া, টেকবাড়ি, এরশাদনগর-১৭১২, টঙ্গী পূর্ব, গাজীপুর, বাংলাদেশ</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#E8471D] shrink-0" />
                <a href="mailto:monirhraju@gmail.com" className="hover:text-white transition-colors">
                  monirhraju@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#E8471D] shrink-0" />
                <a href="tel:+8801712378140" className="hover:text-white transition-colors">
                  +880 1712 378 140
                </a>
              </div>
            </div>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-white font-bold mb-4">ফিচারস</h4>
            <ul className="space-y-2">
              {FEATURES_LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    className="text-sm hover:text-[#E8471D] transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-4">দ্রুত লিংক</h4>
            <ul className="space-y-2">
              {QUICK_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm hover:text-[#E8471D] transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social + Stats */}
          <div>
            <h4 className="text-white font-bold mb-4">ফলো করুন</h4>
            <div className="flex gap-3 mb-6">
              {SOCIAL.map((s) => {
                const Icon = s.icon;
                return (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#E8471D] transition-colors duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs font-semibold text-white mb-3">ভিজিটর পরিসংখ্যান</p>
              <div className="grid grid-cols-2 gap-3 text-center">
                {[
                  { label: 'আজকের', value: '১২' },
                  { label: 'মাসের', value: '৫৭১' },
                  { label: 'সাপ্তাহিক', value: '৯২' },
                  { label: 'সর্বমোট', value: '১,৪২১' },
                ].map((v) => (
                  <div key={v.label}>
                    <p className="text-xs text-gray-500">{v.label}</p>
                    <p className="text-sm font-bold text-white">{v.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>© ২০২৬ আমার স্কুল। সর্বস্বত্ব সংরক্ষিত।</p>
          <p>
            Developed by{' '}
            <a href="https://monir-h-raju.web.app/" target="_blank"  className="text-[#E8471D] hover:underline">
              Monir Hossain Raju
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
