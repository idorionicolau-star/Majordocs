"use client";

import { useContext, useMemo, useState, useEffect, useCallback } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { useAuth } from "@/firebase/provider";
import { cn, formatCurrency } from "@/lib/utils";
import {
    Package, ShoppingCart, AlertTriangle,
    TrendingUp, BarChart3, Warehouse,
    Sparkles, ChevronDown, RefreshCw
} from "lucide-react";
import { isToday, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const INSIGHTS_STORAGE_KEY = 'majorstockx-daily-insights';

export const BusinessSummary = () => {
    const context = useContext(InventoryContext);
    const auth = useAuth();
    const [insightsOpen, setInsightsOpen] = useState(false);
    const [insights, setInsights] = useState<string | null>(null);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [insightsFetched, setInsightsFetched] = useState(false);

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

    const fetchInsights = useCallback(async (forceRefresh = false) => {
        if (insightsLoading) return;

        // Check cache first (once per day)
        if (!forceRefresh) {
            try {
                const cached = localStorage.getItem(INSIGHTS_STORAGE_KEY);
                if (cached) {
                    const { text, timestamp } = JSON.parse(cached);
                    if (isToday(new Date(timestamp))) {
                        setInsights(text);
                        setInsightsFetched(true);
                        return;
                    }
                }
            } catch (e) { /* ignore */ }
        }

        setInsightsLoading(true);
        try {
            const fbToken = await auth.currentUser?.getIdToken();
            const response = await fetch('/api/generate-insights', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${fbToken}`
                },
                body: JSON.stringify({
                    sales: sales?.slice(0, 100),
                    products: products,
                    stats: dashboardStats,
                    companyId: companyData?.id
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Falha ao gerar insights.');
            }

            const data = await response.json();
            setInsights(data.text);
            setInsightsFetched(true);

            // Cache for the rest of the day
            localStorage.setItem(INSIGHTS_STORAGE_KEY, JSON.stringify({
                text: data.text,
                timestamp: new Date().toISOString()
            }));
        } catch (error: any) {
            setInsights(`Não foi possível gerar os insights: ${error.message}`);
            setInsightsFetched(true);
        } finally {
            setInsightsLoading(false);
        }
    }, [sales, products, dashboardStats, companyData, auth]);

    // Fetch insights when expanded for the first time
    useEffect(() => {
        if (insightsOpen && !insightsFetched && sales && sales.length > 0) {
            fetchInsights();
        }
    }, [insightsOpen, insightsFetched, sales, fetchInsights]);

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

            {/* AI Insights - Collapsible */}
            <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen} className="mt-3">
                <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/30 border border-sky-100 dark:border-sky-900/30 hover:shadow-sm transition-all group text-left">
                            <Sparkles className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-sky-700 dark:text-sky-400">Insights da IA</span>
                            <span className="text-[10px] text-muted-foreground">— análise diária automática</span>
                            <ChevronDown className={cn(
                                "h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform duration-200",
                                insightsOpen && "rotate-180"
                            )} />
                        </button>
                    </CollapsibleTrigger>
                    {insightsOpen && insightsFetched && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={(e) => { e.stopPropagation(); fetchInsights(true); }}
                            disabled={insightsLoading}
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", insightsLoading && "animate-spin")} />
                        </Button>
                    )}
                </div>
                <CollapsibleContent className="mt-2">
                    <div className="rounded-lg border border-sky-100 dark:border-sky-900/20 bg-white/60 dark:bg-slate-800/50 p-4 max-h-72 overflow-y-auto scrollbar-thin">
                        {insightsLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-5/6" />
                                <Skeleton className="h-4 w-4/6" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ) : (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:text-slate-600 dark:prose-p:text-slate-400 prose-strong:text-sky-600 dark:prose-strong:text-sky-400">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {insights || "Clique para gerar os insights do dia."}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};
