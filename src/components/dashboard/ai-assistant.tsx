'use client';

import { useState, useContext, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Bot, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryContext } from '@/context/inventory-context';
import { Input } from '../ui/input';

export function AIAssistant({ initialQuery }: { initialQuery?: string }) {
  const [insights, setInsights] = useState('');
  const [query, setQuery] = useState(initialQuery || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { sales, products, dashboardStats } = useContext(InventoryContext) || { sales: [], products: [], dashboardStats: {} };

  const handleAskAI = async (currentQuery: string) => {
    if (!currentQuery) return;
    setIsLoading(true);
    setError('');
    setInsights('');

    try {
      const response = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: currentQuery,
          contextData: {
            stats: dashboardStats,
            recentSales: sales?.slice(0, 10),
            inventoryProducts: products?.slice(0, 10),
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao comunicar com a API de pesquisa.');
      }

      const data = await response.json();
      setInsights(data.text);
    } catch (e: any) {
      console.error("Erro na pesquisa com IA:", e);
      setError(e.message || 'Não foi possível obter uma resposta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleAskAI(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAskAI(query);
  }

  return (
    <Card className="glass-card shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
          <Sparkles className="text-primary" />
          MajorAssistant
        </CardTitle>
        <CardDescription>
          Faça uma pergunta sobre o seu negócio ou peça um resumo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input 
                placeholder="Ex: Qual foi o produto mais vendido este mês?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" size="icon" disabled={isLoading}>
                <Search className="h-4 w-4" />
            </Button>
        </form>

        <div className="min-h-[100px]">
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
              <p>A resposta do assistente aparecerá aqui.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
