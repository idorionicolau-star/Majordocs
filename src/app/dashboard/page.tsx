
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
    <Skeleton className="h-32 bg-slate-800/50 rounded-3xl" />
    <Skeleton className="h-32 bg-slate-800/50 rounded-3xl" />
    <Skeleton className="h-32 bg-slate-800/50 rounded-3xl" />
  </div>
);

const ChartSkeleton = () => <Skeleton className="h-[400px] w-full bg-slate-800/50 rounded-3xl" />;
const PanelSkeleton = () => <Skeleton className="h-[400px] w-full bg-slate-800/50 rounded-3xl" />;

// Dynamic Imports
const PrimaryKPIs = dynamic(() => import("@/components/dashboard/primary-kpis").then(mod => mod.PrimaryKPIs), {
  loading: () => <KPISkeleton />
});
const MonthlySalesChart = dynamic(() => import("@/components/dashboard/monthly-sales-chart").then(mod => mod.MonthlySalesChart), {
  loading: () => <ChartSkeleton />
});
const InsightsPanel = dynamic(() => import("@/components/dashboard/insights-panel").then(mod => mod.InsightsPanel), {
  loading: () => <PanelSkeleton />
});
const TopSales = dynamic(() => import("@/components/dashboard/top-sales").then(mod => mod.TopSales), {
  loading: () => <PanelSkeleton />
});
const StockAlerts = dynamic(() => import("@/components/dashboard/stock-alerts").then(mod => mod.StockAlerts), {
  loading: () => <PanelSkeleton />
});


export default function DashboardPage() {
  const { user } = useContext(InventoryContext) || { user: null };
  const isPrivilegedUser = user?.role === 'Admin' || user?.role === 'Dono';

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-700 pb-10">

      {/* 1. Quick Action Cards (Top Row) */}
      <QuickActions />

      {isPrivilegedUser ? (
        <>
          {/* 2. Key Performance Indicators */}
          <PrimaryKPIs />

          {/* 3. Charts & Insights Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[400px]">
            <div className="lg:col-span-2 h-full">
              <MonthlySalesChart />
            </div>
            <div className="lg:col-span-1 h-full">
              <InsightsPanel />
            </div>
          </div>

          {/* 4. Bottom Section: Top Sales & Stock Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-full">
              <TopSales />
            </div>
            <div className="lg:col-span-1 h-full">
              <StockAlerts />
            </div>
          </div>
        </>
      ) : (
        <Card className="glass-panel h-[400px] flex flex-col justify-center items-center">
          <CardHeader>
            <CardTitle className="text-xl text-slate-400 flex items-center gap-3">
              <Lock strokeWidth={1.5} className="h-6 w-6" />
              Acesso Restrito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base text-slate-500 max-w-md text-center">
              As estatísticas avançadas e o dashboard financeiro estão disponíveis apenas para usuários com perfil de Administrador.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
