import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Box, DollarSign, AlertTriangle, Users } from "lucide-react";
import { products, sales, users } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

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
      title: "Volume de Vendas (Mês)",
      value: formatCurrency(totalSalesValue),
      icon: DollarSign,
      description: "Valor total das vendas",
    },
    {
      title: "Itens com Estoque Baixo",
      value: lowStockCount,
      icon: AlertTriangle,
      description: "Produtos que precisam de reposição",
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 text-muted-foreground ${stat.isWarning ? 'text-destructive' : ''}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stat.isWarning ? 'text-destructive' : ''}`}>{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
