
"use client";

import Link from "next/link";
import Image from "next/image";
import { ConnectionStatus } from "@/components/connection-status"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { ThemeSwitcher } from "@/components/theme-switcher";
import { UserNav } from "@/components/user-nav";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 sm:h-20 items-center gap-4 border-b px-4 sm:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold">
                <Image src="/logo.svg" alt="MajorStockX Logo" width={28} height={28} className="dark:invert" />
                <span className="text-xl font-headline font-bold sm:inline-block">MajorStockX</span>
            </Link>
        </div>
        
        <div className="ml-auto flex items-center gap-1 md:gap-4">
          <div className="hidden sm:flex items-center gap-4">
            <ConnectionStatus />
          </div>
          <NotificationsDropdown />
          <ThemeSwitcher />
          <UserNav />
        </div>
    </header>
  );
}
