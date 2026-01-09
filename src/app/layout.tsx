
"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { useEffect, useState } from 'react';
import AppLayout from '@/app/(app)/layout';

// Using Inter font for a modern, clean look
import { Inter, Space_Grotesk } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-headline',
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <title>MajorStockX</title>
        <meta name="description" content="Sistema de gestão de estoque e produção para materiais de construção." />
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0d1117" media="(prefers-color-scheme: dark)" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          storageKey="majorstockx-theme"
        >
            {isClient ? <AppLayout>{children}</AppLayout> : null}
            {isClient && <Toaster />}
        </ThemeProvider>
      </body>
    </html>
  );
}
