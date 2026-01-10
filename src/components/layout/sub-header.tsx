
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavItems } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import React, { useContext } from "react";
import { InventoryContext } from "@/context/inventory-context";

export function SubHeader() {
  const pathname = usePathname();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { user } = useContext(InventoryContext) || {};

  const navItems = user?.role === 'Admin' 
    ? mainNavItems 
    : mainNavItems.filter(item => !item.adminOnly);


  React.useEffect(() => {
    const activeLink = document.getElementById(`nav-link-${pathname.replace('/', '')}`);
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

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-16 sm:top-20 z-20">
      <ScrollArea className="w-full whitespace-nowrap" ref={scrollRef}>
        <nav className={cn(
          "flex w-max md:w-full md:justify-center mx-auto",
          "animate-peek md:animate-none"
        )}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                id={`nav-link-${item.href.replace('/', '')}`}
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
          })}
        </nav>
        <ScrollBar orientation="horizontal" className="h-0.5 md:hidden" />
      </ScrollArea>
    </div>
  );
}
