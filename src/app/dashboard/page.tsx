"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { useContext, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Box, ShoppingCart, Hammer, Book, Lock, BookOpen, PlusCircle, PartyPopper } from "lucide-react";
import { InventoryContext } from "@/context/inventory-context";
import { TopSales } from "@/components/dashboard/top-sales";
import { MonthlySalesChart } from "@/components/dashboard/monthly-sales-chart";
import { StockAlerts } from "@/components/dashboard/stock-alerts";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LeastSoldProducts } from "@/components/dashboard/least-sold-products";
import { AIAssistant } from "@/components/dashboard/ai-assistant";
import { useSearchParams } from "next/navigation";
import { AISummary } from "@/components/dashboard/ai-summary";
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


export default function DashboardPage() {
  const { user, companyData, catalogProducts, loading, businessStartDate, sales } = useContext(InventoryContext) || { user: null, companyData: null, catalogProducts: [], loading: true, businessStartDate: null, sales: [] };
  const searchParams = useSearchParams();
  const aiQuery = searchParams.get('ai_query');
  
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

      {daysInOperation !== null && daysInOperation >= 30 && <MaturityCelebration />}

      {isCatalogEmpty && !loading && (
        <Card className="bg-primary/5 dark:bg-primary/10 border-primary/20">
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

      {/* Main content */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Main Column */}
        <div className="flex flex-col gap-6">
           {isPrivilegedUser && <AISummary />}
           {isPrivilegedUser && <StatsCards />}

            {/* Quick Access */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg text-center">Atalhos</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button asChild variant="outline" className="h-24 flex-col gap-2 text-center font-semibold">
                      <Link href="/inventory?action=add">
                          <PlusCircle className="h-5 w-5" />
                          <span>Adicionar Produto</span>
                      </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-24 flex-col gap-2 text-center font-semibold">
                      <Link href="/sales?action=add">
                          <ShoppingCart className="h-5 w-5" />
                          <span>Registar Venda</span>
                      </Link>
                  </Button>
                  {isManufacturer && (
                    <Button asChild variant="outline" className="h-24 flex-col gap-2 text-center font-semibold">
                        <Link href="/production?action=add">
                            <Hammer className="h-5 w-5" />
                            <span>Nova Produção</span>
                        </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="h-24 flex-col gap-2 text-center font-semibold">
                      <Link href="/settings#catalog">
                          <Book className="h-5 w-5" />
                          <span>Gerir Catálogo</span>
                      </Link>
                  </Button>
              </div>
            </div>

            {isPrivilegedUser && <TopSales />}

           {isPrivilegedUser ? (
             <>
              <AIAssistant initialQuery={aiQuery || undefined} />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <StockAlerts />
                <MonthlySalesChart />
              </div>
              {isPrivilegedUser && <LeastSoldProducts />}
             </>
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
                    As estatísticas e a atividade de vendas estão disponíveis apenas para Administradores e Donos. Use os atalhos acima para navegar.
                  </p>
                </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
