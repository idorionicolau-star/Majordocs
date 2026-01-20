"use client";

import { useState, useEffect, useContext } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
import type { Product, Location } from '@/lib/types';
import { InventoryContext } from '@/context/inventory-context';
import { CatalogProductSelector } from '../catalog/catalog-product-selector';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  category: z.string().min(1, { message: "A categoria é obrigatória." }),
  price: z.coerce.number().min(0, { message: "O preço não pode ser negativo." }),
  stock: z.coerce.number().min(0, { message: "O estoque não pode ser negativo." }),
  unit: z.enum(['un', 'm²', 'm', 'cj', 'outro']).optional(),
  lowStockThreshold: z.coerce.number().min(0, { message: "O limite não pode ser negativo." }),
  criticalStockThreshold: z.coerce.number().min(0, { message: "O limite não pode ser negativo." }),
  location: z.string().optional(),
});

type AddProductFormValues = z.infer<typeof formSchema>;

interface AddProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddProduct: (product: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'>) => void;
}

export function AddProductDialog({ open, onOpenChange, onAddProduct }: AddProductDialogProps) {
  const inventoryContext = useContext(InventoryContext);
  const { catalogCategories, catalogProducts, locations, isMultiLocation, addCatalogProduct, addCatalogCategory } = inventoryContext || { catalogCategories: [], catalogProducts: [], locations: [], isMultiLocation: false, addCatalogProduct: async () => {}, addCatalogCategory: async () => {} };
  const [isCreatingNewProduct, setIsCreatingNewProduct] = useState(false);
  const { toast } = useToast();
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const form = useForm<AddProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      name: "",
      price: 0,
      stock: 0,
      unit: "un",
      lowStockThreshold: 10,
      criticalStockThreshold: 5,
      location: "",
    },
  });

  useEffect(() => {
    if (!open) {
      setIsCreatingNewProduct(false);
    }
    
    if (open) {
      const savedLocation = localStorage.getItem('majorstockx-last-product-location');
      const locationExists = locations.some(l => l.id === savedLocation);
      const finalLocation = (savedLocation && locationExists) 
        ? savedLocation 
        : (locations.length > 0 ? locations[0].id : "");

      form.reset({
        category: "",
        name: "",
        price: 0,
        stock: 0,
        unit: 'un',
        lowStockThreshold: 10,
        criticalStockThreshold: 5,
        location: finalLocation,
      });
    }
  }, [open, locations, form]);


  const handleProductSelect = (productName: string, product?: CatalogProduct) => {
    form.setValue('name', productName.trim());
    if (product) {
      setIsCreatingNewProduct(false);
      form.setValue('price', product.price);
      form.setValue('lowStockThreshold', product.lowStockThreshold);
      form.setValue('criticalStockThreshold', product.criticalStockThreshold);
      form.setValue('category', product.category);
      if (product.unit) {
        form.setValue('unit', product.unit);
      }
    } else {
      setIsCreatingNewProduct(true);
      form.setValue('price', 0);
      form.setValue('lowStockThreshold', 10);
      form.setValue('criticalStockThreshold', 5);
      form.setValue('category', '');
      form.setValue('unit', 'un');
    }
  };
  
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome da categoria inválido',
        description: 'O nome da categoria não pode estar em branco.',
      });
      return;
    }
    if (addCatalogCategory) {
      // The function in context already checks for existence
      await addCatalogCategory(newCategoryName);
      form.setValue('category', newCategoryName, { shouldValidate: true });
      setShowAddCategoryDialog(false);
      setNewCategoryName('');
      toast({
        title: 'Categoria adicionada',
        description: `"${newCategoryName}" foi adicionada e selecionada.`,
      });
    }
  };


  async function onSubmit(values: AddProductFormValues) {
    if (isMultiLocation && !values.location) {
      form.setError("location", { type: "manual", message: "Por favor, selecione uma localização." });
      return;
    }

    if (isCreatingNewProduct) {
      if (!values.category.trim()) {
        form.setError("category", { type: "manual", message: "A categoria é obrigatória para novos produtos." });
        return;
      }
      try {
        if(addCatalogCategory) await addCatalogCategory(values.category);
        
        if(addCatalogProduct) {
          await addCatalogProduct({
            name: values.name,
            category: values.category,
            price: values.price,
            unit: values.unit,
            lowStockThreshold: values.lowStockThreshold,
            criticalStockThreshold: values.criticalStockThreshold,
          });
        }

        toast({
            title: "Produto de Catálogo Criado",
            description: `${values.name} foi adicionado ao catálogo.`,
        });

      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Erro ao Criar no Catálogo', description: error.message });
        return;
      }
    }
    
    if (values.location) {
      localStorage.setItem('majorstockx-last-product-location', values.location);
    }

    const newProduct: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'> = {
      name: values.name,
      category: values.category,
      price: values.price,
      stock: values.stock,
      unit: values.unit,
      lowStockThreshold: values.lowStockThreshold,
      criticalStockThreshold: values.criticalStockThreshold,
      location: values.location || (locations.length > 0 ? locations[0].id : 'Principal'),
    };
    onAddProduct(newProduct);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Produto</DialogTitle>
          <DialogDescription>
            Preencha os detalhes abaixo para adicionar um novo produto ao inventário.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] -mr-3 pr-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 pr-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Produto</FormLabel>
                      <FormControl>
                        <CatalogProductSelector
                            products={catalogProducts}
                            categories={catalogCategories}
                            selectedValue={field.value}
                            onValueChange={handleProductSelect}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {isCreatingNewProduct && (
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria do Novo Produto</FormLabel>
                        <div className="flex items-center gap-2">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(catalogCategories || []).sort((a,b) => a.name.localeCompare(b.name)).map((cat) => (
                                <SelectItem key={cat.id} value={cat.name}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
                            <DialogTrigger asChild>
                              <Button type="button" variant="outline" size="icon" className="flex-shrink-0">
                                <PlusCircle className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Adicionar Nova Categoria</DialogTitle>
                                <DialogDescription>
                                  Digite o nome da nova categoria. Ela será adicionada e selecionada automaticamente.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <Input
                                  placeholder="Nome da categoria"
                                  value={newCategoryName}
                                  onChange={(e) => setNewCategoryName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddCategory();
                                    }
                                  }}
                                />
                              </div>
                              <DialogFooter>
                                <Button type="button" variant="secondary" onClick={() => setShowAddCategoryDialog(false)}>
                                  Cancelar
                                </Button>
                                <Button type="button" onClick={handleAddCategory}>
                                  Adicionar
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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

              <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Preço Unitário (MT)</FormLabel>
                      <FormControl>
                          <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Estoque Inicial</FormLabel>
                      <FormControl>
                          <Input type="number" step="any" {...field} />
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
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                  control={form.control}
                  name="lowStockThreshold"
                  render={({ field }) => (
                      <FormItem>
                      <FormLabel>Alerta Baixo</FormLabel>
                      <FormControl>
                          <Input type="number" {...field} />
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
                          <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                      </FormItem>
                  )}
                  />
              </div>
              <DialogFooter className="pt-4">
                  <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  <Button type="submit">Adicionar Produto</Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
