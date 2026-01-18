
"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { useContext } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Box, ShoppingCart, Hammer, Book } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { InventoryContext } from "@/context/inventory-context";
import { TopSales } from "@/components/dashboard/top-sales";
import { SalesActivity } from "@/components/dashboard/sales-activity";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { LeastSoldProducts } from "@/components/dashboard/least-sold-products";
import { AIAssistant } from "@/components/dashboard/ai-assistant";

const StockChart = dynamic(() => import("@/components/dashboard/stock-chart").then(mod => mod.StockChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />,
});


export default function DashboardPage() {
  const { user, companyData } = useContext(InventoryContext) || { user: null, companyData: null };
  const isPrivilegedUser = user?.role === 'Admin' || user?.role === 'Dono';
  const isManufacturer = companyData?.businessType === 'manufacturer';
  
  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">

      {/* Main content: single column on mobile, multi-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (or full width on mobile) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
           {isPrivilegedUser && <StatsCards />}

            {/* Quick Access Buttons */}
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

           {isPrivilegedUser ? (
             <>
              <AIAssistant />
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
