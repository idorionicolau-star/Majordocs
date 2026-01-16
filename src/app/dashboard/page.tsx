
"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { useContext } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Box, ShoppingCart, Hammer, ClipboardList } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { InventoryContext } from "@/context/inventory-context";
import { TopSales } from "@/components/dashboard/top-sales";
import { SalesActivity } from "@/components/dashboard/sales-activity";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const StockChart = dynamic(() => import("@/components/dashboard/stock-chart").then(mod => mod.StockChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />,
});

const MonthlySalesChart = dynamic(() => import("@/components/dashboard/monthly-sales-chart").then(mod => mod.MonthlySalesChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />,
});


export default function DashboardPage() {
  const { canEdit } = useContext(InventoryContext) || { canEdit: () => false };
  
  return (
    <div className="flex flex-col gap-4 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-headline font-[900] text-slate-900 dark:text-white tracking-tighter">Dashboard</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
             Uma visão geral e rápida do seu negócio.
           </p>
        </div>
        <ScrollArea 
          className="w-full md:w-auto pb-4"
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
        >
          <div className={cn("flex items-center gap-2 flex-nowrap", "animate-peek md:animate-none")}>
              {canEdit('inventory') && <Button asChild variant="outline">
                <Link href="/inventory?action=add"><Box className="mr-2 h-4 w-4 text-[hsl(var(--chart-1))]" />+ Inventário</Link>
              </Button>}
              {canEdit('sales') && <Button asChild variant="outline">
                <Link href="/sales?action=add"><ShoppingCart className="mr-2 h-4 w-4 text-[hsl(var(--chart-2))]" />+ Vendas</Link>
              </Button>}
              {canEdit('production') && <Button asChild variant="outline">
                  <Link href="/production?action=add"><Hammer className="mr-2 h-4 w-4 text-[hsl(var(--chart-3))]" />+ Produção</Link>
                </Button>}
              {canEdit('orders') && <Button asChild variant="outline">
                  <Link href="/orders?action=add"><ClipboardList className="mr-2 h-4 w-4 text-[hsl(var(--chart-4))]" />+ Encomenda</Link>
                </Button>}
          </div>
          <ScrollBar orientation="horizontal" className="md:hidden" />
        </ScrollArea>
      </div>

      <StatsCards />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlySalesChart />
        <StockChart />
      </div>

      <TopSales />

      <SalesActivity />
      
    </div>
  );
}
