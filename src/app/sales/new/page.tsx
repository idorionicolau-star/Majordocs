"use client";

import { useState, useEffect, useContext, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCRM } from '@/context/crm-context';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
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
import { MathInput } from "@/components/ui/math-input";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from '@/hooks/use-toast';
import type { Product, Sale, Location } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { CatalogProductSelector } from '@/components/catalog/catalog-product-selector';
import { InventoryContext } from '@/context/inventory-context';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import Link from 'next/link';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;

const formSchema = z.object({
    productName: z.string().nonempty({ message: "Por favor, selecione um produto." }),
    quantity: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
    }, z.number().min(0.01, "A quantidade deve ser maior que zero.").optional()),
    unit: z.enum(['un', 'm²', 'm', 'cj', 'outro']).optional(),
    unitPrice: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return undefined;
        const num = Number(val);
        return isNaN(num) ? undefined : num;
    }, z.number().min(0, "O preço não pode ser negativo.").optional()),
    location: z.string().optional(),
    discountType: z.enum(['fixed', 'percentage']).default('fixed'),
    discountValue: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0, "O desconto não pode ser negativo.").optional()),
    applyVat: z.boolean().default(false),
    vatPercentage: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0, "O IVA deve ser um valor positivo.").max(100).optional()),
    documentType: z.enum(['Venda a Dinheiro', 'Guia de Remessa', 'Factura', 'Factura Proforma', 'Recibo']),
    clientName: z.string().optional(),
    customerId: z.string().optional(),
    notes: z.string().optional(),
    date: z.date(),
    pendingPickup: z.boolean().default(false),
});

type AddSaleFormValues = z.infer<typeof formSchema>;

