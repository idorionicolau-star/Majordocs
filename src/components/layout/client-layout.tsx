'use client';

import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useEffect, Suspense } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { cn } from '@/lib/utils';
import { CommandMenu } from '@/components/command-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { MobileNav } from './mobile-nav';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const authContext = React.useContext(InventoryContext);
  const isAuthPage = pathname === '/login' || pathname === '/register';
  
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openCommandMenu, setOpenCommandMenu] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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


  React.useEffect(() => {
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
    <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <div className="flex min-h-screen w-full bg-muted/40 bg-pattern">
            <Sidebar 
                isCollapsed={isSidebarCollapsed} 
                onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
            />
            <div className={cn(
                "flex flex-col flex-1 transition-all duration-300 ease-in-out",
                isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
            )}>
                <Header onSearchClick={() => setOpenCommandMenu(true)} />
                <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto main-content">
                    <Suspense fallback={
                    <div className="flex h-full w-full items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                    }>
                    {children}
                    </Suspense>
                </main>
            </div>
            <CommandMenu open={openCommandMenu} setOpen={setOpenCommandMenu} />
        </div>
      <SheetContent side="left" className="p-0">
        <MobileNav onLinkClick={() => setIsMobileNavOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
