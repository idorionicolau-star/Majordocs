
'use client';

import { ClientLayout } from '@/components/layout/client-layout';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The ClientLayout component now handles the main structure including headers.
  return <ClientLayout>{children}</ClientLayout>;
}
