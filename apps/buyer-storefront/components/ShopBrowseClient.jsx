'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import PaleoNavigation from './PaleoNavigation';
import InlineAuthFooter from './InlineAuthFooter';
import CartDrawer from './CartDrawer';
import SellItemModal from './SellItemModal';
import ProductDetailModal from './ProductDetailModal';
import TelegramAuthModal from './TelegramAuthModal';
import BigSearchBar from './BigSearchBar';
import PageNavigationFlow from './PageNavigationFlow';
import { useCartStore } from '../app/stores/useCartStore';
import { useWishlistStore } from '../app/stores/useWishlistStore';
import { Search, Heart, ShoppingBag, SlidersHorizontal, ArrowUpDown, ShieldCheck, MapPin, CheckCircle2 } from 'lucide-react';

export default function ShopBrowseClient({ initialProducts, apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000' }) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const categoryFromUrl = searchParams ? searchParams.get('category') : null;

  // Zustand Cart Store
  const cart = useCartStore((state) => state.items);
  const addToCartZustand = useCartStore((state) => state.addItem);
  const removeOneZustand = useCartStore((state) => state.removeOne);
  const clearCartZustand = useCartStore((state) => state.clearCart);

  // Zustand Wishlist Store
  const wishlistIds = useWishlistStore((state) => state.wishlistIds);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);

  // Filter States
  const [activeCategory, setActiveCategory] = useState(categoryFromUrl || 'All');
  const [activeCondition, setActiveCondition] = useState('All');
  const [activeNeighborhood, setActiveNeighborhood] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isTelegramAuthOpen, setIsTelegramAuthOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currency, setCurrency] = useState('ETB');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [reviewModalProduct, setReviewModalProduct] = useState(null);

  // Query Backend for products
  const { data: dbProducts = initialProducts || [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/api/products`);
      if (!res.ok) throw new Error('Failed to fetch catalog');
      const data = await res.json();
      return Array.isArray(data.products) ? data.products : [];
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 15000
  });

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    fetchWishlist(apiUrl);
  }, [apiUrl, fetchWishlist, queryClient]);

  // Real-time stock update
  useEffect(() => {
    const socket = io(apiUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      timeout: 10000
    });
    socket.on('inventory:stock:update', () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    });
    return () => {
      socket.disconnect();
    };
  }, [apiUrl, queryClient]);

  // Live DB products
  const allProducts = useMemo(() => {
    return (Array.isArray(dbProducts) ? dbProducts : []).map((p) => {
      const vendorName = p.vendorId?.storeName || 'ገልጋይ Verified';
      const vendorRating = typeof p.vendorId?.rating === 'object' && p.vendorId?.rating !== null ? Number(p.vendorId.rating.average || 4.9) : Number(p.vendorId?.rating || 4.9);
      return {
        id: p._id,
        title: p.title,
        category: p.category || 'Electronics',
        tag: p.category === 'Electronics' ? '01 / EVERYDAY CARRY' : p.category === 'Furniture' ? '02 / HOME ARCHIVE' : p.category === 'Studio' ? '03 / CREATIVE TOOLS' : p.category === 'Fashion' ? '04 / ARCHIVAL WEAR' : '05 / PAPER ARCHIVE',
        condition: p.condition || 'Like New',
        priceETB: p.price,
        location: p.location?.label || 'Adama',
        vendorName,
        vendorRating,
        image: p.images?.[0] || 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=1200&q=80',
        description: p.description || 'Curated archival piece with escrow protection.',
        specs: p.specs && typeof p.specs === 'object' ? (p.specs instanceof Map ? Object.fromEntries(p.specs) : p.specs) : { 'Physical Spec': 'Verified', 'Courier Check': 'Passed' },
        escrowStatus: p.stock > 0 ? 'Available' : 'Out of Stock'
      };
    });
  }, [dbProducts]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return allProducts.filter((p) => {
      const matchCat = activeCategory === 'All' || p.category.toLowerCase() === activeCategory.toLowerCase();
      const matchCond = activeCondition === 'All' || p.condition.toLowerCase() === activeCondition.toLowerCase();
      const matchLoc = activeNeighborhood === 'All' || p.location.toLowerCase().includes(activeNeighborhood.toLowerCase());
      const matchSearch = !searchQuery || p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchCond && matchLoc && matchSearch;
    }).sort((a, b) => {
      if (sortBy === 'price-low') return a.priceETB - b.priceETB;
      if (sortBy === 'price-high') return b.priceETB - a.priceETB;
      return 0;
    });
  }, [allProducts, activeCategory, activeCondition, activeNeighborhood, searchQuery, sortBy]);

  const cartProducts = cart.map(c => ({
    id: c._id,
    title: c.title,
    priceETB: c.price,
    image: c.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=1000&fit=crop&auto=format',
    vendorName: c.vendorId?.storeName || 'ገልጋይ',
    category: 'Electronics',
    tag: '01 / ESCROW ITEM',
    condition: 'Like New',
    location: 'Adama',
    vendorRating: 4.9,
    description: '',
    specs: {},
    escrowStatus: 'Available'
  }));

  const formatPrice = (priceETB) => {
    if (currency === 'USD') {
      return `$${Math.round(priceETB / 125).toLocaleString()}`;
    }
    return `${priceETB.toLocaleString()} ETB`;
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1F1E1B] font-sans antialiased">
      
      {/* Frame 14-412: Paleo Shop Navigation Header */}
      <PaleoNavigation
        cartCount={cart.length}
        wishlistCount={wishlistIds.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSell={() => setIsSellOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenWishlist={() => {}}
        onOpenAccount={() => setIsTelegramAuthOpen(true)}
      />

      {/* Frame 14-436: Main Shop Browse Hero Header */}
      <div className="bg-[#FAF8F5] border-b border-[#E8E4DC] pt-6 pb-8 sm:pt-12 sm:pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
            
            <div className="space-y-2 sm:space-y-3">
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1 bg-[#EFECE6] border border-[#E2DDD3] rounded-full text-[10px] sm:text-xs font-mono text-[#C85A32]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C85A32] animate-pulse"></span>
                <span>AUTHENTICATED ARCHIVES</span>
                <span className="text-[#A5A096] hidden sm:inline">|</span>
                <span className="text-[#1F1E1B] font-semibold hidden sm:inline">{filteredProducts.length} Pieces Available</span>
              </div>

              <h1 className="font-serif text-2xl sm:text-4xl md:text-6xl font-normal text-[#1F1E1B] tracking-tight">
                Shop the Archive
              </h1>
              
              <p className="font-sans text-xs sm:text-base text-[#625D54] font-light max-w-xl leading-relaxed">
                Inspected pre-owned electronics, furniture, studio gear, and archival garments curated across Adama with 100% escrow protection.
              </p>
            </div>

            {/* Currency & Quick Stats */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-[#EFECE6] p-1 rounded-xl border border-[#E2DDD3] font-mono text-xs">
                <button
                  onClick={() => setCurrency('ETB')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    currency === 'ETB' ? 'bg-[#1F1E1B] text-[#FAF8F5] shadow-xs' : 'text-[#625D54] hover:text-[#1F1E1B]'
                  }`}
                >
                  ETB (Br)
                </button>
                <button
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    currency === 'USD' ? 'bg-[#1F1E1B] text-[#FAF8F5] shadow-xs' : 'text-[#625D54] hover:text-[#1F1E1B]'
                  }`}
                >
                  USD ($)
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Frame 14-436: Filter Toolbar & Controls */}
      <div className="sticky top-0 z-30 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E8E4DC] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          
          {/* Top Bar: Search Input & Sorters */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Live Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-[#7C776E] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search archive titles, brands, eras..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#E2DDD3] rounded-xl text-xs font-sans placeholder-[#8F8A80] focus:outline-none focus:border-[#C85A32]"
              />
            </div>

            {/* Sorter & Neighborhood Selectors */}
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
              
              {/* Neighborhood Filter */}
              <select
                value={activeNeighborhood}
                onChange={(e) => setActiveNeighborhood(e.target.value)}
                className="px-3 py-2 bg-white border border-[#E2DDD3] rounded-xl text-xs font-mono text-[#1F1E1B] focus:outline-none focus:border-[#C85A32]"
              >
                <option value="All">All Neighborhoods</option>
                <option value="Kazanchis">Kazanchis</option>
                <option value="Bole">Bole Atlas</option>
                <option value="CMC">CMC</option>
                <option value="Sarbet">Sarbet</option>
              </select>

              {/* Condition Filter */}
              <select
                value={activeCondition}
                onChange={(e) => setActiveCondition(e.target.value)}
                className="px-3 py-2 bg-white border border-[#E2DDD3] rounded-xl text-xs font-mono text-[#1F1E1B] focus:outline-none focus:border-[#C85A32]"
              >
                <option value="All">All Conditions</option>
                <option value="Like New">Like New</option>
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Restored">Restored</option>
              </select>

              {/* Price / Newest Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-white border border-[#E2DDD3] rounded-xl text-xs font-mono text-[#1F1E1B] focus:outline-none focus:border-[#C85A32]"
              >
                <option value="newest">Recently Listed</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>

            </div>

          </div>

          {/* Bottom Bar: Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1">
            {['All', 'Electronics', 'Furniture', 'Studio', 'Fashion', 'Books'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full font-mono text-xs tracking-wider uppercase transition-all shrink-0 ${
                  activeCategory === cat
                    ? 'bg-[#1F1E1B] text-[#FAF8F5] font-semibold shadow-xs'
                    : 'bg-[#EFECE6] text-[#625D54] hover:bg-[#E2DDD3] hover:text-[#1F1E1B]'
                }`}
              >
                {cat === 'All' ? 'All Archives' : cat}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Frame 14-436: Main Editorial Product Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white border border-[#E2DDD3] rounded-2xl p-8 space-y-4">
            <h3 className="font-serif text-2xl text-[#1F1E1B]">No pieces match your filters.</h3>
            <p className="font-sans text-sm text-[#625D54] font-light">
              Try adjusting your category, neighborhood, or search keywords.
            </p>
            <button
              onClick={() => { setActiveCategory('All'); setActiveCondition('All'); setActiveNeighborhood('All'); setSearchQuery(''); }}
              className="px-6 py-2.5 bg-[#1F1E1B] text-white font-mono text-xs uppercase tracking-wider rounded-xl font-semibold hover:bg-[#C85A32]"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-6">
            {filteredProducts.map((p) => {
              const isWishlisted = wishlistIds.includes(p.id);
              const inCart = cart.some((c) => c._id === p.id);

              return (
                <div
                  key={p.id}
                  className="group bg-white/85 backdrop-blur-md border border-white/70 rounded-xl sm:rounded-3xl overflow-hidden hover:border-[#C85A32]/60 hover:shadow-2xl hover:bg-white/95 transition-all duration-500 flex flex-col justify-between shadow-xs sm:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                >
                  {/* Image & Badges */}
                  <div
                    onClick={() => setSelectedProduct(p)}
                    className="relative aspect-square sm:aspect-4/3 overflow-hidden bg-[#EFECE6] cursor-pointer"
                  >
                    <img
                      src={p.image}
                      alt={p.title}
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=1000&fit=crop&auto=format';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Category / Condition Badge */}
                    <div className="absolute top-1.5 left-1.5 sm:top-3 sm:left-3 flex flex-col gap-1">
                      <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-[#1F1E1B]/90 backdrop-blur-xs text-[#FAF8F5] text-[8px] sm:text-[10px] font-mono uppercase tracking-wider rounded-sm font-semibold">
                        {p.condition}
                      </span>
                    </div>

                    {/* Wishlist Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(p.id, apiUrl);
                      }}
                      className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center bg-white/90 backdrop-blur-xs rounded-full text-[#1F1E1B] hover:text-[#C85A32] shadow-xs transition-colors"
                      title="Add to wishlist"
                    >
                      <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-[#C85A32] text-[#C85A32]' : ''}`} />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-2 sm:p-4 flex flex-col flex-1 justify-between space-y-2 sm:space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[9px] sm:text-[11px] font-mono text-[#7C776E]">
                        <span className="truncate max-w-[50%]">{p.tag?.split('/')[1] || p.tag}</span>
                        <span className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                          <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#C85A32]" />
                          {p.location.split(',')[0]}
                        </span>
                      </div>

                      <h3
                        onClick={() => setSelectedProduct(p)}
                        className="font-serif text-xs sm:text-base font-bold text-[#1F1E1B] group-hover:text-[#C85A32] transition-colors cursor-pointer line-clamp-1"
                      >
                        {p.title}
                      </h3>

                      <p className="hidden sm:block font-sans text-xs text-[#625D54] font-light line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>
                    </div>

                    {/* Price & Add to Cart */}
                    <div className="pt-1.5 sm:pt-3 border-t border-[#E8E4DC] flex items-center justify-between">
                      <div>
                        <span className="font-mono text-[8px] sm:text-[10px] text-[#7C776E] block uppercase">Price</span>
                        <span className="font-mono text-xs sm:text-base font-bold text-[#1F1E1B]">
                          {formatPrice(p.priceETB)}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          addToCartZustand({
                            _id: p._id || p.id,
                            title: p.title,
                            price: Number(p.price) || Number(p.priceETB) || 0,
                            images: Array.isArray(p.images) ? p.images : [p.image],
                            vendorId: p.vendorId || { storeName: p.vendorName }
                          });
                          setIsCartOpen(true);
                        }}
                        className={`px-2 py-1 sm:px-3.5 sm:py-2 rounded-md sm:rounded-xl font-mono text-[9px] sm:text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1 ${
                          inCart
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#1F1E1B] text-[#FAF8F5] hover:bg-[#C85A32]'
                        }`}
                      >
                        {inCart ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span>In Cart</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inter-page Flow Navigation */}
      <PageNavigationFlow
        breadcrumbs={[{ label: 'Shop the Archive' }]}
        prev={{ label: 'Curated Categories', sublabel: 'Explore collections by feeling', href: '/categories' }}
        next={{ label: 'Buyer Protection', sublabel: 'Learn about our 100% Escrow Protocol', href: '/buyer-protection' }}
      />

      {/* Frame 14-631: Shop Footer Frame */}
      <InlineAuthFooter onAccountClick={() => setIsTelegramAuthOpen(true)} apiUrl={apiUrl} />

      {/* Modals & Drawers */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartProducts={cartProducts}
        onRemoveFromCart={(id) => removeOneZustand(id)}
        onClearCart={clearCartZustand}
      />

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        isWishlisted={selectedProduct ? wishlistIds.includes(selectedProduct.id) : false}
        isInCart={selectedProduct ? cart.some((c) => c._id === selectedProduct.id) : false}
        onToggleWishlist={(id) => toggleWishlist(id, apiUrl)}
        onAddToCart={(p) => {
          addToCartZustand({
            _id: p._id || p.id,
            title: p.title,
            price: Number(p.price) || Number(p.priceETB) || 0,
            images: Array.isArray(p.images) ? p.images : [p.image],
            vendorId: p.vendorId || { storeName: p.vendorName }
          });
          setIsCartOpen(true);
        }}
      />

      <SellItemModal isOpen={isSellOpen} onClose={() => setIsSellOpen(false)} onAddProduct={() => setIsSellOpen(false)} />
      <TelegramAuthModal
        isOpen={isTelegramAuthOpen}
        onClose={() => setIsTelegramAuthOpen(false)}
        apiUrl={apiUrl}
        onOpenSell={() => setIsSellOpen(true)}
      />
      <BigSearchBar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelectProduct={(p) => { setSelectedProduct(p); setIsSearchOpen(false); }} />

    </div>
  );
}
