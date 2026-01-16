
"use client";

import { useContext } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Activity } from 'lucide-react';
import type { Sale } from "@/lib/types";

export function SalesActivity() {
  const { sales, loading } = useContext(InventoryContext) || { sales: [], loading: true };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // Sort sales by date and get the most recent 5
  const recentSales = sales
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <Card className="glass-card shadow-sm">
      <CardHeader>
        <CardTitle className="font-headline font-[900] tracking-tighter text-xl sm:text-2xl flex items-center gap-2">
            <Activity />
            Atividade de Vendas
        </CardTitle>
        <CardDescription>As últimas 5 vendas registadas no sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-6 w-1/4" />
              </div>
            ))}
          </div>
        ) : recentSales.length > 0 ? (
          <div className="space-y-4">
            {recentSales.map((sale: Sale) => (
              <div key={sale.id} className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {getInitials(sale.soldBy)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{sale.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    Vendido por <span className="font-medium">{sale.soldBy}</span>
                  </p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrency(sale.totalValue)}</p>
                    <p className="text-xs text-muted-foreground">{sale.quantity} un.</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma venda registada ainda.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
