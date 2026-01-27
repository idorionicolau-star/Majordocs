
'use client';

import { useContext, useMemo, useState } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function StockAlerts() {
    const { products, loading } = useContext(InventoryContext) || { products: [], loading: true };
    const [isExpanded, setIsExpanded] = useState(false);

    const criticalStockProducts = useMemo(() => {
        if (!products) return [];

        return products
            .filter(p => {
                 const availableStock = p.stock - p.reservedStock;
                 return availableStock <= p.criticalStockThreshold;
            })
            .sort((a, b) => (a.stock - a.reservedStock) - (b.stock - b.reservedStock));

    }, [products]);

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
                        <AlertTriangle className="text-emerald-500 dark:text-emerald-400" strokeWidth={1.5}/>
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
                <CardTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-300">
                    <AlertTriangle className="text-rose-500 h-5 w-5" strokeWidth={2} />
                    Stock Crítico
                </CardTitle>
                <CardDescription className="text-slate-500 dark:text-slate-500">
                    Produtos que necessitam de atenção imediata.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
                {displayProducts.map(product => (
                    <Link 
                        href={`/inventory?filter=${encodeURIComponent(product.name)}`} 
                        key={product.instanceId} 
                        className="block group"
                    >
                        <div className="flex items-center justify-between p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-primary">{product.name}</span>
                            <div className="font-bold text-rose-500 text-right">
                                {product.stock - product.reservedStock}
                                <span className="text-xs text-slate-500 dark:text-slate-500 ml-1">{product.unit || 'un.'}</span>
                            </div>
                        </div>
                    </Link>
                ))}
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
