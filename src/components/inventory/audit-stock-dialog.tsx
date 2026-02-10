"use client";

import { useState, useContext } from 'react';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { MathInput } from "@/components/ui/math-input";
import { FileCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Product } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { InventoryContext } from '@/context/inventory-context';
import { Textarea } from '../ui/textarea';
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

const formSchema = z.object({
    physicalCount: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0, { message: "A contagem não pode ser negativa." })),
    reason: z.string().min(3, { message: "O motivo deve ter pelo menos 3 caracteres." }),
});

type AuditStockFormValues = z.infer<typeof formSchema>;

interface AuditStockDialogProps {
    product: Product;
    trigger: 'icon' | 'button' | 'card-button';
}

function AuditStockForm({ product, setOpen }: Omit<AuditStockDialogProps, 'trigger'> & { setOpen: (open: boolean) => void }) {
    const { auditStock } = useContext(InventoryContext) || {};
    const form = useForm<AuditStockFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            physicalCount: product.stock,
            reason: 'Auditoria de rotina',
        },
    });

    function onSubmit(values: AuditStockFormValues) {
        if (!auditStock) return;
        auditStock(product.id, values.physicalCount, values.reason);
        setOpen(false);
    }

    const systemStock = product.stock;
    const physicalCount = form.watch('physicalCount');
    const adjustment = physicalCount - systemStock;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 bg-muted/50">
                    <div className="text-center border-r">
                        <p className="text-sm font-medium text-muted-foreground">No Sistema</p>
                        <p className="text-2xl font-bold">{systemStock}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-muted-foreground">Diferença</p>
                        <p className={`text-2xl font-bold ${adjustment > 0 ? 'text-green-500' : adjustment < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {adjustment > 0 ? `+${adjustment}` : adjustment}
                        </p>
                    </div>
                </div>

                <FormField
                    control={form.control}
                    name="physicalCount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Contagem Física Atual</FormLabel>
                            <FormControl>
                                <MathInput
                                    {...field}
                                    onValueChange={field.onChange}
                                    placeholder="0"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Motivo do Ajuste</FormLabel>
                            <FormControl>
                                <Textarea {...field} className="min-h-[80px]" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                    <Button type="submit" className="w-full sm:w-auto">Confirmar Ajuste</Button>
                </div>
            </form>
        </Form>
    );
}

const AuditStockTrigger = ({ trigger }: { trigger: 'icon' | 'button' | 'card-button' }) => {
    const buttonClasses = "text-amber-500 hover:bg-amber-500/10 hover:text-amber-600 dark:text-yellow-500 dark:hover:bg-yellow-500/10 dark:hover:text-yellow-400";

    if (trigger === 'icon') {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className={`p-3 h-auto w-auto rounded-xl transition-all ${buttonClasses}`}>
                            <FileCheck className="h-4 w-4" />
                            <span className="sr-only">Auditar Stock</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Auditar Stock</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className={`flex-1 h-8 sm:h-9 ${buttonClasses}`}>
                        <FileCheck className="h-4 w-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent><p>Auditar Stock</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export function AuditStockDialog({ product, trigger }: AuditStockDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={setOpen}
            trigger={<AuditStockTrigger trigger={trigger} />}
            title={`Auditoria: ${product.name}`}
            description="Informe a contagem física real para sincronizar o estoque."
        >
            <AuditStockForm product={product} setOpen={setOpen} />
        </ResponsiveDialog>
    );
}
