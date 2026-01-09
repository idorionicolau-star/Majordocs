
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import React, { useRef, useState, useEffect, useContext } from 'react';
import { cn } from '@/lib/utils';
import { mainNavItems } from '@/lib/data';
import { Header } from './header';
import { SubHeader } from './sub-header';
import { AuthContext } from '@/firebase/auth/auth-context';
import { InventoryProvider } from '@/context/inventory-context';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const authContext = useContext(AuthContext);

  const [animationClass, setAnimationClass] = useState('animate-in');
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);
  const minSwipeDistance = 50;
  const navigationDirection = useRef<'left' | 'right' | null>(null);

  const currentPageIndex = mainNavItems.findIndex(
    (item) => item.href === pathname
  );

  const isAuthPage = pathname === '/login' || pathname === '/register';

  useEffect(() => {
    if (authContext && !authContext.loading && !authContext.user && !isAuthPage) {
      router.push('/login');
    }
  }, [authContext, router, isAuthPage]);


  const handleTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = null;
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
        setAnimationClass('animate-slide-out-to-left');
        const nextPath = mainNavItems[nextPageIndex].href;
        setTimeout(() => router.push(nextPath), 150);
      }
    } else if (isRightSwipe) {
      const prevPageIndex = currentPageIndex - 1;
      if (prevPageIndex >= 0) {
        navigationDirection.current = 'right';
        setAnimationClass('animate-slide-out-to-right');
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

  const touchHandlers = isMobile
    ? {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd,
      }
    : {};

  if (isAuthPage) {
    return <>{children}</>;
  }

  // Se a autenticação estiver a carregar ou se não houver utilizador, mostramos um ecrã de carregamento.
  // Isto impede que qualquer componente filho tente aceder a dados protegidos prematuramente.
  if (!authContext || authContext.loading || !authContext.user || !authContext.companyId) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        A carregar aplicação...
      </div>
    );
  }
    
  // Apenas quando a autenticação estiver confirmada e o companyId estiver presente,
  // renderizamos o layout completo da aplicação, agora envolvido pelo InventoryProvider.
  return (
    <InventoryProvider>
      <div className="flex min-h-screen w-full flex-col bg-background overflow-x-hidden">
        <Header />
        <SubHeader />
        <main
          key={pathname}
          className={cn('flex-1 p-4 sm:p-6 md:p-8', isMobile && animationClass)}
          {...touchHandlers}
        >
          {children}
        </main>
      </div>
    </InventoryProvider>
  );
}
