"use client";

import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase/provider';
import { collection, addDoc } from "firebase/firestore";
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
import { MathInput } from "@/components/ui/math-input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from '@/hooks/use-toast';
import type { Location, Product } from '@/lib/types';
import { InventoryContext } from '@/context/inventory-context';
import { CatalogProductSelector } from '@/components/catalog/catalog-product-selector';
import { Card } from "@/components/ui/card";
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;

const formSchema = z.object({
    productName: z.string().nonempty({ message: "Por favor, selecione um produto." }),
    quantity: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0.01, { message: "A quantidade deve ser maior que zero." })),
    unit: z.string().default('un'),
    location: z.string().optional(),
});

type AddProductionFormValues = z.infer<typeof formSchema>;

export default function NewProductionPage() {
    const router = useRouter();
    const firestore = useFirestore();
    const inventoryContext = useContext(InventoryContext);
    const { toast } = useToast();

    const {
        catalogProducts,
        catalogCategories,
        locations,
        isMultiLocation,
        availableUnits,
        companyId,
        user
    } = inventoryContext || { catalogProducts: [], catalogCategories: [], locations: [], isMultiLocation: false, availableUnits: [], companyId: null, user: null };

    const form = useForm<AddProductionFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            productName: "",
            location: "",
            unit: "un",
        },
    });

    const handleProductSelect = (productName: string, product?: CatalogProduct) => {
        form.setValue('productName', productName);
        if (product) {
            form.setValue('unit', product.unit || 'un');
        }
    };

    useEffect(() => {
        const savedLocation = localStorage.getItem('majorstockx-last-product-location');
        const finalLocation = savedLocation && locations.some(l => l.id === savedLocation)
            ? savedLocation
            : (locations.length > 0 ? locations[0].id : "");

        form.reset({
            productName: "",
            location: finalLocation,
            unit: 'un',
        });
    }, [form, locations]);

    async function onSubmit(values: AddProductionFormValues) {
        if (!firestore || !companyId || !user) {
            toast({ variant: "destructive", title: "Erro de Autenticação", description: "Utilizador não autenticado ou sessão inválida." });
            return;
        }

        if (isMultiLocation && !values.location) {
            form.setError("location", { type: "manual", message: "Selecione uma localização." });
            return;
        }

        if (values.location) {
            localStorage.setItem('majorstockx-last-product-location', values.location);
        }

        const newProduction: any = {
            date: new Date().toISOString().split('T')[0],
            productName: values.productName,
            quantity: values.quantity,
            unit: values.unit || 'un',
            registeredBy: user.username || 'Desconhecido',
            status: 'Concluído'
        };

        if (isMultiLocation && values.location) {
            newProduction.location = values.location;
        }

        try {
            const productionsRef = collection(firestore, `companies/${companyId}/productions`);
            await addDoc(productionsRef, newProduction);

            toast({
                title: "Produção Registrada",
                description: `O registo de ${newProduction.quantity} ${newProduction.unit} de ${newProduction.productName} foi criado.`,
                action: <CheckCircle2 className="text-emerald-500" />
            });
            router.push('/production');
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro", description: error.message });
        }
    }

    const isSubmitDisabled = !form.formState.isValid || form.formState.isSubmitting;

    if (!inventoryContext) {
        return null;
    }

    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="rounded-full">
                    <Link href="/production">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Voltar à Produção</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-headline font-bold">Novo Registo de Produção</h1>
                    <p className="text-muted-foreground text-sm">Adicione uma nova produção ao sistema. O stock será atualizado automaticamente ao ser transferido.</p>
                </div>
            </div>

            <Card className="glass-panel p-6 border-none shadow-lg">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="font-semibold leading-none tracking-tight">Informações de Produção</h3>
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="productName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Produto Fabricado</FormLabel>
                                            <CatalogProductSelector
                                                selectedValue={field.value}
                                                onValueChange={handleProductSelect}
                                                products={catalogProducts}
                                                categories={catalogCategories}
                                                placeholder="Pesquise no catálogo..."
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="quantity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Quantidade Produzida</FormLabel>
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
                                        name="unit"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Unidade</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {availableUnits.map((u: string) => (
                                                            <SelectItem key={u} value={u}>{u}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                {isMultiLocation && (
                                    <FormField
                                        control={form.control}
                                        name="location"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Localização de Fabrico</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione uma localização" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {locations.map((location: Location) => (
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
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-border">
                            <Button type="button" variant="outline" className="w-full sm:w-auto h-12" onClick={() => router.push('/production')}>
                                Cancelar
                            </Button>
                            <Button type="submit" className="w-full sm:w-auto h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitDisabled}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Registo e Sair
                            </Button>
                        </div>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
