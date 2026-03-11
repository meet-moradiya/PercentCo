"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const navLinks = [
  { label: "About", href: "#about" },
  { label: "Menu", href: "#menu" },
  { label: "Order", href: "/order" },
  { label: "Gallery", href: "#gallery" },
  { label: "Reviews", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = (): void => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const linkColor = scrolled ? "text-foreground/70 hover:text-gold" : "text-white/80 hover:text-gold";

  const hamburgerColor = scrolled ? "bg-foreground" : "bg-white";

  return (
    <>
      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-90 lg:hidden bg-background flex flex-col items-center justify-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-2xl tracking-widest uppercase text-foreground hover:text-gold transition-colors duration-300"
            >
              {link.label}
            </a>
          ))}

          <ThemeToggle />

          <a
            href="#reservation"
            onClick={() => setMobileOpen(false)}
            className="px-8 py-3 border border-gold text-gold tracking-widest uppercase hover:bg-gold hover:text-background transition-all duration-300"
          >
            Reserve a Table
          </a>
        </div>
      )}

      {/* Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-100 transition-all duration-500 ${
          scrolled ? "bg-background/80 backdrop-blur-xl shadow-lg shadow-black/20" : "bg-transparent"
        }`}
      >
        <nav className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="hover:opacity-80 transition-opacity duration-300">
            <Logo size={52} forceGold={!scrolled} />
          </Link>

          {/* Desktop Nav */}
          <ul className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={`text-sm tracking-widest uppercase transition-colors duration-300 relative group ${linkColor}`}>
                  {link.label}
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-gold transition-all duration-300 group-hover:w-full" />
                </a>
              </li>
            ))}
          </ul>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-4">
            <ThemeToggle scrolled={scrolled} />
            <a
              href="#reservation"
              className="inline-flex items-center gap-2 px-6 py-2.5 border border-gold text-gold text-sm tracking-widest uppercase hover:bg-gold hover:text-background transition-all duration-300"
            >
              Reserve
            </a>
          </div>

          {/* Hamburger */}
          <div className="lg:hidden w-7 h-4 flex flex-col justify-between items-center cursor-pointer" onClick={() => setMobileOpen(!mobileOpen)}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-full h-[2px] rounded-full ${hamburgerColor} transition-all duration-300 ${
                  mobileOpen ? (i === 0 ? "rotate-45 translate-y-1" : i === 1 ? "opacity-0" : "-rotate-45 -translate-y-2.5") : ""
                }`}
              />
            ))}
          </div>
        </nav>
      </header>
    </>
  );
}
