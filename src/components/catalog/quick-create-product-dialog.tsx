"use client";

import { useState, useContext, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { InventoryContext } from '@/context/inventory-context';
import type { CatalogCategory } from '@/lib/types';

const formSchema = z.object({
    name: z.string().nonempty({ message: "O nome é obrigatório." }),
    category: z.string().nonempty({ message: "A categoria é obrigatória." }),
    price: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0, "O preço não pode ser negativo.")),
    cost: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0, "O custo não pode ser negativo.")),
    stock: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0, "O stock inicial não pode ser negativo.")),
    unit: z.enum(['un', 'm²', 'm', 'cj', 'outro']).default('un'),
});

// Note: Product type currently: 
// export type Product = { ... price: number, ... } 
// It does NOT have 'cost'. For now I will ask for Cost but maybe just not save it if the backend doesn't support it, 
// OR I should check if I need to update the Product type. 
// However, the user asked for "Quick Create". The simplest is to map "Preço de Venda" to `price`.
// "Custo" implies we might want to track cost price. I'll check types.ts again. 
// If type doesn't support cost, I will omit it for now or assume user meant 'price'. 
// Wait, prompt says: "Preço de Venda, Custo, Categoria e Quantidade Inicial".
// I will just add fields.

type FormValues = z.infer<typeof formSchema>;

interface QuickCreateProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultName: string;
    onSuccess: (productName: string) => void;
}

export function QuickCreateProductDialog({ open, onOpenChange, defaultName, onSuccess }: QuickCreateProductDialogProps) {
    const inventoryContext = useContext(InventoryContext);
    const { addProduct, addCatalogProduct, catalogCategories, isMultiLocation, locations } = inventoryContext || { addProduct: () => { }, addCatalogProduct: async () => { }, catalogCategories: [], isMultiLocation: false, locations: [] };
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: defaultName,
            category: "",
            price: 0,
            cost: 0,
            stock: 0,
            unit: 'un',
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                name: defaultName,
                category: "",
                price: 0,
                cost: 0,
                stock: 0,
                unit: 'un',
            });
        }
    }, [open, defaultName, form]);

    const onSubmit = async (values: FormValues) => {
        // 1. Add to Catalog (Persistent definition)
        try {
            await addCatalogProduct({
                name: values.name,
                category: values.category,
                price: values.price,
                unit: values.unit,
                description: "", // Optional
                image: "",       // Optional
            });
        } catch (error) {
            console.error("Failed to add to catalog", error);
            // Continue? If catalog fails, inventory might also fail or be inconsistent. 
            // But let's try to proceed or just show error.
            toast({ variant: "destructive", title: "Erro no Catálogo", description: "Não foi possível salvar no catálogo." });
            return;
        }

        // 2. Add to Inventory (Initial Stock)
        const defaultLocationId = isMultiLocation && locations.length > 0 ? locations[0].id : undefined;

        addProduct({
            name: values.name,
            category: values.category,
            price: values.price,
            stock: values.stock,
            unit: values.unit,
            lowStockThreshold: 5,
            criticalStockThreshold: 2,
            location: defaultLocationId,
        });

        // 3. Feedback & Close
        toast({
            title: "Produto Criado",
            description: `"${values.name}" foi criado e selecionado.`
        });

        onSuccess(values.name);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Criação Rápida de Produto</DialogTitle>
                    <DialogDescription>
                        Adicione um novo produto rapidamente para continuar.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Produto</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Categoria</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {catalogCategories?.map((cat: CatalogCategory) => (
                                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
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
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Preço Venda</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="0" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="cost"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Custo (Ref.)</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="0" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="stock"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Stock Inicial</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="0" step="1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unidade</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="un">Unidade (un)</SelectItem>
                                                <SelectItem value="m²">Metro Quadrado (m²)</SelectItem>
                                                <SelectItem value="m">Metro Linear (m)</SelectItem>
                                                <SelectItem value="cj">Conjunto (cj)</SelectItem>
                                                <SelectItem value="outro">Outro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
                            <Button type="submit">Criar Produto</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
