
"use client";

import { useContext, useMemo } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { cn, formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { startOfMonth, subMonths, isSameMonth, parseISO } from "date-fns";

export const PrimaryKPIs = () => {
    const { dashboardStats, sales, loading } = useContext(InventoryContext) || { dashboardStats: null, sales: [], loading: true };

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

        return {
            salesGrowth,
            ticketGrowth,
            currentMonthSales,
            currentAvgTicket
        };
    }, [sales, dashboardStats]);


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
            subtitle: "Performance de Vendas",
            value: kpiData.currentMonthSales, // Use real calculated current month sales
            symbol: "VENDAS",
            href: "/sales",
            badgeColor: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300",
            gradientId: "grad1",
            gradientColors: { start: "#c084fc", end: "#a855f7" },
            wavePath: "M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
            trend: kpiData.salesGrowth,
            trendLabel: "vs mês anterior",
        },
        {
            title: "CAPITAL IMOBILIZADO",
            subtitle: "Valor em Stock",
            value: dashboardStats.totalInventoryValue,
            symbol: "STOCK",
            href: "/inventory",
            badgeColor: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300",
            gradientId: "grad2",
            gradientColors: { start: "#4ade80", end: "#22c55e" },
            wavePath: "M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,213.3C672,192,768,128,864,128C960,128,1056,192,1152,208C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
            trend: null, // No historical stock data to compare
            trendLabel: "Posição Atual",
        },
        {
            title: "TICKET MÉDIO",
            subtitle: "Média por Venda",
            value: kpiData.currentAvgTicket, // Use real current month avg
            symbol: "AVG",
            href: "/sales",
            badgeColor: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300",
            gradientId: "grad3",
            gradientColors: { start: "#38bdf8", end: "#0284c7" },
            wavePath: "M0,160L48,144C96,128,192,96,288,106.7C384,117,480,171,576,197.3C672,224,768,224,864,197.3C960,171,1056,117,1152,101.3C1248,85,1344,107,1392,117.3L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
            trend: kpiData.ticketGrowth,
            trendLabel: "vs mês anterior",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
            {cards.map((card, index) => {
                const isPositive = (card.trend || 0) >= 0;
                const TrendIcon = card.trend === null ? Minus : (isPositive ? TrendingUp : TrendingDown);
                const trendColor = card.trend === null ? "text-slate-400" : (isPositive ? "text-emerald-500" : "text-rose-500");
                const trendText = card.trend === null ? "--" : `${isPositive ? '+' : ''}${card.trend?.toFixed(1)}%`;

                return (
                    <Link href={card.href} key={index} className="block group">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 md:p-5 relative overflow-hidden shadow-lg border border-slate-100 dark:border-slate-700/50 hover:-translate-y-1 transition-transform duration-300 cursor-pointer">
                            <div className="relative z-10">
                                <div className="flex flex-col items-center justify-center text-center mb-4">
                                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded mb-2", card.badgeColor)}>{card.symbol}</span>
                                    <div>
                                        <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">{card.title}</p>
                                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mt-0.5 group-hover:text-primary transition-colors">{card.subtitle}</h3>
                                    </div>
                                </div>
                                <div className="mt-2 mb-4 md:mb-10 flex flex-col items-center">
                                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white text-center">
                                        {formatCurrency(card.value)}
                                    </h2>
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                        <span className={cn("flex items-center text-xs font-bold gap-1", trendColor)}>
                                            <TrendIcon className="h-3 w-3" />
                                            {trendText}
                                        </span>
                                        <span className="text-slate-400 text-[10px]">{card.trendLabel}</span>
                                    </div>
                                </div>
                                <div className="flex justify-center items-center mt-2">
                                    <div className="bg-white/20 md:backdrop-blur-sm border border-white/40 dark:border-white/10 group-hover:bg-primary group-hover:text-white text-slate-500 dark:text-white shadow-lg rounded-full w-8 h-8 flex items-center justify-center transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute bottom-0 left-0 w-full h-32 opacity-90 transition-opacity duration-300 group-hover:opacity-100">
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
