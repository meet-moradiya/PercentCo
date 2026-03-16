"use client";

import { useState, useEffect } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useTheme } from "@/context/ThemeProvider";

type Category = "starters" | "mains" | "desserts" | "drinks";

interface MenuItem {
  _id?: string;
  name: string;
  description: string;
  price: string;
  tag?: string;
  image?: string;
  isJainAvailable?: boolean;
  category?: Category;
}

const categories: { key: Category; label: string }[] = [
  { key: "starters", label: "Starters" },
  { key: "mains", label: "Main Courses" },
  { key: "desserts", label: "Desserts" },
  { key: "drinks", label: "Cocktails" },
];

export default function Menu() {
  const { theme } = useTheme();
  const [active, setActive] = useState<Category>("starters");
  const sectionRef = useScrollReveal();
  const [menuData, setMenuData] = useState<Record<Category, MenuItem[]>>();

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch("/api/menu");
        if (!res.ok) return;
        const data = await res.json();
        const items: MenuItem[] = data.items || [];

        if (items.length > 0) {
          const grouped: Record<Category, MenuItem[]> = {
            starters: [],
            mains: [],
            desserts: [],
            drinks: [],
          };
          for (const item of items) {
            const cat = (item.category || "starters") as Category;
            if (grouped[cat]) grouped[cat].push(item);
          }
          // Only use API data if it has entries
          const hasData = Object.values(grouped).some((arr) => arr.length > 0);
          if (hasData) setMenuData(grouped);
        }
      } catch {
        // Silently fall back to hardcoded data
      }
    };
    fetchMenu();
  }, []);

  return (
    <section id="menu" ref={sectionRef} className="py-24 md:py-32 px-6 lg:px-8 bg-surface">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-gold text-sm tracking-[0.3em] uppercase">Culinary Excellence</span>
          <h2 className="font-display text-4xl md:text-5xl mt-2 mb-4">Our Menu</h2>
          <div className="gold-divider max-w-xs mx-auto">
            <span className="text-gold text-lg">✦</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-14">
          {categories.map((cat) => (
            <button
              key={cat.key}
              id={`menu-tab-${cat.key}`}
              onClick={() => setActive(cat.key)}
              className={`px-6 py-2.5 text-sm tracking-widest uppercase transition-all duration-300 border ${
                active === cat.key
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-surface-border text-foreground/50 hover:border-gold/50 hover:text-foreground/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {menuData?.[active]?.map((item, i) => (
            <div
              key={item._id || item.name}
              className="group border border-surface-border overflow-hidden hover:border-gold/30 transition-colors duration-300 bg-surface-light/30 flex flex-col"
              // style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Large Image Top */}
              <div className="w-full h-64 overflow-hidden bg-surface-light shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${item.image || (theme === "dark" ? "/images/defaultItemImageDark.png" : "/images/defaultItemImageWhite.png")}`}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              {/* Card Content */}
              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    <h3 className="font-display text-2xl group-hover:text-gold transition-colors duration-300">{item.name}</h3>
                  </div>
                  <span className="font-display text-2xl text-gold shrink-0">{item.price}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {item.tag && <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 border border-gold/50 text-gold">{item.tag}</span>}
                  {item.isJainAvailable && (
                    <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 border border-green-700 text-green-700">Jain Option</span>
                  )}
                </div>

                <p className="text-foreground/60 text-sm leading-relaxed flex-1">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="text-center text-foreground/30 text-sm mt-12 tracking-wide">
          Menu items are subject to seasonal availability. Please inform your server of any dietary requirements.
        </p>
      </div>
    </section>
  );
}
