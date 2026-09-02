'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PaleoNavigation from './PaleoNavigation';
import InlineAuthFooter from './InlineAuthFooter';
import CartDrawer from './CartDrawer';
import SellItemModal from './SellItemModal';
import TelegramAuthModal from './TelegramAuthModal';
import BigSearchBar from './BigSearchBar';
import PageNavigationFlow from './PageNavigationFlow';
import NotificationDrawer from './NotificationDrawer';
import ReviewModal from './ReviewModal';
import { useCartStore } from '../app/stores/useCartStore';
import { useWishlistStore } from '../app/stores/useWishlistStore';
import {
  Heart,
  ShoppingBag,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  Send,
  ArrowRight,
  Truck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Star
} from 'lucide-react';

export default function ProductDetailClient({
  product,
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
}) {
  // Zustand Cart Store
  const cart = useCartStore((state) => state.items);
  const addToCartZustand = useCartStore((state) => state.addItem);
  const removeOneZustand = useCartStore((state) => state.removeOne);
  const clearCartZustand = useCartStore((state) => state.clearCart);

  // Zustand Wishlist Store (Empty by default & synced to backend)
  const wishlistIds = useWishlistStore((state) => state.wishlistIds);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);

  React.useEffect(() => {
    fetchWishlist(apiUrl);
  }, [apiUrl, fetchWishlist]);

  // States
  const [currency, setCurrency] = useState('ETB');
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isTelegramAuthOpen, setIsTelegramAuthOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewsList, setReviewsList] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Product resolution
  const resolvedProduct = React.useMemo(() => {
    if (!product) return null;
    const vendorName = product.vendorName || product.vendorId?.storeName || 'ገልጋይ Verified Curator';
    const rawRating = product.vendorRating || product.vendorId?.rating;
    const vendorRating = typeof rawRating === 'object' && rawRating !== null ? Number(rawRating.average || 4.96).toFixed(1) : Number(rawRating || 4.96).toFixed(1);

    const specsObj = product.specs && typeof product.specs === 'object'
      ? (product.specs instanceof Map ? Object.fromEntries(product.specs) : product.specs)
      : {
          'Origin / Era': 'Archival Piece',
          'Physical Inspection': '100% Operational & Verified',
          'Courier Hand-off': 'Same-Day Adama Delivery',
          'Escrow Vault': 'Funds Held by ገልጋይ until Approval'
        };

    return {
      id: product._id || product.id,
      title: product.title,
      priceETB: product.price || product.priceETB || 0,
      category: product.category || 'Everyday Carry',
      tag: product.tag || (product.category === 'Everyday Carry' ? '01 / EVERYDAY CARRY' : product.category === 'Home Archive' ? '02 / HOME ARCHIVE' : product.category === 'Creative Tools' ? '03 / CREATIVE TOOLS' : product.category === 'Archival Wear' ? '04 / ARCHIVAL WEAR' : '05 / PAPER ARCHIVE'),
      condition: product.condition || 'Like New',
      location: product.location?.label || (typeof product.location === 'string' ? product.location : 'Adama'),
      rawVendorId: product.vendorId?._id || product.vendorId,
      vendorName,
      vendorRating,
      images: product.images?.length ? product.images : [product.image || 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=1200&q=80'],
      description: product.description || 'Curated archival piece authenticated with physical inspection and escrow buyer protection.',
      specs: specsObj,
      stock: product.stock !== undefined ? product.stock : 1
    };
  }, [product]);

  // Fetch real related products from API
  React.useEffect(() => {
    if (!resolvedProduct) return;
    const catQuery = resolvedProduct.category ? `?category=${encodeURIComponent(resolvedProduct.category)}` : '';
    fetch(`${apiUrl}/api/products${catQuery}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.products)) {
          const filtered = data.products
            .filter((p) => (p._id || p.id) !== resolvedProduct.id)
            .slice(0, 4)
            .map((p) => ({
              id: p._id || p.id,
              title: p.title,
              category: p.category || 'Everyday Carry',
              tag: p.category === 'Everyday Carry' ? '01 / EVERYDAY CARRY' : '02 / ARCHIVE',
              condition: p.condition || 'Like New',
              priceETB: p.price,
              location: p.location?.label || 'Adama',
              vendorName: p.vendorId?.storeName || 'PALEO Verified',
              vendorRating: p.vendorId?.rating?.average || 4.9,
              image: p.images?.[0] || 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=1200&q=80',
              description: p.description || '',
              specs: {},
              escrowStatus: p.stock > 0 ? 'Available' : 'Out of Stock'
            }));
          setRelatedProducts(filtered);
        }
      })
      .catch(() => {});
  }, [resolvedProduct, apiUrl]);

  if (!resolvedProduct) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-[#1F1E1B] p-8">
        <div className="text-center space-y-4">
          <h2 className="font-serif text-2xl font-bold">Product not found</h2>
          <p className="font-sans text-sm text-[#7C776E]">The requested item does not exist or has been removed from the archive.</p>
          <Link href="/shop" className="inline-block px-5 py-2.5 bg-[#1F1E1B] text-white font-mono text-xs uppercase rounded-xl">
            Return to Shop
          </Link>
        </div>
      </div>
    );
  }

  const images = resolvedProduct.images || [resolvedProduct.image];
  const isWishlisted = wishlistIds.includes(resolvedProduct.id);
  const inCart = cart.some((c) => c._id === resolvedProduct.id);

  const cartProducts = cart.map((c) => ({
    id: c._id,
    title: c.title,
    priceETB: c.price,
    image: c.images?.[0] || 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=1200&q=80',
    vendorName: c.vendorId?.storeName || 'PALEO',
    category: 'Everyday Carry',
    tag: '01 / ESCROW ITEM',
    condition: 'Like New',
    location: 'Adama',
    vendorRating: 4.9,
    description: '',
    specs: {},
    escrowStatus: 'Available'
  }));

  React.useEffect(() => {
    if (resolvedProduct?.id) {
      fetch(`${apiUrl}/api/products/${resolvedProduct.id}/reviews`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && Array.isArray(data.reviews)) {
            setReviewsList(data.reviews);
          }
        })
        .catch(() => {});
    }
  }, [resolvedProduct?.id, apiUrl]);

  const formatPrice = (priceETB) => {
    if (currency === 'USD') {
      return `$${Math.round(priceETB / 125).toLocaleString()}`;
    }
    return `${priceETB.toLocaleString()} ETB`;
  };

  const availableVariants = React.useMemo(() => {
    if (Array.isArray(product?.variants) && product.variants.length > 0) {
      return product.variants;
    }
    return [
      { sku: `${resolvedProduct.id}-STD`, title: 'Original Archival Condition', price: resolvedProduct.priceETB },
      { sku: `${resolvedProduct.id}-REST`, title: 'Calibrated & Restored by Studio', price: resolvedProduct.priceETB + 450 }
    ];
  }, [product, resolvedProduct]);

  const [selectedVariant, setSelectedVariant] = useState(availableVariants[0]);

  const effectivePrice = selectedVariant?.price || resolvedProduct.priceETB;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1F1E1B] font-sans antialiased">
      
      {/* Frame 14-672: Paleo Product Detail Navigation Header */}
      <PaleoNavigation
        cartCount={cart.length}
        wishlistCount={wishlistIds.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSell={() => setIsSellOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenWishlist={() => {}}
        onOpenAccount={() => setIsTelegramAuthOpen(true)}
      />

      {/* Breadcrumbs */}
      <div className="bg-[#FAF8F5] border-b border-[#E8E4DC] py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 font-mono text-xs text-[#7C776E]">
            <Link href="/" className="hover:text-[#1F1E1B] transition-colors font-semibold">ገልጋይ (Gelgay)</Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#A5A096]" />
            <Link href="/shop" className="hover:text-[#1F1E1B] transition-colors">Archive</Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#A5A096]" />
            <Link href="/categories" className="hover:text-[#1F1E1B] transition-colors">{resolvedProduct.category}</Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#A5A096]" />
            <span className="text-[#1F1E1B] font-semibold truncate max-w-xs">{resolvedProduct.title}</span>
          </nav>
        </div>
      </div>

      {/* Frame 14-696: Main Product Detail Showcase */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* Left Column: Multi-Angle Photo Showcase & Inspection Badges */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Master Photo Display */}
            <div className="relative aspect-4/3 sm:aspect-16/11 bg-[#EFECE6] border border-[#E2DDD3] rounded-3xl overflow-hidden group shadow-lg">
              <img
                src={images[activeImageIndex] || images[0]}
                alt={resolvedProduct.title}
                onError={(e) => {
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=1000&fit=crop&auto=format';
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />

              {/* Badges Overlay */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className="px-3 py-1.5 bg-[#1F1E1B]/90 backdrop-blur-md text-[#FAF8F5] text-xs font-mono uppercase tracking-wider rounded-lg font-semibold shadow-xs">
                  {resolvedProduct.condition}
                </span>
                <span className="px-3 py-1.5 bg-emerald-950/80 backdrop-blur-md text-emerald-300 border border-emerald-500/30 text-xs font-mono uppercase tracking-wider rounded-lg flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Escrow Verified</span>
                </span>
              </div>

              {/* Wishlist Action */}
              <button
                onClick={() => toggleWishlist(resolvedProduct.id, apiUrl)}
                className="absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-md rounded-full text-[#1F1E1B] hover:text-[#C85A32] shadow-md transition-colors"
                title="Save to wishlist"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-[#C85A32] text-[#C85A32]' : ''}`} />
              </button>
            </div>

            {/* Thumbnail Carousel / Selector */}
            {images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-24 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      activeImageIndex === idx ? 'border-[#C85A32] shadow-md scale-105' : 'border-[#E2DDD3] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Escrow Inspection Guarantee Callout */}
            <div className="p-6 bg-white border border-[#E2DDD3] rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EFECE6] flex items-center justify-center text-[#C85A32]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-bold text-[#1F1E1B]">
                    ገልጋይ (Gelgay) Physical Inspection Protocol
                  </h4>
                  <p className="font-mono text-xs text-[#7C776E]">
                    Zero-fraud buyer protection for Adama handoffs.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 font-sans text-xs">
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E4DC] space-y-1">
                  <span className="font-mono font-bold text-[#1F1E1B] block">1. Escrow Lock</span>
                  <p className="text-[#625D54]">Funds locked in bank vault until item arrives.</p>
                </div>
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E4DC] space-y-1">
                  <span className="font-mono font-bold text-[#1F1E1B] block">2. Spec Check</span>
                  <p className="text-[#625D54]">Courier inspects physical condition at vendor pickup.</p>
                </div>
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#E8E4DC] space-y-1">
                  <span className="font-mono font-bold text-[#1F1E1B] block">3. 48hr Window</span>
                  <p className="text-[#625D54]">Test condition at home before vendor payout.</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Editorial Details, Pricing, & Action Box */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Header & Category */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-[#C85A32] font-semibold">
                  {resolvedProduct.tag}
                </span>
                <span className="flex items-center gap-1 font-mono text-xs text-[#7C776E]">
                  <MapPin className="w-3.5 h-3.5 text-[#C85A32]" />
                  {resolvedProduct.location}
                </span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-[#1F1E1B] leading-tight">
                {resolvedProduct.title}
              </h1>

              {/* Price & Currency Switcher */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="font-mono text-xs text-[#7C776E] uppercase block">Escrow Protected Price</span>
                  <span className="font-mono text-3xl sm:text-4xl font-bold text-[#1F1E1B]">
                    {formatPrice(effectivePrice)}
                  </span>
                </div>

                <div className="flex items-center bg-[#EFECE6] p-1 rounded-xl border border-[#E2DDD3] font-mono text-xs">
                  <button
                    onClick={() => setCurrency('ETB')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      currency === 'ETB' ? 'bg-[#1F1E1B] text-white shadow-xs' : 'text-[#625D54]'
                    }`}
                  >
                    ETB
                  </button>
                  <button
                    onClick={() => setCurrency('USD')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      currency === 'USD' ? 'bg-[#1F1E1B] text-white shadow-xs' : 'text-[#625D54]'
                    }`}
                  >
                    USD
                  </button>
                </div>
              </div>
            </div>

            {/* Product Variant Selector */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-[#7C776E] font-semibold">
                  Archival Edition &amp; Variant:
                </span>
                <span className="font-mono text-[11px] text-[#C85A32] font-semibold">
                  SKU: {selectedVariant?.sku}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableVariants.map((v) => (
                  <button
                    key={v.sku}
                    type="button"
                    onClick={() => setSelectedVariant(v)}
                    className={`p-3 rounded-2xl border text-left font-mono text-xs transition-all ${
                      selectedVariant?.sku === v.sku
                        ? 'bg-[#1F1E1B] text-white border-[#1F1E1B] shadow-md'
                        : 'bg-white text-[#1F1E1B] border-[#E2DDD3] hover:border-[#1F1E1B]'
                    }`}
                  >
                    <strong className="block text-xs">{v.title}</strong>
                    <span className={selectedVariant?.sku === v.sku ? 'text-amber-400 font-bold' : 'text-[#C85A32] font-bold'}>
                      {formatPrice(v.price)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Curator / Vendor Spotlight */}
            <div className="p-6 bg-white/80 backdrop-blur-md border border-white/70 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between hover:bg-white/95 transition-all">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#EFECE6] border border-[#C85A32] flex items-center justify-center font-serif text-lg font-bold text-[#1F1E1B]">
                  {resolvedProduct.vendorName[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif text-base font-bold text-[#1F1E1B]">
                      {resolvedProduct.vendorName}
                    </h4>
                    <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-mono rounded-full font-semibold">
                      Telegram Verified
                    </span>
                  </div>
                  <p className="font-mono text-xs text-[#7C776E]">
                    ★ {resolvedProduct.vendorRating} Rating • Adama Verified Merchant
                  </p>
                </div>
              </div>

              <a
                href="https://t.me/PaleoMarketBot"
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-[#229ED9]/10 text-[#0088cc] hover:bg-[#229ED9] hover:text-white rounded-xl transition-colors"
                title="Inquire via Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
            </div>

            {/* Primary Purchase & Cart Actions */}
            <div className="space-y-3">
              <button
                onClick={() => {
                  addToCartZustand({
                    _id: resolvedProduct._id || resolvedProduct.id,
                    title: selectedVariant?.title ? `${resolvedProduct.title} (${selectedVariant.title})` : resolvedProduct.title,
                    price: effectivePrice,
                    images: images,
                    vendorId: resolvedProduct.vendorId || { storeName: resolvedProduct.vendorName },
                    variantSku: selectedVariant?.sku
                  });
                  setIsCartOpen(true);
                }}
                className={`w-full py-4.5 rounded-2xl font-mono text-xs uppercase tracking-wider font-semibold transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                  inCart
                    ? 'bg-emerald-700 text-white'
                    : 'bg-[#1F1E1B] text-[#FAF8F5] hover:bg-[#C85A32]'
                }`}
              >
                {inCart ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>In Escrow Cart • Proceed to Checkout</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Escrow Cart</span>
                  </>
                )}
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="py-3 bg-white/80 border border-[#1F1E1B] text-[#1F1E1B] rounded-xl font-mono text-xs uppercase tracking-wider font-semibold hover:bg-[#EFECE6] transition-colors text-center shadow-xs"
                >
                  View Cart ({cart.length})
                </button>

                <button
                  onClick={() => setIsSellOpen(true)}
                  className="py-3 bg-[#EFECE6] border border-[#E2DDD3] text-[#1F1E1B] rounded-xl font-mono text-xs uppercase tracking-wider font-semibold hover:bg-[#E2DDD3] transition-colors text-center shadow-xs"
                >
                  Sell Similar Item
                </button>
              </div>
            </div>

            {/* Description & Provenance */}
            <div className="space-y-3 pt-4 border-t border-[#E8E4DC]">
              <h4 className="font-mono text-xs uppercase tracking-wider text-[#7C776E] font-semibold">
                Curator Note & Provenance
              </h4>
              <p className="font-sans text-sm text-[#423E37] leading-relaxed font-light">
                {resolvedProduct.description}
              </p>
            </div>

            {/* Technical Specifications */}
            <div className="space-y-3 pt-4 border-t border-[#E8E4DC]">
              <h4 className="font-mono text-xs uppercase tracking-wider text-[#7C776E] font-semibold">
                Archival Specifications
              </h4>
              <div className="grid grid-cols-1 gap-2 font-mono text-xs">
                {Object.entries(resolvedProduct.specs || {}).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-xs border border-white/80 rounded-xl shadow-2xs">
                    <span className="text-[#7C776E]">{key}</span>
                    <span className="font-semibold text-[#1F1E1B]">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* Customer Reviews & Trust Dossier */}
        <div className="mt-20 pt-16 border-t border-[#E8E4DC]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-[#C85A32] font-semibold flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-[#C85A32]" />
                <span>COMMUNITY REPUTATION & RATINGS</span>
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#1F1E1B] mt-1">
                Collector Reviews & Seller Trust
              </h3>
            </div>

            <button
              onClick={() => setIsReviewOpen(true)}
              className="px-5 py-3 bg-[#1F1E1B] text-white font-mono text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#C85A32] transition-colors flex items-center gap-2 self-start sm:self-auto shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Write a Review</span>
            </button>
          </div>

          {reviewsList.length === 0 ? (
            <div className="p-8 bg-white border border-[#E2DDD3] rounded-3xl text-center max-w-xl mx-auto space-y-3 shadow-xs">
              <Star className="w-8 h-8 text-amber-400 mx-auto fill-amber-400" />
              <h4 className="font-serif text-lg font-bold text-[#1F1E1B]">First to Review this Piece</h4>
              <p className="font-sans text-xs text-[#625D54]">
                This archival item is protected by our 48h physical inspection window and 100% escrow vault guarantee.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewsList.map((rev) => (
                <div key={rev._id || rev.id} className="p-5 bg-white border border-[#E2DDD3] rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#FAF3F0] text-[#C85A32] font-serif font-bold text-xs flex items-center justify-center border border-[#C85A32]/30">
                        {rev.buyerId?.displayName ? rev.buyerId.displayName[0] : 'C'}
                      </div>
                      <div>
                        <h5 className="font-serif text-sm font-bold text-[#1F1E1B]">
                          {rev.buyerId?.displayName || 'Verified Collector'}
                        </h5>
                        <p className="font-mono text-[10px] text-[#7C776E]">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= rev.rating ? 'text-amber-500 fill-amber-500' : 'text-stone-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {rev.title && (
                    <h6 className="font-serif text-sm font-semibold text-[#1F1E1B]">
                      {rev.title}
                    </h6>
                  )}

                  <p className="font-sans text-xs text-[#423E37] leading-relaxed">
                    {rev.comment}
                  </p>

                  <div className="flex items-center gap-2 pt-2 border-t border-[#E8E4DC] font-mono text-[10px] text-emerald-800">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Verified Physical Inspection Review</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related Curated Objects */}
        {relatedProducts.length > 0 && (
          <div className="mt-24 pt-16 border-t border-[#E8E4DC]">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-[#C85A32] font-semibold">
                  SIMILAR ARCHIVES
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#1F1E1B] mt-1">
                  You May Also Curate
                </h3>
              </div>
              <Link href="/shop" className="font-mono text-xs text-[#C85A32] hover:underline flex items-center gap-1 font-semibold">
                <span>View Full Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((rp) => (
                <Link
                  key={rp.id}
                  href={`/products/${rp.id}`}
                  className="group bg-white/85 backdrop-blur-md border border-white/70 rounded-3xl overflow-hidden hover:border-[#C85A32]/60 hover:shadow-2xl hover:bg-white/95 transition-all duration-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                >
                  <div className="aspect-4/3 bg-[#EFECE6] overflow-hidden">
                    <img
                      src={rp.image}
                      alt={rp.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 space-y-1.5">
                    <span className="font-mono text-[10px] text-[#7C776E] block uppercase">{rp.tag}</span>
                    <h4 className="font-serif text-sm font-bold text-[#1F1E1B] group-hover:text-[#C85A32] transition-colors truncate">
                      {rp.title}
                    </h4>
                    <p className="font-mono text-xs font-bold text-[#1F1E1B] pt-1">
                      {rp.priceETB.toLocaleString()} ETB
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Inter-page Flow Navigation */}
      <PageNavigationFlow
        breadcrumbs={[
          { label: 'Shop', href: '/shop' },
          { label: resolvedProduct.category, href: `/shop?category=${encodeURIComponent(resolvedProduct.category)}` },
          { label: resolvedProduct.title }
        ]}
        prev={{ label: 'Back to Shop Archives', sublabel: 'Explore more curated pieces', href: '/shop' }}
        next={{ label: 'Escrow Checkout', sublabel: 'Lock funds safely in escrow vault', href: '/checkout' }}
      />

      {/* Frame 14-798: Product Detail Footer */}
      <InlineAuthFooter onAccountClick={() => setIsTelegramAuthOpen(true)} apiUrl={apiUrl} />

      {/* Modals & Drawers */}
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

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        apiUrl={apiUrl}
      />

      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        productId={resolvedProduct.id}
        productTitle={resolvedProduct.title}
        vendorName={resolvedProduct.vendorName}
        apiUrl={apiUrl}
        onReviewSubmitted={(newRev) => setReviewsList((prev) => [newRev, ...prev])}
      />

    </div>
  );
}
