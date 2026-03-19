"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeProvider";

export default function WaiterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [orderMode, setOrderMode] = useState<string>("both");

  const loadOrderMode = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setOrderMode(data.settings?.orderMode || "both");
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (pathname !== "/waiter/login") {
      loadOrderMode();
    }
  }, [pathname, loadOrderMode]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/waiter/login");
  };

  // Don't show layout on login page
  if (pathname === "/waiter/login") {
    return <>{children}</>;
  }

  const showPlaceOrder = orderMode === "waiter" || orderMode === "both";
  const isOnOrderPage = pathname === "/waiter/order";

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-surface border-b border-surface-border">
        <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500/15 border border-blue-400/30 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-gold text-sm tracking-widest uppercase font-semibold" style={{ fontFamily: "'Playfair Display', serif" }}>
                PERCENTCO
              </h1>
              <p className="text-[10px] text-blue-400 tracking-wider uppercase">Service Display</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 text-muted hover:text-foreground transition-colors"
              title={theme === "dark" ? "Light Mode" : "Dark Mode"}
            >
              {theme === "dark" ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Place Order / View Orders — only when mode allows */}
            {showPlaceOrder && (
              <Link
                href={isOnOrderPage ? "/waiter" : "/waiter/order"}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs border tracking-wider uppercase transition-colors ${
                  isOnOrderPage
                    ? "border-blue-400 text-blue-400 bg-blue-500/10"
                    : "border-surface-border text-muted hover:text-foreground hover:border-foreground/30"
                }`}
              >
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="hidden xs:inline sm:inline">{isOnOrderPage ? "Orders" : "Place Order"}</span>
              </Link>
            )}

            {/* View Site */}
            <Link
              href="/"
              className="p-1.5 sm:p-2 text-muted hover:text-foreground transition-colors"
              title="View Site"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </Link>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors tracking-wider uppercase"
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
