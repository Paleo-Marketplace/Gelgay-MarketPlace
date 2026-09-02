import React, { useState } from 'react';
import { Product } from '../data/paleoData';
import { Heart, MapPin, Star, ShieldCheck, Eye, Plus, Check } from './Icons';

interface MasonryFeedProps {
  products: Product[];
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  wishlistIds: string[];
  cartIds: string[];
  onToggleWishlist: (productId: string) => void;
  onAddToCart: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
}

export default function MasonryFeed({
  products,
  activeCategory,
  setActiveCategory,
  wishlistIds,
  cartIds,
  onToggleWishlist,
  onAddToCart,
  onSelectProduct
}: MasonryFeedProps) {
  const [currency, setCurrency] = useState<'ETB' | 'USD'>('ETB');

  const categories = ['All', 'Electronics', 'Furniture', 'Studio', 'Fashion', 'Books'];

  const filteredProducts = activeCategory === 'All'
    ? products
    : products.filter(p => p.category === activeCategory);

  const formatPrice = (amountETB: number) => {
    if (currency === 'ETB') {
      return `${amountETB.toLocaleString()} ETB`;
    }
    // Approx ETB to USD conversion rate
    const usd = (amountETB / 125).toFixed(0);
    return `$${usd} USD`;
  };

  return (
    <section id="products" className="py-10 sm:py-20 bg-[#FAF8F5] dark:bg-[#141312] border-b border-[#E8E4DC] dark:border-[#33302B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-[#E8E4DC] dark:border-[#33302B]">
          <div>
            <span className="font-mono text-[10px] sm:text-xs uppercase tracking-widest text-[#C85A32] font-semibold">
              LIVE CATALOG
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl md:text-5xl font-normal text-[#1F1E1B] dark:text-[#FAF8F5] mt-1 sm:mt-2">
              Recently listed
            </h2>
          </div>

          {/* Currency Toggle */}
          <div className="mt-4 md:mt-0 flex items-center gap-3">
            <span className="font-mono text-xs text-[#7C776E] dark:text-[#A8A296]">Currency:</span>
            <div className="inline-flex bg-[#EFECE6] dark:bg-[#22201D] p-1 border border-[#E2DDD3] dark:border-[#33302B] rounded-full text-xs font-mono">
              <button
                onClick={() => setCurrency('ETB')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  currency === 'ETB' ? 'bg-[#1F1E1B] dark:bg-[#FAF8F5] text-white dark:text-[#1F1E1B]' : 'text-[#625D54] dark:text-[#A8A296]'
                }`}
              >
                ETB ( Birr )
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  currency === 'USD' ? 'bg-[#1F1E1B] dark:bg-[#FAF8F5] text-white dark:text-[#1F1E1B]' : 'text-[#625D54] dark:text-[#A8A296]'
                }`}
              >
                USD ( $ )
              </button>
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all whitespace-nowrap border ${
                activeCategory === cat
                  ? 'bg-[#1F1E1B] text-[#FAF8F5] border-[#1F1E1B] dark:bg-[#FAF8F5] dark:text-[#1F1E1B] dark:border-[#FAF8F5]'
                  : 'bg-[#EFECE6] text-[#625D54] border-[#E2DDD3] dark:bg-[#22201D] dark:text-[#A8A296] dark:border-[#33302B] hover:border-[#1F1E1B] hover:text-[#1F1E1B] dark:hover:text-[#FAF8F5]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Masonry Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white/80 border border-[#E2DDD3] rounded-3xl p-8 space-y-4 shadow-sm">
            <h3 className="font-serif text-2xl text-[#1F1E1B]">No archival pieces available</h3>
            <p className="font-sans text-sm text-[#625D54]">
              {activeCategory === 'All'
                ? 'No items currently listed in the marketplace. Check back soon for fresh curator drops!'
                : `No items currently listed under "${activeCategory}". Try selecting "All" or exploring another archive.`}
            </p>
            {activeCategory !== 'All' && (
              <button
                onClick={() => setActiveCategory('All')}
                className="px-5 py-2.5 bg-[#1F1E1B] text-white font-mono text-xs uppercase tracking-wider rounded-xl hover:bg-[#C85A32] transition-colors"
              >
                Show All Archives
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
            {filteredProducts.map((product) => {
            const isWishlisted = wishlistIds.includes(product.id);
            const isInCart = cartIds.includes(product.id);

            return (
              <div
                key={product.id}
                className="group bg-white/85 dark:bg-[#1E1C1A]/95 backdrop-blur-md border border-white/70 dark:border-[#33302B] overflow-hidden flex flex-col hover:border-[#C85A32]/60 hover:bg-white/95 dark:hover:bg-[#252320] transition-all duration-500 rounded-xl sm:rounded-3xl shadow-xs sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-2xl"
              >
                {/* Image Container */}
                <div className="relative aspect-square sm:aspect-4/3 bg-[#EFECE6] dark:bg-[#252320] overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=1200&q=80';
                    }}
                  />

                  {/* Top Overlay Badges */}
                  <div className="absolute top-1.5 left-1.5 right-1.5 sm:top-3 sm:left-3 sm:right-3 flex items-center justify-between pointer-events-none">
                    <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-[#1F1E1B]/85 dark:bg-[#141312]/90 text-[#FAF8F5] backdrop-blur-md text-[8px] sm:text-[10px] font-mono tracking-wider uppercase rounded-sm">
                      {product.tag?.split('/')[1] || product.tag}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist(product.id);
                      }}
                      className={`pointer-events-auto w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors shadow-xs ${
                        isWishlisted
                          ? 'bg-[#C85A32] text-white'
                          : 'bg-white/85 dark:bg-[#2B2824]/90 backdrop-blur-md text-[#1F1E1B] dark:text-[#FAF8F5] hover:bg-white dark:hover:bg-[#363430]'
                      }`}
                      title={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                    >
                      <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Quick Inspect Button Overlay */}
                  <div className="hidden sm:flex absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity justify-center">
                    <button
                      onClick={() => onSelectProduct(product)}
                      className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white dark:bg-[#1F1E1B] text-[#1F1E1B] dark:text-[#FAF8F5] font-mono text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-[#C85A32] hover:text-white transition-colors rounded-lg"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Quick Inspect &amp; Specs
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-2 sm:p-4 flex-1 flex flex-col justify-between space-y-2 sm:space-y-3">
                  <div>
                    {/* Location & Rating */}
                    <div className="flex items-center justify-between text-[9px] sm:text-xs font-mono text-[#7C776E] dark:text-[#A8A296] mb-1">
                      <span className="flex items-center gap-0.5 sm:gap-1 text-[#524E46] dark:text-[#D1CBC0] truncate max-w-[50%]">
                        <MapPin className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-[#C85A32] shrink-0" />
                        <span className="truncate">{product.location?.split(',')[0]}</span>
                      </span>
                      <span className="flex items-center gap-0.5 text-amber-700 dark:text-amber-500 shrink-0">
                        <Star className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-current" />
                        {(Number(typeof product.vendorRating === 'object' && product.vendorRating !== null ? (product.vendorRating as any).average : product.vendorRating) || 4.9).toFixed(1)}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 
                      onClick={() => onSelectProduct(product)}
                      className="font-serif text-xs sm:text-lg font-medium text-[#1F1E1B] dark:text-[#FAF8F5] hover:text-[#C85A32] dark:hover:text-[#EB5B00] transition-colors cursor-pointer line-clamp-1 sm:line-clamp-2 leading-snug"
                    >
                      {product.title}
                    </h3>
                  </div>

                  {/* Condition & Price Footer */}
                  <div className="pt-1.5 sm:pt-2.5 border-t border-[#E8E4DC] dark:border-[#33302B] flex items-center justify-between">
                    <div>
                      <span className="text-[8px] sm:text-[10px] font-mono text-[#7C776E] dark:text-[#A8A296] uppercase tracking-wider block">
                        Condition
                      </span>
                      <span className="font-mono text-[9px] sm:text-xs font-semibold text-[#1F1E1B] dark:text-[#FAF8F5] truncate block max-w-[70px] sm:max-w-none">
                        {product.condition}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[8px] sm:text-[10px] font-mono text-[#7C776E] dark:text-[#A8A296] uppercase tracking-wider block">
                        Price
                      </span>
                      <span className="font-serif text-xs sm:text-base font-bold text-[#1F1E1B] dark:text-[#FAF8F5]">
                        {formatPrice(product.priceETB)}
                      </span>
                    </div>
                  </div>

                  {/* Cart Action Button */}
                  <button
                    onClick={() => onAddToCart(product)}
                    className={`w-full py-1.5 sm:py-2.5 rounded-md sm:rounded-xl font-mono text-[9px] sm:text-xs uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-1 sm:gap-2 ${
                      isInCart
                        ? 'bg-emerald-800 text-white'
                        : 'bg-[#1F1E1B] dark:bg-[#2B2824] text-[#FAF8F5] border border-transparent dark:border-[#3A3732] hover:bg-[#C85A32] dark:hover:bg-[#C85A32]'
                    }`}
                  >
                    {isInCart ? (
                      <>
                        <Check className="w-3 h-3 sm:w-4 sm:h-4" /> 
                        <span className="hidden sm:inline">In Cart / Escrow Locked</span>
                        <span className="inline sm:hidden">In Cart</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 sm:w-4 sm:h-4" /> 
                        <span className="hidden sm:inline">Reserve in Escrow</span>
                        <span className="inline sm:hidden">Reserve</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        )}

      </div>
    </section>
  );
}
