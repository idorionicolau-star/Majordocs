
"use client";

import type { Product, Location } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Edit2, Trash2, PackageCheck } from "lucide-react";
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
    viewMode?: 'normal' | 'condensed';
}

export function ProductCard({ product, locations, isMultiLocation, onProductUpdate, onAttemptDelete, viewMode = 'normal' }: ProductCardProps) {
    const status = getStockStatus(product);
    
    const statusInfo = {
        ok: "text-emerald-500",
        baixo: "text-amber-500",
        crítico: "text-rose-500",
        'sem-estoque': "text-rose-600",
    }

    const location = locations.find(l => l.id === product.location);
    const isCondensed = viewMode === 'condensed';
    const availableStock = product.stock - product.reservedStock;

    return (
        <Card className="glass-card flex flex-col h-full group p-2 sm:p-4">
            <CardHeader className="p-1 sm:p-2">
                <CardTitle className="text-xs font-bold truncate leading-tight">{product.name}</CardTitle>
                <CardDescription className={cn("text-[10px]", isCondensed && "hidden")}>{product.category}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-2 p-1 sm:p-2">
                 <div className={cn(
                     "flex items-baseline justify-center text-center py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50",
                     isCondensed ? "flex-col" : ""
                    )}>
                    <span className={cn("font-black", statusInfo[status], isCondensed ? "text-xl" : "text-3xl")}>{availableStock}</span>
                    <span className="text-[10px] sm:text-xs font-bold text-muted-foreground">/un.</span>
                </div>
                {product.reservedStock > 0 && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-blue-500 font-semibold">
                    <PackageCheck className="h-3 w-3" />
                    <span>{product.reservedStock} Reservado(s)</span>
                  </div>
                )}
                <div className="text-center">
                    <p className={cn("font-bold", isCondensed ? "text-sm" : "text-base")}>{formatCurrency(product.price)}</p>
                </div>
                 {status !== 'ok' && !isCondensed && (
                    <div className={cn(
                        "inline-flex items-center justify-center w-full gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                        status === 'baixo' && 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
                        (status === 'crítico' || status === 'sem-estoque') && 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20'
                    )}>
                        <AlertCircle size={12} strokeWidth={3} />
                        {status === 'sem-estoque' ? 'Esgotado' : status === 'crítico' ? 'Crítico' : 'Baixo'}
                    </div>
                )}
                 {isMultiLocation && !isCondensed && (
                    <div className="flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span className="text-[10px] font-semibold">{location ? location.name : 'N/A'}</span>
                    </div>
                 )}
            </CardContent>
            <CardFooter className="flex justify-center gap-1 sm:gap-2 p-1 sm:p-2 pt-2">
                 <EditProductDialog
                    product={product}
                    onProductUpdate={onProductUpdate}
                    isMultiLocation={isMultiLocation}
                    locations={locations}
                    trigger={'card-button'}
                />
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "text-destructive hover:bg-destructive/10 hover:text-destructive",
                                     "flex-1 h-8 sm:h-9"
                                )}
                                size={'icon'}
                                onClick={() => onAttemptDelete(product)}
                            >
                                <Trash2 className="h-4 w-4"/>
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
