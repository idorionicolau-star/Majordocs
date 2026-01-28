
"use client";

import { useContext } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Loading Fallbacks
const KPISkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
    <Skeleton className="h-32 bg-white/70 dark:bg-[#0f172a]/50" />
    <Skeleton className="h-32 bg-white/70 dark:bg-[#0f172a]/50" />
    <Skeleton className="h-32 bg-white/70 dark:bg-[#0f172a]/50" />
  </div>
);

const ChartSkeleton = () => <Skeleton className="h-[400px] w-full bg-white/70 dark:bg-[#0f172a]/50" />;
const TableSkeleton = () => <Skeleton className="h-[400px] w-full bg-white/70 dark:bg-[#0f172a]/50" />;
const SummarySkeleton = () => <Skeleton className="h-[300px] w-full bg-white/70 dark:bg-[#0f172a]/50" />;
const AlertSkeleton = () => <Skeleton className="h-[300px] w-full bg-white/70 dark:bg-[#0f172a]/50" />;

// Dynamic Imports
const PrimaryKPIs = dynamic(() => import("@/components/dashboard/primary-kpis").then(mod => mod.PrimaryKPIs), {
  loading: () => <KPISkeleton />
});
const MonthlySalesChart = dynamic(() => import("@/components/dashboard/monthly-sales-chart").then(mod => mod.MonthlySalesChart), {
  loading: () => <ChartSkeleton />
});
const TopSales = dynamic(() => import("@/components/dashboard/top-sales").then(mod => mod.TopSales), {
  loading: () => <TableSkeleton />
});
const TacticalSummary = dynamic(() => import("@/components/dashboard/tactical-summary").then(mod => mod.TacticalSummary), {
  loading: () => <SummarySkeleton />
});
const StockAlerts = dynamic(() => import("@/components/dashboard/stock-alerts").then(mod => mod.StockAlerts), {
  loading: () => <AlertSkeleton />
});


export default function DashboardPage() {
  const { user } = useContext(InventoryContext) || { user: null };
  const isPrivilegedUser = user?.role === 'Admin' || user?.role === 'Dono';

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">

      <QuickActions />

      {isPrivilegedUser ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-3">
              <PrimaryKPIs />
            </div>
            <div className="lg:col-span-2">
              <MonthlySalesChart />
            </div>
            <TopSales />
            <div className="lg:col-span-2">
              <TacticalSummary />
            </div>
            <div className="lg:col-span-1">
              <StockAlerts />
            </div>
          </div>
        </>
      ) : (
        <Card className="bg-[#0f172a]/50 border-slate-800 h-full flex flex-col justify-center items-center">
          <CardHeader>
            <CardTitle className="text-lg text-slate-400 flex items-center gap-2">
              <Lock strokeWidth={1.5} />
              Acesso Restrito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">
              As estatísticas e a atividade de vendas estão disponíveis apenas para Administradores e Donos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
