
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

  // 1. ESTADO DE PROTEÇÃO: Enquanto estiver a carregar, não mostramos nada
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

  const { user } = authContext;
  const isAuthPage = pathname === '/login' || pathname === '/register';

  // 2. LÓGICA DE REDIRECIONAMENTO (Executada após o loading)
  useEffect(() => {
    if (!user && !isAuthPage) {
      router.replace('/login');
      return;
    }

    if (user && isAuthPage) {
      router.replace('/dashboard');
      return;
    }

    if (user && !isAuthPage) {
      const currentNavItem = mainNavItems.find(item => pathname.startsWith(item.href));

      // Exceção para inventário: todos podem ver
      if (pathname.includes('/inventory')) return;
      
      if (currentNavItem) {
        const isSuperAdmin = authContext.isSuperAdmin;
        const isAdmin = user.role === 'Admin';
        const permissionLevel = user.permissions?.[currentNavItem.id] || 'none';

        let canAccess = false;
        if (isSuperAdmin) {
          canAccess = true;
        } else if (isAdmin) {
          // Admin pode aceder a tudo, exceto páginas marcadas como `adminOnly` 
          // (que na nossa lógica de `mainNavItems` significa super-admin)
          // A página `/users` tem `adminOnly: true` mas é para admins normais também.
          // A página `/companies` é a única que é realmente só para Super Admin.
           if (currentNavItem.id !== 'companies') {
            canAccess = true;
          }
        } else { // Para 'Employee'
          canAccess = permissionLevel === 'read' || permissionLevel === 'write';
        }

        if (!canAccess) {
          console.warn(`Acesso negado para o módulo: ${currentNavItem.id}. A redirecionar...`);
          router.replace('/dashboard');
        }
      }
    }
  }, [user, isAuthPage, pathname, router, authContext.isSuperAdmin]);


  // 3. RENDERIZAÇÃO CONDICIONAL
  if (isAuthPage) return <>{children}</>;
  if (!user) return (
     <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">A redirecionar para o login...</p>
        </div>
      </div>
  );

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
