"use client";

import Link from "next/link";
import Image from "next/image";
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { UserNav } from "@/components/user-nav";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 sm:h-20 items-center gap-4 border-b px-4 sm:px-6 bg-primary text-primary-foreground">
        <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold">
                <Image src="/logo.svg" alt="MajorStockX Logo" width={28} height={28} className="invert" />
                <span className="text-xl font-headline font-bold sm:inline-block">MajorStockX</span>
            </Link>
        </div>
        
        <div className="ml-auto flex items-center gap-1 md:gap-4">
          <NotificationsDropdown />
          <UserNav />
        </div>
    </header>
  );
}
