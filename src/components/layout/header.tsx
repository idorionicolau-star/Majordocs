"use client";

import Link from "next/link";
import Image from "next/image";
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { UserNav } from "@/components/user-nav";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export function Header() {
  
  return (
    <header className="sticky top-0 z-30 flex h-16 sm:h-20 items-center justify-between border-b px-4 sm:px-6 bg-primary text-primary-foreground md:justify-end">
      {/* Logo and Title for mobile, hidden on desktop */}
      <div className="flex items-center gap-3 md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold">
            <Image src="/logo.svg" alt="MajorStockX Logo" width={28} height={28} className="invert" />
            <span className="text-xl font-headline font-bold sm:inline-block">MajorStockX</span>
        </Link>
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
