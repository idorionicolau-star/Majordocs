
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

  const allNavItems = [dashboardNavItem, ...mainNavItems, settingsNavItem];

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:hidden">
            <Sheet>
                <SheetTrigger asChild>
                <Button size="icon" variant="outline">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle Menu</span>
                </Button>
                </SheetTrigger>
                <SheetContent side="left" className="sm:max-w-xs">
                <nav className="grid gap-6 text-lg font-medium">
                    <Link
                    href="#"
                    className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                    >
                    <Image src="/logo.svg" alt="MajorStockX Logo" width={24} height={24} className="text-primary" />
                    <span className="sr-only">MajorStockX</span>
                    </Link>
                    {allNavItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn("flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground",
                        pathname.startsWith(item.href) && "text-foreground"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        {item.title}
                    </Link>
                    ))}
                </nav>
                </SheetContent>
            </Sheet>
             <div className="flex items-center gap-2">
                <div className="block">
                    <Image src="/logo.svg" alt="MajorStockX Logo" width={24} height={24} className="text-primary" />
                </div>
                <div className="flex flex-col">
                    <h1 className="font-headline text-xl font-semibold block">MajorStockX</h1>
                </div>
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
