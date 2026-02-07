
'use client';

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

interface MobileNavProps {
    onLinkClick: () => void;
}

export function MobileNav({ onLinkClick }: MobileNavProps) {
    const pathname = usePathname();
    const { canView, companyData, user, logout } = useContext(InventoryContext) || { canView: () => false, companyData: null, user: null, logout: async () => { } };

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
                        <div className="relative w-8 h-8">
                            <Image
                                src="/logo.svg"
                                alt="MajorStockX Logo"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
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

            {/* User Section */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
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
                        <Link href="/settings" onClick={onLinkClick}>
                            <DropdownMenuItem className="cursor-pointer">
                                <UserIcon className="mr-2 h-4 w-4" />
                                <span>Perfil</span>
                            </DropdownMenuItem>
                        </Link>
                        <Link href="/settings" onClick={onLinkClick}>
                            <DropdownMenuItem className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Configurações</span>
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-700 dark:text-red-400 dark:focus:text-red-300" onClick={() => { logout(); onLinkClick(); }}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sair</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}
