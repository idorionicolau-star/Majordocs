
"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/components/theme-provider"
import { useEffect, useState, useRef } from 'react';
import { FirebaseProvider } from '@/firebase';
import { Header } from "@/components/layout/header";
import { SubHeader } from "@/components/layout/sub-header";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname, useRouter } from "next/navigation";
import { mainNavItems } from "@/lib/data";
import { cn } from "@/lib/utils";

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
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();

  const [animationClass, setAnimationClass] = useState("animate-in");
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);
  const minSwipeDistance = 50; 
  const navigationDirection = useRef<'left' | 'right' | null>(null);

  const currentPageIndex = mainNavItems.findIndex(item => item.href === pathname);


  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = null; // Reset on new touch
    touchStartRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
    navigationDirection.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    touchEndRef.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    };
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    
    const xDiff = touchStartRef.current.x - touchEndRef.current.x;
    const yDiff = touchStartRef.current.y - touchEndRef.current.y;

    if (Math.abs(yDiff) > Math.abs(xDiff)) {
        touchStartRef.current = null;
        touchEndRef.current = null;
        return;
    }

    const isLeftSwipe = xDiff > minSwipeDistance;
    const isRightSwipe = xDiff < -minSwipeDistance;

    if (isLeftSwipe) {
      const nextPageIndex = currentPageIndex + 1;
      if (nextPageIndex < mainNavItems.length) {
        navigationDirection.current = 'left';
        setAnimationClass("animate-slide-out-to-left");
        const nextPath = mainNavItems[nextPageIndex].href;
        setTimeout(() => router.push(nextPath), 150);
      }
    } else if (isRightSwipe) {
      const prevPageIndex = currentPageIndex - 1;
      if (prevPageIndex >= 0) {
        navigationDirection.current = 'right';
        setAnimationClass("animate-slide-out-to-right");
        const prevPath = mainNavItems[prevPageIndex].href;
        setTimeout(() => router.push(prevPath), 150);
      }
    }
    
    touchStartRef.current = null;
    touchEndRef.current = null;
  };
  
  useEffect(() => {
      if (navigationDirection.current === 'left') {
        setAnimationClass('animate-slide-in-from-right');
      } else if (navigationDirection.current === 'right') {
        setAnimationClass('animate-slide-in-from-left');
      } else {
        setAnimationClass('animate-in');
      }
  }, [pathname]);

  const touchHandlers = isMobile ? {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  } : {};

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
          <FirebaseProvider>
            <div className="flex min-h-screen w-full flex-col bg-background overflow-x-hidden">
                <Header />
                <SubHeader />
                <main 
                key={pathname}
                className={cn("flex-1 p-4 sm:p-6 md:p-8", isMobile && animationClass)}
                {...touchHandlers}
                >
                {children}
                </main>
            </div>
            <Toaster />
          </FirebaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
