
'use client';

import { useContext, useMemo } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function StockAlerts() {
    const { products, loading } = useContext(InventoryContext) || { products: [], loading: true };

    const lowStockProducts = useMemo(() => {
        if (!products) return [];

        return products
            .filter(p => {
                const availableStock = p.stock - p.reservedStock;
                return availableStock > 0 && availableStock <= p.lowStockThreshold && availableStock > p.criticalStockThreshold;
            })
            .sort((a, b) => (a.stock - a.reservedStock) - (b.stock - b.reservedStock))
            .slice(0, 5);

    }, [products]);

    const criticalStockProducts = useMemo(() => {
        if (!products) return [];

        return products
            .filter(p => {
                 const availableStock = p.stock - p.reservedStock;
                 return availableStock <= p.criticalStockThreshold;
            })
            .sort((a, b) => (a.stock - a.reservedStock) - (b.stock - b.reservedStock))
            .slice(0, 5);

    }, [products]);


    if (loading) {
        return (
            <Card className="glass-card">
                <CardHeader>
                    <Skeleton className="h-8 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-1/4" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }
    
    if (lowStockProducts.length === 0 && criticalStockProducts.length === 0) {
        return null;
    }

    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle className="text-xl sm:text-2xl flex items-center gap-2 text-chart-3">
                    <AlertTriangle />
                    Alertas de Stock
                </CardTitle>
                <CardDescription>
                    Produtos que necessitam da sua atenção imediata.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {criticalStockProducts.length > 0 && (
                    <div>
                        <h4 className="font-bold text-chart-4 mb-2">Stock Crítico</h4>
                        <div className="space-y-2">
                            {criticalStockProducts.map(product => (
                                <Link href={`/inventory?filter=${encodeURIComponent(product.name)}`} key={product.instanceId} className="block hover:bg-muted p-2 rounded-lg transition-all shadow-neon-rose">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold truncate" title={product.name}>{product.name}</p>
                                        <p className="text-sm font-bold text-destructive">{product.stock - product.reservedStock} <span className="text-xs text-muted-foreground">{product.unit || 'un.'}</span></p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
                 {lowStockProducts.length > 0 && (
                    <div>
                        <h4 className="font-bold text-chart-3 mb-2">Stock Baixo</h4>
                        <div className="space-y-2">
                             {lowStockProducts.map(product => (
                                <Link href={`/inventory?filter=${encodeURIComponent(product.name)}`} key={product.instanceId} className="block hover:bg-muted p-2 rounded-lg transition-all">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold truncate" title={product.name}>{product.name}</p>
                                        <p className="text-sm font-bold text-chart-3">{product.stock - product.reservedStock} <span className="text-xs text-muted-foreground">{product.unit || 'un.'}</span></p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
