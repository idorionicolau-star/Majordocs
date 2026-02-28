"use client";

import { useContext, useMemo, useState } from "react";
import { InventoryContext } from "@/context/inventory-context";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card";
import {
    TrendingDown,
    TrendingUp,
    Scale,
    PackageX,
    Coins
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { format, subDays } from "date-fns";
import { pt } from "date-fns/locale";
import { Timestamp } from "firebase/firestore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function InventoryImpactPage() {
    const { stockMovements, products, sales, loading } = useContext(InventoryContext) || { stockMovements: [], products: [], sales: [], loading: true };
    const [activeTab, setActiveTab] = useState("audit");

    const impactData = useMemo(() => {
        if (!stockMovements || !products) return { adjustments: [], totalGain: 0, totalLoss: 0 };

        const productCostMap = new Map<string, number>();
        products.forEach(p => {
            if (p.id) productCostMap.set(p.id, p.cost || 0);
        });

        const auditMovements = stockMovements
            .filter(m => m.type === 'ADJUSTMENT' || m.isAudit)
            .sort((a, b) => {
                const dateA = (a.timestamp as Timestamp)?.toDate() || new Date(0);
                const dateB = (b.timestamp as Timestamp)?.toDate() || new Date(0);
                return dateB.getTime() - dateA.getTime();
            });

        let totalGain = 0;
        let totalLoss = 0;

        const adjustments = auditMovements.map(m => {
            const unitCost = productCostMap.get(m.productId) || 0;
            const impactValue = m.quantity * unitCost;

            if (impactValue > 0) totalGain += impactValue;
            else totalLoss += Math.abs(impactValue);

            return {
                ...m,
                unitCost,
                impactValue
            };
        });

        return { adjustments, totalGain, totalLoss };
    }, [stockMovements, products]);

    const deadStockData = useMemo(() => {
        if (!products || !sales) return { items: [], totalTiedCapital: 0 };

        const thirtyDaysAgo = subDays(new Date(), 30);
        const soldProductNames = new Set();

        sales.forEach(s => {
            const saleDate = (s.timestamp as any)?.toDate ? (s.timestamp as any).toDate() : new Date(s.timestamp || s.date);
            if (saleDate >= thirtyDaysAgo) {
                soldProductNames.add(s.productName);
            }
        });

        const items = products
            .filter(p => (p.stock || 0) > 0 && !soldProductNames.has(p.name))
            .map(p => ({
                ...p,
                tiedCapital: (p.stock || 0) * (p.cost || 0)
            }))
            .sort((a, b) => b.tiedCapital - a.tiedCapital);

        const totalTiedCapital = items.reduce((sum, item) => sum + item.tiedCapital, 0);

        return { items, totalTiedCapital };
    }, [products, sales]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">A carregar dados de impacto...</div>;
    }

    const netImpact = impactData.totalGain - impactData.totalLoss;

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10 main-content">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <Scale className="h-6 w-6 text-indigo-500" />
                    Impacto Financeiro & Eficiência
                </h1>
                <p className="text-slate-500 text-sm">
                    Análise monetária de auditorias e capital imobilizado em stock morto.
                </p>
            </div>

            <Tabs defaultValue="audit" className="w-full" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-6">
                    <TabsTrigger value="audit" className="font-bold">Impacto Auditoria</TabsTrigger>
                    <TabsTrigger value="deadstock" className="font-bold">Capital Parado</TabsTrigger>
                </TabsList>

                <TabsContent value="audit" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="glass-panel border-emerald-500/20 bg-emerald-500/[0.02]">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">
                                    Ganhos de Stock
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(impactData.totalGain)}
                                    </h2>
                                    <TrendingUp className="h-8 w-8 text-emerald-500/20" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-panel border-rose-500/20 bg-rose-500/[0.02]">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase text-rose-500 tracking-widest">
                                    Quebras / Perdas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black text-rose-600 dark:text-rose-400">
                                        -{formatCurrency(impactData.totalLoss)}
                                    </h2>
                                    <TrendingDown className="h-8 w-8 text-rose-500/20" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={cn(
                            "glass-panel transition-colors duration-500",
                            netImpact >= 0 ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5"
                        )}>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest">
                                    Resultado Líquido
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <h2 className={cn(
                                        "text-2xl font-black",
                                        netImpact >= 0 ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        {netImpact > 0 ? "+" : ""}{formatCurrency(netImpact)}
                                    </h2>
                                    <Scale className="h-8 w-8 opacity-20" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="glass-panel border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Histórico de Ajustes</CardTitle>
                            <CardDescription>Lista detalhada de todas as correções de stock e o seu valor em Meticais.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-[10px]">Data</th>
                                            <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-[10px]">Produto</th>
                                            <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase text-[10px]">Ajuste</th>
                                            <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase text-[10px]">Custo Unit.</th>
                                            <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase text-[10px]">Impacto Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {impactData.adjustments.map((adj, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                                                    {adj.timestamp ? format((adj.timestamp as Timestamp).toDate(), "dd MMM, HH:mm", { locale: pt }) : 'Recent'}
                                                </td>
                                                <td className="px-4 py-3 font-medium">
                                                    {adj.productName}
                                                    <div className="text-[10px] text-slate-400 font-normal">{adj.reason}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-black uppercase",
                                                        adj.quantity > 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                                    )}>
                                                        {adj.quantity > 0 ? "+" : ""}{adj.quantity}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-500">
                                                    {formatCurrency(adj.unitCost)}
                                                </td>
                                                <td className={cn(
                                                    "px-4 py-3 text-right font-bold",
                                                    adj.impactValue > 0 ? "text-emerald-600" : "text-rose-600"
                                                )}>
                                                    {adj.impactValue > 0 ? "+" : ""}{formatCurrency(adj.impactValue)}
                                                </td>
                                            </tr>
                                        ))}
                                        {impactData.adjustments.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-10 text-center text-slate-400 italic">
                                                    Nenhum ajuste de auditoria registado até ao momento.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="deadstock" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="glass-panel border-amber-500/20 bg-amber-500/[0.02]">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase text-amber-500 tracking-widest">
                                    Capital Sem Giro (30+ Dias)
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                        {formatCurrency(deadStockData.totalTiedCapital)}
                                    </h2>
                                    <Coins className="h-8 w-8 text-amber-500/20" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="glass-panel border-slate-500/20 bg-slate-500/[0.02]">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                                    Produtos Críticos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black text-slate-600 dark:text-slate-400">
                                        {deadStockData.items.length} Itens
                                    </h2>
                                    <PackageX className="h-8 w-8 text-slate-500/20" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="glass-panel border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Inventário sem Rotação</CardTitle>
                            <CardDescription>Produtos com stock disponível que não registaram vendas nos últimos 30 dias.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase text-[10px]">Produto</th>
                                            <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase text-[10px]">Stock Atual</th>
                                            <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase text-[10px]">Custo Unit.</th>
                                            <th className="px-4 py-3 text-right font-bold text-slate-500 uppercase text-[10px]">Valor Imobilizado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {deadStockData.items.map((item, i) => (
                                            <tr key={item.id || i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 font-medium">
                                                    {item.name}
                                                    <div className="text-[10px] text-slate-400 font-normal">{item.category}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {item.stock} {item.unit || 'un'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-500">
                                                    {formatCurrency(item.cost || 0)}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-300">
                                                    {formatCurrency(item.tiedCapital)}
                                                </td>
                                            </tr>
                                        ))}
                                        {deadStockData.items.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-10 text-center text-slate-400 italic">
                                                    Parabéns! Todo o seu catálogo registrou vendas nos últimos 30 dias.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
