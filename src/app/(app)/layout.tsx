
'use client';

import { InventoryProvider } from '@/context/inventory-context';
import { AuthGuard } from '@/firebase/auth/auth-guard';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <AuthGuard>
        <InventoryProvider>
          {children}
        </InventoryProvider>
      </AuthGuard>
  );
}
