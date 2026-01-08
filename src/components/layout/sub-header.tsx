
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { mainNavItems } from "@/lib/data"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

export function SubHeader() {
  const pathname = usePathname()

  return (
    <div className="border-b bg-background/95 backdrop-blur-sm sticky top-16 sm:top-20 z-20">
      <ScrollArea className="w-full whitespace-nowrap">
          <nav className="flex items-center justify-start md:justify-center gap-4 max-w-7xl mx-auto px-4 sm:px-6">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center h-12 px-2 text-sm font-semibold text-muted-foreground border-b-2 border-transparent hover:text-primary hover:border-primary/50 transition-all shrink-0",
                    isActive && "text-primary border-primary"
                  )}
                >
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>
        </ScrollArea>
    </div>
  )
}
