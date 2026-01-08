
"use client";

import type { Order } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, User, ClipboardList, Play, Check, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface OrderCardProps {
    order: Order;
    onUpdateStatus: (orderId: string, newStatus: 'Pendente' | 'Em produção' | 'Concluída') => void;
}

const statusConfig = {
    'Pendente': {
        color: 'text-yellow-600',
        icon: CircleHelp,
        progress: 10,
    },
    'Em produção': {
        color: 'text-blue-600',
        icon: Play,
        progress: 50,
    },
    'Concluída': {
        color: 'text-green-600',
        icon: Check,
        progress: 100,
    }
};

export function OrderCard({ order, onUpdateStatus }: OrderCardProps) {
    const { icon: StatusIcon, color: statusColor, progress } = statusConfig[order.status];

    return (
        <Card className="glass-card flex flex-col h-full group p-4">
            <CardHeader className="p-2">
                 <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-base font-bold leading-tight flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-primary"/>
                            {order.productName}
                        </CardTitle>
                        <CardDescription className="text-xs pt-1">Encomenda #{order.id}</CardDescription>
                    </div>
                     <div className={cn("inline-flex items-center gap-2 text-xs font-bold", statusColor)}>
                        <StatusIcon className="h-4 w-4"/>
                        <span>{order.status}</span>
                    </div>
                 </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 p-2">
                 <div className="flex items-baseline justify-center text-center py-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-4xl font-black text-primary">{order.quantity}</span>
                    <span className="text-sm font-bold text-muted-foreground ml-1">{order.unit}</span>
                </div>
                 
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
                 </div>
                 <div className="pt-2">
                    <Progress value={progress} className="h-2 [&>div]:bg-primary" />
                 </div>
            </CardContent>
            <CardFooter className="flex justify-center gap-2 p-2 pt-4">
                {order.status === 'Pendente' && (
                    <Button onClick={() => onUpdateStatus(order.id, 'Em produção')} className="flex-1" variant="outline">
                        <Play className="mr-2 h-4 w-4" />
                        Iniciar Produção
                    </Button>
                )}
                 {order.status === 'Em produção' && (
                    <Button onClick={() => onUpdateStatus(order.id, 'Concluída')} className="flex-1">
                        <Check className="mr-2 h-4 w-4" />
                        Concluir Produção
                    </Button>
                )}
                {order.status === 'Concluída' && (
                     <p className="text-sm text-muted-foreground">Esta encomenda foi finalizada.</p>
                )}
            </CardFooter>
        </Card>
    );
}
