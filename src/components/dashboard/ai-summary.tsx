
'use client';

import React, { useState, useContext, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryContext } from '@/context/inventory-context';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';

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
  
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only fetch if there's data to analyze
    if (sales && sales.length > 0 && products && products.length > 0) {
      const fetchSummary = async () => {
        setIsLoading(true);
        try {
          const response = await fetch('/api/ai-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: "Age como um consultor e gera um relatório de saúde conciso do meu negócio num parágrafo, destacando uma oportunidade e um risco com base nos dados fornecidos.",
              history: [], // No history for the summary
              contextData: {
                stats: dashboardStats,
                recentSales: sales?.slice(0, 10),
                inventoryProducts: products,
                stockMovements: stockMovements,
              }
            }),
          });

          if (!response.ok) {
            throw new Error('Falha ao obter o resumo.');
          }

          const data = await response.json();
          setSummary(data.text);
        } catch (e: any) {
          console.error("Erro ao gerar resumo:", e);
          setSummary(`Erro ao gerar resumo: ${e.message}`);
        } finally {
          setIsLoading(false);
        }
      };

      fetchSummary();
    } else {
        setIsLoading(false);
        setSummary("Ainda não há dados suficientes para gerar um resumo da saúde do negócio.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, products]);

  if (!sales || sales.length === 0) {
    return null; // Don't show the card if there are no sales
  }
  
  return (
     <Card className="glass-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
          <Sparkles className="text-primary" />
          Saúde do Negócio
        </CardTitle>
        <CardDescription>
          Um resumo inteligente gerado pela IA com base nos seus dados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          <div className="prose dark:prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, ...props }) => {
                  const href = props.href || '';
                  if (href.startsWith('/')) {
                      return <Link href={href} {...props} className="text-primary hover:underline font-bold" />;
                  }
                  return <a {...props} className="text-primary hover:underline font-bold" target="_blank" rel="noopener noreferrer" />;
                },
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
