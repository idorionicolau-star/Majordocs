'use client';

import { useState, useContext, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Bot } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { generateDashboardInsights, type DashboardInsightsInput } from '@/ai/flows/generate-dashboard-insights-flow';
import { InventoryContext } from '@/context/inventory-context';

export function AIAssistant() {
  const [insights, setInsights] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { dashboardStats, products, sales } = useContext(InventoryContext) || {};
  
  const unsoldProducts = useMemo(() => {
    if (!products || !sales) return [];
    const soldProductNames = new Set(sales.map(sale => sale.productName));
    const unsoldMap = new Map<string, { name: string, totalStock: number }>();
    for (const product of products) {
        if (!soldProductNames.has(product.name)) {
            const availableStock = product.stock - product.reservedStock;
            if (availableStock > 0) {
                const existing = unsoldMap.get(product.name);
                if (existing) {
                    existing.totalStock += availableStock;
                } else {
                    unsoldMap.set(product.name, { name: product.name, totalStock: availableStock });
                }
            }
        }
    }
    return Array.from(unsoldMap.values()).sort((a, b) => b.totalStock - a.totalStock).slice(0, 5);
  }, [products, sales]);
  
  const topSellingProducts = useMemo(() => {
    if (!sales) return [];
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlySales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });

    const productStats = monthlySales.reduce((acc, sale) => {
      if (!acc[sale.productName]) {
        acc[sale.productName] = { quantity: 0 };
      }
      acc[sale.productName].quantity += sale.quantity;
      return acc;
    }, {} as Record<string, { quantity: number }>);

    return Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
  }, [sales]);

  const handleGenerateInsights = async () => {
    if (!dashboardStats) return;

    setIsLoading(true);
    setError('');
    setInsights('');

    const input: DashboardInsightsInput = {
      totalSales: dashboardStats.monthlySalesValue,
      topSellingProducts: topSellingProducts,
      unsoldProducts: unsoldProducts,
    };

    try {
      const result = await generateDashboardInsights(input);
      setInsights(result);
    } catch (e) {
      console.error(e);
      setError('Não foi possível gerar a análise. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
          <Sparkles className="text-primary" />
          Assistente IA
        </CardTitle>
        <CardDescription>
          Obtenha um resumo e insights acionáveis sobre o seu negócio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : insights ? (
          <div className="text-sm text-foreground whitespace-pre-wrap">{insights}</div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-6 border-2 border-dashed rounded-xl">
            <Bot size={40} className="mb-4" />
            <p>Clique no botão para gerar uma análise da sua atividade recente.</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleGenerateInsights} disabled={isLoading} className="w-full">
          {isLoading ? 'A analisar...' : "Gerar Análise"}
        </Button>
      </CardFooter>
    </Card>
  );
}
