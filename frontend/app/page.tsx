import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import TrustBar from '@/components/landing/TrustBar';
import Stats from '@/components/landing/Stats';
import Pricing from '@/components/landing/Pricing';
import Testimonials from '@/components/landing/Testimonials';
import CTABanner from '@/components/landing/CTABanner';
import Footer from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: 'আমার স্কুল — আধুনিক স্কুল ম্যানেজমেন্ট সফটওয়্যার বাংলাদেশ',
  description:
    'বাংলাদেশের শিক্ষা প্রতিষ্ঠান ব্যবস্থাপনার জন্য সেরা SaaS প্ল্যাটফর্ম। শিক্ষার্থী ভর্তি, ফি সংগ্রহ, হাজিরা, ফলাফল ও রিপোর্ট — একটি ড্যাশবোর্ডে।',
};

export default function LandingPage() {
  return (
    <main className="bg-white text-gray-900 overflow-x-hidden font-bengali">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <TrustBar />
      <Stats />
      <Pricing />
      <Testimonials />
      <CTABanner />
      <Footer />
    </main>
  );
}
