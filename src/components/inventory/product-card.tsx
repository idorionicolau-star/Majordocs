
"use client";

import type { Product, Location } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Edit2, Trash2 } from "lucide-react";
import { getStockStatus } from "./columns";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { EditProductDialog } from "./edit-product-dialog";

interface ProductCardProps {
    product: Product;
    locations: Location[];
    isMultiLocation: boolean;
    onProductUpdate: (product: Product) => void;
    onAttemptDelete: (product: Product) => void;
}

export function ProductCard({ product, locations, isMultiLocation, onProductUpdate, onAttemptDelete }: ProductCardProps) {
    const status = getStockStatus(product);
    
    const statusInfo = {
        ok: "text-emerald-500",
        baixo: "text-amber-500",
        crítico: "text-rose-500",
        'sem-estoque': "text-rose-600",
    }

    const location = locations.find(l => l.id === product.location);

    return (
        <Card className="glass-card flex flex-col h-full group">
            <CardHeader>
                <CardTitle className="text-base font-bold truncate">{product.name}</CardTitle>
                <CardDescription className="text-xs">{product.category}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 <div className="flex items-baseline justify-center text-center py-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <span className={cn("text-4xl font-black", statusInfo[status])}>{product.stock}</span>
                    <span className="text-sm font-bold text-muted-foreground">/un.</span>
                </div>
                <div className="text-center">
                    <p className="text-xl font-bold">{formatCurrency(product.price)}</p>
                </div>
                 {status !== 'ok' && (
                    <div className={cn(
                        "inline-flex items-center justify-center w-full gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border",
                        status === 'baixo' && 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
                        (status === 'crítico' || status === 'sem-estoque') && 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20'
                    )}>
                        <AlertCircle size={14} strokeWidth={3} />
                        {status === 'sem-estoque' ? 'Esgotado' : status === 'crítico' ? 'Crítico' : 'Baixo'}
                    </div>
                )}
                 {isMultiLocation && (
                    <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-xs font-semibold">{location ? location.name : 'N/A'}</span>
                    </div>
                 )}
            </CardContent>
            <CardFooter className="flex justify-center gap-2 pt-4">
                 <EditProductDialog
                    product={product}
                    onProductUpdate={onProductUpdate}
                    isMultiLocation={isMultiLocation}
                    locations={locations}
                    trigger="button"
                />
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive w-full"
                                onClick={() => onAttemptDelete(product)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Apagar
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Apagar Produto</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardFooter>
        </Card>
    );
}
    