
"use client";

import { useState, useEffect, useContext, useMemo } from 'react';
import { useCRM } from '@/context/crm-context';
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
  FormDescription,
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
import { Separator } from '../ui/separator';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { DatePicker } from '../ui/date-picker';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;

const formSchema = z.object({
  productName: z.string().nonempty({ message: "Por favor, selecione um produto." }),
  quantity: z.coerce.number().min(0.01, "A quantidade deve ser maior que zero.").optional(),
  unit: z.enum(['un', 'm²', 'm', 'cj', 'outro']).optional(),
  unitPrice: z.coerce.number().min(0, "O preço não pode ser negativo.").optional(),
  location: z.string().optional(),
  discountType: z.enum(['fixed', 'percentage']).default('fixed'),
  discountValue: z.coerce.number().min(0, "O desconto não pode ser negativo.").optional(),
  applyVat: z.boolean().default(false),
  vatPercentage: z.coerce.number().min(0, "O IVA deve ser um valor positivo.").max(100).optional(),
  documentType: z.enum(['Guia de Remessa', 'Factura', 'Factura Proforma', 'Recibo']),
  clientName: z.string().optional(),
  customerId: z.string().optional(),
  notes: z.string().optional(),
  date: z.date(),
});

type AddSaleFormValues = z.infer<typeof formSchema>;

