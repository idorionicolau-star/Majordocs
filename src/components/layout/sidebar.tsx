
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
            "hidden md:flex flex-col fixed inset-y-4 left-4 z-40 h-[calc(100vh-2rem)] rounded-2xl glass-panel transition-all duration-300 ease-in-out border-white/5 dark text-foreground",
            isCollapsed ? "w-20" : "w-72"
        )}>
            <div className="flex h-20 items-center justify-center px-4 relative">
                {/* Decorative Glow */}
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-50" />

                <Link href="/dashboard" className="flex items-center gap-3 group">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-cyan-500/20 blur-md rounded-full group-hover:bg-cyan-500/40 transition-all duration-500" />
                        <Image src="/logo.svg" alt="MajorStockX Logo" width={32} height={32} className="relative z-10" />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col">
                            <span className="text-xl font-headline font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                MajorStockX
                            </span>
                        </div>
                    )}
                </Link>
            </div>

            <nav className="flex-1 space-y-2 p-3 overflow-y-auto scrollbar-thin">
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
                                            "flex items-center gap-3 rounded-xl px-4 py-3 text-slate-400 transition-all duration-300 group relative overflow-hidden",
                                            "hover:text-cyan-400 hover:bg-white/5",
                                            isActive && "text-white bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]",
                                            isCollapsed && "justify-center px-2"
                                        )}
                                    >
                                        {isActive && (
                                            <div className="absolute inset-y-0 left-0 w-1 bg-cyan-500 shadow-[0_0_10px_#06b6d4] rounded-full" />
                                        )}

                                        <item.icon className={cn(
                                            "h-5 w-5 transition-transform duration-300 group-hover:scale-110",
                                            isActive ? "text-cyan-400" : "group-hover:text-cyan-400"
                                        )} />

                                        {!isCollapsed && (
                                            <span className="flex-1 font-medium tracking-wide">{item.title}</span>
                                        )}

                                        {!isCollapsed && isActive && (
                                            <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]" />
                                        )}
                                    </Link>
                                </TooltipTrigger>
                                {isCollapsed && (
                                    <TooltipContent side="right" className="glass-panel text-white border-white/10">
                                        <p>{item.title}</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        )
                    })}
                </TooltipProvider>
            </nav>

            <div className="p-4 mt-auto">
                <div className={cn(
                    "rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-600/10 border border-white/5 p-4 mb-4 backdrop-blur-sm",
                    isCollapsed ? "hidden" : "block"
                )}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Sistema Online</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                        Versão 2.4.0 <br />
                        <span className="opacity-50">Stable Release</span>
                    </p>
                </div>

                <Button
                    variant="ghost"
                    onClick={onToggleCollapse}
                    className="w-full justify-center h-10 hover:bg-white/5 hover:text-cyan-400 transition-colors"
                >
                    <ChevronLeft className={cn("h-5 w-5 transition-transform duration-300", isCollapsed && "rotate-180")} />
                </Button>
            </div>
        </aside>
    );
}
