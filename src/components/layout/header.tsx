"use client";

import Link from "next/link";
import Image from "next/image";
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { UserNav } from "@/components/user-nav";
import { Button } from "@/components/ui/button";
import { Settings, Search } from "lucide-react";

export function Header({ onSearchClick }: { onSearchClick: () => void }) {
  
  return (
    <header className="sticky top-0 z-30 flex h-16 sm:h-20 items-center justify-between gap-4 border-b px-4 sm:px-6 bg-primary text-primary-foreground">
      
      {/* Logo and Title for mobile, hidden on desktop */}
      <div className="flex items-center gap-3 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold">
            <Image src="/logo.svg" alt="MajorStockX Logo" width={28} height={28} className="invert" />
            <span className="text-xl font-headline font-bold sm:inline-block">MajorStockX</span>
        </Link>
      </div>
      
      {/* Search bar for desktop, hidden on mobile */}
      <div className="hidden md:flex flex-1">
        <Button
            variant="outline"
            className="relative w-full max-w-sm pl-10 pr-4 py-2 h-11 justify-start items-center text-left font-normal bg-white/10 text-primary-foreground/60 hover:bg-white/20 border-white/20 focus-visible:ring-offset-primary focus-visible:bg-white/20 hover:text-primary-foreground/80"
            onClick={onSearchClick}
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" />
          <span>Pesquisar...</span>
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-6 select-none items-center gap-1 rounded border bg-background/20 px-2 font-mono text-[11px] font-bold text-primary-foreground/80 sm:flex">
            Ctrl K
          </kbd>
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
