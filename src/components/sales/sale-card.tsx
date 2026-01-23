
"use client";

import type { Sale } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";
import { Calendar, User, CheckCircle, PackageCheck, MapPin, Trash2 } from "lucide-react";
import { SaleActions } from "./columns";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface SaleCardProps {
    sale: Sale;
    onUpdateSale: (sale: Sale) => void;
    onConfirmPickup: (sale: Sale) => void;
    onDeleteSale: (saleId: string) => void;
    viewMode?: 'normal' | 'condensed';
    canEdit: boolean;
    locationName?: string;
}

export function SaleCard({ sale, onUpdateSale, onConfirmPickup, onDeleteSale, viewMode = 'normal', canEdit, locationName }: SaleCardProps) {
    const isCondensed = viewMode === 'condensed';
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const actionsProps = {
        row: { original: sale },
        options: { onUpdateSale, onConfirmPickup, canEdit },
    };
    
    const handleDelete = () => {
        onDeleteSale(sale.id);
        setShowDeleteConfirm(false);
    }
    
    const isPartiallyPaid = sale.amountPaid !== undefined && sale.amountPaid < sale.totalValue;

    return (
        <>
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Apagar Venda?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Tem a certeza que quer apagar permanentemente a venda #{sale.guideNumber}? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} variant="destructive">
                        Apagar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Card className="glass-card flex flex-col h-full group p-2 sm:p-4 shadow-sm">
            <CardHeader className="p-1 sm:p-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-xs font-bold truncate leading-tight">{sale.productName}</CardTitle>
                    {canEdit && (
                         <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive" onClick={() => setShowDeleteConfirm(true)}>
                            <Trash2 className="h-3 w-3" />
                         </Button>
                    )}
                </div>
                <CardDescription className={cn("text-[10px]", isCondensed && "hidden")}>
                    {sale.documentType} #{sale.guideNumber}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-2 p-1 sm:p-2">
                 <div className={cn(
                     "flex items-baseline justify-center text-center py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50",
                    )}>
                    <span className={cn("font-black text-primary", isCondensed ? "text-lg" : "text-2xl")}>{formatCurrency(sale.totalValue)}</span>
                </div>
                 {isPartiallyPaid && (
                    <div className="text-center -mt-1">
                        <span className="text-[10px] font-bold text-amber-500">
                            {formatCurrency(sale.amountPaid || 0)} pagos
                        </span>
                    </div>
                )}
                 
                 <div className={cn("text-xs text-muted-foreground space-y-1", isCondensed && "text-center")}>
                    <div className="flex items-center gap-1.5 justify-center">
                        <Calendar size={12} />
                        <span>{new Date(sale.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                    </div>
                     {locationName && (
                      <div className="flex items-center gap-1.5 justify-center">
                          <MapPin size={12} />
                          <span>{locationName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 justify-center">
                        <User size={12} />
                        <span>{sale.clientName || sale.soldBy}</span>
                    </div>
                 </div>

                <div className={cn("mt-2 flex justify-center items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold",
                     sale.status === 'Levantado' 
                        ? 'bg-[hsl(var(--chart-2))]/10 text-[hsl(var(--chart-2))]' 
                        : 'bg-primary/10 text-primary'
                )}>
                    {sale.status === 'Levantado' ? <CheckCircle className="h-3 w-3" /> : <PackageCheck className="h-3 w-3" />}
                    <span>{sale.status}</span>
                </div>
            </CardContent>
            {canEdit && <CardFooter className="flex justify-center gap-1 sm:gap-2 p-1 sm:p-2 pt-2">
                <SaleActions {...actionsProps} />
            </CardFooter>}
        </Card>
        </>
    );
}
