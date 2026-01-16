
"use client";

import Link from "next/link";
import Image from "next/image";
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { UserNav } from "@/components/user-nav";
import { Button } from "@/components/ui/button";
import { Settings, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function Header() {
  
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
      <div className="hidden md:flex flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-foreground/60" />
        <Input 
            type="search" 
            placeholder="Pesquisar em toda a aplicação..."
            className="w-full max-w-sm pl-10 bg-white/10 text-primary-foreground placeholder:text-primary-foreground/60 border-white/20 focus-visible:ring-offset-primary focus-visible:bg-white/20"
        />
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
