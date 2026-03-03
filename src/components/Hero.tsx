"use client";

import Image from "next/image";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero.png"
          alt="Luxury dining interior"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        {/* 
          Overlays are always dark regardless of theme — this keeps the hero
          cinematic and ensures white/gold text stays readable on both modes.
        */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,10,0.72), rgba(10,10,10,0.35) 50%, rgba(10,10,10,0.92))",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(10,10,10,0.55), transparent 30%, transparent 70%, rgba(10,10,10,0.55))",
          }}
        />
      </div>

      {/* Content — forced light text so it's always readable on the dark overlay */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Decorative element */}
        <div
          className="flex items-center justify-center gap-4 mb-8 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          <span className="w-12 h-px bg-gold" />
          <span className="text-gold text-sm tracking-[0.4em] uppercase font-body">
            Est. 2018
          </span>
          <span className="w-12 h-px bg-gold" />
        </div>

        <h1
          className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[1.1] mb-6 animate-fade-in-up text-white"
          style={{ animationDelay: "0.4s" }}
        >
          An Experience
          <br />
          <span className="text-shimmer">Beyond Taste</span>
        </h1>

        <p
          className="text-white/60 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
          style={{ animationDelay: "0.6s" }}
        >
          Where culinary artistry meets intimate elegance. Every dish tells a
          story, every moment becomes a memory.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up"
          style={{ animationDelay: "0.8s" }}
        >
          <a
            href="#reservation"
            className="group relative px-10 py-4 bg-gold text-[#0a0a0a] text-sm tracking-widest uppercase font-semibold overflow-hidden transition-all duration-500 hover:shadow-lg hover:shadow-gold/20"
          >
            <span className="relative z-10">Reserve a Table</span>
            <span className="absolute inset-0 bg-gold-light scale-x-0 origin-left transition-transform duration-500 group-hover:scale-x-100" />
          </a>
          <a
            href="#menu"
            className="group px-10 py-4 border border-white/30 text-white text-sm tracking-widest uppercase hover:border-gold hover:text-gold transition-all duration-500"
          >
            View Menu
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
        <div className="w-6 h-10 border border-white/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-gold rounded-full animate-bounce" />
        </div>
      </div>
    </section>
  );
}
