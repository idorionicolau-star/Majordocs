
"use client"

import { Pie, PieChart, ResponsiveContainer, Tooltip, Legend, Cell } from "recharts"
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

  const chartData = Object.entries(stockByCategory).map(([category, stock], index) => ({
    name: category,
    value: stock,
    fill: `hsl(var(--chart-${(index % 5) + 1}))`,
  }));
  
  const chartConfig = {
    stock: {
      label: "Estoque",
    },
  }
   Object.entries(stockByCategory).forEach(([category], index) => {
    chartConfig[category as keyof typeof chartConfig] = {
        label: category,
        color: `hsl(var(--chart-${(index % 5) + 1}))`,
    }
  });


  return (
    <Card className="glass-card rounded-[2.5rem] shadow-sm overflow-hidden">
      <CardHeader className="p-8">
        <CardTitle className="font-headline font-[900] tracking-tighter text-2xl">Estoque por Categoria</CardTitle>
        <CardDescription>Distribuição percentual do total de itens em estoque</CardDescription>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full aspect-square">
            <ResponsiveContainer width="100%" height={350}>
            <PieChart>
                <Tooltip
                    content={<ChartTooltipContent
                        className="dark:bg-slate-900/80 dark:border-slate-700/50 backdrop-blur-md rounded-xl"
                        nameKey="name"
                        labelKey="value"
                        formatter={(value, name) => `${value} unidades`}
                    />}
                />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  strokeWidth={5}
                  paddingAngle={5}
                  cornerRadius={8}
                >
                  {chartData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} className="focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-primary/20 rounded-lg" />
                  ))}
                </Pie>
                <Legend 
                  content={({ payload }) => {
                    return (
                      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-4">
                        {payload?.map((entry, index) => (
                          <div key={`item-${index}`} className="flex items-center gap-2 text-sm">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span>{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
            </PieChart>
            </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
