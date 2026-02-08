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
    unit: z.enum(['un', 'm²', 'm', 'cj', 'outro']).default('un'),
});

type FormValues = z.infer<typeof formSchema>;

interface QuickCreateProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultName: string;
    onSuccess: (productName: string, productDetails?: { unit: string; category: string }) => void;
}

export function QuickCreateProductDialog({ open, onOpenChange, defaultName, onSuccess }: QuickCreateProductDialogProps) {
    const inventoryContext = useContext(InventoryContext);
    const { addCatalogProduct, catalogCategories } = inventoryContext || { addCatalogProduct: async () => { }, catalogCategories: [] };
    const { toast } = useToast();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: defaultName,
            category: "",
            unit: 'un',
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                name: defaultName,
                category: "",
                unit: 'un',
            });
        }
    }, [open, defaultName, form]);

    const onSubmit = async (values: FormValues) => {
        // 1. Add to Catalog ONLY (Persistent definition)
        try {
            await addCatalogProduct({
                name: values.name,
                category: values.category,
                price: 0, // Default to 0 for now, can be edited later
                unit: values.unit,
                description: "",
                image: "",
            });
        } catch (error) {
            console.error("Failed to add to catalog", error);
            toast({ variant: "destructive", title: "Erro no Catálogo", description: "Não foi possível salvar no catálogo." });
            return;
        }

        // 3. Feedback & Close
        toast({
            title: "Produto Criado",
            description: `"${values.name}" foi adicionado ao catálogo.`
        });

        // Pass back details to auto-fill
        onSuccess(values.name, { unit: values.unit, category: values.category });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Novo Produto de Catálogo</DialogTitle>
                    <DialogDescription>
                        Defina o produto para o adicionar ao catálogo e usar na produção.
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
                        <div className="grid grid-cols-2 gap-4">
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
