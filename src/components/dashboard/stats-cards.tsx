
"use client";

import { useContext } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Archive, Hash } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function StatsCards() {
    const { dashboardStats, loading } = useContext(InventoryContext) || { 
      dashboardStats: {
        monthlySalesValue: 0,
        averageTicket: 0,
        totalInventoryValue: 0,
        totalItemsInStock: 0,
      },
      loading: true 
    };

    if (loading) {
        return (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
        );
    }
    
    const stats = [
        {
          title: "Vendas (Mês)",
          value: formatCurrency(dashboardStats.monthlySalesValue),
          icon: DollarSign,
          color: "text-chart-1",
        },
        {
          title: "Ticket Médio",
          value: formatCurrency(dashboardStats.averageTicket),
          icon: TrendingUp,
          color: "text-chart-2",
        },
        {
          title: "Valor do Inventário",
          value: formatCurrency(dashboardStats.totalInventoryValue),
          icon: Archive,
          color: "text-chart-3",
        },
        {
          title: "Itens em Estoque",
          value: dashboardStats.totalItemsInStock.toLocaleString('pt-BR'),
          icon: Hash,
          color: "text-chart-4",
        },
      ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
          <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                  <div className={cn("text-2xl font-bold", stat.color)}>{stat.value}</div>
              </CardContent>
          </Card>
      ))}
    </div>
  );
}
