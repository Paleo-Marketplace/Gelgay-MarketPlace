'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import PaleoNavigation from '../components/PaleoNavigation';
import HeroSection from '../components/HeroSection';
import CategoryGrid from '../components/CategoryGrid';
import MasonryFeed from '../components/MasonryFeed';
import BigSearchBar from '../components/BigSearchBar';
import HowItWorks from '../components/HowItWorks';
import FeaturedVendors from '../components/FeaturedVendors';
import TrustAccordion from '../components/TrustAccordion';
import InlineAuthFooter from '../components/InlineAuthFooter';
import CartDrawer from '../components/CartDrawer';
import SellItemModal from '../components/SellItemModal';
import ProductDetailModal from '../components/ProductDetailModal';
import TelegramAuthModal from '../components/TelegramAuthModal';
import NotificationDrawer from '../components/NotificationDrawer';
import ReviewModal from '../components/ReviewModal';
import { useCartStore } from './stores/useCartStore';
import { useWishlistStore } from './stores/useWishlistStore';

export default function StorefrontClient({ initialProducts, apiUrl }) {
  const queryClient = useQueryClient();

  // Zustand + IndexedDB Cart Store
  const cart = useCartStore((state) => state.items);
  const addToCartZustand = useCartStore((state) => state.addItem);
  const removeOneZustand = useCartStore((state) => state.removeOne);
  const clearCartZustand = useCartStore((state) => state.clearCart);

  // Zustand + IndexedDB Wishlist Store (Empty by default & synced to backend)
  const wishlistIds = useWishlistStore((state) => state.wishlistIds);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);

  // Search & Filter State
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Modals & Drawers
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isTelegramAuthOpen, setIsTelegramAuthOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Real-time stock invalidation (Zero ghost inventory)
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

  // Check current session & sync wishlist from backend
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    fetchWishlist(apiUrl);
    fetch(`${apiUrl}/api/auth/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, [apiUrl, fetchWishlist, queryClient]);

  // Fetch live products from backend
  const { data: rawProducts = initialProducts } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/api/products`);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      return Array.isArray(data.products) ? data.products : [];
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchInterval: 15000
  });

  const products = useMemo(() => {
    const sourceList = (Array.isArray(rawProducts) && rawProducts.length > 0)
      ? rawProducts
      : (Array.isArray(initialProducts) && initialProducts.length > 0 ? initialProducts : []);
    
    return sourceList.map((item, i) => {
      const vendorName = typeof item.vendorId === 'object' && item.vendorId?.storeName 
        ? item.vendorId.storeName 
        : (item.vendorName || 'ገልጋይ Verified Seller');
      const vendorRating = typeof item.vendorId === 'object' && item.vendorId?.rating?.average 
        ? item.vendorId.rating.average 
        : (item.vendorRating || 4.9);
      return {
        id: item._id || item.id || `p-${i}`,
        title: item.title,
        category: item.category || 'Everyday Carry',
        tag: item.tag || (item.category === 'Everyday Carry' ? '01 / EVERYDAY CARRY' : item.category === 'Home Archive' ? '02 / HOME ARCHIVE' : item.category === 'Creative Tools' ? '03 / CREATIVE TOOLS' : item.category === 'Archival Wear' ? '04 / ARCHIVAL WEAR' : '05 / PAPER ARCHIVE'),
        priceETB: item.priceETB ?? item.price ?? 0,
        condition: item.condition || 'Archival Condition',
        location: item.location?.label || (typeof item.location === 'string' ? item.location : (item.vendorId && typeof item.vendorId === 'object' && item.vendorId.address ? item.vendorId.address.split(',')[0].trim() : 'Adama')),
        vendorName,
        vendorRating,
        image: item.image || item.images?.[0] || 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=1200&q=80',
        description: item.description || '',
        specs: item.specs && typeof item.specs === 'object' ? (item.specs instanceof Map ? Object.fromEntries(item.specs) : item.specs) : (item.specs || { 'Archival Status': 'Verified Authenticity' }),
        escrowStatus: (item.stock === undefined || item.stock > 0) ? 'Available' : 'Out of Stock'
      };
    });
  }, [rawProducts, initialProducts]);

  const cartItems = useMemo(() => {
    return cart.map((item, i) => ({
      id: item._id || `cart-${i}`,
      title: item.title,
      category: item.category || 'Curated Artifact',
      priceETB: item.price,
      quantity: item.qty || 1,
      condition: item.condition || 'Archival Grade',
      location: 'Addis Ababa',
      vendorName: typeof item.vendorId === 'object' && item.vendorId?.storeName ? item.vendorId.storeName : 'ገልጋይ Merchant',
      vendorRating: 4.9,
      image: item.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=1000&fit=crop&auto=format',
      description: item.description || '',
      specs: {},
      escrowStatus: 'Available'
    }));
  }, [cart]);

  const handleToggleWishlist = (productId) => {
    toggleWishlist(productId, apiUrl);
  };

  const handleAddToCart = (product) => {
    addToCartZustand({
      _id: product._id || product.id,
      title: product.title,
      price: Number(product.price) || Number(product.priceETB) || 0,
      images: Array.isArray(product.images) ? product.images : [product.image],
      vendorId: product.vendorId || { _id: 'vendor-1', storeName: product.vendorName },
      qty: 1
    });
    setIsCartOpen(true);
  };

  const handleRemoveFromCart = (productId) => {
    removeOneZustand(productId);
  };

  const handleSearchSubmit = (query) => {
    const matchedCategory = ['Electronics', 'Furniture', 'Studio', 'Fashion', 'Books'].find((c) =>
      query.toLowerCase().includes(c.toLowerCase())
    );
    if (matchedCategory) {
      setActiveCategory(matchedCategory);
    } else {
      setActiveCategory('All');
    }
    const productsEl = document.getElementById('products');
    if (productsEl) {
      productsEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCategorySelect = (categoryName) => {
    const categoryMap = {
      'Electronics': 'Electronics',
      'Furniture': 'Furniture',
      'Studio': 'Studio',
      'Studio Days': 'Studio',
      'Studio Gear': 'Studio',
      'Fashion': 'Fashion',
      'Vintage Wear': 'Fashion',
      'Archival Wear': 'Fashion',
      'Books': 'Books',
      'Rare Reads': 'Books',
      'Paper Archive': 'Books'
    };
    const mapped = categoryMap[categoryName] || categoryName;
    setActiveCategory(mapped);
    const productsEl = document.getElementById('products');
    if (productsEl) {
      productsEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1F1E1B] font-sans antialiased selection:bg-[#C85A32] selection:text-white">
      
      {/* 1. Production E-Commerce Header Navigation */}
      <PaleoNavigation
        cartCount={cart.length}
        wishlistCount={wishlistIds.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSell={() => setIsSellOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenSearch={() => {
          const searchEl = document.querySelector('input[type="text"]');
          if (searchEl) searchEl.focus();
        }}
        onOpenWishlist={() => {
          const productsEl = document.getElementById('products');
          if (productsEl) productsEl.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenAccount={() => setIsTelegramAuthOpen(true)}
      />

      {/* 2. Hero Section with landingPaleo.jpg and animate.mp4 in rectangular screen frame */}
      <HeroSection
        onExploreClick={() => {
          const productsEl = document.getElementById('products');
          if (productsEl) productsEl.scrollIntoView({ behavior: 'smooth' });
        }}
        onSellClick={() => setIsSellOpen(true)}
      />

      {/* 3. Curated Categories Bento Grid with tree.jpg background */}
      <CategoryGrid onSelectCategory={handleCategorySelect} />

      {/* 4. Natural Language Big Search Bar */}
      <BigSearchBar
        onSearchSubmit={handleSearchSubmit}
        onFilterClick={handleCategorySelect}
      />

      {/* 5. Live E-Commerce Masonry Product Catalog */}
      <MasonryFeed
        products={products}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        wishlistIds={wishlistIds}
        cartIds={cart.map((c) => c._id)}
        onToggleWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
        onSelectProduct={(product) => setSelectedProduct(product)}
      />

      {/* 6. How It Works & Escrow Guarantee with front.jpg background */}
      <HowItWorks onSellClick={() => setIsSellOpen(true)} />

      {/* 7. Verified Local Neighborhood Sellers with light.jpg background */}
      <FeaturedVendors
        onExploreVendors={() => {
          const productsEl = document.getElementById('products');
          if (productsEl) productsEl.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 8. Trust, Security & Telegram Verification FAQ */}
      <TrustAccordion />

      {/* 9. Inline Google Auth & Telegram Bot Footer */}
      <InlineAuthFooter
        onAccountClick={() => setIsTelegramAuthOpen(true)}
        apiUrl={apiUrl}
      />

      {/* 10. Slide-Out Escrow Cart Drawer with Live Leaflet OSRM Tracking Map */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartProducts={cartItems}
        onRemoveFromCart={handleRemoveFromCart}
        onClearCart={clearCartZustand}
        apiUrl={apiUrl}
      />

      {/* 11. Modal: Single Product Inspection & Specification View */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        isWishlisted={selectedProduct ? wishlistIds.includes(selectedProduct.id) : false}
        isInCart={selectedProduct ? cart.some((c) => c._id === selectedProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
        onAddToCart={handleAddToCart}
      />

      {/* 12. Modal: Vendor Fast Listing Modal */}
      <SellItemModal
        isOpen={isSellOpen}
        onClose={() => setIsSellOpen(false)}
        onAddProduct={() => {
          setIsSellOpen(false);
        }}
      />

      {/* 13. Modal: Telegram OAuth & Google Sign-In Flow */}
      <TelegramAuthModal
        isOpen={isTelegramAuthOpen}
        onClose={() => setIsTelegramAuthOpen(false)}
        apiUrl={apiUrl}
        onOpenSell={() => setIsSellOpen(true)}
      />

      {/* 14. Activity & Real-Time Alerts Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        apiUrl={apiUrl}
      />

      {/* 15. Collector Review & Rating Modal */}
      {reviewModalProduct && (
        <ReviewModal
          isOpen={Boolean(reviewModalProduct)}
          onClose={() => setReviewModalProduct(null)}
          productId={reviewModalProduct.id}
          productTitle={reviewModalProduct.title}
          vendorName={reviewModalProduct.vendorName}
          apiUrl={apiUrl}
        />
      )}

    </div>
  );
}
