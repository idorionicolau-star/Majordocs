
"use client";

import { useState, useEffect, useContext, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import type { Product, Sale } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { InventoryContext } from '@/context/inventory-context';
import { CatalogProductSelector } from '../catalog/catalog-product-selector';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;

const formSchema = z.object({
  productName: z.string().nonempty({ message: "Por favor, selecione um produto." }),
  quantity: z.coerce.number().min(0.01, { message: "A quantidade deve ser maior que zero." }),
  unit: z.enum(['un', 'm²', 'm', 'cj', 'outro']).optional(),
  unitPrice: z.coerce.number().min(0, { message: "O preço não pode ser negativo." }),
  documentType: z.enum(['Guia de Remessa', 'Factura', 'Factura Proforma', 'Recibo']),
  clientName: z.string().optional(),
  notes: z.string().optional(),
});

type EditSaleFormValues = z.infer<typeof formSchema>;

interface EditSaleDialogProps {
    sale: Sale;
    onUpdateSale: (sale: Sale) => void;
    onOpenChange: (open: boolean) => void;
    open: boolean;
}

function EditSaleDialogContent({ sale, onUpdateSale, onOpenChange, open }: EditSaleDialogProps) {
  const inventoryContext = useContext(InventoryContext);
  const { products, catalogProducts, catalogCategories, isMultiLocation } = inventoryContext || { products: [], catalogProducts: [], catalogCategories: [], isMultiLocation: false };

  const form = useForm<EditSaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: sale.productName,
      quantity: sale.quantity,
      unitPrice: sale.unitPrice,
      unit: sale.unit || 'un',
      documentType: sale.documentType,
      clientName: sale.clientName || '',
      notes: sale.notes || '',
    },
  });
  
  const productsInStock = useMemo(() => {
    if (!products || !catalogProducts) return [];

    const productsForLocation = isMultiLocation && sale.location
      ? products.filter(p => p.location === sale.location)
      : products;

    // Allow the current product to be in the list even if out of stock, so user can edit other fields.
    const inStockOrCurrent = productsForLocation.filter(p => 
      ((p.stock - p.reservedStock) > 0) || (p.name === sale.productName)
    );

    const availableProductNames = [...new Set(inStockOrCurrent.map(p => p.name))];
    
    return catalogProducts.filter(p => availableProductNames.includes(p.name));
  }, [products, catalogProducts, isMultiLocation, sale.location, sale.productName]);


  const watchedProductName = useWatch({ control: form.control, name: 'productName' });
  const watchedQuantity = useWatch({ control: form.control, name: 'quantity' });
  const watchedUnitPrice = useWatch({ control: form.control, name: 'unitPrice' });

  const handleProductSelect = (productName: string, product?: CatalogProduct) => {
    form.setValue('productName', productName);
    if (product && productName !== sale.productName) {
      form.setValue('unitPrice', product.price);
      form.setValue('unit', product.unit || 'un');
    }
  };

  const totalValue = (watchedUnitPrice || 0) * (watchedQuantity || 0);

  function onSubmit(values: EditSaleFormValues) {
    onUpdateSale({
      ...sale,
      ...values,
      // Recalculate totals
      subtotal: (values.unitPrice || 0) * (values.quantity || 0),
      totalValue: (values.unitPrice || 0) * (values.quantity || 0), // Note: Simplified, doesn't re-apply discount/VAT logic from add dialog
    });
    onOpenChange(false);
  }

  return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {sale.documentType} #{sale.guideNumber}</DialogTitle>
          <DialogDescription>
            Ajuste os detalhes do documento. A edição não afeta o stock já movimentado.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] -mr-3 pr-3">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4 pr-2">
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Cliente</FormLabel>
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
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produto</FormLabel>
                    <CatalogProductSelector
                      products={productsInStock}
                      categories={catalogCategories || []}
                      selectedValue={field.value}
                      onValueChange={handleProductSelect}
                    />
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
                          <Input type="number" step="any" min="0.01" {...field} />
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
                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Notas</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="Adicione notas ou termos..."
                            {...field}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

              <div className="rounded-lg bg-muted p-4 text-right">
                  <p className="text-sm font-medium text-muted-foreground">Novo Valor Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>

              <DialogFooter className="pt-4">
                  <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  <Button type="submit">Salvar Alterações</Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
  );
}


export function EditSaleDialog(props: EditSaleDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <EditSaleDialogContent {...props} />}
    </Dialog>
  )
}
