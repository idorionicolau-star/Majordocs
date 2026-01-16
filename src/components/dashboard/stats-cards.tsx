
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
                <Skeleton className="h-[100px] w-full" />
                <Skeleton className="h-[100px] w-full" />
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
      contextLabel: `dos produtos`,
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
                    <Card className="glass-card relative flex items-center justify-center gap-4 p-4 h-full text-center shadow-xl">
                        <div className="absolute inset-0 bg-background z-10 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground font-bold">
                                <Lock className="h-6 w-6"/>
                                <span>Acesso Restrito</span>
                            </div>
                        </div>
                        <stat.icon 
                            strokeWidth={2.5} 
                            className={cn(
                            "h-8 w-8 flex-shrink-0",
                            `var(--stats-icon-size, h-8 w-8)`,
                            stat.iconClass
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
                    </Card>
                </div>
            )
        }
        
        return (
            <Link href={stat.href} key={stat.title}>
                <Card className="glass-card relative flex items-center gap-4 p-4 shadow-xl transition-all duration-300 group h-full">
                    <stat.icon 
                        strokeWidth={2.5} 
                        className={cn(
                        "h-8 w-8 flex-shrink-0",
                        "transition-transform group-hover:scale-110",
                        `var(--stats-icon-size, h-8 w-8)`,
                        stat.iconClass
                        )}
                        style={{
                            height: `var(--stats-icon-size, 32px)`,
                            width: `var(--stats-icon-size, 32px)`,
                        }}
                    />
                    <div className="flex flex-col">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.title}</p>
                        <div className="flex items-end gap-2">
                            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white truncate" title={String(stat.value)}>{stat.value}</h3>
                        </div>
                    </div>
                    <div className={cn(
                        "absolute top-4 right-4 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", 
                        stat.contextClass
                    )}>
                        {stat.contextIcon && <stat.contextIcon size={12} strokeWidth={3}/>}
                        <span>{stat.contextValue}</span>
                        <span className="font-medium hidden sm:inline">{stat.contextLabel}</span>
                    </div>
                </Card>
            </Link>
        )
      })}
    </div>
  );
}
