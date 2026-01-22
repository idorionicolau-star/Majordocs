'use client';

import React from 'react';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseProvider } from '@/firebase/provider';
import { InventoryProvider } from '@/context/inventory-context';
import { ClientLayout } from '@/components/layout/client-layout';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <FirebaseProvider>
        <InventoryProvider>
          <FirebaseErrorListener />
          <ClientLayout>{children}</ClientLayout>
          <Toaster />
        </InventoryProvider>
      </FirebaseProvider>
    </ThemeProvider>
  );
}
