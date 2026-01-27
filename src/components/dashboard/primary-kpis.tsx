
"use client";

import { useContext } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { cn, formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, Archive } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const PrimaryKPIs = () => {
    const { dashboardStats, loading } = useContext(InventoryContext) || { dashboardStats: null, loading: true };

    if (loading || !dashboardStats) {
        return (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Skeleton className="h-32 bg-white/70 dark:bg-[#0f172a]/50" />
                <Skeleton className="h-32 bg-white/70 dark:bg-[#0f172a]/50" />
                <Skeleton className="h-32 bg-white/70 dark:bg-[#0f172a]/50" />
            </div>
        )
    }

    const kpis = [
        {
            title: "Faturamento Mensal",
            value: dashboardStats.monthlySalesValue,
            icon: DollarSign,
            lightColor: "text-emerald-600",
            darkColor: "dark:text-emerald-400",
            glow: "dark:shadow-neon-emerald",
            pingColor: "bg-emerald-500",
            size: "text-2xl md:text-2xl lg:text-4xl",
        },
        {
            title: "Capital Imobilizado",
            value: dashboardStats.totalInventoryValue,
            icon: Archive,
            lightColor: "text-slate-700",
            darkColor: "dark:text-slate-400",
            glow: "dark:shadow-neon-slate",
            pingColor: "bg-slate-500",
            size: "text-2xl md:text-2xl lg:text-4xl",
        },
        {
            title: "Ticket Médio",
            value: dashboardStats.averageTicket,
            icon: TrendingUp,
            lightColor: "text-cyan-600",
            darkColor: "dark:text-sky-400",
            glow: "dark:shadow-neon-sky",
            pingColor: null,
            size: "text-2xl md:text-2xl lg:text-4xl",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TooltipProvider>
                {kpis.map((kpi) => (
                    <Card key={kpi.title} className={cn("bg-white/70 dark:bg-[#0f172a]/50 backdrop-blur-lg border-white dark:border-slate-800 shadow-sm shadow-slate-200/50 text-center dark:shadow-none", kpi.glow)}>
                        <CardHeader className="flex flex-row items-center justify-center space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{kpi.title}</CardTitle>
                            {kpi.pingColor && (
                                <span className="relative flex h-2 w-2 ml-2">
                                    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", kpi.pingColor)}></span>
                                    <span className={cn("relative inline-flex rounded-full h-2 w-2", kpi.pingColor)}></span>
                                </span>
                            )}
                        </CardHeader>
                        <CardContent>
                           <Tooltip>
                                <TooltipTrigger asChild>
                                     <div className={cn("font-bold cursor-pointer", kpi.lightColor, kpi.darkColor, kpi.size)}>
                                        <span className="md:hidden">{formatCurrency(kpi.value)}</span>
                                        <span className="hidden md:inline">{formatCurrency(kpi.value, { compact: true })}</span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent className="hidden md:block">
                                    <p>{formatCurrency(kpi.value)}</p>
                                </TooltipContent>
                            </Tooltip>
                        </CardContent>
                    </Card>
                ))}
            </TooltipProvider>
        </div>
    );
};
