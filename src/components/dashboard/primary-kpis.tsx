
"use client";

import { useContext, useMemo } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { cn, formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { startOfMonth, subMonths, isSameMonth, parseISO, isSameDay, subDays } from "date-fns";

const GROWING_PATH = "M0,320 L0,220 C180,220 240,120 480,120 C720,120 840,240 1080,240 C1320,240 1380,40 1440,40 L1440,320 Z";
const DECLINING_PATH = "M0,320 L0,40 C180,40 240,160 480,160 C720,160 840,80 1080,80 C1320,80 1380,260 1440,260 L1440,320 Z";

export const PrimaryKPIs = () => {
    const { dashboardStats, sales, stockMovements, loading } = useContext(InventoryContext) || { dashboardStats: null, sales: [], stockMovements: [], loading: true };

    const kpiData = useMemo(() => {
        if (!sales || !dashboardStats) return null;

        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const lastMonthStart = startOfMonth(subMonths(now, 1));

        // 1. Sales Growth (MoM)
        let currentMonthSales = 0;
        let lastMonthSales = 0;
        let currentMonthCount = 0;
        let lastMonthCount = 0;

        sales.forEach(sale => {
            const d = parseISO(sale.date);
            if (isSameMonth(d, now)) {
                currentMonthSales += (sale.amountPaid ?? sale.totalValue ?? 0);
                currentMonthCount++;
            } else if (isSameMonth(d, subMonths(now, 1))) {
                lastMonthSales += (sale.amountPaid ?? sale.totalValue ?? 0);
                lastMonthCount++;
            }
        });

        const salesGrowth = lastMonthSales > 0
            ? ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100
            : 0;

        // 2. Avg Ticket Growth (MoM)
        const currentAvgTicket = currentMonthCount > 0 ? currentMonthSales / currentMonthCount : 0;
        const lastAvgTicket = lastMonthCount > 0 ? lastMonthSales / lastMonthCount : 0;

        const ticketGrowth = lastAvgTicket > 0
            ? ((currentAvgTicket - lastAvgTicket) / lastAvgTicket) * 100
            : 0;

        // 3. Daily Trends (Today vs Yesterday)
        let todaySales = 0;
        let yesterdaySales = 0;
        let todayCount = 0;
        let yesterdayCount = 0;

        const today = now;
        const yesterday = subDays(now, 1);

        sales.forEach(sale => {
            const d = parseISO(sale.date);
            if (isSameDay(d, today)) {
                todaySales += (sale.amountPaid ?? sale.totalValue ?? 0);
                todayCount++;
            } else if (isSameDay(d, yesterday)) {
                yesterdaySales += (sale.amountPaid ?? sale.totalValue ?? 0);
                yesterdayCount++;
            }
        });

        const dailySalesTrend = todaySales > 0 && todaySales >= yesterdaySales ? 'up' : 'down';

        const todayTicket = todayCount > 0 ? todaySales / todayCount : 0;
        const yesterdayTicket = yesterdayCount > 0 ? yesterdaySales / yesterdayCount : 0;
        const dailyTicketTrend = todayTicket > 0 && todayTicket >= yesterdayTicket ? 'up' : 'down';


        // 4. Daily Stock Trend (Net Change Today)
        const todayStockMovements = stockMovements.filter(m => {
            if (!m.timestamp) return false;
            const date = m.timestamp.toDate ? m.timestamp.toDate() : (typeof m.timestamp === 'string' ? parseISO(m.timestamp) : new Date(m.timestamp));
            return isSameDay(date, now);
        });
        const netStockChange = todayStockMovements.reduce((acc, m) => {
            if (m.type === 'IN') return acc + m.quantity;
            if (m.type === 'OUT') return acc - m.quantity;
            if (m.type === 'ADJUSTMENT') return acc + m.quantity;
            return acc;
        }, 0);

        const dailyStockTrend = netStockChange >= 0 ? 'up' : 'down';

        return {
            salesGrowth,
            ticketGrowth,
            currentMonthSales,
            currentAvgTicket,
            dailySalesTrend,
            dailyTicketTrend,
            dailyStockTrend
        };
    }, [sales, dashboardStats, stockMovements]);


    if (loading || !dashboardStats || !kpiData) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-48 rounded-3xl bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-48 rounded-3xl bg-slate-200 dark:bg-slate-800" />
                <Skeleton className="h-48 rounded-3xl bg-slate-200 dark:bg-slate-800" />
            </div>
        )
    }

    const cards = [
        {
            title: "FATURAMENTO MENSAL",
            value: kpiData.currentMonthSales,
            symbol: "VENDAS",
            href: "/sales",
            badgeColor: kpiData.dailySalesTrend === 'up'
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300"
                : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300",
            gradientId: "grad1",
            gradientColors: kpiData.dailySalesTrend === 'up'
                ? { start: "#4ade80", end: "#22c55e" } // Emerald
                : { start: "#fb7185", end: "#e11d48" }, // Rose
            wavePath: kpiData.dailySalesTrend === 'up' ? GROWING_PATH : DECLINING_PATH,
            trend: kpiData.salesGrowth,
            trendLabel: "vs mês anterior",
        },
        {
            title: "CAPITAL IMOBILIZADO",
            value: dashboardStats.totalInventoryValue,
            symbol: "STOCK",
            href: "/inventory",
            badgeColor: kpiData.dailyStockTrend === 'up'
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300" // Keep blue for positive stock/asset? Or Green? User said "Red if negative". Standard asset logic: Growth = Good/Green or Blue. Decline = Bad/Red. Let's use Blue/Green vs Red. Actually, I'll stick to Blue for 'Normal/Good' to differentiate from Sales, unless 'up' means Green. Let's use the requested Red for down.
                : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300",
            gradientId: "grad2",
            gradientColors: kpiData.dailyStockTrend === 'up'
                ? { start: "#38bdf8", end: "#0284c7" } // Blue
                : { start: "#fb7185", end: "#e11d48" }, // Rose
            wavePath: kpiData.dailyStockTrend === 'up' ? GROWING_PATH : DECLINING_PATH,
            trend: null,
            trendLabel: "Posição Atual",
        },
        {
            title: "TICKET MÉDIO",
            value: kpiData.currentAvgTicket,
            symbol: "AVG",
            href: "/sales",
            badgeColor: kpiData.dailyTicketTrend === 'up'
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300"
                : "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300",
            gradientId: "grad3",
            gradientColors: kpiData.dailyTicketTrend === 'up'
                ? { start: "#4ade80", end: "#22c55e" } // Emerald
                : { start: "#fb7185", end: "#e11d48" }, // Rose
            wavePath: kpiData.dailyTicketTrend === 'up' ? GROWING_PATH : DECLINING_PATH,
            trend: kpiData.ticketGrowth,
            trendLabel: "vs mês anterior",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
            {cards.map((card, index) => {
                const isPositive = (card.trend || 0) >= 0;
                const TrendIcon = card.trend === null ? Minus : (isPositive ? TrendingUp : TrendingDown);
                const trendColor = card.trend === null ? "text-slate-400" : (isPositive ? "text-emerald-500" : "text-rose-500");
                const trendText = card.trend === null ? "--" : `${isPositive ? '+' : ''}${card.trend?.toFixed(1)}%`;

                return (
                    <Link href={card.href} key={index} className="block group">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl p-3 md:p-4 relative overflow-hidden shadow-lg border border-slate-100 dark:border-slate-700/50 hover:-translate-y-1 transition-transform duration-300 cursor-pointer h-36 md:h-44">
                            <div className="relative z-10 flex flex-col h-full">
                                {/* Trend Indicator - Top Right */}
                                <div className="absolute top-0 right-0 flex flex-col items-end pointer-events-none">
                                    <span className={cn("flex items-center text-[10px] md:text-xs font-bold gap-0.5", trendColor)}>
                                        <TrendIcon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                        {trendText}
                                    </span>
                                    <span className="text-slate-400 text-[9px] md:text-[10px]">{card.trendLabel}</span>
                                </div>

                                <div className="flex flex-col items-center mt-2 md:mt-4">
                                    <p className="text-slate-400 text-[9px] font-bold tracking-widest uppercase mb-1">{card.title}</p>
                                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white text-center">
                                        {formatCurrency(card.value)}
                                    </h2>
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-0 w-full h-20 md:h-24 opacity-90 transition-opacity duration-300 group-hover:opacity-100">
                                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1440 320">
                                    <defs>
                                        <linearGradient id={card.gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
                                            <stop offset="0%" style={{ stopColor: card.gradientColors.start, stopOpacity: 1 }}></stop>
                                            <stop offset="100%" style={{ stopColor: card.gradientColors.end, stopOpacity: 0.6 }}></stop>
                                        </linearGradient>
                                    </defs>
                                    <path d={card.wavePath} fill={`url(#${card.gradientId})`}></path>
                                </svg>
                            </div>
                        </div>
                    </Link>
                )
            })}
        </div>
    );
};
