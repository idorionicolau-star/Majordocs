"use client";

import type { Production } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Calendar, User, Hammer, Package, CheckCircle, MapPin, Trash2, Edit } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { EditProductionDialog } from "./edit-production-dialog";


interface ProductionCardProps {
    production: Production;
    onTransfer: (production: Production) => void;
    onDelete: (productionId: string) => void;
    onUpdate: (productionId: string, data: Partial<Production>) => void;
    viewMode?: 'normal' | 'condensed';
    canEdit: boolean;
    locationName?: string;
}

export function ProductionCard({ production, onTransfer, onDelete, onUpdate, viewMode = 'normal', canEdit, locationName }: ProductionCardProps) {
    const isCondensed = viewMode === 'condensed';
    const isTransferred = production.status === 'Transferido';
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDelete = () => {
        onDelete(production.id);
        setShowDeleteConfirm(false);
    };

    return (
        <Card className="glass-card flex flex-col h-full group p-2 sm:p-4 relative shadow-sm">
            <CardHeader className="p-1 sm:p-2">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                        <Hammer className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                            <CardTitle className="text-xs font-bold leading-tight flex items-center gap-2">
                                {production.productName}
                                {production.orderId && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                        Enc.
                                    </span>
                                )}
                            </CardTitle>
                            <CardDescription className={cn("text-[10px]", isCondensed && "hidden")}>ID: {production.id.slice(-6)}</CardDescription>
                        </div>
                    </div>
                    {canEdit && !isTransferred && (
                        <div className="flex items-center">
                            <EditProductionDialog production={production} onUpdate={onUpdate} />
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive" onClick={() => onDelete(production.id)}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-2 p-1 sm:p-2">
                <div className={cn(
                    "flex items-baseline justify-center text-center py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50",
                    isCondensed ? "flex-col" : ""
                )}>
                    <span className={cn("font-black text-primary", isCondensed ? "text-xl" : "text-3xl")}>{production.quantity}</span>
                    <span className="text-[10px] sm:text-xs font-bold text-muted-foreground">/{production.unit || 'un'}</span>
                </div>

                <div className={cn("text-xs text-muted-foreground space-y-1", isCondensed && "text-center")}>
                    <div className="flex items-center gap-1.5 justify-center">
                        <Calendar size={12} />
                        <span>{new Date(production.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                    </div>
                    {locationName && (
                        <div className="flex items-center gap-1.5 justify-center">
                            <MapPin size={12} />
                            <span>{locationName}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 justify-center">
                        <User size={12} />
                        <span>{production.registeredBy}</span>
                    </div>
                </div>
            </CardContent>
            {canEdit && <CardFooter className="flex justify-center gap-1 sm:gap-2 p-1 sm:p-2 pt-2">
                {!isTransferred && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button className="flex-1" variant="outline" size="sm" onClick={() => onTransfer(production)}>
                                    <Package className="h-4 w-4 mr-2" />
                                    Transferir
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Transferir para Inventário</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </CardFooter>}
            {isTransferred && (
                <div className="absolute bottom-2 right-2 z-10">
                    <div className="flex items-center gap-1.5 text-[hsl(var(--chart-2))] bg-emerald-50 dark:bg-emerald-950/70 px-2 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle className="h-3 w-3" />
                        <span className="font-bold text-[10px]">Transferido</span>
                    </div>
                </div>
            )}
        </Card>
        </>
    );
}
