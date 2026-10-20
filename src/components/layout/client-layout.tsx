
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
import { TourHost } from '@/components/onboarding/app-tour';
import { GuideHost } from '@/components/guide/guide-host';
import { SaleSheetHost } from '@/components/sales/sale-sheet';
import { KeyboardDismiss } from '@/components/layout/keyboard-dismiss';
import { SeenSync } from '@/components/guide/seen-sync';
import { SupportDialog } from '@/components/support/support-dialog';
import { PendingCoupon } from '@/components/billing/pending-coupon';
import { EscalepayClaim, useFromEscalepay } from '@/components/billing/escalepay-claim';
import { ActivityPing } from '@/components/layout/activity-ping';
import { whatsappLink } from '@/lib/support';

import { LoadingBar } from './loading-bar';
import { SubscriptionExpired } from './subscription-expired';

import { differenceInDays } from 'date-fns';

import { useSearchParams } from 'next/navigation';
import { TrialBanner, RenewBanner, EscalepayPendingBanner } from './trial-banner';
import { PlanGate } from '@/components/billing/plan-gate';
import { EmailConfirmHost } from '@/components/billing/email-confirm';
import { companyHas, featureForPath } from '@/lib/tiers';

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
  const isManager = authContext?.user?.role === 'Admin' || authContext?.user?.role === 'Dono';
  // página fora do plano da empresa: mostra o que o plano seguinte dá (ver lib/tiers.ts)
  const gatedFeature = featureForPath(pathname);
  const planLocked = !!gatedFeature && !companyHas(authContext?.companyData, gatedFeature);
  const isAuthPage = pathname === '/login' || pathname === '/register';
  // páginas que qualquer pessoa pode ler, com ou sem conta (termos, privacidade)
  const isPublicPage = pathname === '/termos' || pathname === '/privacidade';

  const [openCommandMenu, setOpenCommandMenu] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const isReadOnly = authContext?.isReadOnly ?? false;
  const isTrial = authContext?.isTrial ?? false;
  const renewInDays = authContext?.renewInDays ?? null;
  const daysLeft = authContext?.daysLeft ?? 0;
  const fromEscalepay = useFromEscalepay();

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

    if (!isAuthenticated && !isAuthPage && !isPublicPage) {
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

  }, [authContext?.loading, authContext?.firebaseUser, pathname, router, isAuthPage, isPublicPage]);


  if (isPublicPage) return <div>{children}</div>;

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

        {/* Avisos de subscrição: o pagamento é do Dono / Administrador. Um funcionário não pode pagar — vê só,
            se a conta estiver parada, que deve falar com o responsável (sem preços nem "subscreva"). */}
        {isReadOnly && !isManager && (
          <div role="status" className="bg-slate-700 text-white text-center py-2.5 px-4 text-sm font-medium sticky top-0 z-[60] shadow-md">
            Modo leitura — por agora não é possível registar. Fale com o responsável da empresa.
          </div>
        )}
        {isReadOnly && isManager && (
          <div className="bg-gradient-to-r from-amber-600 to-rose-600 text-white text-center py-2.5 px-4 text-sm font-medium sticky top-0 z-[60] shadow-md flex flex-wrap justify-center items-center gap-3 animate-in slide-in-from-top duration-300">
            <span>Modo leitura — a sua assinatura não está activa. Pague para voltar a ter acesso completo na hora.</span>
            <a
              href="/billing"
              className="bg-white text-rose-700 hover:bg-white/90 px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-1"
            >
              💳 Pagar agora
            </a>
            <a 
              href={whatsappLink("Olá, a minha conta MajorStockX está em modo leitura. Preciso de ajuda para reactivar.")}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-rose-700 hover:bg-white/90 px-3 py-1 rounded-md text-xs font-bold transition-all shadow-sm flex items-center gap-1"
            >
              💬 Contactar Suporte (WhatsApp)
            </a>
          </div>
        )}

        {/* quem veio da EscalePay já pagou lá: sem contagem do teste. Nas páginas de venda não aparece: há um cliente à espera */}
        {isTrial && isManager && !pathname.startsWith('/pos') && (fromEscalepay ? <EscalepayPendingBanner daysLeft={daysLeft} /> : <TrialBanner companyId={authContext?.companyId} daysLeft={daysLeft} coupon={authContext?.companyData?.coupon} />)}

        {isManager && !isReadOnly && !isTrial && typeof renewInDays === 'number' && <RenewBanner companyId={authContext?.companyId} renewInDays={renewInDays} coupon={authContext?.companyData?.coupon} />}

        <div className={`flex min-h-screen w-full bg-transparent ${isTrial ? 'pt-0' : ''}`}>
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 min-h-screen transition-[margin,width] duration-300 ease-in-out md:ml-64">
            <Header onSearchClick={() => setOpenCommandMenu(true)} />
            <main className="flex-1 relative overflow-x-clip">
              <SwipeNav>
                <EmailConfirmHost />
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
                  {planLocked && gatedFeature ? <PlanGate feature={gatedFeature} isManager={isManager} /> : children}
                </Suspense>
              </SwipeNav>
            </main>
          </div>
          <BottomNav onMenuClick={() => setIsMobileNavOpen(true)} />
          <TourHost />
          <SeenSync />
          <SupportDialog />
          <PendingCoupon />
          <EscalepayClaim />
          <ActivityPing />
          <GuideHost />
          <SaleSheetHost />
          <KeyboardDismiss />
          <CommandMenu open={openCommandMenu} setOpen={setOpenCommandMenu} />
        </div>
        <SheetContent side="left" className="p-0 glass-panel border-r border-white/10">
          <MobileNav onLinkClick={() => setIsMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
