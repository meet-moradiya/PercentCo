"use client";

import Image from "next/image";
import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function About() {
  const sectionRef = useScrollReveal();

  return (
    <section id="about" ref={sectionRef} className="py-24 md:py-32 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Image Side */}
        <div className="relative group">
          <div className="relative aspect-4/5 overflow-hidden">
            <Image
              src="/images/about.png"
              alt="Restaurant interior"
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
          {/* Decorative frame */}
          <div className="absolute -bottom-4 -right-4 w-full h-full border border-gold/30 -z-10" />
          {/* Experience badge */}
          <div className="absolute -bottom-6 -left-6 bg-gold text-background p-6 flex flex-col items-center justify-center">
            <span className="font-(family-name:--font-display) text-3xl font-bold">8+</span>
            <span className="text-xs tracking-widest uppercase">Years</span>
          </div>
        </div>

        {/* Text Side */}
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="text-gold text-sm tracking-[0.3em] uppercase">Our Story</span>
            <h2 className="font-(family-name:--font-display) text-4xl md:text-5xl leading-tight">
              Where Passion
              <br />
              Meets the Plate
            </h2>
          </div>

          <div className="w-16 h-px bg-gold" />

          <p className="text-foreground/60 leading-relaxed text-lg">
            Born from a love of culinary excellence, Percentco was founded in 2018 with a singular vision — to create dining experiences that linger
            long after the last course. Our chefs combine classical technique with modern imagination, sourcing only the finest seasonal ingredients.
          </p>

          <p className="text-foreground/60 leading-relaxed">
            Every detail, from the hand-selected wine pairings to the ambient glow of our candlelit tables, has been carefully curated to make each
            visit unforgettable. We believe that dining is not merely eating — it is an art form.
          </p>

          {/* Quote */}
          <blockquote className="border-l-2 border-gold pl-6 py-2">
            <p className="font-(family-name:--font-display) text-xl italic text-gold-light">
              &quot;Cooking is an act of love, a gift, a way of sharing a moment of happiness.&quot;
            </p>
            <cite className="text-sm text-foreground/50 not-italic mt-2 block">— Chef Marcus Caldwell, Founder</cite>
          </blockquote>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 pt-4">
            {[
              { value: "200+", label: "Dishes Crafted" },
              { value: "50+", label: "Wine Varieties" },
              { value: "15K+", label: "Happy Guests" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-(family-name:--font-display) text-2xl md:text-3xl text-gold">{stat.value}</div>
                <div className="text-xs tracking-widest uppercase text-foreground/50 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
