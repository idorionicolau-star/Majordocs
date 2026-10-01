"use client";

import { useContext, useMemo, useState, useEffect, useCallback } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { useAuth } from "@/firebase/provider";
import { useCRM } from "@/context/crm-context";
import Link from "next/link";
import { cn, daysAgo, formatCurrency, plural } from "@/lib/utils";
import { analyzeBusiness, type Severity } from "@/lib/business-analysis";
import { links } from "@/lib/deep-links";
import {
    ShoppingCart, AlertTriangle, TrendingUp, Sun, Zap, PackagePlus, PackageCheck,
    ClipboardCheck, Truck, CircleDollarSign, CheckCircle2, ChevronRight,
    Sparkles, ChevronDown, RefreshCw
} from "lucide-react";
import { isToday } from 'date-fns';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTypingEffect } from "@/hooks/use-typing-effect";

const INSIGHTS_STORAGE_KEY = 'majorstockx-daily-insights-v2';

const SEVERITY: Record<Severity, { box: string; dot: string }> = {
    critical: { box: "border-red-500/30 bg-red-500/5", dot: "bg-red-500" },
    warning: { box: "border-amber-500/30 bg-amber-500/5", dot: "bg-amber-500" },
    info: { box: "border-sky-500/20 bg-sky-500/5", dot: "bg-sky-500" },
    good: { box: "border-emerald-500/20 bg-emerald-500/5", dot: "bg-emerald-500" },
};

const TILE_TONES = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30",
    rose: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30",
    slate: "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800",
} as const;

function Tile({ href, icon: Icon, label, value, sub, tone }: {
    href: string; icon: React.ElementType; label: string; value: string; sub: string; tone: keyof typeof TILE_TONES;
}) {
    const [text] = TILE_TONES[tone].split(" bg-");
    return (
        <Link href={href} className="group rounded-xl bg-white dark:bg-slate-800/80 border border-border/60 p-3 hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex items-center gap-2 mb-1.5">
                <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", TILE_TONES[tone])}>
                    <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
            </div>
            <p className={cn("text-lg font-bold", text)}>{value}</p>
            <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
        </Link>
    );
}

export const BusinessSummary = () => {
    const context = useContext(InventoryContext);
    if (!context) return null;
    return <BusinessSummaryInner context={context} />;
};

