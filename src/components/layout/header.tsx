"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { UserNav } from "@/components/user-nav";
import { Button } from "@/components/ui/button";
import { Settings, Search } from "lucide-react";
import { mainNavItems } from "@/lib/data";

export function Header({ onSearchClick }: { onSearchClick: () => void }) {
  const pathname = usePathname();

  const getPageTitle = () => {
    // Handle nested routes like /inventory/history by sorting by path length
    const sortedNavItems = [...mainNavItems].sort((a, b) => b.href.length - a.href.length);
    
    if (pathname.startsWith('/settings')) return 'Ajustes';
    
    const matchingItem = sortedNavItems.find(item => pathname.startsWith(item.href));

    if (matchingItem) return matchingItem.title;
    
    return "Dashboard"; // Fallback
  };
  
  const pageTitle = getPageTitle();
  
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b px-4 sm:px-6 bg-primary text-primary-foreground">
      
      {/* Logo for mobile, hidden on desktop */}
      <div className="flex items-center gap-3 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold">
            <Image src="/logo.svg" alt="MajorStockX Logo" width={28} height={28} className="invert" />
        </Link>
      </div>

      {/* Centered Page Title on mobile */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden">
          <h1 className="text-lg font-bold">{pageTitle}</h1>
      </div>
      
      {/* Search bar for desktop, hidden on mobile */}
      <div className="hidden md:flex flex-1">
        <Button
            variant="outline"
            className="relative w-full max-w-sm px-4 py-2 h-11 justify-start items-center text-left font-normal bg-white/10 text-primary-foreground/60 hover:bg-white/20 border-white/20 focus-visible:ring-offset-primary focus-visible:bg-white/20 hover:text-primary-foreground/80"
            onClick={onSearchClick}
        >
          <Search className="mr-2 h-4 w-4" />
          <span>Pesquisar...</span>
        </Button>
      </div>

      {/* Right side icons */}
      <div className="flex items-center gap-1 md:gap-4">
        <NotificationsDropdown />
        <Button asChild variant="ghost" size="icon">
          <Link href="/settings">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Ajustes</span>
          </Link>
        </Button>
        <UserNav />
      </div>
    </header>
  );
}
