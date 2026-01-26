
"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StockHealthScoreProps {
  score: number;
}

export function StockHealthScore({ score }: StockHealthScoreProps) {
  const chartData = [{ name: "score", value: score }];
  const color = "hsl(var(--chart-2))"; // Emerald-400 for success/health

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
                    className="[&_.recharts-radial-bar-background-sector]:fill-slate-800"
                />
            </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className={cn(
              "text-4xl font-mono font-bold text-emerald-400 drop-shadow-[0_0_8px_hsl(var(--chart-2)/0.8)]"
              )}>
                {score}
                <span className="text-lg font-sans text-slate-400">%</span>
            </p>
             <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">SAÚDE DO STOCK</p>
        </div>
    </div>
  );
}
