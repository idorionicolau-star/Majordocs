
"use client";

import Link from "next/link";
import Image from "next/image";
import { useContext } from "react";
import { mainNavItems } from "@/lib/data";
import { cn } from "@/lib/utils";
import { InventoryContext } from "@/context/inventory-context";
import type { ModulePermission } from "@/lib/types";
import { usePathname } from "next/navigation";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Sidebar() {
    const pathname = usePathname();
    const { canView, companyData, user, logout } = useContext(InventoryContext) || { canView: () => false, companyData: null, user: null, logout: async () => { } };

    const navItems = mainNavItems.filter(item => {
        if (!canView(item.id as ModulePermission)) return false;
        if (item.isSubItem) return false;
        if (companyData?.businessType === 'reseller' && (item.id === 'production' || item.id === 'orders' || item.id === 'raw-materials')) {
            return false;
        }
        return true;
    });

    return (
        <aside className="hidden md:flex flex-col py-6 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-50 fixed inset-y-0 left-0 w-64 h-screen transition-all duration-300">
            {/* Logo Area */}
            <div className="h-12 w-full flex items-center px-6 mb-8 cursor-pointer hover:scale-105 transition-transform group">
                <Link href="/dashboard" className="flex items-center gap-3 w-full h-full">
                    <div className="relative w-10 h-10 shrink-0">
                        <Image
                            src="/logo.svg"
                            alt="MajorStockX Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span className="font-headline font-bold text-xl tracking-tight text-primary">MajorStockX</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-2 w-full px-4 overflow-y-auto scrollbar-none">
                {navItems.map(item => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => window.dispatchEvent(new CustomEvent('navigation-start'))}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5 shrink-0 transition-transform duration-200",
                                isActive ? "text-primary scale-110" : "group-hover:text-primary group-hover:scale-110"
                            )} />

                            <span className={cn(
                                "font-medium text-sm transition-colors duration-200",
                                isActive ? "text-primary font-bold" : "group-hover:text-primary"
                            )}>
                                {item.title}
                            </span>


                        </Link>
                    )
                })}
            </nav>

            {/* Bottom Actions / User */}
            <div className="flex flex-col mt-auto px-4 pb-6 w-full">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors group outline-none">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-[2px] shrink-0">
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
                            <div className="flex flex-col overflow-hidden text-left">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate group-hover:text-primary transition-colors">
                                    {user?.username || 'Utilizador'}
                                </span>
                                <span className="text-xs text-slate-400 truncate">
                                    {user?.email || 'email@exemplo.com'}
                                </span>
                            </div>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 mb-2">
                        <DropdownMenuLabel>A minha conta</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href="/settings">
                            <DropdownMenuItem className="cursor-pointer">
                                <UserIcon className="mr-2 h-4 w-4" />
                                <span>Perfil</span>
                            </DropdownMenuItem>
                        </Link>
                        <Link href="/settings">
                            <DropdownMenuItem className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Configurações</span>
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-700 dark:text-red-400 dark:focus:text-red-300" onClick={() => logout()}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sair</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}
