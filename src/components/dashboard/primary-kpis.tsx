
"use client";

import { useContext, useState, useMemo } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { cn, formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
    isToday, isYesterday, subDays, parseISO,
    startOfWeek, endOfWeek, subWeeks,
    startOfMonth, endOfMonth, subMonths,
    isWithinInterval,
} from 'date-fns';
import { pt } from 'date-fns/locale';
import { Timestamp } from "firebase/firestore";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Period = 'daily' | 'weekly' | 'monthly';

export const PrimaryKPIs = () => {
    const { dashboardStats, sales, loading, products, stockMovements } = useContext(InventoryContext) || {
        dashboardStats: null,
        sales: [],
        products: [],
        stockMovements: [],
        loading: true
    };
    const [period, setPeriod] = useState<Period>('daily');

    const kpiData = useMemo(() => {
        if (loading || !sales || !dashboardStats || !products || !stockMovements) return null;

        const now = new Date();
        let currentPeriodSales: typeof sales;
        let previousPeriodSales: typeof sales;
        let trendLabel = '';
        let capitalTrendPeriod = 1; // days

        switch (period) {
            case 'weekly':
                const startOfThisWeek = startOfWeek(now, { locale: pt });
                const endOfThisWeek = endOfWeek(now, { locale: pt });
                const startOfLastWeek = startOfWeek(subWeeks(now, 1), { locale: pt });
                const endOfLastWeek = endOfWeek(subWeeks(now, 1), { locale: pt });

                currentPeriodSales = sales.filter(s => isWithinInterval(parseISO(s.date), { start: startOfThisWeek, end: endOfThisWeek }));
                previousPeriodSales = sales.filter(s => isWithinInterval(parseISO(s.date), { start: startOfLastWeek, end: endOfLastWeek }));
                trendLabel = "vs semana ant.";
                capitalTrendPeriod = 7;
                break;
            case 'monthly':
                const startOfThisMonth = startOfMonth(now);
                const endOfThisMonth = endOfMonth(now);
                const startOfLastMonth = startOfMonth(subMonths(now, 1));
                const endOfLastMonth = endOfMonth(subMonths(now, 1));

                currentPeriodSales = sales.filter(s => isWithinInterval(parseISO(s.date), { start: startOfThisMonth, end: endOfThisMonth }));
                previousPeriodSales = sales.filter(s => isWithinInterval(parseISO(s.date), { start: startOfLastMonth, end: endOfLastMonth }));
                trendLabel = "vs mês ant.";
                capitalTrendPeriod = 30;
                break;
            case 'daily':
            default:
                currentPeriodSales = sales.filter(s => isToday(parseISO(s.date)));
                previousPeriodSales = sales.filter(s => isYesterday(parseISO(s.date)));
                trendLabel = "vs ontem";
                capitalTrendPeriod = 1;
                break;
        }

        const currentSalesValue = currentPeriodSales.reduce((sum, s) => sum + (s.amountPaid ?? s.totalValue ?? 0), 0);
        const previousSalesValue = previousPeriodSales.reduce((sum, s) => sum + (s.amountPaid ?? s.totalValue ?? 0), 0);

        const salesGrowth = previousSalesValue > 0
            ? ((currentSalesValue - previousSalesValue) / previousSalesValue) * 100
            : (currentSalesValue > 0 ? 100 : 0);

        const currentAvgTicket = currentPeriodSales.length > 0 ? currentSalesValue / currentPeriodSales.length : 0;
        const previousAvgTicket = previousPeriodSales.length > 0 ? previousSalesValue / previousPeriodSales.length : 0;

        const ticketGrowth = previousAvgTicket > 0
            ? ((currentAvgTicket - previousAvgTicket) / previousAvgTicket) * 100
            : (currentAvgTicket > 0 ? 100 : 0);

        const periodAgo = subDays(now, capitalTrendPeriod);

        const productPriceMap = new Map<string, number>();
        products.forEach(p => {
            if (p.id) { // Use catalog product ID which is more stable
                productPriceMap.set(p.id, p.price);
            }
        });

        const inventoryValueChange = stockMovements
            .filter(m => m.timestamp && (m.timestamp as Timestamp).toDate() > periodAgo)
            .reduce((netChange, movement) => {
                const price = productPriceMap.get(movement.productId);
                if (price === undefined || movement.type === 'TRANSFER') {
                    return netChange;
                }
                return netChange + (movement.quantity * price);
            }, 0);

        const currentInventoryValue = dashboardStats.totalInventoryValue;
        const inventoryValuePeriodAgo = currentInventoryValue - inventoryValueChange;

        const capitalGrowth = inventoryValuePeriodAgo > 0
            ? ((currentInventoryValue - inventoryValuePeriodAgo) / inventoryValuePeriodAgo) * 100
            : (currentInventoryValue > 0 ? 100 : 0);

        return {
            salesGrowth,
            ticketGrowth,
            capitalGrowth,
            currentPeriodSales: currentSalesValue,
            currentAvgTicket,
            trendLabel
        };
    }, [sales, dashboardStats, products, stockMovements, loading, period]);


    if (loading || !kpiData) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                <Skeleton className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            </div>
        )
    }

    const periodLabels = {
        daily: 'Diário',
        weekly: 'Semanal',
        monthly: 'Mensal'
    };

    const cards = [
        {
            title: `FATURAMENTO (${periodLabels[period].toUpperCase()})`,
            value: kpiData.currentPeriodSales,
            href: "/sales",
            trend: kpiData.salesGrowth,
            trendLabel: kpiData.trendLabel,
            colorClass: "kpi-card--green",
        },
        {
            title: "CAPITAL IMOBILIZADO",
            value: dashboardStats.totalInventoryValue,
            href: "/inventory",
            trend: kpiData.capitalGrowth,
            trendLabel: `vs ult. ${period === 'daily' ? '24h' : period === 'weekly' ? '7d' : '30d'}`,
            colorClass: "kpi-card--blue",
        },
        {
            title: `TICKET MÉDIO (${periodLabels[period].toUpperCase()})`,
            value: kpiData.currentAvgTicket,
            href: "/reports",
            trend: kpiData.ticketGrowth,
            trendLabel: kpiData.trendLabel,
            colorClass: "kpi-card--purple",
        },
    ];

    return (
        <div>
            <div className="mb-4">
                <Tabs defaultValue="daily" value={period} onValueChange={(value) => setPeriod(value as Period)} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                        <TabsTrigger value="daily">Diário</TabsTrigger>
                        <TabsTrigger value="weekly">Semanal</TabsTrigger>
                        <TabsTrigger value="monthly">Mensal</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>
    );
};
