
"use client"

import { useContext, useState, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { subMonths, startOfYear, endOfYear, startOfMonth, format, eachMonthOfInterval, subYears, eachDayOfInterval, subDays } from 'date-fns';
import { pt } from 'date-fns/locale';

type Period = '30d' | '6m' | 'this_year' | 'last_year';

export function MonthlySalesChart() {
  const { sales, loading } = useContext(InventoryContext) || { sales: [], loading: true };
  const [period, setPeriod] = useState<Period>('6m');

  const chartData = useMemo(() => {
    if (!sales) return [];

    const now = new Date();

    if (period === '30d') {
      const startDate = subDays(now, 29); // 30 days including today
      const endDate = now;
      const dayInterval = eachDayOfInterval({ start: startDate, end: endDate });

      return dayInterval.map(day => {
        const daySales = sales.filter(s => {
          const saleDate = new Date(s.date);
          return saleDate.getFullYear() === day.getFullYear() &&
            saleDate.getMonth() === day.getMonth() &&
            saleDate.getDate() === day.getDate();
        }).reduce((sum, s) => sum + s.totalValue, 0);

        const dayName = format(day, 'dd/MMM', { locale: pt });
        return {
          name: dayName,
          vendas: daySales,
        };
      });
    }

    let startDate: Date, endDate: Date;

    switch (period) {
      case 'this_year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      case 'last_year':
        const lastYear = subYears(now, 1);
        startDate = startOfYear(lastYear);
        endDate = endOfYear(lastYear);
        break;
      case '6m':
      default:
        startDate = subMonths(now, 5);
        endDate = now;
        break;
    }

    startDate = startOfMonth(startDate);

    const monthInterval = eachMonthOfInterval({ start: startDate, end: endDate });

    const salesByMonth = monthInterval.map(monthStart => {
      const monthSales = sales.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate.getFullYear() === monthStart.getFullYear() && saleDate.getMonth() === monthStart.getMonth();
      }).reduce((sum, s) => sum + s.totalValue, 0);

      const monthName = format(monthStart, 'MMM', { locale: pt });
      return {
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', ''),
        vendas: monthSales,
      };
    });

    return salesByMonth;

  }, [sales, period]);


  const chartConfig = {
    vendas: {
      label: "Vendas",
      color: "hsl(var(--chart-1))",
    },
  };

  if (loading) {
    return (
      <Card className="bg-transparent border-none">
        <CardHeader>
          <Skeleton className="h-8 w-2/3 bg-slate-800" />
          <Skeleton className="h-4 w-1/2 bg-slate-800" />
        </CardHeader>
        <CardContent className="p-6">
          <Skeleton className="h-[300px] w-full bg-slate-800" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel border-slate-800 bg-slate-900/50 shadow-xl h-full relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/50 pointer-events-none" />
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 z-10 relative">
        <div className="flex flex-col">
          <CardTitle className="text-xl text-white font-bold tracking-wide">Vendas ao Longo do Tempo</CardTitle>
          <CardDescription className="text-slate-400">Acompanhamento de performance</CardDescription>
        </div>
        <Select value={period} onValueChange={(value: Period) => setPeriod(value)}>
          <SelectTrigger className="w-full md:w-[180px] bg-slate-800/50 border-slate-700 text-slate-200 focus:ring-emerald-500/50">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
            <SelectItem value="30d">Diário (30 dias)</SelectItem>
            <SelectItem value="6m">Mensal (6 Meses)</SelectItem>
            <SelectItem value="this_year">Este Ano</SelectItem>
            <SelectItem value="last_year">Ano Passado</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pl-0 pr-6 pt-6 z-10 relative">
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillVendas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-800" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                fontSize={12}
                stroke="#64748b"
                className="text-slate-500 font-medium"
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value as number).replace(",00", "").replace(/\s?MZN/, "").replace("MT", "") + " MTn"}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={80}
                fontSize={12}
                stroke="#64748b"
                className="text-slate-500 font-medium"
              />
              <Tooltip
                cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '4 4' }}
                content={<ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-bold text-emerald-400">
                      {formatCurrency(value as number)}
                    </span>
                  )}
                  className="bg-slate-900/90 border-slate-800 backdrop-blur-xl rounded-xl shadow-2xl p-4"
                />}
              />
              <Area
                type="monotone"
                dataKey="vendas"
                stroke="#10b981" // Emerald 500
                strokeWidth={4}
                fillOpacity={1}
                fill="url(#fillVendas)"
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
