
"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { useEffect, useState } from 'react';

// This is a client component, so metadata is not used here.
// We keep the export for reference, but it won't be used by Next.js.
// export const metadata: Metadata = {
//   title: 'MajorStockX',
//   description: 'Sistema de gestão de estoque e produção para materiais de construção.',
//   manifest: '/manifest.json',
// };

// export const viewport: Viewport = {
//   themeColor: [
//     { media: "(prefers-color-scheme: light)", color: "#f0f2f5" },
//     { media: "(prefers-color-scheme: dark)", color: "#1a2233" },
//   ],
//   width: 'device-width',
//   initialScale: 1,
//   maximumScale: 1,
//   userScalable: false,
// }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const applySavedStyling = () => {
      if (typeof window !== 'undefined') {
        const root = document.documentElement;

        const storedRadius = localStorage.getItem('majorstockx-radius');
        if (storedRadius) {
          root.style.setProperty('--radius', `${storedRadius}rem`);
        }

        const storedShadowIntensity = localStorage.getItem('majorstockx-shadow-intensity');
        if (storedShadowIntensity) {
            root.style.setProperty('--shadow-intensity', (parseInt(storedShadowIntensity, 10) / 100).toString());
        }
      }
    };
    
    // Run on initial mount
    applySavedStyling();
    
    // Also apply on theme change
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "class" && (mutation.target as HTMLElement).tagName === 'BODY') {
          applySavedStyling();
        }
      }
    });
    
    observer.observe(document.body, { attributes: true });

    return () => observer.disconnect();
  }, []);


  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <title>MajorStockX</title>
        <meta name="description" content="Sistema de gestão de estoque e produção para materiais de construção." />
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="theme-color" content="#f0f2f5" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#1a2233" media="(prefers-color-scheme: dark)" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          storageKey="majorstockx-theme"
        >
          {isClient ? children : null}
          {isClient && <Toaster />}
        </ThemeProvider>
      </body>
    </html>
  );
}
