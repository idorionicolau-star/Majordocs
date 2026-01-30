
"use client";

import Link from "next/link";
import Image from "next/image";
import { useContext } from "react";
import { mainNavItems } from "@/lib/data";
import { cn } from "@/lib/utils";
import { InventoryContext } from "@/context/inventory-context";
import type { ModulePermission } from "@/lib/types";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Sidebar() {
    const pathname = usePathname();
    const { canView, companyData, user } = useContext(InventoryContext) || { canView: () => false, companyData: null, user: null };

    const navItems = mainNavItems.filter(item => {
        if (!canView(item.id as ModulePermission)) return false;
        if (item.isSubItem) return false;
        if (companyData?.businessType === 'reseller' && (item.id === 'production' || item.id === 'orders' || item.id === 'raw-materials')) {
            return false;
        }
        return true;
    });

    return (
        <aside className="hidden md:flex flex-col items-center py-6 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-50 fixed inset-y-0 left-0 w-24 h-screen transition-colors duration-300">
            {/* Logo Area */}
            <div className="h-14 w-14 bg-primary rounded-2xl flex items-center justify-center shadow-neon mb-10 cursor-pointer hover:scale-105 transition-transform group">
                <Link href="/dashboard" className="flex items-center justify-center w-full h-full">
                    <span className="text-white font-bold text-2xl font-headline">M</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-8 w-full items-center overflow-y-auto scrollbar-none">
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
                                            "relative p-3 rounded-xl transition-all duration-300 group flex items-center justify-center",
                                            isActive
                                                ? "bg-primary/10 text-primary shadow-[0_0_15px_rgba(16,185,129,0.2)]" // Active: Subtle green bg + shadow
                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-200 dark:hover:text-slate-200 hover:bg-white/5"
                                        )}
                                    >
                                        <item.icon className={cn(
                                            "h-6 w-6 transition-transform duration-300",
                                            isActive ? "text-primary scale-110" : "group-hover:scale-105"
                                        )} />

                                        {isActive && (
                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1.5 h-6 w-1 bg-primary rounded-l-full shadow-[0_0_10px_#10b981]" />
                                        )}
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700 ml-2 font-medium">
                                    <p>{item.title}</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                </TooltipProvider>
            </nav>

            {/* Bottom Actions / User */}
            <div className="flex flex-col gap-6 mt-auto items-center pb-4">
                {/* Settings / Profile placeholder if needed, matching reference style */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-[2px] cursor-pointer hover:scale-105 transition-transform">
                    <div className="rounded-full w-full h-full bg-white dark:bg-slate-900 p-[1px] overflow-hidden">
                        {user?.profilePictureUrl ? (
                            <Image src={user.profilePictureUrl} alt="User" width={40} height={40} className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                                {user?.username?.charAt(0) || 'U'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
