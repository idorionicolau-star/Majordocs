
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, DollarSign, AlertTriangle, Users, ArrowUp, ArrowDown } from "lucide-react";
import { products, sales, users } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function StatsCards() {
    const lowStockCount = products.filter(p => p.stock < p.lowStockThreshold).length;
    const totalSalesValue = sales.reduce((sum, sale) => sum + sale.totalValue, 0);

  const stats = [
    {
      title: "Produtos em Estoque",
      value: products.length,
      icon: Box,
      color: "blue",
      trend: "+2.5%",
      trendDirection: "up" as "up" | "down",
    },
    {
      title: "Vendas (Mês)",
      value: formatCurrency(totalSalesValue),
      icon: DollarSign,
      color: "emerald",
      trend: "+15%",
      trendDirection: "up" as "up" | "down",
    },
    {
      title: "Estoque Baixo",
      value: lowStockCount,
      icon: AlertTriangle,
      color: "amber",
      trend: "-3",
      trendDirection: "down" as "up" | "down",
    },
    {
      title: "Usuários Ativos",
      value: users.filter(u => u.status === 'Ativo').length,
      icon: Users,
      color: "slate",
      trend: "+1",
      trendDirection: "up" as "up" | "down",
    },
  ];

  const colorClasses = {
      blue: 'from-blue-500 to-blue-400 text-white',
      emerald: 'from-emerald-500 to-emerald-400 text-white',
      amber: 'from-amber-500 to-amber-400 text-white',
      slate: 'from-slate-600 to-slate-500 text-white',
  }
  
  const trendColors = {
      up: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10',
      down: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10'
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
      {stats.map((stat) => (
        <Card key={stat.title} className="glass-card flex items-center gap-6 p-6 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group">
             <div className={cn(
                "flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300",
                colorClasses[stat.color as keyof typeof colorClasses]
             )}>
                <stat.icon className="h-7 w-7" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{stat.title}</p>
                <div className="flex items-end gap-3">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
                    <div className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold", trendColors[stat.trendDirection])}>
                        {stat.trendDirection === 'up' ? <ArrowUp size={12} strokeWidth={3}/> : <ArrowDown size={12} strokeWidth={3}/> }
                        <span>{stat.trend}</span>
                    </div>
                </div>
            </div>
        </Card>
      ))}
    </div>
  );
}
