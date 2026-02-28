"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { MathInput } from "@/components/ui/math-input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Location, Product } from '@/lib/types';
import { useInventory } from "@/context/inventory-context";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useStorage } from "@/firebase/provider";
import { Loader2, Image as ImageIcon, X, ArrowLeft, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
    name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
    category: z.string().min(2, { message: "A categoria deve ter pelo menos 2 caracteres." }),
    price: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0, { message: "O preço não pode ser negativo." })),
    cost: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0, { message: "O custo não pode ser negativo." })),
    stock: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0, { message: "O estoque não pode ser negativo." })),
    unit: z.string().default('un'),
    lowStockThreshold: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0, { message: "O limite não pode ser negativo." })),
    criticalStockThreshold: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0, { message: "O limite não pode ser negativo." })),
    location: z.string().optional(),
});

type EditProductFormValues = z.infer<typeof formSchema>;

export default function EditInventoryProductPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { products, availableUnits, locations, isMultiLocation, updateProduct, catalogCategories, addCatalogCategory, categorizeProductWithAI } = useInventory();
    const storage = useStorage();
    const { toast } = useToast();

    const [product, setProduct] = useState<Product | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [isCategorizing, setIsCategorizing] = useState(false);

    const form = useForm<EditProductFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            category: "",
            price: 0,
            cost: 0,
            stock: 0,
            unit: 'un',
            lowStockThreshold: 10,
            criticalStockThreshold: 5,
            location: '',
        },
    });

    useEffect(() => {
        if (products.length > 0) {
            const found = products.find(p => p.id === id || p.instanceId === id);
            if (found) {
                setProduct(found);
                form.reset({
                    name: found.name,
                    category: found.category,
                    price: found.price,
                    cost: found.cost || 0,
                    stock: found.stock,
                    unit: found.unit || 'un',
                    lowStockThreshold: found.lowStockThreshold,
                    criticalStockThreshold: found.criticalStockThreshold,
                    location: found.location || '',
                });
                setPreviewUrl(found.imageUrl || null);
            }
        }
    }, [id, products, form]);

    async function onSubmit(values: EditProductFormValues) {
        if (!product) return;

        setIsSubmitting(true);
        let imageUrl = product.imageUrl;

        try {
            if (imageFile) {
                try {
                    const storageRef = ref(storage, `product-images/${Date.now()}_${imageFile.name}`);
                    const snapshot = await uploadBytes(storageRef, imageFile);
                    imageUrl = await getDownloadURL(snapshot.ref);
                } catch (error: any) {
                    console.error("Error uploading image:", error);
                    toast({
                        variant: "destructive",
                        title: "Erro no upload da imagem",
                        description: `Não foi possível enviar a imagem: ${error?.message || error}. O produto será salvo sem as alterações de imagem.`,
                    });
                }
            } else if (previewUrl === null && product.imageUrl) {
                imageUrl = null as any;
            }

            if (isCreatingCategory && values.category.trim() !== "") {
                const newCat = values.category.trim();
                const exists = catalogCategories?.some(c => c.name.toLowerCase() === newCat.toLowerCase());
                if (!exists && addCatalogCategory) {
                    await addCatalogCategory(newCat);
                }
            }

            await updateProduct(product.instanceId!, {
                ...product,
                ...values,
                imageUrl,
            });

            toast({
                title: "Produto Atualizado",
                description: "As alterações foram salvas com sucesso.",
            });
            router.push('/inventory');
        } catch (error) {
            console.error("Error updating product:", error);
            toast({
                variant: "destructive",
                title: "Erro ao Salvar",
                description: `Ocorreu um erro ao tentar atualizar o produto: ${(error as any)?.message || error}. Tente novamente.`,
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleNameBlur = async (e: React.FocusEvent<HTMLInputElement>, hookFormBlur: () => void) => {
        hookFormBlur();
        const currentName = e.target.value;
        const currentCategory = form.getValues('category');

        // Auto-categorize only if category is currently empty or user is trying to get a new one
        if (currentName.trim() && (!currentCategory || currentCategory === product?.category) && currentName !== product?.name && categorizeProductWithAI) {
            setIsCategorizing(true);
            try {
                const suggested = await categorizeProductWithAI(currentName);
                if (suggested) {
                    const exists = catalogCategories?.some(c => c.name.toLowerCase() === suggested.toLowerCase());
                    if (!exists) {
                        setIsCreatingCategory(true);
                    } else {
                        setIsCreatingCategory(false);
                    }
                    form.setValue('category', suggested, { shouldValidate: true });
                    toast({ title: "Categoria Atualizada (IA)", description: `O sistema sugeriu nova categoria: ${suggested}` });
                }
            } finally {
                setIsCategorizing(false);
            }
        }
    };

    if (!product) {
        return (
            <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-20">
                <Skeleton className="h-12 w-1/3" />
                <Card className="glass-panel p-6 border-none shadow-lg space-y-6">
                    <Skeleton className="h-[400px] w-full" />
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="rounded-full">
                    <Link href="/inventory">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Voltar ao Inventário</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-headline font-bold">Editar Produto</h1>
                    <p className="text-muted-foreground text-sm">Atualize os detalhes do produto no catálogo global.</p>
                </div>
            </div>

            <Card className="glass-panel p-6 border-none shadow-lg">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <div className="flex flex-col gap-3 mb-4">
                            <FormLabel>Imagem do Produto</FormLabel>
                            <div className="flex items-start gap-4">
                                <div className="relative h-24 w-24 rounded-lg border overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                                    {previewUrl ? (
                                        <>
                                            <img
                                                src={previewUrl}
                                                alt="Preview"
                                                className="h-full w-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-full"
                                                    onClick={() => {
                                                        setImageFile(null);
                                                        setPreviewUrl(null);
                                                    }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-slate-400">
                                            <ImageIcon className="h-8 w-8" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2 flex flex-col justify-center">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                const file = e.target.files[0];
                                                setImageFile(file);
                                                setPreviewUrl(URL.createObjectURL(file));
                                            }
                                        }}
                                        className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Adicione ou altere a imagem do produto. (JPG, PNG)
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nome do Produto</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ex: Grelha 30x30"
                                                {...field}
                                                onBlur={(e) => handleNameBlur(e, field.onBlur)}
                                            />
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
                                        <div className="flex items-center justify-between">
                                            <FormLabel className="flex items-center gap-2">
                                                Categoria
                                                {isCategorizing && <span className="text-xs text-indigo-500 animate-pulse">(IA a processar...)</span>}
                                            </FormLabel>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                                                onClick={() => {
                                                    setIsCreatingCategory(!isCreatingCategory);
                                                }}
                                            >
                                                {isCreatingCategory ? "Escolher Existente" : "+ Nova Categoria"}
                                            </Button>
                                        </div>
                                        {isCreatingCategory ? (
                                            <FormControl>
                                                <Input placeholder="Nome da nova categoria..." {...field} />
                                            </FormControl>
                                        ) : (
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione..." />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {(field.value && !catalogCategories?.some(c => c.name === field.value)) && (
                                                        <SelectItem value={field.value}>{field.value}</SelectItem>
                                                    )}
                                                    {catalogCategories?.map(cat => (
                                                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
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
                                        <FormLabel>Localização</FormLabel>
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Preço de Venda (MT)</FormLabel>
                                        <FormControl>
                                            <MathInput
                                                {...field}
                                                onValueChange={field.onChange}
                                                ref={field.ref}
                                            />
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
                                        <FormLabel>Preço de Custo (MT)</FormLabel>
                                        <FormControl>
                                            <MathInput
                                                {...field}
                                                onValueChange={field.onChange}
                                                ref={field.ref}
                                                className={(!field.value || field.value <= 0) ? "border-amber-500 focus-visible:ring-amber-500" : ""}
                                            />
                                        </FormControl>
                                        {(!field.value || field.value <= 0) && (
                                            <div className="flex items-start gap-2 mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md text-amber-800 dark:text-amber-400 text-xs">
                                                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                                <p><strong>Atenção:</strong> Um custo igual a 0 fará com que o lucro reportado seja 100%. Tem a certeza de que não há custo associado?</p>
                                            </div>
                                        )}
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
                                        <FormLabel>Estoque</FormLabel>
                                        <FormControl>
                                            <MathInput
                                                {...field}
                                                onValueChange={field.onChange}
                                                ref={field.ref}
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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="lowStockThreshold"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Alerta Baixo</FormLabel>
                                        <FormControl>
                                            <MathInput
                                                {...field}
                                                onValueChange={field.onChange}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="criticalStockThreshold"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Alerta Crítico</FormLabel>
                                        <FormControl>
                                            <MathInput
                                                {...field}
                                                onValueChange={field.onChange}
                                                ref={field.ref}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-border mt-8">
                            <Button type="button" variant="outline" className="w-full sm:w-auto h-12" onClick={() => router.push('/inventory')}>
                                Cancelar
                            </Button>
                            <Button type="submit" className="w-full sm:w-auto h-12 px-8" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </div>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
