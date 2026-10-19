"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { WifiOff, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

const ROOT_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/dashboard",
  "/guardian",
  "/super-admin/dashboard",
  "/super-admin/login",
]);

interface CapacitorAppPlugin {
  addListener?: (
    eventName: string,
    listenerFunc: (data: { canGoBack?: boolean }) => void
  ) => Promise<{ remove: () => void }> | { remove: () => void };
  minimizeApp?: () => Promise<void>;
  exitApp?: () => Promise<void>;
}

export function MobileRuntime() {
  const [isOffline, setIsOffline] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const lastBackPressRef = useRef<number>(0);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // 1. Online / Offline network detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initialize state from browser navigator
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    const handleOffline = () => {
      setIsOffline(true);
    };

    const handleOnline = () => {
      setIsOffline(false);
      toast.success("ইন্টারনেট সংযোগ ফিরে এসেছে (Back online)", {
        id: "network-restored",
        duration: 2500,
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // 2. Capacitor Android hardware back-button handling
  useEffect(() => {
    if (typeof window === "undefined") return;

    const cap = (
      window as unknown as {
        Capacitor?: {
          isNativePlatform?: () => boolean;
          Plugins?: { App?: CapacitorAppPlugin };
        };
      }
    ).Capacitor;

    const appPlugin = cap?.Plugins?.App;
    if (!appPlugin?.addListener) return;

    let listenerHandle: { remove: () => void } | null = null;
    let disposed = false;

    const setupResult = appPlugin.addListener("backButton", ({ canGoBack }) => {
      const currentPath = pathnameRef.current || window.location.pathname;
      const isRoot = ROOT_PATHS.has(currentPath);

      if (!isRoot && (canGoBack || window.history.length > 1)) {
        router.back();
        return;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        if (typeof appPlugin.minimizeApp === "function") {
          appPlugin.minimizeApp();
        } else if (typeof appPlugin.exitApp === "function") {
          appPlugin.exitApp();
        }
      } else {
        lastBackPressRef.current = now;
        toast("অ্যাপ থেকে বের হতে আবার ব্যাক চাপুন", {
          id: "exit-app-prompt",
          duration: 2000,
        });
      }
    });

    Promise.resolve(setupResult)
      .then((handle) => {
        if (disposed && handle?.remove) {
          handle.remove();
        } else {
          listenerHandle = handle;
        }
      })
      .catch(() => {});

    return () => {
      disposed = true;
      if (listenerHandle?.remove) {
        listenerHandle.remove();
      }
    };
  }, [router]);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-[9999] flex items-center justify-between gap-3 bg-amber-600 px-4 py-2.5 text-white shadow-lg"
    >
      <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>
          ইন্টারনেট সংযোগ নেই। আপনার নেটওয়ার্ক চেক করুন (No internet connection).
        </span>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white/20 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/30 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        <span>Retry</span>
      </button>
    </div>
  );
}
