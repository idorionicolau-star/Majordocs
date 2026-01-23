"use client";

import type { Product, Location } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Edit2, Trash2, PackageCheck, History } from "lucide-react";
import { getStockStatus } from "./columns";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { EditProductDialog } from "./edit-product-dialog";
import { AuditStockDialog } from "./audit-stock-dialog";
import Link from "next/link";

interface ProductCardProps {
    product: Product;
    onProductUpdate: (product: Product) => void;
    onAttemptDelete: (product: Product) => void;
    viewMode?: 'normal' | 'condensed';
    canEdit: boolean;
    locations: Location[];
    isMultiLocation: boolean;
}

export function ProductCard({ product, onProductUpdate, onAttemptDelete, viewMode = 'normal', canEdit, locations, isMultiLocation }: ProductCardProps) {
    const status = getStockStatus(product);
    
    const statusInfo = {
        ok: "text-[hsl(var(--chart-2))]",
        baixo: "text-[hsl(var(--chart-4))]",
        crítico: "text-destructive",
        'sem-estoque': "text-destructive",
    }

    const isCondensed = viewMode === 'condensed';
    const availableStock = product.stock - product.reservedStock;

    return (
        <Card className="glass-card flex flex-col h-full group p-2 sm:p-4 shadow-sm">
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
                    <span className="text-[10px] sm:text-xs font-bold text-muted-foreground">/{product.unit || 'un'}</span>
                </div>
                {product.reservedStock > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/sales?nameFilter=${encodeURIComponent(product.name)}&statusFilter=Pago`} className="flex items-center justify-center gap-1.5 text-xs text-primary font-semibold cursor-pointer hover:underline">
                          <PackageCheck className="h-3 w-3" />
                          <span>{product.reservedStock} Reservado(s)</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Stock vendido e pago, aguardando levantamento. Clique para ver as vendas.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <div className="text-center">
                    <p className={cn("font-bold", isCondensed ? "text-sm" : "text-base")}>{formatCurrency(product.price)}</p>
                </div>
                 {status !== 'ok' && !isCondensed && (
                    <div className={cn(
                        "inline-flex items-center justify-center w-full gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                        status === 'baixo' && 'text-[hsl(var(--chart-4))] bg-[hsl(var(--chart-4))]/10 border-[hsl(var(--chart-4))]/20',
                        (status === 'crítico' || status === 'sem-estoque') && 'text-destructive bg-destructive/10 border-destructive/20'
                    )}>
                        <AlertCircle size={12} strokeWidth={3} />
                        {status === 'sem-estoque' ? 'Esgotado' : status === 'crítico' ? 'Crítico' : 'Baixo'}
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex justify-center gap-1 sm:gap-2 p-1 sm:p-2 pt-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                                <Button asChild variant="outline" size="icon" className="flex-1 h-8 sm:h-9">
                                <Link href={`/inventory/history?productName=${encodeURIComponent(product.name)}`}>
                                    <History className="h-4 w-4" />
                                </Link>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Ver Histórico</p></TooltipContent>
                    </Tooltip>
                    {canEdit && (
                        <>
                        <AuditStockDialog product={product} trigger="card-button" />
                        <EditProductDialog
                            product={product}
                            onProductUpdate={onProductUpdate}
                            trigger={'card-button'}
                            locations={locations}
                            isMultiLocation={isMultiLocation}
                        />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive flex-1 h-8 sm:h-9"
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
                        </>
                    )}
                </TooltipProvider>
            </CardFooter>
        </Card>
    );
}
