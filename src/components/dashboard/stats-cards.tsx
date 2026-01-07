
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, DollarSign, AlertTriangle, Users } from "lucide-react";
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
    },
    {
      title: "Vendas (Mês)",
      value: formatCurrency(totalSalesValue),
      icon: DollarSign,
      color: "emerald",
    },
    {
      title: "Estoque Baixo",
      value: lowStockCount,
      icon: AlertTriangle,
      color: lowStockCount > 0 ? "amber" : "emerald",
    },
    {
      title: "Usuários Ativos",
      value: users.filter(u => u.status === 'Ativo').length,
      icon: Users,
      color: "slate",
    },
  ];

  const colorClasses = {
      blue: 'from-blue-500/20 to-blue-50/5 text-blue-600 dark:text-blue-400',
      emerald: 'from-emerald-500/20 to-emerald-50/5 text-emerald-600 dark:text-emerald-400',
      amber: 'from-amber-500/20 to-amber-50/5 text-amber-600 dark:text-amber-400',
      slate: 'from-slate-500/20 to-slate-50/5 text-slate-600 dark:text-slate-400',
  }

  const textColors = {
      blue: 'text-blue-600 dark:text-blue-400',
      emerald: 'text-emerald-600 dark:text-emerald-400',
      amber: 'text-amber-600 dark:text-amber-400',
      slate: 'text-slate-600 dark:text-slate-400'
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="flex flex-col justify-between p-6">
            <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-muted-foreground">{stat.title}</p>
                 <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br shadow-inner",
                    colorClasses[stat.color as keyof typeof colorClasses]
                 )}>
                    <stat.icon className="h-6 w-6" />
                </div>
            </div>
            <div>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stat.value}</h3>
                <p className={cn("text-xs font-bold", textColors[stat.color as keyof typeof textColors])}>{stat.description}</p>
            </div>
        </Card>
      ))}
    </div>
  );
}
