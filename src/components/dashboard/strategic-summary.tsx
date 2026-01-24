'use client';

import { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCw } from 'lucide-react';
import { InventoryContext } from '@/context/inventory-context';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function StrategicSummary() {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { sales, products, dashboardStats, stockMovements, user, companyData } = useContext(InventoryContext) || {};

  const generateSummary = async () => {
    setIsLoading(true);
    setSummary(null);
    try {
      const response = await fetch('/api/generate-strategic-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contextData: {
            stats: dashboardStats,
            recentSales: sales?.slice(0, 10),
            inventoryProducts: products,
            stockMovements: stockMovements?.slice(0, 20),
            user,
            company: companyData,
          }
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao gerar o resumo.');
      }
      const data = await response.json();
      setSummary(data.text);
    } catch (error: any) {
      console.error(error);
      setSummary(`Não foi possível gerar o resumo estratégico: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sales && products && dashboardStats) {
        generateSummary();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, products, dashboardStats]);

  return (
    <Card className="glass-card shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            Relatório de Operações Estratégico
          </CardTitle>
          <CardDescription>Análise da IA com base nos dados atuais.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={generateSummary} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}
        {summary && (
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {summary}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
