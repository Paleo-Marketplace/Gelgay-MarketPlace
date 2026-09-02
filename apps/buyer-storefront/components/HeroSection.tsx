'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Play, Sparkles, Truck, Store, MapPin } from 'lucide-react';
import { useAuthStore } from '../app/stores/useAuthStore';

interface HeroSectionProps {
  onExploreClick: () => void;
  onSellClick: () => void;
}

export default function HeroSection({
  onExploreClick,
  onSellClick
}: HeroSectionProps) {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isSeller = isAuthenticated && (user?.role === 'vendor' || user?.role === 'VENDOR');
  const isBuyer = isAuthenticated && !isSeller;
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden border-b border-[#E8E4DC]">
      {/* Background Image: landingPaleo.jpg with warm atmospheric overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
        style={{
          backgroundImage: `url('/assets/landingPaleo.jpg')`,
        }}
      />
      {/* Overlay to ensure maximum contrast and editorial legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5]/95 via-[#FAF8F5]/90 to-[#FAF8F5] z-0 backdrop-blur-[2px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Tagline Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#EFECE6]/90 backdrop-blur-md border border-[#E2DDD3] rounded-full text-xs font-mono text-[#625D54] mb-8 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#C85A32] animate-pulse"></span>
          <span>The marketplace for the next chapter.</span>
          <span className="text-[#A5A096]">|</span>
          <span className="text-[#1F1E1B] font-semibold">100% Verified Escrow Guarantee</span>
        </div>

        {/* Main Headline Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-8 items-center">
          
          {/* Main Headline & CTAs */}
          <div className="md:col-span-7 space-y-5 md:space-y-8">
            <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight text-[#1F1E1B] leading-[1.05] md:leading-[1.02] font-normal">
              Good things <br />
              <span className="italic font-light text-[#EB5B00]">deserve</span> second life.
            </h1>

            <p className="font-sans text-base sm:text-xl text-[#524E46] max-w-2xl leading-relaxed font-light">
              <strong className="text-[#1F1E1B] font-semibold">ገልጋይ (Gelgay)</strong> connects design enthusiasts, collectors, and verified vendors across Ethiopia. 
              Discover authenticated vintage electronics, mid-century furniture, archival fashion, 
              and studio gear with safe escrow buyer protection.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1 md:pt-2">
              {isSeller ? (
                <>
                  <button
                    onClick={onSellClick}
                    className="px-8 py-4 bg-[#EB5B00] text-[#FAF8F5] font-mono text-xs tracking-wider uppercase font-semibold hover:bg-[#FF6B10] transition-all flex items-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Store className="w-4 h-4" />
                    <span>List New Item (Sell)</span>
                  </button>

                  <Link
                    href="/orders"
                    className="px-8 py-4 bg-white/80 backdrop-blur-md border border-[#1F1E1B] text-[#1F1E1B] font-mono text-xs tracking-wider uppercase font-semibold hover:bg-[#EFECE6] transition-all shadow-xs inline-flex items-center gap-2"
                  >
                    <span>Studio Orders & Handoffs</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              ) : (
                <>
                  <button
                    onClick={onExploreClick}
                    className="px-7 py-4 bg-[#1F1E1B] text-[#FAF8F5] font-mono text-xs tracking-wider uppercase font-semibold hover:bg-[#EB5B00] transition-all flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <span>Explore Market</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <Link
                    href="/shops"
                    className="px-6 py-4 bg-[#FAF3F0] border border-[#EB5B00]/40 text-[#EB5B00] font-mono text-xs tracking-wider uppercase font-semibold hover:bg-[#EB5B00] hover:text-white transition-all shadow-xs inline-flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Shops Near You</span>
                  </Link>

                  {isBuyer && (
                    <Link
                      href="/track"
                      className="px-6 py-4 bg-white/80 backdrop-blur-md border border-[#1F1E1B] text-[#1F1E1B] font-mono text-xs tracking-wider uppercase font-semibold hover:bg-[#EFECE6] transition-all shadow-xs inline-flex items-center gap-2"
                    >
                      <Truck className="w-4 h-4 text-[#EB5B00]" />
                      <span>Track Order</span>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Side: Rectangular Shaped Video Frame (animate.mp4) like mikiasabera.vercel.app */}
          <div className="md:col-span-5">
            <div className="relative bg-[#121316] text-[#FAF8F5] p-3 border border-[#363430] shadow-2xl rounded-2xl overflow-hidden group">
              
              {/* Window Header Bar (Browser / Screen Mockup) */}
              <div className="flex items-center justify-between pb-3 px-2 border-b border-[#2A2B30] mb-2 font-mono text-[11px] text-[#A5A096]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/80"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]/80"></div>
                  <span className="ml-2 text-white/50 text-[10px]">gelgay-motion.mp4</span>
                </div>
                <div className="flex items-center gap-1 text-[#EB5B00]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>LIVE REEL</span>
                </div>
              </div>

              {/* Video Player in Styled Rectangular Frame */}
              <div className="relative aspect-4/3 sm:aspect-16/10 rounded-xl overflow-hidden bg-[#0D0E11] border border-white/10 shadow-inner">
                <video
                  src="/assets/animate.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded-lg transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                />
                
                {/* Floating Glassmorphic Pill */}
                <div className="absolute bottom-3 left-3 right-3 px-3 py-2 bg-black/60 backdrop-blur-md border border-white/15 rounded-lg flex items-center justify-between text-xs font-mono text-white/90 z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="font-semibold text-[11px]">ገልጋይ Escrow Handoff</span>
                  </div>
                  <span className="text-[10px] text-white/60">Posta Bet · Adama</span>
                </div>
              </div>

              {/* Video Footer Metadata */}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-[#A5A096]">
                  <span>Curated Motion Reel</span>
                  <span className="text-[#EB5B00] font-semibold">100% Escrow Protected</span>
                </div>
                <h3 className="font-serif text-xl font-medium text-white">
                  Physical Inspection & Same-Day Hand-off
                </h3>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Social Proof Ticker */}
        <div className="mt-16 pt-8 border-t border-[#E8E4DC] grid grid-cols-2 md:grid-cols-4 gap-6 font-mono text-xs">
          <div>
            <div className="font-serif text-3xl font-semibold text-[#1F1E1B]">12,480+</div>
            <div className="text-[#625D54] mt-1">Curated pieces rehomed</div>
          </div>
          <div>
            <div className="font-serif text-3xl font-semibold text-[#1F1E1B]">100%</div>
            <div className="text-[#625D54] mt-1">Buyer Escrow protection</div>
          </div>
          <div>
            <div className="font-serif text-3xl font-semibold text-[#C85A32]">Same-Day</div>
            <div className="text-[#625D54] mt-1">Adama delivery handoff</div>
          </div>
          <div>
            <div className="font-serif text-3xl font-semibold text-[#1F1E1B]">0 ETB</div>
            <div className="text-[#625D54] mt-1">Seller listing fee</div>
          </div>
        </div>

      </div>
    </section>
  );
}
