
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
      <CardHeader className="p-6 md:p-8">
        <CardTitle className="font-headline font-[900] tracking-tighter text-xl md:text-2xl">Estoque por Categoria</CardTitle>
        <CardDescription>Distribuição do total de itens em estoque</CardDescription>
      </CardHeader>
      <CardContent className="p-0 md:p-6 md:pt-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[350px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent 
                    hideLabel 
                    className="dark:bg-slate-900/80 dark:border-slate-700/50 backdrop-blur-md rounded-xl"
                />}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
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
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-4 text-xs">
                      {payload?.map((entry, index) => (
                        <li key={`item-${index}`} className="flex items-center gap-2 font-medium text-muted-foreground">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          {entry.value}
                        </li>
                      ))}
                    </ul>
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
