import { useAuthStore } from '@/admin/auth/store/auth-store';
import { registerAuthHttpBridge } from '@/core/http/auth-bridge';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

registerAuthHttpBridge({
  syncFromStorage: () => useAuthStore.getState().syncFromStorage(),
  clearLocal: () => useAuthStore.getState().clearLocal(),
});

SplashScreen.preventAutoHideAsync();

function AuthHydration() {
  const isReady = useAuthStore((s) => s.isReady);

  useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (isReady) {
      void SplashScreen.hideAsync();
    }
  }, [isReady]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthHydration />
      {children}
    </QueryClientProvider>
  );
}
