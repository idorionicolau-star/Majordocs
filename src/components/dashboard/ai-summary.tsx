'use client';

import React, { useState, useContext, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, AlertTriangle, RotateCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryContext } from '@/context/inventory-context';
import { format, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Button } from '../ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils';

interface AISummaryData {
  geral?: string;
  oportunidade?: {
    titulo: string;
    descricao: string;
    sugestao: string;
  };
  risco?: {
    titulo: string;
    descricao: string;
    sugestao: string;
  };
  text?: string; // Fallback for plain text or error response
}

interface CachedSummary {
  timestamp: number;
  data: AISummaryData;
}

const STORAGE_KEY = 'majorstockx-ai-summary';

export function AISummary() {
  const { 
    sales, 
    products, 
    dashboardStats,
    stockMovements,
    businessStartDate
  } = useContext(InventoryContext) || { 
    sales: [], 
    products: [], 
    stockMovements: [],
    dashboardStats: {},
    businessStartDate: null
  };
  
  const [summary, setSummary] = useState<AISummaryData | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);

    if (!forceRefresh) {
        try {
            const cached = localStorage.getItem(STORAGE_KEY);
            if (cached) {
                const { timestamp, data }: CachedSummary = JSON.parse(cached);
                if (isToday(new Date(timestamp))) {
                    setSummary(data);
                    setLastUpdated(timestamp);
                    setIsLoading(false);
                    return;
                }
            }
        } catch (error) {
            console.error("Failed to read from localStorage", error);
        }
    }
    
    // Don't fetch if no data
    if (!sales || sales.length === 0 || !products || products.length === 0) {
        setIsLoading(false);
        setSummary({ geral: "Ainda não há dados suficientes para gerar um resumo da saúde do negócio."});
        setLastUpdated(null);
        return;
    }

    try {
      const response = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: "Gere um diagnóstico inteligente do negócio em formato JSON com os campos 'geral', 'oportunidade', e 'risco'.",
          history: [], // No history for the summary
          contextData: {
            stats: dashboardStats,
            recentSales: sales?.slice(0, 10),
            inventoryProducts: products,
            stockMovements: stockMovements,
            businessStartDate: businessStartDate?.toISOString(),
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao obter o resumo.');
      }

      const data: AISummaryData = await response.json();
      const now = Date.now();
      setSummary(data);
      setLastUpdated(now);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: now, data }));
      } catch (error) {
          console.error("Failed to write to localStorage", error);
      }

    } catch (e: any) {
      console.error("Erro ao gerar resumo:", e);
      setSummary({ text: `Erro ao gerar resumo: ${e.message}` });
      setLastUpdated(null);
    } finally {
      setIsLoading(false);
    }
  }, [sales, products, dashboardStats, stockMovements, businessStartDate]);


  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (!sales || sales.length === 0) {
    return null; // Don't show the card if there are no sales
  }

  const hasBothBoxes = summary?.oportunidade && summary?.risco;
  
  return (
     <Card className="border-t-4 border-primary glass-card shadow-lg">
        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
            <AccordionItem value="item-1" className="border-b-0">
                <div className="flex items-center justify-between p-6 data-[state=open]:border-b">
                    <AccordionTrigger className="p-0 text-left hover:no-underline">
                         <div className="flex items-center gap-2">
                            <Sparkles className="text-primary h-6 w-6" />
                            <div>
                                <CardTitle className="text-xl sm:text-2xl">
                                    Diagnóstico Inteligente
                                </CardTitle>
                                <CardDescription>
                                    {lastUpdated ? `Atualizado às ${format(new Date(lastUpdated), 'HH:mm')}` : (businessStartDate ? `Análise baseada nos dados desde ${format(businessStartDate, 'dd MMM yyyy', { locale: pt })}.` : `A gerar análise...`)}
                                </CardDescription>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); fetchSummary(true); }} disabled={isLoading}>
                        <RotateCw className={isLoading ? "animate-spin" : ""} />
                    </Button>
                </div>
                <AccordionContent>
                    <CardContent className="pt-4">
                        {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-4 w-3/4 mx-auto" />
                            <div className="grid md:grid-cols-2 gap-4">
                                <Skeleton className="h-28 w-full" />
                                <Skeleton className="h-28 w-full" />
                            </div>
                        </div>
                        ) : summary ? (
                        summary.text ? (
                            <p className="text-sm text-destructive">{summary.text}</p>
                        ) : (
                            <div className="space-y-4">
                            {summary.geral && <p className="text-center text-muted-foreground font-medium">{summary.geral}</p>}
                            <div className={cn("grid gap-4", hasBothBoxes ? "md:grid-cols-2" : "grid-cols-1")}>
                                {summary.oportunidade && (
                                    <Card className="bg-emerald-500/10 border-emerald-500/30 shadow-md">
                                        <CardHeader className="p-4 pb-2">
                                            <CardTitle className="text-base text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                                <TrendingUp className="h-5 w-5" />
                                                {summary.oportunidade.titulo}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 space-y-2">
                                            <p className="text-sm text-muted-foreground">{summary.oportunidade.descricao}</p>
                                            <p className="text-sm font-semibold text-foreground">{summary.oportunidade.sugestao}</p>
                                        </CardContent>
                                    </Card>
                                )}
                                {summary.risco && (
                                    <Card className="bg-destructive/10 border-destructive/30 shadow-md">
                                        <CardHeader className="p-4 pb-2">
                                            <CardTitle className="text-base text-destructive flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5" />
                                                {summary.risco.titulo}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0 space-y-2">
                                            <p className="text-sm text-muted-foreground">{summary.risco.descricao}</p>
                                            <p className="text-sm font-semibold text-foreground">{summary.risco.sugestao}</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                            </div>
                        )
                        ) : (
                        <div className="text-center text-muted-foreground p-4">
                            Não foi possível gerar um diagnóstico neste momento.
                        </div>
                        )}
                    </CardContent>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </Card>
  );
}