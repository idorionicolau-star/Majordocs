
"use client";

import { useContext, useMemo, Suspense } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { Product, Sale } from '@/lib/types';
import { subDays, isAfter, differenceInDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { StockHealthScore } from '@/components/diagnostico/stock-health-score';
import { InsightCard } from '@/components/diagnostico/insight-card';
import { AlertTriangle, TrendingUp, CircleDollarSign, Package, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/card';

// Main component with Suspense wrapper
export default function DiagnosticoPageWrapper() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DiagnosticoPage />
    </Suspense>
  );
}


function DiagnosticoPage() {
  const { products, sales, loading: contextLoading } = useContext(InventoryContext) || { products: [], sales: [], loading: true };

  const loading = contextLoading || !products || !sales;

  // --- INSIGHT A: Stock Health ---
  const stockHealth = useMemo(() => {
    if (loading || products.length === 0) return { score: 0, healthyCount: 0, totalCount: 0 };
    
    const activeProducts = products.filter(p => p.stock > 0);
    const healthyProducts = activeProducts.filter(p => (p.stock - p.reservedStock) > p.lowStockThreshold);
    
    const score = activeProducts.length > 0 ? (healthyProducts.length / activeProducts.length) * 100 : 100;
    
    return {
      score: Math.round(score),
      healthyCount: healthyProducts.length,
      totalCount: activeProducts.length
    };
  }, [products, loading]);

  // --- INSIGHT B: Imminent Stockout ---
  const imminentStockouts = useMemo(() => {
    if (loading) return [];

    const thirtyDaysAgo = subDays(new Date(), 30);
    const relevantSales = sales.filter(s => isAfter(new Date(s.date), thirtyDaysAgo));

    const salesVelocity = relevantSales.reduce((acc, sale) => {
      acc[sale.productName] = (acc[sale.productName] || 0) + sale.quantity;
      return acc;
    }, {} as Record<string, number>);

    const stockouts: { name: string; daysLeft: number; unit: string }[] = [];

    products.forEach(product => {
      const dailyAvgSale = (salesVelocity[product.name] || 0) / 30;
      if (dailyAvgSale <= 0) return;

      const availableStock = product.stock - product.reservedStock;
      const daysLeft = availableStock / dailyAvgSale;

      if (daysLeft > 0 && daysLeft <= 7) {
        stockouts.push({
          name: product.name,
          daysLeft: Math.floor(daysLeft),
          unit: product.unit || 'un'
        });
      }
    });

    return stockouts.sort((a,b) => a.daysLeft - b.daysLeft);
  }, [products, sales, loading]);

  // --- INSIGHT C: Dead Stock ---
  const deadStock = useMemo(() => {
    if (loading) return { totalValue: 0, items: [] };

    const ninetyDaysAgo = subDays(new Date(), 90);
    const recentSaleNames = new Set(sales.filter(s => isAfter(new Date(s.date), ninetyDaysAgo)).map(s => s.productName));

    const deadItems = products.filter(p => !recentSaleNames.has(p.name) && (p.stock - p.reservedStock) > 0);
    
    const totalValue = deadItems.reduce((sum, item) => sum + ((item.stock - item.reservedStock) * (item.price || 0)), 0);

    return {
      totalValue,
      items: deadItems.map(p => p.name)
    };
  }, [products, sales, loading]);

  // --- INSIGHT D: Top Movers ---
  const topMovers = useMemo(() => {
    if (loading) return [];

    const sevenDaysAgo = subDays(new Date(), 7);
    const recentSales = sales.filter(s => isAfter(new Date(s.date), sevenDaysAgo));

    const productSales = recentSales.reduce((acc, sale) => {
      acc[sale.productName] = (acc[sale.productName] || 0) + sale.quantity;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(productSales)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
  }, [sales, loading]);
  
  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="bg-slate-50 -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
            <h1 className="text-3xl font-bold font-headline tracking-tight">Diagnóstico Estratégico</h1>
            <p className="text-muted-foreground">O seu painel de controle executivo para decisões rápidas.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Column */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Hero Card - Stock Health */}
                <div className="md:col-span-2">
                    <InsightCard title="Saúde do Stock" icon={Activity}>
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex-1 text-center md:text-left">
                                <p className="text-lg text-muted-foreground">
                                    Dos <span className="font-bold text-foreground">{stockHealth.totalCount}</span> itens ativos, <span className="font-bold text-emerald-600">{stockHealth.healthyCount}</span> estão com stock otimizado.
                                </p>
                                <p className="mt-4 text-sm">Um stock saudável significa que tem produtos suficientes para atender à demanda sem excessos que prendem capital.</p>
                            </div>
                            <StockHealthScore score={stockHealth.score} />
                        </div>
                    </InsightCard>
                </div>
                
                {/* Dead Stock */}
                <InsightCard title="Capital Parado" icon={CircleDollarSign} alertType="warning">
                   <div className="flex flex-col items-center justify-center h-full text-center">
                        <p className="text-4xl font-bold text-amber-500">{formatCurrency(deadStock.totalValue)}</p>
                        <p className="text-sm mt-1">presos em {deadStock.items.length} itens sem vendas há mais de 90 dias.</p>
                        <Button variant="outline" size="sm" asChild className="mt-4">
                           <Link href="/inventory">Ver itens para liquidar</Link>
                        </Button>
                   </div>
                </InsightCard>

                {/* Top Movers */}
                 <InsightCard title="Campeões de Venda" icon={TrendingUp} alertType="success">
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Top 3 produtos mais vendidos na última semana. Garanta que a produção acompanha o ritmo!</p>
                        {topMovers.length > 0 ? (
                            topMovers.map(item => (
                                <div key={item.name} className="flex justify-between items-center bg-emerald-500/10 p-2 rounded-lg">
                                    <span className="font-bold text-emerald-700">{item.name}</span>
                                    <span className="font-mono font-bold text-emerald-700">{item.quantity} un.</span>
                                </div>
                            ))
                        ) : <p className="text-center py-4 text-muted-foreground">Sem vendas na última semana.</p>}
                    </div>
                </InsightCard>
            </div>

            {/* Side Column */}
            <div className="lg:col-span-1">
                 <InsightCard title="Risco de Rutura" icon={AlertTriangle} fullHeight alertType="critical">
                    <div className="flex flex-col h-full">
                        <p className="text-sm text-muted-foreground mb-4">
                            {imminentStockouts.length > 0 
                                ? `Atenção: ${imminentStockouts.length} iten(s) podem esgotar nos próximos 7 dias com base na velocidade de venda.`
                                : `Nenhum item com risco iminente de rutura de stock.`
                            }
                        </p>
                        <div className="space-y-3 flex-1">
                             {imminentStockouts.map(item => (
                                <div key={item.name} className="flex items-center gap-4 bg-red-500/10 p-3 rounded-lg">
                                    <div className="flex-shrink-0">
                                        <Package className="h-6 w-6 text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-red-700">{item.name}</p>
                                        <p className="text-xs text-red-700/80">
                                            Previsão de rutura em ~{item.daysLeft} dia(s)
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button variant="destructive" className="w-full mt-4" asChild>
                            <Link href="/inventory">Reabastecer Agora</Link>
                        </Button>
                    </div>
                </InsightCard>
            </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton component for loading state
function LoadingSkeleton() {
  return (
    <div className="bg-slate-50 -m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 md:p-8 min-h-screen">
       <div className="max-w-7xl mx-auto">
         <header className="mb-8">
            <Skeleton className="h-9 w-1/3" />
            <Skeleton className="h-4 w-1/2 mt-2" />
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2"><Skeleton className="h-64 rounded-xl" /></div>
                <Skeleton className="h-64 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="lg:col-span-1">
                 <Skeleton className="h-96 rounded-xl" />
            </div>
        </div>
      </div>
    </div>
  );
}
