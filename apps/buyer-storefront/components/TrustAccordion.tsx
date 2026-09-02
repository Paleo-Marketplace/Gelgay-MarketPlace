import React, { useState } from 'react';
import { FAQ_ITEMS } from '../data/paleoData';
import { Plus, Minus, HelpCircle } from './Icons';

export default function TrustAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-8 sm:py-20 bg-[#FAF8F5] dark:bg-[#141312] border-b border-[#E8E4DC] dark:border-[#33302B]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center mb-5 sm:mb-12">
          <span className="font-mono text-[9px] sm:text-xs uppercase tracking-widest text-[#C85A32] font-semibold flex items-center justify-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> FAQ & SYSTEM CLARITY
          </span>
          <h2 className="font-serif text-xl sm:text-3xl md:text-4xl font-normal text-[#1F1E1B] dark:text-[#FAF8F5] mt-1 sm:mt-2">
            Frequently Asked Questions
          </h2>
          <p className="font-sans text-[11px] sm:text-sm text-[#625D54] dark:text-[#A8A296] mt-1.5 sm:mt-2 font-light max-w-xl mx-auto leading-relaxed">
            Everything you need to know about seller verification, escrow bank transfer OCR, zero-cost Telegram authentication, and delivery handoffs.
          </p>
        </div>

        {/* Accordions List */}
        <div className="space-y-2 sm:space-y-4">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="bg-white/80 dark:bg-[#1E1C1A]/90 backdrop-blur-md border border-white/70 dark:border-[#33302B] rounded-xl sm:rounded-2xl transition-all duration-300 hover:border-[#C85A32]/50 hover:bg-white/95 dark:hover:bg-[#252320] shadow-xs overflow-hidden"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full p-3 sm:p-6 text-left flex items-center justify-between gap-3 sm:gap-4 focus:outline-none"
                >
                  <span className="font-serif text-xs sm:text-lg font-medium text-[#1F1E1B] dark:text-[#FAF8F5] leading-snug">
                    {item.q}
                  </span>
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#EFECE6] dark:bg-[#2B2824] border border-[#E2DDD3] dark:border-[#3A3732] flex items-center justify-center text-[#1F1E1B] dark:text-[#FAF8F5] shrink-0">
                    {isOpen ? <Minus className="w-3 h-3 sm:w-4 sm:h-4" /> : <Plus className="w-3 h-3 sm:w-4 sm:h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3 pb-3 pt-1.5 sm:px-6 sm:pb-6 sm:pt-2 border-t border-[#E8E4DC] dark:border-[#33302B]">
                    <p className="font-sans text-[11px] sm:text-sm text-[#524E46] dark:text-[#D1CBC0] font-light leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
