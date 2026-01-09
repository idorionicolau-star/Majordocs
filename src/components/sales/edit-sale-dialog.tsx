
"use client";

import { useState, useEffect, useContext } from 'react';
import {
  DialogContent,
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
import type { Product, Sale } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { InventoryContext } from '@/context/inventory-context';
import { CatalogProductSelector } from '../catalog/catalog-product-selector';

const formSchema = z.object({
  productName: z.string().nonempty({ message: "Por favor, selecione um produto." }),
  quantity: z.coerce.number().min(1, { message: "A quantidade deve ser pelo menos 1." }),
  unitPrice: z.coerce.number().min(0, { message: "O preço não pode ser negativo." }),
});

type EditSaleFormValues = z.infer<typeof formSchema>;

interface EditSaleDialogProps {
    sale: Sale;
    products: Product[];
    onUpdateSale: (sale: Sale) => void;
    onOpenChange: (open: boolean) => void;
    open?: boolean;
}

export function EditSaleDialog({ sale, products, onUpdateSale, onOpenChange, open }: EditSaleDialogProps) {
  const inventoryContext = useContext(InventoryContext);
  const { catalogProducts, catalogCategories } = inventoryContext || {};

  const form = useForm<EditSaleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: sale.productName,
      quantity: sale.quantity,
      unitPrice: sale.unitPrice,
    },
  });
  
  const watchedProductName = useWatch({ control: form.control, name: 'productName' });
  const watchedQuantity = useWatch({ control: form.control, name: 'quantity' });
  const watchedUnitPrice = useWatch({ control: form.control, name: 'unitPrice' });

  useEffect(() => {
    if (open) {
      form.reset({
        productName: sale.productName,
        quantity: sale.quantity,
        unitPrice: sale.unitPrice,
      });
    }
  }, [open, sale, form]);

  useEffect(() => {
    const catalogProduct = catalogProducts?.find(p => p.name === watchedProductName);
    if (catalogProduct && watchedProductName !== sale.productName) {
        form.setValue('unitPrice', catalogProduct.price);
    }
  }, [watchedProductName, sale.productName, catalogProducts, form]);


  const totalValue = (watchedUnitPrice || 0) * (watchedQuantity || 0);

  function onSubmit(values: EditSaleFormValues) {
    onUpdateSale({
      ...sale,
      productName: values.productName,
      quantity: values.quantity,
      unitPrice: values.unitPrice,
      totalValue: values.quantity * values.unitPrice,
    });
    onOpenChange(false);
  }

  return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Venda #{sale.guideNumber}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="productName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto</FormLabel>
                   <CatalogProductSelector 
                     products={catalogProducts || []}
                     categories={catalogCategories || []}
                     selectedValue={field.value}
                     onValueChange={field.onChange}
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
                <p className="text-sm font-medium text-muted-foreground">Novo Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            </div>

            <DialogFooter>
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
  );
}
