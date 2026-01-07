
import { StatsCards } from "@/components/dashboard/stats-cards";
import { currentUser } from "@/lib/data";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamically import the StockChart component with SSR turned off
const StockChart = dynamic(() => import("@/components/dashboard/stock-chart").then(mod => mod.StockChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[438px] w-full" />,
});

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-headline font-bold">Dashboard</h1>
      <p className="text-muted-foreground">
        Bem-vindo de volta, {currentUser.name}! Aqui está um resumo da sua operação.
      </p>
      <StatsCards />
      <div className="grid grid-cols-1 gap-4">
        <StockChart />
      </div>
    </div>
  );
}
