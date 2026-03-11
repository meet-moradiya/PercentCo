"use client";

import { useState, useEffect } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

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

// Fallback data used when API is unavailable (e.g., no MongoDB configured yet)
const fallbackMenuData: Record<Category, MenuItem[]> = {
  starters: [
    { name: "Truffle Burrata", description: "Fresh burrata, black truffle shavings, aged balsamic, micro basil", price: "$24", tag: "Chef's Pick" },
    { name: "Tuna Tartare", description: "Yellowfin tuna, avocado mousse, sesame tuile, citrus ponzu", price: "$28" },
    { name: "Lobster Bisque", description: "Velvety lobster broth, cognac cream, chive oil, gruyère crouton", price: "$22" },
    { name: "Foie Gras Torchon", description: "Duck foie gras, fig compote, brioche toast, fleur de sel", price: "$32" },
    { name: "Carpaccio di Manzo", description: "Wagyu beef carpaccio, arugula, parmesan, truffle dressing", price: "$26" },
    { name: "Ceviche Nikkei", description: "Sea bass, tiger milk, aji amarillo, crispy shallots", price: "$25" },
  ],
  mains: [
    { name: "Wagyu Ribeye", description: "A5 Japanese wagyu, bone marrow butter, charred broccolini, red wine jus", price: "$85", tag: "Signature" },
    { name: "Pan-Seared Scallops", description: "Hokkaido scallops, cauliflower purée, brown butter, capers", price: "$48" },
    { name: "Duck Confit", description: "Slow-cooked duck leg, cherry gastrique, roasted root vegetables", price: "$42" },
    { name: "Chilean Sea Bass", description: "Miso-glazed sea bass, bok choy, shiitake dashi, ginger oil", price: "$52", tag: "Popular" },
    { name: "Rack of Lamb", description: "Herb-crusted lamb, pistachio crust, mint gremolata, fondant potato", price: "$58" },
    { name: "Wild Mushroom Risotto", description: "Arborio rice, porcini, chanterelle, truffle oil, aged parmesan", price: "$36" },
  ],
  desserts: [
    { name: "Chocolate Fondant", description: "Valrhona dark chocolate, molten center, vanilla bean ice cream, gold leaf", price: "$18", tag: "Must Try" },
    { name: "Crème Brûlée", description: "Madagascar vanilla, caramelized sugar, fresh berries", price: "$16" },
    { name: "Tiramisu Deconstructed", description: "Espresso-soaked savoiardi, mascarpone mousse, cocoa dust", price: "$17" },
    { name: "Tarte Tatin", description: "Caramelized apple, puff pastry, calvados cream, cinnamon", price: "$18" },
  ],
  drinks: [
    { name: "The Golden Hour", description: "Champagne, elderflower liqueur, gold flakes, citrus zest", price: "$22", tag: "Signature" },
    { name: "Smoky Old Fashioned", description: "Japanese whisky, demerara, Angostura, smoked oak", price: "$20" },
    { name: "Espresso Martini", description: "Premium vodka, fresh espresso, coffee liqueur, vanilla", price: "$18" },
    { name: "Sommelier's Selection", description: "Curated wine pairing — ask your server for today's selection", price: "$35" },
  ],
};

const categories: { key: Category; label: string }[] = [
  { key: "starters", label: "Starters" },
  { key: "mains", label: "Main Courses" },
  { key: "desserts", label: "Desserts" },
  { key: "drinks", label: "Cocktails" },
];

export default function Menu() {
  const [active, setActive] = useState<Category>("starters");
  const sectionRef = useScrollReveal();
  const [menuData, setMenuData] = useState<Record<Category, MenuItem[]>>(fallbackMenuData);

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
    <section
      id="menu"
      ref={sectionRef}
      className="py-24 md:py-32 px-6 lg:px-8 bg-surface"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-gold text-sm tracking-[0.3em] uppercase">
            Culinary Excellence
          </span>
          <h2 className="font-display text-4xl md:text-5xl mt-2 mb-4">
            Our Menu
          </h2>
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
        <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
          {menuData[active].map((item, i) => (
            <div
              key={item._id || item.name}
              className="group border-b border-surface-border pb-6 hover:border-gold/30 transition-colors duration-300"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex gap-4 flex-1">
                  {/* Image Thumbnail */}
                  <div className="w-20 h-20 shrink-0 border border-surface-border overflow-hidden rounded bg-surface-light hidden sm:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={item.image || "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-display text-xl group-hover:text-gold transition-colors duration-300">
                        {item.name}
                      </h3>
                      {item.tag && (
                        <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 border border-gold/50 text-gold">
                          {item.tag}
                        </span>
                      )}
                      {item.isJainAvailable && (
                         <span className="px-1.5 py-0.5 text-[10px] bg-green-900/40 text-green-400 border border-green-500/30 rounded uppercase tracking-wider">
                           Jain Opt
                         </span>
                      )}
                    </div>
                    <p className="text-foreground/40 text-sm mt-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
                <span className="font-display text-xl text-gold shrink-0">
                  {item.price}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <p className="text-center text-foreground/30 text-sm mt-12 tracking-wide">
          Menu items are subject to seasonal availability. Please inform your
          server of any dietary requirements.
        </p>
      </div>
    </section>
  );
}
