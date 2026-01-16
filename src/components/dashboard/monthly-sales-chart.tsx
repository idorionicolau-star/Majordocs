
"use client"

import { useContext } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

export function MonthlySalesChart() {
  const { monthlySalesChartData, loading } = useContext(InventoryContext) || { monthlySalesChartData: [], loading: true };

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
      <CardHeader>
        <CardTitle>Vendas Mensais (Últimos 6 Meses)</CardTitle>
        <CardDescription>Um resumo da sua receita de vendas ao longo do tempo.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer>
            <AreaChart data={monthlySalesChartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
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