export default function NewSalePage() {
    const router = useRouter();
    const inventoryContext = useContext(InventoryContext);
    const { customers, addCustomer } = useCRM();
    const { toast } = useToast();

    const {
        products,
        catalogProducts,
        catalogCategories,
        user,
        locations,
        isMultiLocation,
        addSale,
    } = inventoryContext || { products: [], catalogProducts: [], catalogCategories: [], user: null, locations: [], isMultiLocation: false, addSale: async () => { } };

    const form = useForm<AddSaleFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            productName: "",
            location: "",
            unit: 'un',
            discountType: 'fixed',
            discountValue: 0,
            applyVat: false,
            vatPercentage: 17,
            documentType: 'Venda a Dinheiro',
            clientName: '',
            customerId: '',
            notes: '',
            date: new Date(),
            pendingPickup: false,
        },
    });

    useEffect(() => {
        const savedLocation = localStorage.getItem('majorstockx-last-product-location');
        const finalLocation = savedLocation && locations.some(l => l.id === savedLocation)
            ? savedLocation
            : (locations.length > 0 ? locations[0].id : "");

        form.reset({
            productName: "",
            quantity: undefined,
            unitPrice: undefined,
            unit: 'un',
            location: finalLocation,
            discountType: 'fixed',
            discountValue: 0,
            applyVat: false,
            vatPercentage: 17,
            documentType: 'Venda a Dinheiro',
            clientName: '',
            customerId: '',
            notes: '',
            date: new Date(),
            pendingPickup: false,
        });
    }, [form, locations]);

    const watchedProductName = useWatch({ control: form.control, name: 'productName' });
    const watchedQuantity = useWatch({ control: form.control, name: 'quantity' });
    const watchedUnitPrice = useWatch({ control: form.control, name: 'unitPrice' });
    const watchedLocation = useWatch({ control: form.control, name: 'location' });
    const watchedDiscountType = useWatch({ control: form.control, name: 'discountType' });
    const watchedDiscountValue = useWatch({ control: form.control, name: 'discountValue' });
    const watchedVatPercentage = useWatch({ control: form.control, name: 'vatPercentage' });

    const watchedApplyVat = useWatch({ control: form.control, name: 'applyVat' });
    const watchedCustomerId = useWatch({ control: form.control, name: 'customerId' });

    useEffect(() => {
        if (watchedCustomerId && watchedCustomerId !== 'new') {
            const customer = customers.find(c => c.id === watchedCustomerId);
            if (customer) {
                form.setValue('clientName', customer.name);
            }
        }
    }, [watchedCustomerId, customers, form]);

    const subtotal = (watchedUnitPrice || 0) * (watchedQuantity || 0);

    const discountAmount = useMemo(() => {
        const value = watchedDiscountValue || 0;
        if (watchedDiscountType === 'percentage') {
            return subtotal * (value / 100);
        }
        return value;
    }, [watchedDiscountType, watchedDiscountValue, subtotal]);

    const totalAfterDiscount = subtotal > discountAmount ? subtotal - discountAmount : 0;
    const vatPercentage = watchedVatPercentage || 0;
    const vatAmount = watchedApplyVat ? totalAfterDiscount * (vatPercentage / 100) : 0;
    const totalValue = totalAfterDiscount + vatAmount;

    const productsInStock = useMemo(() => {
        if (!products || !catalogProducts) return [];

        const productsForLocation = isMultiLocation && watchedLocation
            ? products.filter(p => p.location === watchedLocation)
            : products;

        const inStock = productsForLocation.filter(p => (p.stock - p.reservedStock) > 0);
        const inStockNames = [...new Set(inStock.map(p => p.name))];

        return catalogProducts.filter(p => inStockNames.includes(p.name));
    }, [products, catalogProducts, watchedLocation, isMultiLocation]);

    const selectedProductInstance = products?.find(p =>
        p.name === watchedProductName &&
        (isMultiLocation ? p.location === watchedLocation : true)
    );
    const availableStock = selectedProductInstance ? selectedProductInstance.stock - selectedProductInstance.reservedStock : 0;

    const handleProductSelect = (productName: string, product?: CatalogProduct) => {
        form.setValue('productName', productName, { shouldValidate: true });
        if (product) {
            form.setValue('unitPrice', product.price);
            form.setValue('unit', (product.unit as any) || 'un');
        } else {
            form.setValue('unitPrice', undefined);
            form.setValue('unit', 'un');
        }
    };

    useEffect(() => {
        if (selectedProductInstance && watchedQuantity) {
            const stockIsSufficient = watchedQuantity <= availableStock;
            if (!stockIsSufficient) {
                form.setError("quantity", { type: "manual", message: `Estoque insuficiente. Disponível: ${availableStock}` });
            } else {
                form.clearErrors("quantity");
            }
        } else if (watchedProductName) {
            const productExistsInLocation = products.some(p =>
                p.name === watchedProductName &&
                (isMultiLocation ? p.location === watchedLocation : true)
            );
            if (!productExistsInLocation) {
                form.setError("productName", { type: "manual", message: `Produto sem estoque nesta localização.` });
            } else {
                form.clearErrors("productName");
            }
        } else {
            form.clearErrors("productName");
        }
    }, [watchedQuantity, availableStock, selectedProductInstance, watchedProductName, watchedLocation, form, products]);

    async function onSubmit(values: AddSaleFormValues) {
        if (!user) {
            toast({ variant: "destructive", title: "Erro de Validação", description: "Utilizador não autenticado." });
            return;
        }

        if (isMultiLocation && !values.location) {
            form.setError("location", { type: "manual", message: "Selecione uma localização." });
            return;
        }

        if (!values.quantity || !values.unitPrice) {
            toast({ variant: "destructive", title: "Campos em Falta", description: "Por favor, preencha a quantidade e o preço." });
            return;
        }

        if (values.location) {
            localStorage.setItem('majorstockx-last-product-location', values.location);
        }

        let finalCustomerId = values.customerId === 'new' ? undefined : values.customerId;

        if (values.clientName && !finalCustomerId) {
            const normalizedName = values.clientName.trim();
            const existingCustomer = customers.find(c => c.name.toLowerCase() === normalizedName.toLowerCase());

            if (existingCustomer) {
                finalCustomerId = existingCustomer.id;
            } else {
                try {
                    const newId = await addCustomer({ name: normalizedName });
                    if (newId) finalCustomerId = newId;
                } catch (error) {
                    console.error("Failed to auto-create customer:", error);
                }
            }
        }

        const newSale: Omit<Sale, 'id' | 'guideNumber'> = {
            date: values.date.toISOString(),
            productId: products?.find(p => p.name === values.productName && (isMultiLocation ? p.location === values.location : true))?.id || 'unknown',
            productName: values.productName,
            quantity: values.quantity,
            unit: values.unit,
            unitPrice: values.unitPrice,
            subtotal: subtotal,
            discount: discountAmount,
            vat: vatAmount,
            totalValue: totalValue,
            amountPaid: totalValue,
            soldBy: user.username,
            status: values.documentType === 'Factura Proforma' ? 'Pendente' : (values.pendingPickup ? 'Pago' : 'Levantado'),
            location: values.location,
            documentType: values.documentType,
            clientName: values.clientName,
            customerId: finalCustomerId,
            notes: values.notes,
        };

        try {
            await addSale(newSale);
            toast({
                title: "Venda Registada",
                description: "O documento foi emitido e o stock atualizado.",
                action: <CheckCircle2 className="text-emerald-500" />
            });
            router.push('/sales');
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro", description: error.message });
        }
    }

    const isSubmitDisabled = !form.formState.isValid || form.formState.isSubmitting;

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="rounded-full">
                    <Link href="/sales">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Voltar às Vendas</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-headline font-bold">Nova Transação</h1>
                    <p className="text-muted-foreground text-sm">Crie uma fatura, recibo ou guia de remessa.</p>
                </div>
            </div>

            <Card className="glass-panel p-6 border-none shadow-lg">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="font-semibold leading-none tracking-tight">Itens da Venda</h3>
                            {isMultiLocation && (
                                <FormField
                                    control={form.control}
                                    name="location"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Localização da Venda</FormLabel>
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
                            <FormField
                                control={form.control}
                                name="productName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Produto a Vender</FormLabel>
                                        <FormControl>
                                            <CatalogProductSelector
                                                products={productsInStock}
                                                categories={catalogCategories || []}
                                                selectedValue={field.value}
                                                onValueChange={handleProductSelect}
                                                placeholder="Pesquise no catálogo ou stock local..."
                                            />
                                        </FormControl>
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
                                            <div className="flex justify-between items-baseline">
                                                <FormLabel>Quantidade</FormLabel>
                                                {selectedProductInstance && <p className="text-xs text-muted-foreground">Em Stock: {availableStock}</p>}
                                            </div>
                                            <FormControl>
                                                <MathInput
                                                    {...field}
                                                    onValueChange={field.onChange}
                                                    placeholder="0.0"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="unitPrice"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Preço Unitário</FormLabel>
                                            <FormControl>
                                                <MathInput
                                                    {...field}
                                                    onValueChange={field.onChange}
                                                    placeholder="0.00"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="space-y-4 rounded-lg border p-4">
                            <h3 className="font-semibold leading-none tracking-tight">Detalhes de Cliente e Documento</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="customerId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cliente Registado (CRM)</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || "new"}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione um cliente" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="new">-- Cliente Esporádico --</SelectItem>
                                                    {customers.map((c) => (
                                                        <SelectItem key={c.id} value={c.id}>
                                                            {c.name}
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
                                    name="clientName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome a constar no Documento</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Escreva o nome do cliente" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="documentType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Documento</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o tipo de documento" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Venda a Dinheiro">Venda a Dinheiro</SelectItem>
                                                    <SelectItem value="Factura Proforma">Factura Proforma</SelectItem>
                                                    <SelectItem value="Guia de Remessa">Guia de Remessa</SelectItem>
                                                    <SelectItem value="Factura">Factura</SelectItem>
                                                    <SelectItem value="Recibo">Recibo</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Data de Emissão</FormLabel>
                                        <DatePicker
                                            date={field.value}
                                            setDate={field.onChange}
                                        />
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="pendingPickup"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-4">
                                        <div className="space-y-0.5">
                                            <FormLabel className="cursor-pointer">Agendar Levantamento</FormLabel>
                                            <p className="text-[11px] text-muted-foreground">Marcar produto como "Não Levantado" (para entrega posterior)</p>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Accordion type="multiple" className="w-full space-y-4">
                            <AccordionItem value="financials" className="border rounded-lg">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                    <h3 className="font-semibold leading-none tracking-tight">Impostos e Descontos (Opcional)</h3>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="discountType"
                                                render={({ field }) => (
                                                    <FormItem className="space-y-3">
                                                        <FormLabel>Tipo de Desconto</FormLabel>
                                                        <FormControl>
                                                            <RadioGroup
                                                                onValueChange={field.onChange}
                                                                defaultValue={field.value}
                                                                className="flex items-center space-x-4 pt-1"
                                                            >
                                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                                    <FormControl>
                                                                        <RadioGroupItem value="fixed" id="d-fixed" />
                                                                    </FormControl>
                                                                    <FormLabel htmlFor="d-fixed" className="font-normal">Fixo (-MT)</FormLabel>
                                                                </FormItem>
                                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                                    <FormControl>
                                                                        <RadioGroupItem value="percentage" id="d-percentage" />
                                                                    </FormControl>
                                                                    <FormLabel htmlFor="d-percentage" className="font-normal">Percentual (%)</FormLabel>
                                                                </FormItem>
                                                            </RadioGroup>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="discountValue"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Valor a Descontar</FormLabel>
                                                        <FormControl>
                                                            <MathInput
                                                                {...field}
                                                                onValueChange={field.onChange}
                                                                placeholder="0.00"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="applyVat"
                                            render={({ field }) => (
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                                    <div className="space-y-0.5">
                                                        <FormLabel className="cursor-pointer">Adicionar Imposto Local (IVA)</FormLabel>
                                                    </div>
                                                    <FormControl>
                                                        <Switch
                                                            checked={field.value}
                                                            onCheckedChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        {watchedApplyVat && (
                                            <FormField
                                                control={form.control}
                                                name="vatPercentage"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Taxa do Imposto (%)</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" step="1" {...field} placeholder="17" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        )}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="notes" className="border rounded-lg">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                    <h3 className="font-semibold leading-none tracking-tight">Instruções / Notas da Venda (Opcional)</h3>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0">
                                    <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Adicione termos de entrega, notas para o cliente..."
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>


                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-5 mt-6 border border-emerald-100 dark:border-emerald-900 shadow-sm">
                            <div className="space-y-2">
                                <div className='flex justify-between items-center text-sm'>
                                    <span className='text-emerald-800 dark:text-emerald-300 opacity-80'>Subtotal</span>
                                    <span className='font-medium text-emerald-900 dark:text-emerald-200'>{formatCurrency(subtotal)}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className='flex justify-between items-center text-sm'>
                                        <span className='text-emerald-800 dark:text-emerald-300 opacity-80'>Desconto ({watchedDiscountType === 'percentage' ? `${watchedDiscountValue}%` : 'Fixo'})</span>
                                        <span className='font-medium text-rose-500'>- {formatCurrency(discountAmount)}</span>
                                    </div>
                                )}
                                {watchedApplyVat && (
                                    <div className='flex justify-between items-center text-sm'>
                                        <span className='text-emerald-800 dark:text-emerald-300 opacity-80'>Acréscimos ({vatPercentage}%)</span>
                                        <span className='font-medium text-amber-600 dark:text-amber-500'>+ {formatCurrency(vatAmount)}</span>
                                    </div>
                                )}
                                <Separator className='my-3 bg-emerald-200 dark:bg-emerald-800/50' />
                                <div className='flex justify-between items-center text-xl'>
                                    <span className='font-bold text-emerald-950 dark:text-emerald-100'>Total Final</span>
                                    <span className='font-bold text-emerald-600 dark:text-emerald-400'>{formatCurrency(totalValue)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-border">
                            <Button type="button" variant="outline" className="w-full sm:w-auto h-12" onClick={() => router.push('/sales')}>
                                Cancelar
                            </Button>
                            <Button type="submit" className="w-full sm:w-auto h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={isSubmitDisabled}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmar Venda e Sair
                            </Button>
                        </div>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
