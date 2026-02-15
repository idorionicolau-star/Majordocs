
'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useEffect, Suspense } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
const CommandMenu = dynamic(() => import('@/components/command-menu').then(mod => mod.CommandMenu), { ssr: false });
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { MobileNav } from './mobile-nav';
import { useNotifications } from '@/hooks/use-notifications';
import { useSwipeNavigation } from '@/hooks/use-swipe-navigation';

import { LoadingBar } from './loading-bar';

import { useSearchParams } from 'next/navigation';

function NavigationObserver({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    onNavigate();
  }, [pathname, searchParams, onNavigate]);

  return null;
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authContext = React.useContext(InventoryContext);
  const isAuthPage = pathname === '/login' || pathname === '/register';

  const [openCommandMenu, setOpenCommandMenu] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Initialize notifications
  useNotifications();

  // Initialize Swipe Navigation (Safe Mode)
  useSwipeNavigation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpenCommandMenu((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, []);

  const handleNavigationTransition = React.useCallback(() => {
    setIsMobileNavOpen(false);
  }, []);

  // Track the path from URL on first load (before any redirects happen)
  const initialPathRef = React.useRef<string | null>(pathname);
  const hasRestoredRef = React.useRef(false);

  React.useEffect(() => {
    if (authContext?.loading) {
      return;
    }

    const isAuthenticated = !!authContext?.firebaseUser;

    // Save current path if authenticated and not on auth pages
    if (isAuthenticated && !isAuthPage && pathname) {
      localStorage.setItem('majorstockx-last-path', pathname + (window.location.search || ''));
    }

    if (isAuthenticated && isAuthPage) {
      router.replace('/dashboard');
    }

    if (!isAuthenticated && !isAuthPage) {
      router.replace('/login');
    }

    // Restore last path on mount (only once) — handles the case where
    // root page.tsx redirects to /dashboard after a refresh
    if (isAuthenticated && !hasRestoredRef.current) {
      hasRestoredRef.current = true;
      const lastPath = localStorage.getItem('majorstockx-last-path');
      if (
        lastPath &&
        lastPath !== pathname &&
        lastPath !== '/dashboard' &&
        !lastPath.includes('/login') &&
        !lastPath.includes('/register')
      ) {
        router.replace(lastPath);
      }
    }

  }, [authContext?.loading, authContext?.firebaseUser, pathname, router, isAuthPage]);


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
      <div>
        {children}
      </div>
    );
  }

  <div className="p-4 sm:p-6 md:p-8 main-content overflow-y-auto h-[calc(100vh-64px)]">
    <Suspense fallback={
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    }>
      {children}
    </Suspense>
  </div>
            </main >
          </div >
    <CommandMenu open={openCommandMenu} setOpen={setOpenCommandMenu} />
        </div >
    <SheetContent side="left" className="p-0 glass-panel border-r border-white/10">
      <MobileNav onLinkClick={() => setIsMobileNavOpen(false)} />
    </SheetContent>
      </Sheet >
    </>
  );
}
