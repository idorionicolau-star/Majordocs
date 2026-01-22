
'use client';

import React, { useState, useContext, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryContext } from '@/context/inventory-context';
import Link from 'next/link';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

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

export function AISummary() {
  const { 
    sales, 
    products, 
    dashboardStats,
    stockMovements
  } = useContext(InventoryContext) || { 
    sales: [], 
    products: [], 
    stockMovements: [],
    dashboardStats: {} 
  };
  
  const [summary, setSummary] = useState<AISummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firstSaleDate, setFirstSaleDate] = useState<Date | null>(null);

  useEffect(() => {
    // Only fetch if there's data to analyze
    if (sales && sales.length > 0 && products && products.length > 0) {
      const fetchSummary = async () => {
        setIsLoading(true);

        const calculatedFirstSaleDate = sales.reduce((earliest, currentSale) => {
          const currentDate = new Date(currentSale.date);
          return currentDate < earliest ? currentDate : earliest;
        }, new Date(sales[0].date));
        setFirstSaleDate(calculatedFirstSaleDate);
        
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
                businessStartDate: calculatedFirstSaleDate.toISOString(),
              }
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Falha ao obter o resumo.');
          }

          const data: AISummaryData = await response.json();
          setSummary(data);
        } catch (e: any) {
          console.error("Erro ao gerar resumo:", e);
          setSummary({ text: `Erro ao gerar resumo: ${e.message}` });
        } finally {
          setIsLoading(false);
        }
      };

      fetchSummary();
    } else {
        setIsLoading(false);
        setSummary({ geral: "Ainda não há dados suficientes para gerar um resumo da saúde do negócio."});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, products]);

  if (!sales || sales.length === 0) {
    return null; // Don't show the card if there are no sales
  }
  
  return (
     <Card className="border-t-4 border-primary glass-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
          <Sparkles className="text-primary" />
          Diagnóstico Inteligente
        </CardTitle>
        <CardDescription>
          {firstSaleDate ? `Análise com base nos dados desde ${format(firstSaleDate, 'dd MMM yyyy', { locale: pt })}.` : `A gerar análise...`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : summary ? (
          summary.text ? (
             <p className="text-sm text-destructive">{summary.text}</p>
          ) : (
            <div className="space-y-4">
              {summary.geral && <p className="text-center text-muted-foreground font-medium">{summary.geral}</p>}
              <div className="grid gap-4 md:grid-cols-2">
                {summary.oportunidade && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-500/30">
                    <h4 className="font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2"><TrendingUp /> {summary.oportunidade.titulo}</h4>
                    <p className="text-sm mt-2">{summary.oportunidade.descricao}</p>
                    <p className="text-sm font-semibold mt-2 text-emerald-800 dark:text-emerald-200">{summary.oportunidade.sugestao}</p>
                  </div>
                )}
                {summary.risco && (
                   <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-500/30">
                    <h4 className="font-bold text-red-700 dark:text-red-300 flex items-center gap-2"><AlertTriangle /> {summary.risco.titulo}</h4>
                    <p className="text-sm mt-2">{summary.risco.descricao}</p>
                     <p className="text-sm font-semibold mt-2 text-red-800 dark:text-red-200">{summary.risco.sugestao}</p>
                  </div>
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
    </Card>
  );
}
