
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

import { BottomNav } from './bottom-nav';
import { SwipeNav } from './swipe-nav';
import { PushPrompt } from '@/components/push-notifications';
import { PriceReviewBanner } from '@/components/price-reviews';
import { OfflineBanner, UpdateNotice } from '@/components/pwa-register';
import { InstallPrompt } from '@/components/install-prompt';

import { LoadingBar } from './loading-bar';
import { SubscriptionExpired } from './subscription-expired';

import { differenceInDays } from 'date-fns';

import { useSearchParams } from 'next/navigation';
import { trialMessage, trialTone } from '@/lib/trial';

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

  const isReadOnly = authContext?.isReadOnly ?? false;
  const isTrial = authContext?.isTrial ?? false;
  const renewInDays = authContext?.renewInDays ?? null;
  const daysLeft = authContext?.daysLeft ?? 0;

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



  return (
    <>
      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <Suspense fallback={null}>
          <LoadingBar />
          <NavigationObserver onNavigate={handleNavigationTransition} />
        </Suspense>

        {isReadOnly && (
          <div className="bg-gradient-to-r from-amber-600 to-rose-600 text-white text-center py-2.5 px-4 text-sm font-medium sticky top-0 z-[60] shadow-md flex flex-wrap justify-center items-center gap-3 animate-in slide-in-from-top duration-300">
            <span>Modo leitura — a sua assinatura não está activa. Pague para voltar a ter acesso completo na hora.</span>
            <a
              href="/billing"
              className="bg-white text-rose-700 hover:bg-white/90 px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-1"
            >
              💳 Pagar agora
            </a>
            <a 
              href="https://wa.me/258843427497"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-rose-700 hover:bg-white/90 px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-1"
            >
              💬 Contactar Suporte (WhatsApp)
            </a>
          </div>
        )}

        {isTrial && (() => {
          const tone = trialTone(daysLeft);
          const bg = tone === 'urgent' ? 'bg-rose-600' : tone === 'soon' ? 'bg-amber-500' : 'bg-blue-600';
          const btn = tone === 'urgent' ? 'text-rose-700' : tone === 'soon' ? 'text-amber-700' : 'text-blue-700';
          return (
            <div className={`${bg} text-white text-center py-2 px-4 text-sm font-medium sticky top-0 z-[60] shadow-md flex flex-wrap justify-center items-center gap-2`}>
              <span>{trialMessage(daysLeft)}</span>
              <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold">{daysLeft <= 0 ? 'Último dia' : daysLeft === 1 ? 'Resta 1 dia' : `Restam ${daysLeft} dias`}</span>
              <a href="/billing" className={`rounded bg-white px-2 py-0.5 text-xs font-bold hover:bg-white/90 ${btn}`}>Subscrever</a>
            </div>
          );
        })()}

        {!isReadOnly && !isTrial && typeof renewInDays === 'number' && (
          <div className="bg-amber-500 text-white text-center py-2 px-4 text-sm font-medium sticky top-0 z-[60] shadow-md flex flex-wrap justify-center items-center gap-2">
            <span>{renewInDays > 0 ? `A sua subscrição termina em ${renewInDays} dia(s).` : 'A sua subscrição terminou — está no período de tolerância.'}</span>
            <a href="/billing" className="rounded bg-white px-2 py-0.5 text-xs font-bold text-amber-700 hover:bg-white/90">Renovar</a>
          </div>
        )}

        <div className={`flex min-h-screen w-full bg-transparent ${isTrial ? 'pt-0' : ''}`}>
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 min-h-screen transition-[margin,width] duration-300 ease-in-out md:ml-64">
            <Header onSearchClick={() => setOpenCommandMenu(true)} />
            <main className="flex-1 relative overflow-x-clip">
              <SwipeNav>
                <OfflineBanner />
                <UpdateNotice />
                <InstallPrompt />
                <PushPrompt />
                <PriceReviewBanner />
                <Suspense fallback={
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  </div>
                }>
                  {children}
                </Suspense>
              </SwipeNav>
            </main>
          </div>
          <BottomNav onMenuClick={() => setIsMobileNavOpen(true)} />
          <CommandMenu open={openCommandMenu} setOpen={setOpenCommandMenu} />
        </div>
        <SheetContent side="left" className="p-0 glass-panel border-r border-white/10">
          <MobileNav onLinkClick={() => setIsMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
