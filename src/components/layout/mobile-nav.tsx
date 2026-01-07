"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { navItems } from "@/lib/data"
import { cn } from "@/lib/utils"
import { Users } from "lucide-react"

export function MobileNav() {
  const pathname = usePathname()

  const mainNavItems = navItems.filter(item => item.href !== '/settings');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm sm:hidden">
      <nav className="grid grid-cols-4 items-center max-w-2xl mx-auto">
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 p-3 text-muted-foreground transition-colors hover:text-primary",
              pathname.startsWith(item.href) && "text-primary bg-primary/10"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.title}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
