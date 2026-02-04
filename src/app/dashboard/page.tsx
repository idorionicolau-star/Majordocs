"use client";

import { useContext } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { KPISkeleton } from "@/components/dashboard/kpi-skeleton";
import { PanelSkeleton } from "@/components/dashboard/panel-skeleton";

// Static Imports
import { PrimaryKPIs } from "@/components/dashboard/primary-kpis";
import { MonthlySalesChart } from "@/components/dashboard/monthly-sales-chart";
import { TopSales } from "@/components/dashboard/top-sales";
import { StockAlerts } from "@/components/dashboard/stock-alerts";
import { DeadStock } from "@/components/dashboard/dead-stock";
import { EmptyStateWelcome } from "@/components/dashboard/empty-state";
import { MajorAssistant } from "@/components/assistant/major-assistant";

// Removed dynamic imports to prevent circular dependency issues in production build
// The loading state is handled by the main component logic below


export default function DashboardPage() {
  const { user, products, loading } = useContext(InventoryContext) || { user: null, products: [], loading: true };
  const isPrivilegedUser = user?.role === 'Admin' || user?.role === 'Dono';

  if (loading) {
    return (
      <div className="flex flex-col gap-4 pb-10 main-content">
        <KPISkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Fallback skeleton grid if needed, but KPISkeleton covers it */}
        </div>
        <PanelSkeleton />
      </div>
    );
  }

  // SHOW WELCOME SCREEN IF NO PRODUCTS
  if (!loading && products.length === 0) {
    return <EmptyStateWelcome />;
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-700 pb-10 main-content">

      {/* 1. Quick Action Cards (Top Row) */}
      <QuickActions />

      {isPrivilegedUser ? (
        <>
          {/* 2. Key Performance Indicators */}
          <PrimaryKPIs />


          {/* 3. Charts & Insights Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
            <div className="lg:col-span-2 h-full flex flex-col gap-4">
              <MonthlySalesChart />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                <TopSales />
                <DeadStock />
              </div>
            </div>
            <div className="lg:col-span-1 h-full">
              <MajorAssistant variant="card" className="h-full min-h-[500px]" />
            </div>
          </div>

          {/* 4. Bottom Section: Stock Alerts */}
          <div className="grid grid-cols-1 gap-4">
            <div className="h-full">
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
