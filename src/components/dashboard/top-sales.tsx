
"use client";

import { useState, useMemo, useContext } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InventoryContext } from "@/context/inventory-context";
import { subDays, startOfMonth, startOfToday, startOfYear } from 'date-fns';
import { Trophy } from 'lucide-react';
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";
import type { Sale } from "@/lib/types";

type Period = '7d' | '30d' | 'month' | 'year';

export function TopSales() {
  const { sales, loading } = useContext(InventoryContext) || { sales: [], loading: true };
  const [period, setPeriod] = useState<Period>('7d');

  const topProducts = useMemo(() => {
    if (!sales) return [];

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        break;
      default:
        startDate = subDays(now, 7);
    }
    
    // Ensure we compare from the beginning of the start day
    const startOfFilterDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

    const filteredSales = sales.filter(sale => new Date(sale.date) >= startOfFilterDay);

    const productStats = filteredSales.reduce((acc, sale) => {
      if (!acc[sale.productName]) {
        acc[sale.productName] = { quantity: 0, totalValue: 0 };
      }
      acc[sale.productName].quantity += sale.quantity;
      acc[sale.productName].totalValue += sale.totalValue;
      return acc;
    }, {} as Record<string, { quantity: number; totalValue: number }>);

    return Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.quantity - a.quantity) // Sort by quantity sold
      .slice(0, 3); // Get top 3

  }, [sales, period]);

  return (
    <Card className="glass-card shadow-sm">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle className="font-headline font-[900] tracking-tighter text-xl sm:text-2xl flex items-center gap-2">
            <Trophy />
            Top 3 Produtos Mais Vendidos
          </CardTitle>
          <CardDescription>
            Os campeões de vendas no período selecionado.
          </CardDescription>
        </div>
        <Select value={period} onValueChange={(value: Period) => setPeriod(value)}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="year">Este Ano</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-muted/50 space-y-2">
                  <Skeleton className="h-8 w-8 rounded-full mx-auto" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-6 w-3/4 mx-auto" />
                  <Skeleton className="h-4 w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : topProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex flex-col items-center justify-center p-4 rounded-xl bg-muted/50 text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background font-bold text-primary mb-2">
                  {index + 1}
                </div>
                <p className="text-sm font-semibold truncate w-full" title={product.name}>{product.name}</p>
                <p className="text-lg font-bold">{product.quantity} <span className="text-xs text-muted-foreground">un.</span></p>
                <p className="text-xs text-muted-foreground">{formatCurrency(product.totalValue)}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma venda encontrada para este período.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
