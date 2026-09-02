'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PaleoNavigation from './PaleoNavigation';
import InlineAuthFooter from './InlineAuthFooter';
import CartDrawer from './CartDrawer';
import SellItemModal from './SellItemModal';
import TelegramAuthModal from './TelegramAuthModal';
import BigSearchBar from './BigSearchBar';
import FeaturedVendors from './FeaturedVendors';
import TrustAccordion from './TrustAccordion';
import PageNavigationFlow from './PageNavigationFlow';
import { useCartStore } from '../app/stores/useCartStore';
import { useWishlistStore } from '../app/stores/useWishlistStore';
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  MapPin,
  Send,
  Eye,
  Award,
  Layers,
  Clock,
  Building2,
  Users
} from 'lucide-react';

export default function AboutClient({
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
}) {
  const cart = useCartStore((state) => state.items);
  const removeOneZustand = useCartStore((state) => state.removeOne);
  const clearCartZustand = useCartStore((state) => state.clearCart);

  const wishlistIds = useWishlistStore((state) => state.wishlistIds);
  const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);

  React.useEffect(() => {
    fetchWishlist(apiUrl);
  }, [apiUrl, fetchWishlist]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isTelegramAuthOpen, setIsTelegramAuthOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const cartProducts = cart.map((c) => ({
    id: c._id,
    title: c.title,
    priceETB: c.price,
    image: c.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=1000&fit=crop&auto=format',
    vendorName: c.vendorId?.storeName || 'PALEO',
    category: 'Electronics',
    tag: '01 / ESCROW ITEM',
    condition: 'Like New',
    location: 'Adama',
    vendorRating: 4.9,
    description: '',
    specs: {},
    escrowStatus: 'Available'
  }));

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1F1E1B] font-sans antialiased">
      
      {/* Frame 14-994: Paleo About Navigation Header */}
      <PaleoNavigation
        cartCount={cart.length}
        wishlistCount={wishlistIds.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSell={() => setIsSellOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenWishlist={() => {}}
        onOpenAccount={() => setIsTelegramAuthOpen(true)}
      />

      {/* Frame 14-1018: About Hero Section */}
      <section className="relative pt-20 pb-28 overflow-hidden border-b border-[#E8E4DC]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{ backgroundImage: `url('/assets/landingPaleo.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5]/95 via-[#FAF8F5]/90 to-[#FAF8F5] z-0 backdrop-blur-[2px]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#EFECE6]/90 backdrop-blur-md border border-[#E2DDD3] rounded-full text-xs font-mono text-[#625D54]">
            <span className="w-2 h-2 rounded-full bg-[#C85A32] animate-pulse" />
            <span>OUR MANIFESTO</span>
            <span className="text-[#A5A096]">|</span>
            <span className="text-[#1F1E1B] font-semibold">The Architecture of Longevity</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-7xl font-normal text-[#1F1E1B] tracking-tight leading-[1.05]">
            Objects built to outlive <br />
            <span className="italic font-light text-[#EB5B00]">ephemeral</span> trends.
          </h1>

          <p className="font-sans text-lg sm:text-xl text-[#524E46] font-light leading-relaxed max-w-2xl mx-auto">
            <strong className="text-[#1F1E1B] font-semibold">ገልጋይ (Gelgay)</strong> is Adama’s curated marketplace for authenticated vintage electronics, mid-century furniture, archival apparel, and studio gear. <em>Good things deserve second life.</em>
          </p>

          <div className="pt-4 flex items-center justify-center gap-4">
            <Link
              href="/shop"
              className="px-8 py-4 bg-[#1F1E1B] text-[#FAF8F5] font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#EB5B00] transition-all shadow-lg flex items-center gap-2"
            >
              <span>Explore The Archive</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={() => setIsSellOpen(true)}
              className="px-8 py-4 bg-white/80 border border-[#1F1E1B] text-[#1F1E1B] font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#EFECE6] transition-all shadow-xs"
            >
              Become a Curator
            </button>
          </div>
        </div>
      </section>

      {/* Frame 14-1023: Mission & Heritage Philosophy */}
      <section className="py-24 bg-white border-b border-[#E8E4DC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <span className="font-mono text-xs uppercase tracking-widest text-[#EB5B00] font-semibold block">
                01 / PHILOSOPHY
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#1F1E1B] leading-tight">
                Why we created ገልጋይ (Gelgay).
              </h2>
              <p className="font-sans text-base text-[#625D54] font-light leading-relaxed">
                In an era dominated by disposable plastic and planned obsolescence, rare industrial masterworks and design classics often languish in storage or get lost in chaotic unverified classifieds.
              </p>
              <p className="font-sans text-base text-[#625D54] font-light leading-relaxed">
                We engineered a trusted escrow protocol paired with in-person courier verification, allowing collectors in Ethiopia to trade rare artifacts with total safety.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-8 bg-white/80 backdrop-blur-md border border-white/70 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:bg-white/95 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF3F0] text-[#C85A32] flex items-center justify-center">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-[#1F1E1B]">Curated Selection</h3>
                <p className="font-sans text-sm text-[#625D54] font-light leading-relaxed">
                  Every listed item is reviewed for design relevance, physical condition, and historical provenance.
                </p>
              </div>

              <div className="p-8 bg-white/80 backdrop-blur-md border border-white/70 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:bg-white/95 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF3F0] text-[#C85A32] flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-[#1F1E1B]">100% Escrow Vault</h3>
                <p className="font-sans text-sm text-[#625D54] font-light leading-relaxed">
                  Funds are secured in escrow until the courier physical inspection passes and you test the item for 48 hours.
                </p>
              </div>

              <div className="p-8 bg-white/80 backdrop-blur-md border border-white/70 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:bg-white/95 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF3F0] text-[#C85A32] flex items-center justify-center">
                  <Layers className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-[#1F1E1B]">Neighborhood Hubs</h3>
                <p className="font-sans text-sm text-[#625D54] font-light leading-relaxed">
                  Direct physical dispatches connecting Kazanchis, Bole Atlas, CMC, Sarbet, and Old Airport.
                </p>
              </div>

              <div className="p-8 bg-white/80 backdrop-blur-md border border-white/70 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:bg-white/95 transition-all duration-300 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF3F0] text-[#C85A32] flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-bold text-[#1F1E1B]">Python OCR Speed</h3>
                <p className="font-sans text-sm text-[#625D54] font-light leading-relaxed">
                  Instant bank transfer verification via automated Tesseract OCR for CBE, Telebirr, and Awash.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Frame 14-1029: Escrow & Verification Pillars */}
      <section className="py-24 bg-[#FAF8F5] border-b border-[#E8E4DC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="font-mono text-xs uppercase tracking-widest text-[#C85A32] font-semibold">
              02 / ESCROW PROTOCOL
            </span>
            <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#1F1E1B]">
              How Escrow Protects Both Sides
            </h2>
            <p className="font-sans text-base text-[#625D54] font-light">
              We eliminate cash fraud, damaged handoffs, and seller payment delays.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/80 backdrop-blur-md border border-white/70 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:bg-white/95 transition-all duration-300 space-y-4">
              <span className="font-mono text-4xl font-bold text-[#C85A32]">01</span>
              <h3 className="font-serif text-2xl font-bold text-[#1F1E1B]">Buyer Pays Vault</h3>
              <p className="font-sans text-sm text-[#625D54] font-light leading-relaxed">
                Buyer deposits payment via CBE, Telebirr, or Chapa. Python OCR validates the receipt and locks funds in escrow.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-md border border-white/70 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:bg-white/95 transition-all duration-300 space-y-4">
              <span className="font-mono text-4xl font-bold text-[#EB5B00]">02</span>
              <h3 className="font-serif text-2xl font-bold text-[#1F1E1B]">Physical Spec Check</h3>
              <p className="font-sans text-sm text-[#625D54] font-light leading-relaxed">
                A verified ገልጋይ courier arrives at the vendor's studio, verifies cosmetic condition and operational status before handoff.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-md border border-white/70 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-xl hover:bg-white/95 transition-all duration-300 space-y-4">
              <span className="font-mono text-4xl font-bold text-[#C85A32]">03</span>
              <h3 className="font-serif text-2xl font-bold text-[#1F1E1B]">48h Test & Payout</h3>
              <p className="font-sans text-sm text-[#625D54] font-light leading-relaxed">
                Buyer receives the item and has 48 hours to inspect. Upon approval, funds are immediately disbursed to the vendor’s Ethiopian bank.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Frame 14-1046: Adama Neighborhood Story */}
      <FeaturedVendors />

      {/* Frame 14-1071: Curator Standards & Inspection Protocols */}
      <section className="py-24 bg-white border-b border-[#E8E4DC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <span className="font-mono text-xs uppercase tracking-widest text-[#C85A32] font-semibold block">
                04 / QUALITY CONTROL
              </span>
              <h2 className="font-serif text-4xl sm:text-5xl font-normal text-[#1F1E1B] leading-tight">
                Our 5-Point Curator Inspection Standard.
              </h2>
              <p className="font-sans text-base text-[#625D54] font-light leading-relaxed">
                Before any piece enters the live archive or leaves a curator’s studio, it must pass our multi-tier verification process:
              </p>

              <div className="space-y-3 font-sans text-sm">
                <div className="flex items-start gap-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E4DC]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#1F1E1B] block font-serif">1. Power & Circuit Integrity</strong>
                    <span className="text-[#625D54] font-light">Capacitors, motors, optical pickups, and audio pots tested for zero hum or dropouts.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E4DC]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#1F1E1B] block font-serif">2. Chassis & Cosmetic Grade</strong>
                    <span className="text-[#625D54] font-light">Honest grading: Like New, Excellent, Good, or Restored with full flaw disclosures.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E4DC]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-[#1F1E1B] block font-serif">3. Serial Number & Provenance</strong>
                    <span className="text-[#625D54] font-light">Cross-checked against manufacturer archive records and vendor ownership.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="relative aspect-4/3 rounded-3xl overflow-hidden border border-[#E2DDD3] shadow-2xl">
                <img
                  src="/assets/front.jpg"
                  alt="Inspection Process"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-8">
                  <div className="text-white space-y-1">
                    <span className="font-mono text-xs text-[#C85A32] uppercase tracking-wider font-semibold">
                      INSPECTION LAB • ADAMA
                    </span>
                    <h4 className="font-serif text-2xl font-bold">Authenticated by hand.</h4>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Frame 14-1081: Join Community / Sell CTA Frame */}
      <section className="relative py-24 bg-[#1F1E1B] text-[#FAF8F5] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 z-0"
          style={{ backgroundImage: `url('/assets/tree.jpg')` }}
        />
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-6">
          <span className="font-mono text-xs uppercase tracking-widest text-[#EB5B00] font-semibold">
            PARTNER WITH ገልጋይ (GELGAY)
          </span>
          <h2 className="font-serif text-4xl sm:text-6xl font-normal text-white">
            Have timeless pieces in your collection?
          </h2>
          <p className="font-sans text-base sm:text-lg text-[#A5A096] font-light max-w-xl mx-auto">
            List your design objects with guaranteed escrow payouts, free courier dispatch, and zero listing fees.
          </p>

          <div className="pt-4 flex items-center justify-center gap-4">
            <button
              onClick={() => setIsSellOpen(true)}
              className="px-8 py-4 bg-[#EB5B00] text-white font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#FF6B10] transition-colors shadow-lg"
            >
              List an Item Now
            </button>
            <Link
              href="/buyer-protection"
              className="px-8 py-4 bg-[#2B2824] border border-[#3A3732] text-white font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#363430] transition-colors"
            >
              Escrow Protection Protocol
            </Link>
          </div>
        </div>
      </section>

      {/* Inter-page Flow Navigation */}
      <PageNavigationFlow
        breadcrumbs={[{ label: 'About ገልጋይ' }]}
        prev={{ label: 'The ገልጋይ Ledger', sublabel: 'Curator stories & neighborhood dispatches', href: '/testimonials' }}
        next={{ label: 'Frequently Asked Questions', sublabel: 'Escrow release, condition grading & dispatch FAQ', href: '/faq' }}
      />

      {/* Frame 14-1088: About Footer Frame */}
      <InlineAuthFooter onAccountClick={() => setIsTelegramAuthOpen(true)} apiUrl={apiUrl} />

      {/* Modals */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartProducts={cartProducts}
        onRemoveFromCart={(id) => removeOneZustand(id)}
        onClearCart={clearCartZustand}
      />
      <SellItemModal isOpen={isSellOpen} onClose={() => setIsSellOpen(false)} onAddProduct={() => setIsSellOpen(false)} />
      <TelegramAuthModal
        isOpen={isTelegramAuthOpen}
        onClose={() => setIsTelegramAuthOpen(false)}
        apiUrl={apiUrl}
        onOpenSell={() => setIsSellOpen(true)}
      />
      <BigSearchBar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelectProduct={() => setIsSearchOpen(false)} />

    </div>
  );
}
