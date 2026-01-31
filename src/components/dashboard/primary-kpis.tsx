
"use client";

import { useContext, useMemo } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { cn, formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { isToday, isYesterday, subDays, parseISO } from 'date-fns';
import { Timestamp } from "firebase/firestore";

export const PrimaryKPIs = () => {
    const { dashboardStats, sales, loading, products, stockMovements } = useContext(InventoryContext) || {
        dashboardStats: null,
        sales: [],
        products: [],
        stockMovements: [],
        loading: true
    };

    const kpiData = useMemo(() => {
        if (loading || !sales || !dashboardStats || !products || !stockMovements) return null;

        const now = new Date();
        
        // --- Daily Sales & Ticket vs Yesterday ---
        const todaySales = sales.filter(s => isToday(parseISO(s.date)));
        const yesterdaySales = sales.filter(s => isYesterday(parseISO(s.date)));

        const todaySalesValue = todaySales.reduce((sum, s) => sum + (s.amountPaid ?? s.totalValue ?? 0), 0);
        const yesterdaySalesValue = yesterdaySales.reduce((sum, s) => sum + (s.amountPaid ?? s.totalValue ?? 0), 0);

        const salesGrowth = yesterdaySalesValue > 0
            ? ((todaySalesValue - yesterdaySalesValue) / yesterdaySalesValue) * 100
            : (todaySalesValue > 0 ? 100 : 0);

        const currentAvgTicket = todaySales.length > 0 ? todaySalesValue / todaySales.length : 0;
        const yesterdayAvgTicket = yesterdaySales.length > 0 ? yesterdaySalesValue / yesterdaySales.length : 0;

        const ticketGrowth = yesterdayAvgTicket > 0
            ? ((currentAvgTicket - yesterdayAvgTicket) / yesterdayAvgTicket) * 100
            : (currentAvgTicket > 0 ? 100 : 0);
        
        // --- Capital Imobilizado Growth (Last 24h) ---
        const currentInventoryValue = dashboardStats.totalInventoryValue;
        const twentyFourHoursAgo = subDays(now, 1);
        
        const productPriceMap = new Map<string, number>();
        products.forEach(p => {
          if (p.sourceIds) {
            p.sourceIds.forEach(id => productPriceMap.set(id, p.price));
          } else if (p.id) {
            productPriceMap.set(p.id, p.price);
          }
        });

        const inventoryValueChangeLast24h = stockMovements
            .filter(m => m.timestamp && (m.timestamp as Timestamp).toDate() > twentyFourHoursAgo)
            .reduce((netChange, movement) => {
                const price = productPriceMap.get(movement.productId);
                if (price === undefined || movement.type === 'TRANSFER') {
                    return netChange;
                }
                return netChange + (movement.quantity * price);
            }, 0);
        
        const inventoryValue24hAgo = currentInventoryValue - inventoryValueChangeLast24h;

        const capitalGrowth = inventoryValue24hAgo > 0
            ? ((currentInventoryValue - inventoryValue24hAgo) / inventoryValue24hAgo) * 100
            : (currentInventoryValue > 0 ? 100 : 0);

        return {
            salesGrowth,
            ticketGrowth,
            capitalGrowth,
            currentDaySales: todaySalesValue,
            currentAvgTicket,
        };
    }, [sales, dashboardStats, products, stockMovements, loading]);


    if (loading || !kpiData) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                <Skeleton className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            </div>
        )
    }

    const cards = [
        {
            title: "FATURAMENTO (HOJE)",
            value: kpiData.currentDaySales,
            href: "/sales",
            trend: kpiData.salesGrowth,
            trendLabel: "vs ontem",
            colorClass: "kpi-card--green",
        },
        {
            title: "CAPITAL IMOBILIZADO",
            value: dashboardStats.totalInventoryValue,
            href: "/inventory",
            trend: kpiData.capitalGrowth,
            trendLabel: "vs 24h atrás",
            colorClass: "kpi-card--blue",
        },
        {
            title: "TICKET MÉDIO (HOJE)",
            value: kpiData.currentAvgTicket,
            href: "/reports",
            trend: kpiData.ticketGrowth,
            trendLabel: "vs ontem",
            colorClass: "kpi-card--purple",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
            {cards.map((card, index) => {
                const isPositive = (card.trend || 0) >= 0;
                const TrendIcon = card.trend === null || card.trend === 0 ? Minus : (isPositive ? TrendingUp : TrendingDown);
                
                 const trendColor = card.trend === null || card.trend === 0
                    ? "text-slate-400"
                    : isPositive ? "text-[var(--card-color)]" : "text-rose-500 dark:text-rose-400";
                
                const trendText = card.trend === null || !isFinite(card.trend) ? "--" : `${isPositive ? '+' : ''}${card.trend?.toFixed(1)}%`;

                return (
                    <Link href={card.href} key={index} className="block group">
                        <div className={cn(
                            "bg-white dark:bg-slate-800 rounded-2xl p-4 relative overflow-hidden border hover:-translate-y-1 transition-transform duration-300 cursor-pointer",
                            card.colorClass
                        )}>
                             <div className="relative z-10 flex flex-col h-full items-center justify-center text-center">
                                <p className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">{card.title}</p>
                                <h2 className="text-2xl font-bold" style={{ color: `var(--card-color)` }}>
                                    {formatCurrency(card.value)}
                                </h2>
                                <div className="flex items-center gap-1 mt-1">
                                    <span className={cn("flex items-center text-xs font-bold gap-0.5", trendColor)}>
                                        <TrendIcon className="h-3 w-3" />
                                        {trendText}
                                    </span>
                                    <span className="text-slate-400 text-[10px]">{card.trendLabel}</span>
                                </div>
                            </div>
                            
                            <div className="absolute bottom-0 left-0 w-full h-1.5 rounded-b-2xl bg-slate-200 dark:bg-slate-700/50 overflow-hidden">
                                <div
                                    className="h-full"
                                    style={{ 
                                        backgroundColor: `var(--card-color)`,
                                        width: card.trend !== null && isFinite(card.trend) ? `${Math.min(Math.abs(card.trend || 0), 100)}%` : '0%' 
                                    }}
                                />
                            </div>
                        </div>
                    </Link>
                )
            })}
        </div>
    );
};
