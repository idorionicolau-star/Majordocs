
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { mainNavItems } from "@/lib/data"
import { cn } from "@/lib/utils"

export function MobileNav() {
  const pathname = usePathname()

  return (
    <div className="glass-nav fixed bottom-0 left-0 right-0 z-40 border-t">
      <nav className="grid grid-cols-5 items-center max-w-2xl mx-auto">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-3 text-muted-foreground transition-colors hover:text-primary",
                isActive && "text-primary bg-primary/10"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "fill-current")} />
              <span className="text-xs font-medium">{item.title}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
