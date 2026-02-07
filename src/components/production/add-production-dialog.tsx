"use client";

import { useState, useEffect, useContext } from 'react';
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Production, Location, Product } from '@/lib/types';
import { InventoryContext } from '@/context/inventory-context';
import { CatalogProductSelector } from '../catalog/catalog-product-selector';
import { ScrollArea } from '../ui/scroll-area';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;

const formSchema = z.object({
  productName: z.string().nonempty({ message: "Por favor, selecione um produto." }),
  quantity: z.preprocess((val) => {
    if (val === undefined || val === "" || val === null) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  }, z.number().min(0.01, { message: "A quantidade deve ser maior que zero." })),
  unit: z.enum(['un', 'm²', 'm', 'cj', 'outro']).optional(),
  location: z.string().optional(),
});

type AddProductionFormValues = z.infer<typeof formSchema>;

interface AddProductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduction: (data: Omit<Production, 'id' | 'date' | 'registeredBy' | 'status'>) => void;
}

export function AddProductionDialog({ open, onOpenChange, onAddProduction }: AddProductionDialogProps) {
  const inventoryContext = useContext(InventoryContext);
  const {
    catalogProducts,
    catalogCategories,
    locations,
    isMultiLocation
  } = inventoryContext || { catalogProducts: [], catalogCategories: [], locations: [], isMultiLocation: false };

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
    if (open) {
      const savedLocation = localStorage.getItem('majorstockx-last-product-location');
      const finalLocation = savedLocation && locations.some(l => l.id === savedLocation)
        ? savedLocation
        : (locations.length > 0 ? locations[0].id : "");

      form.reset({
        productName: "",
        location: finalLocation,
        unit: 'un',
      });
    }
  }, [open, form, locations]);


  function onSubmit(values: AddProductionFormValues) {
    if (isMultiLocation && !values.location) {
      form.setError("location", { type: 'manual', message: 'Selecione uma localização.' });
      return;
    }

    if (values.location) {
      localStorage.setItem('majorstockx-last-product-location', values.location);
    }

    onAddProduction({
      productName: values.productName,
      quantity: values.quantity,
      unit: values.unit,
      location: values.location,
    });

    onOpenChange(false);
  }

  if (!inventoryContext) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Registrar Nova Produção</DialogTitle>
          <DialogDescription>
            Selecione o produto e a quantidade para registrar uma nova entrada de produção.
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
                        products={catalogProducts || []}
                        categories={catalogCategories || []}
                        selectedValue={field.value}
                        onValueChange={handleProductSelect}
                        placeholder="Pesquisar no catálogo..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade Produzida</FormLabel>
                      <FormControl>
                        <Input type="number" step="any" min="0.01" {...field} placeholder="0.0" />
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
              {isMultiLocation && (
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Localização de Produção</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma localização" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations.map((location) => (
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
              <DialogFooter className="pt-4">
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit">Registrar</Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
