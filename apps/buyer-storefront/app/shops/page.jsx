'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Navigation,
  Search,
  Star,
  Clock,
  Truck,
  Store,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Phone,
  Package,
  Layers,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import PaleoNavigation from '../../components/PaleoNavigation';
import InlineAuthFooter from '../../components/InlineAuthFooter';
import CartDrawer from '../../components/CartDrawer';
import TelegramAuthModal from '../../components/TelegramAuthModal';
import MobileBottomNav from '../../components/MobileBottomNav';
import { useCartStore } from '../stores/useCartStore';

// Dynamically import Leaflet Map (SSR: false)
const NearbyShopsMap = dynamic(() => import('../../components/NearbyShopsMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[380px] bg-[#EAE6DF] rounded-2xl flex items-center justify-center font-mono text-xs text-[#7C776E] animate-pulse">
      Loading GPS Interactive Map...
    </div>
  )
});

const NEIGHBORHOOD_PRESETS = [
  { label: 'Posta Bet / Bole, Adama', lat: 8.5415, lng: 39.2705 },
  { label: 'Geda / Dembi, North Adama', lat: 8.5520, lng: 39.2630 },
  { label: 'Boku Shenen, West Adama', lat: 8.5350, lng: 39.2550 },
  { label: 'Daka Adu / Franko, East Adama', lat: 8.5380, lng: 39.2820 },
  { label: 'Goro / ASTU University, Adama', lat: 8.5600, lng: 39.2900 },
  { label: 'Melka Adama / Awash Valley, Adama', lat: 8.5250, lng: 39.2890 },
  { label: 'Migira / Wonji Road, Adama', lat: 8.5180, lng: 39.2650 },
  { label: 'Adama Central Stadium, Adama', lat: 8.5400, lng: 39.2680 }
];

const CATEGORIES = [
  { label: 'All Categories', slug: 'All', icon: '🏛️' },
  { label: 'Electronics & Audio', slug: 'Everyday Carry', icon: '📻' },
  { label: 'Furniture & Teak', slug: 'Home Archive', icon: '🪑' },
  { label: 'Cameras & Studio', slug: 'Creative Tools', icon: '📷' },
  { label: 'Wear & Leather', slug: 'Archival Wear', icon: '🧥' },
  { label: 'Books & Prints', slug: 'Paper Archive', icon: '📚' }
];

const CATEGORY_THEMES = {
  'Everyday Carry': { color: '#E56B55', bg: '#FAF0ED' },
  'Home Archive': { color: '#D97706', bg: '#FFFBEB' },
  'Creative Tools': { color: '#059669', bg: '#ECFDF5' },
  'Archival Wear': { color: '#3B82F6', bg: '#EFF6FF' },
  'Paper Archive': { color: '#E11D48', bg: '#FFF1F2' },
  'All': { color: '#1F1E1B', bg: '#FAF8F5' }
};

