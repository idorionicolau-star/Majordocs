
"use client";

import { useContext } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { cn, formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const PrimaryKPIs = () => {
    const { dashboardStats, loading } = useContext(InventoryContext) || { dashboardStats: null, loading: true };

    if (loading || !dashboardStats) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-32 rounded-3xl bg-slate-800/50" />
                <Skeleton className="h-32 rounded-3xl bg-slate-800/50" />
                <Skeleton className="h-32 rounded-3xl bg-slate-800/50" />
            </div>
        )
    }

    const cards = [
        {
            title: "Faturamento Mensal:",
            value: dashboardStats.monthlySalesValue,
            format: (v: number) => formatCurrency(v, { compact: true }),
            fullValue: formatCurrency(dashboardStats.monthlySalesValue),
            status: "positive",
            gradient: "bg-gradient-to-br from-white/40 to-white/10 dark:from-slate-900/60 dark:to-slate-800/40",
            border: "border-white/50 dark:border-slate-700/50",
            indicatorColor: "bg-emerald-500",
            shadow: "shadow-sm dark:shadow-none"
        },
        {
            title: "Capital Imobilizado:",
            value: dashboardStats.totalInventoryValue,
            format: (v: number) => formatCurrency(v, { compact: true }),
            fullValue: formatCurrency(dashboardStats.totalInventoryValue),
            status: "neutral",
            gradient: "bg-gradient-to-br from-white/40 to-white/10 dark:from-slate-900/60 dark:to-slate-800/40",
            border: "border-white/50 dark:border-slate-700/50",
            indicatorColor: "bg-emerald-500",
            shadow: "shadow-sm dark:shadow-none"
        },
        {
            title: "Ticket Médio:",
            value: dashboardStats.averageTicket,
            format: (v: number) => formatCurrency(v) + "n",
            fullValue: formatCurrency(dashboardStats.averageTicket),
            status: "negative",
            gradient: "bg-gradient-to-br from-white/40 to-white/10 dark:from-slate-900/60 dark:to-slate-800/40",
            border: "border-white/50 dark:border-slate-700/50",
            indicatorColor: "bg-red-500",
            shadow: "shadow-red-500/10 dark:shadow-[0_0_30px_rgba(220,38,38,0.1)]"
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cards.map((card, index) => (
                <Card
                    key={index}
                    className={cn(
                        "relative overflow-hidden border backdrop-blur-md rounded-3xl h-32 transition-all duration-300 hover:scale-[1.02]",
                        card.gradient,
                        card.border,
                        card.shadow
                    )}
                >
                    {/* Glass Reflection */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none dark:from-white/5" />

                    <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
                        <div className="flex justify-between items-start">
                            <span className="text-muted-foreground font-medium text-sm md:text-base tracking-wide">
                                {card.title}
                            </span>
                            <div className={cn("h-1.5 w-6 rounded-full shadow-[0_0_8px_currentColor]", card.indicatorColor)} />
                        </div>

                        <div className="mt-2">
                            <h3 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                                {card.format(card.value)}
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};
