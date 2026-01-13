

'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { Header } from './header';
import { SubHeader } from './sub-header';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authContext = useContext(InventoryContext);
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isOnboardingPage = pathname === '/onboarding';

  useEffect(() => {
    if (authContext?.loading) {
      return; // 1. Aguarda o fim do carregamento do estado de autenticação.
    }

    const isAuthenticated = !!authContext?.user;
    const needsOnboarding = authContext?.needsOnboarding;

    if (isAuthenticated) {
      if (needsOnboarding) {
        // 2. Utilizador autenticado precisa de onboarding.
        if (!isOnboardingPage) {
          router.replace('/onboarding');
        }
      } else {
        // 3. Utilizador autenticado e com onboarding completo.
        if (isAuthPage || isOnboardingPage) {
          // Se estiver numa página de autenticação ou onboarding, vai para o dashboard.
          router.replace('/dashboard');
        }
      }
    } else {
      // 4. Utilizador não autenticado.
      if (!isAuthPage && !isOnboardingPage) {
        // Se não estiver numa página pública (auth/onboarding), vai para o login.
        router.replace('/login');
      }
    }
  }, [authContext?.loading, authContext?.user, authContext?.needsOnboarding, pathname, router, isAuthPage, isOnboardingPage]);


  if (authContext?.loading) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">A carregar aplicação...</p>
        </div>
      </div>
    );
  }
  
  if (!authContext?.user && !isAuthPage && !isOnboardingPage) {
     return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">A redirecionar para o login...</p>
        </div>
      </div>
    );
  }

  // Se for uma página de autenticação ou onboarding, renderiza-a sem o layout principal.
  if (isAuthPage || isOnboardingPage) {
    return <>{children}</>;
  }
  
  // Se o utilizador está autenticado e com onboarding completo, mostra o layout principal.
  if (authContext?.user && !authContext.needsOnboarding) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-background overflow-x-hidden">
        <Header />
        <SubHeader />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    );
  }

  // Fallback para qualquer outro caso (ex: durante um redirecionamento rápido)
  return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">A verificar sessão...</p>
        </div>
      </div>
    );
}
