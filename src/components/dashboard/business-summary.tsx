"use client";

import { useContext, useMemo } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { cn, formatCurrency } from "@/lib/utils";
import {
    Package, ShoppingCart, AlertTriangle, Users,
    TrendingUp, TrendingDown, BarChart3, Warehouse
} from "lucide-react";
import { isToday, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export const BusinessSummary = () => {
    const context = useContext(InventoryContext);
    if (!context) return null;

    const { sales, products, dashboardStats, companyData, loading } = context;

    const summary = useMemo(() => {
        if (loading || !sales || !products || !dashboardStats) return null;

        const now = new Date();
        const todaySales = sales.filter(s => isToday(parseISO(s.date)));
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const monthSales = sales.filter(s => isWithinInterval(parseISO(s.date), { start: monthStart, end: monthEnd }));

        const todayRevenue = todaySales.reduce((sum, s) => sum + (s.amountPaid ?? s.totalValue ?? 0), 0);
        const monthRevenue = monthSales.reduce((sum, s) => sum + (s.amountPaid ?? s.totalValue ?? 0), 0);
        const todayCount = todaySales.length;
        const monthCount = monthSales.length;

        const totalProducts = products.length;
        const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= (p.criticalStockThreshold || 5)).length;
        const outOfStockProducts = products.filter(p => p.stock <= 0).length;
        const healthyProducts = totalProducts - lowStockProducts - outOfStockProducts;

        const uniqueCustomersThisMonth = new Set(monthSales.filter(s => s.customerId).map(s => s.customerId)).size;

        const topProductMap = new Map<string, { name: string; qty: number; revenue: number }>();
        monthSales.forEach(s => {
            const existing = topProductMap.get(s.productId) || { name: s.productName, qty: 0, revenue: 0 };
            existing.qty += s.quantity;
            existing.revenue += (s.amountPaid ?? s.totalValue ?? 0);
            topProductMap.set(s.productId, existing);
        });
        const topProduct = Array.from(topProductMap.values()).sort((a, b) => b.revenue - a.revenue)[0];

        return {
            todayRevenue, monthRevenue, todayCount, monthCount,
            totalProducts, lowStockProducts, outOfStockProducts, healthyProducts,
            uniqueCustomersThisMonth,
            topProduct,
            inventoryValue: dashboardStats.totalInventoryValue,
        };
    }, [sales, products, dashboardStats, loading]);

    if (loading || !summary) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
                ))}
            </div>
        );
    }

    const stockHealthPercent = summary.totalProducts > 0
        ? Math.round((summary.healthyProducts / summary.totalProducts) * 100)
        : 100;

    return (
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900/80 dark:to-blue-950/20 p-4 md:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground tracking-wide">Resumo do Negócio</h2>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium ml-auto">
                    {companyData?.name || 'Empresa'}
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Today Revenue */}
                <div className="group rounded-xl bg-white dark:bg-slate-800/80 border border-emerald-100 dark:border-emerald-900/30 p-3 hover:shadow-md transition-all hover:-translate-y-0.5">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hoje</span>
                    </div>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(summary.todayRevenue, { compact: true })}</p>
                    <p className="text-[10px] text-muted-foreground">{summary.todayCount} venda{summary.todayCount !== 1 ? 's' : ''}</p>
                </div>

                {/* Month Revenue */}
                <div className="group rounded-xl bg-white dark:bg-slate-800/80 border border-blue-100 dark:border-blue-900/30 p-3 hover:shadow-md transition-all hover:-translate-y-0.5">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <ShoppingCart className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Este Mês</span>
                    </div>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCurrency(summary.monthRevenue, { compact: true })}</p>
                    <p className="text-[10px] text-muted-foreground">{summary.monthCount} vendas • {summary.uniqueCustomersThisMonth} clientes</p>
                </div>

                {/* Inventory */}
                <div className="group rounded-xl bg-white dark:bg-slate-800/80 border border-violet-100 dark:border-violet-900/30 p-3 hover:shadow-md transition-all hover:-translate-y-0.5">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-7 w-7 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                            <Warehouse className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Inventário</span>
                    </div>
                    <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{formatCurrency(summary.inventoryValue, { compact: true })}</p>
                    <p className="text-[10px] text-muted-foreground">{summary.totalProducts} produto{summary.totalProducts !== 1 ? 's' : ''} activos</p>
                </div>

                {/* Stock Health */}
                <div className="group rounded-xl bg-white dark:bg-slate-800/80 border border-amber-100 dark:border-amber-900/30 p-3 hover:shadow-md transition-all hover:-translate-y-0.5">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                            <Package className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Saúde Stock</span>
                    </div>
                    <p className={cn(
                        "text-lg font-bold",
                        stockHealthPercent >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                            stockHealthPercent >= 50 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400"
                    )}>
                        {stockHealthPercent}%
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {summary.lowStockProducts > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-500">
                                <AlertTriangle className="h-2.5 w-2.5" />{summary.lowStockProducts} baixo
                            </span>
                        )}
                        {summary.outOfStockProducts > 0 && (
                            <span className="flex items-center gap-0.5 text-rose-500">
                                <AlertTriangle className="h-2.5 w-2.5" />{summary.outOfStockProducts} esgotado
                            </span>
                        )}
                        {summary.lowStockProducts === 0 && summary.outOfStockProducts === 0 && (
                            <span className="text-emerald-500">Tudo em ordem</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom row - Top Product */}
            {summary.topProduct && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs">
                    <TrendingUp className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="text-muted-foreground">Mais vendido este mês:</span>
                    <span className="font-semibold text-foreground truncate">{summary.topProduct.name}</span>
                    <span className="text-muted-foreground ml-auto flex-shrink-0">{summary.topProduct.qty} un • {formatCurrency(summary.topProduct.revenue, { compact: true })}</span>
                </div>
            )}
        </div>
    );
};
