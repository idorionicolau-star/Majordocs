
"use client";

import { useContext } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { Lock } from "lucide-react";
import { MonthlySalesChart } from "@/components/dashboard/monthly-sales-chart";
import { StockAlerts } from "@/components/dashboard/stock-alerts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopSales } from "@/components/dashboard/top-sales";
import { PrimaryKPIs } from "@/components/dashboard/primary-kpis";
import { TacticalSummary } from "@/components/dashboard/tactical-summary";
import { QuickActions } from "@/components/dashboard/quick-actions";


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
                <Lock strokeWidth={1.5}/>
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
