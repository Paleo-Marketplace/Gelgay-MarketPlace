import React, { useState } from 'react';
import { Search, Sparkles, SlidersHorizontal, ArrowRight } from './Icons';

interface BigSearchBarProps {
  onSearchSubmit: (query: string) => void;
  onFilterClick: (filter: string) => void;
}

export default function BigSearchBar({ onSearchSubmit, onFilterClick }: BigSearchBarProps) {
  const [query, setQuery] = useState('');

  const quickFilters = [
    'Under 5,000 ETB',
    'Near Kazanchis',
    'Near Bole Atlas',
    'Dieter Rams / Braun',
    '35mm Film Cameras',
    'Like New'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearchSubmit(query);
    }
  };

  return (
    <section className="py-20 bg-[#1F1E1B] text-[#FAF8F5] relative overflow-hidden border-y border-[#363430]">
      {/* Background Subtle Grid */}
      <div 
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#FAF8F5 1px, transparent 1px)',
          backgroundSize: '20px 24px'
        }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        
        {/* Interstitial Prompt */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#2D2A26] border border-[#3A3732] rounded-full text-xs font-mono text-[#E5A852] mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#E5A852]" />
          <span>Conversational Discovery powered by Typesense</span>
        </div>

        <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#FAF8F5] tracking-tight mb-8">
          "Find something you weren't looking for."
        </h2>

        {/* Big Search Input Form */}
        <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto mb-6 sm:mb-8">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 sm:left-5 w-5 h-5 sm:w-6 sm:h-6 text-[#A5A096]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vintage audio, cameras, furniture..."
              className="w-full pl-11 sm:pl-14 pr-24 sm:pr-32 py-3.5 sm:py-5 bg-[#2A2824] border border-[#423E37] rounded-xl sm:rounded-2xl text-sm sm:text-lg font-sans text-[#FAF8F5] placeholder-[#858076] focus:outline-none focus:border-[#C85A32] transition-colors"
            />
            <button
              type="submit"
              className="absolute right-2 sm:right-3 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#C85A32] text-white font-mono text-[11px] sm:text-xs uppercase tracking-wider font-semibold hover:bg-[#D96B42] transition-colors flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl shadow-xs"
            >
              <span>Search</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </form>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-2xl mx-auto">
          <span className="font-mono text-xs text-[#858076] mr-2 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Quick Filters:
          </span>
          {quickFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setQuery(filter);
                onFilterClick(filter);
              }}
              className="px-3.5 py-1.5 bg-[#2A2824] hover:bg-[#383530] border border-[#3A3732] text-xs font-mono text-[#D4CEB8] hover:text-white transition-colors"
            >
              {filter}
            </button>
          ))}
        </div>

      </div>
    </section>
  );
}
