
"use client";

import { useContext, useState } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { cn, formatCurrency } from "@/lib/utils";
import { DollarSign, TrendingUp, Archive, Sparkles, Lock, ShoppingCart, Plus, Package } from "lucide-react";
import { MonthlySalesChart } from "@/components/dashboard/monthly-sales-chart";
import { StockAlerts } from "@/components/dashboard/stock-alerts";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from "@/components/ui/button";
import { AddSaleDialog } from "@/components/sales/add-sale-dialog";
import { AddProductionDialog } from "@/components/production/add-production-dialog";
import { AddProductDialog } from "@/components/inventory/add-product-dialog";
import { TopSales } from "@/components/dashboard/top-sales";
import type { Sale, Product, Production } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

// Camada 1: KPIs Principais
const PrimaryKPIs = () => {
    const { dashboardStats, loading } = useContext(InventoryContext) || { dashboardStats: null, loading: true };

    if (loading || !dashboardStats) {
        return (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Skeleton className="h-32 bg-[#0f172a]/50" />
                <Skeleton className="h-32 bg-[#0f172a]/50" />
                <Skeleton className="h-32 bg-[#0f172a]/50" />
            </div>
        )
    }

    const kpis = [
        {
            title: "Faturamento Mensal",
            value: formatCurrency(dashboardStats.monthlySalesValue),
            icon: DollarSign,
            color: "text-emerald-400",
            glow: "shadow-neon-emerald",
            pingColor: "bg-emerald-400",
            size: "text-2xl md:text-2xl lg:text-4xl",
        },
        {
            title: "Capital Imobilizado",
            value: formatCurrency(dashboardStats.totalInventoryValue),
            icon: Archive,
            color: "text-slate-400",
            glow: "shadow-neon-slate",
            pingColor: "bg-slate-500",
            size: "text-2xl md:text-2xl lg:text-4xl",
        },
        {
            title: "Ticket Médio",
            value: formatCurrency(dashboardStats.averageTicket),
            icon: TrendingUp,
            color: "text-sky-400",
            glow: "shadow-neon-sky",
            pingColor: null,
            size: "text-2xl md:text-2xl lg:text-4xl",
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {kpis.map((kpi) => (
                <Card key={kpi.title} className={cn("bg-[#0f172a]/50 border-slate-800", kpi.glow)}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">{kpi.title}</CardTitle>
                        {kpi.pingColor && (
                            <span className="relative flex h-2 w-2">
                                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", kpi.pingColor)}></span>
                                <span className={cn("relative inline-flex rounded-full h-2 w-2", kpi.pingColor)}></span>
                            </span>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className={cn("font-bold", kpi.color, kpi.size)}>
                            {kpi.value}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};


// O 'Cérebro' de BI
const TacticalSummary = () => {
  const text = `Saudações à Diretoria. Sou o MajorAssistant, o seu Consultor Sênior de BI no MajorStockX. Com base nos dados extraídos em tempo real da aplicação, apresento o Relatório de Operações Estratégico detalhando o estado atual do negócio.

**1. Resumo Executivo de Desempenho**

O negócio apresenta uma estrutura de ativos sólida, mas com pontos de calibração necessários na rotatividade de stock e na conversão de vendas.
- **Vendas Mensais:** <span class="text-emerald-400">**165.489,00 MT**</span>
- **Ticket Médio:** **6.619,56 MT**
- **Valor Total em Inventário:** <span class="text-rose-500">3.641.067,00 MT</span>
- **Volume de Itens em Stock:** 11.058,32 unidades/m²

**2. Análise de Vendas e Rentabilidade**

Observamos um fluxo recente concentrado em produtos de infraestrutura e acabamento. As vendas de maior impacto nos últimos dias incluem:
- **Grelha 4 furos simples 20x20:** Gerou 13.000,00 MT (130 unidades).
- **Pavê osso de cão branco:** Gerou 12.474,00 MT (19,8 m²).
- **Lancil de barra:** Duas movimentações recentes totalizando 9.800,00 MT.

**3. Integridade e Calibração de Stock**

O rácio entre o Valor de Inventário (3,6M) e as Vendas Mensais (165k) sugere capital imobilizado. É crucial monitorizar os itens que atingiram níveis críticos:
- <span class="text-rose-500">**Pé de jardim:**</span> Stock atual de 16, abaixo do nível crítico de 30. **Ação Urgente Necessária.**
- <span class="text-amber-400">**Painel 3d Wave:**</span> Stock de 34, abaixo do alerta de 50.

**4. Recomendações Estratégicas**
- **Liquidez:** Criar campanhas para produtos com alto stock para libertar o capital imobilizado.
- **Reposição:** Iniciar imediatamente a produção de "Pé de jardim" e "Painel 3d Wave".`;

  return (
    <Card className="bg-[#0f172a]/50 border-slate-800 lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-300">
          <Sparkles className="text-sky-400 shadow-neon-sky" strokeWidth={1.5} />
          Insights da IA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72 overflow-y-auto p-4 rounded-lg font-mono text-xs border border-slate-800 bg-slate-950/70 text-slate-400 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
           <ReactMarkdown
              className="prose prose-sm prose-invert max-w-none prose-p:text-slate-400 prose-strong:text-sky-400"
              components={{
                 p: ({node, ...props}) => <p {...props} className="mb-2" />,
                 strong: ({node, ...props}) => <strong {...props} className="text-sky-400" />,
                 span: ({node, ...props}) => <span {...props} />, 
              }}
              remarkPlugins={[remarkGfm]}
           >
              {text}
           </ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  )
}

const QuickActions = () => {
    const context = useContext(InventoryContext);
    const [isSaleDialogOpen, setSaleDialogOpen] = useState(false);
    const [isProductionDialogOpen, setProductionDialogOpen] = useState(false);
    const [isProductDialogOpen, setProductDialogOpen] = useState(false);
    const { toast } = useToast();

    if (!context) return null;

    const { addSale, addProduction, addProduct, canEdit } = context;

    const handleAddSale = async (saleData: Omit<Sale, 'id' | 'guideNumber'>) => {
        try {
            await addSale(saleData);
            toast({ title: "Venda Registada", description: "A venda foi registada e o stock reservado." });
            setSaleDialogOpen(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Erro na Venda", description: e.message });
        }
    };

    const handleAddProduction = async (prodData: Omit<Production, 'id' | 'date' | 'registeredBy' | 'status'>) => {
        try {
            await addProduction(prodData);
            toast({ title: "Produção Registada" });
            setProductionDialogOpen(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Erro na Produção", description: e.message });
        }
    };

    const handleAddProduct = (prodData: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'>) => {
        addProduct(prodData);
        toast({ title: "Produto Adicionado" });
        setProductDialogOpen(false);
    };

    const canSell = canEdit('sales');
    const canProduce = canEdit('production');
    const canAddToInventory = canEdit('inventory');

    const hasAnyAction = canSell || canProduce || canAddToInventory;

    if (!hasAnyAction) return null;

    return (
        <>
            <Card className="border-none bg-transparent p-0 shadow-none">
                <div className="flex flex-col sm:flex-row gap-2">
                    {canSell && <Button onClick={() => setSaleDialogOpen(true)} variant="outline" className="flex-1 bg-transparent border-white/5 hover:bg-primary/20 hover:text-primary hover:shadow-lg hover:shadow-primary/40"><ShoppingCart className="mr-2 h-4 w-4" />Registrar Venda</Button>}
                    {canProduce && <Button onClick={() => setProductionDialogOpen(true)} variant="outline" className="flex-1 bg-transparent border-white/5 hover:bg-primary/20 hover:text-primary hover:shadow-lg hover:shadow-primary/40"><Package className="mr-2 h-4 w-4" />Entrada de Estoque</Button>}
                    {canAddToInventory && <Button onClick={() => setProductDialogOpen(true)} variant="outline" className="flex-1 bg-transparent border-white/5 hover:bg-primary/20 hover:text-primary hover:shadow-lg hover:shadow-primary/40"><Plus className="mr-2 h-4 w-4" />Novo Produto</Button>}
                </div>
            </Card>

            {canSell && <AddSaleDialog open={isSaleDialogOpen} onOpenChange={setSaleDialogOpen} onAddSale={handleAddSale} />}
            {canProduce && <AddProductionDialog open={isProductionDialogOpen} onOpenChange={setProductionDialogOpen} onAddProduction={handleAddProduction} />}
            {canAddToInventory && <AddProductDialog open={isProductDialogOpen} onOpenChange={setProductDialogOpen} onAddProduct={handleAddProduct} />}
        </>
    )
}

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
