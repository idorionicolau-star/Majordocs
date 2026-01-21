
"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { useContext } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Box, ShoppingCart, Hammer, Book, Lock, BookOpen, PlusCircle } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { InventoryContext } from "@/context/inventory-context";
import { TopSales } from "@/components/dashboard/top-sales";
import { SalesActivity } from "@/components/dashboard/sales-activity";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LeastSoldProducts } from "@/components/dashboard/least-sold-products";
import { AIAssistant } from "@/components/dashboard/ai-assistant";
import { useSearchParams } from "next/navigation";

const StockChart = dynamic(() => import("@/components/dashboard/stock-chart").then(mod => mod.StockChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />,
});


export default function DashboardPage() {
  const { user, companyData, catalogProducts, loading } = useContext(InventoryContext) || { user: null, companyData: null, catalogProducts: [], loading: true };
  const searchParams = useSearchParams();
  const aiQuery = searchParams.get('ai_query');
  
  const isPrivilegedUser = user?.role === 'Admin' || user?.role === 'Dono';
  const isManufacturer = companyData?.businessType === 'manufacturer';
  
  const isCatalogEmpty = !catalogProducts || catalogProducts.length === 0;
  
  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">

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

      {/* Main content: single column on mobile, multi-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (or full width on mobile) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
           {isPrivilegedUser && <StatsCards />}

            {/* Quick Access */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Atalhos</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Button asChild variant="outline" className="h-24 flex-col gap-2 text-center font-semibold">
                      <Link href="/settings#catalog">
                          <Book className="h-6 w-6" />
                          <span>Catálogo</span>
                      </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-24 flex-col gap-2 text-center font-semibold">
                      <Link href="/sales">
                          <ShoppingCart className="h-6 w-6" />
                          <span>Vendas</span>
                      </Link>
                  </Button>
                  {isManufacturer && (
                    <Button asChild variant="outline" className="h-24 flex-col gap-2 text-center font-semibold">
                        <Link href="/production">
                            <Hammer className="h-6 w-6" />
                            <span>Produção</span>
                        </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" className="h-24 flex-col gap-2 text-center font-semibold">
                      <Link href="/inventory">
                          <Box className="h-6 w-6" />
                          <span>Inventário</span>
                      </Link>
                  </Button>
              </div>
            </div>

           {isPrivilegedUser ? (
             <>
              <AIAssistant initialQuery={aiQuery || undefined} />
              <SalesActivity />
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

        {/* Right Column (or below on mobile) */}
        <div className="flex flex-col gap-6">
          <StockChart />
          {isPrivilegedUser && <TopSales />}
          {isPrivilegedUser && <LeastSoldProducts />}
        </div>

      </div>
    </div>
  );
}
