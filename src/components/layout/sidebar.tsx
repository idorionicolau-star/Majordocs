
'use client';

import Link from "next/link";
import Image from "next/image";
import { useContext } from "react";
import { mainNavItems } from "@/lib/data";
import { cn } from "@/lib/utils";
import { InventoryContext } from "@/context/inventory-context";
import type { ModulePermission } from "@/lib/types";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DesktopSidebarProps {
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export function Sidebar({ isCollapsed, onToggleCollapse }: DesktopSidebarProps) {
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
        <aside className={cn(
            "hidden md:flex flex-col fixed inset-y-0 left-0 z-40 h-full border-r bg-background transition-all duration-300 ease-in-out",
            isCollapsed ? "w-20" : "w-64"
        )}>
            <div className="flex h-16 items-center justify-center border-b px-4">
                <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold">
                    <Image src="/logo.svg" alt="MajorStockX Logo" width={28} height={28} />
                    {!isCollapsed && <span className="text-xl font-headline font-bold">MajorStockX</span>}
                </Link>
            </div>
            <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
                <TooltipProvider delayDuration={0}>
                    {navItems.map(item => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                        return (
                            <Tooltip key={item.href}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={item.href}
                                        onClick={() => window.dispatchEvent(new CustomEvent('navigation-start'))}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-all hover:text-primary hover:bg-muted text-base",
                                            isActive && "bg-muted text-primary font-bold",
                                            isCollapsed && "justify-center"
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        {!isCollapsed && <span className="flex-1">{item.title}</span>}
                                    </Link>
                                </TooltipTrigger>
                                {isCollapsed && (
                                    <TooltipContent side="right">
                                        <p>{item.title}</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        )
                    })}
                </TooltipProvider>
            </nav>
            <div className="mt-auto p-4 border-t">
                <Button variant="ghost" onClick={onToggleCollapse} className="w-full justify-center">
                    <ChevronLeft className={cn("h-5 w-5 transition-transform duration-300", isCollapsed && "rotate-180")} />
                </Button>
            </div>
        </aside>
    );
}
