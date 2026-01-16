
"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { useContext } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Box, ShoppingCart, Hammer, ClipboardList, Book, ChevronDown } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { InventoryContext } from "@/context/inventory-context";
import { CatalogManager } from "@/components/settings/catalog-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesActivity } from "@/components/dashboard/sales-activity";
import { TopSales } from "@/components/dashboard/top-sales";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
        <Accordion type="single" collapsible className="w-full" defaultValue="catalog-manager">
          <AccordionItem value="catalog-manager" className="border-0">
            <Card className="glass-card shadow-xl overflow-hidden">
              <AccordionTrigger className="w-full p-0 hover:no-underline">
                <CardHeader className="p-6 sm:p-8 flex-row items-center justify-between w-full">
                  <div className="text-left">
                    <CardTitle className="font-headline font-[900] tracking-tighter text-xl sm:text-2xl flex items-center gap-2">
                      <Book /> Gestor de Catálogo
                    </CardTitle>
                    <CardDescription>
                      Expanda para gerir produtos, categorias e importação de dados.
                    </CardDescription>
                  </div>
                  <ChevronDown className="h-5 w-5 shrink-0 transition-transform duration-200" />
                </CardHeader>
              </AccordionTrigger>
              <AccordionContent>
                <CardContent className="p-6 sm:p-8 pt-0">
                  <CatalogManager />
                </CardContent>
              </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
