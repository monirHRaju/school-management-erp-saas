import type { Metadata } from "next";
import { Geist, Geist_Mono, Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import { SuperAdminProvider } from "@/context/SuperAdminContext";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const hindSiliguri = Hind_Siliguri({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["bengali", "latin"],
  variable: "--font-hind-siliguri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "আমার স্কুল — আধুনিক স্কুল ম্যানেজমেন্ট সফটওয়্যার",
  description: "বাংলাদেশের শিক্ষা প্রতিষ্ঠান ব্যবস্থাপনার জন্য সেরা SaaS প্ল্যাটফর্ম। শিক্ষার্থী ভর্তি, ফি সংগ্রহ, হাজিরা, ফলাফল ও রিপোর্ট — একটি ড্যাশবোর্ডে।",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${hindSiliguri.variable} antialiased`}
      >
        <ThemeProvider>
          <SuperAdminProvider>
            <AuthProvider>
              {children}
              <Toaster position="top-right" />
            </AuthProvider>
          </SuperAdminProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
