"use client";

import { useState, useMemo, useContext } from 'react';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Product, Location } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { InventoryContext } from '@/context/inventory-context';
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { MathInput } from "@/components/ui/math-input";

const formSchema = z.object({
    productName: z.string().min(1, { message: "Por favor, selecione um produto." }),
    fromLocationId: z.string().min(1, { message: "Por favor, selecione a localização de origem." }),
    toLocationId: z.string().min(1, { message: "Por favor, selecione a localização de destino." }),
    quantity: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0.01, { message: "A quantidade deve ser maior que 0.01." })),
}).refine(data => data.fromLocationId !== data.toLocationId, {
    message: "As localizações de origem e destino não podem ser as mesmas.",
    path: ["toLocationId"],
});

type TransferFormValues = z.infer<typeof formSchema>;

interface TransferStockDialogProps {
    onTransfer: (productName: string, fromLocationId: string, toLocationId: string, quantity: number) => void;
}

function TransferStockForm({ onTransfer, setOpen }: TransferStockDialogProps & { setOpen: (open: boolean) => void }) {
    const { products, locations } = useContext(InventoryContext) || { products: [], locations: [] };

    const form = useForm<TransferFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            productName: "",
            fromLocationId: "",
            toLocationId: "",
            quantity: 1,
        },
    });

    const watchedProductName = useWatch({ control: form.control, name: 'productName' });
    const watchedFromLocation = useWatch({ control: form.control, name: 'fromLocationId' });
    const watchedQuantity = form.watch('quantity');

    const uniqueProducts = useMemo(() => {
        if (!products) return [];
        const seen = new Set<string>();
        return products.filter(p => {
            if (seen.has(p.name)) {
                return false;
            }
            seen.add(p.name);
            return true;
        });
    }, [products]);

    const availableStock = useMemo(() => {
        if (!watchedProductName || !watchedFromLocation || !products) return 0;
        const productInstance = products.find(p => p.name === watchedProductName && p.location === watchedFromLocation);
        return productInstance ? productInstance.stock - productInstance.reservedStock : 0;
    }, [products, watchedProductName, watchedFromLocation]);

    function onSubmit(values: TransferFormValues) {
        if (values.quantity > availableStock) {
            form.setError("quantity", { type: "manual", message: `Stock insuficiente. Disponível: ${availableStock}` });
            return;
        }
        onTransfer(values.productName, values.fromLocationId, values.toLocationId, values.quantity);
        setOpen(false);
    }

    if (!products || !locations) return null;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                <FormField
                    control={form.control}
                    name="productName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Produto</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um produto" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {uniqueProducts.map(product => (
                                        <SelectItem key={product.name} value={product.name}>{product.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="fromLocationId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>De</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Origem" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {locations.map(location => (
                                            <SelectItem key={location.id} value={location.id}>
                                                {location.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="toLocationId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Para</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Destino" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {locations.map(location => (
                                            <SelectItem key={location.id} value={location.id}>
                                                {location.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                            <div className="flex justify-between items-center">
                                <FormLabel>Quantidade</FormLabel>
                                {watchedProductName && watchedFromLocation && <p className="text-xs text-muted-foreground">Disponível: {availableStock}</p>}
                            </div>
                            <FormControl>
                                <MathInput {...field} onValueChange={field.onChange} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={() => setOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                    <Button type="submit" className="w-full sm:w-auto">Transferir</Button>
                </div>
            </form>
        </Form>
    );
}

export function TransferStockDialog({ onTransfer }: TransferStockDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={setOpen}
            trigger={
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="shadow-sm h-12 w-12 rounded-2xl flex-shrink-0">
                                <Truck className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Transferir Stock</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            }
            title="Transferir Stock"
            description="Mova produtos entre localizações do inventário."
        >
            <TransferStockForm onTransfer={onTransfer} setOpen={setOpen} />
        </ResponsiveDialog>
    );
}
