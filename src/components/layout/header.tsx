
"use client";

import Link from "next/link";
import Image from "next/image";
import { ConnectionStatus } from "@/components/connection-status"
import { UserNav } from "@/components/user-nav"
import { NotificationsDropdown } from "@/components/notifications-dropdown"

export function Header() {
  const companyName = "Construções & Filhos, Lda";

  return (
    <header className="sticky top-0 z-30 flex h-16 sm:h-20 items-center gap-4 border-b px-4 sm:px-6 bg-primary text-primary-foreground border-blue-400/50 dark:border-blue-500/50">
        <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold">
                <Image src="/logo.svg" alt="MajorStockX Logo" width={28} height={28} className="text-primary invert brightness-0" />
                <span className="text-xl font-headline font-bold sm:inline-block">MajorStockX</span>
            </Link>
        </div>
        
        <div className="ml-auto flex items-center gap-1 md:gap-4">
          <div className="hidden sm:flex items-center gap-4">
            <ConnectionStatus />
          </div>
          <NotificationsDropdown />
          <UserNav />
        </div>
    </header>
  );
}
