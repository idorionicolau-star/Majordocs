
import { useContext, useMemo, useState } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Download, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function StockAlerts({ className }: { className?: string }) {
    const { products, loading, companyData } = useContext(InventoryContext) || { products: [], loading: true, companyData: null };
    const [currentPage, setCurrentPage] = useState(1);
    const [isDownloading, setIsDownloading] = useState(false);
    const { toast } = useToast();

    const ITEMS_PER_PAGE = 5;

    const criticalStockProducts = useMemo(() => {
        if (!products) return [];

        return products
            .filter(p => {
                const availableStock = p.stock - p.reservedStock;
                return availableStock <= p.criticalStockThreshold;
            })
            .sort((a, b) => (a.stock - a.reservedStock) - (b.stock - b.reservedStock));

    }, [products]);

    // Reset to page 1 if data changes significantly
    useMemo(() => {
        setCurrentPage(1);
    }, [criticalStockProducts.length]);


    const handleDownloadCriticalStock = async () => {
        if (criticalStockProducts.length === 0) return;

        setIsDownloading(true);
        try {
            const { pdf } = await import('@react-pdf/renderer');
            // Dynamically import to avoid server-side issues with PDF generation
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

    const totalPages = Math.ceil(criticalStockProducts.length / ITEMS_PER_PAGE);
    const displayProducts = criticalStockProducts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(p => p - 1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(p => p + 1);
    };

    if (loading) {
        return (
            <Card className="bg-transparent border-none">
                <CardHeader>
                    <Skeleton className="h-6 w-3/4 bg-slate-800" />
                    <Skeleton className="h-4 w-1/2 bg-slate-800" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full bg-slate-800" />)}
                </CardContent>
            </Card>
        );
    }

    if (criticalStockProducts.length === 0) {
        return (
            <Card className={cn("glass-panel border-slate-200/50 dark:border-slate-800/50 shadow-none flex flex-col justify-center items-center h-full", className)}>
                <CardHeader className="items-center">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                        <CheckCircle2 className="text-emerald-500" strokeWidth={1.5} />
                        Alertas de Stock
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Nenhum alerta crítico.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("glass-panel border-red-500/20 dark:border-red-900/40 shadow-[0_0_20px_rgba(220,38,38,0.1)] h-full flex flex-col", className)}>
            <CardHeader className="pb-3 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <AlertTriangle className="text-red-500" strokeWidth={2} />
                            Stock Crítico
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">
                            <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                Atenção imediata necessária.
                            </span>
                        </CardDescription>
                    </div>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                                    onClick={handleDownloadCriticalStock}
                                    disabled={isDownloading}
                                >
                                    <Download className={cn("h-4 w-4", isDownloading && "animate-pulse")} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-popover text-popover-foreground border-border">
                                <p>Baixar Relatório</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow overflow-auto">
                {displayProducts.map(product => {
                    const availableStock = product.stock - product.reservedStock;

                    return (
                        <Link
                            href={`/inventory?filter=${encodeURIComponent(product.name)}`}
                            key={product.instanceId}
                            className="block group"
                        >
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 group-hover:border-red-500/30 transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 shadow-sm dark:shadow-none">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-foreground transition-colors truncate mr-2">{product.name}</span>
                                <div className="text-right flex items-center gap-2 shrink-0">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_5px_currentColor]" />
                                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                        {Math.floor(Math.max(0, availableStock))} <span className="text-[10px] text-muted-foreground font-normal">{product.unit || 'un'}</span>
                                    </span>
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </CardContent>
            {totalPages > 1 && (
                <CardFooter className="pt-2 pb-4 shrink-0 flex items-center justify-between border-t border-border/40 mt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="h-8 w-8 p-0"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
