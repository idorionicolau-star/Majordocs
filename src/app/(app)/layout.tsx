
'use client';

import { InventoryProvider } from '@/context/inventory-context';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <InventoryProvider>
        {children}
    </InventoryProvider>
  );
}
