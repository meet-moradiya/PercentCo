"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Menu", href: "#menu" },
  { label: "Gallery", href: "#gallery" },
  { label: "Reviews", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /*
   * When the navbar is transparent (not scrolled), it sits over the dark hero,
   * so all text/icons must be white regardless of theme.
   * When scrolled, the navbar has a solid bg, so we use normal theme colors.
   */
  const linkColor = scrolled
    ? "text-foreground/70 hover:text-gold"
    : "text-white/80 hover:text-gold";

  const hamburgerColor = scrolled ? "bg-foreground" : "bg-white";

  return (
    <header
      id="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl shadow-lg shadow-black/20"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-20">
        {/* Logo */}
        <Link href="/" className="hover:opacity-80 transition-opacity duration-300">
          <Logo size={52} forceGold={!scrolled} />
        </Link>

        {/* Desktop Nav Links */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className={`text-sm tracking-widest uppercase transition-colors duration-300 relative group ${linkColor}`}
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold transition-all duration-300 group-hover:w-full" />
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA + Theme Toggle */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle scrolled={scrolled} />
          <a
            href="#reservation"
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-gold text-gold text-sm tracking-widest uppercase hover:bg-gold hover:text-background transition-all duration-300"
          >
            Reserve
          </a>
        </div>

        {/* Mobile Hamburger */}
        <button
          id="mobile-menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-1.5 w-8 h-8 items-center justify-center relative z-50"
          aria-label="Toggle menu"
        >
          <span
            className={`w-6 h-px transition-all duration-300 ${hamburgerColor} ${
              mobileOpen ? "rotate-45 translate-y-[4px]" : ""
            }`}
          />
          <span
            className={`w-6 h-px transition-all duration-300 ${hamburgerColor} ${
              mobileOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`w-6 h-px transition-all duration-300 ${hamburgerColor} ${
              mobileOpen ? "-rotate-45 -translate-y-[4px]" : ""
            }`}
          />
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-background/98 backdrop-blur-xl transition-all duration-500 flex flex-col items-center justify-center gap-8 ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {navLinks.map((link, i) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setMobileOpen(false)}
            className="text-2xl tracking-widest uppercase text-foreground/80 hover:text-gold transition-colors duration-300"
            style={{ transitionDelay: mobileOpen ? `${i * 80}ms` : "0ms" }}
          >
            {link.label}
          </a>
        ))}
        <div className="mt-2">
          <ThemeToggle />
        </div>
        <a
          href="#reservation"
          onClick={() => setMobileOpen(false)}
          className="mt-2 px-8 py-3 border border-gold text-gold tracking-widest uppercase hover:bg-gold hover:text-background transition-all duration-300"
        >
          Reserve a Table
        </a>
      </div>
    </header>
  );
}
