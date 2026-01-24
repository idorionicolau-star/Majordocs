
"use client";

import { useState, useContext, useEffect, useMemo } from 'react';
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
import type { Product, Order, Location } from '@/lib/types';
import { InventoryContext } from '@/context/inventory-context';
import { CatalogProductSelector } from '../catalog/catalog-product-selector';
import { ScrollArea } from '../ui/scroll-area';
import { UniversalCalendar } from '../ui/universal-calendar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Separator } from '../ui/separator';
import { formatCurrency } from '@/lib/utils';


type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;

const formSchema = z.object({
  productName: z.string().nonempty({ message: "Por favor, selecione um produto." }),
  quantity: z.coerce.number().min(0.01, { message: "A quantidade deve ser maior que zero." }),
  unit: z.enum(['un', 'm²', 'm', 'cj', 'outro']),
  unitPrice: z.coerce.number().min(0, "O preço não pode ser negativo."),
  clientName: z.string().optional(),
  deliveryDate: z.date().optional(),
  location: z.string().optional(),
  paymentOption: z.enum(['full', 'partial']).default('full'),
  partialPaymentType: z.enum(['fixed', 'percentage']).default('fixed'),
  partialPaymentValue: z.coerce.number().min(0).optional(),
});

export type AddOrderFormValues = z.infer<typeof formSchema>;

interface AddOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddOrder: (order: AddOrderFormValues) => void;
}

export function AddOrderDialog({ open, onOpenChange, onAddOrder }: AddOrderDialogProps) {
  const inventoryContext = useContext(InventoryContext);
  const { catalogProducts, catalogCategories, locations, isMultiLocation } = inventoryContext || { catalogProducts: [], catalogCategories: [], locations: [], isMultiLocation: false };
  
  const form = useForm<AddOrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: "",
      unit: 'un',
      clientName: "",
      deliveryDate: new Date(),
      location: "",
      paymentOption: 'full',
      partialPaymentType: 'fixed',
      partialPaymentValue: 0,
    },
  });

  const watchedQuantity = useWatch({ control: form.control, name: 'quantity' });
  const watchedUnitPrice = useWatch({ control: form.control, name: 'unitPrice' });
  const watchedPaymentOption = useWatch({ control: form.control, name: 'paymentOption' });
  const watchedPartialPaymentType = useWatch({ control: form.control, name: 'partialPaymentType' });
  const watchedPartialPaymentValue = useWatch({ control: form.control, name: 'partialPaymentValue' });
  
  useEffect(() => {
    if (open) {
      const savedLocation = localStorage.getItem('majorstockx-last-product-location');
      const finalLocation = savedLocation && locations.some(l => l.id === savedLocation)
        ? savedLocation
        : (locations.length > 0 ? locations[0].id : "");
        
      form.reset({
        productName: "",
        quantity: undefined,
        unit: 'un',
        clientName: "",
        deliveryDate: new Date(),
        location: finalLocation,
        unitPrice: undefined,
        paymentOption: 'full',
        partialPaymentType: 'fixed',
        partialPaymentValue: 0,
      });
    }
  }, [open, form, locations]);

  const handleProductSelect = (productName: string, product?: CatalogProduct) => {
    form.setValue('productName', productName);
    if (product) {
      form.setValue('unit', product.unit || 'un');
      form.setValue('unitPrice', product.price);
    } else {
        form.setValue('unitPrice', undefined);
    }
  };
  
  const subtotal = (watchedUnitPrice || 0) * (watchedQuantity || 0);
  const totalValue = subtotal; // Simplified for orders

  const amountPaid = useMemo(() => {
    if (watchedPaymentOption === 'partial') {
        const value = watchedPartialPaymentValue || 0;
        if (watchedPartialPaymentType === 'percentage') {
            const percentageValue = totalValue * (value / 100);
            return Math.min(percentageValue, totalValue);
        }
        return Math.min(value, totalValue);
    }
    return totalValue;
  }, [watchedPaymentOption, watchedPartialPaymentType, watchedPartialPaymentValue, totalValue]);

  const balanceDue = totalValue - amountPaid;


  function onSubmit(values: AddOrderFormValues) {
    if(isMultiLocation && !values.location) {
      form.setError("location", {type: "manual", message: "Selecione uma localização."});
      return;
    }

    if(values.location) {
      localStorage.setItem('majorstockx-last-product-location', values.location);
    }
    
    onAddOrder(values);

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
                          onValueChange={handleProductSelect}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl><Input type="number" step="any" min="0.01" {...field} placeholder="0" /></FormControl>
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
               <FormField
                control={form.control}
                name="unitPrice"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Preço Unitário</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} placeholder="0.00" />
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
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Entrega (Opcional)</FormLabel>
                    <UniversalCalendar
                      selectedDate={field.value}
                      onDateSelect={field.onChange}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="payment-details" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <h3 className="font-semibold leading-none tracking-tight">Detalhes de Pagamento (Opcional)</h3>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="paymentOption"
                                render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Opção de Pagamento</FormLabel>
                                    <FormControl>
                                    <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex items-center space-x-4 pt-1"
                                    >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="full" id="p-full" />
                                        </FormControl>
                                        <FormLabel htmlFor="p-full" className="font-normal">Pagamento Integral</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                            <RadioGroupItem value="partial" id="p-partial" />
                                        </FormControl>
                                        <FormLabel htmlFor="p-partial" className="font-normal">Pagamento Parcial</FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            {watchedPaymentOption === 'partial' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="partialPaymentType"
                                        render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel>Tipo de Valor</FormLabel>
                                            <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex items-center space-x-4 pt-1"
                                            >
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="fixed" id="pp-fixed" />
                                                </FormControl>
                                                <FormLabel htmlFor="pp-fixed" className="font-normal">Valor Fixo</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value="percentage" id="pp-percentage" />
                                                </FormControl>
                                                <FormLabel htmlFor="pp-percentage" className="font-normal">%</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        )}
                                    />
                                    <FormField
                                    control={form.control}
                                    name="partialPaymentValue"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Valor Parcial</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="0" {...field} placeholder="0.00" />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                </div>
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>
              </Accordion>

               <div className="rounded-lg bg-muted p-4 space-y-2 mt-4">
                  <div className='flex justify-between items-center text-lg'>
                      <span className='font-bold'>Total</span>
                      <span className='font-bold'>{formatCurrency(totalValue)}</span>
                  </div>
                  <Separator className='my-2 bg-border/50' />
                  <div className='flex justify-between items-center text-sm'>
                      <span className='text-muted-foreground'>Valor Pago</span>
                      <span className='font-medium'>{formatCurrency(amountPaid)}</span>
                  </div>
                  {balanceDue > 0.01 && (
                    <div className='flex justify-between items-center text-sm text-destructive'>
                        <span className='font-semibold'>Valor Pendente</span>
                        <span className='font-bold'>{formatCurrency(balanceDue)}</span>
                    </div>
                  )}
              </div>

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
