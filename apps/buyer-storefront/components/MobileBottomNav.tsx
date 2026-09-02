'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  MapPin,
  Grid,
  ShoppingBag,
  Truck,
  ClipboardList,
  Store,
  ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../app/stores/useAuthStore';
import { useCartStore } from '../app/stores/useCartStore';

interface MobileBottomNavProps {
  onOpenCart?: () => void;
  onOpenSell?: () => void;
}

export default function MobileBottomNav({
  onOpenCart,
  onOpenSell
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const cartItems = useCartStore((state) => state.items);

  const cartCount = cartItems.reduce((acc, i) => acc + (i.quantity || 1), 0);
  const isSeller = isAuthenticated && (user?.role === 'vendor' || user?.role === 'VENDOR');
  const isBuyer = isAuthenticated && !isSeller;

  return (
    <div className="block md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/95 dark:bg-[#151412]/95 backdrop-blur-xl border-t border-[#E2DDD3] dark:border-[#2C2924] pb-safe shadow-lg">
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto items-center px-1">
        
        {/* 1. Explore / Shop */}
        <Link
          href="/shop"
          className={`flex flex-col items-center justify-center gap-1 py-1 tap-feedback transition-colors ${
            pathname === '/shop' || pathname === '/'
              ? 'text-[#C85A32] font-semibold'
              : 'text-[#7C776E] hover:text-[#1F1E1B] dark:text-[#A5A096] dark:hover:text-[#FAF8F5]'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="font-mono text-[10px] font-semibold">Explore</span>
        </Link>

        {/* 2. Hyperlocal Discovery: Near Me */}
        <Link
          href="/shops"
          className={`flex flex-col items-center justify-center gap-1 py-1 tap-feedback transition-colors relative ${
            pathname === '/shops' || pathname === '/nearby'
              ? 'text-[#C85A32] font-semibold'
              : 'text-[#7C776E] hover:text-[#1F1E1B] dark:text-[#A5A096] dark:hover:text-[#FAF8F5]'
          }`}
        >
          <div className="relative">
            <MapPin className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#C85A32] animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#C85A32]" />
          </div>
          <span className="font-mono text-[10px] font-semibold">Near Me</span>
        </Link>

        {/* 3. Categories */}
        <Link
          href="/categories"
          className={`flex flex-col items-center justify-center gap-1 py-1 tap-feedback transition-colors ${
            pathname === '/categories'
              ? 'text-[#C85A32] font-semibold'
              : 'text-[#7C776E] hover:text-[#1F1E1B] dark:text-[#A5A096] dark:hover:text-[#FAF8F5]'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span className="font-mono text-[10px] font-semibold">Categories</span>
        </Link>

        {/* 4. Track (Buyer) or Studio Orders (Seller) or Buyer Protection (Guest) */}
        {isSeller ? (
          <Link
            href="/orders"
            className={`flex flex-col items-center justify-center gap-1 py-1 tap-feedback transition-colors ${
              pathname === '/orders'
                ? 'text-[#C85A32] font-semibold'
                : 'text-[#7C776E] hover:text-[#1F1E1B] dark:text-[#A5A096] dark:hover:text-[#FAF8F5]'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="font-mono text-[10px] font-semibold">Orders</span>
          </Link>
        ) : isBuyer ? (
          <Link
            href="/track"
            className={`flex flex-col items-center justify-center gap-1 py-1 tap-feedback transition-colors ${
              pathname === '/track'
                ? 'text-[#C85A32] font-semibold'
                : 'text-[#7C776E] hover:text-[#1F1E1B] dark:text-[#A5A096] dark:hover:text-[#FAF8F5]'
            }`}
          >
            <Truck className="w-5 h-5" />
            <span className="font-mono text-[10px] font-semibold">Track</span>
          </Link>
        ) : (
          <Link
            href="/buyer-protection"
            className={`flex flex-col items-center justify-center gap-1 py-1 tap-feedback transition-colors ${
              pathname === '/buyer-protection'
                ? 'text-[#C85A32] font-semibold'
                : 'text-[#7C776E] hover:text-[#1F1E1B] dark:text-[#A5A096] dark:hover:text-[#FAF8F5]'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="font-mono text-[10px] font-semibold">Trust</span>
          </Link>
        )}

        {/* 5. Cart / Bag (or Sell for Vendor) */}
        {isSeller ? (
          <button
            type="button"
            onClick={onOpenSell}
            className="flex flex-col items-center justify-center gap-1 py-1 text-[#C85A32] tap-feedback font-mono"
          >
            <div className="w-7 h-7 rounded-full bg-[#C85A32] text-white flex items-center justify-center shadow-xs">
              <Store className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold">Sell</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenCart}
            className="flex flex-col items-center justify-center gap-1 py-1 text-[#7C776E] hover:text-[#1F1E1B] dark:text-[#A5A096] dark:hover:text-[#FAF8F5] tap-feedback relative"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#C85A32] text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-4 text-center shadow-xs">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="font-mono text-[10px] font-semibold">Bag</span>
          </button>
        )}

      </div>
    </div>
  );
}
