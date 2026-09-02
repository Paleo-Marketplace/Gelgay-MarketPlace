'use client';

import { create } from 'zustand';
import { get, set, del } from 'idb-keyval';

const getStorageKey = (userId) => {
  return userId ? `cart_${userId}` : 'cart_guest';
};

const readCartFromStorage = async (key) => {
  if (typeof window === 'undefined') return [];
  try {
    const value = await get(key);
    return Array.isArray(value) ? value : [];
  } catch (err) {
    console.warn('[CartStore] IndexedDB read error:', err);
    return [];
  }
};

const writeCartToStorage = async (key, items) => {
  if (typeof window === 'undefined') return;
  try {
    await set(key, items);
  } catch (err) {
    console.warn('[CartStore] IndexedDB write error:', err);
  }
};

const removeCartFromStorage = async (key) => {
  if (typeof window === 'undefined') return;
  try {
    await del(key);
  } catch (err) {
    console.warn('[CartStore] IndexedDB delete error:', err);
  }
};

export const useCartStore = create((setStore, getStore) => ({
  items: [],
  currentUserId: null,
  currentUserRole: null,

  // Synchronize cart with active authenticated session & role
  syncUserCart: async (userId, role) => {
    const key = getStorageKey(userId);
    const storedItems = await readCartFromStorage(key);

    setStore({
      items: storedItems,
      currentUserId: userId || null,
      currentUserRole: role || null
    });
  },

  addItem: (product) => {
    if (!product) return;
    const { currentUserId, items } = getStore();
    const productId = product._id || product.id;
    if (!productId) return;

    const normalizedProduct = {
      ...product,
      _id: productId,
      id: productId,
      title: product.title || 'Marketplace Item',
      price: Number(product.price) || Number(product.priceETB) || 0,
      priceETB: Number(product.price) || Number(product.priceETB) || 0,
      image: (Array.isArray(product.images) && product.images[0]) || product.image || '/assets/categories/electronics.jpg',
      images: Array.isArray(product.images) ? product.images : [product.image || '/assets/categories/electronics.jpg']
    };

    const existing = items.find((item) => (item._id || item.id) === productId);
    let nextItems;

    if (existing) {
      nextItems = items.map((item) =>
        (item._id || item.id) === productId ? { ...item, qty: (item.qty || 1) + 1 } : item
      );
    } else {
      nextItems = [...items, { ...normalizedProduct, qty: 1 }];
    }

    setStore({ items: nextItems });
    const key = getStorageKey(currentUserId);
    writeCartToStorage(key, nextItems);
  },

  removeOne: (productId) => {
    const { currentUserId, items } = getStore();
    const target = items.find((item) => (item._id || item.id) === productId);
    if (!target) return;

    let nextItems;
    if ((target.qty || 1) <= 1) {
      nextItems = items.filter((item) => (item._id || item.id) !== productId);
    } else {
      nextItems = items.map((item) =>
        (item._id || item.id) === productId ? { ...item, qty: item.qty - 1 } : item
      );
    }

    setStore({ items: nextItems });
    const key = getStorageKey(currentUserId);
    writeCartToStorage(key, nextItems);
  },

  clearCart: () => {
    const { currentUserId } = getStore();
    setStore({ items: [] });
    const key = getStorageKey(currentUserId);
    removeCartFromStorage(key);
  },

  resetCart: () => {
    setStore({
      items: [],
      currentUserId: null,
      currentUserRole: null
    });
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
      } catch (e) {}
    }
  },

  getTotalAmount: () => {
    return getStore().items.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
  }
}));
