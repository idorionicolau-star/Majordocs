

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { Header } from './header';
import { SubHeader } from './sub-header';
import { motion, AnimatePresence } from 'framer-motion';
import { mainNavItems } from '@/lib/data';
import type { ModulePermission } from '@/lib/types';
import { Button } from '../ui/button';
import Link from 'next/link';
import { BottomNav } from './bottom-nav';


export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authContext = useContext(InventoryContext);
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const { canView } = useContext(InventoryContext) || { canView: () => false };
  
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
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
         {children}
        </motion.div>
      </AnimatePresence>
    );
  }
  
  return (
    <div className="flex min-h-screen w-full flex-col bg-background overflow-x-hidden">
      <Header />
      <SubHeader />
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-hidden relative main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
             {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  );
}
