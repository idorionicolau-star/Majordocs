
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
import { Plus, Hammer } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Production, Location } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { InventoryContext } from '@/context/inventory-context';
import { CatalogProductSelector } from '../catalog/catalog-product-selector';
import { ScrollArea } from '../ui/scroll-area';

const formSchema = z.object({
  productName: z.string().nonempty({ message: "Por favor, selecione um produto." }),
  quantity: z.coerce.number().min(1, { message: "A quantidade deve ser pelo menos 1." }),
  location: z.string().optional(),
});

type AddProductionFormValues = z.infer<typeof formSchema>;

interface AddProductionDialogProps {
    onAddProduction: (data: Omit<Production, 'id' | 'date' | 'registeredBy' | 'status'>) => void;
    triggerType?: 'button' | 'fab';
}

export function AddProductionDialog({ onAddProduction, triggerType = 'fab' }: AddProductionDialogProps) {
  const [open, setOpen] = useState(false);
  const inventoryContext = useContext(InventoryContext);
  const {
    catalogProducts,
    catalogCategories,
    locations,
    isMultiLocation
  } = inventoryContext || { catalogProducts: [], catalogCategories: [], locations: [], isMultiLocation: false};
  
  const form = useForm<AddProductionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: "",
      quantity: 1,
      location: "",
    },
  });

  useEffect(() => {
    if (locations && locations.length > 0) {
        form.setValue('location', locations[0].id)
    }
  }, [locations, form]);

  function onSubmit(values: AddProductionFormValues) {
     if (isMultiLocation && !values.location) {
      form.setError("location", { type: "manual", message: "Por favor, selecione uma localização." });
      return;
    }

    onAddProduction({
      productName: values.productName,
      quantity: values.quantity,
      location: values.location,
    });

    form.reset();
     if (locations && locations.length > 0) {
      form.setValue('location', locations[0].id);
    }
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
                <p>Registrar Produção</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  ) : (
     <DialogTrigger asChild>
        <Button variant="outline">
            <Hammer className="mr-2 h-4 w-4" />+ Produção
        </Button>
    </DialogTrigger>
  );

  if (!inventoryContext) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {TriggerComponent}
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
                          onValueChange={field.onChange}
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
                      <FormLabel>Localização de Destino</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a localização" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locations?.map(location => (
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
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade Produzida</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit">Registrar</Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
