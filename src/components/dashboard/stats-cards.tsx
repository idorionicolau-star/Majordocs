
"use client";

import { useContext } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, TrendingUp, Archive, Hash } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
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
          href: "/sales",
        },
        {
          title: "Ticket Médio",
          value: formatCurrency(dashboardStats.averageTicket),
          icon: TrendingUp,
          href: "/reports",
        },
        {
          title: "Valor do Inventário",
          value: formatCurrency(dashboardStats.totalInventoryValue),
          icon: Archive,
          href: "/inventory",
        },
        {
          title: "Itens em Estoque",
          value: dashboardStats.totalItemsInStock.toLocaleString('pt-BR'),
          icon: Hash,
          href: "/inventory",
        },
      ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
          <Link href={stat.href} key={stat.title} className="group">
            <Card className="transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold">{stat.title}</CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
            </Card>
          </Link>
      ))}
    </div>
  );
}
