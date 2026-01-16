'use client';

import { useState, useContext } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import { analyzeBusinessData, type AnalysisInput } from '@/ai/flows/analyze-data-flow';
import { useToast } from '@/hooks/use-toast';
import { InventoryContext } from '@/context/inventory-context';
import { Skeleton } from '../ui/skeleton';

export function AIReport() {
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<{ headline: string; positiveObservation: string; criticalObservation: string; suggestion: string } | null>(null);
  const { toast } = useToast();
  const inventoryContext = useContext(InventoryContext);

  const handleAnalysis = async () => {
    if (!inventoryContext) return;

    const { monthlySalesChartData, dashboardStats, products } = inventoryContext;
    
    // Prepare input for the AI flow
    const analysisInput: AnalysisInput = {
      monthlySales: monthlySalesChartData,
      topSellingProduct: {
          name: dashboardStats.topSellingProduct.name,
          quantity: dashboardStats.topSellingProduct.quantity,
      },
      highestInventoryProduct: {
          name: dashboardStats.highestInventoryProduct.name,
          stock: dashboardStats.highestInventoryProduct.stock,
      },
      totalProducts: products.length,
      totalStockItems: products.reduce((sum, p) => sum + p.stock, 0),
      lowStockCount: products.filter(p => p.stock < p.lowStockThreshold).length,
    };

    setIsLoading(true);
    setReport(null);
    try {
      const result = await analyzeBusinessData(analysisInput);
      setReport(result);
    } catch (error) {
      console.error('AI Analysis Error:', error);
      toast({
        variant: 'destructive',
        title: 'Erro na Análise',
        description: 'Não foi possível gerar o relatório. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="glass-card shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="text-primary" />
          Análise Inteligente
        </CardTitle>
        <CardDescription>
          Clique no botão para receber insights sobre a performance do seu negócio, gerados por IA.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : report ? (
          <div className="space-y-4 text-sm">
            <h3 className="text-base font-bold text-foreground">{report.headline}</h3>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <p>{report.positiveObservation}</p>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p>{report.criticalObservation}</p>
            </div>
            <div className="flex items-start gap-3 p-3 bg-accent rounded-lg">
                <Activity className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="font-semibold">{report.suggestion}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">O seu relatório aparecerá aqui.</p>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleAnalysis} disabled={isLoading} className="w-full">
          {isLoading ? 'A analisar...' : 'Gerar Relatório IA'}
        </Button>
      </CardFooter>
    </Card>
  );
}
