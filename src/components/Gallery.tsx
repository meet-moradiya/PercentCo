"use client";

import { useState } from "react";
import Image from "next/image";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const photos = [
  { src: "/images/gallery-bar.png", alt: "Our award-winning bar", span: "md:col-span-2 md:row-span-2" },
  { src: "/images/gallery-table.png", alt: "Intimate dining setting", span: "" },
  { src: "/images/gallery-kitchen.png", alt: "Behind the scenes", span: "" },
  { src: "/images/gallery-wine.png", alt: "The wine cellar", span: "md:col-span-2" },
  { src: "/images/gallery-patio.png", alt: "Terrace dining", span: "" },
  { src: "/images/gallery-plating.png", alt: "Artful plating", span: "" },
];

export default function Gallery() {
  const sectionRef = useScrollReveal();
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <section
      id="gallery"
      ref={sectionRef}
      className="py-24 md:py-32 px-6 lg:px-8 bg-surface"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-gold text-sm tracking-[0.3em] uppercase">
            Visual Journey
          </span>
          <h2 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl mt-2 mb-4">
            The Gallery
          </h2>
          <div className="gold-divider max-w-xs mx-auto">
            <span className="text-gold text-lg">✦</span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {photos.map((photo, i) => (
            <div
              key={photo.src}
              className={`relative overflow-hidden cursor-pointer group ${photo.span}`}
              onClick={() => setLightbox(i)}
            >
              <div className="relative aspect-square w-full h-full min-h-[200px]">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-background/0 group-hover:bg-background/50 transition-all duration-500 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-500 text-center">
                    <svg
                      className="w-8 h-8 text-gold mx-auto mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                      />
                    </svg>
                    <span className="text-sm tracking-widest uppercase text-foreground/80">
                      {photo.alt}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-6 right-6 text-foreground/60 hover:text-foreground transition-colors"
            onClick={() => setLightbox(null)}
            aria-label="Close lightbox"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-w-4xl max-h-[80vh] w-full aspect-square">
            <Image
              src={photos[lightbox].src}
              alt={photos[lightbox].alt}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>
          {/* Nav arrows */}
          <button
            className="absolute left-4 md:left-8 text-foreground/40 hover:text-gold transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((lightbox - 1 + photos.length) % photos.length);
            }}
            aria-label="Previous image"
          >
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="absolute right-4 md:right-8 text-foreground/40 hover:text-gold transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox((lightbox + 1) % photos.length);
            }}
            aria-label="Next image"
          >
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
