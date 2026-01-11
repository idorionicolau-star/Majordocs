
"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { AddProductDialog } from "@/components/inventory/add-product-dialog";
import { AddSaleDialog } from "@/components/sales/add-sale-dialog";
import { AddProductionDialog } from "@/components/production/add-production-dialog";
import { products, sales, productions, orders as initialOrders } from "@/lib/data";
import { useState, useContext } from "react";
import type { Product, Sale, Production, Location, Order } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { AddOrderDialog } from "@/components/orders/add-order-dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Box, ShoppingCart, Hammer, ClipboardList, Book } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogManager } from "@/components/settings/catalog-manager";
import { InventoryContext } from "@/context/inventory-context";

// Dynamically import the StockChart component with SSR turned off
const StockChart = dynamic(() => import("@/components/dashboard/stock-chart").then(mod => mod.StockChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[438px] w-full" />,
});

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useContext(InventoryContext) || {};
  const isAdmin = user?.role === 'Admin';

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-headline font-[900] text-slate-900 dark:text-white tracking-tighter">Dashboard</h1>
        </div>
        <ScrollArea 
          className="w-full md:w-auto pb-4"
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
        >
          <div className={cn("flex items-center gap-2 flex-nowrap", "animate-peek md:animate-none")}>
              {isAdmin && <Button asChild variant="outline">
                <Link href="/inventory"><Box className="mr-2 h-4 w-4" />+ Inventário</Link>
              </Button>}
              <Button asChild variant="outline">
                <Link href="/sales"><ShoppingCart className="mr-2 h-4 w-4" />+ Vendas</Link>
              </Button>
              {isAdmin && <>
                <Button asChild variant="outline">
                  <Link href="/production"><Hammer className="mr-2 h-4 w-4" />+ Produção</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/orders"><ClipboardList className="mr-2 h-4 w-4" />+ Encomenda</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/settings#catalog"><Book className="mr-2 h-4 w-4" />Catálogo</Link>
                </Button>
              </>}
          </div>
          <ScrollBar orientation="horizontal" className="md:hidden" />
        </ScrollArea>
      </div>
      <StatsCards />
      <div className="grid grid-cols-1 gap-6">
        <StockChart />
      </div>
    </div>
  );
}

    