
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavItems } from "@/lib/data";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function SubHeader() {
  const pathname = usePathname();

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-16 sm:top-20 z-20">
      <ScrollArea className="w-full whitespace-nowrap">
        <nav className="flex w-max md:w-full md:justify-center mx-auto">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
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
        <ScrollBar orientation="horizontal" className="h-0.5" />
      </ScrollArea>
    </div>
  );
}
