
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
import { Trophy, Calendar as CalendarIcon } from 'lucide-react';
import { formatCurrency, cn } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  isToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  isWithinInterval, parseISO, startOfDay, endOfDay
} from 'date-fns';
import { pt } from 'date-fns/locale';

type Period = 'daily' | 'weekly' | 'monthly' | 'custom';

export function TopSales() {
  const { sales, loading } = useContext(InventoryContext) || { sales: [], loading: true };
  const [sortBy, setSortBy] = useState<'revenue' | 'quantity'>('revenue');
  const [period, setPeriod] = useState<Period>('monthly');
  const [customStart, setCustomStart] = useState<Date | undefined>(new Date());
  const [customEnd, setCustomEnd] = useState<Date | undefined>(new Date());

  const topProducts = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    const now = new Date();
    let filteredSales = sales;

    // Filter by period
    if (period === 'daily') {
      filteredSales = sales.filter(s => isToday(parseISO(s.date)));
    } else if (period === 'weekly') {
      const start = startOfWeek(now, { locale: pt });
      const end = endOfWeek(now, { locale: pt });
      filteredSales = sales.filter(s => isWithinInterval(parseISO(s.date), { start, end }));
    } else if (period === 'monthly') {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      filteredSales = sales.filter(s => isWithinInterval(parseISO(s.date), { start, end }));
    } else if (period === 'custom' && customStart && customEnd) {
      const start = startOfDay(customStart);
      const end = endOfDay(customEnd);
      filteredSales = sales.filter(s => isWithinInterval(parseISO(s.date), { start, end }));
    }

    const productStats = filteredSales.reduce((acc, sale) => {
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

  }, [sales, sortBy, period, customStart, customEnd]);

  const barColors = ["bg-cyan-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-emerald-500"];

  return (
    <Card className="glass-panel border-slate-200/50 dark:border-slate-800/50 shadow-none lg:col-span-1 h-full flex flex-col">
      <CardHeader className="flex flex-col gap-3 pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground font-medium tracking-wide">
              Líderes de Vendas
            </CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Top 5 por {sortBy === 'revenue' ? 'faturamento' : 'volume'}.
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
        </div>

        <div className="flex flex-col gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <SelectTrigger className="w-full bg-white/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 text-foreground h-8 text-xs">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-3 w-3" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-foreground">
              <SelectItem value="daily">Diário (Hoje)</SelectItem>
              <SelectItem value="weekly">Semanal (Esta Semana)</SelectItem>
              <SelectItem value="monthly">Mensal (Este Mês)</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {period === 'custom' && (
            <div className="flex items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-300">
              <DatePicker date={customStart} setDate={setCustomStart} />
              <span className="text-muted-foreground">-</span>
              <DatePicker date={customEnd} setDate={setCustomEnd} />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-2 flex-grow">
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
          <div className="text-center py-8 text-muted-foreground flex flex-col items-center justify-center h-full">
            <Trophy className="h-8 w-8 mb-2 opacity-20" />
            <p>Sem vendas neste período.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
