
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavItems } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import React, { useContext } from "react";
import { InventoryContext } from "@/context/inventory-context";
import type { ModulePermission } from "@/lib/types";

export function SubHeader() {
  const pathname = usePathname();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { canView } = useContext(InventoryContext) || { canView: () => false };

  const navItems = mainNavItems.filter(item => {
    if (item.isSubItem) return false; // Don't show sub-items directly in the main nav bar
    return canView(item.id as ModulePermission);
  });
  
  const inventorySubNavItems = mainNavItems.filter(item => item.isSubItem && item.id === 'inventory');

  React.useEffect(() => {
    const activeLink = document.getElementById(`nav-link-${pathname.split('/').slice(1).join('-')}`);
    if (activeLink && scrollRef.current) {
      const scrollArea = scrollRef.current;
      const linkRect = activeLink.getBoundingClientRect();
      const scrollAreaRect = scrollArea.getBoundingClientRect();
      
      const scrollOffset = (linkRect.left - scrollAreaRect.left) - (scrollAreaRect.width / 2) + (linkRect.width / 2);
      
      scrollArea.querySelector('[data-radix-scroll-area-viewport]')?.scrollBy({
        left: scrollOffset,
        behavior: 'smooth',
      });
    }
  }, [pathname]);
  
  const renderNavItem = (item: (typeof mainNavItems)[0]) => {
     const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
     const id = `nav-link-${item.href.replace('/', '-')}`;

     const isInventoryActive = pathname.startsWith('/inventory');

     if (item.href === '/inventory') {
         return (
            <div key={item.href} className="flex items-center">
                 <Link
                    href={item.href}
                    id={id}
                    scroll={false}
                    className={cn(
                        "flex items-center justify-center rounded-t-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-muted/50",
                        isActive && !pathname.includes('/history') ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                    )}
                    >
                    {item.title}
                </Link>
                {isInventoryActive && inventorySubNavItems.map(subItem => {
                    const isSubItemActive = pathname.startsWith(subItem.href);
                    return (
                         <Link
                            key={subItem.href}
                            id={`nav-link-${subItem.href.split('/').slice(1).join('-')}`}
                            href={subItem.href}
                            scroll={false}
                            className={cn(
                                "flex items-center justify-center rounded-t-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-muted/50",
                                isSubItemActive ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                            )}
                            >
                            {subItem.title}
                        </Link>
                    )
                })}
            </div>
         )
     }

      return (
        <Link
            key={item.href}
            id={id}
            href={item.href}
            scroll={false}
            className={cn(
                "flex items-center justify-center rounded-t-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-muted/50",
                isActive
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            )}
            >
            {item.title}
        </Link>
      )
  }

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-16 sm:top-20 z-20">
      <ScrollArea className="w-full whitespace-nowrap" ref={scrollRef}>
        <nav className={cn(
          "flex w-max md:w-full md:justify-center mx-auto",
          "animate-peek md:animate-none"
        )}>
          {navItems.map(renderNavItem)}
        </nav>
        <ScrollBar orientation="horizontal" className="h-0.5 md:hidden" />
      </ScrollArea>
    </div>
  );
}
