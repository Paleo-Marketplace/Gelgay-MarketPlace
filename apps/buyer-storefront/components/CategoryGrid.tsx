'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CATEGORIES } from '../data/paleoData';
import { ArrowUpRight, Sparkles } from 'lucide-react';

interface CategoryGridProps {
  onSelectCategory?: (categoryName: string) => void;
}

export default function CategoryGrid({ onSelectCategory }: CategoryGridProps) {
  const router = useRouter();
  const [categoriesList, setCategoriesList] = React.useState(CATEGORIES);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  React.useEffect(() => {
    fetch(`${apiUrl}/api/categories`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
          const mapped = data.categories.map((c: any, i: number) => ({
            id: c._id || c.slug || `cat-${i}`,
            name: c.name,
            tag: c.tag || `0${i + 1} / ARCHIVE`,
            itemCount: `${15 + i * 8} Pieces`,
            description: c.description || 'Curated archive piece.',
            image: c.image || CATEGORIES[i % CATEGORIES.length]?.image || '/assets/vintage-desk.png',
            link: c.slug || 'market',
            color: 'from-amber-900/60 to-black/80'
          }));
          setCategoriesList(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const handleCategoryClick = (catKey: string) => {
    if (onSelectCategory) {
      onSelectCategory(catKey);
    } else {
      router.push(`/shop?category=${encodeURIComponent(catKey)}`);
    }
  };

  // Explicit, fail-safe Bento Grid layout classes for all 5 cards
  const getCardLayoutClass = (index: number) => {
    switch (index) {
      case 0:
        // 01: Electronics (Left Large Hero Card)
        return 'col-span-12 lg:col-span-7 lg:row-span-2 min-h-[380px] lg:min-h-[620px]';
      case 1:
        // 02: Furniture (Top Right Card)
        return 'col-span-12 sm:col-span-6 lg:col-span-5 min-h-[295px]';
      case 2:
        // 03: Studio Gear (Middle Right Card)
        return 'col-span-12 sm:col-span-6 lg:col-span-5 min-h-[295px]';
      case 3:
        // 04: Archival Wear (Bottom Left Wide Card)
        return 'col-span-12 md:col-span-6 min-h-[320px]';
      case 4:
        // 05: Rare Reads (Bottom Right Wide Card)
        return 'col-span-12 md:col-span-6 min-h-[320px]';
      default:
        return 'col-span-12 md:col-span-6 min-h-[300px]';
    }
  };

  return (
    <section id="categories" className="relative py-20 lg:py-24 border-b border-[#E8E4DC] dark:border-[#33302B] overflow-hidden bg-[#FAF8F5] dark:bg-[#141312]">
      {/* Organic Tree Texture Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `url('/assets/tree.jpg')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5]/98 via-[#FAF8F5]/94 to-[#FAF8F5]/98 dark:from-[#141312]/98 dark:via-[#141312]/94 dark:to-[#141312]/98 z-0 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-[#E8E4DC] dark:border-[#33302B]">
          <div className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#C85A32] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
              CURATED SELECTIONS
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-normal text-[#1F1E1B] dark:text-[#FAF8F5] tracking-tight">
              Browse by feeling
            </h2>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <p className="font-sans text-sm text-[#625D54] dark:text-[#A8A296] max-w-md font-light leading-relaxed">
              Every category is curated for timeless utility, craftsmanship, and longevity. Discover unique design objects saved from obscurity.
            </p>
            <Link
              href="/shop"
              className="hidden sm:inline-flex items-center gap-1 font-mono text-xs text-[#C85A32] font-semibold hover:underline shrink-0 bg-[#FAF3F0] dark:bg-[#22201C] px-4 py-2.5 rounded-full border border-[#C85A32]/20 shadow-xs"
            >
              <span>Explore All Archive</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Rock-Solid Bento Grid (12 Columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6">
          {categoriesList.map((cat: any, idx) => {
            const filterKey = cat.filterKey || cat.name;
            const layoutClass = getCardLayoutClass(idx);

            return (
              <div
                key={cat.id || cat.slug || cat.name || `cat-grid-key-${idx}`}
                onClick={() => handleCategoryClick(filterKey)}
                className={`${layoutClass} group relative overflow-hidden bg-[#1F1E1B] border border-[#E2DDD3] cursor-pointer shadow-md hover:shadow-2xl transition-all duration-500 rounded-3xl flex flex-col justify-between p-6 sm:p-8`}
              >
                {/* Background Image with Guaranteed Fit and Contrast */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover object-center opacity-80 group-hover:scale-105 group-hover:opacity-90 transition-all duration-700 ease-out"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/assets/categories/electronics.jpg';
                  }}
                />

                {/* High Contrast Multi-Stop Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 group-hover:from-black/95 transition-opacity" />

                {/* Top Header: Badge Pill + Item Counter */}
                <div className="relative z-10 flex items-center justify-between text-white/90 font-mono text-xs">
                  <span className="px-3.5 py-1.5 bg-black/60 backdrop-blur-md border border-white/20 uppercase tracking-wider text-[11px] rounded-xl font-semibold text-white shadow-xs">
                    {cat.tag}
                  </span>
                  <span className="px-3 py-1 bg-white/15 backdrop-blur-md border border-white/20 rounded-full text-white font-mono text-[11px] font-medium shadow-xs">
                    {cat.itemCount}
                  </span>
                </div>

                {/* Bottom Content: Title + Subtitle + Action Icon */}
                <div className="relative z-10 text-white flex items-end justify-between pt-16 gap-4">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h3 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white group-hover:text-[#F3A582] transition-colors truncate">
                      {cat.name}
                    </h3>
                    <p className="font-sans text-xs sm:text-sm text-white/80 font-light line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  <div className="w-11 h-11 rounded-full bg-[#C85A32] text-white flex items-center justify-center group-hover:bg-[#D96B42] group-hover:scale-110 transition-all duration-300 shadow-lg shrink-0">
                    <ArrowUpRight className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
