
"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface StockHealthScoreProps {
  score: number;
}

export function StockHealthScore({ score }: StockHealthScoreProps) {
  const chartData = [{ name: "score", value: score }];
  const color = score > 80 ? "hsl(var(--chart-2))" : score > 50 ? "hsl(var(--chart-4))" : "hsl(var(--destructive))";

  return (
    <div className="relative w-40 h-40">
        <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart
                data={chartData}
                startAngle={90}
                endAngle={-270}
                innerRadius="75%"
                outerRadius="100%"
                barSize={12}
            >
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={6}
                    fill={color}
                    className="[&_.recharts-radial-bar-background-sector]:fill-muted"
                />
            </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-4xl font-bold font-mono" style={{ color: color }}>
                {score}
                <span className="text-lg font-sans text-muted-foreground">%</span>
            </p>
             <p className="text-xs font-bold text-muted-foreground">SAÚDE DO STOCK</p>
        </div>
    </div>
  );
}
