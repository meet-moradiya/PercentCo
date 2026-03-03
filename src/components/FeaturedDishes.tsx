"use client";

import Image from "next/image";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const dishes = [
  {
    name: "Wagyu Ribeye",
    subtitle: "With bone marrow butter & red wine jus",
    image: "/images/dish-steak.png",
    price: "$85",
  },
  {
    name: "Pan-Seared Scallops",
    subtitle: "Hokkaido scallops & cauliflower purée",
    image: "/images/dish-seafood.png",
    price: "$48",
  },
  {
    name: "Chocolate Fondant",
    subtitle: "Valrhona dark chocolate & gold leaf",
    image: "/images/dish-dessert.png",
    price: "$18",
  },
];

export default function FeaturedDishes() {
  const sectionRef = useScrollReveal();

  return (
    <section ref={sectionRef} className="py-24 md:py-32 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-gold text-sm tracking-[0.3em] uppercase">
            Signature Creations
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl mt-2 mb-4">
            Featured Dishes
          </h2>
          <div className="gold-divider max-w-xs mx-auto">
            <span className="text-gold text-lg">✦</span>
          </div>
        </div>

        {/* Dishes Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {dishes.map((dish, i) => (
            <div
              key={dish.name}
              className="group relative overflow-hidden bg-surface cursor-pointer"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              {/* Image */}
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={dish.image}
                  alt={dish.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                {/* Price badge */}
                <div className="absolute top-4 right-4 bg-gold text-background px-3 py-1 text-sm font-semibold tracking-wider">
                  {dish.price}
                </div>

                {/* Content overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="font-[family-name:var(--font-display)] text-2xl mb-1">
                    {dish.name}
                  </h3>
                  <p className="text-foreground/60 text-sm">
                    {dish.subtitle}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-gold text-sm tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                    <span>View Details</span>
                    <svg
                      className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
