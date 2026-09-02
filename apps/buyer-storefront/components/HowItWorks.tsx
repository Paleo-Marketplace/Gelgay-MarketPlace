'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, CheckCircle, Star, Quote, CheckCircle2, Award, UserCheck, HeartHandshake } from 'lucide-react';

interface HowItWorksProps {
  onSellClick: () => void;
}

export default function HowItWorks({ onSellClick }: HowItWorksProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'buyer' | 'vendor'>('all');

  const communityReviews = [
    {
      id: 'rev-1',
      type: 'buyer',
      badge: 'VERIFIED BUYER • BOLE ATLAS',
      rating: 5.0,
      acquiredItem: 'Acquired: Braun ET66 (Dieter Rams, 1987)',
      quote: 'The OCR receipt verification confirmed my CBE transfer in under 4 seconds. Knowing my funds stayed safely in escrow until I personally tested the buttons and LCD display gave me complete peace of mind.',
      name: 'Abebe T.',
      role: 'Industrial Designer & Collector',
      location: 'Posta Bet, Adama',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format',
      verificationPoint: 'Physical inspection completed before escrow release',
      highlightColor: '#C85A32'
    },
    {
      id: 'rev-2',
      type: 'vendor',
      badge: 'VERIFIED MERCHANT • GEDA DEMBI',
      rating: 5.0,
      acquiredItem: 'Sold: Restored Sony TPS-L2 & Analog Audio',
      quote: 'Listing vintage audio gear took under 2 minutes. The Telegram bot integration meant zero SMS fees, and bank payout arrived directly in my Awash account the moment the buyer tapped confirmed.',
      name: 'Yared M.',
      role: 'Analog Archivist & Vendor',
      location: 'Dembi / Geda, Adama',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&auto=format',
      verificationPoint: 'Zero transaction dispute • Instant bot payout alert',
      highlightColor: '#1F1E1B'
    },
    {
      id: 'rev-3',
      type: 'buyer',
      badge: 'VERIFIED BUYER • BOKU SHENEN',
      rating: 5.0,
      acquiredItem: 'Acquired: Leica M3 Single Stroke + 50mm Lens',
      quote: 'Finding rare Leica rangefinders in Adama used to be fraught with risk. ገልጋይ’s neighborhood handoff with live courier tracking and physical lens inspection is the gold standard for collector trust.',
      name: 'Bethlehem K.',
      role: 'Documentary Photographer',
      location: 'Boku Shenen, Adama',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&auto=format',
      verificationPoint: 'Optical glass & shutter accuracy verified on delivery',
      highlightColor: '#C85A32'
    }
  ];

  const filteredReviews = activeFilter === 'all' 
    ? communityReviews 
    : communityReviews.filter(r => r.type === activeFilter);

  return (
    <section id="how-it-works" className="relative py-24 border-b border-[#E8E4DC] dark:border-[#33302B] overflow-hidden bg-[#FAF8F5] dark:bg-[#141312]">
      {/* Background Image: front.jpg */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{
          backgroundImage: `url('/assets/front.jpg')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5]/96 via-[#FAF8F5]/90 to-[#FAF8F5]/98 dark:from-[#141312]/96 dark:via-[#141312]/90 dark:to-[#141312]/98 z-0 backdrop-blur-[2px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 pb-6 border-b border-[#E8E4DC] dark:border-[#33302B]">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-[#C85A32] font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> BUYER PROTECTION & ESCROW
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#1F1E1B] dark:text-[#FAF8F5] mt-2">
              How ገልጋይ (Gelgay) works
            </h2>
          </div>
          <p className="font-sans text-sm text-[#625D54] dark:text-[#A8A296] max-w-md mt-4 md:mt-0 font-light leading-relaxed">
            Eliminating peer-to-peer marketplace risk across Ethiopia. 
            Funds are safely held in escrow until you physically inspect and confirm delivery of your purchase.
          </p>
        </div>

        {/* 3 Step Numerals Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          
          {/* Step 01 */}
          <div className="bg-white/80 dark:bg-[#1E1C1A]/90 backdrop-blur-md border border-white/70 dark:border-[#33302B] p-8 flex flex-col justify-between relative group hover:border-[#C85A32]/60 hover:bg-white/95 dark:hover:bg-[#252320] transition-all duration-500 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-serif text-5xl font-light text-[#C85A32]">
                  01
                </span>
                <div className="w-10 h-10 rounded-full bg-[#FAF3F0] dark:bg-[#2B2824] text-[#C85A32] flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[#1F1E1B] dark:text-[#FAF8F5] mb-3">
                Discover & Reserve
              </h3>
              <p className="font-sans text-sm text-[#625D54] dark:text-[#A8A296] font-light leading-relaxed">
                Browse curated pieces with verified condition ratings. When checkout begins, the item is locked exclusively in escrow so no one else can purchase it.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-[#E8E4DC] dark:border-[#33302B] font-mono text-xs text-[#7C776E] dark:text-[#A8A296] flex items-center justify-between">
              <span>Instant ACID Lock</span>
              <span className="text-[#C85A32] font-semibold">Zero Overselling</span>
            </div>
          </div>

          {/* Step 02 */}
          <div className="bg-white/80 dark:bg-[#1E1C1A]/90 backdrop-blur-md border border-white/70 dark:border-[#33302B] p-8 flex flex-col justify-between relative group hover:border-[#C85A32]/60 hover:bg-white/95 dark:hover:bg-[#252320] transition-all duration-500 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-serif text-5xl font-light text-[#C85A32]">
                  02
                </span>
                <div className="w-10 h-10 rounded-full bg-[#FAF3F0] dark:bg-[#2B2824] text-[#C85A32] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[#1F1E1B] dark:text-[#FAF8F5] mb-3">
                Secure Escrow Payment
              </h3>
              <p className="font-sans text-sm text-[#625D54] dark:text-[#A8A296] font-light leading-relaxed">
                Transfer via CBE Birr, Telebirr, or Dashen and upload your receipt screenshot. High-speed OCR validates your payment and locks funds in escrow.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-[#E8E4DC] dark:border-[#33302B] font-mono text-xs text-[#7C776E] dark:text-[#A8A296] flex items-center justify-between">
              <span>Python OCR Verified</span>
              <span className="text-[#C85A32] font-semibold">4.2s Processing</span>
            </div>
          </div>

          {/* Step 03 */}
          <div className="bg-white/80 dark:bg-[#1E1C1A]/90 backdrop-blur-md border border-white/70 dark:border-[#33302B] p-8 flex flex-col justify-between relative group hover:border-[#C85A32]/60 hover:bg-white/95 dark:hover:bg-[#252320] transition-all duration-500 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-serif text-5xl font-light text-[#C85A32]">
                  03
                </span>
                <div className="w-10 h-10 rounded-full bg-[#FAF3F0] dark:bg-[#2B2824] text-[#C85A32] flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
              <h3 className="font-serif text-2xl font-semibold text-[#1F1E1B] dark:text-[#FAF8F5] mb-3">
                Inspect & Release
              </h3>
              <p className="font-sans text-sm text-[#625D54] dark:text-[#A8A296] font-light leading-relaxed">
                Meet the courier in your Adama neighborhood or receive doorstep delivery. Inspect the item in person; vendor payout is released only upon your approval.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-[#E8E4DC] dark:border-[#33302B] font-mono text-xs text-[#7C776E] dark:text-[#A8A296] flex items-center justify-between">
              <span>Physical Inspection</span>
              <span className="text-[#C85A32] font-semibold">100% Guaranteed</span>
            </div>
          </div>
        </div>

        {/* NEW DESIGN CONCEPT: THE PALEO LEDGER - VERIFIED TESTIMONIAL WALL */}
        <div className="mb-24">
          
          {/* Sub-header & Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-4 border-b border-[#E8E4DC]">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-[#EB5B00] font-semibold flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5" /> THE GELGAY (ገልጋይ) LEDGER
              </span>
              <h3 className="font-serif text-3xl sm:text-4xl font-normal text-[#1F1E1B] mt-1">
                Verified handoff stories
              </h3>
            </div>

            {/* Filter Pills */}
            <div className="mt-4 md:mt-0 flex items-center gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 text-xs font-mono rounded-full uppercase tracking-wider transition-all border ${
                  activeFilter === 'all'
                    ? 'bg-[#1F1E1B] text-white border-[#1F1E1B] shadow-xs'
                    : 'bg-[#EFECE6] text-[#625D54] border-[#E2DDD3] hover:border-[#1F1E1B]'
                }`}
              >
                All Stories (148+)
              </button>
              <button
                onClick={() => setActiveFilter('buyer')}
                className={`px-4 py-2 text-xs font-mono rounded-full uppercase tracking-wider transition-all border ${
                  activeFilter === 'buyer'
                    ? 'bg-[#1F1E1B] text-white border-[#1F1E1B] shadow-xs'
                    : 'bg-[#EFECE6] text-[#625D54] border-[#E2DDD3] hover:border-[#1F1E1B]'
                }`}
              >
                Buyer Handoffs
              </button>
              <button
                onClick={() => setActiveFilter('vendor')}
                className={`px-4 py-2 text-xs font-mono rounded-full uppercase tracking-wider transition-all border ${
                  activeFilter === 'vendor'
                    ? 'bg-[#1F1E1B] text-white border-[#1F1E1B] shadow-xs'
                    : 'bg-[#EFECE6] text-[#625D54] border-[#E2DDD3] hover:border-[#1F1E1B]'
                }`}
              >
                Vendor Stories
              </button>
            </div>
          </div>

          {/* Testimonial Cards Editorial Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-white/80 backdrop-blur-md border border-white/70 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl hover:bg-white/95 transition-all duration-500 flex flex-col justify-between group hover:border-[#C85A32]/60 relative overflow-hidden"
              >
                {/* Subtle top indicator bar */}
                <div 
                  className="absolute top-0 inset-x-0 h-1 bg-[#C85A32] opacity-80 group-hover:opacity-100 transition-opacity" 
                />

                <div className="space-y-4">
                  {/* Badge & Stars */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE1]">
                    <span className="font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 bg-[#FAF3F0] text-[#C85A32] rounded-md font-semibold border border-[#EAD5CD]">
                      {rev.badge}
                    </span>
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>

                  {/* Purchased Item Snippet */}
                  <div className="p-2.5 bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl">
                    <span className="font-mono text-[10px] text-[#7C776E] uppercase block font-semibold">
                      Verified Transaction:
                    </span>
                    <p className="font-serif text-xs font-semibold text-[#1F1E1B] truncate mt-0.5">
                      {rev.acquiredItem}
                    </p>
                  </div>

                  {/* Quote Body */}
                  <div className="relative pt-2">
                    <Quote className="w-6 h-6 text-[#C85A32]/20 absolute -top-1 -left-2 rotate-180" />
                    <p className="font-serif text-base italic text-[#2E2C28] leading-relaxed relative z-10 pl-2">
                      "{rev.quote}"
                    </p>
                  </div>
                </div>

                {/* Reviewer Bio & Footnote */}
                <div className="mt-8 pt-4 border-t border-[#E8E4DC] space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-[#C85A32] shrink-0">
                      <img
                        src={rev.avatar}
                        alt={rev.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-serif text-sm font-bold text-[#1F1E1B]">
                        {rev.name}
                      </h4>
                      <p className="font-mono text-[11px] text-[#7C776E]">
                        {rev.role}
                      </p>
                      <p className="font-sans text-[11px] text-[#A5A096]">
                        {rev.location}
                      </p>
                    </div>
                  </div>

                  {/* Escrow Guarantee Footnote */}
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    <span className="truncate">{rev.verificationPoint}</span>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Trust Metrics Ribbon */}
          <div className="mt-12 p-6 bg-[#1F1E1B] text-[#FAF8F5] rounded-3xl border border-[#363430] grid grid-cols-2 md:grid-cols-4 gap-6 text-center shadow-lg">
            <div className="space-y-1">
              <span className="font-serif text-2xl md:text-3xl font-bold text-[#FAF8F5] block">100%</span>
              <span className="font-mono text-[11px] text-[#A5A096] uppercase tracking-wider">Escrow Protection</span>
            </div>
            <div className="space-y-1 border-l border-[#363430]">
              <span className="font-serif text-2xl md:text-3xl font-bold text-[#FAF8F5] block">148+</span>
              <span className="font-mono text-[11px] text-[#A5A096] uppercase tracking-wider">Adama Handoffs</span>
            </div>
            <div className="space-y-1 border-l border-[#363430]">
              <span className="font-serif text-2xl md:text-3xl font-bold text-amber-400 block">4.96 ★</span>
              <span className="font-mono text-[11px] text-[#A5A096] uppercase tracking-wider">Inspection Score</span>
            </div>
            <div className="space-y-1 border-l border-[#363430]">
              <span className="font-serif text-2xl md:text-3xl font-bold text-emerald-400 block">0 Birr</span>
              <span className="font-mono text-[11px] text-[#A5A096] uppercase tracking-wider">Disputed Loss</span>
            </div>
          </div>

        </div>

        {/* Vendor Conversion Banner CTA */}
        <div className="bg-white/75 backdrop-blur-lg border border-white/70 p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="max-w-2xl">
            <span className="font-mono text-xs text-[#C85A32] uppercase tracking-wider block mb-2 font-semibold flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4" /> JOIN OUR VENDOR NETWORK
            </span>
            <h3 className="font-serif text-3xl sm:text-4xl font-normal text-[#1F1E1B]">
              Your unused items could be someone else's best find.
            </h3>
            <p className="font-sans text-sm text-[#625D54] mt-2 font-light">
              List curated pieces in under 2 minutes with zero listing fees. Reach design enthusiasts across Adama.
            </p>
          </div>

          <button
            onClick={onSellClick}
            className="px-8 py-4 bg-[#1F1E1B] text-[#FAF8F5] font-mono text-xs uppercase tracking-wider font-semibold hover:bg-[#C85A32] transition-colors shrink-0 flex items-center gap-3 rounded-xl shadow-md"
          >
            <span>Start Selling</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </section>
  );
}
