"use client";

import Link from "next/link";
import Image from "next/image";
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { UserNav } from "@/components/user-nav";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { mainNavItems } from "@/lib/data";
import { usePathname } from "next/navigation";
import { useContext, useState, useEffect } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { ModulePermission } from "@/lib/types";
import { cn } from "@/lib/utils";

function DesktopSidebarNav() {
  const pathname = usePathname();
  const { canView } = useContext(InventoryContext) || { canView: () => false };
  const navItems = mainNavItems.filter(item => canView(item.id as ModulePermission) && !item.isSubItem);

  return (
    <nav className="flex flex-col gap-1">
      {navItems.map(item => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted text-base",
              isActive && "bg-muted text-primary font-bold"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.title}
          </Link>
        )
      })}
    </nav>
  )
}

export function Header() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);
  
  return (
    <header className="sticky top-0 z-30 flex h-16 sm:h-20 items-center justify-between border-b px-4 sm:px-6 bg-primary text-primary-foreground">
      <div className="flex items-center gap-3">
        {/* Desktop Sidebar */}
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground hidden md:flex">
                  <Menu className="h-6 w-6" />
              </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-4">
              <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold mb-6 px-2">
                  <Image src="/logo.svg" alt="MajorStockX Logo" width={28} height={28} className="dark:invert" />
                  <span className="text-xl font-headline font-bold">MajorStockX</span>
              </Link>
              <DesktopSidebarNav />
          </SheetContent>
        </Sheet>
        
        {/* Logo and Title */}
        <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold">
            <Image src="/logo.svg" alt="MajorStockX Logo" width={28} height={28} className="invert" />
            <span className="text-xl font-headline font-bold sm:inline-block">MajorStockX</span>
        </Link>
      </div>
      
      <div className="flex items-center gap-1 md:gap-4">
        <NotificationsDropdown />
        <UserNav />
      </div>
    </header>
  );
}
