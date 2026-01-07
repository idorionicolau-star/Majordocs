
"use client";

import Link from "next/link";
import Image from "next/image";
import { ConnectionStatus } from "@/components/connection-status"
import { UserNav } from "@/components/user-nav"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "../ui/button";
import { Menu } from "lucide-react";
import { mainNavItems, dashboardNavItem, settingsNavItem } from "@/lib/data";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";


export function Header() {
  const pathname = usePathname();
  const companyName = "Construções & Filhos, Lda";

  const allNavItems = [dashboardNavItem, ...mainNavItems, settingsNavItem];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <Image src="/logo.svg" alt="MajorStockX Logo" width={28} height={28} className="text-primary" />
                    <span className="hidden font-bold sm:inline-block">MajorStockX</span>
                </Link>
            </div>
        </div>
        
        <div className="ml-auto flex items-center gap-2 md:gap-4">
          <div className="hidden sm:flex items-center gap-4">
            <ConnectionStatus />
          </div>
          <NotificationsDropdown />
          <UserNav />
        </div>
    </header>
  );
}
