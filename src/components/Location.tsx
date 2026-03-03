"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useTheme } from "@/context/ThemeProvider";

export default function Location() {
  const sectionRef = useScrollReveal();
  const { theme } = useTheme();

  return (
    <section
      id="contact"
      ref={sectionRef}
      className="py-24 md:py-32 px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-gold text-sm tracking-[0.3em] uppercase">
            Find Us
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl mt-2 mb-4">
            Location & Contact
          </h2>
          <div className="gold-divider max-w-xs mx-auto">
            <span className="text-gold text-lg">✦</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Map */}
          <div className="relative aspect-[4/3] md:aspect-auto bg-surface border border-surface-border overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3023.9981601898!2d-73.98823442!3d40.74843998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259a9b30eac9f%3A0xaca05ca48ab5ac2c!2sMadison%20Square%20Park!5e0!3m2!1sen!2sus!4v1708000000000!5m2!1sen!2sus"
              width="100%"
              height="100%"
              style={{ border: 0, filter: theme === "dark" ? "invert(90%) hue-rotate(180deg) brightness(0.8) contrast(1.2)" : "none" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Percentco location"
              className="absolute inset-0 w-full h-full"
            />
          </div>

          {/* Contact Info */}
          <div className="space-y-8">
            {/* Address */}
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 border border-gold/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg mb-1">Address</h3>
                <p className="text-foreground/50 leading-relaxed">
                  238 Madison Avenue<br />
                  New York, NY 10016<br />
                  United States
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 border border-gold/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg mb-1">Phone</h3>
                <a href="tel:+12125550188" className="text-foreground/50 hover:text-gold transition-colors duration-300">
                  +1 (212) 555-0188
                </a>
              </div>
            </div>

            {/* Email */}
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 border border-gold/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg mb-1">Email</h3>
                <a href="mailto:reservations@percentco.com" className="text-foreground/50 hover:text-gold transition-colors duration-300">
                  reservations@percentco.com
                </a>
              </div>
            </div>

            {/* Hours */}
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 border border-gold/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-lg mb-1">Hours</h3>
                <div className="text-foreground/50 space-y-1">
                  <p>Monday — Thursday: 5:30 PM – 10:30 PM</p>
                  <p>Friday — Saturday: 5:00 PM – 11:30 PM</p>
                  <p>Sunday: 5:00 PM – 10:00 PM</p>
                </div>
              </div>
            </div>

            {/* Valet */}
            <div className="p-6 border border-gold/20 bg-gold/5">
              <p className="text-sm text-foreground/60">
                <span className="text-gold font-semibold">Valet Parking</span>{" "}
                — Complimentary valet parking is available for all dinner
                reservations. Simply pull up to our main entrance on Madison
                Avenue.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
