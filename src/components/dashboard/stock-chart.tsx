"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
import { products } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"

export function StockChart() {
  const stockByCategory = products.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = 0;
    }
    acc[product.category] += product.stock;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(stockByCategory).map(([category, stock]) => ({
    category,
    stock,
  }));
  
  const chartConfig = {
    stock: {
      label: "Estoque",
      color: "hsl(var(--primary))",
    },
  }

  return (
    <Card className="glass-card rounded-[2.5rem] shadow-sm overflow-hidden">
      <CardHeader className="p-8">
        <CardTitle className="font-headline font-[900] tracking-tighter text-2xl">Estoque por Categoria</CardTitle>
        <CardDescription>Quantidade total de itens em cada categoria</CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)" />
                <XAxis
                  dataKey="category"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                    content={<ChartTooltipContent
                        className="dark:bg-slate-900/80 dark:border-slate-700/50 backdrop-blur-md rounded-xl"
                    />}
                    cursor={{ fill: 'hsl(var(--accent))', radius: 8 }}
                />
                <Bar dataKey="stock" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
