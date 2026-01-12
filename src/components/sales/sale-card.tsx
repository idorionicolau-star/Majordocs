
"use client";

import type { Sale, Location, Product } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Calendar, User, CheckCircle, PackageCheck, MapPin } from "lucide-react";
import { SaleActions } from "./columns";
import { useContext } from "react";
import { InventoryContext } from "@/context/inventory-context";

interface SaleCardProps {
    sale: Sale;
    onUpdateSale: (sale: Sale) => void;
    onConfirmPickup: (sale: Sale) => void;
    viewMode?: 'normal' | 'condensed';
    canEdit: boolean;
}

export function SaleCard({ sale, onUpdateSale, onConfirmPickup, viewMode = 'normal', canEdit }: SaleCardProps) {
    const { isMultiLocation, locations } = useContext(InventoryContext) || {};
    const isCondensed = viewMode === 'condensed';
    const location = isMultiLocation ? locations?.find(l => l.id === sale.location) : null;

    const actionsProps = {
        row: { original: sale },
        options: { onUpdateSale, onConfirmPickup, canEdit },
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

                <div className={`mt-2 flex justify-center items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    sale.status === 'Levantado' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                }`}>
                    {sale.status === 'Levantado' ? <CheckCircle className="h-3 w-3" /> : <PackageCheck className="h-3 w-3" />}
                    <span>{sale.status}</span>
                </div>

                 {isMultiLocation && location && !isCondensed && (
                    <div className="flex items-center justify-center gap-1 text-slate-500 dark:text-slate-400 pt-1">
                        <MapPin className="h-3 w-3" />
                        <span className="text-[10px] font-semibold">{location ? location.name : 'N/A'}</span>
                    </div>
                 )}
            </CardContent>
            {canEdit && <CardFooter className="flex justify-center gap-1 sm:gap-2 p-1 sm:p-2 pt-2">
                <SaleActions {...actionsProps} />
            </CardFooter>}
        </Card>
    );
}
