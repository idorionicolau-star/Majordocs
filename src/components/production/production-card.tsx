
"use client";

import type { Production, Location } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Calendar, User, Hammer, Package, CheckCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "../ui/tooltip";


interface ProductionCardProps {
    production: Production;
    locations: Location[];
    isMultiLocation: boolean;
    onTransfer: (production: Production) => void;
    viewMode?: 'normal' | 'condensed';
}

export function ProductionCard({ production, locations, isMultiLocation, onTransfer, viewMode = 'normal' }: ProductionCardProps) {
    const isCondensed = viewMode === 'condensed';
    const location = locations.find(l => l.id === production.location);
    const isTransferred = production.status === 'Transferido';

    return (
        <Card className="glass-card flex flex-col h-full group p-2 sm:p-4 relative">
            {isTransferred && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 rounded-xl flex items-center justify-center">
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-500/10 px-4 py-2 rounded-full border border-green-200 dark:border-green-500/20">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-bold text-sm">Transferido</span>
                    </div>
                </div>
            )}
            <CardHeader className="p-1 sm:p-2">
                 <div className="flex items-start gap-2">
                    <Hammer className="h-5 w-5 text-primary mt-0.5"/>
                    <div>
                        <CardTitle className="text-xs font-bold leading-tight">{production.productName}</CardTitle>
                        <CardDescription className={cn("text-[10px]", isCondensed && "hidden")}>ID: {production.id}</CardDescription>
                    </div>
                 </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-2 p-1 sm:p-2">
                 <div className={cn(
                     "flex items-baseline justify-center text-center py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50",
                     isCondensed ? "flex-col" : ""
                    )}>
                    <span className={cn("font-black text-primary", isCondensed ? "text-xl" : "text-3xl")}>{production.quantity}</span>
                    <span className="text-[10px] sm:text-xs font-bold text-muted-foreground">/un.</span>
                </div>
                 
                 <div className={cn("text-xs text-muted-foreground space-y-1", isCondensed && "text-center")}>
                    <div className="flex items-center gap-1.5 justify-center">
                        <Calendar size={12} />
                        <span>{new Date(production.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-center">
                        <User size={12} />
                        <span>{production.registeredBy}</span>
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
            </CardFooter>
        </Card>
    );
}
