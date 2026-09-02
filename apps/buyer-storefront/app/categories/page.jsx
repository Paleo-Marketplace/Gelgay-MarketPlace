'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navigation from '../../components/Navigation';
import CategoryGrid from '../../components/CategoryGrid';
import MasonryFeed from '../../components/MasonryFeed';
import CartDrawer from '../../components/CartDrawer';
import SellItemModal from '../../components/SellItemModal';
import ProductDetailModal from '../../components/ProductDetailModal';
import TelegramAuthModal from '../../components/TelegramAuthModal';
import InlineAuthFooter from '../../components/InlineAuthFooter';
import PageNavigationFlow from '../../components/PageNavigationFlow';
import { useCartStore } from '../stores/useCartStore';
import { useWishlistStore } from '../stores/useWishlistStore';

export default function CategoriesPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const cart = useCartStore((state) => state.items);
  const addToCartZustand = useCartStore((state) => state.addItem);
  const removeOneZustand = useCartStore((state) => state.removeOne);
  const clearCartZustand = useCartStore((state) => state.clearCart);

  const wishlistIds = useWishlistStore((state) => state.wishlistIds);
  const toggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const fetchWishlist = useWishlistStore((state) => state.fetchWishlist);

  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isTelegramAuthOpen, setIsTelegramAuthOpen] = useState(false);
  const [dbProducts, setDbProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWishlist(apiUrl);
    fetch(`${apiUrl}/api/products`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.products)) {
          setDbProducts(data.products);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [apiUrl, fetchWishlist]);

  const products = useMemo(() => {
    return (Array.isArray(dbProducts) ? dbProducts : []).map((item, i) => {
      const vendorName = typeof item.vendorId === 'object' && item.vendorId?.storeName ? item.vendorId.storeName : 'ገልጋይ Verified Seller';
      const vendorRating = typeof item.vendorId === 'object' && item.vendorId?.rating?.average ? item.vendorId.rating.average : 4.9;
      return {
        id: item._id || `p-${i}`,
        title: item.title,
        category: item.category || 'Everyday Carry',
        tag: item.category === 'Everyday Carry' ? '01 / EVERYDAY CARRY' : item.category === 'Home Archive' ? '02 / HOME ARCHIVE' : item.category === 'Creative Tools' ? '03 / CREATIVE TOOLS' : item.category === 'Archival Wear' ? '04 / ARCHIVAL WEAR' : '05 / PAPER ARCHIVE',
        priceETB: item.price,
        condition: item.condition || 'Archival Condition',
        location: item.location?.label || 'Addis Ababa',
        vendorName,
        vendorRating,
        image: item.images?.[0] || 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=1200&q=80',
        description: item.description || '',
        specs: item.specs && typeof item.specs === 'object' ? (item.specs instanceof Map ? Object.fromEntries(item.specs) : item.specs) : { 'Archival Status': 'Verified Authenticity' },
        escrowStatus: item.stock > 0 ? 'Available' : 'Out of Stock'
      };
    });
  }, [dbProducts]);

  const cartProducts = cart.map((c) => ({
    id: c._id,
    title: c.title,
    priceETB: c.price,
    image: c.images?.[0] || 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?auto=format&fit=crop&w=1200&q=80',
    vendorName: c.vendorId?.storeName || 'ገልጋይ',
    category: 'Everyday Carry',
    tag: '01 / ESCROW ITEM',
    condition: 'Like New',
    location: 'Addis Ababa',
    vendorRating: 4.9,
    description: '',
    specs: {},
    escrowStatus: 'Available'
  }));

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1F1E1B] font-sans antialiased">
      <Navigation
        cartCount={cart.length}
        wishlistCount={wishlistIds.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSell={() => setIsSellOpen(true)}
        onOpenSearch={() => {}}
        onOpenWishlist={() => {}}
        onOpenAccount={() => setIsTelegramAuthOpen(true)}
      />

      <div className="py-12 bg-[#FAF8F5] border-b border-[#E8E4DC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="font-mono text-xs uppercase tracking-widest text-[#C85A32] font-semibold">
            EXPLORE ARCHIVES
          </span>
          <h1 className="font-serif text-4xl sm:text-6xl font-normal text-[#1F1E1B] mt-2 mb-4">
            Curated Categories
          </h1>
          <p className="font-sans text-sm text-[#625D54] max-w-xl mx-auto font-light">
            Discover timeless pieces categorized by feeling, utility, and craftsmanship.
          </p>
        </div>
      </div>

      <CategoryGrid onSelectCategory={(cat) => {
        const categoryMap = {
          'Electronics': 'Electronics',
          'Everyday Carry': 'Everyday Carry',
          'Furniture': 'Furniture',
          'Home Archive': 'Home Archive',
          'Studio': 'Studio',
          'Creative Tools': 'Creative Tools',
          'Fashion': 'Fashion',
          'Archival Wear': 'Archival Wear',
          'Books': 'Books',
          'Paper Archive': 'Paper Archive'
        };
        const mapped = categoryMap[cat] || cat;
        setActiveCategory(mapped);
        const el = document.getElementById('products');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }} />

      <MasonryFeed
        products={products}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        wishlistIds={wishlistIds}
        cartIds={cart.map((c) => c._id)}
        onToggleWishlist={(id) => toggleWishlist(id, apiUrl)}
        onAddToCart={(p) => {
          addToCartZustand({ _id: p.id, title: p.title, price: p.priceETB, images: [p.image], vendorId: { storeName: p.vendorName } });
          setIsCartOpen(true);
        }}
        onSelectProduct={(p) => setSelectedProduct(p)}
      />

      {/* Inter-page Flow Navigation */}
      <PageNavigationFlow
        breadcrumbs={[{ label: 'Categories' }]}
        prev={{ label: 'Home Marketplace', sublabel: 'Explore featured archives & hero discovery', href: '/' }}
        next={{ label: 'Shop the Archive', sublabel: 'Browse all pieces with live neighborhood filters', href: '/shop' }}
      />

      <InlineAuthFooter onAccountClick={() => setIsTelegramAuthOpen(true)} apiUrl={apiUrl} />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartProducts={cartProducts}
        onRemoveFromCart={(id) => removeOneZustand(id)}
        onClearCart={clearCartZustand}
        apiUrl={apiUrl}
      />

      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        isWishlisted={selectedProduct ? wishlistIds.includes(selectedProduct.id) : false}
        isInCart={selectedProduct ? cart.some((c) => c._id === selectedProduct.id) : false}
        onToggleWishlist={(id) => toggleWishlist(id, apiUrl)}
        onAddToCart={(p) => {
          addToCartZustand({ _id: p.id, title: p.title, price: p.priceETB, images: [p.image], vendorId: { storeName: p.vendorName } });
          setIsCartOpen(true);
        }}
      />

      <SellItemModal isOpen={isSellOpen} onClose={() => setIsSellOpen(false)} onAddProduct={() => setIsSellOpen(false)} apiUrl={apiUrl} />
      <TelegramAuthModal
        isOpen={isTelegramAuthOpen}
        onClose={() => setIsTelegramAuthOpen(false)}
        onOpenSell={() => setIsSellOpen(true)}
        apiUrl={apiUrl}
      />
    </div>
  );
}
