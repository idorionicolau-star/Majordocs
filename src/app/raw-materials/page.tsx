"use client";

import React, { useState, useContext, useMemo, useCallback } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PlusCircle, Trash2, Edit, AlertTriangle, Printer, Download } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Skeleton } from '@/components/ui/skeleton';
import { RawMaterial, Recipe, Product } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Schemas
const rawMaterialSchema = z.object({
    name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
    stock: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0, "O stock não pode ser negativo.")),
    unit: z.string().min(1, "Selecione uma unidade"),
    lowStockThreshold: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0, "O limite deve ser um número positivo.")),
    cost: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0, "O custo não pode ser negativo.").optional()),
});
type RawMaterialFormValues = z.infer<typeof rawMaterialSchema>;

const recipeIngredientSchema = z.object({
    rawMaterialId: z.string(),
    rawMaterialName: z.string(),
    quantity: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(0.01, "A quantidade deve ser positiva.")),
});
const recipeSchema = z.object({
    productName: z.string().nonempty("Selecione um produto final."),
    ingredients: z.array(recipeIngredientSchema).min(1, "Adicione pelo menos um ingrediente."),
});
type RecipeFormValues = z.infer<typeof recipeSchema>;

const productionSchema = z.object({
    recipeId: z.string().nonempty("Selecione uma receita."),
    quantity: z.preprocess((val) => {
        if (val === undefined || val === "" || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : num;
    }, z.number().min(1, "A quantidade a produzir deve ser pelo menos 1.")),
});
type ProductionFormValues = z.infer<typeof productionSchema>;


// Raw Materials Manager Component
const RawMaterialsManager = () => {
    const { rawMaterials, addRawMaterial, updateRawMaterial, deleteRawMaterial, loading, companyData, availableUnits } = useContext(InventoryContext)!;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [materialToEdit, setMaterialToEdit] = useState<RawMaterial | null>(null);
    const [materialToDelete, setMaterialToDelete] = useState<RawMaterial | null>(null);
    const { toast } = useToast();

    const form = useForm<RawMaterialFormValues>({
        resolver: zodResolver(rawMaterialSchema),
        defaultValues: { name: '', stock: 0, unit: 'un', lowStockThreshold: 0, cost: 0 },
    });

    const handleOpenDialog = (material: RawMaterial | null = null) => {
        setMaterialToEdit(material);
        form.reset(material ? { ...material, cost: material.cost || 0 } : { name: '', stock: 0, unit: 'un', lowStockThreshold: 10, cost: 0 });
        setIsDialogOpen(true);
    };

    const onSubmit = async (values: RawMaterialFormValues) => {
        if (materialToEdit) {
            await updateRawMaterial(materialToEdit.id, values);
        } else {
            await addRawMaterial(values);
        }
        setIsDialogOpen(false);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '', 'height=800,width=800');
        if (printWindow) {
            printWindow.document.write('<!DOCTYPE html><html><head><title>Relatório de Matérias-Primas</title>');
            printWindow.document.write(`
                <style>
                    body { font-family: sans-serif; padding: 2rem; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            `);
            printWindow.document.write('</head><body>');
            printWindow.document.write(`<h1>Relatório de Matérias-Primas - ${companyData?.name || ''}</h1>`);
            printWindow.document.write('<table><thead><tr><th>Nome</th><th>Stock</th><th>Custo Unit.</th><th>Unidade</th><th>Nível Mínimo</th></tr></thead><tbody>');
            (rawMaterials || []).forEach(material => {
                printWindow.document.write(`<tr><td>${material.name}</td><td>${material.stock}</td><td>${material.cost ? formatCurrency(material.cost) : 'N/A'}</td><td>${material.unit}</td><td>${material.lowStockThreshold}</td></tr>`);
            });
            printWindow.document.write('</tbody></table></body></html>');
            printWindow.document.close();
            setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
        }
    };

    const handleDownload = async () => {
        const { pdf } = await import('@react-pdf/renderer');
        const { RawMaterialsPDF } = await import('@/components/raw-materials/RawMaterialsPDF');

        const doc = <RawMaterialsPDF type="materials" data={rawMaterials || []} company={companyData || null} />;
        const blob = await pdf(doc).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Materias_Primas_${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <Skeleton className="h-64 w-full" />;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestão de Insumos</CardTitle>
                <CardDescription>Adicione e gira o stock das suas matérias-primas.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row justify-between mb-6 gap-3 pt-2">
                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto bg-primary text-white">
                            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Matéria-Prima
                        </Button>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button onClick={handleDownload} variant="outline" size="sm" className="flex-1 sm:flex-none"><Download className="mr-2 h-4 w-4" /> PDF</Button>
                        <Button onClick={handlePrint} variant="outline" size="sm" className="flex-1 sm:flex-none"><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
                    </div>
                </div>
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Stock Atual</TableHead>
                                <TableHead>Custo Unit.</TableHead>
                                <TableHead>Unidade</TableHead>
                                <TableHead>Nível Mínimo</TableHead>
                                <TableHead><span className="sr-only">Ações</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rawMaterials && rawMaterials.length > 0 ? rawMaterials.map((material) => (
                                <TableRow key={material.id}>
                                    <TableCell className="font-medium">{material.name}</TableCell>
                                    <TableCell>{material.stock}</TableCell>
                                    <TableCell>{material.cost ? formatCurrency(material.cost) : 'N/A'}</TableCell>
                                    <TableCell>{material.unit}</TableCell>
                                    <TableCell>{material.lowStockThreshold}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(material)}><Edit className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMaterialToDelete(material)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24">Nenhuma matéria-prima cadastrada.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{materialToEdit ? 'Editar' : 'Adicionar'} Matéria-Prima</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="stock" render={({ field }) => (
                                    <FormItem><FormLabel>Stock Inicial</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="cost" render={({ field }) => (
                                    <FormItem><FormLabel>Custo Unitário</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="unit" render={({ field }) => (
                                <FormItem><FormLabel>Unidade</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                    {availableUnits.map((u: string) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                </SelectContent></Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                                <FormItem><FormLabel>Nível Mínimo de Stock</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <DialogFooter>
                                <Button type="submit">Salvar</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!materialToDelete} onOpenChange={() => setMaterialToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Tem a certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { deleteRawMaterial(materialToDelete!.id); setMaterialToDelete(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Apagar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};

// Recipes Manager Component
const RecipesManager = () => {
    const { recipes, catalogProducts, rawMaterials, addRecipe, updateRecipe, deleteRecipe, loading, companyData } = useContext(InventoryContext)!;
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [recipeToEdit, setRecipeToEdit] = useState<Recipe | null>(null);
    const { toast } = useToast();

    const form = useForm<RecipeFormValues>({
        resolver: zodResolver(recipeSchema),
        defaultValues: { productName: '', ingredients: [] },
    });

    const handleOpenDialog = (recipe: Recipe | null = null) => {
        setRecipeToEdit(recipe);
        form.reset(recipe ? { ...recipe } : { productName: '', ingredients: [] });
        setIsDialogOpen(true);
    };

    const addIngredient = () => {
        const ingredients = form.getValues('ingredients');
        const firstMaterial = rawMaterials[0];
        if (firstMaterial) {
            form.setValue('ingredients', [...ingredients, { rawMaterialId: firstMaterial.id, rawMaterialName: firstMaterial.name, quantity: 1 }]);
        }
    };

    const removeIngredient = (index: number) => {
        const ingredients = form.getValues('ingredients');
        form.setValue('ingredients', ingredients.filter((_, i) => i !== index));
    }

    const onSubmit = async (values: RecipeFormValues) => {
        if (recipeToEdit) {
            await updateRecipe(recipeToEdit.id, values);
        } else {
            await addRecipe(values);
        }
        setIsDialogOpen(false);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '', 'height=800,width=800');
        if (printWindow) {
            printWindow.document.write('<!DOCTYPE html><html><head><title>Relatório de Receitas</title>');
            printWindow.document.write(`<style>body { font-family: sans-serif; padding: 2rem; } h2 { border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 2rem; } ul { list-style: none; padding-left: 0; } </style>`);
            printWindow.document.write('</head><body>');
            printWindow.document.write(`<h1>Relatório de Receitas - ${companyData?.name || ''}</h1>`);
            recipes.forEach(recipe => {
                printWindow.document.write(`<h2>${recipe.productName}</h2>`);
                printWindow.document.write('<ul>');
                recipe.ingredients.forEach(ing => {
                    printWindow.document.write(`<li>${ing.quantity} ${rawMaterials.find(rm => rm.id === ing.rawMaterialId)?.unit || ''} de ${ing.rawMaterialName}</li>`);
                });
                printWindow.document.write('</ul>');
            });
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
        }
    };

    const handleDownload = async () => {
        const { pdf } = await import('@react-pdf/renderer');
        const { RawMaterialsPDF } = await import('@/components/raw-materials/RawMaterialsPDF');

        const doc = <RawMaterialsPDF type="recipes" data={recipes || []} company={companyData || null} />;
        const blob = await pdf(doc).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Receitas_${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <Skeleton className="h-64 w-full" />;

    return (
        <Card>
            <CardHeader><CardTitle>Receitas de Produção</CardTitle><CardDescription>Defina os componentes para cada produto final.</CardDescription></CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row justify-between mb-6 gap-3 pt-2">
                    <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto order-first sm:order-last bg-primary text-white">
                        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Receita
                    </Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button onClick={handleDownload} variant="outline" size="sm" className="flex-1 sm:flex-none"><Download className="mr-2 h-4 w-4" /> PDF</Button>
                        <Button onClick={handlePrint} variant="outline" size="sm" className="flex-1 sm:flex-none"><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {recipes.map(recipe => (
                        <Card key={recipe.id} className="flex flex-col">
                            <CardHeader><CardTitle>{recipe.productName}</CardTitle></CardHeader>
                            <CardContent className="flex-grow">
                                <ul>
                                    {recipe.ingredients.map((ing, index) => (
                                        <li key={index} className="text-sm">
                                            {ing.quantity} {rawMaterials.find(rm => rm.id === ing.rawMaterialId)?.unit || ''} de {ing.rawMaterialName}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(recipe)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteRecipe(recipe.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>{recipeToEdit ? 'Editar' : 'Criar'} Receita</DialogTitle></DialogHeader>
                    <ScrollArea className="max-h-[60vh] p-4">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField control={form.control} name="productName" render={({ field }) => (
                                    <FormItem><FormLabel>Produto Final</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                        {catalogProducts.map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                                    </SelectContent></Select><FormMessage /></FormItem>
                                )} />
                                <div>
                                    <Label>Ingredientes</Label>
                                    {form.watch('ingredients').map((ing, index) => (
                                        <div key={index} className="flex items-center gap-2 mt-2">
                                            <FormField control={form.control} name={`ingredients.${index}.rawMaterialId`} render={({ field }) => (
                                                <FormItem className="flex-1"><Select onValueChange={(value) => {
                                                    const material = rawMaterials.find(rm => rm.id === value);
                                                    field.onChange(value);
                                                    form.setValue(`ingredients.${index}.rawMaterialName`, material?.name || '');
                                                }} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                                        {rawMaterials.map(rm => <SelectItem key={rm.id} value={rm.id}>{rm.name}</SelectItem>)}
                                                    </SelectContent></Select></FormItem>
                                            )} />
                                            <FormField control={form.control} name={`ingredients.${index}.quantity`} render={({ field }) => (
                                                <FormItem><FormControl><Input type="number" {...field} className="w-24" /></FormControl></FormItem>
                                            )} />
                                            <Button type="button" variant="destructive" size="icon" onClick={() => removeIngredient(index)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={addIngredient} className="mt-2">Adicionar Ingrediente</Button>
                                </div>
                                <DialogFooter><Button type="submit">Salvar Receita</Button></DialogFooter>
                            </form>
                        </Form>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </Card>
    )
};

// Production From Recipe Component
const ProductionFromRecipe = () => {
    const { recipes, addProduction, loading } = useContext(InventoryContext)!;
    const { toast } = useToast();
    const form = useForm<ProductionFormValues>({
        resolver: zodResolver(productionSchema),
        defaultValues: { recipeId: '', quantity: 1 },
    });

    const onSubmit = async (values: ProductionFormValues) => {
        try {
            const recipe = recipes.find(r => r.id === values.recipeId);
            if (!recipe) {
                toast({ variant: 'destructive', title: 'Erro', description: 'Receita não encontrada.' });
                return;
            }
            // We need to pass unit. Ideally we get it from product catalog, but addProduction handles catalog lookup if we don't pass unit? 
            // addProduction signature: (prodData: Omit<Production, 'id' | 'date' | 'registeredBy' | 'status'>)
            // It expects unit. 
            // In the previous addProduction implementation, I set unit default to 'un' if not provided or found in catalog?
            // "unit: catalogProduct?.unit || 'un'" in addProduction. So we can pass 'un' or let it handle it?
            // Wait, addProduction takes "unit". If I don't pass it, it might be undefined.
            // My updated addProduction: "const { productName, quantity, location, orderId, unit } = prodData;"
            // "unit: unit || catalogProduct?.unit || 'un',"
            // So if I pass undefined, it tries to find it. Good.

            await addProduction({
                productName: recipe.productName,
                quantity: values.quantity,
                // unit: recipe.productUnit? No recipe doesn't store unit usually, product does.
            });

            toast({ title: 'Sucesso', description: 'Produção registada.' });
            form.reset();
        } catch (error: any) {
            // Error is already toasted in context, but we ensure form reset or not?
        }
    };

    if (loading) return <Skeleton className="h-64 w-full" />;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Registrar Produção por Receita</CardTitle>
                <CardDescription>Selecione uma receita para registrar a produção e abater a matéria-prima do stock.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="recipeId" render={({ field }) => (
                            <FormItem><FormLabel>Receita</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>
                                {recipes.map(r => <SelectItem key={r.id} value={r.id}>{r.productName}</SelectItem>)}
                            </SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="quantity" render={({ field }) => (
                            <FormItem><FormLabel>Quantidade a Produzir</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full border-2 border-foreground shadow-[4px_4px_0px_hsl(var(--foreground))] hover:shadow-[2px_2px_0px_hsl(var(--foreground))] active:shadow-[1px_1px_0px_hsl(var(--foreground))] transition-all">Registrar Produção</Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

// Costs Manager Component
const CostsManager = () => {
    const { recipes, rawMaterials, loading, companyData } = useContext(InventoryContext)!;
    const { toast } = useToast();

    const recipeCosts = useMemo(() => {
        if (!recipes || !rawMaterials) return [];

        return recipes.map(recipe => {
            let totalCost = 0;
            let isCalculable = true;
            let missingMaterials: string[] = [];

            recipe.ingredients.forEach(ingredient => {
                const material = rawMaterials.find(rm => rm.id === ingredient.rawMaterialId);
                if (material && material.cost !== undefined) {
                    totalCost += ingredient.quantity * material.cost;
                } else {
                    isCalculable = false;
                    if (material) {
                        missingMaterials.push(material.name);
                    }
                }
            });

            return {
                ...recipe,
                totalCost,
                isCalculable,
                missingMaterialsTooltip: `Custo não definido para: ${missingMaterials.join(', ')}`
            };
        });
    }, [recipes, rawMaterials]);

    const handlePrint = () => {
        const printWindow = window.open('', '', 'height=800,width=800');
        if (printWindow) {
            printWindow.document.write('<!DOCTYPE html><html><head><title>Relatório de Custos</title>');
            printWindow.document.write(`<style>body { font-family: sans-serif; padding: 2rem; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style>`);
            printWindow.document.write('</head><body>');
            printWindow.document.write(`<h1>Relatório de Custos de Produção - ${companyData?.name || ''}</h1>`);
            printWindow.document.write('<table><thead><tr><th>Produto Final</th><th>Custo de Produção / Unidade</th></tr></thead><tbody>');
            recipeCosts.forEach(recipe => {
                printWindow.document.write(`<tr><td>${recipe.productName}</td><td>${recipe.isCalculable ? formatCurrency(recipe.totalCost) : 'Incalculável'}</td></tr>`);
            });
            printWindow.document.write('</tbody></table></body></html>');
            printWindow.document.close();
            setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
        }
    };

    const handleDownload = async () => {
        const { pdf } = await import('@react-pdf/renderer');
        const { RawMaterialsPDF } = await import('@/components/raw-materials/RawMaterialsPDF');

        const doc = <RawMaterialsPDF type="costs" data={recipeCosts || []} company={companyData || null} />;
        const blob = await pdf(doc).toBlob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Custos_Producao_${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return <Skeleton className="h-64 w-full" />;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Análise de Custos de Produção</CardTitle>
                <CardDescription>Custo por unidade para cada produto com base nas suas receitas e no custo da matéria-prima.</CardDescription>
                <div className="flex flex-col sm:flex-row justify-end pt-2 gap-2">
                    <Button onClick={handleDownload} variant="outline" size="sm" className="w-full sm:w-auto"><Download className="mr-2 h-4 w-4" /> Baixar PDF</Button>
                    <Button onClick={handlePrint} variant="outline" size="sm" className="w-full sm:w-auto"><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produto Final</TableHead>
                                <TableHead className="text-right">Custo de Produção / Unidade</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recipes && recipes.length > 0 ? recipeCosts.map((recipe) => (
                                <TableRow key={recipe.id}>
                                    <TableCell className="font-medium">{recipe.productName}</TableCell>
                                    <TableCell className="text-right">
                                        {recipe.isCalculable ? (
                                            <span className="font-bold">{formatCurrency(recipe.totalCost)}</span>
                                        ) : (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger>
                                                        <span className="text-muted-foreground flex items-center justify-end gap-1 cursor-help">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            Incalculável
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>{recipe.missingMaterialsTooltip}</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center h-24">Nenhuma receita cadastrada.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};


export default function RawMaterialsPage() {
    const { canView, loading } = useContext(InventoryContext) || { canView: () => false, loading: true };
    const canViewPage = canView('raw-materials');

    if (loading) {
        return <div className="p-8"><Skeleton className="w-full h-96" /></div>;
    }

    if (!canViewPage) {
        return (
            <div className="flex items-center justify-center h-full">
                <Card className="p-8 text-center">
                    <CardHeader>
                        <CardTitle>Acesso Negado</CardTitle>
                        <CardDescription>Não tem permissão para aceder a este módulo.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl md:text-3xl font-headline font-bold">Matéria-Prima e Produção</h1>
                <p className="text-muted-foreground">
                    Gira os seus insumos, receitas e registe a produção de novos itens.
                </p>
            </div>
            <Tabs defaultValue="materials">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto">
                    <TabsTrigger value="materials">Insumos</TabsTrigger>
                    <TabsTrigger value="recipes">Receitas</TabsTrigger>
                    <TabsTrigger value="production">Produção</TabsTrigger>
                    <TabsTrigger value="costs">Custos</TabsTrigger>
                </TabsList>
                <TabsContent value="materials" className="mt-4">
                    <RawMaterialsManager />
                </TabsContent>
                <TabsContent value="recipes" className="mt-4">
                    <RecipesManager />
                </TabsContent>
                <TabsContent value="production" className="mt-4">
                    <ProductionFromRecipe />
                </TabsContent>
                <TabsContent value="costs" className="mt-4">
                    <CostsManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
