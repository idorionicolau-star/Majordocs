
'use client';

import Link from "next/link";
import Image from "next/image";
import { useContext } from "react";
import { mainNavItems } from "@/lib/data";
import { cn } from "@/lib/utils";
import { InventoryContext } from "@/context/inventory-context";
import type { ModulePermission } from "@/lib/types";
import { usePathname } from "next/navigation";

interface MobileNavProps {
    onLinkClick: () => void;
}

export function MobileNav({ onLinkClick }: MobileNavProps) {
  const pathname = usePathname();
  const { canView, companyData } = useContext(InventoryContext) || { canView: () => false, companyData: null };
  const navItems = mainNavItems.filter(item => {
    if (!canView(item.id as ModulePermission)) return false;
    if (item.isSubItem) return false;
    if (companyData?.businessType === 'reseller' && (item.id === 'production' || item.id === 'orders' || item.id === 'raw-materials')) {
        return false;
    }
    return true;
  });

  return (
    <aside className="flex flex-col h-full bg-background">
        <div className="flex h-16 items-center justify-center border-b px-4">
            <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold" onClick={onLinkClick}>
                <Image src="/logo.svg" alt="MajorStockX Logo" width={28} height={28} />
                <span className="text-xl font-headline font-bold">MajorStockX</span>
            </Link>
        </div>
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
            {navItems.map(item => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        onClick={onLinkClick}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted text-base",
                            isActive && "bg-muted text-primary font-bold"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        <span className="flex-1">{item.title}</span>
                    </Link>
                )
            })}
        </nav>
    </aside>
  );
}