const BusinessSummaryInner = ({ context }: { context: NonNullable<React.ContextType<typeof InventoryContext>> }) => {
    const auth = useAuth();
    const [insightsOpen, setInsightsOpen] = useState(false);
    const [insights, setInsights] = useState<string | null>(null);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [insightsFetched, setInsightsFetched] = useState(false);
    const [isFreshlyGenerated, setIsFreshlyGenerated] = useState(false);

    const { sales, products, companyData, loading } = context;
    const inv = context;

    const { customers } = useCRM();
    const canSell = context.canEdit('sales');
    const canStock = context.canEdit('inventory');

    // Mesmo motor do Diagnóstico — uma só fonte para "o que está mal".
    const analysis = useMemo(() => {
        if (loading || !sales || !products) return null;
        return analyzeBusiness({
            products, sales, customers: customers || [],
            orders: inv.orders || [], productions: inv.productions || [],
            stockMovements: inv.stockMovements || [], businessType: companyData?.businessType,
        });
    }, [loading, sales, products, customers, inv.orders, inv.productions, inv.stockMovements, companyData?.businessType]);


    const fetchInsights = useCallback(async (forceRefresh = false) => {
        if (insightsLoading) return;

        const storageKey = `${INSIGHTS_STORAGE_KEY}-${auth.currentUser?.uid || 'guest'}`;

        // Check cache first (once per day)
        if (!forceRefresh) {
            try {
                const cached = localStorage.getItem(storageKey);
                if (cached) {
                    const { text, timestamp } = JSON.parse(cached);
                    if (isToday(new Date(timestamp))) {
                        setIsFreshlyGenerated(false);
                        setInsights(text);
                        setInsightsFetched(true);
                        return;
                    }
                }
            } catch (e) { /* ignore */ }
        }

        setInsightsLoading(true);
        try {
            const { analyzeBusiness, analysisToMarkdown } = await import('@/lib/business-analysis');

            const text = analysisToMarkdown(analyzeBusiness({ products: products || [], sales: sales || [], customers: customers || [], orders: (inv as any)?.orders || [], productions: (inv as any)?.productions || [], stockMovements: (inv as any)?.stockMovements || [], businessType: companyData?.businessType }));

            setIsFreshlyGenerated(true);
            setInsights(text);
            setInsightsFetched(true);

            // Cache for the rest of the day
            localStorage.setItem(storageKey, JSON.stringify({
                text: text,
                timestamp: new Date().toISOString()
            }));
        } catch (error: any) {
            setInsights(`Não foi possível gerar as sugestões: ${error.message}`);
            setInsightsFetched(true);
        } finally {
            setInsightsLoading(false);
        }
    }, [sales, products, customers, companyData, auth.currentUser?.uid]);

    // Fetch insights when expanded for the first time
    useEffect(() => {
        if (insightsOpen && !insightsFetched && sales && sales.length > 0) {
            fetchInsights();
        }
    }, [insightsOpen, insightsFetched, sales, fetchInsights]);

    const displayedInsights = useTypingEffect(insights || "", 15, isFreshlyGenerated, () => {
        setIsFreshlyGenerated(false);
    });

    if (loading || !analysis) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
                ))}
            </div>
        );
    }

    const a = analysis;
    const attention = a.alerts.filter(al => al.severity !== 'good').slice(0, 4);
    const lateSales = a.sales.daysSinceLastSale === null || a.sales.daysSinceLastSale > 7;

    const shortcuts = [
        { label: 'Vender', href: '/pos', icon: Zap, show: canSell, tone: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
        { label: 'Entrada', href: '/inventory/quick?modo=entrada', icon: PackagePlus, show: canStock, tone: 'bg-white dark:bg-slate-800 hover:bg-muted' },
        { label: 'Contagem', href: '/inventory/quick?modo=contagem', icon: ClipboardCheck, show: canStock, tone: 'bg-white dark:bg-slate-800 hover:bg-muted' },
        { label: 'Lista de carga', href: '/sales/carga', icon: Truck, show: context.canView('sales'), tone: 'bg-white dark:bg-slate-800 hover:bg-muted' },
    ].filter(sc => sc.show);

    return (
        <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900/80 dark:to-blue-950/20 p-4 md:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Sun className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground tracking-wide">Hoje</h2>
                <span className="text-[10px] text-muted-foreground capitalize">
                    {new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium ml-auto truncate max-w-[40%]">
                    {companyData?.name || 'Empresa'}
                </span>
            </div>

            {/* 1. Hoje — os números do dia */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Tile href="/sales" icon={TrendingUp} label="Vendido hoje" tone="emerald"
                    value={formatCurrency(a.sales.today, { compact: true })}
                    sub={a.sales.todayTickets === 0 ? 'ainda nenhuma venda' : plural(a.sales.todayTickets, 'venda', 'vendas')} />
                <Tile href="/sales" icon={ShoppingCart} label="Este mês" tone="blue"
                    value={formatCurrency(a.sales.month, { compact: true })}
                    sub={plural(a.sales.monthTickets, 'venda', 'vendas')} />
                <Tile href={links.salesByStatus('Pendente')} icon={CircleDollarSign} label="Por receber" tone={a.sales.receivables > 0 ? 'rose' : 'slate'}
                    value={formatCurrency(a.sales.receivables, { compact: true })}
                    sub={a.sales.receivablesList.length ? plural(a.sales.receivablesList.length, 'cliente deve', 'clientes devem') : 'nada em falta'} />
                <Tile href={links.salesByStatus('Pago')} icon={PackageCheck} label="Por levantar" tone={a.stock.pendingPickups.length > 0 ? 'amber' : 'slate'}
                    value={String(a.stock.pendingPickups.length)}
                    sub={a.stock.pendingPickups.length ? 'vendas pagas, material reservado' : 'nada à espera'} />
            </div>

            {/* 2. Atalhos — o que se faz todos os dias */}
            {shortcuts.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {shortcuts.map(sc => (
                        <Link key={sc.href} href={sc.href}
                            className={cn("flex items-center justify-center gap-2 h-11 rounded-xl border border-border/60 text-sm font-semibold transition-colors", sc.tone)}>
                            <sc.icon className="h-4 w-4" /> {sc.label}
                        </Link>
                    ))}
                </div>
            )}

            {/* 3. Atenção — o que precisa de ser resolvido, com link directo */}
            <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Atenção</h3>
                    <Link href="/diagnostico" className="ml-auto flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        Diagnóstico completo <ChevronRight className="h-3 w-3" />
                    </Link>
                </div>
                {attention.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 shrink-0" /> Nada urgente. Continue a registar as vendas do dia.
                    </div>
                ) : (
                    <ul className="space-y-1.5">
                        {attention.map(al => {
                            const sev = SEVERITY[al.severity];
                            const body = (
                                <>
                                    <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", sev.dot)} />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-foreground">{al.title}</span>
                                        {al.action && <span className="block text-xs text-muted-foreground">{al.action.label}</span>}
                                    </span>
                                    {al.action && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                                </>
                            );
                            const cls = cn("flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors", sev.box, al.action && "hover:bg-muted/60");
                            return (
                                <li key={al.id}>
                                    {al.action ? <Link href={al.action.href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>}
                                </li>
                            );
                        })}
                    </ul>
                )}
                {lateSales && a.sales.daysSinceLastSale !== null && (
                    <p className="mt-2 text-[11px] text-muted-foreground">
                        Última venda registada {daysAgo(a.sales.daysSinceLastSale)}. Os números acima só batem certo se todas as vendas forem registadas.
                    </p>
                )}
            </div>

            {/* AI Insights - Collapsible */}
            <Collapsible open={insightsOpen} onOpenChange={setInsightsOpen} className="mt-4">
                <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/30 border border-sky-100 dark:border-sky-900/30 hover:shadow-sm transition-all group text-left">
                            <Sparkles className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-sky-700 dark:text-sky-400">Sugestões do dia</span>
                            <span className="text-[10px] text-muted-foreground truncate">— calculadas no aparelho, sem internet</span>
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
                                    {isFreshlyGenerated ? displayedInsights : (insights || "Toque para gerar as sugestões do dia.")}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};
