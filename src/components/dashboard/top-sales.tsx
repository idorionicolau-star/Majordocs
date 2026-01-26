
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


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
    
    const totalRevenue = Object.values(productStats).reduce((sum, { totalValue }) => sum + totalValue, 0);

    const allProducts = Object.entries(productStats)
      .map(([name, stats]) => ({
        name,
        ...stats,
        percentage: totalRevenue > 0 ? (stats.totalValue / totalRevenue) * 100 : 0,
      }));
      
    if (sortBy === 'revenue') {
        allProducts.sort((a, b) => b.totalValue - a.totalValue);
    } else { // 'quantity'
        allProducts.sort((a, b) => b.quantity - a.quantity);
    }

    return allProducts.slice(0, 5);

  }, [sales, sortBy]);

  return (
    <Card className="bg-[#0f172a]/40 border-white/5 lg:col-span-1 shadow-[0_0_15px_rgba(56,189,248,0.1)]">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
                <CardTitle className="flex items-center gap-2 text-slate-300">
                    <Trophy className="text-sky-400" strokeWidth={1.5} />
                    Líderes de Vendas
                </CardTitle>
                <CardDescription className="text-slate-500 mt-1">
                    Top 5 produtos por {sortBy === 'revenue' ? 'faturamento' : 'volume'}.
                </CardDescription>
            </div>
             <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'revenue' | 'quantity')}>
                <SelectTrigger className="w-full sm:w-[150px] bg-slate-800/50 border-slate-700 h-9">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="revenue">Faturamento</SelectItem>
                    <SelectItem value="quantity">Volume</SelectItem>
                </SelectContent>
            </Select>
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
                                {sortBy === 'revenue' 
                                    ? formatCurrency(product.totalValue)
                                    : `${product.quantity} ${product.unit}`
                                }
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
