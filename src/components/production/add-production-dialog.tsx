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
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

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
  unit: z.string().default('un'),
  location: z.string().optional(),
});

type AddProductionFormValues = z.infer<typeof formSchema>;

interface AddProductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduction: (data: Omit<Production, 'id' | 'date' | 'registeredBy' | 'status'>) => void;
}

interface AddProductionFormProps {
  form: any;
  onSubmit: (values: AddProductionFormValues) => void;
  onOpenChange: (open: boolean) => void;
  catalogProducts: CatalogProduct[];
  catalogCategories: any[];
  handleProductSelect: (name: string, product?: CatalogProduct) => void;
  availableUnits: string[];
  isMultiLocation: boolean;
  locations: Location[];
}

function AddProductionForm({
  form,
  onSubmit,
  onOpenChange,
  catalogProducts,
  catalogCategories,
  handleProductSelect,
  availableUnits,
  isMultiLocation,
  locations,
}: AddProductionFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 pr-2">
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="productName"
            render={({ field }) => (
              <CatalogProductSelector
                selectedValue={field.value}
                onValueChange={handleProductSelect}
                products={catalogProducts}
                categories={catalogCategories}
              />
            )}
          />
          <FormMessage />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantidade Produzida</FormLabel>
                <FormControl>
                  <MathInput
                    {...field}
                    onValueChange={field.onChange}
                    placeholder="0"
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
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button type="submit">Registrar</Button>
        </div>
      </form>
    </Form>
  );
}

export function AddProductionDialog({ open, onOpenChange, onAddProduction }: AddProductionDialogProps) {
  const inventoryContext = useContext(InventoryContext);
  const {
    catalogProducts,
    catalogCategories,
    locations,
    isMultiLocation,
    availableUnits
  } = inventoryContext || { catalogProducts: [], catalogCategories: [], locations: [], isMultiLocation: false, availableUnits: [] };

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
      form.setError("location", { type: "manual", message: "Selecione uma localização." });
      return;
    }

    if (values.location) {
      localStorage.setItem('majorstockx-last-product-location', values.location);
    }

    onAddProduction({
      productName: values.productName,
      quantity: values.quantity,
      unit: values.unit || 'un',
      location: isMultiLocation ? values.location : undefined,
    });
    onOpenChange(false);
  }

  if (!inventoryContext) {
    return null;
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar Produção"
      description="Adicione uma nova produção ao sistema. O stock será atualizado automaticamente."
    >
      <div className="max-h-[85vh] overflow-y-auto pr-2">
        <AddProductionForm
          form={form}
          onSubmit={onSubmit}
          onOpenChange={onOpenChange}
          catalogProducts={catalogProducts}
          catalogCategories={catalogCategories}
          handleProductSelect={handleProductSelect}
          availableUnits={availableUnits}
          isMultiLocation={isMultiLocation}
          locations={locations}
        />
      </div>
    </ResponsiveDialog>
  );
}


