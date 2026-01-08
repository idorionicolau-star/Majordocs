
"use client";

import type { Sale, Location, Product } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Calendar, User } from "lucide-react";
import { SaleActions } from "./columns";

interface SaleCardProps {
    sale: Sale;
    locations: Location[];
    products: Product[];
    onUpdateSale: (sale: Sale) => void;
    isMultiLocation: boolean;
    viewMode?: 'normal' | 'condensed';
}

export function SaleCard({ sale, locations, products, onUpdateSale, isMultiLocation, viewMode = 'normal' }: SaleCardProps) {
    const isCondensed = viewMode === 'condensed';
    const location = locations.find(l => l.id === sale.location);

    const actionsProps = {
        row: { original: sale },
        options: { locations, products, onUpdateSale },
    };

    return (
        <Card className="glass-card flex flex-col h-full group p-2 sm:p-4">
            <CardHeader className="p-1 sm:p-2">
                <CardTitle className="text-xs font-bold truncate leading-tight">{sale.productName}</CardTitle>
                <CardDescription className={cn("text-[10px]", isCondensed && "hidden")}>{sale.guideNumber}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-2 p-1 sm:p-2">
                 <div className={cn(
                     "flex items-baseline justify-center text-center py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50",
                    )}>
                    <span className={cn("font-black text-primary", isCondensed ? "text-lg" : "text-2xl")}>{formatCurrency(sale.totalValue)}</span>
                </div>
                
                 <div className={cn("text-xs text-muted-foreground space-y-1", isCondensed && "text-center")}>
                    <div className="flex items-center gap-1.5 justify-center">
                        <Calendar size={12} />
                        <span>{new Date(sale.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-center">
                        <User size={12} />
                        <span>{sale.soldBy}</span>
                    </div>
                 </div>

                 {isMultiLocation && !isCondensed && (
                    <div className="flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400 pt-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        <span className="text-[10px] font-semibold">{location ? location.name : 'N/A'}</span>
                    </div>
                 )}
            </CardContent>
            <CardFooter className="flex justify-center gap-1 sm:gap-2 p-1 sm:p-2 pt-2">
                <SaleActions {...actionsProps} />
            </CardFooter>
        </Card>
    );
}
