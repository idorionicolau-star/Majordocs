
"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { useContext } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Box, ShoppingCart, Hammer, ClipboardList, Book } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { InventoryContext } from "@/context/inventory-context";
import { CatalogManager } from "@/components/settings/catalog-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesActivity } from "@/components/dashboard/sales-activity";
import { TopSales } from "@/components/dashboard/top-sales";

export default function DashboardPage() {
  const { canView, canEdit } = useContext(InventoryContext) || { canView: () => false, canEdit: () => false };
  
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
              {canEdit('inventory') && <Button asChild variant="outline">
                <Link href="/inventory?action=add"><Box className="mr-2 h-4 w-4" />+ Inventário</Link>
              </Button>}
              {canEdit('sales') && <Button asChild variant="outline">
                <Link href="/sales?action=add"><ShoppingCart className="mr-2 h-4 w-4" />+ Vendas</Link>
              </Button>}
              {canEdit('production') && <Button asChild variant="outline">
                  <Link href="/production?action=add"><Hammer className="mr-2 h-4 w-4" />+ Produção</Link>
                </Button>}
              {canEdit('orders') && <Button asChild variant="outline">
                  <Link href="/orders?action=add"><ClipboardList className="mr-2 h-4 w-4" />+ Encomenda</Link>
                </Button>}
          </div>
          <ScrollBar orientation="horizontal" className="md:hidden" />
        </ScrollArea>
      </div>

      <StatsCards />

      <TopSales />

      <SalesActivity />

      {canView('settings') && (
        <Card className="glass-card shadow-sm">
          <CardHeader className="p-6 sm:p-8">
              <CardTitle className="font-headline font-[900] tracking-tighter text-xl sm:text-2xl flex items-center gap-2"><Book /> Gestor de Catálogo</CardTitle>
              <CardDescription>
                  Gerencie os produtos, categorias e importe dados em massa.
              </CardDescription>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 pt-0">
              <CatalogManager />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
