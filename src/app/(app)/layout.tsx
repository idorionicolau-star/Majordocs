
"use client";

import { Header } from "@/components/layout/header";
import { SubHeader } from "@/components/layout/sub-header";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { mainNavItems } from "@/lib/data";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);
  const minSwipeDistance = 50; 

  const currentPageIndex = mainNavItems.findIndex(item => item.href === pathname);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = null; // Reset on new touch
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    
    const distance = touchStartRef.current - touchEndRef.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      const nextPageIndex = currentPageIndex + 1;
      if (nextPageIndex < mainNavItems.length) {
        const nextPath = mainNavItems[nextPageIndex].href;
        router.push(nextPath);
      }
    } else if (isRightSwipe) {
      const prevPageIndex = currentPageIndex - 1;
      if (prevPageIndex >= 0) {
        const prevPath = mainNavItems[prevPageIndex].href;
        router.push(prevPath);
      }
    }
    
    touchStartRef.current = null;
    touchEndRef.current = null;
  };
  
  const touchHandlers = isMobile ? {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  } : {};

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <SubHeader />
      <main 
        className="flex-1 p-4 sm:p-6 md:p-8"
        {...touchHandlers}
      >
        {children}
      </main>
    </div>
  );
}