export default function ShopsNearMePage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const addToCart = useCartStore((state) => state.addItem);

  // Geolocation & Filter State
  const [userCoords, setUserCoords] = useState([8.5400, 39.2680]); // Default central Adama
  const [locationLabel, setLocationLabel] = useState('Central Adama (Auto GPS)');
  const [isLocating, setIsLocating] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRadius, setSelectedRadius] = useState(50);
  const [sortBy, setSortBy] = useState('recommended'); // 'recommended' | 'distance' | 'rating' | 'fastest_delivery'
  const [openOnly, setOpenOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('shops'); // 'shops' | 'products'
  const [showMap, setShowMap] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState(null);

  // Data State
  const [shops, setShops] = useState([]);
  const [nearbyProducts, setNearbyProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 1. Detect browser GPS on mount
  useEffect(() => {
    handleRequestGpsLocation();
  }, []);

  const handleRequestGpsLocation = () => {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          // Check if coordinates are in the Horn of Africa / Ethiopia region (Lat: 3°N to 15°N, Lng: 33°E to 48°E)
          const isEthiopia = lat >= 3 && lat <= 15 && lng >= 33 && lng <= 48;
          if (isEthiopia) {
            setUserCoords([lat, lng]);
            setLocationLabel(`Live GPS (${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E)`);
          } else {
            // Anchor to Central Adama for authentic curated discovery testing
            setUserCoords([8.5400, 39.2680]);
            setLocationLabel('Central Adama (Curated Discovery)');
          }
          setIsLocating(false);
        },
        (err) => {
          console.warn('[Geolocation warning]:', err.message);
          setUserCoords([8.5400, 39.2680]);
          setLocationLabel('Posta Bet, Adama');
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  };

  const handleSelectPresetLocation = (preset) => {
    setUserCoords([preset.lat, preset.lng]);
    setLocationLabel(preset.label);
  };

  // 2. Fetch Nearby Shops
  useEffect(() => {
    async function fetchNearby() {
      setIsLoading(true);
      try {
        const [lat, lng] = userCoords;
        if (activeTab === 'shops') {
          const params = new URLSearchParams({
            lat: lat.toString(),
            lng: lng.toString(),
            category: activeCategory,
            maxDistance: selectedRadius.toString(),
            sortBy,
            search: searchQuery,
            openOnly: openOnly.toString()
          });

          const res = await fetch(`${apiUrl}/api/shops/nearby?${params.toString()}`);
          const data = await res.json();
          if (data.success) {
            setShops(data.shops || []);
          }
        } else {
          // Fetch nearby products
          const params = new URLSearchParams({
            lat: lat.toString(),
            lng: lng.toString(),
            category: activeCategory,
            maxDistance: selectedRadius.toString(),
            q: searchQuery
          });

          const res = await fetch(`${apiUrl}/api/shops/nearby-products?${params.toString()}`);
          const data = await res.json();
          if (data.success) {
            setNearbyProducts(data.products || []);
          }
        }
      } catch (error) {
        console.error('[Discovery fetch error]:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNearby();
  }, [userCoords, activeCategory, selectedRadius, sortBy, openOnly, searchQuery, activeTab]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1F1E1B] selection:bg-[#C85A32] selection:text-white flex flex-col font-sans">
      <PaleoNavigation
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenTelegramAuth={() => setIsAuthModalOpen(true)}
        onOpenSellModal={() => {}}
      />

      <main className="grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        
        {/* Header Hero Banner */}
        <div className="bg-[#1F1E1B] text-[#FAF8F5] rounded-3xl p-6 sm:p-10 relative overflow-hidden shadow-xl">
          <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-[#C85A32]/20 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-4 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/15 text-[11px] font-mono tracking-wider uppercase text-[#D4AF37]">
              <MapPin className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Hyperlocal Studio & Shop Discovery</span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Discover Curated Studios & Shops in Your Surrounding
            </h1>

            <p className="font-sans text-sm sm:text-base text-[#D0C9BE] font-light leading-relaxed">
              Find physical design studios, restored audio workshops, modernist teak galleries, and rare book archives in Addis Ababa. Filter by real-time distance, rating, and verified courier arrival times.
            </p>

            {/* GPS Location & Neighborhood Selector Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={handleRequestGpsLocation}
                disabled={isLocating}
                className="px-4 py-2.5 bg-[#C85A32] hover:bg-[#D96B42] text-white rounded-xl font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Locating GPS...' : 'Use My Current GPS'}</span>
              </button>

              {/* Neighborhood Presets Dropdown */}
              <div className="relative">
                <select
                  value={locationLabel}
                  onChange={(e) => {
                    const preset = NEIGHBORHOOD_PRESETS.find((p) => p.label === e.target.value);
                    if (preset) handleSelectPresetLocation(preset);
                  }}
                  className="px-4 py-2.5 bg-white/10 border border-white/20 hover:border-white/40 text-white rounded-xl font-sans text-xs font-medium focus:outline-hidden appearance-none pr-8 cursor-pointer transition-colors"
                >
                  <option value={locationLabel} className="bg-[#1F1E1B] text-white">
                    📍 {locationLabel}
                  </option>
                  {NEIGHBORHOOD_PRESETS.map((p) => (
                    <option key={p.label} value={p.label} className="bg-[#1F1E1B] text-white">
                      📍 {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <span className="font-mono text-[11px] text-[#A69F93]">
                Discovery Center: <b className="text-white">{locationLabel}</b>
              </span>
            </div>
          </div>
        </div>

        {/* Discovery Mode Switcher & Category Ribbon */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2DDD3] pb-4">
            
            {/* Tab 1 (Nearby Shops) vs Tab 2 (Nearby In-Stock Products) */}
            <div className="inline-flex p-1 bg-[#EAE6DF] rounded-2xl border border-[#DCD6CA]">
              <button
                onClick={() => setActiveTab('shops')}
                className={`px-4 py-2 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === 'shops'
                    ? 'bg-[#1F1E1B] text-white shadow-sm'
                    : 'text-[#625D54] hover:text-[#1F1E1B]'
                }`}
              >
                <Store className="w-3.5 h-3.5" />
                <span>Nearby Shops ({shops.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('products')}
                className={`px-4 py-2 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
                  activeTab === 'products'
                    ? 'bg-[#1F1E1B] text-white shadow-sm'
                    : 'text-[#625D54] hover:text-[#1F1E1B]'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>In-Stock Products Near You</span>
              </button>
            </div>

            {/* Toggle GPS Map */}
            <button
              onClick={() => setShowMap(!showMap)}
              className={`px-3.5 py-2 rounded-xl border font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors ${
                showMap
                  ? 'bg-white border-[#C85A32] text-[#C85A32]'
                  : 'bg-white border-[#E2DDD3] text-[#625D54] hover:border-[#1F1E1B]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showMap ? 'Hide GPS Map' : 'Show Interactive Map'}</span>
            </button>
          </div>

          {/* Category Badges Ribbon */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const theme = CATEGORY_THEMES[cat.slug] || { color: '#1F1E1B', bg: '#FAF8F5' };
              const isActive = activeCategory === cat.slug;

              return (
                <button
                  key={cat.slug}
                  onClick={() => setActiveCategory(cat.slug)}
                  style={{
                    backgroundColor: isActive ? theme.color : '#FFFFFF',
                    borderColor: isActive ? theme.color : '#E2DDD3',
                    color: isActive ? '#FFFFFF' : '#625D54'
                  }}
                  className={`px-4 py-2 rounded-xl font-sans text-xs font-semibold shrink-0 transition-all flex items-center gap-2 border shadow-2xs hover:border-[#1F1E1B] ${
                    isActive ? 'shadow-sm' : ''
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white border border-[#E2DDD3] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          
          {/* Keyword Search */}
          <div className="relative grow max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#7C776E]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'shops' ? 'Search store name, specialty, neighborhood...' : 'Search product title (e.g. Braun, Leica, Teak)...'}
              className="w-full pl-10 pr-4 py-2 bg-[#FAF8F5] border border-[#E2DDD3] rounded-xl text-xs font-sans focus:outline-hidden focus:border-[#C85A32]"
            />
          </div>

          {/* Radius & Sort Controls */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Radius Filter */}
            <div className="flex items-center gap-1.5 font-mono text-xs text-[#7C776E]">
              <span>Radius:</span>
              <select
                value={selectedRadius}
                onChange={(e) => setSelectedRadius(Number(e.target.value))}
                className="bg-[#FAF8F5] border border-[#E2DDD3] px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold text-[#1F1E1B] focus:outline-hidden"
              >
                <option value={2}>Within 2 km</option>
                <option value={5}>Within 5 km</option>
                <option value={15}>Within 15 km</option>
                <option value={50}>Within 50 km (Greater Addis)</option>
              </select>
            </div>

            {/* Sort Options */}
            {activeTab === 'shops' && (
              <div className="flex items-center gap-1.5 font-mono text-xs text-[#7C776E]">
                <span>Sort By:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-[#FAF8F5] border border-[#E2DDD3] px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold text-[#1F1E1B] focus:outline-hidden"
                >
                  <option value="recommended">⭐ Recommended (Smart Rank)</option>
                  <option value="distance">📍 Nearest Distance</option>
                  <option value="rating">🏆 Highest Rating</option>
                  <option value="fastest_delivery">⚡ Fastest Courier ETA</option>
                </select>
              </div>
            )}

            {/* Open Only Checkbox */}
            <label className="flex items-center gap-2 font-mono text-xs text-[#625D54] cursor-pointer pl-2">
              <input
                type="checkbox"
                checked={openOnly}
                onChange={(e) => setOpenOnly(e.target.checked)}
                className="rounded text-[#C85A32] focus:ring-[#C85A32]"
              />
              <span>Open Now</span>
            </label>
          </div>
        </div>

        {/* Interactive GPS Map (Collapsible) */}
        {showMap && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#7C776E]">
              <span>📍 LIVE GPS STOREFRONT TOPOLOGY</span>
              <span>Click a pin to inspect store details</span>
            </div>
            <div className="h-[360px] sm:h-[420px] w-full">
              <NearbyShopsMap
                userCoords={userCoords}
                shops={shops}
                selectedShopId={selectedShopId}
                onSelectShop={(id) => setSelectedShopId(id)}
                radiusKm={selectedRadius}
              />
            </div>
          </div>
        )}

        {/* TAB 1: NEARBY SHOPS LIST */}
        {activeTab === 'shops' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1F1E1B]">
                Curated Studios Near You ({shops.length})
              </h2>
              <span className="font-mono text-xs text-[#7C776E]">
                Sorted by: {sortBy.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-64 bg-white border border-[#E2DDD3] rounded-3xl p-6 animate-pulse space-y-4">
                    <div className="h-6 bg-[#EAE6DF] rounded w-1/3" />
                    <div className="h-4 bg-[#EAE6DF] rounded w-2/3" />
                    <div className="h-24 bg-[#FAF8F5] rounded-xl" />
                  </div>
                ))}
              </div>
            ) : shops.length === 0 ? (
              <div className="bg-white border border-[#E2DDD3] rounded-3xl p-12 text-center space-y-3">
                <Store className="w-12 h-12 text-[#A69F93] mx-auto" />
                <h3 className="font-serif text-lg font-bold text-[#1F1E1B]">No studios found in this radius</h3>
                <p className="font-sans text-xs text-[#625D54]">
                  Try widening your radius to 50 km or changing the category filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shops.map((shop) => {
                  const isSelected = shop.id === selectedShopId;
                  const primaryCat = shop.categories?.[0] || 'Everyday Carry';
                  const theme = CATEGORY_THEMES[primaryCat] || { color: '#E56B55', bg: '#FAF0ED' };

                  return (
                    <div
                      key={shop.id}
                      onClick={() => setSelectedShopId(shop.id)}
                      style={{
                        borderColor: isSelected ? theme.color : undefined,
                        boxShadow: isSelected ? `0 8px 24px ${theme.color}25` : undefined
                      }}
                      className={`bg-white border rounded-3xl p-6 sm:p-7 space-y-5 transition-all cursor-pointer shadow-xs hover:shadow-md ${
                        isSelected
                          ? 'ring-2'
                          : 'border-[#E2DDD3] hover:border-[#1F1E1B]'
                      }`}
                    >
                      {/* Shop Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.color }} />
                            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#1F1E1B] hover:opacity-80 transition-opacity">
                              {shop.storeName}
                            </h3>
                          </div>

                          <p className="font-sans text-xs text-[#625D54] line-clamp-2">
                            {shop.storeBio}
                          </p>
                        </div>

                        {/* Distance Badge */}
                        <div className="shrink-0 text-right space-y-0.5">
                          <div 
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-xs font-bold border"
                            style={{ 
                              backgroundColor: theme.bg, 
                              color: theme.color,
                              borderColor: `${theme.color}40`
                            }}
                          >
                            <MapPin className="w-3 h-3" />
                            <span>{shop.distanceKm} km</span>
                          </div>
                          <div className="font-mono text-[10px] text-[#7C776E]">away from you</div>
                        </div>
                      </div>

                      {/* Ratings, Hours & Delivery Metrics */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-[#FAF8F5] border border-[#E8E4DC] rounded-2xl text-center">
                        <div>
                          <div className="flex items-center justify-center gap-1 font-mono text-xs font-bold text-[#1F1E1B]">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>{shop.rating}</span>
                          </div>
                          <span className="font-sans text-[10px] text-[#7C776E]">({shop.reviewCount} reviews)</span>
                        </div>

                        <div className="border-x border-[#E2DDD3]">
                          <div className="font-mono text-xs font-bold text-[#1F1E1B]">
                            {shop.openingHours.split('-')[0].trim()}
                          </div>
                          <span className="font-sans text-[10px] text-emerald-700 font-semibold">Open Today</span>
                        </div>

                        <div>
                          <div className="font-mono text-xs font-bold" style={{ color: theme.color }}>
                            ~{shop.courier?.etaMinutes} min
                          </div>
                          <span className="font-sans text-[10px] text-[#7C776E]">{shop.courier?.feeETB} ETB Delivery</span>
                        </div>
                      </div>

                      {/* In-Stock Featured Catalog Preview */}
                      {shop.featuredProducts && shop.featuredProducts.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between font-mono text-[11px] text-[#7C776E]">
                            <span>IN-STOCK OBJECTS IN STUDIO ({shop.productCount})</span>
                            <span className="font-semibold" style={{ color: theme.color }}>Instant Escrow Dispatch</span>
                          </div>

                          <div className="grid grid-cols-3 gap-2.5">
                            {shop.featuredProducts.slice(0, 3).map((prod) => (
                              <div
                                key={prod.id}
                                className="group/item bg-[#FAF8F5] border border-[#E8E4DC] rounded-xl p-2 space-y-1.5 hover:border-[#1F1E1B] transition-colors"
                              >
                                <div className="aspect-square rounded-lg overflow-hidden bg-white">
                                  <img
                                    src={prod.image}
                                    alt={prod.title}
                                    className="w-full h-full object-cover group-hover/item:scale-105 transition-transform"
                                  />
                                </div>
                                <div className="font-serif text-[11px] font-bold text-[#1F1E1B] truncate">
                                  {prod.title}
                                </div>
                                <div className="font-mono text-[10px] font-semibold" style={{ color: theme.color }}>
                                  {prod.price.toLocaleString()} ETB
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="pt-2 flex items-center justify-between border-t border-[#E8E4DC]">
                        <div className="flex items-center gap-1.5 font-sans text-xs text-[#625D54]">
                          <MapPin className="w-3.5 h-3.5 text-[#7C776E]" />
                          <span className="truncate max-w-[180px] sm:max-w-xs">{shop.address}</span>
                        </div>

                        <Link
                          href={`/vendors/${shop.id}`}
                          className="inline-flex items-center gap-1 font-mono text-xs font-semibold hover:opacity-80 transition-opacity"
                          style={{ color: theme.color }}
                        >
                          <span>Visit Studio</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: IN-STOCK PRODUCTS NEAR YOU */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1F1E1B]">
                In-Stock Objects Near Your Location ({nearbyProducts.length})
              </h2>
              <span className="font-mono text-xs text-[#7C776E]">
                Ranked by proximity to {locationLabel}
              </span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-72 bg-white border border-[#E2DDD3] rounded-3xl p-4 animate-pulse space-y-3">
                    <div className="h-44 bg-[#EAE6DF] rounded-2xl" />
                    <div className="h-4 bg-[#EAE6DF] rounded w-3/4" />
                    <div className="h-4 bg-[#EAE6DF] rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : nearbyProducts.length === 0 ? (
              <div className="bg-white border border-[#E2DDD3] rounded-3xl p-12 text-center space-y-3">
                <Package className="w-12 h-12 text-[#A69F93] mx-auto" />
                <h3 className="font-serif text-lg font-bold text-[#1F1E1B]">No products found matching your search</h3>
                <p className="font-sans text-xs text-[#625D54]">
                  Try searching for keywords like "Braun", "Leica", "Teak", "Denim", or "Coffee".
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {nearbyProducts.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-[#E2DDD3] hover:border-[#1F1E1B] rounded-3xl p-4 space-y-3 transition-all hover:shadow-md flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Image & Distance Overlay */}
                      <div className="aspect-4/3 rounded-2xl overflow-hidden bg-[#FAF8F5] relative">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-[#1F1E1B]/90 backdrop-blur-md text-white rounded-full font-mono text-[10px] font-bold flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-[#C85A32]" />
                          <span>{item.distanceKm} km away</span>
                        </div>
                      </div>

                      {/* Store badge */}
                      <div className="flex items-center justify-between text-[11px] font-sans text-[#625D54]">
                        <span className="font-semibold text-[#1F1E1B] truncate max-w-[180px]">
                          🏪 {item.shop.name}
                        </span>
                        <span className="font-mono text-emerald-700 font-bold">
                          {item.courier?.speedBadge || '⚡ Express'}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-serif text-base font-bold text-[#1F1E1B] line-clamp-2">
                        {item.title}
                      </h3>
                    </div>

                    {/* Pricing & Add to Cart Action */}
                    <div className="pt-3 border-t border-[#E8E4DC] flex items-center justify-between">
                      <div>
                        <div className="font-mono text-sm font-bold text-[#C85A32]">
                          {item.price.toLocaleString()} ETB
                        </div>
                        <div className="font-sans text-[10px] text-[#7C776E]">
                          + {item.courier?.feeETB} ETB Delivery (~{item.courier?.etaMinutes}m)
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          addToCart({
                            id: item.id,
                            title: item.title,
                            price: item.price,
                            image: item.image,
                            category: item.category,
                            vendorId: item.shop.id,
                            stock: item.stock
                          });
                          setIsCartOpen(true);
                        }}
                        className="px-3.5 py-2 bg-[#1F1E1B] hover:bg-[#C85A32] text-white rounded-xl font-mono text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Add to Bag</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      <InlineAuthFooter onOpenAuthModal={() => setIsAuthModalOpen(true)} />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        apiUrl={apiUrl}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Auth Modal */}
      <TelegramAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        apiUrl={apiUrl}
      />
    </div>
  );
}
