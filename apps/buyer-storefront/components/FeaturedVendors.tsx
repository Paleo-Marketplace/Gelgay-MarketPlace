'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, MapPin, Star, ArrowRight, CheckCircle2, Truck, Award, Store } from 'lucide-react';

interface FeaturedVendorsProps {
  onExploreVendors?: () => void;
  apiUrl?: string;
}

const DEFAULT_FEATURED = [
  {
    id: 'v1',
    name: 'Yared M. Audio Archive',
    specialty: 'Analog & Vintage Sound Systems',
    location: 'Posta Bet / Bole, Adama',
    rating: 4.95,
    salesCount: 142,
    badge: 'Verified Master Seller',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&auto=format',
    featuredItem: 'Dieter Rams Braun ET66 & Sony Walkmans',
    category: 'Electronics'
  },
  {
    id: 'v2',
    name: 'Makeda Mid-Century Studio',
    specialty: 'Restored Teak & Sculptural Furniture',
    location: 'Dembi / Geda, Adama',
    rating: 4.92,
    salesCount: 89,
    badge: 'Curated Artisan',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&auto=format',
    featuredItem: 'Hand-sanded Danish Lounge Chairs & Oak Desks',
    category: 'Furniture'
  },
  {
    id: 'v3',
    name: 'Abebe Film & Optics Lab',
    specialty: '35mm Mechanical Cameras & Studio Gear',
    location: 'Boku Shenen, Adama',
    rating: 4.98,
    salesCount: 215,
    badge: 'Optical Specialist',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&auto=format',
    featuredItem: 'Calibrated Leica M3, Hasselblad & Prime Glass',
    category: 'Studio'
  }
];

