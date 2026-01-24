'use client';

import { useState, useEffect, useContext, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, RefreshCw } from 'lucide-react';
import { InventoryContext } from '@/context/inventory-context';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { isToday } from 'date-fns';

const STORAGE_KEY = 'majorstockx-strategic-summary';

export function StrategicSummary() {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { sales, products, dashboardStats, stockMovements, user, companyData } = useContext(InventoryContext) || {};

  const generateSummary = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    
    if (!forceRefresh) {
        try {
            const cachedItem = localStorage.getItem(STORAGE_KEY);
            if (cachedItem) {
                const { summary: cachedSummary, timestamp } = JSON.parse(cachedItem);
                if (isToday(new Date(timestamp))) {
                    setSummary(cachedSummary);
                    setIsLoading(false);
                    return;
                }
            }
        } catch (error) {
            console.error("Failed to read from localStorage", error);
        }
    }

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
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ summary: data.text, timestamp: new Date().toISOString() }));
      } catch (error) {
        console.error("Failed to write to localStorage", error);
      }
    } catch (error: any) {
      console.error(error);
      setSummary(`Não foi possível gerar o resumo estratégico: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [sales, products, dashboardStats, stockMovements, user, companyData]);

  useEffect(() => {
    // Make sure we only generate summary when data is available
    if (sales && products && dashboardStats) {
        generateSummary();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, products, dashboardStats]);

  const handleRefresh = () => {
    generateSummary(true);
  };

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
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
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
