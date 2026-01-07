import { StatsCards } from "@/components/dashboard/stats-cards";
import { StockChart } from "@/components/dashboard/stock-chart";
import { currentUser } from "@/lib/data";

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
