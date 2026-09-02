'use client';

import { create } from 'zustand';
import { useCartStore } from './useCartStore';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  hasInitialized: false,

  // Global Auth Modal Controls
  isAuthModalOpen: false,
  authModalReason: '',
  authModalMode: 'signin',
  onAuthSuccessCallback: null,

  openAuthModal: ({ reason = '', mode = 'signin', onSuccess = null } = {}) => {
    set({
      isAuthModalOpen: true,
      authModalReason: reason,
      authModalMode: mode,
      onAuthSuccessCallback: onSuccess
    });
  },

  closeAuthModal: () => {
    set({
      isAuthModalOpen: false,
      authModalReason: '',
      onAuthSuccessCallback: null
    });
  },

  setUser: (user) => {
    const isAuth = Boolean(user && (user.id || user._id || user.role || user.email || user.telegramUsername));
    const callback = get().onAuthSuccessCallback;

    set({
      user: user || null,
      isAuthenticated: isAuth,
      isLoading: false,
      hasInitialized: true,
      isAuthModalOpen: user ? false : get().isAuthModalOpen,
      onAuthSuccessCallback: null
    });

    if (isAuth && typeof callback === 'function') {
      try {
        callback(user);
      } catch (e) {
        console.error('Error in onAuthSuccessCallback:', e);
      }
    }

    if (!user) {
      useCartStore.getState().resetCart();
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.clear();
        } catch (e) {}
      }
    } else {
      const role = (user.role || '').toUpperCase();
      const userId = user.id || user._id;
      if (role === 'VENDOR' || role === 'ADMIN') {
        // Do not hydrate buyer cart for vendors or admins
        useCartStore.getState().resetCart();
      } else {
        useCartStore.getState().syncUserCart(userId, user.role);
      }
    }
  },

  fetchUser: async (apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') => {
    set({ isLoading: true });
    try {
      const res = await fetch(`${apiUrl}/api/auth/me`, {
        credentials: 'include',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.user) {
          get().setUser(data.user);
          return data.user;
        }
      }
      get().setUser(null);
      return null;
    } catch (err) {
      get().setUser(null);
      return null;
    }
  },

  logout: async (apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') => {
    set({ isLoading: true });
    try {
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      }).catch(() => {});
    } finally {
      useCartStore.getState().resetCart();
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.clear();
        } catch (e) {}
      }
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        hasInitialized: true,
        isAuthModalOpen: false
      });
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  }
}));
