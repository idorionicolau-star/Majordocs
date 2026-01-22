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
import { Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import type { Production, Location, Product as CatalogProductInfo } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ScrollArea } from '../ui/scroll-area';
import { InventoryContext } from '@/context/inventory-context';
import { CatalogProductSelector } from '../catalog/catalog-product-selector';

const formSchema = z.object({
  productName: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  quantity: z.coerce.number().min(0.01, { message: "A quantidade deve ser positiva." }),
  unit: z.enum(['un', 'm²', 'm', 'cj', 'outro']).optional(),
  location: z.string().optional(),
});

type EditProductionFormValues = z.infer<typeof formSchema>;

interface EditProductionDialogProps {
    production: Production;
    onUpdate: (productionId: string, data: Partial<Production>) => void;
    trigger?: 'icon' | 'button';
}

function EditProductionDialogContent({ production, onUpdate, setOpen }: EditProductionDialogProps & { setOpen: (open: boolean) => void }) {
  const { catalogProducts, catalogCategories, locations, isMultiLocation } = useContext(InventoryContext) || { catalogProducts: [], catalogCategories: [], locations: [], isMultiLocation: false };
  
  const form = useForm<EditProductionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        productName: production.productName,
        quantity: production.quantity,
        unit: production.unit || 'un',
        location: production.location || '',
    },
  });

  const handleProductSelect = (productName: string, productData?: CatalogProductInfo) => {
    form.setValue('productName', productName);
    if (productData) {
      form.setValue('unit', productData.unit || 'un');
    }
  };

  function onSubmit(values: EditProductionFormValues) {
    onUpdate(production.id, values);
    setOpen(false);
  }

  return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Registo de Produção</DialogTitle>
          <DialogDescription>
            Atualize os detalhes deste registo de produção.
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
                              {locations?.map((location: Location) => (
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
                  <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
  );
}


export function EditProductionDialog({ production, onUpdate, trigger = 'icon' }: EditProductionDialogProps) {
    const [open, setOpen] = useState(false);
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 {trigger === 'icon' ? (
                     <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                        <Edit className="h-3 w-3" />
                     </Button>
                 ) : (
                    <Button variant="outline">
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                    </Button>
                 )}
            </DialogTrigger>
            {open && <EditProductionDialogContent production={production} onUpdate={onUpdate} setOpen={setOpen} />}
        </Dialog>
    );
}
