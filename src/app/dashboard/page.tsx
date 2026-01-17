"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import { useContext } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Box, ShoppingCart, Hammer } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { InventoryContext } from "@/context/inventory-context";
import { TopSales } from "@/components/dashboard/top-sales";
import { SalesActivity } from "@/components/dashboard/sales-activity";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const StockChart = dynamic(() => import("@/components/dashboard/stock-chart").then(mod => mod.StockChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[350px] w-full" />,
});


export default function DashboardPage() {
  const { canEdit } = useContext(InventoryContext) || { canEdit: () => false };
  
  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div>
           <h1 className="text-2xl md:text-3xl font-headline font-[900] text-slate-900 dark:text-white tracking-tighter">Dashboard</h1>
        </div>
      </div>

      {/* Main content: single column on mobile, multi-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (or full width on mobile) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <StatsCards />
          <SalesActivity />
        </div>

        {/* Right Column (or below on mobile) */}
        <div className="flex flex-col gap-6">
          <StockChart />
          <TopSales />
        </div>

      </div>
    </div>
  );
}
