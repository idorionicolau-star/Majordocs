
'use client';

// The AuthGuard and InventoryProvider logic has been moved to ClientLayout
// to ensure the correct initialization order and avoid race conditions.
// This layout now serves only as a route group marker for the application.

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
