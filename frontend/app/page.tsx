import type { Metadata } from 'next';
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import TrustBar from '@/components/landing/TrustBar';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import Pricing from '@/components/landing/Pricing';
import Stats from '@/components/landing/Stats';
import Testimonials from '@/components/landing/Testimonials';
import CTABanner from '@/components/landing/CTABanner';
import Footer from '@/components/landing/Footer';

export const metadata: Metadata = {
  title: 'Amar School — Modern School Management ERP',
  description:
    'The all-in-one SaaS platform for schools. Manage students, collect fees, track attendance, monitor finances, and generate reports from a single powerful dashboard.',
};

export default function LandingPage() {
  return (
    <main className="bg-zinc-950 text-zinc-100 overflow-x-hidden">
      <Navbar />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <Pricing />
      <Stats />
      <Testimonials />
      <CTABanner />
      <Footer />
    </main>
  );
}