interface AddSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSale: (data: Omit<Sale, 'id' | 'guideNumber'>) => void;
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
  } = inventoryContext || { products: [], catalogProducts: [], catalogCategories: [], user: null, locations: [], isMultiLocation: false };
  const { customers } = useCRM();
  const { toast } = useToast();

  const form = useForm<AddSaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: "",
      location: "",
      unit: 'un',
      discountType: 'fixed',
      discountValue: 0,
      applyVat: false,
      vatPercentage: 17, // Default VAT
      documentType: 'Factura Proforma',
      clientName: '',
      customerId: '',
      notes: '',
      date: new Date(),
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
        quantity: undefined,
        unitPrice: undefined,
        unit: 'un',
        location: finalLocation,
        discountType: 'fixed',
        discountValue: 0,
        applyVat: false,
        vatPercentage: 17,
        documentType: 'Factura Proforma',
        clientName: '',
        customerId: '',
        notes: '',
        date: new Date(),
      });
    }
  }, [open, form, locations]);

  const watchedProductName = useWatch({ control: form.control, name: 'productName' });
  const watchedQuantity = useWatch({ control: form.control, name: 'quantity' });
  const watchedUnitPrice = useWatch({ control: form.control, name: 'unitPrice' });
  const watchedLocation = useWatch({ control: form.control, name: 'location' });
  const watchedDiscountType = useWatch({ control: form.control, name: 'discountType' });
  const watchedDiscountValue = useWatch({ control: form.control, name: 'discountValue' });
  const watchedVatPercentage = useWatch({ control: form.control, name: 'vatPercentage' });

  const watchedApplyVat = useWatch({ control: form.control, name: 'applyVat' });
  const watchedCustomerId = useWatch({ control: form.control, name: 'customerId' });

  // Auto-fill client name when customer is selected
  useEffect(() => {
    if (watchedCustomerId && watchedCustomerId !== 'new') {
      const customer = customers.find(c => c.id === watchedCustomerId);
      if (customer) {
        form.setValue('clientName', customer.name);
      }
    }
  }, [watchedCustomerId, customers, form]);

  const subtotal = (watchedUnitPrice || 0) * (watchedQuantity || 0);

  const discountAmount = useMemo(() => {
    const value = watchedDiscountValue || 0;
    if (watchedDiscountType === 'percentage') {
      return subtotal * (value / 100);
    }
    return value; // fixed
  }, [watchedDiscountType, watchedDiscountValue, subtotal]);

  const totalAfterDiscount = subtotal > discountAmount ? subtotal - discountAmount : 0;
  const vatPercentage = watchedVatPercentage || 0;
  const vatAmount = watchedApplyVat ? totalAfterDiscount * (vatPercentage / 100) : 0;
  const totalValue = totalAfterDiscount + vatAmount;
  const amountPaid = totalValue;


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
      form.setValue('unit', product.unit || 'un');
    } else {
      form.setValue('unitPrice', undefined);
      form.setValue('unit', 'un');
    }
  };


  useEffect(() => {
    if (selectedProductInstance && watchedQuantity) {
      const stockIsSufficient = watchedQuantity <= availableStock;
      if (!stockIsSufficient) {
        form.setError("quantity", { type: "manual", message: `Estoque insuficiente. Disponível: ${availableStock}` });
      } else {
        form.clearErrors("quantity");
      }
    } else if (watchedProductName && watchedLocation) {
      const productExistsInLocation = products.some(p => p.name === watchedProductName && p.location === watchedLocation);
      if (!productExistsInLocation) {
        form.setError("productName", { type: "manual", message: `Produto sem estoque nesta localização.` });
      } else {
        form.clearErrors("productName");
      }
    } else {
      form.clearErrors("productName");
    }
  }, [watchedQuantity, availableStock, selectedProductInstance, watchedProductName, watchedLocation, form, products]);


  function onSubmit(values: AddSaleFormValues) {
    if (!user) {
      toast({ variant: "destructive", title: "Erro de Validação", description: "Utilizador não autenticado." });
      return;
    }

    if (isMultiLocation && !values.location) {
      form.setError("location", { type: "manual", message: "Selecione uma localização." });
      return;
    }

    if (!values.quantity || !values.unitPrice) {
      toast({ variant: "destructive", title: "Campos em Falta", description: "Por favor, preencha a quantidade e o preço." });
      return;
    }

    if (values.location) {
      localStorage.setItem('majorstockx-last-product-location', values.location);
    }

    const newSale: Omit<Sale, 'id' | 'guideNumber'> = {
      date: values.date.toISOString(),
      productId: products?.find(p => p.name === values.productName)?.id || 'unknown',
      productName: values.productName,
      quantity: values.quantity,
      unit: values.unit,
      unitPrice: values.unitPrice,
      subtotal: subtotal,
      discount: discountAmount,
      vat: vatAmount,
      totalValue: totalValue,
      amountPaid: amountPaid,
      soldBy: user.username,
      status: 'Pago',
      location: values.location,
      documentType: values.documentType,
      clientName: values.clientName,
      customerId: values.customerId === 'new' ? undefined : values.customerId,
      notes: values.notes,
    };

    onAddSale(newSale);

    onOpenChange(false);
  }

  const isSubmitDisabled = !form.formState.isValid || form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar Novo Documento de Venda</DialogTitle>
          <DialogDescription>
            Crie uma cotação, fatura ou guia. As vendas pagas reservam o stock automaticamente.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] -mr-3 pr-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 pr-2">
              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="font-semibold leading-none tracking-tight">Itens</h3>
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
                          <Input type="number" step="any" min="0.01" {...field} placeholder="0.0" />
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
                          <Input type="number" step="0.01" {...field} placeholder="0.00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="font-semibold leading-none tracking-tight">Detalhes do Documento</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente Registado</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "new"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="new">-- Novo / Não Registado --</SelectItem>
                            {customers.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Cliente (no documento)</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do cliente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="documentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Documento</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de documento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Factura Proforma">Factura Proforma</SelectItem>
                            <SelectItem value="Guia de Remessa">Guia de Remessa</SelectItem>
                            <SelectItem value="Factura">Factura</SelectItem>
                            <SelectItem value="Recibo">Recibo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data da Venda</FormLabel>
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Accordion type="multiple" className="w-full space-y-4">
                <AccordionItem value="financials" className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <h3 className="font-semibold leading-none tracking-tight">Detalhes Financeiros (Opcional)</h3>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 pt-0">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="discountType"
                          render={({ field }) => (
                            <FormItem className="space-y-3">
                              <FormLabel>Tipo de Desconto</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  className="flex items-center space-x-4 pt-1"
                                >
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="fixed" id="d-fixed" />
                                    </FormControl>
                                    <FormLabel htmlFor="d-fixed" className="font-normal">Valor Fixo</FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="percentage" id="d-percentage" />
                                    </FormControl>
                                    <FormLabel htmlFor="d-percentage" className="font-normal">%</FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="discountValue"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor do Desconto</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} placeholder="0.00" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="applyVat"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                              <FormLabel className="cursor-pointer">Aplicar IVA</FormLabel>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      {watchedApplyVat && (
                        <FormField
                          control={form.control}
                          name="vatPercentage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IVA (%)</FormLabel>
                              <FormControl>
                                <Input type="number" step="1" {...field} placeholder="17" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="notes" className="border rounded-lg">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <h3 className="font-semibold leading-none tracking-tight">Notas Adicionais (Opcional)</h3>
                  </AccordionTrigger>
                  <AccordionContent className="p-4 pt-0">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Adicione notas, termos ou condições..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>


              <div className="rounded-lg bg-muted p-4 space-y-2 mt-4">
                <div className='flex justify-between items-center text-sm'>
                  <span className='text-muted-foreground'>Subtotal</span>
                  <span className='font-medium'>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className='flex justify-between items-center text-sm'>
                    <span className='text-muted-foreground'>Desconto</span>
                    <span className='font-medium text-red-500'>- {formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {watchedApplyVat && (
                  <div className='flex justify-between items-center text-sm'>
                    <span className='text-muted-foreground'>IVA ({vatPercentage}%)</span>
                    <span className='font-medium'>{formatCurrency(vatAmount)}</span>
                  </div>
                )}
                <Separator className='my-2 bg-border/50' />
                <div className='flex justify-between items-center text-lg'>
                  <span className='font-bold'>Total</span>
                  <span className='font-bold'>{formatCurrency(totalValue)}</span>
                </div>
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
