
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "@/lib/data";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";


export function Sidebar() {
    const pathname = usePathname();
    const companyName = "Construções & Filhos, Lda";

    return (
        <aside className="hidden border-r bg-muted/40 sm:flex sm:flex-col" data-sidebar="sidebar">
            <div className="flex h-14 items-center border-b px-6">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                     <Image src="/logo.svg" alt="MajorStockX Logo" width={28} height={28} className="text-primary" />
                    <span className="">MajorStockX</span>
                </Link>
            </div>
            <nav className="flex flex-col gap-2 p-4 flex-1">
                {navItems.map((item) => (
                    <TooltipProvider key={item.href}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex h-10 w-full items-center justify-start gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
                                        pathname.startsWith(item.href) && "bg-primary/10 text-primary"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span>{item.title}</span>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                {item.title}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </nav>
             <div className="mt-auto p-4 border-t">
                <div className="flex flex-col">
                    <span className="text-sm font-semibold">{companyName}</span>
                    <span className="text-xs text-muted-foreground">Plano Básico</span>
                </div>
            </div>
        </aside>
    );
}
