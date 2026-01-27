
"use client";

import { useContext, useMemo, Suspense } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { subDays, isAfter } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { StockHealthScore } from '@/components/diagnostico/stock-health-score';
import { InsightCard } from '@/components/diagnostico/insight-card';
import { AlertTriangle, TrendingUp, CircleDollarSign, Package, Activity, ShieldCheck, Box, Redo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export default function DiagnosticoPageWrapper() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DiagnosticoPage />
    </Suspense>
  );
}

function DiagnosticoPage() {
  const { products, sales, dashboardStats, loading: contextLoading } = useContext(InventoryContext) || { products: [], sales: [], dashboardStats: null, loading: true };

  const loading = contextLoading || !products || !sales || !dashboardStats;

  const healthStats = useMemo(() => {
    if (!products || products.length === 0) return { score: 0, optimizedCount: 0, excessCount: 0, criticalCount: 0 };
    
    const activeProducts = products.filter(p => (p.stock - p.reservedStock) > 0);
    if (activeProducts.length === 0) return { score: 100, optimizedCount: 0, excessCount: 0, criticalCount: 0 };

    const optimizedProducts = activeProducts.filter(p => (p.stock - p.reservedStock) > p.lowStockThreshold);
    const criticalProducts = activeProducts.filter(p => (p.stock - p.reservedStock) <= p.criticalStockThreshold);
    
    const ninetyDaysAgo = subDays(new Date(), 90);
    const recentSaleNames = new Set(sales.filter(s => s.date && isAfter(new Date(s.date), ninetyDaysAgo)).map(s => s.productName));
    const excessProducts = activeProducts.filter(p => !recentSaleNames.has(p.name));
    
    const score = (optimizedProducts.length / activeProducts.length) * 100;
    
    return {
      score: Math.round(score),
      optimizedCount: optimizedProducts.length,
      excessCount: excessProducts.length,
      criticalCount: criticalProducts.length,
    };
  }, [products, sales]);

  const deadStock = useMemo(() => {
    if (loading || !dashboardStats) return { totalValue: 0, items: [], percentageOfInventory: 0 };

    const ninetyDaysAgo = subDays(new Date(), 90);
    const recentSaleNames = new Set(sales.filter(s => s.date && isAfter(new Date(s.date), ninetyDaysAgo)).map(s => s.productName));
    const deadItems = products.filter(p => !recentSaleNames.has(p.name) && (p.stock - p.reservedStock) > 0);
    const totalValue = deadItems.reduce((sum, item) => sum + ((item.stock - item.reservedStock) * (item.price || 0)), 0);
    const percentage = dashboardStats.totalInventoryValue > 0 ? (totalValue / dashboardStats.totalInventoryValue) * 100 : 0;
    
    return {
      totalValue,
      items: deadItems.map(p => p.name),
      percentageOfInventory: Math.round(percentage),
    };
  }, [products, sales, loading, dashboardStats]);

  const imminentStockouts = useMemo(() => {
    if (loading) return [];
    const thirtyDaysAgo = subDays(new Date(), 30);
    const relevantSales = sales.filter(s => s.date && isAfter(new Date(s.date), thirtyDaysAgo));
    const salesVelocity = relevantSales.reduce((acc, sale) => {
      acc[sale.productName] = (acc[sale.productName] || 0) + sale.quantity;
      return acc;
    }, {} as Record<string, number>);

    return products
      .map(product => {
        const dailyAvgSale = (salesVelocity[product.name] || 0) / 30;
        if (dailyAvgSale <= 0) return null;

        const availableStock = product.stock - product.reservedStock;
        const daysLeft = availableStock / dailyAvgSale;

        if (daysLeft > 0 && daysLeft <= 14) { // Increased to 14 days to have more items
          return {
            name: product.name,
            daysLeft: Math.floor(daysLeft),
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a!.daysLeft - b!.daysLeft)
      .slice(0, 5); // Limit to 5
  }, [products, sales, loading]);

  const topMovers = useMemo(() => {
    if (loading) return [];
    const sevenDaysAgo = subDays(new Date(), 7);
    const recentSales = sales.filter(s => s.date && isAfter(new Date(s.date), sevenDaysAgo));
    const productSales = recentSales.reduce((acc, sale) => {
      acc[sale.productName] = (acc[sale.productName] || 0) + sale.quantity;
      return acc;
    }, {} as Record<string, number>);
    
    const sorted = Object.entries(productSales)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
      
    const topSellerQuantity = sorted[0]?.quantity || 1;

    return sorted.slice(0, 5).map(item => ({
        ...item,
        percentage: (item.quantity / topSellerQuantity) * 100
    }));
  }, [sales, loading]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-950 -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
            <h1 className="text-3xl font-bold font-headline tracking-tight text-slate-900 dark:text-slate-100">Diagnóstico Tático</h1>
            <p className="text-slate-500 dark:text-slate-400">Painel de controle executivo para decisões rápidas.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <InsightCard title="Saúde do Stock" icon={ShieldCheck} alertType="success">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <StockHealthScore score={healthStats.score} />
                    <div className="flex-1 space-y-3">
                        <div className='flex items-center gap-2'>
                           <span className='h-2 w-2 rounded-full bg-emerald-500'></span>
                           <span className='text-sm text-slate-600 dark:text-slate-300'>{healthStats.optimizedCount} Itens Otimizados</span>
                        </div>
                        <div className='flex items-center gap-2'>
                           <span className='h-2 w-2 rounded-full bg-amber-500'></span>
                           <span className='text-sm text-slate-600 dark:text-slate-300'>{healthStats.excessCount} Itens em Excesso (sem vendas)</span>
                        </div>
                         <div className='flex items-center gap-2'>
                           <span className='h-2 w-2 rounded-full bg-rose-500'></span>
                           <span className='text-sm text-slate-600 dark:text-slate-300'>{healthStats.criticalCount} Itens em Nível Crítico</span>
                        </div>
                    </div>
                </div>
            </InsightCard>

            <InsightCard title="Capital Parado (Oportunidade)" icon={CircleDollarSign} alertType="warning" className="bg-gradient-to-br from-white/70 to-amber-50/50 dark:from-slate-900/60 dark:to-amber-900/20">
               <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-2xl md:text-5xl font-mono font-bold text-amber-600 dark:text-amber-400">{formatCurrency(deadStock.totalValue)}</p>
                    <p className="text-sm mt-1 text-slate-600 dark:text-slate-400">em {deadStock.items.length} itens sem vendas há +90 dias.</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">Representa {deadStock.percentageOfInventory}% do valor total em armazém.</p>
                    <Button variant="outline" size="sm" asChild className="mt-4 bg-amber-500/10 dark:bg-amber-500/10 border-amber-500/20 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 dark:hover:bg-amber-500/20 hover:text-amber-800 dark:hover:text-amber-200 hover:shadow-[0_0_10px_rgba(251,191,36,0.3)] transition-all">
                       <Link href="/inventory">Ver itens para liquidar</Link>
                    </Button>
               </div>
            </InsightCard>

             <InsightCard title="Risco de Rutura de Stock" icon={AlertTriangle} fullHeight alertType="critical">
                <div className="flex flex-col h-full">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        {imminentStockouts.length > 0 
                            ? `Atenção: ${imminentStockouts.length} iten(s) podem esgotar nos próximos 14 dias.`
                            : `Nenhum item com risco iminente de rutura de stock.`
                        }
                    </p>
                    <div className="space-y-4 flex-1">
                         {imminentStockouts.map(item => {
                            if (!item) return null;
                            const isUrgent = item.daysLeft <= 3;
                            const progressValue = 100 - (item.daysLeft / 14 * 100);
                            return (
                                <div key={item.name} className="flex items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{item.name}</p>
                                            <p className={cn("text-xs font-mono font-bold", isUrgent ? 'text-rose-500 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400')}>
                                                ~{item.daysLeft} dia(s)
                                            </p>
                                        </div>
                                         <Progress value={progressValue} className={cn("h-1.5 bg-slate-200 dark:bg-slate-800", isUrgent ? '[&>div]:bg-rose-500' : '[&>div]:bg-amber-500', isUrgent && "animate-pulse")} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <Button variant="destructive" className="w-full mt-4 bg-rose-500/80 hover:bg-rose-500" asChild>
                        <Link href="/inventory">Reabastecer Agora</Link>
                    </Button>
                </div>
            </InsightCard>

            <InsightCard title="Campeões de Venda (Última Semana)" icon={TrendingUp} alertType="info">
                <div className="space-y-3">
                    {topMovers.length > 0 ? (
                        topMovers.map((item, index) => (
                            <div key={item.name}>
                                <div className="flex justify-between items-baseline text-sm mb-1">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</span>
                                    <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{item.quantity} un.</span>
                                </div>
                                <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-cyan-500 dark:bg-cyan-400"
                                        style={{ width: `${item.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))
                    ) : <p className="text-center py-4 text-slate-500 dark:text-slate-500">Sem vendas na última semana.</p>}
                </div>
            </InsightCard>
        </div>
      </div>
    </div>
  );
}


function LoadingSkeleton() {
  return (
    <div className="bg-slate-50 dark:bg-slate-950 -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 min-h-screen">
       <div className="max-w-7xl mx-auto">
         <header className="mb-8">
            <Skeleton className="h-9 w-1/3 bg-slate-200 dark:bg-slate-700" />
            <Skeleton className="h-4 w-1/2 mt-2 bg-slate-200 dark:bg-slate-700" />
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="h-80 rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
