

'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useEffect, useContext } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { Header } from './header';
import { SubHeader } from './sub-header';
import { mainNavItems } from '@/lib/data';
import type { ModulePermission } from '@/lib/types';


export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authContext = useContext(InventoryContext);

  // 1. ESTADO DE PROTEÇÃO: Enquanto o contexto está a carregar, mostramos um spinner.
  if (!authContext || authContext.loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">A carregar aplicação...</p>
        </div>
      </div>
    );
  }

  const { user, isSuperAdmin } = authContext;
  const isAuthPage = pathname === '/login' || pathname === '/register';

  // 2. LÓGICA DE REDIRECIONAMENTO (Executada APÓS o loading do contexto)
  useEffect(() => {
    // Se o contexto terminou de carregar e não há utilizador, e não estamos numa página de autenticação, redireciona.
    if (!authContext.loading && !user && !isAuthPage) {
      router.replace('/login');
    }
  }, [authContext.loading, user, isAuthPage, router]);


  // 3. RENDERIZAÇÃO CONDICIONAL
  // Se for uma página de autenticação, renderiza o conteúdo diretamente.
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Se o contexto terminou de carregar mas ainda não há utilizador, mostra uma mensagem de redirecionamento.
  if (!authContext.loading && !user) {
     return (
       <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">A redirecionar para o login...</p>
        </div>
      </div>
    );
  }
  
  // Se o utilizador está autenticado, mostra o layout principal com o conteúdo.
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
