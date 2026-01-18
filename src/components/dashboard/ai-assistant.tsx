'use client';

import { useState, useContext, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Bot } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryContext } from '@/context/inventory-context';

export function AIAssistant() {
  const [insights, setInsights] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { sales } = useContext(InventoryContext) || { sales: [] };

  const handleGenerateInsights = async () => {
    setIsLoading(true);
    setError('');
    setInsights('');

    try {
      const response = await fetch('/api/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sales }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Falha ao comunicar com a API de insights.');
      }

      const data = await response.json();
      setInsights(data.text);
    } catch (e: any) {
      console.error("Erro ao gerar insights:", e);
      setError(e.message || 'Não foi possível gerar a análise. Tente novamente.');
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
