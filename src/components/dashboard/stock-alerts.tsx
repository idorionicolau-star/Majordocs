'use client';

import { useContext, useMemo, useState } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Download } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function StockAlerts() {
    const { products, loading, companyData } = useContext(InventoryContext) || { products: [], loading: true, companyData: null };
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const { toast } = useToast();

    const criticalStockProducts = useMemo(() => {
        if (!products) return [];

        return products
            .filter(p => {
                const availableStock = p.stock - p.reservedStock;
                return availableStock <= p.criticalStockThreshold;
            })
            .sort((a, b) => (a.stock - a.reservedStock) - (b.stock - b.reservedStock));

    }, [products]);

    const handleDownloadCriticalStock = async () => {
        if (criticalStockProducts.length === 0) return;

        setIsDownloading(true);
        try {
            const { pdf } = await import('@react-pdf/renderer');
            const { CriticalStockPDF } = await import('@/components/inventory/CriticalStockPDF');

            const doc = <CriticalStockPDF
                products={criticalStockProducts}
                company={companyData || null}
            />;

            const blob = await pdf(doc).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Stock_Critico_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`;
            link.click();
            URL.revokeObjectURL(url);

            toast({
                title: "Download Concluído",
                description: "O relatório de stock crítico foi gerado a partir do dashboard.",
            });
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            toast({
                title: "Erro no Download",
                description: "Não foi possível gerar o relatório de stock crítico.",
                variant: "destructive"
            });
        } finally {
            setIsDownloading(false);
        }
    };

    const displayProducts = isExpanded ? criticalStockProducts : criticalStockProducts.slice(0, 3);

    if (loading) {
        return (
            <Card className="bg-white/70 dark:bg-[#0f172a]/50 h-full">
                <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                </CardContent>
            </Card>
        );
    }

    if (criticalStockProducts.length === 0) {
        return (
            <Card className="bg-white/70 dark:bg-[#0f172a]/50 backdrop-blur-lg flex flex-col justify-center items-center h-full border-white dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none">
                <CardHeader className="items-center">
                    <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-300">
                        <AlertTriangle className="text-emerald-500 dark:text-emerald-400" strokeWidth={1.5} />
                        Alertas de Stock
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Nenhum alerta crítico.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/70 dark:bg-[#0f172a]/50 backdrop-blur-lg border-white dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-300">
                            <AlertTriangle className="text-rose-500 h-5 w-5" strokeWidth={2} />
                            Stock Crítico
                        </CardTitle>
                        <CardDescription className="text-slate-500 dark:text-slate-500">
                            Atenção imediata necessária.
                        </CardDescription>
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-9 w-9 border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-900/10 text-rose-500"
                                    onClick={handleDownloadCriticalStock}
                                    disabled={isDownloading}
                                >
                                    <Download className={cn("h-4 w-4", isDownloading && "animate-pulse")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Baixar Relatório de Stock Crítico</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent className="space-y-1">
                {displayProducts.map(product => {
                    const availableStock = product.stock - product.reservedStock;
                    const isFullyReserved = availableStock <= 0 && product.reservedStock > 0;

                    return (
                        <Link
                            href={`/inventory?filter=${encodeURIComponent(product.name)}`}
                            key={product.instanceId}
                            className="block group"
                        >
                            <div className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary">{product.name}</span>
                                <div className="font-bold text-rose-500 text-right flex items-center">
                                    {isFullyReserved ? (
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="cursor-help flex items-center justify-end" onClick={(e) => e.preventDefault()}>
                                                        {Math.floor(product.stock)}
                                                        <span className="text-xs font-bold ml-1 text-amber-500">(R)</span>
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{product.reservedStock} unidade(s) reservada(s) para vendas.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    ) : (
                                        Math.floor(Math.max(0, availableStock))
                                    )}
                                    <span className="text-xs text-slate-500 dark:text-slate-500 ml-1">{product.unit || 'un.'}</span>
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </CardContent>
            {criticalStockProducts.length > 3 && (
                <CardFooter>
                    <Button variant="link" className="text-primary dark:text-sky-400 p-0 h-auto text-sm" onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? 'Mostrar menos' : `Mostrar todos os ${criticalStockProducts.length} itens`}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
