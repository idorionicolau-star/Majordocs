
"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { useContext, useState, useEffect, Suspense, useCallback } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Book, BookOpen, Hammer, Lock, PartyPopper, PlusCircle, ShoppingCart, Sparkles, Command } from "lucide-react";
import { InventoryContext } from "@/context/inventory-context";
import { TopSales } from "@/components/dashboard/top-sales";
import { MonthlySalesChart } from "@/components/dashboard/monthly-sales-chart";
import { StockAlerts } from "@/components/dashboard/stock-alerts";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LeastSoldProducts } from "@/components/dashboard/least-sold-products";
import Confetti from 'react-confetti';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { differenceInDays } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Helper hook to get window dimensions for the confetti effect
const useWindowDimensions = () => {
  const [windowSize, setWindowSize] = useState<{width: number | undefined, height: number | undefined}>({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }
    
    window.addEventListener("resize", handleResize);
    handleResize();
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return windowSize;
}

// Celebration component for when user unlocks full AI capabilities
const MaturityCelebration = () => {
  const { width, height } = useWindowDimensions();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
      const hasCelebrated = localStorage.getItem('majorstockx-maturity-celebrated');
      if (!hasCelebrated) {
          setIsOpen(true);
          localStorage.setItem('majorstockx-maturity-celebrated', 'true');
      }
  }, []);

  if (!width || !height || !isOpen) {
    return null;
  }

  return (
    <>
      <Confetti
        width={width}
        height={height}
        recycle={false}
        numberOfPieces={400}
        gravity={0.1}
      />
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader className="items-center text-center">
            <PartyPopper className="h-16 w-16 text-primary animate-bounce" />
            <AlertDialogTitle className="text-2xl mt-4">Parabéns! Desbloqueou o Modo Consultor de Elite!</AlertDialogTitle>
            <AlertDialogDescription>
              Com mais de 30 dias de dados, a sua IA agora tem poder total para fornecer insights estratégicos e previsões. Explore o seu dashboard para ver a diferença!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsOpen(false)}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

const TacticalSummary = () => {
  const text = `Saudações à Diretoria. Sou o MajorAssistant, o seu Consultor Sênior de BI no MajorStockX. Com base nos dados extraídos em tempo real da aplicação, apresento o Relatório de Operações Estratégico detalhando o estado atual do negócio.

**1. Resumo Executivo de Desempenho**

O negócio apresenta uma estrutura de ativos sólida, mas com pontos de calibração necessários na rotatividade de stock e na conversão de vendas.
- **Vendas Mensais:** <span class="text-primary font-bold">165.489,00 MT</span>
- **Ticket Médio:** <span class="text-primary font-bold">6.619,56 MT</span>
- **Valor Total em Inventário:** <span class="text-chart-3 font-bold">3.641.067,00 MT</span>
- **Volume de Itens em Stock:** 11.058,32 unidades/m²

**2. Análise de Vendas e Rentabilidade**

Observamos um fluxo recente concentrado em produtos de infraestrutura e acabamento. As vendas de maior impacto nos últimos dias incluem:
- **Grelha 4 furos simples 20x20:** Gerou 13.000,00 MT (130 unidades).
- **Pavê osso de cão branco:** Gerou 12.474,00 MT (19,8 m²).
- **Lancil de barra:** Duas movimentações recentes totalizando 9.800,00 MT.
- A performance de vendas está fortemente associada ao operador Adozinda Novela.

**3. Integridade e Calibração de Stock**

O rácio entre o Valor de Inventário (3,6M) e as Vendas Mensais (165k) sugere capital imobilizado. É crucial monitorizar os itens que atingiram níveis críticos:
- <span class="text-chart-4">**Pé de jardim:**</span> Stock atual de 16, abaixo do nível crítico de 30. **Ação Urgente Necessária.**
- <span class="text-chart-3">**Painel 3d Wave:**</span> Stock de 34, abaixo do alerta de 50.
- **Passadeira pedra de praia 50x60:** Stock de 27 (Saudável, mas requer atenção).

**4. Recomendações Estratégicas**

- **Liquidez:** Criar campanhas para produtos com alto stock para libertar o capital imobilizado.
- **Reposição:** Iniciar imediatamente a produção de "Pé de jardim" e "Painel 3d Wave".
- **Ticket Médio:** Explorar pacotes combinados de "Lancil" e "Pavê".`;

  return (
    <Card className="glass-card lg:col-span-3 shadow-neon-cyan">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="text-primary" />
          BI Brain: Relatório de Operações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-slate-950/70 p-4 rounded-lg font-mono text-sm border border-slate-800 text-slate-300">
           <ReactMarkdown
              className="prose prose-sm prose-invert max-w-none prose-p:text-slate-300 prose-strong:text-primary"
              components={{
                 p: ({node, ...props}) => <p {...props} className="mb-2" />,
                 strong: ({node, ...props}) => <strong {...props} className="text-primary" />,
                 ul: ({node, ...props}) => <ul {...props} className="list-none p-0" />,
                 li: ({node, ...props}) => <li {...props} className="pl-4 -indent-4 before:content-['>_'] before:mr-2" />,
                 span: ({node, ...props}) => <span {...props} />,
              }}
              remarkPlugins={[remarkGfm]}
           >
              {text.replace(/<span class="[^"]*">/g, "**").replace(/<\/span>/g, "**")}
           </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { user, companyData, catalogProducts, loading, businessStartDate, sales } = useContext(InventoryContext) || { user: null, companyData: null, catalogProducts: [], loading: true, businessStartDate: null, sales: [] };
  
  const [daysInOperation, setDaysInOperation] = useState<number | null>(null);

  useEffect(() => {
    if (businessStartDate && sales && sales.length > 0) {
      setDaysInOperation(differenceInDays(new Date(), businessStartDate));
    }
  }, [businessStartDate, sales]);

  const isPrivilegedUser = user?.role === 'Admin' || user?.role === 'Dono';
  const isManufacturer = companyData?.businessType === 'manufacturer';
  const isCatalogEmpty = !catalogProducts || catalogProducts.length === 0;
  
  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      {isPrivilegedUser && <TacticalSummary />}

      {daysInOperation !== null && daysInOperation >= 30 && <MaturityCelebration />}

      {isCatalogEmpty && !loading && (
        <Card className="bg-primary/5 dark:bg-primary/10 border-primary/20 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Bem-vindo ao MajorStockX!
            </CardTitle>
            <CardDescription>
              O seu catálogo de produtos está vazio. Para começar, adicione os seus produtos base.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              O catálogo funciona como uma lista mestre de todos os produtos que a sua empresa vende ou fabrica. Uma vez adicionados ao catálogo, pode facilmente adicioná-los ao seu inventário.
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild className="animate-shake">
              <Link href="/settings#catalog">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Produtos ao Catálogo
              </Link>
            </Button>
          </CardFooter>
        </Card>
      )}

      {isPrivilegedUser ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3">
            <StatsCards />
          </div>
          <div className="lg:col-span-2">
             <TopSales />
          </div>
          <div className="lg:col-span-1">
            <StockAlerts />
          </div>
           <div className="lg:col-span-2">
            <MonthlySalesChart />
          </div>
           <div className="lg:col-span-1">
             <LeastSoldProducts />
          </div>
        </div>
      ) : (
         <Card className="glass-card shadow-sm h-full flex flex-col justify-center">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground">
                <Lock className="h-5 w-5" />
                Acesso Restrito
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                As estatísticas e a atividade de vendas estão disponíveis apenas para Administradores e Donos.
              </p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
