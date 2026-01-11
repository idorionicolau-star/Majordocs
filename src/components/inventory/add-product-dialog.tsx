
"use client";

import { useState, useEffect, useContext } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Box, ChevronsUpDown, Check } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Location, Product } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { InventoryContext } from '@/context/inventory-context';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  category: z.string().min(1, { message: "A categoria é obrigatória." }),
  price: z.coerce.number().min(0, { message: "O preço não pode ser negativo." }),
  stock: z.coerce.number().min(0, { message: "O estoque não pode ser negativo." }),
  lowStockThreshold: z.coerce.number().min(0, { message: "O limite não pode ser negativo." }),
  criticalStockThreshold: z.coerce.number().min(0, { message: "O limite não pode ser negativo." }),
  location: z.string().optional(),
});

type AddProductFormValues = z.infer<typeof formSchema>;

interface AddProductDialogProps {
    onAddProduct: (product: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'>) => void;
    isMultiLocation: boolean;
    locations: Location[];
    triggerType?: 'button' | 'fab';
}

function AddProductDialogContent({ onAddProduct, isMultiLocation, locations, triggerType = 'fab' }: AddProductDialogProps) {
  const [open, setOpen] = useState(false);
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  const inventoryContext = useContext(InventoryContext);
  const { catalogCategories, catalogProducts } = inventoryContext || { catalogCategories: [], catalogProducts: [] };

  const form = useForm<AddProductFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category: "",
      name: "",
      price: 0,
      stock: 0,
      lowStockThreshold: 10,
      criticalStockThreshold: 5,
      location: locations.length > 0 ? locations[0].id : '',
    },
  });

  const watchedCategory = useWatch({ control: form.control, name: 'category' });

  const filteredCatalogProducts = catalogProducts.filter(p => p.category === watchedCategory);

   useEffect(() => {
    if (locations.length > 0 && !form.getValues('location')) {
      form.setValue('location', locations[0].id);
    }
  }, [locations, form]);

  useEffect(() => {
    if (open) {
      form.reset({
        category: "",
        name: "",
        price: 0,
        stock: 0,
        lowStockThreshold: 10,
        criticalStockThreshold: 5,
        location: locations.length > 0 ? locations[0].id : '',
      });
      setProductSelectorOpen(false);
    }
  }, [open, form, locations]);

  const handleProductSelect = (product: CatalogProduct) => {
    form.setValue('name', product.name);
    form.setValue('price', product.price);
    form.setValue('lowStockThreshold', product.lowStockThreshold);
    form.setValue('criticalStockThreshold', product.criticalStockThreshold);
    setProductSelectorOpen(false);
  };


  function onSubmit(values: AddProductFormValues) {
    if (isMultiLocation && !values.location) {
      form.setError("location", { type: "manual", message: "Por favor, selecione uma localização." });
      return;
    }
    const newProduct: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'> = {
      name: values.name,
      category: values.category,
      price: values.price,
      stock: values.stock,
      lowStockThreshold: values.lowStockThreshold,
      criticalStockThreshold: values.criticalStockThreshold,
      location: values.location || (locations.length > 0 ? locations[0].id : 'Principal'),
    };
    onAddProduct(newProduct);
    form.reset();
    setOpen(false);
  }
  
  const TriggerComponent = triggerType === 'fab' ? (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <DialogTrigger asChild>
                    <Button className="fixed bottom-6 right-4 sm:right-6 h-14 w-14 rounded-full shadow-2xl z-50">
                        <Plus className="h-6 w-6" />
                    </Button>
                </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent side="left">
                <p>Adicionar Produto</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  ) : (
    <DialogTrigger asChild>
        <Button variant="outline">
            <Box className="mr-2 h-4 w-4" />+ Inventário
        </Button>
    </DialogTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {TriggerComponent}
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Produto</DialogTitle>
          <DialogDescription>
            Preencha os detalhes abaixo para adicionar um novo produto ao inventário.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue('name', '');
                      setProductSelectorOpen(true);
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {catalogCategories.sort((a,b) => a.name.localeCompare(b.name)).map(cat => (
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
                  name="name"
                  render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Produto</FormLabel>
                        <Collapsible open={productSelectorOpen} onOpenChange={setProductSelectorOpen}>
                            <CollapsibleTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant="outline"
                                    role="combobox"
                                    disabled={!watchedCategory}
                                    className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                    >
                                    {field.value || "Selecione um produto do catálogo"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className='relative mt-2'>
                                    <div className='absolute top-0 left-0 w-full h-full rounded-md border'>
                                        <Command>
                                            <CommandInput placeholder="Pesquisar produto..." />
                                            <ScrollArea className="h-[200px]">
                                            <CommandList>
                                                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                                <CommandGroup>
                                                    {filteredCatalogProducts.map((product) => (
                                                    <CommandItem
                                                        value={product.name}
                                                        key={product.id}
                                                        onSelect={() => handleProductSelect(product)}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", product.name === field.value ? "opacity-100" : "opacity-0")} />
                                                        {product.name}
                                                    </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                            </ScrollArea>
                                        </Command>
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma localização" />
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
            <div className="grid grid-cols-3 gap-4">
                <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Estoque Inicial</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
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
            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit">Adicionar Produto</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function AddProductDialog(props: AddProductDialogProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
     return props.triggerType === 'fab' ? (
        <Button disabled className="fixed bottom-6 right-4 sm:right-6 h-14 w-14 rounded-full shadow-2xl z-50">
            <Plus className="h-6 w-6" />
        </Button>
     ) : (
        <Button variant="outline" disabled>
            <Box className="mr-2 h-4 w-4" />+ Inventário
        </Button>
     );
  }

  return <AddProductDialogContent {...props} />;
}
