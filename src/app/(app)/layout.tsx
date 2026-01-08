
"use client";

import { Header } from "@/components/layout/header";
import { SubHeader } from "@/components/layout/sub-header";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useContext } from "react";
import { mainNavItems } from "@/lib/data";
import { cn } from "@/lib/utils";
import { InventoryProvider } from "@/context/inventory-context";
import { useUser } from "@/firebase/auth/use-user";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from 'firebase/firestore';
import type { User as AppUser } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<AppUser>(userDocRef);

  const [animationClass, setAnimationClass] = useState("animate-in");
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);
  const minSwipeDistance = 50; 
  const navigationDirection = useRef<'left' | 'right' | null>(null);

  const currentPageIndex = mainNavItems.findIndex(item => item.href === pathname);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/');
    } else if (!userLoading && user && !profileLoading) {
      // If user is logged in but has no companyName and is not already on the registration page, redirect them.
      if (!user.displayName && pathname !== '/register-company') {
        router.replace('/register-company');
      }
    }
  }, [user, userLoading, userProfile, profileLoading, router, pathname]);

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

  if (userLoading || profileLoading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background">
        <Header />
        <SubHeader />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-8 w-full md:w-1/2" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!user || (!user.displayName && pathname !== '/register-company')) {
     return <div className="flex min-h-screen w-full items-center justify-center">A redirecionar...</div>;
  }
  
  // If user is on the company registration page, show only that page without the full layout
  if (pathname === '/register-company') {
      return (
         <div className="flex min-h-screen w-full flex-col bg-background">
            <main className="flex-1">
              {children}
            </main>
         </div>
      )
  }

  return (
    <InventoryProvider>
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
    </InventoryProvider>
  );
}
