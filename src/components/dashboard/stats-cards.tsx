
"use client";

import { useContext } from "react";
import { Card } from "@/components/ui/card";
import { DollarSign, AlertTriangle, ShoppingCart, Lock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export function StatsCards() {
    const inventoryContext = useContext(InventoryContext);
    const { products, sales, loading, user } = inventoryContext || { products: [], sales: [], loading: true, user: null };

    const isAuthorized = user?.role === 'Admin' || user?.role === 'Dono';

    if (loading) {
        return (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
        );
    }

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
      title: "Vendas (Mês)",
      value: formatCurrency(totalSalesValue),
      icon: DollarSign,
      iconClass: "text-[hsl(var(--chart-2))]",
      contextClass: "text-[hsl(var(--chart-2))] bg-[hsl(var(--chart-2))]/10",
      contextLabel: "Nº de Vendas",
      contextValue: totalSalesCount,
      contextIcon: ShoppingCart,
      href: "/sales",
      restricted: true,
    },
    {
      title: "Estoque Baixo",
      value: lowStockCount,
      icon: AlertTriangle,
      iconClass: "text-[hsl(var(--chart-4))]",
      contextClass: "text-[hsl(var(--chart-4))] bg-[hsl(var(--chart-4))]/10",
      contextLabel: `% dos produtos`,
      contextValue: `${lowStockPercentage.toFixed(0)}%`,
      contextIcon: AlertTriangle,
      href: "/inventory"
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      {stats.map((stat) => {
        if (stat.restricted && !isAuthorized) {
             return (
                 <div key={stat.title}>
                    <Card className="glass-card relative flex flex-col p-4 shadow-sm h-28 text-center">
                        <div className="absolute inset-0 bg-background z-10 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground font-bold">
                                <Lock className="h-6 w-6"/>
                                <span>Acesso Restrito</span>
                            </div>
                        </div>
                        <div className="flex-grow flex items-center justify-center">
                            <h3 className="font-body text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
                        </div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.title}</p>
                    </Card>
                </div>
            )
        }
        
        return (
            <Link href={stat.href} key={stat.title}>
                <Card className="glass-card flex flex-col p-4 shadow-sm transition-all duration-300 group h-28 text-center">
                    <div className="flex justify-center">
                        <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", stat.contextClass)}>
                            {stat.contextIcon && <stat.contextIcon size={12} strokeWidth={3}/>}
                            <span>{stat.contextValue}</span>
                            <span className="font-medium hidden sm:inline">{stat.contextLabel}</span>
                        </div>
                    </div>
                    <div className="flex-grow flex items-center justify-center">
                        <h3 className="font-body text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white truncate" title={String(stat.value)}>{stat.value}</h3>
                    </div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.title}</p>
                </Card>
            </Link>
        )
      })}
    </div>
  );
}
