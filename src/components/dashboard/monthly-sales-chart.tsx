"use client"

import { useContext, useState, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { subMonths, startOfYear, endOfYear, startOfMonth, format, eachMonthOfInterval, subYears } from 'date-fns';
import { pt } from 'date-fns/locale';

type Period = '6m' | 'this_year' | 'last_year';

export function MonthlySalesChart() {
  const { sales, loading } = useContext(InventoryContext) || { sales: [], loading: true };
  const [period, setPeriod] = useState<Period>('6m');

  const chartData = useMemo(() => {
    if (!sales) return [];

    const now = new Date();
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
      <Card className="glass-card shadow-sm">
        <CardHeader>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent className="p-6">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card shadow-sm">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
            <CardTitle>Vendas Mensais</CardTitle>
            <CardDescription>Um resumo da sua receita de vendas ao longo do tempo.</CardDescription>
        </div>
        <Select value={period} onValueChange={(value: Period) => setPeriod(value)}>
            <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="6m">Últimos 6 Meses</SelectItem>
                <SelectItem value="this_year">Este Ano</SelectItem>
                <SelectItem value="last_year">Ano Passado</SelectItem>
            </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-vendas)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--color-vendas)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value as number).replace(",00", "").replace(/\s?MZN/,"")}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={80}
              />
              <Tooltip
                cursor={true}
                content={<ChartTooltipContent 
                    formatter={(value) => formatCurrency(value as number)}
                    className="dark:bg-slate-900/80 dark:border-slate-700/50 backdrop-blur-md rounded-xl" 
                />}
              />
              <Area 
                type="monotone" 
                dataKey="vendas" 
                stroke="var(--color-vendas)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorVendas)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
