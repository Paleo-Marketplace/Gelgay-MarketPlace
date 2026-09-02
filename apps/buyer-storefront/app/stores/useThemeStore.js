'use client';

import { create } from 'zustand';

const applyThemeToDOM = (isDark) => {
  if (typeof document === 'undefined') return;
  if (isDark) {
    document.documentElement.classList.add('dark', 'dark-theme');
    if (document.body) {
      document.body.classList.add('dark', 'dark-theme');
    }
  } else {
    document.documentElement.classList.remove('dark', 'dark-theme');
    if (document.body) {
      document.body.classList.remove('dark', 'dark-theme');
    }
  }
};

export const useThemeStore = create((set, get) => ({
  isDarkMode: false,
  hasHydrated: false,

  initTheme: () => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('paleo_theme');
      let isDark = false;
      if (saved === 'dark') {
        isDark = true;
      } else if (saved === 'light') {
        isDark = false;
      } else {
        isDark = document.documentElement.classList.contains('dark');
      }

      applyThemeToDOM(isDark);
      set({ isDarkMode: isDark, hasHydrated: true });
    } catch (e) {
      set({ hasHydrated: true });
    }
  },

  toggleTheme: () => {
    if (typeof window === 'undefined') return;
    const nextDark = !get().isDarkMode;
    try {
      localStorage.setItem('paleo_theme', nextDark ? 'dark' : 'light');
    } catch (e) {}
    applyThemeToDOM(nextDark);
    set({ isDarkMode: nextDark });
  },

  setTheme: (theme) => {
    if (typeof window === 'undefined') return;
    const isDark = theme === 'dark';
    try {
      localStorage.setItem('paleo_theme', isDark ? 'dark' : 'light');
    } catch (e) {}
    applyThemeToDOM(isDark);
    set({ isDarkMode: isDark });
  }
}));
