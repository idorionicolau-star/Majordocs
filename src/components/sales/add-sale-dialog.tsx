
"use client";

import { useState, useEffect, useContext, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from '@/hooks/use-toast';
import type { Product, Sale, Location } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { CatalogProductSelector } from '../catalog/catalog-product-selector';
import { InventoryContext } from '@/context/inventory-context';
import { ScrollArea } from '../ui/scroll-area';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;

const formSchema = z.object({
  productName: z.string().nonempty({ message: "Por favor, selecione um produto." }),
  quantity: z.coerce.number().min(1, { message: "A quantidade deve ser pelo menos 1." }),
  unitPrice: z.coerce.number().min(0, { message: "O preço não pode ser negativo." }),
  location: z.string().optional(),
});

type AddSaleFormValues = z.infer<typeof formSchema>;

interface AddSaleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddSale: (data: Omit<Sale, 'id' | 'guideNumber'>) => Promise<void>;
}

export function AddSaleDialog({ open, onOpenChange, onAddSale }: AddSaleDialogProps) {
  const inventoryContext = useContext(InventoryContext);
  const {
    products,
    catalogProducts,
    catalogCategories,
    user,
    locations,
    isMultiLocation,
  } = inventoryContext || { products: [], catalogProducts: [], catalogCategories: [], user: null, locations: [], isMultiLocation: false};
  const { toast } = useToast();
  
  const form = useForm<AddSaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: "",
      quantity: 1,
      unitPrice: 0,
      location: "",
    },
  });
  
  useEffect(() => {
    if (open) {
      const savedLocation = localStorage.getItem('majorstockx-last-product-location');
      const finalLocation = savedLocation && locations.some(l => l.id === savedLocation) 
        ? savedLocation 
        : (locations.length > 0 ? locations[0].id : "");

      form.reset({
        productName: "",
        quantity: 1,
        unitPrice: 0,
        location: finalLocation,
      });
    }
  }, [open, form, locations]);

  const watchedProductName = useWatch({ control: form.control, name: 'productName' });
  const watchedQuantity = useWatch({ control: form.control, name: 'quantity' });
  const watchedUnitPrice = useWatch({ control: form.control, name: 'unitPrice' });
  const watchedLocation = useWatch({ control: form.control, name: 'location' });
  
  const productsInStock = useMemo(() => {
    if (!products || !catalogProducts) return [];

    const productsForLocation = isMultiLocation && watchedLocation
        ? products.filter(p => p.location === watchedLocation)
        : products;
    
    const inStock = productsForLocation.filter(p => (p.stock - p.reservedStock) > 0);

    const inStockNames = [...new Set(inStock.map(p => p.name))];
    
    return catalogProducts.filter(p => inStockNames.includes(p.name));
  }, [products, catalogProducts, watchedLocation, isMultiLocation]);


  const selectedProductInstance = products?.find(p => p.name === watchedProductName && p.location === watchedLocation);
  const availableStock = selectedProductInstance ? selectedProductInstance.stock - selectedProductInstance.reservedStock : 0;
  
  const handleProductSelect = (productName: string, product?: CatalogProduct) => {
    form.setValue('productName', productName);
    if (product) {
      form.setValue('unitPrice', product.price);
    } else {
      form.setValue('unitPrice', 0);
    }
  };


  useEffect(() => {
    if(selectedProductInstance){
      const stockIsSufficient = watchedQuantity <= availableStock;
      if (!stockIsSufficient) {
        form.setError("quantity", { type: "manual", message: `Estoque insuficiente. Disponível: ${availableStock}` });
      } else {
        form.clearErrors("quantity");
      }
    } else if (watchedProductName && watchedLocation) {
        form.setError("productName", { type: "manual", message: `Produto sem estoque nesta localização.` });
    } else {
        form.clearErrors("productName");
    }
  }, [watchedQuantity, availableStock, selectedProductInstance, watchedProductName, watchedLocation, form]);


  const totalValue = (watchedUnitPrice || 0) * (watchedQuantity || 0);

  async function onSubmit(values: AddSaleFormValues) {
    if (!user) {
        toast({ variant: "destructive", title: "Erro de Validação", description: "Utilizador não autenticado." });
        return;
    }
    
    if (isMultiLocation && !values.location) {
      form.setError("location", { type: "manual", message: "Selecione uma localização." });
      return;
    }
    
    if (values.location) {
      localStorage.setItem('majorstockx-last-product-location', values.location);
    }

    const newSale: Omit<Sale, 'id' | 'guideNumber'> = {
      date: new Date().toISOString(),
      productId: products?.find(p => p.name === values.productName)?.id || 'unknown',
      productName: values.productName,
      quantity: values.quantity,
      unitPrice: values.unitPrice,
      totalValue: values.quantity * values.unitPrice,
      soldBy: user.username,
      status: 'Pago',
      location: values.location,
    };
    
    await onAddSale(newSale);
    
    onOpenChange(false);
  }
  
  const isSubmitDisabled = !form.formState.isValid || form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Nova Venda</DialogTitle>
          <DialogDescription>
            A venda será marcada como 'Paga' e o stock ficará reservado.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] -mr-3 pr-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 pr-2">
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produto</FormLabel>
                    <FormControl>
                      <CatalogProductSelector
                          products={productsInStock}
                          categories={catalogCategories || []}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                      <FormItem>
                      <div className="flex justify-between items-baseline">
                          <FormLabel>Quantidade</FormLabel>
                          {selectedProductInstance && <p className="text-xs text-muted-foreground">Disponível: {availableStock}</p>}
                      </div>
                      <FormControl>
                          <Input type="number" min="1" {...field} />
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
                              <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
              </div>
              
              <div className="rounded-lg bg-muted p-4 text-right">
                  <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>

              <DialogFooter className="pt-4">
                  <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  <Button type="submit" disabled={isSubmitDisabled}>Registrar Venda</Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