export default function FeaturedVendors({
  onExploreVendors,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
}: FeaturedVendorsProps) {
  const [vendors, setVendors] = React.useState(DEFAULT_FEATURED);

  React.useEffect(() => {
    fetch(`${apiUrl}/api/vendors/featured`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.vendors) && data.vendors.length > 0) {
          const mapped = data.vendors.map((v: any, i: number) => ({
            id: v._id || `v-${i}`,
            name: v.storeName || v.userId?.displayName || 'PALEO Curator',
            specialty: v.address || 'Curated Archive Studio',
            location: v.address || 'Adama',
            rating: typeof v.rating === 'object' && v.rating !== null ? Number(v.rating.average || 4.95) : Number(v.rating || 4.95),
            salesCount: v.rating?.count || 50,
            badge: 'Verified Curator',
            avatar: v.userId?.avatar || DEFAULT_FEATURED[i % DEFAULT_FEATURED.length].avatar,
            featuredItem: 'Curated Heritage Archive',
            category: 'Electronics'
          }));
          setVendors(mapped);
        }
      })
      .catch(() => {});
  }, [apiUrl]);

  return (
    <section id="vendors" className="relative py-24 border-b border-[#E8E4DC] dark:border-[#33302B] overflow-hidden bg-[#FAF8F5] dark:bg-[#141312]">
      {/* Background Atmosphere */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `url('/assets/light.jpg')`,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F5]/98 via-[#FAF8F5]/92 to-[#FAF8F5]/98 dark:from-[#141312]/98 dark:via-[#141312]/92 dark:to-[#141312]/98 z-0 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 pb-6 border-b border-[#E8E4DC] dark:border-[#33302B]">
          <div className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[#C85A32] font-semibold flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#C85A32]" />
              VERIFIED LOCAL SELLERS
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl font-normal text-[#1F1E1B] dark:text-[#FAF8F5] tracking-tight">
              Adama neighborhood merchants
            </h2>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-6 md:mt-0">
            <p className="font-sans text-sm text-[#625D54] dark:text-[#A8A296] max-w-sm font-light leading-relaxed">
              Identity-verified curators across Posta Bet, Geda, and Boku Shenen. All purchases protected under PALEO Escrow.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1F1E1B] dark:bg-[#2B2824] text-[#FAF8F5] dark:border dark:border-[#3A3732] rounded-full font-mono text-xs uppercase tracking-wider font-semibold hover:bg-[#C85A32] transition-all shadow-sm shrink-0 self-start sm:self-auto"
            >
              <span>Explore All Curators</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Vendor Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white/95 dark:bg-[#1E1C1A]/95 backdrop-blur-md border border-[#E2DDD3] dark:border-[#33302B] p-8 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col justify-between group hover:border-[#C85A32]"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#C85A32]/40 group-hover:border-[#C85A32] transition-colors">
                    <img
                      src={vendor.avatar}
                      alt={vendor.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="px-3 py-1 bg-[#FAF3F0] dark:bg-[#2B2824] border border-[#C85A32]/20 rounded-full text-[11px] font-mono text-[#C85A32] font-semibold">
                    {vendor.badge}
                  </span>
                </div>

                <h3 className="font-serif text-2xl font-bold text-[#1F1E1B] dark:text-[#FAF8F5] mb-1 group-hover:text-[#C85A32] transition-colors">
                  {vendor.name}
                </h3>
                
                <p className="font-mono text-xs text-[#7C776E] dark:text-[#A8A296] font-medium mb-3">
                  {vendor.specialty}
                </p>

                <div className="space-y-2 pt-3 border-t border-[#E8E4DC] dark:border-[#33302B] font-mono text-xs text-[#625D54] dark:text-[#A8A296]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#C85A32]" /> {vendor.location}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-[#1F1E1B] dark:text-[#FAF8F5]">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {(Number(typeof vendor.rating === 'object' && vendor.rating !== null ? (vendor.rating as any).average : vendor.rating) || 4.9).toFixed(1)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span>Verified Handoffs:</span>
                    <span className="font-semibold text-[#1F1E1B] dark:text-[#FAF8F5]">{vendor.salesCount} orders</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-[#FAF8F5] dark:bg-[#141312] border border-[#E2DDD3] dark:border-[#33302B] rounded-xl text-xs font-sans text-[#524E46] dark:text-[#A8A296]">
                  <span className="font-mono text-[10px] uppercase text-[#7C776E] dark:text-[#A8A296] block mb-0.5 font-bold">Top Curation:</span>
                  <p className="font-medium text-[#1F1E1B] dark:text-[#FAF8F5] line-clamp-1">{vendor.featuredItem}</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E8E4DC] dark:border-[#33302B] flex items-center justify-between font-mono text-xs text-[#1F1E1B] dark:text-[#FAF8F5]">
                <Link
                  href={`/shop?category=${encodeURIComponent(vendor.category)}`}
                  className="inline-flex items-center gap-1 text-[#C85A32] font-semibold hover:underline"
                >
                  <span>View Archive</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href={`/shop?category=${encodeURIComponent(vendor.category)}`}
                  className="text-[11px] text-[#7C776E] hover:text-[#1F1E1B] flex items-center gap-1"
                >
                  <Store className="w-3.5 h-3.5 text-[#C85A32]" />
                  <span>Verified Studio</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* 3 Escrow Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-[#E8E4DC]">
          <div className="flex items-start gap-4 p-5 bg-white border border-[#E2DDD3] rounded-2xl shadow-xs">
            <div className="p-2.5 bg-[#FAF3F0] text-[#C85A32] rounded-xl shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif text-base font-bold text-[#1F1E1B]">100% Escrow Protection</h4>
              <p className="font-sans text-xs text-[#625D54] mt-1 font-light leading-relaxed">
                Funds are held in secure platform escrow until you inspect your item upon physical delivery.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 bg-white border border-[#E2DDD3] rounded-2xl shadow-xs">
            <div className="p-2.5 bg-[#FAF3F0] text-[#C85A32] rounded-xl shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif text-base font-bold text-[#1F1E1B]">Adama Same-Day Handoff</h4>
              <p className="font-sans text-xs text-[#625D54] mt-1 font-light leading-relaxed">
                Direct neighborhood courier delivery across Posta Bet, Geda, Boku Shenen, Daka Adu, and Goro ASTU.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 bg-white border border-[#E2DDD3] rounded-2xl shadow-xs">
            <div className="p-2.5 bg-[#FAF3F0] text-[#C85A32] rounded-xl shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-serif text-base font-bold text-[#1F1E1B]">Verified Condition Guarantee</h4>
              <p className="font-sans text-xs text-[#625D54] mt-1 font-light leading-relaxed">
                Every piece is authenticated with real photos, condition ratings, and working guarantees.
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
