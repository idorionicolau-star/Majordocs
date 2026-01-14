
"use client";

import { useState, useContext, useEffect } from 'react';
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
import type { Product, Order, Location } from '@/lib/types';
import { InventoryContext } from '@/context/inventory-context';
import { CatalogProductSelector } from '../catalog/catalog-product-selector';
import { ScrollArea } from '../ui/scroll-area';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;

const formSchema = z.object({
  productName: z.string().nonempty({ message: "Por favor, selecione um produto." }),
  quantity: z.coerce.number().min(1, { message: "A quantidade deve ser pelo menos 1." }),
  unit: z.enum(['un', 'm²', 'm', 'cj', 'outro']),
  clientName: z.string().optional(),
  deliveryDate: z.string().nonempty({ message: "A data de entrega é obrigatória." }),
  location: z.string().optional(),
});

type AddOrderFormValues = z.infer<typeof formSchema>;

interface AddOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddOrder: (order: Omit<Order, 'id' | 'status' | 'quantityProduced' | 'productionLogs' | 'productionStartDate' | 'productId'>) => void;
}

export function AddOrderDialog({ open, onOpenChange, onAddOrder }: AddOrderDialogProps) {
  const inventoryContext = useContext(InventoryContext);
  const { catalogProducts, catalogCategories, locations, isMultiLocation } = inventoryContext || { catalogProducts: [], catalogCategories: [], locations: [], isMultiLocation: false };
  
  const form = useForm<AddOrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: "",
      quantity: 1,
      unit: 'un',
      clientName: "",
      deliveryDate: "",
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
        unit: 'un',
        clientName: "",
        deliveryDate: "",
        location: finalLocation,
      });
    }
  }, [open, form, locations]);


  function onSubmit(values: AddOrderFormValues) {
    if(isMultiLocation && !values.location) {
      form.setError("location", {type: "manual", message: "Selecione uma localização."});
      return;
    }

    if(values.location) {
      localStorage.setItem('majorstockx-last-product-location', values.location);
    }
    
    const newOrder: Omit<Order, 'id' | 'status' | 'quantityProduced' | 'productionLogs' | 'productionStartDate' | 'productId'> = {
      productName: values.productName,
      quantity: values.quantity,
      unit: values.unit,
      clientName: values.clientName,
      deliveryDate: new Date(values.deliveryDate).toISOString(),
      location: values.location
    };
    onAddOrder(newOrder);

    onOpenChange(false);
  }

  if (!inventoryContext) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Encomenda de Produção</DialogTitle>
          <DialogDescription>
            Registe uma nova encomenda para a equipe de produção.
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
                          onValueChange={field.onChange}
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
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl><Input type="number" min="1" {...field} /></FormControl>
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
              {isMultiLocation && (
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Localização da Produção</FormLabel>
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
                name="clientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente (Opcional)</FormLabel>
                    <FormControl><Input placeholder="Nome do cliente" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Entrega</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit">Adicionar Encomenda</Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
