
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
import { Plus, Box } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Location, Product } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { InventoryContext } from '@/context/inventory-context';
import { CatalogProductSelector } from '../catalog/catalog-product-selector';
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
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddProduct: (product: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'>) => void;
    isMultiLocation: boolean;
    locations: Location[];
    triggerType?: 'button' | 'fab';
}

function AddProductDialogContent({ open, onOpenChange, onAddProduct, isMultiLocation, locations, triggerType = 'fab' }: AddProductDialogProps) {
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
      location: "", // Começamos vazio para preencher no useEffect
    },
  });

  // FUNÇÃO ÚNICA DE RESET E MEMÓRIA
  useEffect(() => {
    if (open) {
      // 1. Tentar pegar do localStorage
      const savedLocation = localStorage.getItem('majorstockx-last-product-location');
      
      // 2. Validar se a localização salva ainda existe na lista atual
      const locationExists = locations.some(l => l.id === savedLocation);
      
      // 3. Definir a localização final (Salva -> ou a Primeira da lista -> ou Vazio)
      const finalLocation = (savedLocation && locationExists) 
        ? savedLocation 
        : (locations.length > 0 ? locations[0].id : "");

      // 4. Resetar o formulário com os valores padrão + a localização memorizada
      form.reset({
        category: "",
        name: "",
        price: 0,
        stock: 0,
        lowStockThreshold: 10,
        criticalStockThreshold: 5,
        location: finalLocation,
      });
    }
  }, [open, locations, form]);


  const handleProductSelect = (productName: string, product?: CatalogProduct) => {
    form.setValue('name', productName);
    if (product) {
      form.setValue('price', product.price);
      form.setValue('lowStockThreshold', product.lowStockThreshold);
      form.setValue('criticalStockThreshold', product.criticalStockThreshold);
      form.setValue('category', product.category);
    }
  };


  function onSubmit(values: AddProductFormValues) {
    // Validação extra para Multi-Localização
    if (isMultiLocation && !values.location) {
      form.setError("location", { type: "manual", message: "Por favor, selecione uma localização." });
      return;
    }

    // MEMORIZAR: Salva a localização escolhida para a próxima vez
    if (values.location) {
      localStorage.setItem('majorstockx-last-product-location', values.location);
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
    onOpenChange(false);
  }
  
  const TriggerComponent = triggerType === 'fab' ? (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button onClick={() => onOpenChange(true)} className="fixed bottom-6 right-4 sm:right-6 h-14 w-14 rounded-full shadow-2xl z-50">
                    <Plus className="h-6 w-6" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
                <p>Adicionar Produto</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  ) : (
    <Button variant="outline" onClick={() => onOpenChange(true)}>
        <Box className="mr-2 h-4 w-4" />+ Inventário
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {TriggerComponent}
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
