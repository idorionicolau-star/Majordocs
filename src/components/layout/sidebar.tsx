
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { mainNavItems } from "@/lib/data";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const companyName = "Construções & Filhos, Lda";

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-background">
      <div className="flex h-20 items-center justify-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Image src="/logo.svg" alt="MajorStockX Logo" width={24} height={24} className="text-primary" />
          <span className="text-lg font-bold">MajorStockX</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-bold text-muted-foreground transition-all hover:bg-accent hover:text-foreground",
                isActive && "bg-primary/10 text-primary"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-4 border-t">
         <p className="text-sm font-medium text-muted-foreground">{companyName}</p>
      </div>
    </aside>
  );
}
