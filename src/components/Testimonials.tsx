"use client";

import { useState, useEffect, useCallback } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const reviews = [
  {
    name: "Sophia Laurent",
    occasion: "Anniversary Dinner",
    rating: 5,
    text: "An absolutely magical evening. Every course was a masterpiece, and the ambiance felt like stepping into a dream. The wagyu was the best I've ever had — pure perfection on a plate.",
  },
  {
    name: "James Peterson",
    occasion: "Business Dinner",
    rating: 5,
    text: "Percentco set the bar impossibly high. From the moment we walked in, the attention to detail was extraordinary. The sommelier's wine pairings were impeccable.",
  },
  {
    name: "Emma & David Chen",
    occasion: "Engagement Celebration",
    rating: 5,
    text: "We celebrated our engagement here and it couldn't have been more perfect. The private corner table, the candlelight, and the tasting menu — every moment was unforgettable.",
  },
  {
    name: "Michael Richards",
    occasion: "Birthday Celebration",
    rating: 5,
    text: "The chocolate fondant alone is worth the visit, but the entire experience is what makes Percentco special. The staff made my birthday feel truly exceptional.",
  },
  {
    name: "Isabella Moretti",
    occasion: "Date Night",
    rating: 5,
    text: "There's a quiet confidence to everything at Percentco — the food speaks for itself, the service is gracious without being intrusive. This is dining at its finest.",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < rating ? "text-gold" : "text-surface-border"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials() {
  const sectionRef = useScrollReveal();
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % reviews.length);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(next, 3000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, next]);

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="py-24 md:py-32 px-6 lg:px-8"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-gold text-sm tracking-[0.3em] uppercase">
            What They Say
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl mt-2 mb-4">
            Guest Reviews
          </h2>
          <div className="gold-divider max-w-xs mx-auto">
            <span className="text-gold text-lg">✦</span>
          </div>
        </div>

        {/* Review Card */}
        <div
          className="relative"
          onMouseEnter={() => setIsAutoPlaying(false)}
          onMouseLeave={() => setIsAutoPlaying(true)}
        >
          <div className="text-center space-y-6 min-h-[260px] flex flex-col items-center justify-center">
            {/* Quote icon */}
            <svg
              className="w-10 h-10 text-gold/30"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609L9.978 5.151c-2.432.917-3.995 3.638-3.995 5.849H10v10H0z" />
            </svg>

            <StarRating rating={reviews[current].rating} />

            <p className="font-[family-name:var(--font-display)] text-xl md:text-2xl leading-relaxed text-foreground/80 italic max-w-3xl transition-opacity duration-500">
              &quot;{reviews[current].text}&quot;
            </p>

            <div className="space-y-1">
              <p className="text-gold font-semibold tracking-wide">
                {reviews[current].name}
              </p>
              <p className="text-foreground/40 text-sm tracking-widest uppercase">
                {reviews[current].occasion}
              </p>
            </div>
          </div>

          {/* Nav Dots */}
          <div className="flex justify-center gap-3 mt-10">
            {reviews.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`transition-all duration-300 ${
                  i === current
                    ? "w-8 h-2 bg-gold rounded-full"
                    : "w-2 h-2 bg-surface-border rounded-full hover:bg-gold/50"
                }`}
                aria-label={`Go to review ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
