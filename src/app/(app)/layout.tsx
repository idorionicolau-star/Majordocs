
'use client';

import { InventoryProvider } from '@/context/inventory-context';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The AuthGuard logic has been moved to ClientLayout.
  // This layout now just provides the data context for the authenticated app.
  return (
      <InventoryProvider>
        {children}
      </InventoryProvider>
  );
}
