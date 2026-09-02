'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/useAuthStore';
import { useThemeStore } from './stores/useThemeStore';
import { useCartStore } from './stores/useCartStore';

import RegistrationOnboardingGate from '../components/RegistrationOnboardingGate';
import TelegramAuthModal from '../components/TelegramAuthModal';
import MobileBottomNav from '../components/MobileBottomNav';
import CartDrawer from '../components/CartDrawer';

export default function Providers({ children }) {
  const pathname = usePathname();
  const isCheckout = pathname === '/checkout';
  const isAuthModalOpen = useAuthStore((state) => state.isAuthModalOpen);
  const closeAuthModal = useAuthStore((state) => state.closeAuthModal);

  // Global Mobile Cart state
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const cartItems = useCartStore((state) => state.items);
  const removeOne = useCartStore((state) => state.removeOne);
  const clearCart = useCartStore((state) => state.clearCart);

  const cartProducts = useMemo(() => {
    return cartItems.map((item) => ({
      id: item._id || item.id,
      title: item.title,
      priceETB: item.price || item.priceETB || 0,
      image: item.image || item.photos?.[0] || '/assets/front.jpg',
      category: item.category || 'Curated Object',
      condition: item.condition || 'Archival Condition',
      vendorName: item.vendorName || (typeof item.vendorId === 'object' ? item.vendorId?.storeName : 'ገልጋይ Verified Vendor')
    }));
  }, [cartItems]);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60, // 1 minute in-memory fresh cache (instant back navigation)
            gcTime: 1000 * 60 * 10, // 10 minutes cache garbage collection
            refetchOnWindowFocus: true, // Silently check stock updates in background
            retry: 1
          }
        }
      })
  );

  useEffect(() => {
    useThemeStore.getState().initTheme();
    useAuthStore.getState().fetchUser();

    const handleStorage = (e) => {
      if (e.key === 'paleo_theme' && e.newValue) {
        useThemeStore.getState().setTheme(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('auth_success') === 'true') {
        urlParams.delete('auth_success');
        const nextQuery = urlParams.toString();
        const nextUrl = window.location.pathname + (nextQuery ? `?${nextQuery}` : '');
        window.history.replaceState({}, document.title, nextUrl);
        useAuthStore.getState().fetchUser();
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RegistrationOnboardingGate />
      <TelegramAuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
      />
      {children}
      {!isCheckout && (
        <>
          <MobileBottomNav
            onOpenCart={() => setIsMobileCartOpen(true)}
          />
          <CartDrawer
            isOpen={isMobileCartOpen}
            onClose={() => setIsMobileCartOpen(false)}
            cartProducts={cartProducts}
            onRemoveFromCart={removeOne}
            onClearCart={clearCart}
          />
        </>
      )}
    </QueryClientProvider>
  );
}
