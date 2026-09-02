'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/useAuthStore';
import { useThemeStore } from './stores/useThemeStore';

import RegistrationOnboardingGate from '../components/RegistrationOnboardingGate';
import TelegramAuthModal from '../components/TelegramAuthModal';

export default function Providers({ children }) {
  const isAuthModalOpen = useAuthStore((state) => state.isAuthModalOpen);
  const closeAuthModal = useAuthStore((state) => state.closeAuthModal);

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
    </QueryClientProvider>
  );
}
