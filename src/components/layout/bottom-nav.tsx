
'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import { mainNavItems } from "@/lib/data";
import { cn } from "@/lib/utils";
import { InventoryContext } from "@/context/inventory-context";
import type { ModulePermission } from "@/lib/types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function BottomNav() {
  const pathname = usePathname();
  const { canView } = useContext(InventoryContext) || { canView: () => false };

  const navItems = mainNavItems.filter(item => {
    if (item.isSubItem) return false;
    return canView(item.id as ModulePermission);
  });

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-20 bg-background/95 backdrop-blur-lg border-t">
      <ScrollArea className="h-full w-full whitespace-nowrap">
        <div className="flex w-max h-full mx-auto animate-peek md:animate-none items-center">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex flex-col items-center justify-center font-medium w-20 px-1 py-2 hover:bg-muted group transition-colors rounded-lg",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-6 w-6 mb-1 transition-transform", isActive ? "scale-110" : "scale-100")} />
                <span className="text-[10px] font-bold">{item.title}</span>
              </Link>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>
    </nav>
  );
}
