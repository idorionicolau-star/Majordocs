
"use client";

import { useState, useMemo, useContext } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InventoryContext } from "@/context/inventory-context";
import { Trophy } from 'lucide-react';
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";


export function TopSales() {
  const { sales, loading } = useContext(InventoryContext) || { sales: [], loading: true };
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity'>('revenue');

  const topProducts = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    const productStats = sales.reduce((acc, sale) => {
      const value = sale.amountPaid ?? sale.totalValue;
      if (!acc[sale.productName]) {
        acc[sale.productName] = { quantity: 0, totalValue: 0, unit: sale.unit || 'un.' };
      }
      acc[sale.productName].quantity += sale.quantity;
      acc[sale.productName].totalValue += value;
      return acc;
    }, {} as Record<string, { quantity: number; totalValue: number; unit: string; }>);

    const totalValue = Object.values(productStats).reduce((sum, { totalValue }) => sum + totalValue, 0);

    const allProducts = Object.entries(productStats)
      .map(([name, stats]) => ({
        name,
        ...stats,
        percentage: totalValue > 0 ? (stats.totalValue / totalValue) * 100 : 0,
      }));

    if (sortBy === 'revenue') {
      allProducts.sort((a, b) => b.totalValue - a.totalValue);
    } else { // 'quantity'
      allProducts.sort((a, b) => b.quantity - a.quantity);
    }

    return allProducts.slice(0, 5);

  }, [sales, sortBy]);

  const barColors = ["bg-cyan-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-emerald-500"];

  return (
    <Card className="glass-panel border-slate-200/50 dark:border-slate-800/50 shadow-none lg:col-span-1 h-full">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-foreground font-medium tracking-wide">
            Líderes de Vendas
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-1">
            Top 5 produtos por {sortBy === 'revenue' ? 'faturamento' : 'volume'}.
          </CardDescription>
        </div>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'revenue' | 'quantity')}>
          <SelectTrigger className="w-full sm:w-[130px] bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-foreground h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-foreground">
            <SelectItem value="revenue">Faturamento</SelectItem>
            <SelectItem value="quantity">Volume</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full bg-slate-800" />)}
          </div>
        ) : topProducts.length > 0 ? (
          topProducts.map((product, index) => (
            <div key={product.name} className="group">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-medium text-muted-foreground truncate" title={product.name}>
                  {product.name}
                </span>
                <span className="text-sm font-bold text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                  {sortBy === 'revenue'
                    ? formatCurrency(product.totalValue)
                    : `${product.quantity} ${product.unit}`
                  }
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor]", barColors[index % barColors.length])}
                  style={{ width: `${Math.max(5, product.percentage)}%` }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma venda registada ainda.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
