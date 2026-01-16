"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from 'lucide-react';
import { StatsCards } from "@/components/dashboard/stats-cards";

const StockChart = dynamic(() => import("@/components/dashboard/stock-chart").then(mod => mod.StockChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />,
});

const MonthlySalesChart = dynamic(() => import("@/components/dashboard/monthly-sales-chart").then(mod => mod.MonthlySalesChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />,
});

export default function AnalysisPage() {
  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-headline font-[900] text-slate-900 dark:text-white tracking-tighter flex items-center gap-3">
             <BarChart3 className="h-8 w-8 text-primary" />
             Análise de Desempenho
           </h1>
           <p className="text-sm font-medium text-slate-500 mt-1">
            Visualize os gráficos e os principais indicadores do seu negócio.
          </p>
        </div>
      </div>
      
      <StatsCards />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StockChart />
        <MonthlySalesChart />
      </div>
    </div>
  );
}
