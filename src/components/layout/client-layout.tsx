

'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { Header } from './header';
import { SubHeader } from './sub-header';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { mainNavItems } from '@/lib/data';
import type { ModulePermission } from '@/lib/types';


export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authContext = useContext(InventoryContext);
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const { canView } = useContext(InventoryContext) || { canView: () => false };
  
  const [navDirection, setNavDirection] = useState(0);

  useEffect(() => {
    if (authContext?.loading) {
      return; 
    }

    const isAuthenticated = !!authContext?.firebaseUser;

    if (isAuthenticated && isAuthPage) {
        router.replace('/dashboard');
    }
    
    if (!isAuthenticated && !isAuthPage) {
        router.replace('/login');
    }

  }, [authContext?.loading, authContext?.firebaseUser, pathname, router, isAuthPage]);


  const availableNavItems = mainNavItems.filter(item => canView(item.id as ModulePermission));
  const currentIndex = availableNavItems.findIndex(item => pathname.startsWith(item.href));

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    const offset = info.offset.x;

    if (offset > swipeThreshold && currentIndex > 0) {
      // Swipe Right
      setNavDirection(-1);
      const prevPage = availableNavItems[currentIndex - 1];
      router.push(prevPage.href);
    } else if (offset < -swipeThreshold && currentIndex < availableNavItems.length - 1) {
      // Swipe Left
      setNavDirection(1);
      const nextPage = availableNavItems[currentIndex + 1];
      router.push(nextPage.href);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
    }),
  };


  if (authContext?.loading || (!authContext?.firebaseUser && !isAuthPage)) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">A carregar aplicação...</p>
        </div>
      </div>
    );
  }
  
  if (isAuthPage) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex min-h-screen w-full flex-col bg-background overflow-x-hidden">
      <Header />
      <SubHeader />
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-hidden relative">
         <AnimatePresence initial={false} custom={navDirection} mode="wait">
           <motion.div
              key={pathname}
              custom={navDirection}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              className="w-full h-full"
            >
              {children}
            </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
