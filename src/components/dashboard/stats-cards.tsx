
"use client";

import { useContext } from "react";
import { Card } from "@/components/ui/card";
import { Box, DollarSign, AlertTriangle, Package, ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export function StatsCards() {
    const inventoryContext = useContext(InventoryContext);
    const { products, sales, loading } = inventoryContext || { products: [], sales: [], loading: true };

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-[100px] w-full rounded-2xl" />
                <Skeleton className="h-[100px] w-full rounded-2xl" />
                <Skeleton className="h-[100px] w-full rounded-2xl" />
            </div>
        );
    }

    const totalItemsInStock = products.reduce((sum, p) => sum + p.stock, 0);
    const lowStockProducts = products.filter(p => p.stock < p.lowStockThreshold);
    const lowStockCount = lowStockProducts.length;
    const lowStockPercentage = products.length > 0 ? (lowStockCount / products.length) * 100 : 0;
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const monthlySales = sales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    });
    
    const totalSalesValue = monthlySales.reduce((sum, sale) => sum + sale.totalValue, 0);
    const totalSalesCount = monthlySales.length;

  const stats = [
    {
      title: "Produtos em Estoque",
      value: products.length,
      icon: Box,
      color: "blue",
      contextLabel: "Total de Itens",
      contextValue: totalItemsInStock,
      contextIcon: Package,
      href: "/inventory"
    },
    {
      title: "Vendas (Mês)",
      value: formatCurrency(totalSalesValue),
      icon: DollarSign,
      color: "emerald",
      contextLabel: "Nº de Vendas",
      contextValue: totalSalesCount,
      contextIcon: ShoppingCart,
      href: "/sales"
    },
    {
      title: "Estoque Baixo",
      value: lowStockCount,
      icon: AlertTriangle,
      color: "amber",
      contextLabel: `dos produtos`,
      contextValue: `${lowStockPercentage.toFixed(0)}%`,
      contextIcon: AlertTriangle,
      href: "/inventory"
    },
  ];

  const colorClasses = {
      blue: 'text-blue-500',
      emerald: 'text-emerald-500',
      amber: 'text-amber-500',
  }
  
  const contextColors = {
      blue: 'text-blue-600 bg-blue-50 dark:bg-blue-500/10',
      emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10',
      amber: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10',
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <Link href={stat.href} key={stat.title}>
            <Card className="glass-card relative flex items-center gap-4 p-4 rounded-2xl shadow-sm hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group h-full">
                <stat.icon 
                    strokeWidth={2.5} 
                    className={cn(
                    "h-8 w-8 flex-shrink-0",
                    "transition-transform group-hover:scale-110",
                    `var(--stats-icon-size, h-8 w-8)`,
                    colorClasses[stat.color as keyof typeof colorClasses]
                    )}
                    style={{
                        height: `var(--stats-icon-size, 32px)`,
                        width: `var(--stats-icon-size, 32px)`,
                    }}
                />
                <div className="flex flex-col">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.title}</p>
                    <div className="flex items-end gap-2">
                        <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
                    </div>
                </div>
                <div className={cn(
                    "absolute top-4 right-4 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", 
                    contextColors[stat.color as keyof typeof contextColors]
                )}>
                    {stat.contextIcon && <stat.contextIcon size={12} strokeWidth={3}/>}
                    <span>{stat.contextValue}</span>
                    <span className="font-medium hidden sm:inline">{stat.contextLabel}</span>
                </div>
            </Card>
        </Link>
      ))}
    </div>
  );
}
