import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      description: "Tipos de produto distintos",
    },
    {
      title: "Vendas (Mês)",
      value: formatCurrency(totalSalesValue),
      icon: DollarSign,
      description: "Valor total das vendas",
    },
    {
      title: "Estoque Baixo",
      value: lowStockCount,
      icon: AlertTriangle,
      description: "Itens que precisam de reposição",
      isWarning: true,
    },
    {
      title: "Usuários Ativos",
      value: users.filter(u => u.status === 'Ativo').length,
      icon: Users,
      description: "Total de usuários no sistema",
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="flex flex-col justify-between p-6">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                 <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 shadow-inner-soft",
                    stat.isWarning ? "from-destructive/20 to-destructive/5" : ""
                 )}>
                    <stat.icon className={cn("h-6 w-6 text-primary/80", stat.isWarning ? "text-destructive/80" : "")} />
                </div>
            </div>
            <div>
                <h3 className={cn("text-3xl font-extrabold", stat.isWarning ? 'text-destructive' : '')}>{stat.value}</h3>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
            </div>
        </Card>
      ))}
    </div>
  );
}
