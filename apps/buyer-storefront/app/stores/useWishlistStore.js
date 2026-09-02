'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

// IndexedDB storage adapter for Zustand
const indexedDBStorage = {
  getItem: async (name) => {
    if (typeof window === 'undefined') return null;
    try {
      const value = await get(name);
      return value ?? null;
    } catch (err) {
      console.warn('[WishlistStore] IndexedDB read error:', err);
      return null;
    }
  },
  setItem: async (name, value) => {
    if (typeof window === 'undefined') return;
    try {
      await set(name, value);
    } catch (err) {
      console.warn('[WishlistStore] IndexedDB write error:', err);
    }
  },
  removeItem: async (name) => {
    if (typeof window === 'undefined') return;
    try {
      await del(name);
    } catch (err) {
      console.warn('[WishlistStore] IndexedDB delete error:', err);
    }
  }
};

export const useWishlistStore = create(
  persist(
    (set, get) => ({
      // Strictly empty by default - no hardcoded liked items
      wishlistIds: [],
      wishlistProducts: [],
      isLoading: false,

      // Fetch user's synchronized wishlist from backend database
      fetchWishlist: async (apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') => {
        set({ isLoading: true });
        try {
          const res = await fetch(`${apiUrl}/api/products/wishlist/items`, {
            credentials: 'include'
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.wishlistIds)) {
            set({
              wishlistIds: data.wishlistIds,
              wishlistProducts: data.products || [],
              isLoading: false
            });
          } else {
            set({ isLoading: false });
          }
        } catch (err) {
          set({ isLoading: false });
        }
      },

      // Toggle a product in wishlist, syncing optimistically locally and with backend DB
      toggleWishlist: async (productId, apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') => {
        if (!productId) return;
        const strId = String(productId);
        const current = get().wishlistIds;
        const exists = current.includes(strId);

        // Optimistic local update
        const updated = exists
          ? current.filter((id) => id !== strId)
          : [...current, strId];

        set({ wishlistIds: updated });

        // Synchronize with backend API Gateway
        try {
          const res = await fetch(`${apiUrl}/api/products/wishlist/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ productId: strId })
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.wishlistIds)) {
            set({ wishlistIds: data.wishlistIds });
          }
        } catch (err) {
          // If offline / guest, local optimistic update remains active in IndexedDB
        }
      },

      isWishlisted: (productId) => {
        if (!productId) return false;
        return get().wishlistIds.includes(String(productId));
      },

      clearWishlist: () => set({ wishlistIds: [], wishlistProducts: [] }),

      getWishlistCount: () => get().wishlistIds.length
    }),
    {
      name: 'paleo_wishlist_idb',
      storage: createJSONStorage(() => indexedDBStorage),
      skipHydration: false
    }
  )
);
