"use client";

import { useContext } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { cn, formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, Archive } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const PrimaryKPIs = () => {
    const { dashboardStats, loading } = useContext(InventoryContext) || { dashboardStats: null, loading: true };

    if (loading || !dashboardStats) {
        return (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Skeleton className="h-32 bg-[#0f172a]/50" />
                <Skeleton className="h-32 bg-[#0f172a]/50" />
                <Skeleton className="h-32 bg-[#0f172a]/50" />
            </div>
        )
    }

    const kpis = [
        {
            title: "Faturamento Mensal",
            value: formatCurrency(dashboardStats.monthlySalesValue, { compact: true }),
            icon: DollarSign,
            color: "text-emerald-400",
            glow: "shadow-neon-emerald",
            pingColor: "bg-emerald-400",
            size: "text-2xl md:text-2xl lg:text-4xl",
        },
        {
            title: "Capital Imobilizado",
            value: formatCurrency(dashboardStats.totalInventoryValue, { compact: true }),
            icon: Archive,
            color: "text-slate-400",
            glow: "shadow-neon-slate",
            pingColor: "bg-slate-500",
            size: "text-2xl md:text-2xl lg:text-4xl",
        },
        {
            title: "Ticket Médio",
            value: formatCurrency(dashboardStats.averageTicket, { compact: true }),
            icon: TrendingUp,
            color: "text-sky-400",
            glow: "shadow-neon-sky",
            pingColor: null,
            size: "text-2xl md:text-2xl lg:text-4xl",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {kpis.map((kpi) => (
                <Card key={kpi.title} className={cn("bg-[#0f172a]/50 border-slate-800", kpi.glow)}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">{kpi.title}</CardTitle>
                        {kpi.pingColor && (
                            <span className="relative flex h-2 w-2">
                                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", kpi.pingColor)}></span>
                                <span className={cn("relative inline-flex rounded-full h-2 w-2", kpi.pingColor)}></span>
                            </span>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className={cn("font-bold", kpi.color, kpi.size)}>
                            {kpi.value}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
