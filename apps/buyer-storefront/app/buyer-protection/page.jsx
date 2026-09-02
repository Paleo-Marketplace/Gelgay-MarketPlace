'use client';

import React, { useState } from 'react';
import Navigation from '../../components/Navigation';
import HowItWorks from '../../components/HowItWorks';
import FeaturedVendors from '../../components/FeaturedVendors';
import TrustAccordion from '../../components/TrustAccordion';
import InlineAuthFooter from '../../components/InlineAuthFooter';
import PageNavigationFlow from '../../components/PageNavigationFlow';
import CartDrawer from '../../components/CartDrawer';
import SellItemModal from '../../components/SellItemModal';
import TelegramAuthModal from '../../components/TelegramAuthModal';
import { useCartStore } from '../stores/useCartStore';

export default function BuyerProtectionPage() {
  const cart = useCartStore((state) => state.items);
  const removeOneZustand = useCartStore((state) => state.removeOne);
  const clearCartZustand = useCartStore((state) => state.clearCart);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isTelegramAuthOpen, setIsTelegramAuthOpen] = useState(false);

  const cartProducts = cart.map(c => ({
    id: c._id,
    title: c.title,
    priceETB: c.price,
    image: c.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&h=1000&fit=crop&auto=format',
    vendorName: c.vendorId?.storeName || 'PALEO',
    category: 'Electronics',
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
        wishlistCount={0}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenSell={() => setIsSellOpen(true)}
        onOpenSearch={() => {}}
        onOpenWishlist={() => {}}
        onOpenAccount={() => setIsTelegramAuthOpen(true)}
      />

      <div className="py-8 sm:py-16 bg-[#FAF8F5] border-b border-[#E8E4DC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="font-mono text-[9px] sm:text-xs uppercase tracking-widest text-[#EB5B00] font-semibold">
            GELGAY (ገልጋይ) ESCROW PROTOCOL
          </span>
          <h1 className="font-serif text-2xl sm:text-4xl md:text-6xl font-normal text-[#1F1E1B] mt-1.5 mb-2 sm:mb-4">
            Buyer Protection & Escrow
          </h1>
          <p className="font-sans text-xs sm:text-base text-[#625D54] max-w-2xl mx-auto font-light leading-relaxed">
            Eliminating peer-to-peer transaction risk across Ethiopia. 
            Your payment is held safely until you physically inspect your purchase upon delivery.
          </p>
        </div>
      </div>

      <HowItWorks onSellClick={() => setIsSellOpen(true)} />
      <FeaturedVendors />
      <TrustAccordion />

      {/* Inter-page Flow Navigation */}
      <PageNavigationFlow
        breadcrumbs={[{ label: 'Buyer Protection' }]}
        prev={{ label: 'Shop the Archive', sublabel: 'Explore verified products & pieces', href: '/shop' }}
        next={{ label: 'The ገልጋይ Ledger', sublabel: 'Read buyer stories & vendor reviews', href: '/testimonials' }}
      />

      <InlineAuthFooter onAccountClick={() => setIsTelegramAuthOpen(true)} />

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
        onOpenSell={() => setIsSellOpen(true)}
      />
    </div>
  );
}
