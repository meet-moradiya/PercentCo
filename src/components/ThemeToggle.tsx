"use client";

import { useTheme } from "@/context/ThemeProvider";

export default function ThemeToggle({ scrolled = true }: { scrolled?: boolean }) {
  const { theme, toggleTheme } = useTheme();

  /*
   * When navbar is transparent (scrolled=false) over the dark hero,
   * force white border/icon regardless of theme. When scrolled, use theme colors.
   */
  const borderColor = scrolled
    ? "border-surface-border hover:border-gold"
    : "border-white/30 hover:border-gold";
  const iconColor = scrolled
    ? "text-foreground/60 hover:text-gold"
    : "text-white/70 hover:text-gold";

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      className={`relative w-10 h-10 flex items-center justify-center rounded-full border transition-all duration-300 ${borderColor} ${iconColor}`}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {/* Sun icon (shown in dark mode) */}
      <svg
        className={`w-[18px] h-[18px] absolute transition-all duration-500 ${
          theme === "dark"
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 rotate-90 scale-0"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>

      {/* Moon icon (shown in light mode) */}
      <svg
        className={`w-[18px] h-[18px] absolute transition-all duration-500 ${
          theme === "light"
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-0"
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        />
      </svg>
    </button>
  );
}
