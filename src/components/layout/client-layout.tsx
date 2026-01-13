

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

  // 1. CHAME SEMPRE OS HOOKS NA MESMA ORDEM
  useEffect(() => {
    // Se o contexto terminou de carregar e não há utilizador, e não estamos numa página de autenticação, redireciona.
    if (!authContext?.loading && !authContext?.user && !isAuthPage) {
      router.replace('/login');
    }
  }, [authContext?.loading, authContext?.user, isAuthPage, router]);


  // 2. LÓGICA DE RENDERIZAÇÃO CONDICIONAL
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

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!authContext?.user) {
     return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">A redirecionar para o login...</p>
        </div>
      </div>
    );
  }

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

    