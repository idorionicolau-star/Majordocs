
"use client";

import type { Order } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, ClipboardList, Play, Check, CircleHelp, PlusCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { AddProductionLogDialog } from "./add-production-log-dialog";
import { differenceInDays, addDays } from 'date-fns';


interface OrderCardProps {
    order: Order;
    onUpdateStatus: (orderId: string, newStatus: 'Pendente' | 'Em produção' | 'Concluída') => void;
    onAddProductionLog: (orderId: string, logData: { quantity: number; notes?: string; }) => void;
    canEdit: boolean;
}

const statusConfig = {
    'Pendente': {
        color: 'text-yellow-600',
        icon: CircleHelp,
    },
    'Em produção': {
        color: 'text-blue-600',
        icon: Play,
    },
    'Concluída': {
        color: 'text-green-600',
        icon: Check,
    }
};

export function OrderCard({ order, onUpdateStatus, onAddProductionLog, canEdit }: OrderCardProps) {
    const { icon: StatusIcon, color: statusColor } = statusConfig[order.status];
    const progress = order.quantity > 0 ? (order.quantityProduced / order.quantity) * 100 : 0;
    const remainingQuantity = order.quantity - order.quantityProduced;
    
    const calculateEstimatedCompletionDate = () => {
        if (!order.productionStartDate || order.quantityProduced <= 0) {
            return null;
        }

        const startDate = new Date(order.productionStartDate);
        const today = new Date();
        const daysInProduction = differenceInDays(today, startDate) + 1; // +1 to include the start day
        
        if (daysInProduction <= 0) return null;

        const dailyAverage = order.quantityProduced / daysInProduction;

        if (dailyAverage <= 0) return null;

        const remainingDays = remainingQuantity / dailyAverage;
        const estimatedDate = addDays(today, Math.ceil(remainingDays));

        return estimatedDate;
    };

    const estimatedCompletionDate = calculateEstimatedCompletionDate();


    return (
        <Card className="glass-card flex flex-col h-full group p-4">
            <CardHeader className="p-2">
                 <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-base font-bold leading-tight flex items-center gap-2">
                           <StatusIcon className={cn("h-5 w-5", statusColor)}/>
                           {order.productName}
                        </CardTitle>
                        <CardDescription className="text-xs pt-1">Encomenda #{order.id.slice(-6).toUpperCase()}</CardDescription>
                    </div>
                     <div className={cn("inline-flex items-center gap-2 text-xs font-bold", statusColor)}>
                        <span>{order.status}</span>
                    </div>
                 </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 p-2">
                <div className="relative">
                    <Progress value={progress} className="h-8" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white text-xs font-bold drop-shadow-md">
                           {order.quantityProduced} / {order.quantity} ({progress.toFixed(0)}%)
                        </span>
                    </div>
                </div>

                <p className="text-center text-sm font-semibold text-muted-foreground">
                    Faltam {remainingQuantity} {order.unit}
                </p>
                 
                 <div className="text-sm text-muted-foreground space-y-1.5">
                    {order.clientName && (
                        <div className="flex items-center gap-2">
                            <User size={14} />
                            <span className="font-semibold">{order.clientName}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>Entrega: {new Date(order.deliveryDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                    </div>
                     {estimatedCompletionDate && order.status === 'Em produção' && (
                        <div className="flex items-center gap-2 text-blue-600 font-bold">
                            <TrendingUp size={14} />
                            <span>Previsão: {estimatedCompletionDate.toLocaleDateString('pt-BR')}</span>
                        </div>
                     )}
                 </div>
            </CardContent>
            {canEdit && <CardFooter className="flex flex-col sm:flex-row justify-center gap-2 p-2 pt-4">
                {order.status === 'Pendente' && (
                    <Button onClick={() => onUpdateStatus(order.id, 'Em produção')} className="flex-1" variant="outline">
                        <Play className="mr-2 h-4 w-4" />
                        Iniciar Produção
                    </Button>
                )}
                 {order.status === 'Em produção' && (
                    <>
                        <AddProductionLogDialog order={order} onAddLog={onAddProductionLog} />
                        <Button onClick={() => onUpdateStatus(order.id, 'Concluída')} className="flex-1" size="sm">
                            <Check className="mr-2 h-4 w-4" />
                            Concluir
                        </Button>
                    </>
                )}
                {order.status === 'Concluída' && (
                     <p className="text-sm text-muted-foreground">Esta encomenda foi finalizada.</p>
                )}
            </CardFooter>}
        </Card>
    );
}
