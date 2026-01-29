
'use client';

import Link from "next/link";
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

    const handleLinkClick = () => {
        // Dispatch custom event for loading bar
        window.dispatchEvent(new CustomEvent('navigation-start'));
        onLinkClick();
    };

    const navItems = mainNavItems.filter(item => {
        if (!canView(item.id as ModulePermission)) return false;
        if (item.isSubItem) return false;
        if (companyData?.businessType === 'reseller' && (item.id === 'production' || item.id === 'orders' || item.id === 'raw-materials')) {
            return false;
        }
        return true;
    });

    return (
        <aside className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            <div className="flex h-24 items-center justify-center border-b border-slate-100 dark:border-slate-800/50">
                <Link href="/dashboard" className="flex items-center justify-center" onClick={handleLinkClick}>
                    <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center shadow-neon">
                        <span className="text-white font-bold text-xl font-headline">M</span>
                    </div>
                    <span className="ml-3 text-xl font-headline font-bold text-slate-800 dark:text-white">MajorStockX</span>
                </Link>
            </div>
            <nav className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
                {navItems.map(item => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleLinkClick}
                            className={cn(
                                "flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all text-base font-medium",
                                isActive
                                    ? "bg-slate-100 dark:bg-slate-800 text-primary shadow-sm"
                                    : "text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            )}
                        >
                            <item.icon className={cn("h-6 w-6", isActive ? "text-primary" : "text-slate-400 group-hover:text-primary")} />
                            <span className="flex-1">{item.title}</span>
                            {isActive && (
                                <div className="h-2 w-2 rounded-full bg-primary shadow-neon-emerald" />
                            )}
                        </Link>
                    )
                })}
            </nav>
        </aside>
    );
}
