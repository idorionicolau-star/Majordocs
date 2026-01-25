
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
import { Progress } from "../ui/progress";
import { cn } from "@/lib/utils";

export function TopSales() {
  const { sales, loading } = useContext(InventoryContext) || { sales: [], loading: true };

  const topProducts = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    const productStats = sales.reduce((acc, sale) => {
      const value = sale.amountPaid ?? sale.totalValue;
      if (!acc[sale.productName]) {
        acc[sale.productName] = { quantity: 0, totalValue: 0 };
      }
      acc[sale.productName].quantity += sale.quantity;
      acc[sale.productName].totalValue += value;
      return acc;
    }, {} as Record<string, { quantity: number; totalValue: number }>);
    
    const totalRevenue = Object.values(productStats).reduce((sum, { totalValue }) => sum + totalValue, 0);

    return Object.entries(productStats)
      .map(([name, stats]) => ({
        name,
        ...stats,
        percentage: totalRevenue > 0 ? (stats.totalValue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue) // Sort by financial volume
      .slice(0, 5); // Get top 5

  }, [sales]);

  return (
    <Card className="bg-[#0f172a]/40 border-white/5 lg:col-span-1 shadow-[0_0_15px_rgba(56,189,248,0.1)]">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-300">
                <Trophy className="text-sky-400" strokeWidth={1.5} />
                Líderes de Vendas
            </CardTitle>
            <CardDescription className="text-slate-500">
                Top 5 produtos por faturamento.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            {loading ? (
                 <div className="space-y-4">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            ) : topProducts.length > 0 ? (
                topProducts.map((product) => (
                    <div key={product.name}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-slate-300 truncate" title={product.name}>
                                {product.name}
                            </span>
                            <span className="text-sm font-bold text-sky-400">
                                {formatCurrency(product.totalValue)}
                            </span>
                        </div>
                        <Progress value={product.percentage} className="h-2 bg-slate-700/50 [&>div]:bg-sky-400" />
                    </div>
                ))
            ) : (
                <div className="text-center py-8 text-slate-500">
                    <p>Nenhuma venda registada ainda.</p>
                </div>
            )}
        </CardContent>
    </Card>
  );
}
